-- 0005 Login (email + 6-digit code), temple registration with platform approval, public temple profile.
-- authx.* is used only by the server process (owner role); never granted to anon/authenticated.
-- The server switches to role `authenticated` with request.jwt.claims.sub = authx.users.id for member requests,
-- exactly like Supabase Auth, so all RLS policies apply unchanged.
begin;

create schema if not exists authx;
create table authx.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);
create table authx.login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,                       -- sha256(code + pepper), never the code itself
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on authx.login_codes (email, created_at desc);
create table authx.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references authx.users(id),
  token_hash text not null unique,               -- sha256(cookie token)
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
revoke all on schema authx from public;

-- Temple registration fields ------------------------------------------------------------------
alter table public.temples
  add column status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  add column province text,
  add column address_th text,
  add column phone text,
  add column description_th text check (char_length(description_th) <= 1000),
  add column created_by uuid references public.persons(id),
  add column reviewed_by uuid references public.persons(id),
  add column reviewed_at timestamptz,
  add column review_note text;

create table public.platform_admins (person_id uuid primary key references public.persons(id));
alter table public.platform_admins enable row level security;
alter table public.platform_admins force row level security;
create policy platform_admins_self on public.platform_admins for select to authenticated using (person_id = app.current_person_id());
grant select on public.platform_admins to authenticated;

create function app.is_platform_admin() returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.platform_admins where person_id = app.current_person_id())
$$;

-- Anyone signed in may apply; the temple stays pending (invisible to the public) until a platform admin approves.
create function app.register_temple(p_name_th text, p_province text, p_address_th text, p_phone text, p_description_th text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); t uuid; m uuid; pending int;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if coalesce(btrim(p_name_th), '') = '' or coalesce(btrim(p_province), '') = '' then
    raise exception 'name and province are required' using errcode = '23514';
  end if;
  select count(*) into pending from public.temples where created_by = me and status = 'pending';
  if pending >= 3 then raise exception 'too many pending applications' using errcode = '54000'; end if;
  insert into public.temples(slug, name_th, province, address_th, phone, description_th, created_by)
  values ('t-' || substr(md5(gen_random_uuid()::text), 1, 10), btrim(p_name_th), btrim(p_province),
          nullif(btrim(p_address_th), ''), nullif(btrim(p_phone), ''), nullif(btrim(p_description_th), ''), me)
  returning id into t;
  insert into public.memberships(temple_id, person_id, status) values (t, me, 'active') returning id into m;
  insert into public.membership_roles(temple_id, membership_id, role_code) values (t, m, 'temple_admin');
  perform app.write_audit(t, 'temple.registered', 'temples', t, null, null);
  return t;
end $$;

create function app.update_temple_profile(p_temple uuid, p_name_th text, p_province text, p_address_th text,
                                           p_phone text, p_description_th text, p_is_listed boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.has_permission(p_temple, 'temple.settings', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  if coalesce(btrim(p_name_th), '') = '' or coalesce(btrim(p_province), '') = '' then
    raise exception 'name and province are required' using errcode = '23514';
  end if;
  update public.temples set name_th = btrim(p_name_th), province = btrim(p_province),
         address_th = nullif(btrim(p_address_th), ''), phone = nullif(btrim(p_phone), ''),
         description_th = nullif(btrim(p_description_th), ''), is_listed = p_is_listed
   where id = p_temple;
  perform app.write_audit(p_temple, 'temple.profile_updated', 'temples', p_temple, null, null);
end $$;

create function app.pending_temples()
returns table (id uuid, name_th text, province text, address_th text, phone text, description_th text,
               applicant_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select t.id, t.name_th, t.province, t.address_th, t.phone, t.description_th, p.display_name, t.created_at
    from public.temples t left join public.persons p on p.id = t.created_by
   where t.status = 'pending' order by t.created_at;
end $$;

create function app.review_temple(p_temple uuid, p_decision text, p_note text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'bad decision' using errcode = '22023'; end if;
  update public.temples set status = p_decision, reviewed_by = app.current_person_id(), reviewed_at = now(),
         review_note = nullif(btrim(p_note), '')
   where id = p_temple and status = 'pending';
  if not found then raise exception 'temple is not pending' using errcode = 'P0002'; end if;
  perform app.write_audit(p_temple, 'temple.' || p_decision, 'temples', p_temple, null, null);
end $$;

grant execute on function app.register_temple(text, text, text, text, text),
  app.update_temple_profile(uuid, text, text, text, text, text, boolean),
  app.pending_temples(), app.review_temple(uuid, text, text), app.is_platform_admin() to authenticated;

-- Public surface now also requires approval ---------------------------------------------------
drop function public.listed_temples();
create function public.listed_temples(p_query text default null)
returns table (slug text, name_th text, name_en text, province text)
language sql stable security definer set search_path = public as $$
  select t.slug, t.name_th, t.name_en, t.province from public.temples t
   where t.is_listed and t.status = 'approved'
     and (coalesce(btrim(p_query), '') = '' or t.name_th ilike '%' || btrim(p_query) || '%'
          or t.province ilike '%' || btrim(p_query) || '%')
   order by t.name_th limit 100
$$;

create function public.temple_profile(p_slug text)
returns table (slug text, name_th text, province text, address_th text, phone text, description_th text)
language sql stable security definer set search_path = public as $$
  select t.slug, t.name_th, t.province, t.address_th, t.phone, t.description_th
    from public.temples t where t.slug = p_slug and t.is_listed and t.status = 'approved'
$$;

-- temple_parking: same body as 0004 plus the approval requirement
create or replace function public.temple_parking(p_slug text, p_at timestamptz default now())
returns table (temple_name_th text, parking_declared text, lot_code text, lot_name_th text, capacity int,
               accessible_spaces int, vehicle_types text[], fee_note_th text, hours_note_th text,
               status text, free_spaces int, reported_at timestamptz)
language sql stable security definer set search_path = public as $$
  with t as (select * from public.temples where slug = p_slug and is_listed and status = 'approved'),
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
         l.r_at
  from t left join lots l on true
  order by l.code
$$;

revoke all on function public.listed_temples(text), public.temple_profile(text) from public;
grant execute on function public.listed_temples(text), public.temple_profile(text) to anon, authenticated;

commit;
