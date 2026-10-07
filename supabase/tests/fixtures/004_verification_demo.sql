-- FICTIONAL test fixture: makes demo-a a "verified temple" so parking/public tests have something to show.
-- The source is explicitly labelled as a test fixture and points at a reserved .invalid domain.
begin;
insert into public.data_sources(temple_id, id, source_type, source_name, source_url, evidence) values
 ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-0000000000a1','onab_registry','TEST FIXTURE (fictional)','https://registry.example.invalid/demo-a','fixture'),
 ('bbbbbbbb-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-0000000000a1','onab_registry','TEST FIXTURE (fictional)','https://registry.example.invalid/demo-b','fixture');
insert into public.temple_field_values(temple_id, field_key, value, source_id, status, verified_by, verified_at, last_reviewed_at) values
 ('aaaaaaaa-0000-0000-0000-000000000001','temple.name_th','"วัดตัวอย่าง เอ"','aaaaaaaa-0000-0000-0000-0000000000a1','TEMPLE_CONFIRMED','cccccccc-0000-0000-0000-0000000000f1',now(),now()),
 ('aaaaaaaa-0000-0000-0000-000000000001','temple.province','"จังหวัดสมมติ"','aaaaaaaa-0000-0000-0000-0000000000a1','TEMPLE_CONFIRMED','cccccccc-0000-0000-0000-0000000000f1',now(),now()),
 ('aaaaaaaa-0000-0000-0000-000000000001','temple.address','"ที่อยู่สมมติสำหรับทดสอบ"','aaaaaaaa-0000-0000-0000-0000000000a1','TEMPLE_CONFIRMED','cccccccc-0000-0000-0000-0000000000f1',now(),now()),
 ('bbbbbbbb-0000-0000-0000-000000000001','temple.name_th','"วัดตัวอย่าง บี"','bbbbbbbb-0000-0000-0000-0000000000a1','SOURCE_FOUND',null,null,null);
update public.parking_lots set verification_status = 'TEMPLE_CONFIRMED' where temple_id in ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001');
commit;
