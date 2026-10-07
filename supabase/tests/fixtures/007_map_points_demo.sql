-- TEST FIXTURE (fictional): map + points rows in each demo temple so isolation checks are not vacuous.
do $$
declare t uuid; owner uuid; lay uuid; q uuid; qa uuid; r uuid; b uuid;
begin
  foreach t in array array['aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-0000-0000-0000-000000000001'::uuid] loop
    select person_id into owner from public.memberships where temple_id = t order by created_at limit 1;
    insert into public.persons(auth_user_id, display_name) values (gen_random_uuid(), 'fixture_lay_' || left(t::text, 4)) returning id into lay;
    insert into public.memberships(temple_id, person_id, status) values (t, lay, 'active');
    insert into public.buildings(temple_id, code, name_th, kind, created_by) values (t, 'DEMO.SALA.01', 'ศาลาทดสอบ', 'SALA', owner) returning id into b;
    insert into public.zones(temple_id, building_id, code, name_th, kind) values (t, b, 'DEMO.SALA.01.Z01', 'โซนทดสอบ', 'INTERIOR');
    insert into public.quests(temple_id, quest_type, title, created_by, status) values (t, 'volunteer', 'งานทดสอบ', owner, 'OPEN') returning id into q;
    insert into public.quest_assignments(temple_id, quest_id, assignee_person_id) values (t, q, lay) returning id into qa;
    insert into public.point_holds(temple_id, person_id, assignment_id, amount, signal) values (t, lay, qa, 5, 'FIXTURE');
    insert into public.reward_catalog(temple_id, name_th, cost, stock, created_by) values (t, 'ของที่ระลึกทดสอบ', 5, 10, owner) returning id into r;
    insert into public.reward_redemptions(temple_id, reward_id, person_id, cost) values (t, r, lay, 5);
  end loop;
end $$;
