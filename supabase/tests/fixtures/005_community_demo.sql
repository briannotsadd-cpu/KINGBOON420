-- TEST FIXTURE (fictional): one Temple Contact thread per demo temple so isolation checks are not vacuous.
insert into public.temple_contact_threads(temple_id, ref_code, topic, message, sender_name)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'FIXA0001', 'activity', 'ข้อความทดสอบถึงวัด A (fictional)', 'ผู้ทดสอบ'),
       ('bbbbbbbb-0000-0000-0000-000000000001', 'FIXB0001', 'activity', 'ข้อความทดสอบถึงวัด B (fictional)', 'ผู้ทดสอบ');
