-- 06 Claim/registration: anyone signed in applies with relationship + evidence; approval REQUIRES official registry
-- evidence verified by a platform admin; nothing is public until the temple confirms its own data.
do $$
declare slug_t text; applicant uuid; admin uuid; stranger uuid; t uuid; t2 uuid; v uuid; n bigint; ok boolean; st text;
begin
  insert into public.persons(auth_user_id, display_name) values (gen_random_uuid(), 'reg_applicant') returning id into applicant;
  insert into public.persons(auth_user_id, display_name) values (gen_random_uuid(), 'reg_admin') returning id into admin;
  insert into public.persons(auth_user_id, display_name) values (gen_random_uuid(), 'reg_stranger') returning id into stranger;
  insert into public.platform_admins values (admin);

  perform set_config('request.jwt.claims', '', false); execute 'set role authenticated';
  ok := false; begin perform app.register_temple('วัดทดสอบ', 'นนทบุรี', null, null, null, 'abbot', null, 'x'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'register without sign-in refused');
  reset role;

  perform test.as_person(applicant);
  ok := false; begin perform app.register_temple('วัดทดสอบสมัคร', 'นนทบุรี', null, null, null, 'temple_staff', null, '  '); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'claim without evidence rejected');
  t := app.register_temple('วัดทดสอบสมัคร', 'นนทบุรี', '1 ถนนทดสอบ', '021234567', null, 'temple_staff', '12345', 'หนังสือมอบหมายจากเจ้าอาวาส');
  select count(*) into n from public.temple_field_values where temple_id = t and status = 'WAITING_TEMPLE_CONFIRMATION';
  perform test.assert(n = 5, 'applicant input stored as 5 unconfirmed candidate values, got ' || n);
  perform app.set_temple_listed(t, true);
  t2 := app.register_temple('วัดทดสอบสอง', 'นนทบุรี', null, null, null, 'abbot', null, 'x');
  perform app.register_temple('วัดทดสอบสาม', 'นนทบุรี', null, null, null, 'abbot', null, 'x');
  ok := false; begin perform app.register_temple('วัดทดสอบสี่', 'นนทบุรี', null, null, null, 'abbot', null, 'x'); exception when program_limit_exceeded then ok := true; end;
  perform test.assert(ok, '4th pending application refused');
  ok := false; begin perform app.review_temple(t, 'approved', null); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'applicant cannot approve own temple');
  reset role;

  perform test.as_person(stranger);
  ok := false; begin perform app.set_temple_listed(t, false); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'stranger cannot change listing');
  ok := false; begin perform app.record_field_value(t, 'temple.name_th', '"ปลอม"', 'temple_admin_entry', 'x', null, null, null, null); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'stranger cannot record temple data');
  reset role;

  -- admin: approval blocked until official registry evidence is recorded AND verified
  perform test.as_person(admin);
  ok := false; begin perform app.review_temple(t, 'approved', null); exception when object_not_in_prerequisite_state then ok := true; end;
  perform test.assert(ok, 'approval blocked without official registry evidence');
  v := app.record_field_value(t, 'temple.name_th', '"วัดทดสอบสมัคร"', 'onab_registry', 'ระบบทะเบียนวัด (ทดสอบ)', 'https://registry.example.invalid/12345', null, '2026-10-01', 'ข้อความจากหน้าทะเบียน');
  select status into st from public.temple_field_values where id = v; perform test.assert(st = 'SOURCE_FOUND', 'official value starts SOURCE_FOUND, got ' || st);
  ok := false; begin perform app.review_temple(t, 'approved', null); exception when object_not_in_prerequisite_state then ok := true; end;
  perform test.assert(ok, 'approval still blocked: source found but not verified');
  perform app.advance_field_value(v, 'SOURCE_VERIFIED', 'ตรวจหน้าทะเบียนแล้ว');
  perform app.review_temple(t, 'approved', null);
  perform app.review_temple(t2, 'rejected', 'ไม่พบในทะเบียนวัด');
  ok := false; begin perform app.advance_field_value(v, 'TEMPLE_CONFIRMED', null); exception when others then ok := true; end;
  perform test.assert(ok, 'platform admin cannot confirm on behalf of the temple');
  reset role;

  select slug into slug_t from public.temples where id = t;
  perform set_config('request.jwt.claims', '', false); execute 'set role anon';
  select count(*) into n from public.listed_temples('สมัคร'); perform test.assert(n = 0, 'approved but unconfirmed data => not public');
  reset role;

  -- temple confirms its required fields (name, province, address) => verified temple, public
  perform test.as_person(applicant);
  for v in select id from public.temple_field_values where temple_id = t and field_key in ('temple.name_th', 'temple.province', 'temple.address')
            and status = 'WAITING_TEMPLE_CONFIRMATION' loop
    perform app.advance_field_value(v, 'TEMPLE_CONFIRMED', 'ตรวจแล้วถูกต้อง');
  end loop;
  reset role;
  perform set_config('request.jwt.claims', '', false); execute 'set role anon';
  select count(*) into n from public.listed_temples('สมัคร'); perform test.assert(n = 1, 'verified temple is searchable');
  select count(*) into n from public.temple_public_fields(slug_t) where field_key = 'temple.office_phone';
  perform test.assert(n = 0, 'unconfirmed phone is NOT public');
  select count(*) into n from public.temple_public_fields(slug_t) where field_key = 'temple.name_th';
  perform test.assert(n >= 1, 'confirmed name is public');
  reset role;
  select count(*) into n from public.audit_logs where temple_id = t and action in ('temple.registered', 'temple.approved');
  perform test.assert(n = 2, 'registration and approval audited');
  raise notice 'PASS 06_registration: claim needs evidence; approval needs verified official registry evidence; public needs temple confirmation';
end $$;
