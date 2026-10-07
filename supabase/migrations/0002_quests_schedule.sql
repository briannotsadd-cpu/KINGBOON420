-- 0002 quests (meta only), schedule, availability, check-ins
create table public.quests (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  quest_type text not null check (quest_type in ('monastic_daily','novice_learning','cleaning','kitchen','garden','maintenance',
    'volunteer','event_root','event_task','ceremony_task','vehicle_task','office','security','general')),
  title text not null,
  description text,
  department_id uuid,
  created_by uuid not null references public.persons(id),
  status text not null default 'DRAFT' check (status in ('DRAFT','OPEN','CANCELLED','COMPLETED')),
  claimable boolean not null default false,
  verification_policy text not null default 'staff_verification'
    check (verification_policy in ('none','organizer_approval','staff_verification','qr_checkin','photo_evidence','location','attendance')),
  points int not null default 0 check (points >= 0),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  foreign key (temple_id, department_id) references public.departments(temple_id, id)
);
create table public.quest_assignments (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  quest_id uuid not null,
  assignee_person_id uuid not null references public.persons(id),
  status text not null default 'ASSIGNED' check (status in ('ASSIGNED','IN_PROGRESS','BLOCKED','SUBMITTED','COMPLETED','CANCELLED')),
  verifier_person_id uuid references public.persons(id),
  reason text,
  updated_at timestamptz not null default now(),
  primary key (temple_id, id),
  foreign key (temple_id, quest_id) references public.quests(temple_id, id),
  foreign key (temple_id, assignee_person_id) references public.memberships(temple_id, person_id),
  check (verifier_person_id is null or verifier_person_id <> assignee_person_id)   -- verifier != assignee
);
create unique index quest_assignments_one_active on public.quest_assignments (temple_id, quest_id, assignee_person_id)
  where status not in ('COMPLETED','CANCELLED');
create table public.quest_evidence (       -- metadata only; file bytes live in object storage
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  assignment_id uuid not null,
  storage_path text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  exif_stripped boolean not null default false,
  created_by uuid not null references public.persons(id),
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  foreign key (temple_id, assignment_id) references public.quest_assignments(temple_id, id)
);

