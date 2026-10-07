-- 0011 Map (buildings/zones registry + 2D shapes), community boon points (earn/award/redeem/refund, holds),
-- rule-based helpers (no AI model: daily summary, schedule conflicts, event checklist), Temple Command Center read model.
-- Sources: SPATIAL_REGISTRY_SPEC.md, SCORING_SPEC.md, SPEC.md AI POLICY / COMMAND CENTER, TEMPLE_DOMAIN_MODEL.md:54-56.
-- v1 simplifications are listed in docs/v1/DECISIONS.md (D-M*, D-P*, D-H*, D-CC*).
begin;

-- ===== Map: buildings + zones (temple-entered; public only after the temple confirms) ===========================
create table public.buildings (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  code text not null check (code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*(\.[A-Z0-9]+(-[A-Z0-9]+)*){1,4}$' and char_length(code) <= 64),
  name_th text not null check (char_length(btrim(name_th)) between 2 and 120),
  name_en text,
  kind text not null check (kind in ('PRANG','UBOSOT','VIHARA','MANDAPA','SALA','KUTI','BELL_TOWER','GATE','PIER','OFFICE','KITCHEN',
                                     'TOILET','PARKING','GARDEN_AREA','STORAGE','OTHER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CLOSED_TEMPORARILY','UNDER_RENOVATION','RETIRED')),
  public_visibility text not null default 'STAFF_ONLY' check (public_visibility in ('PUBLIC','STAFF_ONLY','MONASTIC_ONLY')),
  polygon2d jsonb check (polygon2d is null or (jsonb_typeof(polygon2d) = 'array' and jsonb_array_length(polygon2d) between 3 and 64)),
  source_note text check (char_length(source_note) <= 300),
  confirmed_by uuid references public.persons(id),
  confirmed_at timestamptz,
  created_by uuid not null references public.persons(id),
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  unique (temple_id, code)
);
create table public.zones (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  building_id uuid,
  code text not null check (code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*(\.[A-Z0-9]+(-[A-Z0-9]+)*){1,4}$' and char_length(code) <= 64),
  name_th text not null check (char_length(btrim(name_th)) between 2 and 120),
  kind text not null check (kind in ('INTERIOR','EXTERIOR','COURTYARD','GARDEN','RIVERFRONT','PARKING','PATH')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CLOSED_TEMPORARILY','RETIRED')),
  primary key (temple_id, id),
  unique (temple_id, code),
  foreign key (temple_id, building_id) references public.buildings(temple_id, id)
);
-- codes never change (rename = name only); rows never deleted (RETIRED)
create function app.building_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'buildings/zones are never deleted; set status RETIRED' using errcode = '42501'; end if;
  if new.code <> old.code then raise exception 'code is immutable' using errcode = '23514'; end if;
  return new;
end $$;
create trigger building_guard before update or delete on public.buildings for each row execute function app.building_guard();
create trigger zone_guard before update or delete on public.zones for each row execute function app.building_guard();

alter table public.quests add column building_id uuid, add foreign key (temple_id, building_id) references public.buildings(temple_id, id);
alter table public.events add column building_id uuid, add foreign key (temple_id, building_id) references public.buildings(temple_id, id);

create function app.polygon_ok(p jsonb) returns boolean language sql immutable as $$
  select p is null or not exists (select 1 from jsonb_array_elements(p) e
    where jsonb_typeof(e) <> 'array' or jsonb_array_length(e) <> 2
       or (e->>0)::numeric not between 0 and 1600 or (e->>1)::numeric not between 0 and 1000)
$$;
create function app.save_building(p_temple uuid, p_id uuid, p_code text, p_name_th text, p_kind text, p_status text, p_visibility text,
  p_polygon jsonb, p_source_note text) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid := p_id; old public.buildings;
begin
  if not app.has_permission(p_temple, 'asset.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  if not app.polygon_ok(p_polygon) then raise exception 'polygon points must be [x,y] inside 1600x1000' using errcode = '23514'; end if;
  if id is null then
    insert into public.buildings(temple_id, code, name_th, kind, status, public_visibility, polygon2d, source_note, created_by)
    values (p_temple, upper(btrim(p_code)), btrim(p_name_th), p_kind, coalesce(p_status, 'ACTIVE'), coalesce(p_visibility, 'STAFF_ONLY'), p_polygon,
            nullif(btrim(p_source_note), ''), app.current_person_id()) returning buildings.id into id;
  else
    select * into old from public.buildings b where b.temple_id = p_temple and b.id = p_id for update;
    -- any change of a confirmed public building clears the confirmation: the temple must confirm again before it is public
    update public.buildings set name_th = btrim(p_name_th), kind = p_kind, status = p_status, public_visibility = p_visibility, polygon2d = p_polygon,
           source_note = nullif(btrim(p_source_note), ''),
           confirmed_by = case when (old.name_th, old.kind, old.public_visibility, old.polygon2d::text) is distinct from
                                    (btrim(p_name_th), p_kind, p_visibility, p_polygon::text) then null else old.confirmed_by end,
           confirmed_at = case when (old.name_th, old.kind, old.public_visibility, old.polygon2d::text) is distinct from
                                    (btrim(p_name_th), p_kind, p_visibility, p_polygon::text) then null else old.confirmed_at end
     where temple_id = p_temple and buildings.id = p_id;
  end if;
  perform app.write_audit(p_temple, 'building.saved', 'buildings', id, null, p_status);
  return id;
end $$;
-- the temple confirms (temple admin / abbot); a platform admin cannot confirm on the temple's behalf
create function app.confirm_building(p_temple uuid, p_id uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.has_permission(p_temple, 'temple.settings', 'T') then   -- the temple itself; a platform admin cannot confirm for it
    raise exception 'only the temple can confirm' using errcode = '42501'; end if;
  update public.buildings set confirmed_by = app.current_person_id(), confirmed_at = now() where temple_id = p_temple and id = p_id;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  perform app.write_audit(p_temple, 'building.confirmed', 'buildings', p_id, null, 'CONFIRMED');
end $$;
create function app.save_zone(p_temple uuid, p_building uuid, p_code text, p_name_th text, p_kind text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid;
begin
  if not app.has_permission(p_temple, 'asset.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.zones(temple_id, building_id, code, name_th, kind) values (p_temple, p_building, upper(btrim(p_code)), btrim(p_name_th), p_kind)
  returning zones.id into id;
  return id;
end $$;
-- markers computed at read time per viewer (SR §5): never 0 when unknown; quest counts only within the viewer's scope (RLS)
create function app.map_buildings(p_temple uuid)
returns table (id uuid, code text, name_th text, kind text, status text, public_visibility text, polygon2d jsonb, confirmed boolean,
               events_today bigint, open_quests bigint)
language sql stable security invoker set search_path = public, pg_temp as $$
  select b.id, b.code, b.name_th, b.kind, b.status, b.public_visibility, b.polygon2d, b.confirmed_at is not null,
    (select count(*) from public.events e where e.temple_id = b.temple_id and e.building_id = b.id and e.status in ('APPROVED','LIVE')
       and e.starts_at < (now() + interval '1 day') and e.ends_at > now()),
    (select count(*) from public.quests q where q.temple_id = b.temple_id and q.building_id = b.id and q.status = 'OPEN')
    from public.buildings b where b.temple_id = p_temple and b.status <> 'RETIRED'
   order by b.code
$$;
-- public map: PUBLIC + temple-confirmed buildings of a verified temple only
create function public.temple_public_map(p_slug text)
returns table (code text, name_th text, kind text, status text, polygon2d jsonb)
language sql stable security definer set search_path = public as $$
  select b.code, b.name_th, b.kind, b.status, b.polygon2d from public.buildings b join public.temples t on t.id = b.temple_id
   where t.slug = p_slug and app.is_verified_temple(t.id) and b.public_visibility = 'PUBLIC' and b.confirmed_at is not null and b.status <> 'RETIRED'
   order by b.code
$$;

-- ===== Community boon points (SCORING_SPEC CB-1..CB-4; never combined with the monastic ledger) =====================
alter table public.boon_point_transactions
  add column txn_type text not null default 'EARN' check (txn_type in ('EARN','MANUAL_AWARD','REDEEM','REFUND','REVERSAL')),
  add column source_type text,
  add column source_id uuid;
drop policy bpt_ins on public.boon_point_transactions;          -- writes only via the functions below
revoke insert on public.boon_point_transactions from authenticated;

create table public.point_holds (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  person_id uuid not null references public.persons(id),
  assignment_id uuid not null,
  amount int not null check (amount > 0),
  signal text not null,
  status text not null default 'HELD' check (status in ('HELD','ACCEPTED','REJECTED')),
  decided_by uuid references public.persons(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  unique (temple_id, assignment_id),
  foreign key (temple_id, assignment_id) references public.quest_assignments(temple_id, id)
);
create table public.reward_catalog (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  name_th text not null check (char_length(btrim(name_th)) between 2 and 120),
  description text check (char_length(description) <= 500),
  cost int not null check (cost between 1 and 100000),
  stock int not null check (stock >= 0),
  per_person_limit int check (per_person_limit >= 1),
  active boolean not null default true,
  created_by uuid not null references public.persons(id),
  created_at timestamptz not null default now(),
  primary key (temple_id, id)
);
create table public.reward_redemptions (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  reward_id uuid not null,
  person_id uuid not null references public.persons(id),
  status text not null default 'REQUESTED' check (status in ('REQUESTED','FULFILLED','CANCELLED')),
  cost int not null,
  decided_by uuid references public.persons(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  primary key (temple_id, id),
  foreign key (temple_id, reward_id) references public.reward_catalog(temple_id, id),
  foreign key (temple_id, person_id) references public.memberships(temple_id, person_id)
);

-- earn on verified completion of a lay assignment (extends the 0009 trigger function for monastic rows)
create or replace function app.award_on_completion() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare q public.quests; kind text; today int; amt int; tz text; cap int; recent int; top int;
begin
  if not (new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED') then return new; end if;
  select * into q from public.quests where temple_id = new.temple_id and id = new.quest_id;
  if q.points <= 0 or q.created_by = new.assignee_person_id or q.verification_policy = 'none' then return new; end if;   -- SELF_CREATED / unverified => 0
  select monastic_kind into kind from public.memberships where temple_id = new.temple_id and person_id = new.assignee_person_id;
  select coalesce(t.tz, 'Asia/Bangkok') into tz from public.temples t where t.id = new.temple_id;
  if kind <> 'none' then
    if q.quest_type not in ('monastic_daily', 'novice_learning', 'event_task', 'ceremony_task', 'general') then return new; end if;
    select coalesce(sum(amount), 0) into today from public.monastic_activity_ledger
     where temple_id = new.temple_id and person_id = new.assignee_person_id and amount > 0 and (created_at at time zone tz)::date = (now() at time zone tz)::date;
    cap := 30;
  else
    if q.quest_type in ('monastic_daily', 'novice_learning') then
      perform app.write_audit(new.temple_id, 'scoring.award_rejected', 'quest_assignment', new.id, null, null, 'LEDGER_KIND_MISMATCH');
      return new;
    end if;
    select coalesce(sum(amount), 0) into today from public.boon_point_transactions
     where temple_id = new.temple_id and person_id = new.assignee_person_id and txn_type = 'EARN' and (created_at at time zone tz)::date = (now() at time zone tz)::date;
    cap := 100;
  end if;
  amt := least(q.points, cap - today);
  if amt <= 0 then
    perform app.write_audit(new.temple_id, 'scoring.award_capped', 'quest_assignment', new.id, null, null, 'DAILY_CAP_HIT');
    return new;
  end if;
  if kind <> 'none' then
    insert into public.monastic_activity_ledger(temple_id, person_id, amount, reason, idempotency_key)
    values (new.temple_id, new.assignee_person_id, amt, 'QUEST_COMPLETION:' || q.title, 'quest_completion:' || new.id)
    on conflict (temple_id, idempotency_key) do nothing;
    return new;
  end if;
  -- anti-cheat VERIFIER_CONCENTRATION: one verifier >= 80% of the person's last >= 10 completions => HOLD for human review
  select count(*), max(c) into recent, top from (
    select verifier_person_id, count(*) over (partition by verifier_person_id) as c from (
      select a.verifier_person_id from public.quest_assignments a where a.temple_id = new.temple_id and a.assignee_person_id = new.assignee_person_id
         and a.status = 'COMPLETED' order by a.updated_at desc limit 10) last10) x;
  if recent >= 10 and top >= 8 then
    insert into public.point_holds(temple_id, person_id, assignment_id, amount, signal) values (new.temple_id, new.assignee_person_id, new.id, amt, 'VERIFIER_CONCENTRATION')
    on conflict do nothing;
    perform app.write_audit(new.temple_id, 'scoring.award_held', 'quest_assignment', new.id, null, null, 'VERIFIER_CONCENTRATION');
    return new;
  end if;
  insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by, txn_type, source_type, source_id)
  values (new.temple_id, new.assignee_person_id, amt, 'ร่วมกิจกรรม: ' || q.title, 'quest_completion:' || new.id, 'system:scoring', 'EARN', 'quest_assignment', new.id)
  on conflict (temple_id, idempotency_key) do nothing;
  return new;
end $$;

create function app.award_points(p_temple uuid, p_person uuid, p_amount int, p_reason text, p_request uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id();
begin
  if not app.has_permission(p_temple, 'points.award_community', 'D') then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_person = me then raise exception 'SELF_AWARD_FORBIDDEN' using errcode = '42501'; end if;
  if p_amount not between 1 and 50 then raise exception 'AMOUNT_EXCEEDS_LIMIT' using errcode = '23514'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'reason required' using errcode = '23514'; end if;
  insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by, txn_type, source_type)
  values (p_temple, p_person, p_amount, btrim(p_reason), 'award:' || p_request, me::text, 'MANUAL_AWARD', 'manual')
  on conflict (temple_id, idempotency_key) do nothing;
end $$;
create function app.review_hold(p_temple uuid, p_hold uuid, p_accept boolean) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare h public.point_holds;
begin
  if not app.has_permission(p_temple, 'points.award_community', 'D') then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into h from public.point_holds where temple_id = p_temple and id = p_hold and status = 'HELD' for update;
  if not found then raise exception 'not held' using errcode = 'P0002'; end if;
  if h.person_id = app.current_person_id() then raise exception 'cannot review own points' using errcode = '42501'; end if;
  update public.point_holds set status = case when p_accept then 'ACCEPTED' else 'REJECTED' end, decided_by = app.current_person_id(), decided_at = now()
   where temple_id = p_temple and id = p_hold;
  if p_accept then
    insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by, txn_type, source_type, source_id)
    values (p_temple, h.person_id, h.amount, 'ร่วมกิจกรรม (ตรวจแล้ว)', 'quest_completion:' || h.assignment_id, app.current_person_id()::text, 'EARN', 'quest_assignment', h.assignment_id)
    on conflict (temple_id, idempotency_key) do nothing;
  end if;
end $$;

create function app.save_reward(p_temple uuid, p_id uuid, p_name text, p_description text, p_cost int, p_stock int, p_limit int, p_active boolean)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid := p_id;
begin
  if not app.has_permission(p_temple, 'reward.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  if id is null then
    insert into public.reward_catalog(temple_id, name_th, description, cost, stock, per_person_limit, active, created_by)
    values (p_temple, btrim(p_name), nullif(btrim(p_description), ''), p_cost, p_stock, p_limit, coalesce(p_active, true), app.current_person_id())
    returning reward_catalog.id into id;
  else
    update public.reward_catalog set name_th = btrim(p_name), description = nullif(btrim(p_description), ''), cost = p_cost, stock = p_stock,
           per_person_limit = p_limit, active = coalesce(p_active, true) where temple_id = p_temple and reward_catalog.id = p_id;
  end if;
  return id;
end $$;
create function app.point_balance(p_temple uuid, p_person uuid) returns bigint language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(sum(amount), 0) from public.boon_point_transactions where temple_id = p_temple and person_id = p_person
$$;
revoke all on function app.point_balance(uuid, uuid) from public;
create function app.redeem_reward(p_temple uuid, p_reward uuid, p_request uuid) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); r public.reward_catalog; id uuid; n bigint;
begin
  if not app.has_permission(p_temple, 'community.participate') or app.is_monastic(p_temple, me) then raise exception 'FORBIDDEN_MONASTIC_OR_NOT_MEMBER' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_temple::text || me::text || 'boon_point_transactions', 0));   -- same lock as ledger_guard
  select * into r from public.reward_catalog where temple_id = p_temple and reward_catalog.id = p_reward for update;
  if not found or not r.active then raise exception 'reward not available' using errcode = 'P0002'; end if;
  if r.stock < 1 then raise exception 'OUT_OF_STOCK' using errcode = '23514'; end if;
  select count(*) into n from public.reward_redemptions where temple_id = p_temple and reward_id = p_reward and person_id = me and status <> 'CANCELLED';
  if r.per_person_limit is not null and n >= r.per_person_limit then raise exception 'LIMIT_REACHED' using errcode = '23514'; end if;
  if app.point_balance(p_temple, me) < r.cost then raise exception 'INSUFFICIENT_POINTS' using errcode = '23514'; end if;
  insert into public.reward_redemptions(temple_id, reward_id, person_id, cost) values (p_temple, p_reward, me, r.cost) returning reward_redemptions.id into id;
  insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by, txn_type, source_type, source_id)
  values (p_temple, me, -r.cost, 'ของที่ระลึกจากการร่วมกิจกรรม: ' || r.name_th, 'redeem:' || p_request, me::text, 'REDEEM', 'reward_redemption', id);
  update public.reward_catalog set stock = stock - 1 where temple_id = p_temple and reward_catalog.id = p_reward;
  return id;
end $$;
create function app.decide_redemption(p_temple uuid, p_redemption uuid, p_action text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare rd public.reward_redemptions; me uuid := app.current_person_id();
begin
  select * into rd from public.reward_redemptions where temple_id = p_temple and id = p_redemption and status = 'REQUESTED' for update;
  if not found then raise exception 'not open' using errcode = 'P0002'; end if;
  if p_action = 'fulfil' then
    if not app.has_permission(p_temple, 'reward.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
    update public.reward_redemptions set status = 'FULFILLED', decided_by = me, decided_at = now() where temple_id = p_temple and id = p_redemption;
  elsif p_action = 'cancel' then
    if not (rd.person_id = me or app.has_permission(p_temple, 'reward.manage', 'T')) then raise exception 'not allowed' using errcode = '42501'; end if;
    update public.reward_redemptions set status = 'CANCELLED', decided_by = me, decided_at = now() where temple_id = p_temple and id = p_redemption;
    update public.reward_catalog set stock = stock + 1 where temple_id = p_temple and id = rd.reward_id;
    insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by, txn_type, source_type, source_id)
    values (p_temple, rd.person_id, rd.cost, 'คืนแต้ม (ยกเลิกการขอรับ)', 'refund:' || p_redemption, me::text, 'REFUND', 'reward_redemption', p_redemption);
  else raise exception 'bad action' using errcode = '22023';
  end if;
end $$;
-- own balance + explained history (every row says where the points came from)
create function app.my_points(p_temple uuid)
returns table (balance bigint, created_at timestamptz, amount int, txn_type text, reason text, source_type text)
language sql stable security definer set search_path = public, pg_temp as $$
  select app.point_balance(p_temple, app.current_person_id()), t.created_at, t.amount, t.txn_type, t.reason, t.source_type
    from (select 1) one left join public.boon_point_transactions t on t.temple_id = p_temple and t.person_id = app.current_person_id()
   where app.is_member(p_temple) and not app.is_monastic(p_temple, app.current_person_id())
   order by t.created_at desc nulls last limit 200
$$;

-- ===== Rule-based helpers (no AI model; labelled as automatic summaries from system data) ==========================
-- schedule conflicts (AV §conflicts): visible to availability.view T, or to the monk about himself
create function app.schedule_conflicts(p_temple uuid, p_from timestamptz, p_to timestamptz)
returns table (person_id uuid, display_name text, code text, severity text, a_title text, a_start timestamptz, b_title text, b_start timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); full_view boolean := app.has_permission(p_temple, 'availability.view', 'T');
begin
  if not app.is_member(p_temple) then raise exception 'not a member' using errcode = '42501'; end if;
  return query
  select x.person_id, p.display_name, 'DOUBLE_BOOKED', case when 'invitation' in (x.kind, y.kind) or 'ceremony' in (x.kind, y.kind) then 'HIGH' else 'MEDIUM' end,
         x.title, x.starts_at, y.title, y.starts_at
    from public.schedule_entries x join public.schedule_entries y on y.temple_id = x.temple_id and y.person_id = x.person_id and x.id < y.id
     and x.starts_at < y.ends_at and y.starts_at < x.ends_at and y.status = 'CONFIRMED'
     and not (x.source_id is not null and x.source_type = y.source_type and x.source_id = y.source_id)   -- legs of one invitation never conflict
    join public.persons p on p.id = x.person_id
   where x.temple_id = p_temple and x.status = 'CONFIRMED' and x.starts_at < p_to and x.ends_at > p_from
     and x.kind in ('invitation','ceremony','teaching','class','duty','personal','travel') and y.kind in ('invitation','ceremony','teaching','class','duty','personal','travel')
     and (full_view or x.person_id = me)
  union all
  select a.person_id, p.display_name, 'MANUAL_BLOCK_OVER_COMMITMENT', case when a.state = 'UNAVAILABLE' or s.kind in ('invitation','ceremony') then 'HIGH' else 'MEDIUM' end,
         'สถานะ: ' || a.state, a.valid_from, s.title, s.starts_at
    from public.availability_manual a join public.schedule_entries s on s.temple_id = a.temple_id and s.person_id = a.person_id and s.status = 'CONFIRMED'
     and s.kind in ('ceremony','invitation','travel','teaching','class','duty') and s.starts_at < least(a.valid_until, coalesce(a.truncated_at, 'infinity')) and s.ends_at > a.valid_from
    join public.persons p on p.id = a.person_id
   where a.temple_id = p_temple and a.state in ('UNAVAILABLE','PERSONAL','REST') and s.starts_at < p_to and s.ends_at > p_from
     and (full_view or a.person_id = me);
end $$;
-- event checklist: what is missing, derived from the event's own rows (managers)
create function app.event_checklist(p_temple uuid, p_event uuid) returns table (item text, done boolean, detail text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare e public.events; r jsonb;
begin
  if not app.has_permission(p_temple, 'event.manage') then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into e from public.events where temple_id = p_temple and id = p_event;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  r := app.event_readiness_calc(p_temple, p_event);
  return query values
    ('มีผู้รับผิดชอบงาน', e.lead_person_id is not null, null::text),
    ('ระบุสถานที่จัดงาน', coalesce(btrim(e.venue_text), '') <> '', null),
    ('กำหนดจำนวนคนที่ต้องการ', exists (select 1 from public.event_staffing_targets t where t.temple_id = p_temple and t.event_id = p_event), null),
    ('คนครบตามขั้นต่ำ', coalesce(r->'gates'->>'G-STAFF', 'UNKNOWN') = 'PASS', case when (r->>'volunteer_gap')::int > 0 then 'ยังขาดอาสา ' || (r->>'volunteer_gap') || ' คน' end),
    ('มีรายการงานที่ต้องเตรียม', exists (select 1 from public.quests q where q.temple_id = p_temple and q.event_id = p_event and q.status <> 'CANCELLED'), null),
    ('ไม่มีงานสำคัญที่เลยกำหนด', coalesce(r->'gates'->>'G-CRIT', 'PASS') = 'PASS' and coalesce(r->'gates'->>'G-CHECK', 'PASS') = 'PASS', null),
    ('ได้รับอนุมัติแล้ว', e.status in ('APPROVED','LIVE','COMPLETED'), null);
end $$;

-- ===== Temple Command Center (read model; owns no data; Unknown is explicit) ======================================
-- command_center.view T: all panels; D (facility_manager, department_lead, ceremony_lead, temple_admin panel_staff): no monastic panel.
create function app.command_center(p_temple uuid) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare full_view boolean := app.has_permission(p_temple, 'command_center.view', 'T'); res jsonb := '{}'; tz text; d0 timestamptz; d1 timestamptz;
begin
  if not app.has_permission(p_temple, 'command_center.view', 'D') then raise exception 'not allowed' using errcode = '42501'; end if;
  select coalesce(t.tz, 'Asia/Bangkok') into tz from public.temples t where t.id = p_temple;
  d0 := (now() at time zone tz)::date::timestamp at time zone tz; d1 := d0 + interval '1 day';
  if full_view then
    res := res || jsonb_build_object('monastic', (
      select jsonb_build_object('total', count(*), 'bhikkhu', count(*) filter (where m.monastic_kind = 'bhikkhu'),
        'samanera', count(*) filter (where m.monastic_kind = 'samanera'),
        'by_state', coalesce((select jsonb_object_agg(st, n) from (select r.state as st, count(*) as n from public.memberships mm
            cross join lateral app.resolve_availability(p_temple, mm.person_id, now()) r
            where mm.temple_id = p_temple and mm.status = 'active' and mm.monastic_kind <> 'none' group by r.state) z), '{}'))
      from public.memberships m where m.temple_id = p_temple and m.status = 'active' and m.monastic_kind <> 'none'),
      'invitations', jsonb_build_object(
        'today_confirmed', (select count(*) from public.invitations i where i.temple_id = p_temple and i.status in ('CONFIRMED','IN_PROGRESS') and i.starts_at >= d0 and i.starts_at < d1),
        'waiting_decision', (select count(*) from public.invitations i where i.temple_id = p_temple and i.status in ('RECEIVED','REVIEWING','TEAM_PROPOSED')),
        'release_requests', (select count(*) from public.invitation_team t join public.invitations i on i.temple_id = t.temple_id and i.id = t.invitation_id
                             where t.temple_id = p_temple and t.monk_response = 'RELEASE_REQUESTED' and i.status in ('CONFIRMED','IN_PROGRESS'))));
  end if;
  res := res || jsonb_build_object(
    'staff', jsonb_build_object(
      'total', (select count(*) from public.memberships m where m.temple_id = p_temple and m.status = 'active' and m.monastic_kind = 'none'
                and exists (select 1 from public.membership_roles r where r.temple_id = m.temple_id and r.membership_id = m.id and r.role_code not in ('community_member','volunteer','lay_resident'))),
      'checked_in_today', (select count(distinct c.person_id) from public.checkins c join public.memberships m on m.temple_id = c.temple_id and m.person_id = c.person_id
                           where c.temple_id = p_temple and m.monastic_kind = 'none' and c.checked_in_at >= d0),
      'on_leave', null, 'note', 'สถานะลา/เวรของเจ้าหน้าที่ยังไม่มีในระบบ จึงแสดงว่าไม่ทราบ'),
    'quests', (select jsonb_build_object('all', count(*), 'completed', count(*) filter (where q.status = 'COMPLETED'),
        'active', count(*) filter (where q.status = 'OPEN'),
        'overdue', count(*) filter (where q.status = 'OPEN' and q.due_at < now()),
        'unassigned', count(*) filter (where q.status = 'OPEN' and not exists (select 1 from public.quest_assignments a where a.temple_id = q.temple_id and a.quest_id = q.id and a.status <> 'CANCELLED')),
        'blocked', (select count(*) from public.quest_assignments a where a.temple_id = p_temple and a.status = 'BLOCKED'))
      from public.quests q where q.temple_id = p_temple and q.status <> 'CANCELLED'),
    'events', jsonb_build_object(
      'today', (select count(*) from public.events e where e.temple_id = p_temple and e.status in ('APPROVED','LIVE') and e.starts_at < d1 and e.ends_at > d0),
      'next_48h', (select count(*) from public.events e where e.temple_id = p_temple and e.status in ('PLANNING','APPROVED') and e.starts_at between now() and now() + interval '48 hours'),
      'not_ready', (select count(*) from public.events e where e.temple_id = p_temple and e.status in ('PLANNING','APPROVED') and e.starts_at > now()
                    and app.event_readiness_calc(p_temple, e.id)->>'state' = 'NOT_READY'),
      'volunteers_missing', (select coalesce(sum((app.event_readiness_calc(p_temple, e.id)->>'volunteer_gap')::int), 0) from public.events e
                             where e.temple_id = p_temple and e.status in ('PLANNING','APPROVED') and e.starts_at > now())),
    'facility', jsonb_build_object(
      'buildings', (select count(*) from public.buildings b where b.temple_id = p_temple and b.status <> 'RETIRED'),
      'buildings_closed', (select count(*) from public.buildings b where b.temple_id = p_temple and b.status in ('CLOSED_TEMPORARILY','UNDER_RENOVATION')),
      'parking_lots', (select count(*) from public.parking_lots l where l.temple_id = p_temple and l.active),
      'maintenance', null, 'assets', null, 'vehicles', null, 'kitchen', null, 'inventory', null,
      'note', 'งานซ่อม ทรัพย์สิน ยานพาหนะ ครัว และคลัง ยังไม่มีในระบบ จึงแสดงว่าไม่ทราบ'),
    'community', jsonb_build_object(
      'followers', (select count(*) from public.memberships m join public.membership_roles r on r.temple_id = m.temple_id and r.membership_id = m.id
                    where m.temple_id = p_temple and m.status = 'active' and r.role_code = 'community_member'),
      'volunteers_confirmed_upcoming', (select count(distinct p.person_id) from public.event_participants p join public.events e on e.temple_id = p.temple_id and e.id = p.event_id
                    join public.event_staffing_targets t on t.temple_id = p.temple_id and t.id = p.target_id
                    where p.temple_id = p_temple and p.status = 'CONFIRMED' and t.category = 'volunteer' and e.ends_at > now()),
      'points_issued_30d', (select coalesce(sum(amount), 0) from public.boon_point_transactions b where b.temple_id = p_temple and b.amount > 0
                    and b.txn_type in ('EARN','MANUAL_AWARD') and b.created_at > now() - interval '30 days'),
      'redemptions_waiting', (select count(*) from public.reward_redemptions r where r.temple_id = p_temple and r.status = 'REQUESTED'),
      'points_on_hold', (select count(*) from public.point_holds h where h.temple_id = p_temple and h.status = 'HELD'),
      'contact_unanswered', (select count(*) from public.temple_contact_threads c where c.temple_id = p_temple and c.status in ('NEW','ASSIGNED'))),
    'as_of', now(), 'full_view', full_view);
  return res;
end $$;
-- daily summary text parts (rule-based; the UI labels it "สรุปอัตโนมัติจากข้อมูลในระบบ ไม่ได้ใช้ AI เขียน")
create function app.daily_summary(p_temple uuid) returns table (line text, severity text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare c jsonb := app.command_center(p_temple);
begin
  return query select l, s from (values
    (case when (c->'events'->>'today')::int > 0 then 'วันนี้มีงาน ' || (c->'events'->>'today') || ' งาน' end, 'info'),
    (case when (c->'events'->>'not_ready')::int > 0 then 'งานที่ยังไม่พร้อม ' || (c->'events'->>'not_ready') || ' งาน' end, 'warn'),
    (case when (c->'events'->>'volunteers_missing')::int > 0 then 'ยังขาดอาสาสมัครรวม ' || (c->'events'->>'volunteers_missing') || ' คน' end, 'warn'),
    (case when (c->'quests'->>'overdue')::int > 0 then 'งานเลยกำหนด ' || (c->'quests'->>'overdue') || ' งาน' end, 'warn'),
    (case when (c->'quests'->>'unassigned')::int > 0 then 'งานที่ยังไม่มีคนรับ ' || (c->'quests'->>'unassigned') || ' งาน' end, 'info'),
    (case when c ? 'invitations' and (c->'invitations'->>'today_confirmed')::int > 0 then 'กิจนิมนต์วันนี้ ' || (c->'invitations'->>'today_confirmed') || ' รายการ' end, 'info'),
    (case when c ? 'invitations' and (c->'invitations'->>'waiting_decision')::int > 0 then 'กิจนิมนต์รอตัดสินใจ ' || (c->'invitations'->>'waiting_decision') || ' รายการ' end, 'warn'),
    (case when c ? 'invitations' and (c->'invitations'->>'release_requests')::int > 0 then 'พระแจ้งติดขัด ' || (c->'invitations'->>'release_requests') || ' รายการ' end, 'warn'),
    (case when c ? 'monastic' and (c->'monastic'->'by_state'->>'UNKNOWN')::int > 0 then 'ไม่ทราบสถานะพระ ' || (c->'monastic'->'by_state'->>'UNKNOWN') || ' รูป' end, 'info'),
    (case when (c->'community'->>'contact_unanswered')::int > 0 then 'ข้อความถึงวัดที่ยังไม่ตอบ ' || (c->'community'->>'contact_unanswered') || ' ข้อความ' end, 'warn'),
    (case when (c->'community'->>'redemptions_waiting')::int > 0 then 'รอมอบของที่ระลึก ' || (c->'community'->>'redemptions_waiting') || ' รายการ' end, 'info'),
    (case when (c->'community'->>'points_on_hold')::int > 0 then 'แต้มรอตรวจ ' || (c->'community'->>'points_on_hold') || ' รายการ' end, 'warn')
  ) v(l, s) where l is not null;
end $$;

-- ===== community gaps found by the UI agent: names for my block list and for the admin suspension list =====
create function app.my_blocks() returns table (person_id uuid, display_name text, blocked_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select b.blocked, coalesce(cp.display_name, p.display_name), b.created_at from public.person_blocks b
    join public.persons p on p.id = b.blocked left join public.community_profiles cp on cp.person_id = b.blocked
   where b.blocker = app.current_person_id() order by b.created_at desc
$$;
create function app.suspensions_list() returns table (person_id uuid, display_name text, reason text, until timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select s.person_id, coalesce(cp.display_name, p.display_name), s.reason, s.until, s.created_at from public.community_suspensions s
    join public.persons p on p.id = s.person_id left join public.community_profiles cp on cp.person_id = s.person_id order by s.created_at desc;
end $$;
grant execute on function app.my_blocks(), app.suspensions_list() to authenticated;

-- ===== RLS ===============================================================================================================
do $$ declare t text; begin
  foreach t in array array['buildings','zones','point_holds','reward_catalog','reward_redemptions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop; end $$;
create policy buildings_sel on public.buildings for select to authenticated using (
  app.is_member(temple_id) and (app.has_permission(temple_id, 'asset.view')
    or (confirmed_at is not null and (public_visibility = 'PUBLIC' or (public_visibility = 'MONASTIC_ONLY' and app.is_monastic(temple_id, app.current_person_id()))))));
create policy zones_sel on public.zones for select to authenticated using (app.is_member(temple_id) and app.has_permission(temple_id, 'asset.view'));
create policy holds_sel on public.point_holds for select to authenticated using (
  (person_id = app.current_person_id() and app.is_member(temple_id)) or app.has_permission(temple_id, 'points.award_community', 'D'));
create policy rewards_sel on public.reward_catalog for select to authenticated using (app.is_member(temple_id) and (active or app.has_permission(temple_id, 'reward.manage', 'T')));
create policy redemptions_sel on public.reward_redemptions for select to authenticated using (
  (person_id = app.current_person_id() and app.is_member(temple_id)) or app.has_permission(temple_id, 'reward.manage', 'T'));
grant select on public.buildings, public.zones, public.point_holds, public.reward_catalog, public.reward_redemptions to authenticated;

grant execute on function app.polygon_ok(jsonb), app.save_building(uuid, uuid, text, text, text, text, text, jsonb, text), app.confirm_building(uuid, uuid),
  app.save_zone(uuid, uuid, text, text, text), app.map_buildings(uuid), app.award_points(uuid, uuid, int, text, uuid), app.review_hold(uuid, uuid, boolean),
  app.save_reward(uuid, uuid, text, text, int, int, int, boolean), app.redeem_reward(uuid, uuid, uuid), app.decide_redemption(uuid, uuid, text),
  app.my_points(uuid), app.schedule_conflicts(uuid, timestamptz, timestamptz), app.event_checklist(uuid, uuid), app.command_center(uuid),
  app.daily_summary(uuid) to authenticated;
grant execute on function public.temple_public_map(text) to anon, authenticated;
commit;
