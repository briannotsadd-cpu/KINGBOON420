-- TEST FIXTURE (fictional): one invitation + event row set in each demo temple so isolation checks are not vacuous.
do $$
declare t uuid; r uuid; i uuid; e uuid; tg uuid; owner uuid; monk uuid;
begin
  foreach t in array array['aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-0000-0000-0000-000000000001'::uuid] loop
    select m.person_id into owner from public.memberships m where m.temple_id = t order by m.created_at limit 1;
    select m.person_id into monk from public.memberships m where m.temple_id = t and m.monastic_kind = 'bhikkhu' order by m.created_at limit 1;
    if monk is null then
      insert into public.persons(auth_user_id, display_name) values (gen_random_uuid(), 'fixture_monk_' || left(t::text, 4)) returning id into monk;
      insert into public.memberships(temple_id, person_id, status, monastic_kind) values (t, monk, 'active', 'bhikkhu');
    end if;
    if owner is null then owner := monk;
    end if;
    insert into public.rite_types(temple_id, name_th) values (t, 'พิธีทดสอบ') returning id into r;
    insert into public.invitations(temple_id, host_name, rite_type_id, venue_text, starts_at, duration_min, monks_required, created_by)
    values (t, 'เจ้าภาพทดสอบ', r, 'สถานที่สมมติ', now() + interval '10 days', 60, 1, owner) returning id into i;
    insert into public.invitation_team(temple_id, invitation_id, person_id) values (t, i, monk);
    insert into public.events(temple_id, kind, title, starts_at, ends_at, created_by)
    values (t, 'other', 'งานทดสอบ', now() + interval '20 days', now() + interval '20 days 2 hours', owner) returning id into e;
    insert into public.event_staffing_targets(temple_id, event_id, category, label, required, min_required) values (t, e, 'monk', 'พระสวด', 1, 1) returning id into tg;
    insert into public.event_participants(temple_id, event_id, target_id, person_id, status) values (t, e, tg, monk, 'CONFIRMED');
  end loop;
end $$;