create function app.is_quest_assignee(p_temple uuid, p_quest uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select app.is_member(p_temple) and exists (select 1 from public.quest_assignments a
    where a.temple_id = p_temple and a.quest_id = p_quest and a.assignee_person_id = app.current_person_id())
$$;
create function app.quest_assignment_guard() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare ok boolean; pol text;
begin
  if tg_op = 'INSERT' then
    perform app.write_audit(new.temple_id, 'quest_assignment.create', 'quest_assignment', new.id, null, new.status);
    return new;
  end if;
  if new.status is distinct from old.status then
    ok := (old.status, new.status) in (('ASSIGNED','IN_PROGRESS'),('ASSIGNED','BLOCKED'),('IN_PROGRESS','BLOCKED'),
        ('BLOCKED','ASSIGNED'),('BLOCKED','IN_PROGRESS'),('IN_PROGRESS','SUBMITTED'),('SUBMITTED','COMPLETED'),
        ('SUBMITTED','IN_PROGRESS'),('ASSIGNED','CANCELLED'),('IN_PROGRESS','CANCELLED'),('BLOCKED','CANCELLED'),('SUBMITTED','CANCELLED'));
    if not ok then raise exception 'illegal quest assignment transition % -> %', old.status, new.status using errcode = 'check_violation'; end if;
    if new.status = 'COMPLETED' then
      select verification_policy into pol from public.quests where temple_id = new.temple_id and id = new.quest_id;
      if pol <> 'none' and (new.verifier_person_id is null or new.verifier_person_id = new.assignee_person_id) then
        raise exception 'completion needs a verifier different from the assignee' using errcode = 'check_violation';
      end if;
    end if;
    new.updated_at := now();
    perform app.write_audit(new.temple_id, 'quest_assignment.transition', 'quest_assignment', new.id, old.status, new.status, new.reason);
  end if;
  return new;
end $$;
create trigger quest_assignment_guard before insert or update on public.quest_assignments for each row execute function app.quest_assignment_guard();

create table public.schedule_entries (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  kind text not null check (kind in ('ceremony','class','duty','invitation','meeting','other')),
  title text not null,
  owner_person_id uuid references public.persons(id),
  department_id uuid,
  visibility text not null default 'temple' check (visibility in ('public','temple','private')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid not null references public.persons(id),
  primary key (temple_id, id),
  foreign key (temple_id, department_id) references public.departments(temple_id, id),
  check (ends_at > starts_at)
);
create table public.availability_manual (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  person_id uuid not null references public.persons(id),
  state text not null check (state in ('UNAVAILABLE','PERSONAL','REST','AVAILABLE')),
  valid_until timestamptz not null,                      -- decision S-3: never open-ended
  set_by_person_id uuid not null references public.persons(id),
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  foreign key (temple_id, person_id) references public.memberships(temple_id, person_id),
  check (valid_until > created_at)
);
create table public.checkins (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  person_id uuid not null references public.persons(id),
  source text not null check (source in ('qr','nfc','manual')),
  checked_in_at timestamptz not null default now(),
  primary key (temple_id, id),
  foreign key (temple_id, person_id) references public.memberships(temple_id, person_id)
);

do $$ declare t text; begin
  foreach t in array array['quests','quest_assignments','quest_evidence','schedule_entries','availability_manual','checkins'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop; end $$;

-- quests
create policy quests_sel on public.quests for select to authenticated using (
  app.in_scope(temple_id, 'quest.view', created_by, department_id)
  or app.is_quest_assignee(temple_id, id));
create policy quests_ins on public.quests for insert to authenticated with check (
  created_by = app.current_person_id() and app.in_scope(temple_id, 'quest.create', created_by, department_id));
create policy quests_upd on public.quests for update to authenticated
  using (app.in_scope(temple_id, 'quest.manage', null, department_id))
  with check (app.in_scope(temple_id, 'quest.manage', null, department_id));
-- assignments
create policy qa_sel on public.quest_assignments for select to authenticated using (
  (assignee_person_id = app.current_person_id() and app.is_member(temple_id))
  or exists (select 1 from public.quests q where q.temple_id = quest_assignments.temple_id and q.id = quest_id
             and (app.in_scope(q.temple_id, 'quest.assign', null, q.department_id) or app.in_scope(q.temple_id, 'quest.verify', null, q.department_id))));
create policy qa_ins on public.quest_assignments for insert to authenticated with check (
  exists (select 1 from public.quests q where q.temple_id = quest_assignments.temple_id and q.id = quest_id
          and (app.in_scope(q.temple_id, 'quest.assign', null, q.department_id)
               or (q.claimable and assignee_person_id = app.current_person_id() and app.has_permission(q.temple_id, 'quest.complete')))));
create policy qa_upd on public.quest_assignments for update to authenticated
  using ((assignee_person_id = app.current_person_id() and app.is_member(temple_id))
    or exists (select 1 from public.quests q where q.temple_id = quest_assignments.temple_id and q.id = quest_id
               and (app.in_scope(q.temple_id, 'quest.verify', null, q.department_id) or app.in_scope(q.temple_id, 'quest.manage', null, q.department_id))))
  with check (true);
-- evidence: owner or verifier
create policy qe_sel on public.quest_evidence for select to authenticated using (
  exists (select 1 from public.quest_assignments a join public.quests q on q.temple_id = a.temple_id and q.id = a.quest_id
          where a.temple_id = quest_evidence.temple_id and a.id = assignment_id
          and ((a.assignee_person_id = app.current_person_id() and app.is_member(a.temple_id))
               or app.in_scope(q.temple_id, 'quest.verify', null, q.department_id))));
create policy qe_ins on public.quest_evidence for insert to authenticated with check (
  created_by = app.current_person_id() and exists (select 1 from public.quest_assignments a
    where a.temple_id = quest_evidence.temple_id and a.id = assignment_id and a.assignee_person_id = app.current_person_id()));
-- schedule
create policy sched_sel on public.schedule_entries for select to authenticated using (
  app.is_member(temple_id) and (
    app.has_permission(temple_id, 'schedule.view', 'T')
    or (visibility = 'public' and app.has_permission(temple_id, 'schedule.view'))
    or (owner_person_id = app.current_person_id() and app.has_permission(temple_id, 'schedule.view'))));
create policy sched_ins on public.schedule_entries for insert to authenticated with check (
  created_by = app.current_person_id() and app.in_scope(temple_id, 'schedule.manage', null, department_id));
create policy sched_upd on public.schedule_entries for update to authenticated
  using (app.in_scope(temple_id, 'schedule.manage', null, department_id))
  with check (app.in_scope(temple_id, 'schedule.manage', null, department_id));
create policy sched_del on public.schedule_entries for delete to authenticated using (app.in_scope(temple_id, 'schedule.manage', null, department_id));
-- availability (coarse C view is a later aggregate function; raw rows: self or T)
create policy avail_sel on public.availability_manual for select to authenticated using (
  (person_id = app.current_person_id() and app.is_member(temple_id)) or app.has_permission(temple_id, 'availability.view', 'T'));
create policy avail_ins on public.availability_manual for insert to authenticated with check (
  set_by_person_id = app.current_person_id() and (
    (person_id = set_by_person_id and app.has_permission(temple_id, 'availability.set_self'))
    or app.has_permission(temple_id, 'availability.set_others', 'T')));
-- check-ins
create policy checkin_sel on public.checkins for select to authenticated using (
  (person_id = app.current_person_id() and app.is_member(temple_id))
  or app.has_permission(temple_id, 'presence.view', 'T') or app.has_permission(temple_id, 'availability.view', 'T'));
create policy checkin_ins on public.checkins for insert to authenticated with check (
  person_id = app.current_person_id()
  and (app.has_permission(temple_id, 'availability.set_self') or app.has_permission(temple_id, 'presence.set_self')));

grant select, insert, update on public.quests, public.quest_assignments to authenticated;
grant select, insert on public.quest_evidence, public.availability_manual, public.checkins to authenticated;
grant select, insert, update, delete on public.schedule_entries to authenticated;
