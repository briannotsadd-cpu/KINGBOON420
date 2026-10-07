do $$
declare A constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  abbot uuid := test.pid('abbot'); hk uuid := test.pid('housekeeper'); sec uuid := test.pid('monk_secretary');
  q uuid; qa uuid; ok boolean; n bigint;
begin
  insert into public.quests(temple_id, quest_type, title, created_by, status) values (A, 'cleaning', 'sweep', abbot, 'OPEN') returning id into q;
  insert into public.quest_assignments(temple_id, quest_id, assignee_person_id) values (A, q, hk) returning id into qa;
  -- illegal jumps
  ok := false; begin update public.quest_assignments set status = 'COMPLETED' where id = qa; exception when check_violation then ok := true; end;
  perform test.assert(ok, 'ASSIGNED -> COMPLETED allowed');
  update public.quest_assignments set status = 'IN_PROGRESS' where id = qa;
  update public.quest_assignments set status = 'SUBMITTED' where id = qa;
  -- verifier = assignee rejected (table CHECK)
  ok := false; begin update public.quest_assignments set status = 'COMPLETED', verifier_person_id = hk where id = qa; exception when check_violation then ok := true; end;
  perform test.assert(ok, 'self-verification allowed');
  -- no verifier at all rejected (policy staff_verification)
  ok := false; begin update public.quest_assignments set status = 'COMPLETED' where id = qa; exception when check_violation then ok := true; end;
  perform test.assert(ok, 'completion without verifier allowed');
  -- via RLS as the assignee: cannot verify self, cannot forge a different verifier? (verifier column is data; guard = != assignee)
  perform test.as_person(hk);
  ok := false; begin update public.quest_assignments set status = 'COMPLETED', verifier_person_id = hk where id = qa; exception when check_violation then ok := true; end;
  perform test.assert(ok, 'assignee self-verified via client');
  reset role;
  update public.quest_assignments set status = 'COMPLETED', verifier_person_id = sec where id = qa;
  -- terminal state is final
  ok := false; begin update public.quest_assignments set status = 'IN_PROGRESS' where id = qa; exception when check_violation then ok := true; end;
  perform test.assert(ok, 'COMPLETED -> IN_PROGRESS allowed');
  -- every transition audited
  select count(*) into n from public.audit_logs where entity_id = qa; perform test.assert(n = 4, 'expected 4 audit rows, got ' || n);
  -- assignee in another temple rejected by composite FK
  ok := false; begin insert into public.quest_assignments(temple_id, quest_id, assignee_person_id)
      select A, q, id from public.persons where display_name = 'b_owner'; exception when foreign_key_violation then ok := true; end;
  perform test.assert(ok, 'cross-temple assignee accepted');
  -- cross-temple quest reference rejected by composite FK
  ok := false; begin insert into public.quest_assignments(temple_id, quest_id, assignee_person_id)
      select A, id, hk from public.quests where title = 'B quest'; exception when foreign_key_violation then ok := true; end;
  perform test.assert(ok, 'cross-temple quest reference accepted');
  raise notice 'PASS 04_quest_guards';
end $$;
