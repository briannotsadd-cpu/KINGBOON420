-- Fixtures: one person per role with an ACTIVE membership in demo-a; a full row set in demo-b. Runs as superuser.
create schema test;
grant usage on schema test to authenticated;
create function test.assert(c boolean, msg text) returns void language plpgsql as $$
begin if c is not true then raise exception 'ASSERT FAILED: %', msg; end if; end $$;
create function test.as_person(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', (select auth_user_id from public.persons where id = p))::text, false);
  set role authenticated;
end $$;
-- note: SET ROLE inside the function persists for the session
create function test.pid(r text) returns uuid language sql as $$ select id from public.persons where display_name = 'p_' || r $$;

do $$
declare A constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; B constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
        DA constant uuid := 'aaaaaaaa-0000-0000-0000-0000000000d1'; DB constant uuid := 'bbbbbbbb-0000-0000-0000-0000000000d1';
        r record; pid uuid; mid uuid; bp uuid; bm uuid; q uuid; qa uuid;
begin
  for r in select code, mode from public.roles order by code loop
    insert into public.persons(auth_user_id, display_name) values (md5('auth_' || r.code)::uuid, 'p_' || r.code) returning id into pid;
    insert into public.memberships(temple_id, person_id, status, monastic_kind)
      values (A, pid, 'active', case r.code when 'samanera' then 'samanera' when 'bhikkhu' then 'bhikkhu' when 'visiting_monastic' then 'bhikkhu'
                                           when 'abbot' then 'bhikkhu' when 'deputy_abbot' then 'bhikkhu' when 'abbot_assistant' then 'bhikkhu'
                                           when 'monk_secretary' then 'bhikkhu' else 'none' end) returning id into mid;
    insert into public.membership_roles values (A, mid, r.code);
    insert into public.membership_departments values (A, mid, DA);
  end loop;
  -- temple B owner + rows
  insert into public.persons(auth_user_id, display_name) values (md5('auth_b_owner')::uuid, 'b_owner') returning id into bp;
  insert into public.memberships(temple_id, person_id, status, monastic_kind) values (B, bp, 'active', 'none') returning id into bm;
  insert into public.membership_roles values (B, bm, 'abbot');
  insert into public.membership_departments values (B, bm, DB);
  insert into public.monastic_attestations(temple_id, membership_id, kind, attester_person_id) values (B, bm, 'bhikkhu', bp);
  insert into public.quests(temple_id, quest_type, title, department_id, created_by, status) values (B, 'general', 'B quest', DB, bp, 'OPEN') returning id into q;
  insert into public.quests(temple_id, quest_type, title, department_id, created_by, status)
    values (A, 'general', 'A quest', DA, test.pid('abbot'), 'OPEN');
  insert into public.quest_assignments(temple_id, quest_id, assignee_person_id) values (B, q, bp) returning id into qa;
  insert into public.quest_evidence(temple_id, assignment_id, storage_path, sha256, created_by) values (B, qa, 'b/x.jpg', repeat('a', 64), bp);
  insert into public.schedule_entries(temple_id, kind, title, owner_person_id, visibility, starts_at, ends_at, created_by)
    values (B, 'ceremony', 'B rite', bp, 'public', now(), now() + interval '1 hour', bp),
           (A, 'ceremony', 'A rite', test.pid('abbot'), 'public', now(), now() + interval '1 hour', test.pid('abbot'));
  insert into public.availability_manual(temple_id, person_id, state, valid_until, set_by_person_id) values (B, bp, 'REST', now() + interval '1 day', bp);
  insert into public.checkins(temple_id, person_id, source) values (B, bp, 'manual');
  insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key) values (B, bp, 10, 'seed', 'b-seed');
  insert into public.audit_logs(temple_id, actor, action, entity) values (B, 'system:seed', 'seed', 'temple'), (A, 'system:seed', 'seed', 'temple');
end $$;
