-- 0006 Verified real data: provenance on every value, verification state machine, conflicts, expiry,
-- double verification for critical fields, append-only change history, temple readiness, public-only-confirmed.
-- Writes go ONLY through the SECURITY DEFINER functions below; no direct INSERT/UPDATE grants.
begin;

-- Field catalog (definitions only — contains no temple data) -------------------------------------
create table public.data_field_catalog (
  field_key text primary key,
  category text not null check (category in ('identity', 'location', 'contact', 'schedule', 'people', 'finance', 'about')),
  label_th text not null,
  risk text not null check (risk in ('normal', 'high', 'critical')),
  official_source_expected boolean not null,     -- should exist in the ONAB registry / Royal Gazette
  required_for_publish boolean not null default false,
  expiry_days int check (expiry_days > 0),        -- null = does not expire
  public_allowed boolean not null default true,
  sort int not null
);
insert into public.data_field_catalog values
 ('temple.name_th',          'identity', 'ชื่อวัด (ทางการ)',          'normal',   true,  true,  null, true, 10),
 ('temple.name_en',          'identity', 'ชื่อภาษาอังกฤษ',            'normal',   false, false, null, true, 20),
 ('temple.registry_number',  'identity', 'เลขทะเบียนวัด',             'normal',   true,  false, null, true, 30),
 ('temple.type',             'identity', 'ประเภทวัด',                 'normal',   true,  false, null, true, 40),
 ('temple.sect',             'identity', 'นิกาย',                    'normal',   true,  false, null, true, 50),
 ('temple.province',         'location', 'จังหวัด',                   'normal',   true,  true,  null, true, 60),
 ('temple.district',         'location', 'อำเภอ/เขต',                'normal',   true,  false, null, true, 70),
 ('temple.subdistrict',      'location', 'ตำบล/แขวง',                'normal',   true,  false, null, true, 80),
 ('temple.address',          'location', 'ที่อยู่',                    'normal',   true,  true,  365,  true, 90),
 ('temple.geo',              'location', 'ตำแหน่งบนแผนที่',            'high',     false, false, 365,  true, 100),
 ('temple.founded',          'about',    'วันที่ตั้งวัด',               'normal',   true,  false, null, true, 110),
 ('temple.wisungkhamasima',  'about',    'วิสุงคามสีมา',               'normal',   true,  false, null, true, 120),
 ('temple.history',          'about',    'ประวัติวัด',                  'normal',   true,  false, null, true, 130),
 ('temple.abbot_name',       'people',   'เจ้าอาวาส',                  'high',     false, false, 365,  true, 140),
 ('temple.office_phone',     'contact',  'เบอร์สำนักงานวัด',            'normal',   false, false, 180,  true, 150),
 ('temple.official_channels','contact',  'ช่องทางทางการ (เว็บ/เพจ/LINE)', 'normal',   false, false, 180,  true, 160),
 ('temple.opening_hours',    'schedule', 'เวลาเปิด-ปิด',               'normal',   false, false, 90,   true, 170),
 ('temple.chanting_schedule','schedule', 'ตารางทำวัตร',                'normal',   false, false, 90,   true, 180),
 ('temple.donation_account', 'finance',  'บัญชีรับบริจาค',              'critical', false, false, 365,  true, 190);
grant select on public.data_field_catalog to anon, authenticated;

-- Sources ---------------------------------------------------------------------------------------
create table public.data_sources (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid() primary key,
  source_type text not null check (source_type in (
    'onab_registry', 'onab_provincial', 'royal_gazette',                                  -- tier 1
    'temple_website', 'temple_facebook', 'temple_line', 'temple_document', 'temple_office', 'temple_admin_entry', -- tier 2
    'google_maps', 'news', 'travel_site', 'other')),                                      -- tier 3
  tier int generated always as (case
    when source_type in ('onab_registry', 'onab_provincial', 'royal_gazette') then 1
    when source_type like 'temple\_%' then 2 else 3 end) stored,
  source_name text not null check (char_length(source_name) between 2 and 300),
  source_url text,
  source_document text,
  source_date date,
  retrieved_at timestamptz not null default now(),
  evidence text,                          -- quoted text / document reference / file hash
  is_ai_assisted boolean not null default false,
  recorded_by uuid references public.persons(id),
  created_at timestamptz not null default now(),
  unique (temple_id, id),
  check (source_type = 'temple_admin_entry' or source_url is not null or source_document is not null)
);

