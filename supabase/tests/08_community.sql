-- 08 Community: eligibility (lay adults only; monks/minors/suspended out), connection-gated chat, block/mute,
-- posts visibility, reports + moderation, 1:1 call sessions + signalling privacy, rate limits, Temple Contact.
do $$
declare L1 uuid := test.pid('community_member'); L2 uuid := test.pid('volunteer'); L3 uuid := test.pid('lay_resident');
  L4 uuid := test.pid('staff_general'); MONK uuid := test.pid('bhikkhu'); MINOR uuid := test.pid('temple_boy');
  YOUNG uuid := test.pid('gardener'); ABBOT uuid := test.pid('abbot'); ADMIN uuid; NEWP uuid;
  c uuid; c34 uuid; p uuid; p2 uuid; rpt uuid; call uuid; n bigint; ok boolean; st text; code text; i int; th uuid;
  y int := extract(year from now())::int;
begin
  insert into public.persons(auth_user_id, display_name) values (gen_random_uuid(), 'comm_admin') returning id into ADMIN;
  insert into public.platform_admins values (ADMIN);
  update public.memberships set is_minor = true where person_id = MINOR;

  -- no profile => no community
  perform test.as_person(L1);
  ok := false; begin perform app.create_post('สวัสดี', 'public'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'no profile (age not declared) => cannot post');
  perform app.save_community_profile('ผู้ทดสอบหนึ่ง', y - 40, 'แนะนำตัว', array['ทำอาหาร'], array['ธรรมะ'], 'private', 'public', 'connections', true, 'connections');
  reset role;
  insert into public.community_profiles(person_id, display_name, birth_year) values
    (L2, 'ผู้ทดสอบสอง', y - 30), (L3, 'ผู้ทดสอบสาม', y - 50), (L4, 'ผู้ทดสอบสี่', y - 35),
    (MONK, 'พระทดสอบ', y - 45), (MINOR, 'เด็กทดสอบ', y - 30), (YOUNG, 'วัยรุ่นทดสอบ', y - 17);

  -- eligibility
  perform test.assert(app.community_can(L1, 'community.p2p_chat'), 'adult lay with profile can chat');
  perform test.assert(not app.community_can(MONK, 'community.participate'), 'monastic has no community access');
  perform test.assert(not app.community_can(MINOR, 'community.participate'), 'minor-flagged membership excluded');
  perform test.assert(not app.community_can(YOUNG, 'community.participate'), 'birth year under 20 excluded');
  perform test.assert(not app.community_can(ABBOT, 'community.participate'), 'abbot has no community access');

  perform test.as_person(L1);
  ok := false; begin perform app.request_connection(MONK); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'no connection/DM route to a monk');
  select count(*) into n from app.profile_card(MONK); perform test.assert(n = 0, 'monk profile not exposed to community');
  select count(*) into n from app.search_people('ทดสอบ') s where s.person_id in (MONK, MINOR, YOUNG);
  perform test.assert(n = 0, 'search never returns monks/minors');
  ok := false; begin perform app.open_direct_conversation(L2); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'chat requires an accepted connection');
  perform app.request_connection(L2);
  reset role;

  -- visibility of fields: L3 (not connected) sees only public fields of L1
  perform test.as_person(L3);
  select count(*) into n from app.profile_card(L1) where bio is null and skills = array['ทำอาหาร'] and interests = '{}';
  perform test.assert(n = 1, 'field visibility: private bio hidden, public skills shown, connections-only interests hidden');
  reset role;

  perform test.as_person(L2);
  perform app.respond_connection(L1, true);
  select count(*) into n from app.profile_card(L1) where interests = array['ธรรมะ'] and bio is null;
  perform test.assert(n = 1, 'connection sees connections-only interests, still not private bio');
  reset role;

  perform test.as_person(L1);
  c := app.open_direct_conversation(L2);
  perform app.send_message(c, 'สวัสดีครับ');
  reset role;
  perform test.as_person(L3);
  select count(*) into n from public.messages where conversation_id = c; perform test.assert(n = 0, 'outsider cannot read messages (RLS)');
  select count(*) into n from app.conversation_messages(c); perform test.assert(n = 0, 'outsider cannot read messages (function)');
  ok := false; begin perform app.send_message(c, 'แทรก'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'outsider cannot send into a conversation');
  reset role;
  perform test.as_person(L2);
  select count(*) into n from app.my_conversations() where id = c and unread = 1; perform test.assert(n = 1, 'recipient sees 1 unread');
  reset role;

  -- posts
  perform test.as_person(L1);
  p := app.create_post('โพสต์สาธารณะทดสอบ', 'public');
  p2 := app.create_post('โพสต์เฉพาะเพื่อน', 'connections');
  reset role;
  perform test.as_person(L3);
  select count(*) into n from app.community_feed() f where f.id = p; perform test.assert(n = 1, 'public post visible to others');
  select count(*) into n from app.community_feed() f where f.id = p2; perform test.assert(n = 0, 'connections-only post hidden from non-connection');
  select count(*) into n from public.community_posts where id = p2; perform test.assert(n = 0, 'connections-only post hidden via RLS');
  perform app.comment_post(p, 'อนุโมทนาครับ');
  reset role;
  perform test.as_person(L2);
  select count(*) into n from app.community_feed() f where f.id = p2; perform test.assert(n = 1, 'connection sees connections-only post');
  reset role;
  perform test.as_person(MONK);
  ok := false; begin perform app.create_post('x', 'public'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'monk cannot post in community');
  select count(*) into n from app.community_feed(); perform test.assert(n = 0, 'monk sees no community feed');
  reset role;

  -- mute: L1 mutes L3 => L3 posts hidden from L1 feed, L3 can still see L1
  perform test.as_person(L3); p2 := app.create_post('โพสต์ของสาม', 'public'); reset role;
  perform test.as_person(L1);
  perform app.set_mute(L3, true);
  select count(*) into n from app.community_feed() f where f.author = L3; perform test.assert(n = 0, 'muted author hidden from feed');
  reset role;

  -- block: L2 blocks L1 => connection gone, no messages, no profile, no posts either way
  perform test.as_person(L2); perform app.block_person(L1); reset role;
  perform test.as_person(L1);
  ok := false; begin perform app.send_message(c, 'ยังอยู่ไหม'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'blocked user cannot message');
  select count(*) into n from app.profile_card(L2); perform test.assert(n = 0, 'blocked user cannot see profile');
  ok := false; begin perform app.request_connection(L2); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'blocked user cannot re-request connection');
  reset role;
  perform test.as_person(L2);
  select count(*) into n from app.community_feed() f where f.author = L1; perform test.assert(n = 0, 'blocker does not see blocked user posts');
  reset role;

  -- report + moderation
  perform test.as_person(L3);
  rpt := app.report_content('post', p, 'harassment', 'ทดสอบรายงาน');
  ok := false; begin perform * from app.moderation_queue(); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'non-admin cannot read moderation queue');
  ok := false; begin perform app.report_content('message', (select id from public.messages limit 1), 'other', null); exception when no_data_found then ok := true; end;
  perform test.assert(ok, 'cannot report a message from a conversation you are not in');
  reset role;
  perform test.as_person(L1);
  select count(*) into n from public.moderation_reports; perform test.assert(n = 0, 'reported person cannot see the report/reporter');
  reset role;
  perform test.as_person(ADMIN);
  select count(*) into n from app.moderation_queue() q where q.id = rpt; perform test.assert(n = 1, 'admin sees report');
  ok := false; begin perform app.decide_report(rpt, 'remove_content', ' '); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'decision needs a reason');
  perform app.decide_report(rpt, 'remove_content', 'ผิดกติกา (ทดสอบ)');
  reset role;
  perform test.as_person(L3);
  select count(*) into n from app.community_feed() f where f.id = p; perform test.assert(n = 0, 'removed post gone from feed');
  select status into st from public.moderation_reports where id = rpt; perform test.assert(st = 'actioned', 'reporter sees outcome');
  rpt := app.report_content('person', L1, 'harassment', null);
  reset role;
  perform test.as_person(ADMIN); perform app.decide_report(rpt, 'suspend', 'ระงับทดสอบ'); reset role;
  perform test.assert(not app.community_can(L1, 'community.participate'), 'suspended person loses community access');

  -- calls: L3 <-> L4
  perform test.as_person(L3); perform app.request_connection(L4); reset role;
  perform test.as_person(L4); perform app.respond_connection(L3, true); reset role;
  perform test.as_person(L3);
  c34 := app.open_direct_conversation(L4);
  call := app.start_call(c34, 'video');
  ok := false; begin perform app.start_call(c34, 'voice'); exception when sqlstate '55006' then ok := true; end;
  perform test.assert(ok, 'second concurrent call refused (busy)');
  perform app.send_signal(call, 'offer', '{"sdp":"v=0 test"}');
  select count(*) into n from public.call_signals; perform test.assert(n = 0, 'caller cannot read signals addressed to callee');
  reset role;
  perform test.as_person(L2);
  select count(*) into n from app.call_state(call); perform test.assert(n = 0, 'outsider cannot read call state');
  ok := false; begin perform app.send_signal(call, 'ice', '{}'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'outsider cannot inject signals');
  reset role;
  perform test.as_person(L4);
  select count(*) into n from app.incoming_call() ic where ic.id = call; perform test.assert(n = 1, 'callee sees incoming call');
  select count(*) into n from app.call_state(call) s where s.signal_kind = 'offer'; perform test.assert(n = 1, 'callee receives offer');
  perform app.answer_call(call, true);
  perform app.send_signal(call, 'answer', '{"sdp":"v=0 answer"}');
  perform app.end_call(call);
  reset role;
  select status into st from public.call_sessions where id = call; perform test.assert(st = 'ended', 'call ended');
  select count(*) into n from public.call_signals where call_id = call; perform test.assert(n = 0, 'signalling data deleted at call end');
  perform test.as_person(L4);
  perform app.save_community_profile('ผู้ทดสอบสี่', y - 35, null, null, null, 'connections', 'connections', 'connections', true, 'nobody');
  reset role;
  perform test.as_person(L3);
  ok := false; begin perform app.start_call(c34, 'voice'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'call permission "nobody" respected');
  -- rate limit: 20 messages / minute
  ok := false;
  begin for i in 1..21 loop perform app.send_message(c34, 'ข้อความ ' || i); end loop;
  exception when sqlstate '54000' then ok := true; end;
  perform test.assert(ok, 'message rate limit enforced');
  reset role;
  perform test.as_person(MONK);
  ok := false; begin perform app.start_call(c34, 'voice'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'monk cannot place community calls');
  reset role;

  -- group chat: members must be connections; outsiders cannot post into the group
  perform test.as_person(L3);
  ok := false; begin perform app.create_group('กลุ่มทดสอบ', array[L2]); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'group members must be accepted connections');
  c := app.create_group('กลุ่มทดสอบ', array[L4]);
  reset role;
  perform test.as_person(L2);
  ok := false; begin perform app.send_message(c, 'แทรกกลุ่ม'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'outsider cannot post into a group');
  reset role;

  -- Temple Contact
  perform set_config('request.jwt.claims', '', false); execute 'set role anon';
  ok := false; begin perform app.submit_temple_contact('demo-b-missing', 'other', 'ข้อความทดสอบ', null, null, 'h1'); exception when sqlstate '55000' then ok := true; end;
  perform test.assert(ok, 'contact to unknown/unverified temple refused');
  code := app.submit_temple_contact('demo-a', 'invite_monk', 'ขอนิมนต์พระ (ทดสอบ)', 'ผู้ทดสอบ', '0800000000', 'iphash-1');
  perform test.assert(char_length(code) = 8, 'visitor gets a reference code');
  ok := false; begin select count(*) into n from public.temple_contact_threads; exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'visitor cannot read the inbox (no grant)');
  ok := false;
  begin for i in 1..5 loop perform app.submit_temple_contact('demo-a', 'other', 'ข้อความซ้ำทดสอบ', null, null, 'iphash-1'); end loop;
  exception when sqlstate '54000' then ok := true; end;
  perform test.assert(ok, 'contact rate limit per sender');
  reset role;
  select id into th from public.temple_contact_threads where ref_code = code;
  perform test.as_person(L4);
  select count(*) into n from public.temple_contact_threads where id = th; perform test.assert(n = 0, 'staff without contact_inbox.manage cannot read');
  ok := false; begin perform app.contact_update(th, 'aaaaaaaa-0000-0000-0000-000000000001', 'reply', 'x'); exception when insufficient_privilege then ok := true; end;
  perform test.assert(ok, 'staff without contact_inbox.manage cannot reply');
  reset role;
  perform test.as_person(test.pid('monk_secretary'));
  select count(*) into n from public.temple_contact_threads where id = th; perform test.assert(n = 1, 'secretary sees contact');
  perform app.contact_update(th, 'aaaaaaaa-0000-0000-0000-000000000001', 'assign', null);
  perform app.contact_update(th, 'aaaaaaaa-0000-0000-0000-000000000001', 'reply', 'ทางวัดรับเรื่องแล้ว (ทดสอบ)');
  perform app.contact_update(th, 'aaaaaaaa-0000-0000-0000-000000000001', 'close', null);
  ok := false; begin perform app.contact_update(th, 'aaaaaaaa-0000-0000-0000-000000000001', 'reply', 'อีกครั้ง'); exception when check_violation then ok := true; end;
  perform test.assert(ok, 'closed thread cannot be replied');
  reset role;
  perform test.as_person((select id from public.persons where display_name = 'b_owner'));
  select count(*) into n from public.temple_contact_threads where id = th; perform test.assert(n = 0, 'other temple cannot read thread');
  reset role;

  -- follow a verified temple as community_member
  insert into public.persons(auth_user_id, display_name) values (gen_random_uuid(), 'comm_new') returning id into NEWP;
  perform test.as_person(NEWP);
  ok := false; begin perform app.join_temple_community('bbbbbbbb-0000-0000-0000-00000000ffff'); exception when sqlstate '55000' then ok := true; end;
  perform test.assert(ok, 'cannot follow an unverified/unknown temple');
  perform app.join_temple_community('aaaaaaaa-0000-0000-0000-000000000001');
  perform app.save_community_profile('ผู้ใช้ใหม่', y - 25, null, null, null, 'connections', 'connections', 'connections', true, 'connections');
  reset role;
  perform test.assert(app.community_can(NEWP, 'community.participate'), 'follower with profile can participate');
  perform test.assert(not app.community_can(NEWP, 'community.calls') = false, 'community_member holds community.calls');
  perform test.as_person(NEWP);
  perform app.leave_temple_community('aaaaaaaa-0000-0000-0000-000000000001');
  perform app.join_temple_community('aaaaaaaa-0000-0000-0000-000000000001');
  reset role;
  perform test.assert(app.community_can(NEWP, 'community.participate'), 're-follow after leaving re-activates the membership');
  perform set_config('request.jwt.claims', '', false); execute 'set role anon';
  select count(*) into n from public.public_temple_ref('demo-a'); perform test.assert(n = 1, 'public ref for verified temple');
  select count(*) into n from public.public_temple_ref('demo-b'); perform test.assert(n = 0, 'no public ref for unverified temple');
  reset role;
  perform test.as_person(L4);
  perform app.submit_temple_contact('demo-a', 'activity', 'สอบถามกิจกรรม (ทดสอบ)', null, null, 'iphash-l4');
  select count(*) into n from app.my_contact_threads() where temple_name is not null; perform test.assert(n = 1, 'sender sees own thread with temple name');
  reset role;
  raise notice 'PASS 08_community: eligibility, connection-gated chat, block/mute, posts, moderation, calls, rate limits, temple contact';
end $$;
