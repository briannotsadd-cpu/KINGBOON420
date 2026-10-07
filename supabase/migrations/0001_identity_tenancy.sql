-- 0001 identity + tenancy + roles + helpers. Plain PostgreSQL 16. Run as an owner role with BYPASSRLS
-- (superuser locally; `postgres` on Supabase): SECURITY DEFINER helpers must read membership tables past forced RLS.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists app;
grant usage on schema app to authenticated;
grant usage on schema public to authenticated;

-- ---------- global (non-tenant) tables ----------
create table public.persons (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,                      -- = JWT `sub`
  display_name text not null,
  created_at timestamptz not null default now()
);
create table public.temples (
  id uuid primary key default gen_random_uuid(),  -- the tenant
  slug text not null unique,
  name_th text not null,
  name_en text,
  tz text not null default 'Asia/Bangkok',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table public.roles (code text primary key, mode text not null check (mode in ('monastic','community_staff')));
create table public.permissions (code text primary key, restricted boolean not null default false);
create table public.role_permissions (
  role_code text not null references public.roles(code),
  permission_code text not null references public.permissions(code),
  scope text not null,                 -- raw YAML scope, e.g. 'S+P'
  scope_rank smallint not null check (scope_rank between 1 and 3),   -- S/A/P/C=1, D=2, T=3
  condition text,                      -- YAML condition key; delegated/explicit_grant are denied by default
  primary key (role_code, permission_code)
);

-- ---------- tenant tables ----------
create table public.memberships (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  person_id uuid not null references public.persons(id),
  status text not null default 'invited' check (status in ('invited','active','suspended','left')),
  monastic_kind text not null default 'none' check (monastic_kind in ('none','bhikkhu','samanera')),
  is_minor boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  unique (temple_id, person_id)
);
create table public.monastic_attestations (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  membership_id uuid not null,
  kind text not null check (kind in ('bhikkhu','samanera')),
  attester_person_id uuid not null references public.persons(id),
  second_attester_person_id uuid references public.persons(id),   -- two-person rule (temple_admin without abbot/deputy)
  evidence_ref text,
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  foreign key (temple_id, membership_id) references public.memberships(temple_id, id),
  check (second_attester_person_id is null or second_attester_person_id <> attester_person_id)
);
create table public.departments (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  code text not null,
  name_th text not null,
  primary key (temple_id, id),
  unique (temple_id, code)
);
create table public.membership_roles (
  temple_id uuid not null references public.temples(id),
  membership_id uuid not null,
  role_code text not null references public.roles(code),
  primary key (temple_id, membership_id, role_code),
  foreign key (temple_id, membership_id) references public.memberships(temple_id, id)
);
create table public.membership_departments (
  temple_id uuid not null references public.temples(id),
  membership_id uuid not null,
  department_id uuid not null,
  primary key (temple_id, membership_id, department_id),
  foreign key (temple_id, membership_id) references public.memberships(temple_id, id),
  foreign key (temple_id, department_id) references public.departments(temple_id, id)
);
create table public.audit_logs (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  at timestamptz not null default now(),
  actor text not null,                 -- person uuid or 'system:<name>'
  action text not null,
  entity text not null,
  entity_id uuid,
  from_state text, to_state text, reason text,
  primary key (temple_id, id)
);

-- ---------- helpers (SECURITY DEFINER, fixed search_path) ----------
create function app.current_person_id() returns uuid language plpgsql stable security definer set search_path = public, pg_temp as $$
declare sub text; pid uuid;
begin
  sub := nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub';
  if sub is null then return null; end if;
  select id into pid from public.persons where auth_user_id = sub::uuid;
  return pid;
exception when invalid_text_representation then return null;
end $$;

create function app.is_member(p_temple uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.memberships m
                 where m.temple_id = p_temple and m.person_id = app.current_person_id() and m.status = 'active')
$$;

-- highest granted scope rank (0 none, 1 self-ish, 2 department, 3 temple) over the caller's roles in the temple.
-- Fail-closed: conditional grants (delegated / explicit_grant) are ignored; minors lose community.* sub-capabilities.
create function app.permission_rank(p_temple uuid, p_code text) returns int language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r int; minor boolean;
begin
  select m.is_minor into minor from public.memberships m
   where m.temple_id = p_temple and m.person_id = app.current_person_id() and m.status = 'active';
  if not found then return 0; end if;
  if minor and p_code in ('community.p2p_chat','community.calls','community.public_profile') then return 0; end if;
  select coalesce(max(rp.scope_rank), 0) into r
    from public.memberships m
    join public.membership_roles mr on mr.temple_id = m.temple_id and mr.membership_id = m.id
    join public.role_permissions rp on rp.role_code = mr.role_code and rp.permission_code = p_code
   where m.temple_id = p_temple and m.person_id = app.current_person_id() and m.status = 'active'
     and (rp.condition is null or rp.condition not in ('delegated','explicit_grant'));
  return r;
end $$;

-- required scope: 'S' (1), 'D' (2), 'T' (3)
create function app.has_permission(p_temple uuid, p_code text, p_scope text default 'S') returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select app.permission_rank(p_temple, p_code) >= case p_scope when 'T' then 3 when 'D' then 2 else 1 end
$$;

-- row-level scope: T -> any row; D -> row's department is one of mine (or row owner is me); S/A/P/C -> row owner is me.
create function app.in_scope(p_temple uuid, p_code text, p_owner uuid, p_dept uuid) returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r int := app.permission_rank(p_temple, p_code);
begin
  if r >= 3 then return true; end if;
  if r = 0 then return false; end if;
  if p_owner is not null and p_owner = app.current_person_id() then return true; end if;
  if r = 2 and p_dept is not null then
    return exists (select 1 from public.memberships m
                   join public.membership_departments md on md.temple_id = m.temple_id and md.membership_id = m.id
                   where m.temple_id = p_temple and m.person_id = app.current_person_id() and md.department_id = p_dept);
  end if;
  return false;
end $$;

-- append-only guard (also blocks owners/superusers; TRUNCATE guarded separately)
create function app.deny_mutation() returns trigger language plpgsql as $$
begin raise exception '% is append-only (% denied)', tg_table_name, tg_op using errcode = 'insufficient_privilege'; end $$;

-- audit helper used by transition triggers
create function app.write_audit(p_temple uuid, p_action text, p_entity text, p_entity_id uuid, p_from text, p_to text, p_reason text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.audit_logs(temple_id, actor, action, entity, entity_id, from_state, to_state, reason)
  values (p_temple, coalesce(app.current_person_id()::text, 'system:db'), p_action, p_entity, p_entity_id, p_from, p_to, p_reason);
end $$;

create trigger audit_logs_append_only before update or delete on public.audit_logs for each row execute function app.deny_mutation();
create trigger audit_logs_no_truncate before truncate on public.audit_logs for each statement execute function app.deny_mutation();

-- ---------- RLS ----------
do $$ declare t text; begin
  foreach t in array array['persons','temples','roles','permissions','role_permissions','memberships','monastic_attestations',
    'departments','membership_roles','membership_departments','audit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop; end $$;

create policy persons_sel on public.persons for select to authenticated
  using (id = app.current_person_id()
         or exists (select 1 from public.memberships m where m.person_id = persons.id and app.has_permission(m.temple_id, 'member.view', 'D')));
create policy persons_upd on public.persons for update to authenticated
  using (id = app.current_person_id()) with check (id = app.current_person_id());
create policy temples_sel on public.temples for select to authenticated using (app.is_member(id));
create policy roles_sel on public.roles for select to authenticated using (true);
create policy permissions_sel on public.permissions for select to authenticated using (true);
create policy role_permissions_sel on public.role_permissions for select to authenticated using (true);

create policy memberships_sel on public.memberships for select to authenticated
  using (person_id = app.current_person_id() or app.has_permission(temple_id, 'member.view', 'D'));
create policy memberships_ins on public.memberships for insert to authenticated with check (app.has_permission(temple_id, 'member.manage', 'T'));
create policy memberships_upd on public.memberships for update to authenticated
  using (app.has_permission(temple_id, 'member.manage', 'T')) with check (app.has_permission(temple_id, 'member.manage', 'T'));
create policy memberships_del on public.memberships for delete to authenticated using (app.has_permission(temple_id, 'member.manage', 'T'));

create policy attest_sel on public.monastic_attestations for select to authenticated using (app.has_permission(temple_id, 'member.manage', 'T'));
create policy attest_ins on public.monastic_attestations for insert to authenticated with check (app.has_permission(temple_id, 'member.manage', 'T'));

create policy departments_sel on public.departments for select to authenticated using (app.is_member(temple_id));
create policy departments_ins on public.departments for insert to authenticated with check (app.has_permission(temple_id, 'temple.settings', 'T'));
create policy departments_upd on public.departments for update to authenticated
  using (app.has_permission(temple_id, 'temple.settings', 'T')) with check (app.has_permission(temple_id, 'temple.settings', 'T'));
create policy departments_del on public.departments for delete to authenticated using (app.has_permission(temple_id, 'temple.settings', 'T'));

create policy mroles_sel on public.membership_roles for select to authenticated using (app.has_permission(temple_id, 'member.view', 'D')
  or exists (select 1 from public.memberships m where m.temple_id = membership_roles.temple_id and m.id = membership_id and m.person_id = app.current_person_id()));
create policy mroles_ins on public.membership_roles for insert to authenticated with check (app.has_permission(temple_id, 'member.manage', 'T'));
create policy mroles_del on public.membership_roles for delete to authenticated using (app.has_permission(temple_id, 'member.manage', 'T'));
create policy mdept_sel on public.membership_departments for select to authenticated using (app.has_permission(temple_id, 'member.view', 'D')
  or exists (select 1 from public.memberships m where m.temple_id = membership_departments.temple_id and m.id = membership_id and m.person_id = app.current_person_id()));
create policy mdept_ins on public.membership_departments for insert to authenticated with check (app.has_permission(temple_id, 'member.manage', 'T'));
create policy mdept_del on public.membership_departments for delete to authenticated using (app.has_permission(temple_id, 'member.manage', 'T'));

create policy audit_sel on public.audit_logs for select to authenticated using (app.has_permission(temple_id, 'audit.view', 'T'));
create policy audit_ins on public.audit_logs for insert to authenticated
  with check (app.is_member(temple_id) and actor = app.current_person_id()::text);

grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.memberships, public.monastic_attestations, public.departments,
  public.membership_roles, public.membership_departments to authenticated;
grant update on public.persons to authenticated;
grant insert on public.audit_logs to authenticated;
revoke all on public.roles, public.permissions, public.role_permissions from authenticated;
grant select on public.roles, public.permissions, public.role_permissions to authenticated;
