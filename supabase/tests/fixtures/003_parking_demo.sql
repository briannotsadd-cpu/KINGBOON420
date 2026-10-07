-- Fictional parking demo data. demo-a: listed, one public lot + one staff-only lot. demo-b: NOT listed.
begin;
insert into public.persons(id, auth_user_id, display_name) values
 ('cccccccc-0000-0000-0000-0000000000f1', md5('auth_seed_parking')::uuid, 'seed_parking_staff');
update public.temples set is_listed = true,  parking_declared = 'lots' where slug = 'demo-a';
update public.temples set is_listed = false, parking_declared = 'lots' where slug = 'demo-b';
insert into public.parking_lots(temple_id, id, code, name_th, capacity, accessible_spaces, vehicle_types, fee_note_th, hours_note_th, is_public) values
 ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-0000000000e1','P1','ลานจอดหน้าวัด',40,2,'{car,motorcycle}','ฟรี','06:00–18:00',true),
 ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-0000000000e2','P2','ลานจอดเจ้าหน้าที่',10,0,'{car}',null,null,false),
 ('bbbbbbbb-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-0000000000e1','P1','ลานจอดวัดบี',20,1,'{car}','ฟรี',null,true);
insert into public.parking_status_reports(temple_id, lot_id, status, free_spaces, reported_by, reported_at) values
 ('bbbbbbbb-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-0000000000e1','AVAILABLE',12,'cccccccc-0000-0000-0000-0000000000f1', now());
update public.temples set status = 'approved' where slug in ('demo-a','demo-b');
commit;
