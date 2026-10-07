-- 0009 Monastic life + events (v1 subset of AVAILABILITY_SPEC, SCHEDULE_INVITATION_SPEC, EVENT_BOSS_QUEST_SPEC, SCORING_SPEC):
--  * schedule_entries become per-person calendar rows with status/venue/source (SI §2); availability_manual gains
--    valid_from / set_by_kind / reason / truncated_at; writes only via app.set_availability (AV manual rules)
--  * app.resolve_availability (AV priority order, UNKNOWN first-class), board (T: full) and coarse view (C: FREE/BUSY/UNKNOWN)
--  * invitations (กิจนิมนต์) lifecycle with human-only confirm (invitation.confirm, restricted) + rule-based suggestion sma-v1
--    (hard constraints HC-1..HC-4; soft score is audit-only and never shown as a ranking)
--  * events with staffing targets, participants (volunteer sign-up + approval), event tasks (quests) and derived readiness
--  * monastic activity score: written only by the system on verified completion (daily cap 30, self-created = 0),
--    practice days and My Day read models. No ranking, no comparison, no combined ledger view.
-- Not in v1 (stated in docs/v1/DECISIONS.md): skills/HC-6, rite declines/HC-5, vehicles/HC-7, meal headcount, recurrence,
-- ai_drafts, achievements, check-out, travel-time provider.
begin;

-- helper: does any of my roles grant this code with a scope string containing the letter (e.g. 'C' coarse, 'P' public)?
create function app.has_scope_letter(p_temple uuid, p_code text, p_letter text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.memberships m
                 join public.membership_roles mr on mr.temple_id = m.temple_id and mr.membership_id = m.id
                 join public.role_permissions rp on rp.role_code = mr.role_code and rp.permission_code = p_code
                 where m.temple_id = p_temple and m.person_id = app.current_person_id() and m.status = 'active'
                   and (rp.condition is null or rp.condition not in ('delegated', 'explicit_grant'))
                   and rp.scope like '%' || p_letter || '%')
$$;
create function app.is_monastic(p_temple uuid, p_person uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.memberships where temple_id = p_temple and person_id = p_person and status = 'active' and monastic_kind <> 'none')
$$;

-- Schedule entries (SI §2) ---------------------------------------------------------------------------------
alter table public.schedule_entries drop constraint schedule_entries_kind_check;
alter table public.schedule_entries
  add constraint schedule_entries_kind_check check (kind in ('invitation','ceremony','teaching','class','duty','personal','travel','meal','leave','meeting','other')),
  add column person_id uuid references public.persons(id),
  add column status text not null default 'CONFIRMED' check (status in ('PROPOSED','CONFIRMED','CANCELLED')),
  add column venue_kind text not null default 'UNKNOWN' check (venue_kind in ('IN_TEMPLE','OFF_SITE','UNKNOWN')),
  add column venue_text text,
  add column source_type text not null default 'manual' check (source_type in ('manual','invitation','event')),
  add column source_id uuid,
  add column leg text check (leg in ('OUT','BACK')),
  add column cancel_reason text,
  add column cancelled_at timestamptz,
  add constraint schedule_entries_max_len check (ends_at - starts_at <= interval '14 days'),
  add constraint schedule_entries_offsite check (kind not in ('invitation','travel') or venue_kind = 'OFF_SITE'),
  add foreign key (temple_id, person_id) references public.memberships(temple_id, person_id);
create unique index schedule_entries_source_once on public.schedule_entries (temple_id, source_type, source_id, person_id, kind, coalesce(leg, ''))
  where source_id is not null;
create index on public.schedule_entries (temple_id, person_id, starts_at);
drop policy sched_sel on public.schedule_entries;
create policy sched_sel on public.schedule_entries for select to authenticated using (
  app.is_member(temple_id) and (
    app.has_permission(temple_id, 'schedule.view', 'T')
    or (visibility = 'public' and app.has_permission(temple_id, 'schedule.view'))
    or ((owner_person_id = app.current_person_id() or person_id = app.current_person_id()) and app.has_permission(temple_id, 'schedule.view'))));
-- source-owned rows (invitation/event) change only through their source commands (SE-4)
create function app.schedule_source_guard() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.source_write', true), '') <> 'on' and
     ((tg_op = 'INSERT' and new.source_type <> 'manual') or (tg_op in ('UPDATE','DELETE') and old.source_type <> 'manual')) then
    raise exception 'schedule entry is owned by its source (%), change it there', coalesce(old.source_type, new.source_type) using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger schedule_source_guard before insert or update or delete on public.schedule_entries for each row execute function app.schedule_source_guard();

-- Availability (AV) ---------------------------------------------------------------------------------------------
alter table public.availability_manual
  add column valid_from timestamptz not null default now(),
  add column set_by_kind text not null default 'SELF' check (set_by_kind in ('SELF','ADMIN')),
  add column reason_code text check (reason_code in ('SICK','RETREAT','OTHER')),
  add column truncated_at timestamptz,
  add constraint availability_window check (valid_until > valid_from);
alter table public.checkins add column checked_out_at timestamptz;
revoke insert on public.availability_manual from authenticated;   -- writes only via app.set_availability
drop policy avail_ins on public.availability_manual;

