-- Fictional demo data only (temples demo-a, demo-b). Fixed UUIDs so tests can reference them.
begin;
insert into public.temples(id, slug, name_th, name_en) values
 ('aaaaaaaa-0000-0000-0000-000000000001','demo-a','วัดตัวอย่าง เอ','Demo Temple A'),
 ('bbbbbbbb-0000-0000-0000-000000000001','demo-b','วัดตัวอย่าง บี','Demo Temple B');
insert into public.departments(temple_id, id, code, name_th) values
 ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-0000000000d1','general','ทั่วไป'),
 ('bbbbbbbb-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-0000000000d1','general','ทั่วไป');
commit;