-- Field values ----------------------------------------------------------------------------------
create table public.temple_field_values (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid() primary key,
  field_key text not null references public.data_field_catalog(field_key),
  value jsonb not null check (value <> 'null'::jsonb and value <> '""'::jsonb),
  source_id uuid not null,
  status text not null check (status in ('DISCOVERED', 'SOURCE_FOUND', 'SOURCE_VERIFIED', 'CROSS_CHECKED',
    'WAITING_TEMPLE_CONFIRMATION', 'TEMPLE_CONFIRMED', 'PUBLISHED', 'CONFLICT', 'REJECTED', 'OUTDATED', 'SUSPENDED')),
  first_approved_by uuid references public.persons(id),     -- critical fields: first of two approvers
  first_approved_at timestamptz,
  verified_by uuid references public.persons(id),
  verified_at timestamptz,
  last_reviewed_at timestamptz,
  verification_expires_at timestamptz,
  status_reason text,
  created_by uuid references public.persons(id),
  created_at timestamptz not null default now(),
  unique (temple_id, id),
  foreign key (temple_id, source_id) references public.data_sources(temple_id, id),
  check (status not in ('TEMPLE_CONFIRMED', 'PUBLISHED') or (verified_by is not null and verified_at is not null))
);
create index on public.temple_field_values (temple_id, field_key);

-- Append-only history of every change ----------------------------------------------------------
create table public.temple_field_value_history (
  temple_id uuid not null references public.temples(id),
  id bigserial primary key,
  value_id uuid not null,
  field_key text not null,
  action text not null,
  old_value jsonb, new_value jsonb,
  old_status text, new_status text,
  source_id uuid,
  reason text,
  actor text not null,
  at timestamptz not null default now(),
  unique (temple_id, id),
  foreign key (temple_id, value_id) references public.temple_field_values(temple_id, id)
);
create trigger tfv_history_append_only before update or delete on public.temple_field_value_history
  for each row execute function app.deny_mutation();

create function app.tfv_history() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.temple_field_value_history(temple_id, value_id, field_key, action, old_value, new_value,
    old_status, new_status, source_id, reason, actor)
  values (new.temple_id, new.id, new.field_key, case when tg_op = 'INSERT' then 'created' else 'changed' end,
    case when tg_op = 'UPDATE' then old.value end, new.value,
    case when tg_op = 'UPDATE' then old.status end, new.status, new.source_id,
    nullif(current_setting('app.change_reason', true), ''),
    coalesce(app.current_person_id()::text, 'system:db'));
  return new;
end $$;
create trigger tfv_history after insert or update on public.temple_field_values for each row execute function app.tfv_history();
create trigger tfv_no_delete before delete on public.temple_field_values for each row execute function app.deny_mutation();
create trigger sources_no_change before update or delete on public.data_sources for each row execute function app.deny_mutation();

