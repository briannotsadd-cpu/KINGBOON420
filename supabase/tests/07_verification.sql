-- 07 Verification state machine: conflicts, AI rule, double verification, expiry, history, public filter.
do $$
declare
  A constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  ta uuid := test.pid('temple_admin'); abbot uuid := test.pid('abbot'); cm uuid := test.pid('community_member');
  v1 uuid; v2 uuid; v3 uuid; vd uuid; n bigint; ok boolean; st text;
begin
  perform test.as_person(ta);
  -- conflict: two sources disagree => both CONFLICT, never auto-picked
  v1 := app.record_field_value(A, 'temple.office_phone', '"02 111 1111"', 'temple_website', 'เว็บไซต์วัด', 'https://temple.example.invalid', null, null, 'หน้า ติดต่อเรา');
  v2 := app.record_field_value(A, 'temple.office_phone', '"02 222 2222"', 'temple_facebook', 'เพจวัด', 'https://facebook.example.invalid/temple', null, null, 'about');
  select count(*) into n from public.temple_field_values where temple_id = A and field_key = 'temple.office_phone' and status = 'CONFLICT';
  perform test.assert(n = 2, 'disagreeing sources => both CONFLICT');
  ok := false; begin perform app.advance_field_value(v1, 'TEMPLE_CONFIRMED', null); exception when others then ok := true; end;
  perform test.assert(ok, 'cannot confirm while in CONFLICT');
  perform app.resolve_conflict(v2, 'เจ้าหน้าที่สำนักงานยืนยันเบอร์ใหม่');
  select status into st from public.temple_field_values where id = v1; perform test.assert(st = 'REJECTED', 'loser rejected');
  perform app.advance_field_value(v2, 'TEMPLE_CONFIRMED', 'ยืนยันโดยวัด');
  -- same value from a second source corroborates (no conflict)
  v3 := app.record_field_value(A, 'temple.office_phone', '"02 222 2222"', 'temple_document', 'แผ่นพับวัด', null, 'แผ่นพับปี 2569', null, null);
  select count(*) into n from public.temple_field_values where temple_id = A and field_key = 'temple.office_phone' and status = 'CONFLICT';
  perform test.assert(n = 0, 'same value from another source is not a conflict');

  -- AI-assisted value stays DISCOVERED and cannot be verified
  v1 := app.record_field_value(A, 'temple.history', '"ประวัติที่ AI สรุป"', 'other', 'สรุปโดย AI', 'https://x.example.invalid', null, null, null, true);
  select status into st from public.temple_field_values where id = v1; perform test.assert(st = 'DISCOVERED', 'AI-assisted => DISCOVERED');
  ok := false; begin perform app.advance_field_value(v1, 'WAITING_TEMPLE_CONFIRMATION', null); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'AI-assisted value cannot advance');
  -- tier 3 alone cannot become verified
  v1 := app.record_field_value(A, 'temple.geo', '{"lat":13.7,"lng":100.5}', 'google_maps', 'Google Maps', 'https://maps.example.invalid', null, null, null);
  select status into st from public.temple_field_values where id = v1; perform test.assert(st = 'DISCOVERED', 'tier 3 => DISCOVERED only');
  ok := false; begin perform app.advance_field_value(v1, 'WAITING_TEMPLE_CONFIRMATION', null); exception when others then ok := true; end;
  perform test.assert(ok, 'tier-3-only value cannot be sent for confirmation');

  -- donation account: double verification (temple admin, then the abbot — a different person)
  vd := app.record_field_value(A, 'temple.donation_account', '{"bank":"x","number":"y"}', 'temple_office', 'สำนักงานวัด', null, 'หนังสือยืนยันบัญชี', null, null);
  perform app.advance_field_value(vd, 'WAITING_TEMPLE_CONFIRMATION', null);
  perform app.advance_field_value(vd, 'TEMPLE_CONFIRMED', 'ตรวจขั้นที่ 1');
  select status into st from public.temple_field_values where id = vd; perform test.assert(st = 'WAITING_TEMPLE_CONFIRMATION', 'first approval does not confirm');
  ok := false; begin perform app.advance_field_value(vd, 'TEMPLE_CONFIRMED', 'ซ้ำ'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'same person cannot give the second approval');
  reset role;
  perform test.as_person(abbot);
  perform app.advance_field_value(vd, 'TEMPLE_CONFIRMED', 'เจ้าอาวาสยืนยัน');
  select status into st from public.temple_field_values where id = vd; perform test.assert(st = 'TEMPLE_CONFIRMED', 'abbot second approval confirms');
  reset role;

  -- community member cannot touch temple data
  perform test.as_person(cm);
  ok := false; begin perform app.record_field_value(A, 'temple.office_phone', '"x"', 'temple_admin_entry', 'x', null, null, null, null); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'community member cannot record temple data');
  select count(*) into n from public.temple_field_values; perform test.assert(n = 0, 'community member cannot read verification tables');
  reset role;

  -- expiry: confirmed phone past its expiry => VERIFICATION_EXPIRED, hidden from public, temple loses verified state
  update public.temple_field_values set verification_expires_at = now() - interval '1 day' where id = v2;
  select count(*) into n from public.temple_public_fields('demo-a') where field_key = 'temple.office_phone';
  perform test.assert(n = 0, 'expired value not public');
  perform test.assert(not app.is_verified_temple(A), 'expired data => temple not verified (must re-check)');
  perform test.as_person(ta); perform app.reconfirm_field_value(v2); reset role;
  perform test.assert(app.is_verified_temple(A), 'reconfirmed => verified again');
  select count(*) into n from public.temple_public_fields('demo-a') where field_key = 'temple.office_phone';
  perform test.assert(n = 1, 'reconfirmed value public again');

  -- history: append-only, every change recorded with actor and reason
  select count(*) into n from public.temple_field_value_history where value_id = v2;
  perform test.assert(n >= 4, 'history has created/conflict/resolve/confirm/reconfirm, got ' || n);
  select count(*) into n from public.temple_field_value_history where value_id = vd and new_status = 'TEMPLE_CONFIRMED' and actor = abbot::text;
  perform test.assert(n = 1, 'confirmation records who confirmed');
  ok := false; begin update public.temple_field_value_history set reason = 'แก้' where value_id = v2; exception when others then ok := true; end;
  perform test.assert(ok, 'history cannot be edited');
  ok := false; begin delete from public.temple_field_values where id = v2; exception when others then ok := true; end;
  perform test.assert(ok, 'values cannot be deleted');

  -- anon cannot read raw tables
  perform set_config('request.jwt.claims', '', false); execute 'set role anon';
  ok := false; begin perform 1 from public.temple_field_values; exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'visitor cannot read raw values');
  reset role;
  raise notice 'PASS 07_verification: conflict, AI rule, tier-3 rule, double verification, expiry, history, public filter';
end $$;
