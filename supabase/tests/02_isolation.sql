-- Tenant isolation matrix: every tenant table x every role (28, seeded from role_permissions.yaml).
-- Caller holds an ACTIVE membership only in demo-a. Against demo-b: SELECT -> 0 rows, INSERT -> 42501, UPDATE/DELETE -> 0 rows.
do $$
declare
  A constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; B constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
  DB constant uuid := 'bbbbbbbb-0000-0000-0000-0000000000d1';
  r record; t record; me uuid; bp uuid; n bigint; cells int := 0; ins text; ok boolean;
  tables text[];
begin
  select id into bp from public.persons where display_name = 'b_owner';
  select array_agg(c.relname order by c.relname) into tables from pg_class c join pg_attribute a on a.attrelid = c.oid and a.attname = 'temple_id'
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r';
  -- control: seeded B rows exist for the superuser (so zero-row results are not vacuous)
  foreach ins in array tables loop
    execute format('select count(*) from public.%I where temple_id = %L', ins, B) into n;
    perform test.assert(n > 0 or ins in ('monastic_activity_ledger'), 'control: no seeded B rows in ' || ins);
  end loop;
  for r in select code from public.roles order by code loop
    me := test.pid(r.code);
    perform test.as_person(me);
    foreach ins in array tables loop
      execute format('select count(*) from public.%I where temple_id = %L', ins, B) into n;
      perform test.assert(n = 0, format('role %s sees %s rows of temple B in %s', r.code, n, ins));
      cells := cells + 1;
    end loop;
    select count(*) into n from public.temples where id = B;  perform test.assert(n = 0, r.code || ' sees temple B');
    -- writes into B must be denied with 42501
    foreach ins in array tables loop
      ok := false;
      begin
        execute case ins
          when 'memberships' then format('insert into memberships(temple_id, person_id, status) values (%L, %L, ''active'')', B, me)
          when 'monastic_attestations' then format('insert into monastic_attestations(temple_id, membership_id, kind, attester_person_id) select %L, id, ''bhikkhu'', %L from memberships where person_id = %L limit 1', B, me, me)
          when 'departments' then format('insert into departments(temple_id, code, name_th) values (%L, ''x'', ''x'')', B)
          when 'membership_roles' then format('insert into membership_roles select %L, id, ''abbot'' from memberships where person_id = %L limit 1', B, me)
          when 'membership_departments' then format('insert into membership_departments values (%L, gen_random_uuid(), %L)', B, DB)
          when 'audit_logs' then format('insert into audit_logs(temple_id, actor, action, entity) values (%L, %L, ''x'', ''x'')', B, me::text)
          when 'quests' then format('insert into quests(temple_id, quest_type, title, created_by) values (%L, ''general'', ''x'', %L)', B, me)
          when 'quest_assignments' then format('insert into quest_assignments(temple_id, quest_id, assignee_person_id) values (%L, gen_random_uuid(), %L)', B, me)
          when 'quest_evidence' then format('insert into quest_evidence(temple_id, assignment_id, storage_path, sha256, created_by) values (%L, gen_random_uuid(), ''x'', %L, %L)', B, repeat('a', 64), me)
          when 'schedule_entries' then format('insert into schedule_entries(temple_id, kind, title, starts_at, ends_at, created_by) values (%L, ''other'', ''x'', now(), now() + interval ''1 hour'', %L)', B, me)
          when 'availability_manual' then format('insert into availability_manual(temple_id, person_id, state, valid_until, set_by_person_id) values (%L, %L, ''REST'', now() + interval ''1 day'', %L)', B, me, me)
          when 'checkins' then format('insert into checkins(temple_id, person_id, source) values (%L, %L, ''manual'')', B, me)
          when 'boon_point_transactions' then format('insert into boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by) values (%L, %L, 5, ''x'', ''k'', %L)', B, me, me::text)
          when 'monastic_activity_ledger' then format('insert into monastic_activity_ledger(temple_id, person_id, amount, reason, idempotency_key) values (%L, %L, 5, ''x'', ''k'')', B, me)
          when 'parking_lots' then format('insert into parking_lots(temple_id, code, name_th) values (%L, ''PX'', ''x'')', B)
          when 'parking_status_reports' then format('insert into parking_status_reports(temple_id, lot_id, status, reported_by) values (%L, ''bbbbbbbb-0000-0000-0000-0000000000e1'', ''FULL'', %L)', B, me)
          when 'data_sources' then format('insert into data_sources(temple_id, source_type, source_name) values (%L, ''temple_admin_entry'', ''x'')', B)
          when 'temple_field_values' then format('insert into temple_field_values(temple_id, field_key, value, source_id, status) select %L, ''temple.name_th'', ''"x"'', id, ''DISCOVERED'' from data_sources limit 1', B)
          when 'temple_field_value_history' then format('insert into temple_field_value_history(temple_id, value_id, field_key, action, actor) values (%L, gen_random_uuid(), ''x'', ''x'', ''x'')', B)
          when 'temple_contact_threads' then format('insert into temple_contact_threads(temple_id, ref_code, topic, message) values (%L, ''X1'', ''other'', ''hello there'')', B)
          when 'rite_types' then format('insert into rite_types(temple_id, name_th) values (%L, ''xx'')', B)
          when 'invitations' then format('insert into invitations(temple_id, host_name, rite_type_id, venue_text, starts_at, duration_min, monks_required, created_by) values (%L, ''xx'', gen_random_uuid(), ''xx'', now(), 60, 1, %L)', B, me)
          when 'invitation_team' then format('insert into invitation_team(temple_id, invitation_id, person_id) values (%L, gen_random_uuid(), %L)', B, me)
          when 'events' then format('insert into events(temple_id, kind, title, starts_at, ends_at, created_by) values (%L, ''other'', ''xx'', now(), now() + interval ''1 hour'', %L)', B, me)
          when 'event_staffing_targets' then format('insert into event_staffing_targets(temple_id, event_id, category, label, required, min_required) values (%L, gen_random_uuid(), ''volunteer'', ''xx'', 1, 1)', B)
          when 'event_participants' then format('insert into event_participants(temple_id, event_id, target_id, person_id) values (%L, gen_random_uuid(), gen_random_uuid(), %L)', B, me)
          else null end;
      exception when insufficient_privilege then ok := true;
                when others then raise exception 'role % table %: write into B failed with % (%), expected 42501', r.code, ins, sqlstate, sqlerrm;
      end;
      perform test.assert(ok, format('role %s: INSERT into %s for temple B was ALLOWED', r.code, ins));
      -- update/delete: 0 rows (or no privilege)
      begin
        execute format('update %I set temple_id = temple_id where temple_id = %L', ins, B); get diagnostics n = row_count;
        perform test.assert(n = 0, format('role %s updated %s rows of %s in B', r.code, n, ins));
      exception when insufficient_privilege then null; end;
      begin
        execute format('delete from %I where temple_id = %L', ins, B); get diagnostics n = row_count;
        perform test.assert(n = 0, format('role %s deleted %s rows of %s in B', r.code, n, ins));
      exception when insufficient_privilege then null; end;
      cells := cells + 1;
    end loop;
    reset role;
  end loop;
  raise notice 'PASS 02_isolation: % tables x 28 roles, % read/write cells checked', array_length(tables, 1), cells;
end $$;

-- positive controls: the policies are not simply "deny all"
do $$
declare n bigint;
begin
  perform test.as_person(test.pid('abbot'));
  select count(*) into n from public.quests;             perform test.assert(n = 1, 'abbot sees A quest only (got ' || n || ')');
  select count(*) into n from public.schedule_entries;   perform test.assert(n = 1, 'abbot sees A rite only');
  select count(*) into n from public.audit_logs;         perform test.assert(n >= 1, 'abbot has audit.view');
  select count(*) into n from public.memberships;        perform test.assert(n >= 28, 'abbot sees A members');
  reset role;
  perform test.as_person(test.pid('community_member'));
  select count(*) into n from public.audit_logs;         perform test.assert(n = 0, 'community_member has no audit.view');
  select count(*) into n from public.memberships;        perform test.assert(n = 1, 'community_member sees only own membership');
  reset role;
  perform test.as_person((select id from public.persons where display_name = 'b_owner'));
  select count(*) into n from public.quests;             perform test.assert(n = 1, 'B owner sees only B quest');
  select count(*) into n from public.temples;            perform test.assert(n = 1, 'B owner sees only temple B');
  reset role;
  raise notice 'PASS 02_isolation controls';
end $$;
