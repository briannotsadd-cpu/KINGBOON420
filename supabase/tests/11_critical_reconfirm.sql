-- 11 Re-confirming an expired CRITICAL field needs two people (step 1 temple, step 2 the abbot, different person).
do $$
declare A constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; TA uuid := test.pid('temple_admin'); AB uuid := test.pid('abbot');
  v uuid; st text; ok boolean; n bigint;
begin
  insert into public.temple_field_values(temple_id, field_key, value, source_id, status, verified_by, verified_at, last_reviewed_at, verification_expires_at)
  values (A, 'temple.donation_account', '"บัญชีทดสอบ (fictional)"', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'TEMPLE_CONFIRMED', AB,
          now() - interval '400 days', now() - interval '400 days', now() - interval '35 days') returning id into v;
  perform set_config('request.jwt.claims', '', false); execute 'set role anon';
  select count(*) into n from public.temple_public_fields('demo-a') where field_key = 'temple.donation_account' and value = '"บัญชีทดสอบ (fictional)"';
  perform test.assert(n = 0, 'expired donation account hidden');
  reset role;
  perform test.as_person(TA);
  st := app.reconfirm_field_value(v); perform test.assert(st = 'first', 'step 1 recorded, got ' || st);
  ok := false; begin perform app.reconfirm_field_value(v); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'same person cannot complete the re-confirmation');
  reset role;
  perform set_config('request.jwt.claims', '', false); execute 'set role anon';
  select count(*) into n from public.temple_public_fields('demo-a') where field_key = 'temple.donation_account' and value = '"บัญชีทดสอบ (fictional)"';
  perform test.assert(n = 0, 'still hidden after step 1');
  reset role;
  perform test.as_person(AB);
  st := app.reconfirm_field_value(v); perform test.assert(st = 'done', 'abbot completes step 2, got ' || st);
  reset role;
  select count(*) into n from public.temple_field_values where id = v and verification_expires_at > now() + interval '300 days';
  perform test.assert(n = 1, 'fresh expiry after two-person re-confirmation');
  perform set_config('request.jwt.claims', '', false); execute 'set role anon';
  select count(*) into n from public.temple_public_fields('demo-a') where field_key = 'temple.donation_account' and value = '"บัญชีทดสอบ (fictional)"';
  perform test.assert(n = 1, 'public again after step 2');
  reset role;
  -- next cycle starts again at step 1 (the old step-1 stamp is older than the new verified_at)
  perform test.as_person(AB); st := app.reconfirm_field_value(v); reset role;
  perform test.assert(st = 'first', 'a new cycle needs step 1 again');
  raise notice 'PASS 11_critical_reconfirm: two-person re-confirmation for critical fields';
end $$;