create function app.set_availability(p_temple uuid, p_person uuid, p_state text, p_valid_from timestamptz, p_valid_until timestamptz, p_reason text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); kind text; id uuid; f timestamptz := coalesce(p_valid_from, now());
begin
  if p_valid_until is null then raise exception 'VALID_UNTIL_REQUIRED' using errcode = '23514'; end if;
  if p_valid_until <= now() or p_valid_until <= f then raise exception 'VALID_UNTIL_IN_PAST' using errcode = '23514'; end if;
  if p_state not in ('UNAVAILABLE','PERSONAL','REST','AVAILABLE') then raise exception 'CALENDAR_STATE_NOT_SETTABLE' using errcode = '22023'; end if;
  if not app.is_monastic(p_temple, p_person) then raise exception 'NOT_MONASTIC' using errcode = '22023'; end if;
  if p_person = me then
    if not app.has_permission(p_temple, 'availability.set_self') then raise exception 'not allowed' using errcode = '42501'; end if;
    kind := 'SELF';
  else
    if not app.has_permission(p_temple, 'availability.set_others', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
    if p_state <> 'UNAVAILABLE' then raise exception 'FORBIDDEN_STATE_FOR_ACTOR' using errcode = '42501'; end if;
    kind := 'ADMIN';
  end if;
  if (p_state <> 'UNAVAILABLE' and p_valid_until - f > interval '24 hours') or p_valid_until - f > interval '120 days' then
    raise exception 'VALID_UNTIL_TOO_FAR' using errcode = '23514'; end if;
  if kind = 'SELF' then   -- supersession (AV reading B): a new SELF row truncates my overlapping SELF rows
    update public.availability_manual set truncated_at = f
     where temple_id = p_temple and person_id = p_person and set_by_kind = 'SELF' and truncated_at is null
       and valid_from < p_valid_until and valid_until > f;
  end if;
  insert into public.availability_manual(temple_id, person_id, state, valid_from, valid_until, set_by_person_id, set_by_kind, reason_code)
  values (p_temple, p_person, p_state, f, p_valid_until, me, kind, p_reason) returning availability_manual.id into id;
  perform app.write_audit(p_temple, 'availability.set', 'availability_manual', id, null, p_state);
  return id;
end $$;
create function app.clear_availability(p_temple uuid, p_row uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.availability_manual;
begin
  select * into r from public.availability_manual where temple_id = p_temple and id = p_row;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  if not ((r.person_id = app.current_person_id() and r.set_by_kind = 'SELF') or app.has_permission(p_temple, 'availability.set_others', 'T')) then
    raise exception 'not allowed' using errcode = '42501'; end if;
  update public.availability_manual set truncated_at = least(coalesce(truncated_at, now()), now()) where temple_id = p_temple and id = p_row;
end $$;

-- Resolver: no caller checks (internal); exposed only through the gated functions below.
create function app.resolve_availability(p_temple uuid, p_person uuid, p_at timestamptz)
returns table (state text, location text, reason text, until_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare m record; e record; c record; loc text;
begin
  if not app.is_monastic(p_temple, p_person) then return; end if;
  select * into m from public.availability_manual a where a.temple_id = p_temple and a.person_id = p_person and a.state = 'UNAVAILABLE'
     and a.valid_from <= p_at and p_at < least(a.valid_until, coalesce(a.truncated_at, 'infinity')) order by a.created_at desc limit 1;
  if found then return query select 'UNAVAILABLE', 'UNKNOWN', 'MANUAL:' || coalesce(m.reason_code, 'OTHER'), m.valid_until; return; end if;
  select s.*, case s.kind when 'ceremony' then 2 when 'invitation' then 3 when 'travel' then 4
                          when 'teaching' then 5 when 'class' then 5 when 'duty' then 5 when 'personal' then 6 end as pr
    into e from public.schedule_entries s
   where s.temple_id = p_temple and s.person_id = p_person and s.status = 'CONFIRMED'
     and s.kind in ('ceremony','invitation','travel','teaching','class','duty','personal') and s.starts_at <= p_at and p_at < s.ends_at
   order by pr, s.starts_at, s.id limit 1;
  if found then
    loc := case when e.kind in ('invitation','travel') then 'OFF_SITE' else e.venue_kind end;
    return query select case e.pr when 2 then 'CEREMONY' when 3 then 'ON_INVITATION' when 4 then 'TRAVELING' when 5 then 'TEACHING' else 'PERSONAL' end,
      loc, 'CALENDAR:' || e.kind, e.ends_at;
    return;
  end if;
  select * into m from public.availability_manual a where a.temple_id = p_temple and a.person_id = p_person and a.state in ('PERSONAL','REST','AVAILABLE')
     and a.valid_from <= p_at and p_at < least(a.valid_until, coalesce(a.truncated_at, 'infinity'))
   order by case a.state when 'PERSONAL' then 1 when 'REST' then 2 else 3 end, a.created_at desc limit 1;
  if found then return query select m.state, 'UNKNOWN', 'MANUAL', m.valid_until; return; end if;
  select * into c from public.checkins k where k.temple_id = p_temple and k.person_id = p_person and k.checked_out_at is null
     and k.checked_in_at <= p_at and p_at < k.checked_in_at + interval '720 minutes' order by k.checked_in_at desc limit 1;
  if found then return query select 'IN_TEMPLE', 'IN_TEMPLE', 'CHECKIN', c.checked_in_at + interval '720 minutes'; return; end if;
  return query select 'UNKNOWN', 'UNKNOWN', 'NO_SIGNAL', null::timestamptz;
end $$;
revoke all on function app.resolve_availability(uuid, uuid, timestamptz) from public;

create function app.my_availability(p_temple uuid) returns table (state text, location text, reason text, until_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select * from app.resolve_availability(p_temple, app.current_person_id(), now()) where app.is_member(p_temple)
$$;
-- Full board (availability.view T): per monk state + reason + counts are derived by the caller from these rows.
create function app.availability_board(p_temple uuid, p_at timestamptz default now())
returns table (person_id uuid, display_name text, monastic_kind text, state text, location text, reason text, until_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.has_permission(p_temple, 'availability.view', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select m.person_id, p.display_name, m.monastic_kind, r.state, r.location, r.reason, r.until_at
    from public.memberships m join public.persons p on p.id = m.person_id
    cross join lateral app.resolve_availability(p_temple, m.person_id, p_at) r
   where m.temple_id = p_temple and m.status = 'active' and m.monastic_kind <> 'none' order by p.display_name;
end $$;
-- Coarse view (availability.view C): FREE / BUSY / UNKNOWN only; no reasons, no location.
create function app.availability_coarse(p_temple uuid)
returns table (person_id uuid, display_name text, coarse text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not (app.has_permission(p_temple, 'availability.view', 'T') or app.has_scope_letter(p_temple, 'availability.view', 'C')) then
    raise exception 'not allowed' using errcode = '42501'; end if;
  return query select m.person_id, p.display_name,
    case when r.state = 'AVAILABLE' then 'FREE' when r.state in ('UNKNOWN', 'IN_TEMPLE') then 'UNKNOWN' else 'BUSY' end
    from public.memberships m join public.persons p on p.id = m.person_id
    cross join lateral app.resolve_availability(p_temple, m.person_id, now()) r
   where m.temple_id = p_temple and m.status = 'active' and m.monastic_kind <> 'none' order by p.display_name;
end $$;
create function app.check_in(p_temple uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not (app.has_permission(p_temple, 'availability.set_self') or app.has_permission(p_temple, 'presence.set_self')) then
    raise exception 'not allowed' using errcode = '42501'; end if;
  update public.checkins set checked_out_at = now() where temple_id = p_temple and person_id = app.current_person_id() and checked_out_at is null;
  insert into public.checkins(temple_id, person_id, source) values (p_temple, app.current_person_id(), 'manual');
end $$;

-- Invitations (กิจนิมนต์) ------------------------------------------------------------------------------------------
create table public.rite_types (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  name_th text not null check (char_length(btrim(name_th)) between 2 and 80),
  is_routine boolean not null default true,
  requires_lead boolean not null default false,
  default_duration_min int not null default 60 check (default_duration_min between 10 and 720),
  primary key (temple_id, id)
);
create table public.invitations (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  version int not null default 1,
  status text not null default 'RECEIVED' check (status in ('RECEIVED','REVIEWING','TEAM_PROPOSED','CONFIRMED','IN_PROGRESS','COMPLETED','DECLINED','CANCELLED')),
  host_name text not null check (char_length(btrim(host_name)) between 2 and 120),
  host_phone text check (host_phone ~ '^[0-9+ -]{6,20}$'),
  host_relation text check (char_length(host_relation) <= 80),
  rite_type_id uuid not null,
  venue_text text not null check (char_length(btrim(venue_text)) between 2 and 300),
  starts_at timestamptz not null,
  duration_min int not null check (duration_min between 10 and 720),
  monks_required int not null check (monks_required between 1 and 50),
  transport text not null default 'HOST_PROVIDES' check (transport in ('HOST_PROVIDES','TEMPLE_VEHICLE','OTHER')),
  travel_out_min int check (travel_out_min between 0 and 600),
  travel_back_min int check (travel_back_min between 0 and 600),
  received_via text not null default 'phone' check (received_via in ('phone','line','walk_in','web_form','temple_contact')),
  note text check (char_length(note) <= 1000),
  decline_reason text check (decline_reason in ('DATE_CONFLICT','NOT_ENOUGH_MONKS','OUT_OF_AREA','RITE_NOT_SUITABLE','OTHER')),
  cancel_reason text,
  confirmed_by uuid references public.persons(id),
  confirmed_at timestamptz,
  created_by uuid not null references public.persons(id),
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  foreign key (temple_id, rite_type_id) references public.rite_types(temple_id, id)
);
create table public.invitation_team (
  temple_id uuid not null references public.temples(id),
  invitation_id uuid not null,
  person_id uuid not null references public.persons(id),
  role text not null default 'MEMBER' check (role in ('LEAD','MEMBER')),
  monk_response text not null default 'PENDING' check (monk_response in ('PENDING','ACKNOWLEDGED','RELEASE_REQUESTED')),
  primary key (temple_id, invitation_id, person_id),
  foreign key (temple_id, invitation_id) references public.invitations(temple_id, id),
  foreign key (temple_id, person_id) references public.memberships(temple_id, person_id)
);

create function app.inv_window(i public.invitations, p_buffer int default 30)
returns table (block_start timestamptz, block_end timestamptz, travel_known boolean) language sql immutable as $$
  select i.starts_at - make_interval(mins => coalesce(i.travel_out_min, 0)),
         i.starts_at + make_interval(mins => i.duration_min + coalesce(i.travel_back_min, 0) + case when i.travel_back_min is null then 0 else p_buffer end),
         i.travel_out_min is not null and i.travel_back_min is not null
$$;
-- Hard-constraint violations for one monk (HC-1..HC-4). Empty array = eligible.
create function app.inv_violations(p_temple uuid, p_inv uuid, p_person uuid) returns text[]
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare i public.invitations; w record; v text[] := '{}'; tz text;
begin
  select * into i from public.invitations where temple_id = p_temple and id = p_inv;
  select * into w from app.inv_window(i);
  select coalesce(t.tz, 'Asia/Bangkok') into tz from public.temples t where t.id = p_temple;
  if not exists (select 1 from public.memberships where temple_id = p_temple and person_id = p_person and status = 'active' and monastic_kind = 'bhikkhu') then
    return array['NOT_ELIGIBLE']; end if;
  if exists (select 1 from public.availability_manual a where a.temple_id = p_temple and a.person_id = p_person
             and a.state in ('UNAVAILABLE','PERSONAL','REST') and a.valid_from < w.block_end
             and least(a.valid_until, coalesce(a.truncated_at, 'infinity')) > w.block_start) then v := v || 'MANUAL_BLOCK'::text; end if;
  if exists (select 1 from public.schedule_entries s where s.temple_id = p_temple and s.person_id = p_person and s.status = 'CONFIRMED'
             and not (s.source_type = 'invitation' and s.source_id = p_inv)
             and s.kind in ('invitation','ceremony','teaching','class','duty','personal','travel')
             and s.starts_at < w.block_end
             and s.ends_at + case when s.kind in ('invitation','travel') then interval '30 minutes' else interval '0' end > w.block_start) then
    v := v || 'COMMITMENT_OVERLAP'::text; end if;
  if (select count(*) from public.invitation_team t join public.invitations x on x.temple_id = t.temple_id and x.id = t.invitation_id
      where t.temple_id = p_temple and t.person_id = p_person and x.id <> p_inv and x.status in ('CONFIRMED','IN_PROGRESS','COMPLETED')
        and (x.starts_at at time zone tz)::date = (i.starts_at at time zone tz)::date) >= 2 then v := v || 'DAILY_LIMIT'::text; end if;
  return v;
end $$;

-- sma-v1 suggestion (read-only; a human copies it into propose_team). Score is audit-only.
create function app.suggest_team(p_temple uuid, p_inv uuid)
returns table (person_id uuid, display_name text, list text, violations text[], warnings text[], score numeric)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare i public.invitations; w record;
begin
  if not app.has_permission(p_temple, 'invitation.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into i from public.invitations where temple_id = p_temple and id = p_inv;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  select * into w from app.inv_window(i);
  return query
  with cand as (
    select m.person_id, p.display_name, app.inv_violations(p_temple, p_inv, m.person_id) as v,
      exists (select 1 from public.availability_manual a where a.temple_id = p_temple and a.person_id = m.person_id and a.state = 'AVAILABLE'
              and a.valid_from <= w.block_start and least(a.valid_until, coalesce(a.truncated_at, 'infinity')) >= w.block_end) as opted,
      (select count(*) from public.invitation_team t join public.invitations x on x.temple_id = t.temple_id and x.id = t.invitation_id
        where t.temple_id = p_temple and t.person_id = m.person_id and x.status in ('CONFIRMED','IN_PROGRESS','COMPLETED')
          and x.starts_at between i.starts_at - interval '30 days' and i.starts_at) as n30,
      coalesce((select extract(epoch from sum(least(s.ends_at, (i.starts_at::date + 1)::timestamptz) - greatest(s.starts_at, i.starts_at::date::timestamptz))) / 3600
        from public.schedule_entries s where s.temple_id = p_temple and s.person_id = m.person_id and s.status = 'CONFIRMED'
          and s.starts_at < (i.starts_at::date + 1)::timestamptz and s.ends_at > i.starts_at::date::timestamptz), 0) as hours_today,
      exists (select 1 from public.invitation_team t join public.invitations x on x.temple_id = t.temple_id and x.id = t.invitation_id
        where t.temple_id = p_temple and t.person_id = m.person_id and x.status = 'COMPLETED' and x.host_name = i.host_name
          and x.starts_at > i.starts_at - interval '365 days') as same_host
    from public.memberships m join public.persons p on p.id = m.person_id
    where m.temple_id = p_temple and m.status = 'active' and m.monastic_kind <> 'none')
  select c.person_id, c.display_name,
    case when cardinality(c.v) > 0 then 'excluded' when c.opted then 'suggested' else 'needs_confirmation' end,
    c.v,
    array_remove(array[case when not c.opted and cardinality(c.v) = 0 then 'NO_AVAILABILITY_SIGNAL' end,
                       case when not w.travel_known then 'RETURN_BUFFER_UNKNOWN' end], null),
    round(30 * (1 - least(c.n30, 6) / 6.0) + 25 + case when c.opted then 15 else 0 end
          + 15 * (1 - least(c.hours_today, 8) / 8.0) + case when c.same_host then 5 else 0 end, 2)
  from cand c
  order by case when cardinality(c.v) > 0 then 3 when c.opted then 1 else 2 end, 6 desc, c.display_name;
end $$;

create function app.create_invitation(p_temple uuid, p_host_name text, p_host_phone text, p_host_relation text, p_rite uuid, p_venue text,
  p_starts_at timestamptz, p_duration int, p_monks int, p_transport text, p_out int, p_back int, p_via text, p_note text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid;
begin
  if not app.has_permission(p_temple, 'invitation.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_starts_at <= now() then raise exception 'starts_at must be in the future' using errcode = '23514'; end if;
  insert into public.invitations(temple_id, host_name, host_phone, host_relation, rite_type_id, venue_text, starts_at, duration_min, monks_required,
    transport, travel_out_min, travel_back_min, received_via, note, created_by)
  values (p_temple, btrim(p_host_name), nullif(btrim(p_host_phone), ''), nullif(btrim(p_host_relation), ''), p_rite, btrim(p_venue), p_starts_at,
    p_duration, p_monks, coalesce(p_transport, 'HOST_PROVIDES'), p_out, p_back, coalesce(p_via, 'phone'), nullif(btrim(p_note), ''), app.current_person_id())
  returning invitations.id into id;
  perform app.write_audit(p_temple, 'invitation.received', 'invitations', id, null, 'RECEIVED');
  return id;
end $$;

-- Single entry point for every invitation transition (SI §3). Returns the new version.
create function app.invitation_transition(p_temple uuid, p_inv uuid, p_version int, p_action text, p_team uuid[] default null,
  p_lead uuid default null, p_reason text default null, p_ack_warnings boolean default false)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare i public.invitations; me uuid := app.current_person_id(); nxt text; p uuid; bad text[]; w record; rt public.rite_types;
begin
  select * into i from public.invitations where temple_id = p_temple and id = p_inv for update;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  if i.version <> p_version then raise exception 'STALE_PROPOSAL' using errcode = '40001'; end if;
  select * into rt from public.rite_types where temple_id = p_temple and id = i.rite_type_id;
  if p_action in ('start_review','propose_team','revise_team','start','complete') then
    if not app.has_permission(p_temple, 'invitation.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  elsif p_action in ('confirm','decline','cancel') then
    if not app.has_permission(p_temple, 'invitation.confirm', 'T') then raise exception 'HUMAN_CONFIRM_REQUIRED: invitation.confirm needed' using errcode = '42501'; end if;
  else raise exception 'ILLEGAL_TRANSITION' using errcode = '23514';
  end if;
  nxt := case
    when p_action = 'start_review' and i.status = 'RECEIVED' then 'REVIEWING'
    when p_action = 'propose_team' and i.status = 'REVIEWING' then 'TEAM_PROPOSED'
    when p_action = 'revise_team' and i.status = 'TEAM_PROPOSED' then 'REVIEWING'
    when p_action = 'confirm' and i.status = 'TEAM_PROPOSED' then 'CONFIRMED'
    when p_action = 'start' and i.status = 'CONFIRMED' then 'IN_PROGRESS'
    when p_action = 'complete' and i.status in ('CONFIRMED','IN_PROGRESS') and now() >= i.starts_at then 'COMPLETED'
    when p_action = 'decline' and i.status in ('RECEIVED','REVIEWING','TEAM_PROPOSED') then 'DECLINED'
    when p_action = 'cancel' and i.status in ('CONFIRMED','IN_PROGRESS') then 'CANCELLED' end;
  if nxt is null then raise exception 'ILLEGAL_TRANSITION % from %', p_action, i.status using errcode = '23514'; end if;

  if p_action = 'propose_team' then
    if p_team is null or cardinality(p_team) <> i.monks_required then raise exception 'TEAM_SIZE_MISMATCH' using errcode = '23514'; end if;
    if rt.requires_lead and (p_lead is null or not p_lead = any (p_team)) then raise exception 'LEAD_REQUIRED' using errcode = '23514'; end if;
    delete from public.invitation_team where temple_id = p_temple and invitation_id = p_inv;
    foreach p in array p_team loop
      bad := app.inv_violations(p_temple, p_inv, p);
      if cardinality(bad) > 0 then raise exception 'HARD_CONSTRAINT %: %', p, array_to_string(bad, ',') using errcode = '23514'; end if;
      insert into public.invitation_team(temple_id, invitation_id, person_id, role) values (p_temple, p_inv, p, case when p = p_lead then 'LEAD' else 'MEMBER' end);
    end loop;
  elsif p_action = 'revise_team' then
    delete from public.invitation_team where temple_id = p_temple and invitation_id = p_inv;
  elsif p_action = 'confirm' then
    if i.starts_at <= now() then raise exception 'starts_at passed' using errcode = '23514'; end if;
    if (select count(*) from public.invitation_team where temple_id = p_temple and invitation_id = p_inv) <> i.monks_required then
      raise exception 'TEAM_SIZE_MISMATCH' using errcode = '23514'; end if;
    for p in select person_id from public.invitation_team where temple_id = p_temple and invitation_id = p_inv loop
      bad := app.inv_violations(p_temple, p_inv, p);
      if cardinality(bad) > 0 then raise exception 'HARD_CONSTRAINT %: %', p, array_to_string(bad, ',') using errcode = '23514'; end if;
    end loop;
    select * into w from app.inv_window(i);
    if not p_ack_warnings and (not w.travel_known or exists (select 1 from app.suggest_team(p_temple, p_inv) s
        join public.invitation_team t on t.person_id = s.person_id and t.temple_id = p_temple and t.invitation_id = p_inv where s.list = 'needs_confirmation')) then
      raise exception 'WARNINGS_NOT_ACKNOWLEDGED' using errcode = '23514'; end if;
    perform set_config('app.source_write', 'on', true);
    insert into public.schedule_entries(temple_id, kind, title, person_id, visibility, starts_at, ends_at, created_by, venue_kind, venue_text, source_type, source_id, leg)
    select p_temple, x.kind, x.title, t.person_id, 'private', x.s, x.e, me, 'OFF_SITE', i.venue_text, 'invitation', p_inv, x.leg
      from public.invitation_team t cross join lateral (values
        ('travel', 'เดินทางไปกิจนิมนต์', i.starts_at - make_interval(mins => coalesce(i.travel_out_min, 0)), i.starts_at, 'OUT'),
        ('invitation', 'กิจนิมนต์: ' || rt.name_th, i.starts_at, i.starts_at + make_interval(mins => i.duration_min), null),
        ('travel', 'เดินทางกลับวัด', i.starts_at + make_interval(mins => i.duration_min),
                   i.starts_at + make_interval(mins => i.duration_min + coalesce(i.travel_back_min, 0)), 'BACK')) x(kind, title, s, e, leg)
     where t.temple_id = p_temple and t.invitation_id = p_inv and x.e > x.s;
    perform set_config('app.source_write', 'off', true);
    update public.invitations set confirmed_by = me, confirmed_at = now() where temple_id = p_temple and id = p_inv;
  elsif p_action = 'decline' then
    if p_reason not in ('DATE_CONFLICT','NOT_ENOUGH_MONKS','OUT_OF_AREA','RITE_NOT_SUITABLE','OTHER') then raise exception 'reason code required' using errcode = '23514'; end if;
    update public.invitations set decline_reason = p_reason where temple_id = p_temple and id = p_inv;
  elsif p_action = 'cancel' then
    if coalesce(btrim(p_reason), '') = '' then raise exception 'reason required' using errcode = '23514'; end if;
    perform set_config('app.source_write', 'on', true);
    update public.schedule_entries set status = 'CANCELLED', cancel_reason = p_reason, cancelled_at = now()
     where temple_id = p_temple and source_type = 'invitation' and source_id = p_inv and status <> 'CANCELLED';
    perform set_config('app.source_write', 'off', true);
    update public.invitations set cancel_reason = p_reason where temple_id = p_temple and id = p_inv;
  end if;
  update public.invitations set status = nxt, version = version + 1 where temple_id = p_temple and id = p_inv;
  perform app.write_audit(p_temple, 'invitation.' || p_action, 'invitations', p_inv, i.status, nxt, p_reason);
  return i.version + 1;
end $$;
-- monk self actions: acknowledge / request release (changes nothing else; secretary sees the flag)
create function app.invitation_respond(p_temple uuid, p_inv uuid, p_response text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_response not in ('ACKNOWLEDGED','RELEASE_REQUESTED') then raise exception 'bad response' using errcode = '22023'; end if;
  update public.invitation_team set monk_response = p_response
   where temple_id = p_temple and invitation_id = p_inv and person_id = app.current_person_id() and app.is_member(p_temple);
  if not found then raise exception 'not on this team' using errcode = '42501'; end if;
  perform app.write_audit(p_temple, 'invitation.monk_' || lower(p_response), 'invitations', p_inv, null, p_response);
end $$;

-- Events (Boss Quest) ------------------------------------------------------------------------------------------------
create table public.events (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  kind text not null check (kind in ('festival_day','merit_offering','ceremony','ordination','course','community','other')),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue_text text check (char_length(venue_text) <= 300),
  visibility text not null default 'temple_members' check (visibility in ('internal','temple_members','public')),
  lead_person_id uuid references public.persons(id),
  status text not null default 'DRAFT' check (status in ('DRAFT','PLANNING','APPROVED','LIVE','COMPLETED','CANCELLED')),
  expected_attendance int check (expected_attendance >= 0),
  escalation_hours int not null default 48 check (escalation_hours between 1 and 720),
  cancel_reason text,
  readiness_at_start jsonb,
  created_by uuid not null references public.persons(id),
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  check (ends_at > starts_at),
  foreign key (temple_id, lead_person_id) references public.memberships(temple_id, person_id)
);
create table public.event_staffing_targets (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  category text not null check (category in ('monk','volunteer','staff')),
  label text not null check (char_length(btrim(label)) between 2 and 80),
  required int not null check (required between 1 and 500),
  min_required int not null,
  hard_gate boolean not null default true,
  primary key (temple_id, id),
  foreign key (temple_id, event_id) references public.events(temple_id, id),
  check (min_required between 0 and required)
);
create table public.event_participants (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  target_id uuid not null,
  person_id uuid not null references public.persons(id),
  status text not null default 'PENDING' check (status in ('PENDING','CONFIRMED','DECLINED','CANCELLED')),
  decided_by uuid references public.persons(id),
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  unique (temple_id, target_id, person_id),
  foreign key (temple_id, event_id) references public.events(temple_id, id),
  foreign key (temple_id, target_id) references public.event_staffing_targets(temple_id, id),
  foreign key (temple_id, person_id) references public.memberships(temple_id, person_id)
);
alter table public.quests
  add column event_id uuid,
  add column weight smallint not null default 2 check (weight between 1 and 5),
  add column is_gate boolean not null default false,
  add foreign key (temple_id, event_id) references public.events(temple_id, id);

create function app.can_view_event(e public.events) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select app.is_member(e.temple_id) and (
    app.has_permission(e.temple_id, 'event.manage')
    or (e.visibility <> 'internal' and app.has_permission(e.temple_id, 'event.view', 'T'))
    or (e.visibility = 'public' and app.has_permission(e.temple_id, 'event.view'))
    or exists (select 1 from public.event_participants p where p.temple_id = e.temple_id and p.event_id = e.id and p.person_id = app.current_person_id()))
$$;

-- Readiness (EV §5; pure derivation, never stored except the snapshot at start)
create function app.event_readiness_calc(p_temple uuid, p_event uuid, p_at timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare e public.events; wd numeric; wt numeric; s_num numeric; s_den numeric; t numeric; s numeric; pct int; st text; reason text;
  g jsonb := '{}'::jsonb; any_fail boolean; any_unknown boolean; h numeric; ntask int; ntarget int; vol_gap int;
begin
  select * into e from public.events where temple_id = p_temple and id = p_event;
  if e.status in ('DRAFT', 'CANCELLED') then return jsonb_build_object('state', null, 'reason', 'NOT_PLANNED'); end if;
  if e.status in ('LIVE', 'COMPLETED') and e.readiness_at_start is not null then return e.readiness_at_start || '{"frozen":true}'; end if;
  select coalesce(sum(weight) filter (where status = 'COMPLETED'), 0), coalesce(sum(weight), 0), count(*) into wd, wt, ntask
    from public.quests where temple_id = p_temple and event_id = p_event and status <> 'CANCELLED';
  with f as (select tg.*, least((select count(distinct p.person_id) from public.event_participants p join public.memberships m
                 on m.temple_id = p.temple_id and m.person_id = p.person_id and m.status = 'active'
                 where p.temple_id = tg.temple_id and p.target_id = tg.id and p.status = 'CONFIRMED'), tg.required) as filled
             from public.event_staffing_targets tg where tg.temple_id = p_temple and tg.event_id = p_event)
  select sum(case category when 'monk' then 3 else 2 end * filled::numeric / required), sum(case category when 'monk' then 3 else 2 end), count(*),
         coalesce(sum(required - filled) filter (where category = 'volunteer'), 0),
         bool_or(hard_gate and filled < min_required)
    into s_num, s_den, ntarget, vol_gap, any_fail
    from f;
  t := case when wt > 0 then wd / wt end;
  s := case when s_den > 0 then s_num / s_den end;
  g := jsonb_build_object(
    'G-OWNER', case when e.lead_person_id is null then 'FAIL' else 'PASS' end,
    'G-VENUE', case when coalesce(btrim(e.venue_text), '') = '' then 'FAIL' else 'PASS' end,
    'G-STAFF', case when ntarget = 0 then 'UNKNOWN' when coalesce(any_fail, false) then 'FAIL' else 'PASS' end,
    'G-CRIT', case when exists (select 1 from public.quests q where q.temple_id = p_temple and q.event_id = p_event and q.weight >= 4
                                and q.status not in ('COMPLETED','CANCELLED') and q.due_at < p_at) then 'FAIL' else 'PASS' end,
    'G-CHECK', case when exists (select 1 from public.quests q where q.temple_id = p_temple and q.event_id = p_event and q.is_gate
                                 and q.status not in ('COMPLETED','CANCELLED') and q.due_at < p_at) then 'FAIL' else 'PASS' end);
  any_fail := exists (select 1 from jsonb_each_text(g) where value = 'FAIL');
  any_unknown := exists (select 1 from jsonb_each_text(g) where value = 'UNKNOWN');
  if t is null and s is null then return jsonb_build_object('state', 'UNKNOWN', 'reason', 'NO_PLAN', 'gates', g, 'percent', null); end if;
  pct := floor(100 * (case when t is null then s when s is null then t else 0.6 * t + 0.4 * s end) + 1e-9);
  h := extract(epoch from e.starts_at - p_at) / 3600;
  if e.status = 'APPROVED' and p_at >= e.starts_at then st := 'NOT_READY'; reason := 'OVERDUE_START';
  elsif any_fail then st := 'NOT_READY'; reason := 'GATE_FAILED';
  else
    st := case when pct >= 90 then 'READY' when pct >= 75 then 'ALMOST_READY' else 'IN_PROGRESS' end;
    if st = 'READY' and (any_unknown or ntarget = 0 or exists (select 1 from public.quests q where q.temple_id = p_temple and q.event_id = p_event
        and q.is_gate and q.status not in ('COMPLETED','CANCELLED'))) then st := 'ALMOST_READY'; end if;
    if ntask = 0 and st in ('READY', 'ALMOST_READY') then st := 'IN_PROGRESS'; end if;
    if h >= 0 and h <= e.escalation_hours and st <> 'READY' then st := 'NOT_READY'; reason := 'TIME_PRESSURE'; end if;
  end if;
  return jsonb_build_object('state', st, 'reason', reason, 'percent', pct, 'tasks_done_weight', wd, 'tasks_total_weight', wt,
                            'staffing', round(coalesce(s, 0) * 100), 'volunteer_gap', vol_gap, 'gates', g);
end $$;
revoke all on function app.event_readiness_calc(uuid, uuid, timestamptz) from public;
-- Who sees what (EV §8): managers/staff with event.view T see everything; participants/public see percent + state only.
create function app.event_readiness(p_temple uuid, p_event uuid) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare e public.events; r jsonb;
begin
  select * into e from public.events where temple_id = p_temple and id = p_event;
  if not found or not app.can_view_event(e) then return null; end if;
  r := app.event_readiness_calc(p_temple, p_event);
  if app.has_permission(p_temple, 'event.manage') or (app.has_permission(p_temple, 'event.view', 'T') and not app.has_scope_letter(p_temple, 'event.view', 'P')) then
    return r; end if;
  return jsonb_build_object('state', r->'state', 'percent', r->'percent');
end $$;

create function app.save_event(p_temple uuid, p_event uuid, p_kind text, p_title text, p_description text, p_starts timestamptz, p_ends timestamptz,
  p_venue text, p_visibility text, p_lead uuid, p_expected int)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid := p_event; old public.events;
begin
  if not app.has_permission(p_temple, 'event.manage') then raise exception 'not allowed' using errcode = '42501'; end if;
  if id is null then
    insert into public.events(temple_id, kind, title, description, starts_at, ends_at, venue_text, visibility, lead_person_id, expected_attendance, created_by)
    values (p_temple, p_kind, btrim(p_title), nullif(btrim(p_description), ''), p_starts, p_ends, nullif(btrim(p_venue), ''), p_visibility, p_lead, p_expected,
            app.current_person_id()) returning events.id into id;
    perform app.write_audit(p_temple, 'event.created', 'events', id, null, 'DRAFT');
  else
    select * into old from public.events where temple_id = p_temple and events.id = p_event for update;
    if old.status not in ('DRAFT','PLANNING','APPROVED') then raise exception 'event can no longer be edited' using errcode = '23514'; end if;
    update public.events set kind = p_kind, title = btrim(p_title), description = nullif(btrim(p_description), ''), starts_at = p_starts, ends_at = p_ends,
           venue_text = nullif(btrim(p_venue), ''), visibility = p_visibility, lead_person_id = p_lead, expected_attendance = p_expected
     where temple_id = p_temple and events.id = p_event;
    if old.status = 'APPROVED' and (old.starts_at <> p_starts or old.ends_at <> p_ends) then   -- reschedule: participants must reconfirm
      update public.event_participants set status = 'PENDING' where temple_id = p_temple and event_id = p_event and status = 'CONFIRMED';
      perform app.write_audit(p_temple, 'event.rescheduled', 'events', p_event, 'APPROVED', 'APPROVED');
    end if;
  end if;
  return id;
end $$;
create function app.event_transition(p_temple uuid, p_event uuid, p_action text, p_reason text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare e public.events; nxt text;
begin
  select * into e from public.events where temple_id = p_temple and id = p_event for update;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  nxt := case
    when p_action = 'plan' and e.status = 'DRAFT' then 'PLANNING'
    when p_action = 'approve' and e.status = 'PLANNING' then 'APPROVED'
    when p_action = 'start' and e.status = 'APPROVED' then 'LIVE'
    when p_action = 'close' and e.status = 'LIVE' then 'COMPLETED'
    when p_action = 'cancel' and e.status in ('DRAFT','PLANNING','APPROVED') then 'CANCELLED' end;
  if nxt is null then raise exception 'ILLEGAL_TRANSITION % from %', p_action, e.status using errcode = '23514'; end if;
  if p_action = 'approve' or (p_action = 'cancel' and e.status = 'APPROVED') then
    if not app.has_permission(p_temple, 'event.approve', 'T') then raise exception 'event.approve needed' using errcode = '42501'; end if;
  elsif not app.has_permission(p_temple, 'event.manage') then raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_action = 'plan' and e.lead_person_id is null then raise exception 'lead person required' using errcode = '23514'; end if;
  if p_action = 'approve' and coalesce(btrim(e.venue_text), '') = '' then raise exception 'venue required' using errcode = '23514'; end if;
  if p_action = 'cancel' and coalesce(btrim(p_reason), '') = '' then raise exception 'reason required' using errcode = '23514'; end if;
  if p_action = 'start' then
    update public.events set readiness_at_start = app.event_readiness_calc(p_temple, p_event) where temple_id = p_temple and id = p_event;
  elsif p_action = 'cancel' then
    update public.quests set status = 'CANCELLED' where temple_id = p_temple and event_id = p_event and status not in ('COMPLETED','CANCELLED');
    update public.event_participants set status = 'CANCELLED' where temple_id = p_temple and event_id = p_event;
    update public.events set cancel_reason = p_reason where temple_id = p_temple and id = p_event;
  end if;
  update public.events set status = nxt where temple_id = p_temple and id = p_event;
  perform app.write_audit(p_temple, 'event.' || p_action, 'events', p_event, e.status, nxt, p_reason);
end $$;
create function app.save_staffing_target(p_temple uuid, p_event uuid, p_category text, p_label text, p_required int, p_min int, p_hard boolean)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid;
begin
  if not app.has_permission(p_temple, 'event.manage') then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.event_staffing_targets(temple_id, event_id, category, label, required, min_required, hard_gate)
  values (p_temple, p_event, p_category, btrim(p_label), p_required,
          coalesce(p_min, case when p_category = 'monk' then p_required else ceil(0.8 * p_required)::int end), coalesce(p_hard, true))
  returning event_staffing_targets.id into id;
  return id;
end $$;
-- managers add monks/staff directly (CONFIRMED); a monk added to a monk target also gets a ceremony calendar row.
create function app.add_event_participant(p_temple uuid, p_target uuid, p_person uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare tg public.event_staffing_targets; e public.events;
begin
  if not app.has_permission(p_temple, 'event.manage') then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into tg from public.event_staffing_targets where temple_id = p_temple and id = p_target;
  select * into e from public.events where temple_id = p_temple and id = tg.event_id;
  if (tg.category = 'monk') <> app.is_monastic(p_temple, p_person) then raise exception 'LEDGER_KIND_MISMATCH: wrong category for this person' using errcode = '23514'; end if;
  insert into public.event_participants(temple_id, event_id, target_id, person_id, status, decided_by)
  values (p_temple, tg.event_id, p_target, p_person, 'CONFIRMED', app.current_person_id())
  on conflict (temple_id, target_id, person_id) do update set status = 'CONFIRMED', decided_by = excluded.decided_by;
  if tg.category = 'monk' then
    perform set_config('app.source_write', 'on', true);
    insert into public.schedule_entries(temple_id, kind, title, person_id, visibility, starts_at, ends_at, created_by, venue_kind, venue_text, source_type, source_id)
    values (p_temple, 'ceremony', e.title, p_person, 'temple', e.starts_at, e.ends_at, app.current_person_id(), 'IN_TEMPLE', e.venue_text, 'event', e.id)
    on conflict do nothing;
    perform set_config('app.source_write', 'off', true);
  end if;
end $$;
-- lay members sign up as volunteers (PENDING) for events they can see; approval by event.volunteer_approve or event.manage
create function app.volunteer_signup(p_temple uuid, p_target uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare tg public.event_staffing_targets; e public.events; me uuid := app.current_person_id();
begin
  select * into tg from public.event_staffing_targets where temple_id = p_temple and id = p_target and category = 'volunteer';
  if not found then raise exception 'not a volunteer slot' using errcode = 'P0002'; end if;
  select * into e from public.events where temple_id = p_temple and id = tg.event_id;
  if not app.can_view_event(e) or e.status not in ('PLANNING','APPROVED') or app.is_monastic(p_temple, me) then
    raise exception 'sign-up not available' using errcode = '42501'; end if;
  if exists (select 1 from public.memberships where temple_id = p_temple and person_id = me and is_minor) then
    raise exception 'minors need an adult-supervised sign-up by staff' using errcode = '42501'; end if;
  insert into public.event_participants(temple_id, event_id, target_id, person_id) values (p_temple, tg.event_id, p_target, me)
  on conflict (temple_id, target_id, person_id) do update set status = 'PENDING' where event_participants.status in ('DECLINED','CANCELLED');
end $$;
create function app.decide_participant(p_temple uuid, p_participant uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not (app.has_permission(p_temple, 'event.volunteer_approve') or app.has_permission(p_temple, 'event.manage')) then
    raise exception 'not allowed' using errcode = '42501'; end if;
  update public.event_participants set status = case when p_accept then 'CONFIRMED' else 'DECLINED' end, decided_by = app.current_person_id()
   where temple_id = p_temple and id = p_participant and status = 'PENDING' and person_id <> app.current_person_id();
  if not found then raise exception 'nothing to decide' using errcode = 'P0002'; end if;
end $$;
create function app.withdraw_participation(p_temple uuid, p_participant uuid) returns void language sql security definer set search_path = public, pg_temp as $$
  update public.event_participants set status = 'CANCELLED' where temple_id = p_temple and id = p_participant and person_id = app.current_person_id()
$$;
create function app.add_event_task(p_temple uuid, p_event uuid, p_title text, p_weight int, p_is_gate boolean, p_due timestamptz, p_assignee uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare q uuid;
begin
  if not app.has_permission(p_temple, 'event.manage') then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.quests(temple_id, quest_type, title, created_by, status, verification_policy, event_id, weight, is_gate, due_at)
  values (p_temple, 'event_task', btrim(p_title), app.current_person_id(), 'OPEN', 'organizer_approval', p_event, p_weight, coalesce(p_is_gate, false), p_due)
  returning id into q;
  if p_assignee is not null then
    insert into public.quest_assignments(temple_id, quest_id, assignee_person_id) values (p_temple, q, p_assignee);
  end if;
  return q;
end $$;
-- event tasks complete when the assignee submits and a different person with event.manage verifies (existing guard)
create function app.event_task_progress(p_temple uuid, p_assignment uuid, p_action text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.quest_assignments; q public.quests;
begin
  select * into a from public.quest_assignments where temple_id = p_temple and id = p_assignment for update;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  select * into q from public.quests where temple_id = p_temple and id = a.quest_id;
  if p_action in ('start','submit') then
    if a.assignee_person_id <> app.current_person_id() then raise exception 'not your task' using errcode = '42501'; end if;
    update public.quest_assignments set status = case p_action when 'start' then 'IN_PROGRESS' else 'SUBMITTED' end where temple_id = p_temple and id = p_assignment;
  elsif p_action in ('verify','reject') then
    if not (app.has_permission(p_temple, 'event.manage') or app.in_scope(p_temple, 'quest.verify', null, q.department_id)) then
      raise exception 'not allowed' using errcode = '42501'; end if;
    update public.quest_assignments set status = case p_action when 'verify' then 'COMPLETED' else 'IN_PROGRESS' end,
           verifier_person_id = case p_action when 'verify' then app.current_person_id() else verifier_person_id end
     where temple_id = p_temple and id = p_assignment;
  else raise exception 'bad action' using errcode = '22023';
  end if;
  if p_action = 'verify' and not exists (select 1 from public.quest_assignments x where x.temple_id = p_temple and x.quest_id = q.id
       and x.status not in ('COMPLETED','CANCELLED')) then
    update public.quests set status = 'COMPLETED' where temple_id = p_temple and id = q.id;
  end if;
end $$;

-- public listing of public events of a verified temple (title/time/venue + volunteers still needed only)
create function public.temple_public_events(p_slug text)
returns table (id uuid, title text, kind text, starts_at timestamptz, ends_at timestamptz, venue_text text, volunteers_needed int)
language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.kind, e.starts_at, e.ends_at, e.venue_text,
    (select coalesce(sum(greatest(tg.required - (select count(*) from public.event_participants p where p.temple_id = tg.temple_id
        and p.target_id = tg.id and p.status = 'CONFIRMED'), 0)), 0)::int
       from public.event_staffing_targets tg where tg.temple_id = e.temple_id and tg.event_id = e.id and tg.category = 'volunteer')
    from public.events e join public.temples t on t.id = e.temple_id
   where t.slug = p_slug and app.is_verified_temple(t.id) and e.visibility = 'public' and e.status in ('APPROVED','LIVE')
     and e.ends_at > now()
   order by e.starts_at limit 50
$$;

-- Monastic activity score (SC ME-1): system-written on verified completion; cap 30/day; self-created 0 ---------------------
create function app.award_on_completion() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare q public.quests; kind text; today int; amt int; tz text;
begin
  if not (new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED') then return new; end if;
  select * into q from public.quests where temple_id = new.temple_id and id = new.quest_id;
  if q.points <= 0 or q.created_by = new.assignee_person_id then return new; end if;     -- SELF_CREATED => 0
  select monastic_kind into kind from public.memberships where temple_id = new.temple_id and person_id = new.assignee_person_id;
  if kind = 'none' then return new; end if;                                              -- community ledger handled elsewhere
  if q.quest_type not in ('monastic_daily', 'novice_learning', 'event_task', 'ceremony_task', 'general') then return new; end if;
  select coalesce(t.tz, 'Asia/Bangkok') into tz from public.temples t where t.id = new.temple_id;
  select coalesce(sum(amount), 0) into today from public.monastic_activity_ledger
   where temple_id = new.temple_id and person_id = new.assignee_person_id and amount > 0
     and (created_at at time zone tz)::date = (now() at time zone tz)::date;
  amt := least(q.points, 30 - today);
  if amt <= 0 then
    perform app.write_audit(new.temple_id, 'scoring.award_capped', 'quest_assignment', new.id, null, null, 'DAILY_CAP_HIT');
    return new;
  end if;
  insert into public.monastic_activity_ledger(temple_id, person_id, amount, reason, idempotency_key)
  values (new.temple_id, new.assignee_person_id, amt, 'QUEST_COMPLETION:' || q.title, 'quest_completion:' || new.id)
  on conflict (temple_id, idempotency_key) do nothing;
  return new;
end $$;
create trigger award_on_completion after update on public.quest_assignments for each row execute function app.award_on_completion();

-- practice days (SC §6): visible to the monk only; derived; no loss mechanics (no "streak broken").
create function app.my_practice(p_temple uuid)
returns table (practice_days_this_month bigint, practice_days_total bigint, current_run int, activity_score bigint)
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); tz text; d date; run int := 0;
begin
  if not app.is_monastic(p_temple, me) then return; end if;
  select coalesce(t.tz, 'Asia/Bangkok') into tz from public.temples t where t.id = p_temple;
  create temp table if not exists _pd (day date) on commit drop; truncate _pd;
  insert into _pd select distinct (a.updated_at at time zone tz)::date from public.quest_assignments a join public.quests q
    on q.temple_id = a.temple_id and q.id = a.quest_id
   where a.temple_id = p_temple and a.assignee_person_id = me and a.status = 'COMPLETED' and q.quest_type in ('monastic_daily', 'novice_learning');
  d := (now() at time zone tz)::date;
  if not exists (select 1 from _pd where day = d) then d := d - 1; end if;
  while exists (select 1 from _pd where day = d) loop run := run + 1; d := d - 1; end loop;
  return query select (select count(*) from _pd where date_trunc('month', day) = date_trunc('month', (now() at time zone tz)::date)),
    (select count(*) from _pd), case when run >= 2 then run else null end,
    (select coalesce(sum(amount), 0) from public.monastic_activity_ledger where temple_id = p_temple and person_id = me);
end $$;

-- My Day: my calendar rows + my open/started/submitted quest assignments for the local day
create function app.my_day(p_temple uuid, p_day date)
returns table (item_kind text, ref_id uuid, title text, starts_at timestamptz, ends_at timestamptz, status text, detail jsonb)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); tz text; s timestamptz; e timestamptz;
begin
  if not app.is_member(p_temple) then raise exception 'not a member' using errcode = '42501'; end if;
  select coalesce(t.tz, 'Asia/Bangkok') into tz from public.temples t where t.id = p_temple;
  s := p_day::timestamp at time zone tz; e := (p_day + 1)::timestamp at time zone tz;
  return query
  select 'schedule', x.id, x.title, x.starts_at, x.ends_at, x.status,
         jsonb_build_object('kind', x.kind, 'leg', x.leg, 'venue', x.venue_text, 'source', x.source_type,
           'invitation_id', case when x.source_type = 'invitation' then x.source_id end,
           'monk_response', (select t.monk_response from public.invitation_team t where t.temple_id = p_temple and t.invitation_id = x.source_id and t.person_id = me))
    from public.schedule_entries x
   where x.temple_id = p_temple and (x.person_id = me or x.owner_person_id = me) and x.status = 'CONFIRMED' and x.starts_at < e and x.ends_at > s
  union all
  select 'quest', a.id, q.title, coalesce(q.due_at, s), q.due_at, a.status,
         jsonb_build_object('quest_type', q.quest_type, 'overdue', q.due_at < now() and a.status not in ('COMPLETED','CANCELLED'),
                            'waiting_verifier', a.status = 'SUBMITTED', 'event_id', q.event_id)
    from public.quest_assignments a join public.quests q on q.temple_id = a.temple_id and q.id = a.quest_id
   where a.temple_id = p_temple and a.assignee_person_id = me and a.status not in ('CANCELLED')
     and (a.status <> 'COMPLETED' or a.updated_at >= s) and (q.due_at is null or q.due_at < e)
     and (q.due_at is null or q.due_at >= s or a.status not in ('COMPLETED'))
  order by 4;
end $$;

-- RLS for new tables ----------------------------------------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['rite_types','invitations','invitation_team','events','event_staffing_targets','event_participants'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop; end $$;
create policy rite_sel on public.rite_types for select to authenticated using (app.is_member(temple_id) and app.has_permission(temple_id, 'invitation.view'));
create policy inv_sel on public.invitations for select to authenticated using (
  app.has_permission(temple_id, 'invitation.view', 'T')
  or (app.has_permission(temple_id, 'invitation.view') and exists (select 1 from public.invitation_team t where t.temple_id = invitations.temple_id
       and t.invitation_id = invitations.id and t.person_id = app.current_person_id())));
create policy invteam_sel on public.invitation_team for select to authenticated using (
  app.has_permission(temple_id, 'invitation.view', 'T') or (person_id = app.current_person_id() and app.is_member(temple_id)));
create policy events_sel on public.events for select to authenticated using (app.can_view_event(events));
create policy targets_sel on public.event_staffing_targets for select to authenticated using (
  exists (select 1 from public.events e where e.temple_id = event_staffing_targets.temple_id and e.id = event_id and app.can_view_event(e)));
create policy participants_sel on public.event_participants for select to authenticated using (
  (person_id = app.current_person_id() and app.is_member(temple_id))
  or app.has_permission(temple_id, 'event.manage') or app.has_permission(temple_id, 'event.volunteer_approve'));
grant select on public.rite_types, public.invitations, public.invitation_team, public.events, public.event_staffing_targets,
  public.event_participants to authenticated;

create function app.save_rite_type(p_temple uuid, p_name text, p_routine boolean, p_requires_lead boolean, p_duration int) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid;
begin
  if not app.has_permission(p_temple, 'invitation.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.rite_types(temple_id, name_th, is_routine, requires_lead, default_duration_min)
  values (p_temple, btrim(p_name), coalesce(p_routine, true), coalesce(p_requires_lead, false), coalesce(p_duration, 60)) returning rite_types.id into id;
  return id;
end $$;

grant execute on function app.has_scope_letter(uuid, text, text), app.is_monastic(uuid, uuid),
  app.set_availability(uuid, uuid, text, timestamptz, timestamptz, text), app.clear_availability(uuid, uuid),
  app.my_availability(uuid), app.availability_board(uuid, timestamptz), app.availability_coarse(uuid), app.check_in(uuid),
  app.suggest_team(uuid, uuid), app.create_invitation(uuid, text, text, text, uuid, text, timestamptz, int, int, text, int, int, text, text),
  app.invitation_transition(uuid, uuid, int, text, uuid[], uuid, text, boolean), app.invitation_respond(uuid, uuid, text),
  app.can_view_event(public.events), app.event_readiness(uuid, uuid),
  app.save_event(uuid, uuid, text, text, text, timestamptz, timestamptz, text, text, uuid, int), app.event_transition(uuid, uuid, text, text),
  app.save_staffing_target(uuid, uuid, text, text, int, int, boolean), app.add_event_participant(uuid, uuid, uuid),
  app.volunteer_signup(uuid, uuid), app.decide_participant(uuid, uuid, boolean), app.withdraw_participation(uuid, uuid),
  app.add_event_task(uuid, uuid, text, int, boolean, timestamptz, uuid), app.event_task_progress(uuid, uuid, text),
  app.my_practice(uuid), app.my_day(uuid, date), app.save_rite_type(uuid, text, boolean, boolean, int) to authenticated;
revoke all on function app.inv_violations(uuid, uuid, uuid), app.inv_window(public.invitations, int) from public;
grant execute on function public.temple_public_events(text) to anon, authenticated;

commit;