-- RLS: read for temple admins (temple.settings) and platform admins; no direct writes ------------
alter table public.data_field_catalog enable row level security;
alter table public.data_field_catalog force row level security;
create policy catalog_read on public.data_field_catalog for select to anon, authenticated using (true);
do $$ declare t text; begin
  foreach t in array array['data_sources', 'temple_field_values', 'temple_field_value_history'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (app.has_permission(temple_id, ''temple.settings'', ''T'') or app.is_platform_admin())', t || '_read', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop; end $$;

-- Helpers ---------------------------------------------------------------------------------------
create function app.can_edit_temple_data(p_temple uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select app.is_platform_admin() or app.has_permission(p_temple, 'temple.settings', 'T')
$$;
create function app.is_temple_abbot(p_temple uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.memberships m join public.membership_roles r on r.temple_id = m.temple_id and r.membership_id = m.id
                 where m.temple_id = p_temple and m.person_id = app.current_person_id() and m.status = 'active' and r.role_code = 'abbot')
$$;

-- Mark CONFLICT when two live candidates of the same field disagree. Never picks a winner.
create function app.detect_conflicts(p_temple uuid, p_field text) returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  select count(distinct value) into n from public.temple_field_values
   where temple_id = p_temple and field_key = p_field and status not in ('REJECTED', 'OUTDATED', 'SUSPENDED');
  if n > 1 then
    perform set_config('app.change_reason', 'conflict detected: sources disagree', true);
    update public.temple_field_values set status = 'CONFLICT', status_reason = 'แหล่งข้อมูลไม่ตรงกัน ต้องให้วัดยืนยัน'
     where temple_id = p_temple and field_key = p_field and status not in ('REJECTED', 'OUTDATED', 'SUSPENDED', 'CONFLICT');
    return n;
  end if;
  return 0;
end $$;

-- Record a candidate value with its source. Initial status depends on source tier; AI-assisted never above DISCOVERED.
create function app.record_field_value(p_temple uuid, p_field text, p_value jsonb, p_source_type text, p_source_name text,
  p_source_url text, p_source_document text, p_source_date date, p_evidence text, p_ai_assisted boolean default false)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); s uuid; v uuid; v_tier int; st text;
begin
  if not app.can_edit_temple_data(p_temple) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.data_field_catalog where field_key = p_field) then raise exception 'unknown field' using errcode = '22023'; end if;
  insert into public.data_sources(temple_id, source_type, source_name, source_url, source_document, source_date, evidence, is_ai_assisted, recorded_by)
  values (p_temple, p_source_type, p_source_name, nullif(btrim(p_source_url), ''), nullif(btrim(p_source_document), ''), p_source_date,
          nullif(btrim(p_evidence), ''), p_ai_assisted, me)
  returning data_sources.id, data_sources.tier into s, v_tier;
  st := case when p_ai_assisted or v_tier = 3 then 'DISCOVERED'
             when p_source_type = 'temple_admin_entry' then 'WAITING_TEMPLE_CONFIRMATION'
             else 'SOURCE_FOUND' end;
  perform set_config('app.change_reason', 'recorded from ' || p_source_type, true);
  insert into public.temple_field_values(temple_id, field_key, value, source_id, status, created_by)
  values (p_temple, p_field, p_value, s, st, me) returning id into v;
  perform app.detect_conflicts(p_temple, p_field);
  return v;
end $$;

