-- 0004 Parking: "เลือกวัดแล้วดูได้ว่ามีที่จอดไหม"
-- Members read the tables through RLS. Visitors (anyone, incl. not-logged-in) read ONLY through
-- public.listed_temples() and public.temple_parking(slug), which expose public lots of temples that opted in.
-- Status comes from staff reports; no report or a stale report => UNKNOWN. Nothing is estimated.
begin;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
end $$;

alter table public.temples
  add column is_listed boolean not null default false,          -- temple opts in to public discovery
  add column parking_declared text not null default 'unknown'   -- unknown | none (temple has no parking) | lots
    check (parking_declared in ('unknown', 'none', 'lots'));

create table public.parking_lots (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  code text not null,                                   -- e.g. 'P1'; may match a building/zone code
  name_th text not null,
  name_en text,
  capacity int check (capacity > 0),                    -- null = not known
  accessible_spaces int check (accessible_spaces >= 0),
  vehicle_types text[] not null default '{car}' check (vehicle_types <@ array['car','motorcycle','van','bus']),
  fee_note_th text,                                     -- free text, e.g. 'ฟรี' / 'ชั่วโมงละ 20 บาท'
  hours_note_th text,
  is_public boolean not null default true,
  active boolean not null default true,
  stale_after_minutes int not null default 60 check (stale_after_minutes between 5 and 1440),  -- HYPOTHESIS default
  created_at timestamptz not null default now(),
  primary key (id),
  unique (temple_id, id),
  unique (temple_id, code)
);

create table public.parking_status_reports (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid() primary key,
  lot_id uuid not null,
  status text not null check (status in ('AVAILABLE', 'FILLING', 'FULL', 'CLOSED')),  -- UNKNOWN is never stored
  free_spaces int check (free_spaces >= 0),             -- optional; only what the reporter counted
  note_th text,
  reported_by uuid not null references public.persons(id),
  reported_at timestamptz not null default now(),
  foreign key (temple_id, lot_id) references public.parking_lots(temple_id, id)
);
create index on public.parking_status_reports (temple_id, lot_id, reported_at desc);

-- free_spaces cannot exceed a known capacity; reports are append-only
create function app.parking_report_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare cap int;
begin
  select capacity into cap from public.parking_lots where temple_id = new.temple_id and id = new.lot_id;
  if new.free_spaces is not null and cap is not null and new.free_spaces > cap then
    raise exception 'free_spaces % exceeds capacity %', new.free_spaces, cap using errcode = '23514';
  end if;
  if new.status = 'FULL' and coalesce(new.free_spaces, 0) <> 0 then
    raise exception 'FULL with free_spaces %', new.free_spaces using errcode = '23514';
  end if;
  return new;
end $$;
create trigger parking_report_guard before insert on public.parking_status_reports
  for each row execute function app.parking_report_guard();
create trigger parking_reports_append_only before update or delete on public.parking_status_reports
  for each row execute function app.deny_mutation();

alter table public.parking_lots enable row level security;
alter table public.parking_lots force row level security;
alter table public.parking_status_reports enable row level security;
alter table public.parking_status_reports force row level security;

create policy parking_lots_sel on public.parking_lots for select to authenticated using (app.is_member(temple_id));
create policy parking_lots_ins on public.parking_lots for insert to authenticated
  with check (app.has_permission(temple_id, 'parking.manage', 'T'));
create policy parking_lots_upd on public.parking_lots for update to authenticated
  using (app.has_permission(temple_id, 'parking.manage', 'T')) with check (app.has_permission(temple_id, 'parking.manage', 'T'));
create policy parking_reports_sel on public.parking_status_reports for select to authenticated using (app.is_member(temple_id));
create policy parking_reports_ins on public.parking_status_reports for insert to authenticated
  with check (app.has_permission(temple_id, 'parking.report', 'T') and reported_by = app.current_person_id());

grant select on public.parking_lots, public.parking_status_reports to authenticated;
grant insert, update on public.parking_lots to authenticated;
grant insert on public.parking_status_reports to authenticated;

-- Public surface -------------------------------------------------------------------------------
create function public.listed_temples()
returns table (slug text, name_th text, name_en text)
language sql stable security definer set search_path = public as $$
  select t.slug, t.name_th, t.name_en from public.temples t where t.is_listed order by t.name_th
$$;

-- One row per public active lot; if the temple has no public lot, one row with lot fields null so the
-- client can show parking_declared ('none' => ไม่มีที่จอดของวัด, 'unknown' => วัดยังไม่ได้ให้ข้อมูล).
create function public.temple_parking(p_slug text, p_at timestamptz default now())
returns table (temple_name_th text, parking_declared text, lot_code text, lot_name_th text, capacity int,
               accessible_spaces int, vehicle_types text[], fee_note_th text, hours_note_th text,
               status text, free_spaces int, reported_at timestamptz)
language sql stable security definer set search_path = public as $$
  with t as (select * from public.temples where slug = p_slug and is_listed),
  lots as (
    select l.*, r.status as r_status, r.free_spaces as r_free, r.reported_at as r_at
    from t join public.parking_lots l on l.temple_id = t.id and l.active and l.is_public
    left join lateral (
      select s.status, s.free_spaces, s.reported_at from public.parking_status_reports s
      where s.temple_id = l.temple_id and s.lot_id = l.id and s.reported_at <= p_at
      order by s.reported_at desc limit 1) r on true
  )
  select t.name_th, t.parking_declared, l.code, l.name_th, l.capacity, l.accessible_spaces, l.vehicle_types,
         l.fee_note_th, l.hours_note_th,
         case when l.r_at is null or l.r_at < p_at - make_interval(mins => l.stale_after_minutes) then 'UNKNOWN'
              else l.r_status end,
         case when l.r_at is null or l.r_at < p_at - make_interval(mins => l.stale_after_minutes) then null
              else l.r_free end,
         l.r_at                                       -- last report time is shown even when stale ("อัปเดตล่าสุด")
  from t left join lots l on true
  order by l.code
$$;

revoke all on function public.listed_temples() from public;
revoke all on function public.temple_parking(text, timestamptz) from public;
grant execute on function public.listed_temples() to anon, authenticated;
grant execute on function public.temple_parking(text, timestamptz) to anon, authenticated;
grant usage on schema public to anon;

commit;
