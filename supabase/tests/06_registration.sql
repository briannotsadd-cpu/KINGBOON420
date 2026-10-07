-- 06 Temple registration: anyone signed in applies; nothing is public until a platform admin approves.
do $$
declare
  slug_t text; applicant uuid; admin uuid; stranger uuid; t uuid; t2 uuid; n bigint; ok boolean; st text; i int;
begin
  insert into public.persons(auth_user_id, display_name) values (gen_random_uuid(), 'reg_applicant') returning id into applicant;
  insert into public.persons(auth_user_id, display_name) values (gen_random_uuid(), 'reg_admin') returning id into admin;
  insert into public.persons(auth_user_id, display_name) values (gen_random_uuid(), 'reg_stranger') returning id into stranger;
  insert into public.platform_admins values (admin);

  -- not signed in => refused
  perform set_config('request.jwt.claims', '', false); execute 'set role authenticated';
  ok := false; begin perform app.register_temple('วัดทดสอบ', 'นนทบุรี', null, null, null); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'register without sign-in refused');
  reset role;

  -- applicant registers => pending, becomes temple_admin
  perform test.as_person(applicant);
  t := app.register_temple('วัดทดสอบสมัคร', 'นนทบุรี', '1 ถนนทดสอบ', '021234567', null);
  ok := false; begin perform app.register_temple('  ', 'นนทบุรี', null, null, null); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'empty temple name rejected');
  perform app.update_temple_profile(t, 'วัดทดสอบสมัคร', 'นนทบุรี', null, null, 'คำอธิบาย', true);  -- wants to be listed
  select count(*) into n from public.temples where id = t and status = 'pending'; perform test.assert(n = 1, 'new temple is pending');
  perform test.assert(app.has_permission(t, 'temple.settings', 'T'), 'applicant is temple admin');
  ok := false; begin perform app.pending_temples(); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'non-admin cannot list pending temples');
  ok := false; begin perform app.review_temple(t, 'approved', null); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'applicant cannot approve own temple');
  -- spam limit: max 3 pending per person
  t2 := app.register_temple('วัดทดสอบสอง', 'นนทบุรี', null, null, null);
  perform app.register_temple('วัดทดสอบสาม', 'นนทบุรี', null, null, null);
  ok := false; begin perform app.register_temple('วัดทดสอบสี่', 'นนทบุรี', null, null, null); exception when program_limit_exceeded then ok := true; end;
  perform test.assert(ok, '4th pending application refused');
  reset role;

  select slug into slug_t from public.temples where id = t;
  -- public sees nothing while pending, even though is_listed = true
  perform set_config('request.jwt.claims', '', false); execute 'set role anon';
  select count(*) into n from public.listed_temples() where name_th = 'วัดทดสอบสมัคร'; perform test.assert(n = 0, 'pending temple not public');
  select count(*) into n from public.temple_profile(slug_t); perform test.assert(n = 0, 'pending profile hidden');
  reset role;

  -- stranger cannot edit someone else's temple
  perform test.as_person(stranger);
  ok := false; begin perform app.update_temple_profile(t, 'แก้ชื่อ', 'กทม', null, null, null, true); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'stranger cannot edit temple');
  reset role;

  -- platform admin approves one, rejects another
  perform test.as_person(admin);
  select count(*) into n from app.pending_temples() where id in (t, t2); perform test.assert(n = 2, 'admin sees pending applications');
  perform app.review_temple(t, 'approved', null);
  perform app.review_temple(t2, 'rejected', 'ข้อมูลไม่ครบ');
  ok := false; begin perform app.review_temple(t, 'rejected', null); exception when no_data_found then ok := true; end;
  perform test.assert(ok, 'cannot review twice');
  reset role;

  perform set_config('request.jwt.claims', '', false); execute 'set role anon';
  select count(*) into n from public.listed_temples('สมัคร'); perform test.assert(n = 1, 'approved + listed temple is searchable');
  select count(*) into n from public.listed_temples('นนทบุรี') where name_th = 'วัดทดสอบสอง'; perform test.assert(n = 0, 'rejected temple not public');
  select count(*) into n from public.temple_profile(slug_t); perform test.assert(n = 1, 'approved profile public');
  reset role;
  select status into st from public.temples where id = t2; perform test.assert(st = 'rejected', 'rejection stored');
  select count(*) into n from public.audit_logs where temple_id = t and action in ('temple.registered', 'temple.approved');
  perform test.assert(n = 2, 'registration and approval audited');
  raise notice 'PASS 06_registration: sign-in required, pending until approved, admin-only review, spam limit, audit';
end $$;