-- State machine -----------------------------------------------------------------------------------
create function app.advance_field_value(p_value uuid, p_to text, p_reason text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; me uuid := app.current_person_id(); risk text; plat boolean := app.is_platform_admin(); exp int;
begin
  select v.*, d.tier, d.is_ai_assisted, c.risk as f_risk, c.expiry_days into r
    from public.temple_field_values v join public.data_sources d on d.temple_id = v.temple_id and d.id = v.source_id
    join public.data_field_catalog c on c.field_key = v.field_key where v.id = p_value for update of v;
  if not found then raise exception 'value not found' using errcode = 'P0002'; end if;
  if not app.can_edit_temple_data(r.temple_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if r.is_ai_assisted and p_to not in ('REJECTED') then
    raise exception 'AI-assisted values cannot be verified; record the value again from a real source' using errcode = '42501';
  end if;
  if p_to in ('REJECTED', 'OUTDATED', 'SUSPENDED') and coalesce(btrim(p_reason), '') = '' then
    raise exception 'reason required' using errcode = '23514';
  end if;
  -- allowed transitions and who may perform them
  if not (
       (r.status = 'SOURCE_FOUND' and p_to = 'SOURCE_VERIFIED' and plat and r.tier = 1)
    or (r.status = 'SOURCE_VERIFIED' and p_to = 'CROSS_CHECKED' and plat)
    or (r.status in ('SOURCE_VERIFIED', 'CROSS_CHECKED') and p_to = 'WAITING_TEMPLE_CONFIRMATION')
    or (r.status = 'SOURCE_FOUND' and r.tier = 2 and p_to = 'WAITING_TEMPLE_CONFIRMATION')
    or (r.status = 'WAITING_TEMPLE_CONFIRMATION' and p_to = 'TEMPLE_CONFIRMED')
    or (r.status = 'TEMPLE_CONFIRMED' and p_to = 'PUBLISHED')
    or (p_to = 'REJECTED' and r.status not in ('REJECTED'))
    or (p_to = 'OUTDATED' and r.status in ('TEMPLE_CONFIRMED', 'PUBLISHED'))
    or (p_to = 'SUSPENDED' and plat)
  ) then raise exception 'transition % -> % not allowed', r.status, p_to using errcode = '22023'; end if;

  if p_to = 'TEMPLE_CONFIRMED' then
    -- only the temple itself confirms (platform admin cannot confirm on the temple's behalf)
    if not app.has_permission(r.temple_id, 'temple.settings', 'T') then
      raise exception 'only the temple can confirm its data' using errcode = '42501';
    end if;
    if r.f_risk = 'critical' then
      if r.first_approved_by is null then
        update public.temple_field_values set first_approved_by = me, first_approved_at = now(),
               status_reason = 'อนุมัติขั้นที่ 1 แล้ว รอเจ้าอาวาสยืนยันขั้นที่ 2' where id = p_value;
        return;  -- stays WAITING_TEMPLE_CONFIRMATION
      end if;
      if r.first_approved_by = me then raise exception 'second approval must be a different person' using errcode = '42501'; end if;
      if not app.is_temple_abbot(r.temple_id) then raise exception 'second approval must be the abbot' using errcode = '42501'; end if;
    end if;
    perform set_config('app.change_reason', coalesce(p_reason, 'confirmed by temple'), true);
    update public.temple_field_values set status = 'TEMPLE_CONFIRMED', verified_by = me, verified_at = now(), last_reviewed_at = now(),
           verification_expires_at = case when r.expiry_days is null then null else now() + make_interval(days => r.expiry_days) end,
           status_reason = null
     where id = p_value;
    return;
  end if;
  perform set_config('app.change_reason', coalesce(p_reason, 'status ' || p_to), true);
  update public.temple_field_values set status = p_to, status_reason = p_reason where id = p_value;
end $$;

-- Re-review a confirmed value (extends expiry); only the temple.
create function app.reconfirm_field_value(p_value uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r record;
begin
  select v.temple_id, v.status, c.expiry_days into r from public.temple_field_values v join public.data_field_catalog c using (field_key) where v.id = p_value;
  if not found or r.status not in ('TEMPLE_CONFIRMED', 'PUBLISHED') then raise exception 'not confirmed' using errcode = '22023'; end if;
  if not app.has_permission(r.temple_id, 'temple.settings', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  perform set_config('app.change_reason', 'reconfirmed by temple', true);
  update public.temple_field_values set verified_by = app.current_person_id(), verified_at = now(), last_reviewed_at = now(),
         verification_expires_at = case when r.expiry_days is null then null else now() + make_interval(days => r.expiry_days) end
   where id = p_value;
end $$;

-- Resolve a conflict: the temple picks one candidate; the others are rejected with the reason.
create function app.resolve_conflict(p_winner uuid, p_reason text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r record;
begin
  select temple_id, field_key, status into r from public.temple_field_values where id = p_winner;
  if not found or r.status <> 'CONFLICT' then raise exception 'not in conflict' using errcode = '22023'; end if;
  if not app.has_permission(r.temple_id, 'temple.settings', 'T') then raise exception 'only the temple resolves conflicts' using errcode = '42501'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'reason required' using errcode = '23514'; end if;
  perform set_config('app.change_reason', 'conflict resolved: ' || p_reason, true);
  update public.temple_field_values set status = 'REJECTED', status_reason = 'ไม่ถูกเลือกเมื่อแก้ข้อมูลขัดกัน: ' || p_reason
   where temple_id = r.temple_id and field_key = r.field_key and status = 'CONFLICT' and id <> p_winner;
  update public.temple_field_values set status = 'WAITING_TEMPLE_CONFIRMATION', status_reason = null where id = p_winner;
end $$;

-- Effective status: confirmed values past expiry read as VERIFICATION_EXPIRED (never shown as current).
create function app.effective_status(p_status text, p_expires timestamptz) returns text language sql immutable as $$
  select case when p_status in ('TEMPLE_CONFIRMED', 'PUBLISHED') and p_expires is not null and p_expires < now() then 'VERIFICATION_EXPIRED' else p_status end
$$;

-- Temple readiness: every acceptance check with its result. Nothing is "ready" without evidence in the DB.
create function app.temple_readiness(p_temple uuid) returns table (check_key text, label_th text, passed boolean, detail text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.can_edit_temple_data(p_temple) then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select 'official_identity', 'วัดมีตัวตนในแหล่งข้อมูลทางราชการ',
         exists (select 1 from public.temple_field_values v join public.data_sources d on d.temple_id = v.temple_id and d.id = v.source_id
                  where v.temple_id = p_temple and v.field_key = 'temple.name_th' and d.tier = 1
                    and v.status in ('SOURCE_VERIFIED', 'CROSS_CHECKED', 'WAITING_TEMPLE_CONFIRMATION', 'TEMPLE_CONFIRMED', 'PUBLISHED')),
         'ต้องมีชื่อวัดจากทะเบียนวัด (สำนักงานพระพุทธศาสนาแห่งชาติ) ที่ผู้ดูแลระบบตรวจหลักฐานแล้ว'
  union all
  select 'claim_approved', 'ผู้ดูแลวัดผ่านการตรวจสอบ',
         exists (select 1 from public.temples where id = p_temple and status = 'approved'), 'ใบสมัครดูแลวัดได้รับอนุมัติ'
  union all
  select 'required_confirmed', 'ข้อมูลหลักได้รับการยืนยันจากวัด',
         not exists (select 1 from public.data_field_catalog c where c.required_for_publish and not exists (
           select 1 from public.temple_field_values v where v.temple_id = p_temple and v.field_key = c.field_key
              and app.effective_status(v.status, v.verification_expires_at) in ('TEMPLE_CONFIRMED', 'PUBLISHED'))),
         'ชื่อวัด จังหวัด ที่อยู่ ต้องยืนยันโดยวัด'
  union all
  select 'no_conflict', 'ไม่มีข้อมูลขัดกัน',
         not exists (select 1 from public.temple_field_values where temple_id = p_temple and status = 'CONFLICT'), 'ข้อมูลที่ขัดกันต้องให้วัดเลือก'
  union all
  select 'no_ai_data', 'ไม่มีข้อมูลที่ AI สร้างเผยแพร่อยู่',
         not exists (select 1 from public.temple_field_values v join public.data_sources d on d.temple_id = v.temple_id and d.id = v.source_id
                      where v.temple_id = p_temple and d.is_ai_assisted and v.status in ('TEMPLE_CONFIRMED', 'PUBLISHED')), ''
  union all
  select 'no_expired', 'ไม่มีข้อมูลที่หมดอายุการตรวจสอบ',
         not exists (select 1 from public.temple_field_values where temple_id = p_temple
                       and app.effective_status(status, verification_expires_at) = 'VERIFICATION_EXPIRED'), 'ต้องตรวจซ้ำตามกำหนด';
end $$;

create function app.is_verified_temple(p_temple uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  -- same checks as temple_readiness, without the caller restriction (used by the public surface)
  select exists (select 1 from public.temple_field_values v join public.data_sources d on d.temple_id = v.temple_id and d.id = v.source_id
                  where v.temple_id = p_temple and v.field_key = 'temple.name_th' and d.tier = 1
                    and v.status in ('SOURCE_VERIFIED', 'CROSS_CHECKED', 'WAITING_TEMPLE_CONFIRMATION', 'TEMPLE_CONFIRMED', 'PUBLISHED'))
     and exists (select 1 from public.temples where id = p_temple and status = 'approved')
     and not exists (select 1 from public.data_field_catalog c where c.required_for_publish and not exists (
           select 1 from public.temple_field_values v where v.temple_id = p_temple and v.field_key = c.field_key
              and app.effective_status(v.status, v.verification_expires_at) in ('TEMPLE_CONFIRMED', 'PUBLISHED')))
     and not exists (select 1 from public.temple_field_values where temple_id = p_temple and status = 'CONFLICT')
     and not exists (select 1 from public.temple_field_values where temple_id = p_temple
                       and app.effective_status(status, verification_expires_at) = 'VERIFICATION_EXPIRED')
$$;

-- Platform overview for /admin/data-verification
create function app.verification_overview()
returns table (temple_id uuid, temple_name text, temple_status text, verified bigint, awaiting bigint, conflict bigint,
               expired bigint, rejected bigint, missing_source bigint, is_verified boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select t.id, t.name_th, t.status,
    count(*) filter (where app.effective_status(v.status, v.verification_expires_at) in ('TEMPLE_CONFIRMED', 'PUBLISHED')),
    count(*) filter (where v.status in ('DISCOVERED', 'SOURCE_FOUND', 'SOURCE_VERIFIED', 'CROSS_CHECKED', 'WAITING_TEMPLE_CONFIRMATION')),
    count(*) filter (where v.status = 'CONFLICT'),
    count(*) filter (where app.effective_status(v.status, v.verification_expires_at) = 'VERIFICATION_EXPIRED'),
    count(*) filter (where v.status = 'REJECTED'),
    (select count(*) from public.data_field_catalog c where not exists (
       select 1 from public.temple_field_values x where x.temple_id = t.id and x.field_key = c.field_key and x.status <> 'REJECTED')),
    app.is_verified_temple(t.id)
  from public.temples t left join public.temple_field_values v on v.temple_id = t.id
  group by t.id order by t.created_at;
end $$;

-- Claim approval now REQUIRES official registry evidence recorded and verified by the platform admin --
create or replace function app.review_temple(p_temple uuid, p_decision text, p_note text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'bad decision' using errcode = '22023'; end if;
  if p_decision = 'approved' and not exists (
     select 1 from public.temple_field_values v join public.data_sources d on d.temple_id = v.temple_id and d.id = v.source_id
      where v.temple_id = p_temple and v.field_key = 'temple.name_th' and d.tier = 1
        and v.status in ('SOURCE_VERIFIED', 'CROSS_CHECKED', 'WAITING_TEMPLE_CONFIRMATION', 'TEMPLE_CONFIRMED', 'PUBLISHED')) then
    raise exception 'official registry evidence required before approval' using errcode = '55000';
  end if;
  update public.temples set status = p_decision, reviewed_by = app.current_person_id(), reviewed_at = now(),
         review_note = nullif(btrim(p_note), '')
   where id = p_temple and status = 'pending';
  if not found then raise exception 'temple is not pending' using errcode = 'P0002'; end if;
  perform app.write_audit(p_temple, 'temple.' || p_decision, 'temples', p_temple, null, null);
end $$;

-- Claim details on the application ------------------------------------------------------------------
alter table public.temples
  add column claim_relationship text check (claim_relationship in ('abbot', 'assistant_abbot', 'monk_secretary', 'waiyawatchakon', 'temple_committee', 'temple_staff')),
  add column claim_registry_number text,
  add column claim_evidence text check (char_length(claim_evidence) <= 1000);

drop function app.register_temple(text, text, text, text, text);
create function app.register_temple(p_name_th text, p_province text, p_address_th text, p_phone text, p_description_th text,
  p_relationship text, p_registry_number text, p_evidence text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); t uuid; m uuid; pending int;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if coalesce(btrim(p_name_th), '') = '' or coalesce(btrim(p_province), '') = '' or p_relationship is null
     or coalesce(btrim(p_evidence), '') = '' then
    raise exception 'name, province, relationship and evidence are required' using errcode = '23514';
  end if;
  select count(*) into pending from public.temples where created_by = me and status = 'pending';
  if pending >= 3 then raise exception 'too many pending applications' using errcode = '54000'; end if;
  insert into public.temples(slug, name_th, province, address_th, phone, description_th, created_by,
                             claim_relationship, claim_registry_number, claim_evidence)
  values ('t-' || substr(md5(gen_random_uuid()::text), 1, 10), btrim(p_name_th), btrim(p_province),
          nullif(btrim(p_address_th), ''), nullif(btrim(p_phone), ''), nullif(btrim(p_description_th), ''), me,
          p_relationship, nullif(btrim(p_registry_number), ''), btrim(p_evidence))
  returning id into t;
  insert into public.memberships(temple_id, person_id, status) values (t, me, 'active') returning id into m;
  insert into public.membership_roles(temple_id, membership_id, role_code) values (t, m, 'temple_admin');
  -- what the applicant typed becomes CANDIDATE values from source "temple_admin_entry" — never public until confirmed
  perform app.record_field_value(t, 'temple.name_th', to_jsonb(btrim(p_name_th)), 'temple_admin_entry', 'กรอกโดยผู้สมัครดูแลวัด', null, null, null, null);
  perform app.record_field_value(t, 'temple.province', to_jsonb(btrim(p_province)), 'temple_admin_entry', 'กรอกโดยผู้สมัครดูแลวัด', null, null, null, null);
  if coalesce(btrim(p_address_th), '') <> '' then
    perform app.record_field_value(t, 'temple.address', to_jsonb(btrim(p_address_th)), 'temple_admin_entry', 'กรอกโดยผู้สมัครดูแลวัด', null, null, null, null);
  end if;
  if coalesce(btrim(p_phone), '') <> '' then
    perform app.record_field_value(t, 'temple.office_phone', to_jsonb(btrim(p_phone)), 'temple_admin_entry', 'กรอกโดยผู้สมัครดูแลวัด', null, null, null, null);
  end if;
  if coalesce(btrim(p_registry_number), '') <> '' then
    perform app.record_field_value(t, 'temple.registry_number', to_jsonb(btrim(p_registry_number)), 'temple_admin_entry', 'กรอกโดยผู้สมัครดูแลวัด', null, null, null, null);
  end if;
  perform app.write_audit(t, 'temple.registered', 'temples', t, null, null);
  return t;
end $$;

drop function app.pending_temples();
create function app.pending_temples()
returns table (id uuid, name_th text, province text, address_th text, phone text, description_th text,
               applicant_name text, created_at timestamptz, claim_relationship text, claim_registry_number text,
               claim_evidence text, has_official_evidence boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select t.id, t.name_th, t.province, t.address_th, t.phone, t.description_th, p.display_name, t.created_at,
      t.claim_relationship, t.claim_registry_number, t.claim_evidence,
      exists (select 1 from public.temple_field_values v join public.data_sources d on d.temple_id = v.temple_id and d.id = v.source_id
               where v.temple_id = t.id and v.field_key = 'temple.name_th' and d.tier = 1
                 and v.status in ('SOURCE_VERIFIED', 'CROSS_CHECKED', 'WAITING_TEMPLE_CONFIRMATION', 'TEMPLE_CONFIRMED', 'PUBLISHED'))
    from public.temples t left join public.persons p on p.id = t.created_by
   where t.status = 'pending' order by t.created_at;
end $$;

-- update_temple_profile: only the listing switch remains here; data fields go through record_field_value
drop function app.update_temple_profile(uuid, text, text, text, text, text, boolean);
create function app.set_temple_listed(p_temple uuid, p_listed boolean) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.has_permission(p_temple, 'temple.settings', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.temples set is_listed = p_listed where id = p_temple;
  perform app.write_audit(p_temple, 'temple.listing_' || case when p_listed then 'on' else 'off' end, 'temples', p_temple, null, null);
end $$;

-- Parking lots also need temple confirmation before the public sees them ----------------------------
alter table public.parking_lots add column verification_status text not null default 'WAITING_TEMPLE_CONFIRMATION'
  check (verification_status in ('WAITING_TEMPLE_CONFIRMATION', 'TEMPLE_CONFIRMED', 'REJECTED', 'OUTDATED'));

-- PUBLIC SURFACE: only verified temples, only confirmed & unexpired values (enforced here, not in the UI) --
create function public.temple_public_fields(p_slug text)
returns table (field_key text, label_th text, category text, value jsonb, badge text, verified_at timestamptz,
               verification_expires_at timestamptz, source_tier int, source_name text, sort int)
language sql stable security definer set search_path = public as $$
  select v.field_key, c.label_th, c.category, v.value, 'TEMPLE_CONFIRMED', v.verified_at, v.verification_expires_at,
         d.tier, d.source_name, c.sort
    from public.temples t
    join public.temple_field_values v on v.temple_id = t.id
    join public.data_field_catalog c on c.field_key = v.field_key and c.public_allowed
    join public.data_sources d on d.temple_id = v.temple_id and d.id = v.source_id
   where t.slug = p_slug and t.is_listed and t.status = 'approved' and app.is_verified_temple(t.id)
     and app.effective_status(v.status, v.verification_expires_at) in ('TEMPLE_CONFIRMED', 'PUBLISHED')
   order by c.sort
$$;

drop function public.listed_temples(text);
create function public.listed_temples(p_query text default null)
returns table (slug text, name_th text, province text)
language sql stable security definer set search_path = public as $$
  with pub as (
    select t.slug, t.id,
      (select v.value #>> '{}' from public.temple_field_values v where v.temple_id = t.id and v.field_key = 'temple.name_th'
         and app.effective_status(v.status, v.verification_expires_at) in ('TEMPLE_CONFIRMED', 'PUBLISHED') limit 1) as name_th,
      (select v.value #>> '{}' from public.temple_field_values v where v.temple_id = t.id and v.field_key = 'temple.province'
         and app.effective_status(v.status, v.verification_expires_at) in ('TEMPLE_CONFIRMED', 'PUBLISHED') limit 1) as province
    from public.temples t where t.is_listed and t.status = 'approved' and app.is_verified_temple(t.id))
  select slug, name_th, province from pub
   where name_th is not null
     and (coalesce(btrim(p_query), '') = '' or name_th ilike '%' || btrim(p_query) || '%' or province ilike '%' || btrim(p_query) || '%')
   order by name_th limit 100
$$;

drop function public.temple_profile(text);
create function public.temple_profile(p_slug text)
returns table (slug text, is_verified_temple boolean)
language sql stable security definer set search_path = public as $$
  select t.slug, true from public.temples t
   where t.slug = p_slug and t.is_listed and t.status = 'approved' and app.is_verified_temple(t.id)
$$;

create or replace function public.temple_parking(p_slug text, p_at timestamptz default now())
returns table (temple_name_th text, parking_declared text, lot_code text, lot_name_th text, capacity int,
               accessible_spaces int, vehicle_types text[], fee_note_th text, hours_note_th text,
               status text, free_spaces int, reported_at timestamptz)
language sql stable security definer set search_path = public as $$
  with t as (select * from public.temples where slug = p_slug and is_listed and status = 'approved' and app.is_verified_temple(id)),
  lots as (
    select l.*, r.status as r_status, r.free_spaces as r_free, r.reported_at as r_at
    from t join public.parking_lots l on l.temple_id = t.id and l.active and l.is_public and l.verification_status = 'TEMPLE_CONFIRMED'
    left join lateral (
      select s.status, s.free_spaces, s.reported_at from public.parking_status_reports s
      where s.temple_id = l.temple_id and s.lot_id = l.id and s.reported_at <= p_at
      order by s.reported_at desc limit 1) r on true
  )
  select t.name_th, t.parking_declared, l.code, l.name_th, l.capacity, l.accessible_spaces, l.vehicle_types,
         l.fee_note_th, l.hours_note_th,
         case when l.r_at is null or l.r_at < p_at - make_interval(mins => l.stale_after_minutes) then 'UNKNOWN' else l.r_status end,
         case when l.r_at is null or l.r_at < p_at - make_interval(mins => l.stale_after_minutes) then null else l.r_free end,
         l.r_at
  from t left join lots l on true
  order by l.code
$$;

revoke all on function public.listed_temples(text), public.temple_profile(text), public.temple_public_fields(text) from public;
grant execute on function public.listed_temples(text), public.temple_profile(text), public.temple_public_fields(text) to anon, authenticated;
grant execute on function app.record_field_value(uuid, text, jsonb, text, text, text, text, date, text, boolean),
  app.advance_field_value(uuid, text, text), app.reconfirm_field_value(uuid), app.resolve_conflict(uuid, text),
  app.temple_readiness(uuid), app.verification_overview(), app.set_temple_listed(uuid, boolean),
  app.register_temple(text, text, text, text, text, text, text, text), app.pending_temples() to authenticated;

commit;
