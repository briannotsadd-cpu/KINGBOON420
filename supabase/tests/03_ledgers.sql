do $$
declare A constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  lay uuid := test.pid('community_member'); monk uuid := test.pid('bhikkhu'); abbot uuid := test.pid('abbot'); ok boolean; n bigint;
begin
  -- community ledger: lay ok, positive credit
  insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key) values (A, lay, 10, 'quest', 'k1');
  -- no monastic in community ledger
  ok := false; begin insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key) values (A, monk, 5, 'x', 'k2');
  exception when check_violation then ok := true; end; perform test.assert(ok, 'monastic accepted into community ledger');
  -- no lay in monastic ledger
  ok := false; begin perform app.record_monastic_activity(A, lay, 5, 'x', 'm1'); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'lay accepted into monastic ledger');
  perform app.record_monastic_activity(A, monk, 5, 'practice', 'm2');
  -- no negative balance
  ok := false; begin insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key) values (A, lay, -11, 'redeem', 'k3');
  exception when check_violation then ok := true; end; perform test.assert(ok, 'negative balance allowed (community)');
  insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key) values (A, lay, -10, 'redeem', 'k4');   -- exactly to zero is fine
  ok := false; begin perform app.record_monastic_activity(A, monk, -6, 'x', 'm3'); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'negative balance allowed (monastic)');
  -- idempotency
  ok := false; begin insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key) values (A, lay, 1, 'dup', 'k1');
  exception when unique_violation then ok := true; end; perform test.assert(ok, 'duplicate idempotency key accepted');
  -- no UPDATE/DELETE/TRUNCATE, even for the owner/superuser
  ok := false; begin update public.boon_point_transactions set amount = 99; exception when insufficient_privilege then ok := true; end; perform test.assert(ok, 'community UPDATE allowed');
  ok := false; begin delete from public.boon_point_transactions; exception when insufficient_privilege then ok := true; end; perform test.assert(ok, 'community DELETE allowed');
  ok := false; begin update public.monastic_activity_ledger set amount = 99; exception when insufficient_privilege then ok := true; end; perform test.assert(ok, 'monastic UPDATE allowed');
  ok := false; begin delete from public.monastic_activity_ledger; exception when insufficient_privilege then ok := true; end; perform test.assert(ok, 'monastic DELETE allowed');
  ok := false; begin truncate public.monastic_activity_ledger; exception when insufficient_privilege then ok := true; end; perform test.assert(ok, 'monastic TRUNCATE allowed');
  ok := false; begin update public.audit_logs set action = 'x'; exception when insufficient_privilege then ok := true; end; perform test.assert(ok, 'audit UPDATE allowed');
  ok := false; begin delete from public.audit_logs; exception when insufficient_privilege then ok := true; end; perform test.assert(ok, 'audit DELETE allowed');
  -- authenticated: only authorised roles may credit; monastic ledger has no client write path
  perform test.as_person(abbot);
  ok := false; begin insert into public.monastic_activity_ledger(temple_id, person_id, amount, reason, idempotency_key) values (A, monk, 1, 'x', 'm9');
  exception when insufficient_privilege then ok := true; end; perform test.assert(ok, 'client wrote monastic ledger');
  ok := false; begin perform app.record_monastic_activity(A, monk, 1, 'x', 'm10'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'client executed system ledger writer');
  ok := false; begin insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by) values (A, lay, 3, 'award', 'k5', abbot::text);
  exception when insufficient_privilege then ok := true; end; perform test.assert(ok, 'direct client insert into community ledger refused (0011: functions only)');
  perform app.award_points(A, lay, 3, 'ช่วยงานทดสอบ', gen_random_uuid());
  ok := false; begin perform app.award_points(A, lay, 51, 'มากเกิน', gen_random_uuid()); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'manual award capped at 50');
  ok := false; begin perform app.award_points(A, lay, 3, ' ', gen_random_uuid()); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'manual award needs a reason');
  select count(*) into n from public.monastic_activity_ledger; perform test.assert(n = 0, 'abbot reads others'' monastic ledger (no cross-person read)');
  reset role;
  perform test.as_person(test.pid('housekeeper'));
  ok := false; begin perform app.award_points(A, lay, 3, 'x', gen_random_uuid()); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'housekeeper awarded points');
  reset role;
  raise notice 'PASS 03_ledgers';
end $$;
