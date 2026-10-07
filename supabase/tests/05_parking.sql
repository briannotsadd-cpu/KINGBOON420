-- 05 Parking: a visitor picks a temple and sees whether there is parking. Runs after 00-04.
grant usage on schema test to anon;

do $$
declare
  A  constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  L1 constant uuid := 'aaaaaaaa-0000-0000-0000-0000000000e1';
  tp uuid := test.pid('traffic_staff'); cm uuid := test.pid('community_member');
  n bigint; r record; ok boolean;
begin
  -- 1-4 visitor (not logged in) -------------------------------------------------------------
  perform set_config('request.jwt.claims', '', false);
  execute 'set role anon';
  select count(*) into n from public.listed_temples();                      perform test.assert(n = 1, 'visitor sees 1 listed temple, got ' || n);
  select count(*) into n from public.listed_temples() where slug = 'demo-b'; perform test.assert(n = 0, 'unlisted demo-b hidden from discovery');
  select count(*) into n from public.temple_parking('demo-b');              perform test.assert(n = 0, 'unlisted temple returns no parking rows');
  select count(*) into n from public.temple_parking('demo-a');              perform test.assert(n = 1, 'only the public lot is shown (staff lot hidden), got ' || n);
  select * into r from public.temple_parking('demo-a');
  perform test.assert(r.lot_code = 'P1' and r.status = 'UNKNOWN' and r.free_spaces is null and r.reported_at is null,
                      'no report yet => UNKNOWN, no number');
  ok := false;
  begin perform 1 from public.parking_lots; exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'visitor cannot read parking_lots table directly');
  ok := false;
  begin perform 1 from public.parking_status_reports; exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'visitor cannot read reports (reporter identity stays private)');
  reset role;

  -- 5 traffic staff of A reports FILLING with 5 free spaces --------------------------------------
  perform test.as_person(tp);
  insert into public.parking_status_reports(temple_id, lot_id, status, free_spaces, reported_by) values (A, L1, 'FILLING', 5, tp);
  reset role;

  -- 6-7 visitor sees the fresh report; two hours later it is stale => UNKNOWN ---------------------
  execute 'set role anon';
  select * into r from public.temple_parking('demo-a');
  perform test.assert(r.status = 'FILLING' and r.free_spaces = 5, 'fresh report shown: ' || coalesce(r.status, 'null'));
  select * into r from public.temple_parking('demo-a', now() + interval '2 hours');
  perform test.assert(r.status = 'UNKNOWN' and r.free_spaces is null and r.reported_at is not null,
                      'stale report => UNKNOWN, number hidden, last-update time kept');
  reset role;

  -- 8 community member cannot report; 9 staff cannot report in someone else's name ---------------
  perform test.as_person(cm);
  ok := false;
  begin insert into public.parking_status_reports(temple_id, lot_id, status, reported_by) values (A, L1, 'FULL', cm);
  exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'community_member must not report parking status');
  reset role;
  perform test.as_person(tp);
  ok := false;
  begin insert into public.parking_status_reports(temple_id, lot_id, status, reported_by) values (A, L1, 'FULL', cm);
  exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'reporter must be the caller');

  -- 10 numbers must be consistent with capacity ---------------------------------------------------
  ok := false;
  begin insert into public.parking_status_reports(temple_id, lot_id, status, free_spaces, reported_by) values (A, L1, 'AVAILABLE', 41, tp);
  exception when check_violation then ok := true; end;
  perform test.assert(ok, 'free_spaces above capacity 40 rejected');
  ok := false;
  begin insert into public.parking_status_reports(temple_id, lot_id, status, free_spaces, reported_by) values (A, L1, 'FULL', 3, tp);
  exception when check_violation then ok := true; end;
  perform test.assert(ok, 'FULL with free spaces rejected');

  -- 12 members (any role) see both lots including the staff-only lot ----------------------------
  select count(*) into n from public.parking_lots;  perform test.assert(n = 2, 'member sees both A lots, got ' || n);
  reset role;

  -- 11 reports are append-only even for the table owner -----------------------------------------
  ok := false;
  begin update public.parking_status_reports set status = 'CLOSED' where lot_id = L1; exception when others then ok := true; end;
  perform test.assert(ok, 'reports cannot be updated');

  -- 13 a temple that declares no parking says so explicitly --------------------------------------
  update public.temples set parking_declared = 'none' where id = A;
  update public.parking_lots set active = false where temple_id = A;
  execute 'set role anon';
  select * into r from public.temple_parking('demo-a');
  perform test.assert(r.parking_declared = 'none' and r.lot_code is null, 'declared none => one row, no lots');
  reset role;
  update public.parking_lots set active = true where temple_id = A;
  update public.temples set parking_declared = 'lots' where id = A;

  raise notice 'PASS 05_parking: visitor discovery, Unknown/stale rules, report authority, consistency, append-only';
end $$;
