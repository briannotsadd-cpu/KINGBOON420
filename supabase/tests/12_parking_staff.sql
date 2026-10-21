-- 12 Parking staff functions (0016): manage lots, confirm before public, report status, isolation, validation, rate limit.
do $$
declare
  A  constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';  B constant uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
  L1 constant uuid := 'aaaaaaaa-0000-0000-0000-0000000000e1';   BL constant uuid := 'bbbbbbbb-0000-0000-0000-0000000000e1';
  fm uuid := test.pid('facility_manager'); ab uuid := test.pid('abbot'); tp uuid := test.pid('traffic_staff');
  sg uuid := test.pid('security_guard'); cm uuid := test.pid('community_member');
  lot uuid; n bigint; r record; ok boolean; st text;
begin
  -- 1 facility manager adds a public lot: it waits for the temple and is not public yet
  perform test.as_person(fm);
  lot := app.save_parking_lot(A, null, 'P9', 'ลานจอดทดสอบ', 30, 2, '{car,van}', 'ฟรี', '06:00-20:00', true, true, 45);
  select * into r from app.parking_staff_lots(A) where id = lot;
  perform test.assert(r.verification_status = 'WAITING_TEMPLE_CONFIRMATION' and r.status = 'UNKNOWN' and r.stale_after_minutes = 45,
                      'new lot waits for confirmation, no report => UNKNOWN');
  reset role;
  select count(*) into n from public.temple_parking('demo-a') where lot_code = 'P9';
  perform test.assert(n = 0, 'unconfirmed lot is not public');

  -- 2 only temple.settings confirms (facility manager and traffic staff cannot)
  foreach st in array array['facility_manager', 'traffic_staff'] loop
    perform test.as_person(test.pid(st)); ok := false;
    begin perform app.confirm_parking_lot(A, lot); exception when insufficient_privilege then ok := true; end;
    perform test.assert(ok, st || ' must not confirm a parking lot');
    reset role;
  end loop;
  perform test.as_person(ab);
  perform app.confirm_parking_lot(A, lot);
  reset role;
  select count(*) into n from public.temple_parking('demo-a') where lot_code = 'P9';
  perform test.assert(n = 1, 'confirmed lot is public');

  -- 3 changing only active/stale keeps the confirmation; changing what visitors see clears it
  perform test.as_person(fm);
  perform app.save_parking_lot(A, lot, null, 'ลานจอดทดสอบ', 30, 2, '{car,van}', 'ฟรี', '06:00-20:00', true, true, 90);
  select verification_status into st from public.parking_lots where id = lot;
  perform test.assert(st = 'TEMPLE_CONFIRMED', 'stale-minutes change keeps the confirmation');
  perform app.save_parking_lot(A, lot, 'IGNORED', 'ลานจอดทดสอบ (ใหม่)', 30, 2, '{car,van}', 'ฟรี', '06:00-20:00', true, true, 90);
  select * into r from public.parking_lots where id = lot;
  perform test.assert(r.verification_status = 'WAITING_TEMPLE_CONFIRMATION' and r.confirmed_by is null and r.code = 'P9',
                      'name change clears the confirmation; the code never changes');
  reset role;
  select count(*) into n from public.temple_parking('demo-a') where lot_code = 'P9';
  perform test.assert(n = 0, 'edited lot is hidden again until reconfirmed');

  -- 4 validation (23514) and duplicate code (23505)
  perform test.as_person(fm);
  foreach st in array array['accessible', 'vehicles', 'code', 'name', 'stale'] loop
    ok := false;
    begin
      case st
        when 'accessible' then perform app.save_parking_lot(A, null, 'P10', 'ลานใหม่', 5, 6, '{car}', null, null, true, true, 60);
        when 'vehicles'   then perform app.save_parking_lot(A, null, 'P10', 'ลานใหม่', 5, 0, '{plane}', null, null, true, true, 60);
        when 'code'       then perform app.save_parking_lot(A, null, 'p 10', 'ลานใหม่', 5, 0, '{car}', null, null, true, true, 60);
        when 'name'       then perform app.save_parking_lot(A, null, 'P10', ' ', 5, 0, '{car}', null, null, true, true, 60);
        when 'stale'      then perform app.save_parking_lot(A, null, 'P10', 'ลานใหม่', 5, 0, '{car}', null, null, true, true, 2);
      end case;
    exception when check_violation then ok := true; end;
    perform test.assert(ok, 'invalid ' || st || ' rejected with 23514');
  end loop;
  ok := false;
  begin perform app.save_parking_lot(A, null, 'P1', 'ซ้ำ', 5, 0, '{car}', null, null, true, true, 60); exception when unique_violation then ok := true; end;
  perform test.assert(ok, 'duplicate lot code rejected');

  -- 5 cross-tenant: nobody in A can touch B
  ok := false;
  begin perform app.save_parking_lot(B, null, 'PX', 'ลานบี', 5, 0, '{car}', null, null, true, true, 60); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'A manager cannot add a lot to B');
  ok := false;
  begin perform app.save_parking_lot(B, BL, null, 'ลานบี', 5, 0, '{car}', null, null, true, true, 60); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'A manager cannot edit a lot of B');
  ok := false;
  begin perform app.set_parking_declared(B, 'none'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'A manager cannot change B parking declaration');
  select count(*) into n from app.parking_staff_lots(B);  perform test.assert(n = 0, 'A manager sees no B lot');
  reset role;
  perform test.as_person(ab); ok := false;
  begin perform app.confirm_parking_lot(B, BL); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'A abbot cannot confirm a B lot');
  reset role;
  perform test.as_person(tp); ok := false;
  begin perform app.report_parking_status(B, BL, 'FULL', null, null); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'A traffic staff cannot report for B');
  ok := false;
  begin perform app.report_parking_status(A, BL, 'FULL', null, null); exception when no_data_found then ok := true; end;
  perform test.assert(ok, 'a B lot id under temple A is not found');

  -- 6 roles: traffic staff reports but cannot manage; community member can do neither
  ok := false;
  begin perform app.save_parking_lot(A, null, 'P11', 'ลานใหม่', 5, 0, '{car}', null, null, true, true, 60); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'traffic staff cannot add lots');
  ok := false;
  begin perform app.set_parking_declared(A, 'none'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'traffic staff cannot change the declaration');
  perform app.report_parking_status(A, lot, 'FULL', null, '  เต็มตั้งแต่ 9 โมง  ');
  select * into r from app.parking_staff_lots(A) where id = lot;
  perform test.assert(r.status = 'FULL' and r.free_spaces = 0 and r.note_th = 'เต็มตั้งแต่ 9 โมง' and r.reported_by_me,
                      'FULL report stores 0 free, trimmed note, reporter = caller');
  ok := false;
  begin perform app.report_parking_status(A, lot, 'CLOSED', 3, null); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'CLOSED with free spaces rejected');
  ok := false;
  begin perform app.report_parking_status(A, lot, 'UNKNOWN', null, null); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'UNKNOWN is never stored');
  reset role;
  perform test.as_person(cm);
  foreach st in array array['report', 'save', 'declare'] loop
    ok := false;
    begin
      case st
        when 'report'  then perform app.report_parking_status(A, L1, 'FULL', null, null);
        when 'save'    then perform app.save_parking_lot(A, null, 'P12', 'ลานใหม่', 5, 0, '{car}', null, null, true, true, 60);
        when 'declare' then perform app.set_parking_declared(A, 'none');
      end case;
    exception when insufficient_privilege then ok := true; end;
    perform test.assert(ok, 'community_member must not ' || st);
  end loop;
  reset role;

  -- 7 an inactive lot takes no reports and is not public
  perform test.as_person(fm);
  perform app.save_parking_lot(A, lot, null, 'ลานจอดทดสอบ (ใหม่)', 30, 2, '{car,van}', 'ฟรี', '06:00-20:00', true, false, 90);
  reset role;
  perform test.as_person(tp); ok := false;
  begin perform app.report_parking_status(A, lot, 'AVAILABLE', null, null); exception when no_data_found then ok := true; end;
  perform test.assert(ok, 'inactive lot takes no reports');
  reset role;

  -- 8 rate limit: at most 30 reports per reporter per 10 minutes
  perform test.as_person(sg); ok := false;
  begin
    for i in 1..31 loop perform app.report_parking_status(A, L1, 'AVAILABLE', null, null); end loop;
  exception when sqlstate '54000' then ok := true; end;
  perform test.assert(ok, 'the 31st report within 10 minutes is rate limited');
  reset role;

  -- 9 every write is audited
  select count(*) into n from public.audit_logs where temple_id = A and action in ('parking.lot_saved', 'parking.lot_confirmed');
  perform test.assert(n >= 5, 'lot saves and confirmations are audited, got ' || n);

  raise notice 'PASS 12_parking_staff: confirm-before-public, reconfirm on edit, validation, isolation, roles, rate limit, audit';
end $$;
