-- 10 Map registry (confirm-before-public), community points (earn/cap/kind/holds/award/redeem/refund), rule-based helpers,
-- Command Center scoping.
do $$
declare A constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  ABBOT uuid := test.pid('abbot'); DEP uuid := test.pid('deputy_abbot'); BHI uuid := test.pid('bhikkhu'); CM uuid := test.pid('community_member');
  VOL uuid := test.pid('volunteer'); FM uuid := test.pid('facility_manager'); OFF uuid := test.pid('office_staff'); ADMIN uuid;
  b uuid; b2 uuid; bal0 bigint; q uuid; qa uuid; rw uuid; rw2 uuid; rd uuid; n bigint; ok boolean; j jsonb; i int; st text;
begin
  insert into public.persons(auth_user_id, display_name) values (gen_random_uuid(), 'map_admin') returning id into ADMIN;
  insert into public.platform_admins values (ADMIN);
  -- ===== map =====
  perform test.as_person(CM);
  ok := false; begin perform app.save_building(A, null, 'DEMO.SALA.02', 'ศาลาใหม่', 'SALA', 'ACTIVE', 'PUBLIC', null, null); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'community member cannot edit the registry');
  reset role;
  perform test.as_person(FM);
  ok := false; begin perform app.save_building(A, null, 'DEMO.SALA.02', 'ศาลาใหม่', 'SALA', 'ACTIVE', 'PUBLIC', '[[0,0],[2000,0],[0,10]]', null); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'polygon outside 1600x1000 refused');
  ok := false; begin perform app.save_building(A, null, 'bad code', 'ศาลาใหม่', 'SALA', 'ACTIVE', 'PUBLIC', null, null); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'building code pattern enforced');
  b := app.save_building(A, null, 'DEMO.SALA.02', 'ศาลาทดสอบสอง', 'SALA', 'ACTIVE', 'PUBLIC', '[[100,100],[300,100],[300,250],[100,250]]', 'ผังสมมติ');
  b2 := app.save_building(A, null, 'DEMO.KUTI.01', 'กุฏิทดสอบ', 'KUTI', 'ACTIVE', 'STAFF_ONLY', null, null);
  ok := false; begin perform app.confirm_building(A, b); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'facility manager cannot confirm on behalf of the temple');
  reset role;
  ok := false; begin update public.buildings set code = 'DEMO.SALA.99' where id = b; exception when check_violation then ok := true; end;
  perform test.assert(ok, 'building code immutable');
  ok := false; begin delete from public.buildings where id = b; exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'buildings never deleted');
  perform test.as_person(CM);
  select count(*) into n from public.buildings where id = b; perform test.assert(n = 0, 'unconfirmed building hidden from community');
  reset role;
  perform test.as_person(ADMIN);
  ok := false; begin perform app.confirm_building(A, b); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'platform admin cannot confirm for the temple');
  reset role;
  perform test.as_person(ABBOT); perform app.confirm_building(A, b); perform app.confirm_building(A, b2); reset role;
  perform test.as_person(CM);
  select count(*) into n from public.buildings where id = b; perform test.assert(n = 1, 'confirmed PUBLIC building visible to members');
  select count(*) into n from public.buildings where id = b2; perform test.assert(n = 0, 'STAFF_ONLY building hidden from community');
  select count(*) into n from app.map_buildings(A) m where m.id = b and m.events_today is null and m.open_quests is null;
  perform test.assert(n = 1, 'map counts are NULL (unknown), never 0, for a viewer who cannot see all events/quests (0014)');
  reset role;
  perform test.as_person(ABBOT);
  select count(*) into n from app.map_buildings(A) m where m.id = b and m.events_today = 0 and m.open_quests = 0;
  perform test.assert(n = 1, 'map counts are real numbers for a viewer with event.view T + quest.view T (0014)');
  reset role;
  perform set_config('request.jwt.claims', '', false); execute 'set role anon';
  select count(*) into n from public.temple_public_map('demo-a') m where m.code = 'DEMO.SALA.02'; perform test.assert(n = 1, 'public map shows confirmed public building');
  select count(*) into n from public.temple_public_map('demo-a') m where m.code in ('DEMO.KUTI.01', 'DEMO.SALA.01'); perform test.assert(n = 0, 'public map hides staff-only/unconfirmed');
  select count(*) into n from public.temple_public_map('demo-b'); perform test.assert(n = 0, 'no public map for an unverified temple');
  reset role;
  perform test.as_person(FM);
  perform app.save_building(A, b, 'DEMO.SALA.02', 'ศาลาทดสอบสอง (แก้ชื่อ)', 'SALA', 'ACTIVE', 'PUBLIC', '[[100,100],[300,100],[300,250],[100,250]]', null);
  reset role;
  select count(*) into n from public.buildings where id = b and confirmed_at is null; perform test.assert(n = 1, 'editing a confirmed building clears the confirmation');
  perform set_config('request.jwt.claims', '', false); execute 'set role anon';
  select count(*) into n from public.temple_public_map('demo-a') m where m.code = 'DEMO.SALA.02'; perform test.assert(n = 0, 'PUBLIC but unconfirmed (after edit) is not on the public map');
  reset role;

  -- ===== points =====
  for i in 1..6 loop
    insert into public.quests(temple_id, quest_type, title, created_by, status, verification_policy, points)
    values (A, 'volunteer', 'อาสาทดสอบ ' || i, ABBOT, 'OPEN', 'staff_verification', 20) returning id into q;
    insert into public.quest_assignments(temple_id, quest_id, assignee_person_id) values (A, q, CM) returning id into qa;
    perform test.as_person(CM); update public.quest_assignments set status = 'IN_PROGRESS' where id = qa; update public.quest_assignments set status = 'SUBMITTED' where id = qa; reset role;
    perform test.as_person(case when i % 2 = 0 then ABBOT else DEP end);
    update public.quest_assignments set status = 'COMPLETED', verifier_person_id = case when i % 2 = 0 then ABBOT else DEP end where id = qa; reset role;
  end loop;
  select sum(amount) into n from public.boon_point_transactions where temple_id = A and person_id = CM and txn_type = 'EARN';
  perform test.assert(n = 100, 'community daily cap 100 (6 x 20 => 100), got ' || n);
  insert into public.quests(temple_id, quest_type, title, created_by, status, verification_policy, points)
  values (A, 'monastic_daily', 'ไม่ใช่งานของฆราวาส', ABBOT, 'OPEN', 'staff_verification', 5) returning id into q;
  insert into public.quest_assignments(temple_id, quest_id, assignee_person_id) values (A, q, VOL) returning id into qa;
  perform test.as_person(VOL); update public.quest_assignments set status = 'IN_PROGRESS' where id = qa; update public.quest_assignments set status = 'SUBMITTED' where id = qa; reset role;
  perform test.as_person(ABBOT); update public.quest_assignments set status = 'COMPLETED', verifier_person_id = ABBOT where id = qa; reset role;
  select count(*) into n from public.boon_point_transactions where person_id = VOL; perform test.assert(n = 0, 'monastic quest gives no lay points (LEDGER_KIND_MISMATCH)');
  -- verifier concentration: 10 completions all verified by the same person => the 10th is held for human review
  for i in 1..10 loop
    insert into public.quests(temple_id, quest_type, title, created_by, status, verification_policy, points)
    values (A, 'volunteer', 'งานเล็ก ' || i, ABBOT, 'OPEN', 'staff_verification', 1) returning id into q;
    insert into public.quest_assignments(temple_id, quest_id, assignee_person_id) values (A, q, VOL) returning id into qa;
    perform test.as_person(VOL); update public.quest_assignments set status = 'IN_PROGRESS' where id = qa; update public.quest_assignments set status = 'SUBMITTED' where id = qa; reset role;
    perform test.as_person(ABBOT); update public.quest_assignments set status = 'COMPLETED', verifier_person_id = ABBOT where id = qa; reset role;
  end loop;
  select count(*) into n from public.point_holds where person_id = VOL and status = 'HELD'; perform test.assert(n >= 1, 'concentrated verifier => points held');
  select coalesce(sum(amount), 0) into n from public.boon_point_transactions where person_id = VOL; perform test.assert(n < 10, 'held points not credited yet');
  perform test.as_person(VOL);
  ok := false; begin perform app.review_hold(A, (select id from public.point_holds where person_id = VOL and status = 'HELD' limit 1), true); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'cannot release own held points');
  reset role;
  perform test.as_person(DEP); perform app.review_hold(A, (select id from public.point_holds where person_id = VOL and status = 'HELD' limit 1), true); reset role;
  select count(*) into n from public.point_holds where person_id = VOL and status = 'ACCEPTED'; perform test.assert(n = 1, 'reviewer accepted the hold');
  perform test.as_person(FM);   -- lay awarder (points.award_community D)
  ok := false; begin perform app.award_points(A, FM, 5, 'ตัวเอง', gen_random_uuid()); exception when insufficient_privilege then ok := sqlerrm like 'SELF_AWARD%'; end;
  perform test.assert(ok, 'self award forbidden');
  reset role;
  -- an awarder cannot release a hold on their own points
  insert into public.quests(temple_id, quest_type, title, created_by, status, verification_policy, points) values (A, 'volunteer', 'งานของผู้ตรวจ', ABBOT, 'OPEN', 'staff_verification', 1) returning id into q;
  insert into public.quest_assignments(temple_id, quest_id, assignee_person_id) values (A, q, FM) returning id into qa;
  insert into public.point_holds(temple_id, person_id, assignment_id, amount, signal) values (A, FM, qa, 1, 'TEST');
  perform test.as_person(FM);
  ok := false; begin perform app.review_hold(A, (select id from public.point_holds where person_id = FM and status = 'HELD'), true); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'awarder cannot release own held points');
  reset role;
  -- rewards
  perform test.as_person(CM);
  ok := false; begin perform app.save_reward(A, null, 'ของที่ระลึก', null, 30, 1, 1, true); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'community member cannot manage rewards');
  reset role;
  perform test.as_person(OFF);
  rw := app.save_reward(A, null, 'เสื้อที่ระลึกงานอาสา (ทดสอบ)', 'ของที่ระลึกจากการร่วมกิจกรรม', 30, 1, 1, true);
  rw2 := app.save_reward(A, null, 'ของที่ระลึกราคาสูง (ทดสอบ)', null, 1000, 5, null, true);
  reset role;
  perform test.as_person(CM);
  select balance into bal0 from app.my_points(A) limit 1;
  rd := app.redeem_reward(A, rw, '00000000-0000-4000-8000-00000000aa14');
  perform test.assert(app.redeem_reward(A, rw, '00000000-0000-4000-8000-00000000aa14') = rd, 'replaying the same redeem request returns the first redemption (0014)');
  select count(*) into n from public.reward_redemptions where reward_id = rw; perform test.assert(n = 1, 'replay creates no second redemption (0014)');
  ok := false; begin perform app.redeem_reward(A, rw, gen_random_uuid()); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'stock / per-person limit enforced');
  ok := false; begin perform app.redeem_reward(A, rw2, gen_random_uuid()); exception when check_violation then ok := sqlerrm = 'INSUFFICIENT_POINTS'; end;
  perform test.assert(ok, 'insufficient points refused');
  select balance into n from app.my_points(A) limit 1; perform test.assert(n = bal0 - 30, 'balance after redeem = start - 30, got ' || n);
  select count(*) into n from app.my_points(A) p where p.txn_type = 'REDEEM' and p.reason like 'ของที่ระลึก%'; perform test.assert(n = 1, 'history explains each row');
  perform app.decide_redemption(A, rd, 'cancel');
  select balance into n from app.my_points(A) limit 1; perform test.assert(n = bal0, 'cancel refunds points');
  select stock into n from public.reward_catalog where id = rw; perform test.assert(n = 1, 'cancel returns stock');
  reset role;
  perform test.as_person(BHI);
  ok := false; begin perform app.redeem_reward(A, rw, gen_random_uuid()); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'monk cannot redeem community rewards');
  select count(*) into n from app.my_points(A); perform test.assert(n = 0, 'monk has no community points view');
  reset role;
  perform test.as_person(CM);
  ok := false; begin perform app.decide_redemption(A, (select app.redeem_reward(A, rw, gen_random_uuid())), 'fulfil'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'member cannot mark own redemption fulfilled');
  reset role;

  -- ===== helpers =====
  insert into public.schedule_entries(temple_id, kind, title, person_id, starts_at, ends_at, created_by, venue_kind)
  values (A, 'teaching', 'สอนทดสอบ', BHI, now() + interval '1 day', now() + interval '1 day 2 hours', ABBOT, 'IN_TEMPLE'),
         (A, 'ceremony', 'พิธีทดสอบซ้อน', BHI, now() + interval '1 day 1 hour', now() + interval '1 day 3 hours', ABBOT, 'IN_TEMPLE');
  perform test.as_person(ABBOT);
  select count(*) into n from app.schedule_conflicts(A, now(), now() + interval '3 days') c where c.person_id = BHI and c.code = 'DOUBLE_BOOKED';
  perform test.assert(n = 1, 'double booking detected');
  reset role;
  perform test.as_person(CM);
  select count(*) into n from app.schedule_conflicts(A, now(), now() + interval '3 days'); perform test.assert(n = 0, 'lay member sees no monk conflicts');
  ok := false; begin perform * from app.command_center(A); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'community member has no Command Center');
  reset role;
  perform test.as_person(BHI);
  select count(*) into n from app.schedule_conflicts(A, now(), now() + interval '3 days') c where c.person_id = BHI and c.code = 'DOUBLE_BOOKED'; perform test.assert(n = 1, 'monk sees own conflict');
  reset role;
  -- ===== command center =====
  perform test.as_person(ABBOT);
  j := app.command_center(A);
  perform test.assert(j ? 'monastic' and (j->'monastic'->>'total')::int >= 7, 'abbot sees monastic panel');
  perform test.assert(j->'facility'->'maintenance' = 'null'::jsonb, 'unknown facility data is null (Unknown), never 0');
  perform test.assert((j->'community'->>'points_issued_30d')::int >= 100, 'community aggregate present');
  select count(*) into n from app.daily_summary(A); perform test.assert(n >= 1, 'daily summary lines produced');
  reset role;
  perform test.as_person(FM);
  j := app.command_center(A);
  perform test.assert(not (j ? 'monastic') and not (j ? 'invitations') and j ? 'quests', 'department-scope viewer gets no monastic/invitation panel');
  reset role;
  raise notice 'PASS 10_map_points_command: registry confirm-before-public, points rules + holds + rewards, helpers, command center scope';
end $$;
