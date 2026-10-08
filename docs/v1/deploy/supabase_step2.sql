-- BOON SYSTEM: Supabase deploy, step 2 of 2 (run ONCE in Supabase Dashboard -> SQL Editor, project xauusd-signals).
-- Step 1 (migrations 0001-0007 and the first part of 0008) was applied by Claude via the Supabase connector.
-- This file = rest of 0008 + 0009..0014 (function DROPs replaced by rename + revoke, because the project is shared),
-- the roles/permissions seed (no temple data), and privilege hardening so anon/authenticated get exactly the grants
-- the tested local database has. Runs in one transaction: if anything fails, nothing is changed.
begin;
-- Connections ----------------------------------------------------------------------------------------------
create function app.request_connection(p_to uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.require_community('community.participate'); n bigint;
begin
  if p_to = me then raise exception 'cannot connect to self' using errcode = '22023'; end if;
  if app.is_blocked_between(me, p_to) or not app.community_can(p_to, 'community.participate') then
    raise exception 'person not available' using errcode = '42501'; end if;
  select count(*) into n from public.connections where requester = me and created_at > now() - interval '1 day';
  perform app.rate_limit(n, 30);
  if exists (select 1 from public.connections where requester = p_to and addressee = me and status = 'pending') then
    update public.connections set status = 'accepted', responded_at = now() where requester = p_to and addressee = me;
    return;
  end if;
  insert into public.connections(requester, addressee) values (me, p_to) on conflict do nothing;
end $$;
create function app.respond_connection(p_from uuid, p_accept boolean) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.require_community('community.participate');
begin
  if p_accept then
    if app.is_blocked_between(me, p_from) then raise exception 'person not available' using errcode = '42501'; end if;
    update public.connections set status = 'accepted', responded_at = now() where requester = p_from and addressee = me and status = 'pending';
  else
    delete from public.connections where requester = p_from and addressee = me and status = 'pending';
  end if;
  if not found then raise exception 'no pending request' using errcode = 'P0002'; end if;
end $$;
create function app.remove_connection(p_other uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id();
begin
  delete from public.connections where (requester = me and addressee = p_other) or (requester = p_other and addressee = me);
end $$;

-- Block / mute -------------------------------------------------------------------------------------------
create function app.block_person(p_other uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id();
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_other = me then raise exception 'cannot block self' using errcode = '22023'; end if;
  insert into public.person_blocks values (me, p_other) on conflict do nothing;
  delete from public.connections where (requester = me and addressee = p_other) or (requester = p_other and addressee = me);
  update public.call_sessions set status = 'ended', ended_at = now(), ended_by = me
   where status in ('ringing', 'active') and ((caller = me and callee = p_other) or (caller = p_other and callee = me));
end $$;
create function app.unblock_person(p_other uuid) returns void language sql security definer set search_path = public, pg_temp as $$
  delete from public.person_blocks where blocker = app.current_person_id() and blocked = p_other
$$;
create function app.set_mute(p_other uuid, p_muted boolean) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id();
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_muted then insert into public.person_mutes values (me, p_other) on conflict do nothing;
  else delete from public.person_mutes where muter = me and muted = p_other; end if;
end $$;

-- Conversations ---------------------------------------------------------------------------------------------
create function app.open_direct_conversation(p_other uuid) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.require_community('community.p2p_chat'); k text; c uuid;
begin
  if not app.community_can(p_other, 'community.p2p_chat') or app.is_blocked_between(me, p_other) or not app.are_connected(me, p_other) then
    raise exception 'chat needs an accepted connection' using errcode = '42501'; end if;
  k := least(me, p_other)::text || ':' || greatest(me, p_other)::text;
  select id into c from public.conversations where direct_key = k;
  if c is null then
    insert into public.conversations(kind, direct_key, created_by) values ('direct', k, me) returning id into c;
    insert into public.conversation_members(conversation_id, person_id) values (c, me), (c, p_other);
  else
    update public.conversation_members set left_at = null where conversation_id = c and person_id = me;
  end if;
  return c;
end $$;
create function app.create_group(p_title text, p_members uuid[]) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.require_community('community.p2p_chat'); c uuid; p uuid; n bigint;
begin
  if cardinality(p_members) < 1 or cardinality(p_members) > 49 then raise exception 'group needs 2-50 people' using errcode = '22023'; end if;
  select count(*) into n from public.conversations where created_by = me and kind = 'group' and created_at > now() - interval '1 day';
  perform app.rate_limit(n, 10);
  insert into public.conversations(kind, title, created_by) values ('group', btrim(p_title), me) returning id into c;
  insert into public.conversation_members(conversation_id, person_id, role) values (c, me, 'owner');
  foreach p in array p_members loop
    if p = me then continue; end if;
    if not app.are_connected(me, p) or app.is_blocked_between(me, p) or not app.community_can(p, 'community.p2p_chat') then
      raise exception 'every member must be an accepted connection' using errcode = '42501'; end if;
    insert into public.conversation_members(conversation_id, person_id) values (c, p) on conflict do nothing;
  end loop;
  return c;
end $$;
create function app.leave_conversation(p_conv uuid) returns void language sql security definer set search_path = public, pg_temp as $$
  update public.conversation_members set left_at = now() where conversation_id = p_conv and person_id = app.current_person_id()
$$;
create function app.send_message(p_conv uuid, p_body text) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.require_community('community.p2p_chat'); c public.conversations; other uuid; n bigint; m uuid;
begin
  if not app.is_conv_member(p_conv) then raise exception 'not a member' using errcode = '42501'; end if;
  select * into c from public.conversations where id = p_conv;
  if c.kind = 'direct' then
    select person_id into other from public.conversation_members where conversation_id = p_conv and person_id <> me;
    if app.is_blocked_between(me, other) or not app.are_connected(me, other) or not app.community_can(other, 'community.p2p_chat') then
      raise exception 'cannot message this person' using errcode = '42501'; end if;
    update public.conversation_members set left_at = null where conversation_id = p_conv and person_id = other;
  end if;
  select count(*) into n from public.messages where sender = me and created_at > now() - interval '1 minute';
  perform app.rate_limit(n, 20);
  insert into public.messages(conversation_id, sender, body) values (p_conv, me, btrim(p_body)) returning id into m;
  update public.conversation_members set last_read_at = now() where conversation_id = p_conv and person_id = me;
  return m;
end $$;
create function app.mark_read(p_conv uuid) returns void language sql security definer set search_path = public, pg_temp as $$
  update public.conversation_members set last_read_at = now() where conversation_id = p_conv and person_id = app.current_person_id()
$$;
create function app.my_conversations()
returns table (id uuid, kind text, title text, other_person uuid, last_body text, last_at timestamptz, unread bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, c.kind,
         coalesce(c.title, (select cp.display_name from public.conversation_members o join public.community_profiles cp on cp.person_id = o.person_id
                             where o.conversation_id = c.id and o.person_id <> me.person_id limit 1)),
         case when c.kind = 'direct' then (select o.person_id from public.conversation_members o where o.conversation_id = c.id and o.person_id <> me.person_id) end,
         lm.body, lm.created_at,
         (select count(*) from public.messages x where x.conversation_id = c.id and x.sender <> me.person_id and x.removed_at is null
            and x.created_at > coalesce(me.last_read_at, '-infinity'))
    from public.conversation_members me join public.conversations c on c.id = me.conversation_id
    left join lateral (select case when removed_at is null then body else '(ข้อความถูกลบ)' end as body, created_at
                       from public.messages where conversation_id = c.id order by created_at desc limit 1) lm on true
   where me.person_id = app.current_person_id() and me.left_at is null
   order by coalesce(lm.created_at, c.created_at) desc
$$;
create function app.conversation_messages(p_conv uuid, p_after timestamptz default null)
returns table (id uuid, sender uuid, sender_name text, body text, removed boolean, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select m.id, m.sender, cp.display_name, case when m.removed_at is null then m.body else null end, m.removed_at is not null, m.created_at
    from public.messages m left join public.community_profiles cp on cp.person_id = m.sender
   where app.is_conv_member(p_conv) and m.conversation_id = p_conv and (p_after is null or m.created_at > p_after)
   order by m.created_at desc limit 200
$$;

-- Posts ----------------------------------------------------------------------------------------------------
create function app.can_see_post(p public.community_posts) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select p.author = app.current_person_id()
      or (p.removed_at is null and app.community_can(app.current_person_id(), 'community.participate')
          and not app.is_blocked_between(app.current_person_id(), p.author)
          and app.community_can(p.author, 'community.participate')
          and (p.visibility = 'public' or app.are_connected(app.current_person_id(), p.author)))
$$;
create function app.create_post(p_body text, p_visibility text) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.require_community('community.participate'); n bigint; id uuid;
begin
  select count(*) into n from public.community_posts where author = me and created_at > now() - interval '1 hour';
  perform app.rate_limit(n, 10);
  insert into public.community_posts(author, body, visibility) values (me, btrim(p_body), p_visibility) returning community_posts.id into id;
  return id;
end $$;
create function app.delete_own_post(p_post uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.community_posts set removed_at = now(), removed_reason = 'deleted by author'
   where id = p_post and author = app.current_person_id() and removed_at is null;
  if not found then raise exception 'not your post' using errcode = '42501'; end if;
end $$;
create function app.comment_post(p_post uuid, p_body text) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.require_community('community.participate'); p public.community_posts; n bigint; id uuid;
begin
  select * into p from public.community_posts where community_posts.id = p_post;
  if not found or not app.can_see_post(p) or p.removed_at is not null then raise exception 'post not available' using errcode = '42501'; end if;
  select count(*) into n from public.post_comments where author = me and created_at > now() - interval '1 hour';
  perform app.rate_limit(n, 30);
  insert into public.post_comments(post_id, author, body) values (p_post, me, btrim(p_body)) returning post_comments.id into id;
  return id;
end $$;
create function app.community_feed(p_before timestamptz default null)
returns table (id uuid, author uuid, author_name text, body text, visibility text, created_at timestamptz, comment_count bigint, is_mine boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.id, p.author, cp.display_name, p.body, p.visibility, p.created_at,
         (select count(*) from public.post_comments c where c.post_id = p.id and c.removed_at is null
            and not app.is_blocked_between(app.current_person_id(), c.author)),
         p.author = app.current_person_id()
    from public.community_posts p join public.community_profiles cp on cp.person_id = p.author
   where p.removed_at is null and app.can_see_post(p) and (p_before is null or p.created_at < p_before)
     and not exists (select 1 from public.person_mutes mu where mu.muter = app.current_person_id() and mu.muted = p.author)
   order by p.created_at desc limit 30
$$;
create function app.post_comments_for(p_post uuid)
returns table (id uuid, author uuid, author_name text, body text, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, c.author, cp.display_name, c.body, c.created_at
    from public.post_comments c join public.community_profiles cp on cp.person_id = c.author
   where c.post_id = p_post and c.removed_at is null
     and exists (select 1 from public.community_posts p where p.id = p_post and app.can_see_post(p))
     and not app.is_blocked_between(app.current_person_id(), c.author)
   order by c.created_at limit 200
$$;

-- Reports + moderation ------------------------------------------------------------------------------------------
create function app.report_content(p_kind text, p_target uuid, p_reason text, p_note text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); tp uuid; n bigint; id uuid;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select count(*) into n from public.moderation_reports where reporter = me and created_at > now() - interval '1 day';
  perform app.rate_limit(n, 20);
  tp := case p_kind
    when 'person' then (select person_id from public.community_profiles where person_id = p_target)
    when 'message' then (select m.sender from public.messages m where m.id = p_target and app.is_conv_member(m.conversation_id))
    when 'post' then (select p.author from public.community_posts p where p.id = p_target and app.can_see_post(p))
    when 'comment' then (select c.author from public.post_comments c join public.community_posts p on p.id = c.post_id
                          where c.id = p_target and app.can_see_post(p)) end;
  if tp is null then raise exception 'target not found' using errcode = 'P0002'; end if;
  insert into public.moderation_reports(reporter, target_kind, target_id, target_person, reason, note)
  values (me, p_kind, p_target, tp, p_reason, nullif(btrim(p_note), '')) returning moderation_reports.id into id;
  return id;
end $$;
create function app.moderation_queue()
returns table (id uuid, target_kind text, target_id uuid, target_person uuid, target_name text, content text, reason text, note text,
               status text, created_at timestamptz, prior_actions bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select r.id, r.target_kind, r.target_id, r.target_person, cp.display_name,
    case r.target_kind when 'message' then (select body from public.messages where messages.id = r.target_id)
                       when 'post' then (select body from public.community_posts where community_posts.id = r.target_id)
                       when 'comment' then (select body from public.post_comments where post_comments.id = r.target_id) end,
    r.reason, r.note, r.status, r.created_at,
    (select count(*) from public.moderation_reports x where x.target_person = r.target_person and x.status = 'actioned')
    from public.moderation_reports r left join public.community_profiles cp on cp.person_id = r.target_person
   where r.status = 'open' order by (r.reason = 'minor_safety') desc, r.created_at;
end $$;
create function app.decide_report(p_report uuid, p_decision text, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); r public.moderation_reports;
begin
  if not app.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'decision reason required' using errcode = '23514'; end if;
  select * into r from public.moderation_reports where id = p_report and status = 'open' for update;
  if not found then raise exception 'report not open' using errcode = 'P0002'; end if;
  if p_decision = 'remove_content' then
    if r.target_kind = 'message' then update public.messages set removed_at = now(), removed_reason = p_reason where id = r.target_id;
    elsif r.target_kind = 'post' then update public.community_posts set removed_at = now(), removed_reason = p_reason where id = r.target_id;
    elsif r.target_kind = 'comment' then update public.post_comments set removed_at = now(), removed_reason = p_reason where id = r.target_id;
    else raise exception 'nothing to remove for a person report' using errcode = '22023'; end if;
  elsif p_decision = 'suspend' then
    insert into public.community_suspensions(person_id, reason, decided_by) values (r.target_person, p_reason, me)
    on conflict (person_id) do update set reason = excluded.reason, until = null, decided_by = me, created_at = now();
  elsif p_decision not in ('warn', 'dismiss') then raise exception 'bad decision' using errcode = '22023';
  end if;
  update public.moderation_reports set status = case when p_decision = 'dismiss' then 'dismissed' else 'actioned' end,
         decision = p_decision, decision_reason = btrim(p_reason), decided_by = me, decided_at = now() where id = p_report;
end $$;
create function app.lift_suspension(p_person uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  delete from public.community_suspensions where person_id = p_person;
end $$;

-- Calls -----------------------------------------------------------------------------------------------------------
create function app.expire_calls() returns void language sql security definer set search_path = public, pg_temp as $$
  update public.call_sessions set status = 'missed', ended_at = now() where status = 'ringing' and created_at < now() - interval '45 seconds';
  update public.call_sessions set status = 'ended', ended_at = now() where status = 'active' and answered_at < now() - interval '4 hours';
  delete from public.call_signals s using public.call_sessions c where c.id = s.call_id and c.status not in ('ringing', 'active');
$$;
create function app.start_call(p_conv uuid, p_media text) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.require_community('community.calls'); other uuid; n bigint; id uuid;
begin
  perform app.expire_calls();
  if not app.is_conv_member(p_conv) or (select kind from public.conversations where conversations.id = p_conv) <> 'direct' then
    raise exception 'calls are 1:1 in a direct chat' using errcode = '42501'; end if;
  select person_id into other from public.conversation_members where conversation_id = p_conv and person_id <> me;
  if app.is_blocked_between(me, other) or not app.are_connected(me, other) or not app.community_can(other, 'community.calls')
     or (select call_permission from public.community_profiles where person_id = other) <> 'connections' then
    raise exception 'this person does not accept calls' using errcode = '42501'; end if;
  if exists (select 1 from public.call_sessions where status in ('ringing', 'active') and (caller in (me, other) or callee in (me, other))) then
    raise exception 'busy' using errcode = '55006'; end if;
  select count(*) into n from public.call_sessions where caller = me and created_at > now() - interval '1 hour';
  perform app.rate_limit(n, 20);
  insert into public.call_sessions(conversation_id, caller, callee, media) values (p_conv, me, other, p_media) returning call_sessions.id into id;
  return id;
end $$;
create function app.answer_call(p_call uuid, p_accept boolean) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id();
begin
  perform app.expire_calls();
  update public.call_sessions set status = case when p_accept then 'active' else 'declined' end,
         answered_at = case when p_accept then now() end, ended_at = case when p_accept then null else now() end,
         ended_by = case when p_accept then null else me end
   where id = p_call and callee = me and status = 'ringing'
     and (not p_accept or app.community_can(me, 'community.calls'));
  if not found then raise exception 'call is not ringing' using errcode = 'P0002'; end if;
end $$;
create function app.end_call(p_call uuid, p_failed boolean default false) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id();
begin
  update public.call_sessions set status = case when p_failed then 'failed' when status = 'ringing' and caller = me then 'missed' else 'ended' end,
         ended_at = now(), ended_by = me
   where id = p_call and me in (caller, callee) and status in ('ringing', 'active');
  delete from public.call_signals where call_id = p_call;
end $$;
create function app.send_signal(p_call uuid, p_kind text, p_payload jsonb) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); c public.call_sessions; n bigint;
begin
  select * into c from public.call_sessions where id = p_call;
  if not found or me not in (c.caller, c.callee) or c.status not in ('ringing', 'active') then
    raise exception 'call not open' using errcode = '42501'; end if;
  select count(*) into n from public.call_signals where call_id = p_call and from_person = me;
  perform app.rate_limit(n, 200);
  insert into public.call_signals(call_id, from_person, to_person, kind, payload)
  values (p_call, me, case when me = c.caller then c.callee else c.caller end, p_kind, p_payload);
end $$;
create function app.call_state(p_call uuid, p_after bigint default 0)
returns table (status text, media text, caller uuid, callee uuid, other_name text, signal_id bigint, signal_kind text, payload jsonb)
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); c public.call_sessions;
begin
  perform app.expire_calls();
  select * into c from public.call_sessions cs where cs.id = p_call and me in (cs.caller, cs.callee);
  if not found then return; end if;
  return query select c.status, c.media, c.caller, c.callee,
    (select display_name from public.community_profiles where person_id = case when me = c.caller then c.callee else c.caller end),
    s.id, s.kind, s.payload
    from (select 1) one left join public.call_signals s on s.call_id = c.id and s.to_person = me and s.id > p_after
   order by s.id;
end $$;
create function app.incoming_call() returns table (id uuid, media text, caller uuid, caller_name text)
language sql security definer set search_path = public, pg_temp as $$
  select app.expire_calls();
  select c.id, c.media, c.caller, cp.display_name from public.call_sessions c join public.community_profiles cp on cp.person_id = c.caller
   where c.callee = app.current_person_id() and c.status = 'ringing' order by c.created_at desc limit 1
$$;

-- Temple Contact ------------------------------------------------------------------------------------------------------
-- Callable by visitors (anon) through the server only; p_ip_hash is computed server-side. Returns the reference code.
create function app.submit_temple_contact(p_slug text, p_topic text, p_message text, p_name text, p_phone text, p_ip_hash text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare t uuid; n bigint; code text;
begin
  select id into t from public.temples where slug = p_slug;
  if t is null or not app.is_verified_temple(t) then raise exception 'temple not public' using errcode = '55000'; end if;
  select count(*) into n from public.temple_contact_threads where sender_ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
  perform app.rate_limit(n, 5);
  select count(*) into n from public.temple_contact_threads where temple_id = t and created_at > now() - interval '1 hour';
  perform app.rate_limit(n, 60);
  code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
  insert into public.temple_contact_threads(temple_id, ref_code, topic, message, sender_name, sender_phone, sender_person_id, sender_ip_hash)
  values (t, code, p_topic, btrim(p_message), nullif(btrim(p_name), ''), nullif(regexp_replace(coalesce(p_phone, ''), '\s', '', 'g'), ''),
          app.current_person_id(), p_ip_hash);
  return code;
end $$;
create function app.contact_update(p_thread uuid, p_temple uuid, p_action text, p_text text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); old text;
begin
  if not app.has_permission(p_temple, 'contact_inbox.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  select status into old from public.temple_contact_threads where temple_id = p_temple and id = p_thread for update;
  if not found then raise exception 'thread not found' using errcode = 'P0002'; end if;
  if p_action = 'assign' and old in ('NEW', 'ASSIGNED') then
    update public.temple_contact_threads set status = 'ASSIGNED', assigned_to = me where temple_id = p_temple and id = p_thread;
  elsif p_action = 'reply' and old in ('NEW', 'ASSIGNED', 'REPLIED') and char_length(btrim(coalesce(p_text, ''))) between 1 and 2000 then
    update public.temple_contact_threads set status = 'REPLIED', reply = btrim(p_text), replied_by = me, replied_at = now(),
           assigned_to = coalesce(assigned_to, me) where temple_id = p_temple and id = p_thread;
  elsif p_action = 'close' and old <> 'CLOSED' then
    update public.temple_contact_threads set status = 'CLOSED' where temple_id = p_temple and id = p_thread;
  else raise exception 'illegal contact transition % from %', p_action, old using errcode = '23514';
  end if;
  perform app.write_audit(p_temple, 'contact.' || p_action, 'temple_contact_threads', p_thread, old, null);
end $$;

-- RLS (reads only; writes via the functions above) ------------------------------------------------------------------------
create policy cp_self on public.community_profiles for select to authenticated using (person_id = app.current_person_id());
create policy cs_self on public.community_suspensions for select to authenticated using (person_id = app.current_person_id() or app.is_platform_admin());
create policy conn_party on public.connections for select to authenticated using (app.current_person_id() in (requester, addressee));
create policy blocks_self on public.person_blocks for select to authenticated using (blocker = app.current_person_id());
create policy mutes_self on public.person_mutes for select to authenticated using (muter = app.current_person_id());
create policy conv_member on public.conversations for select to authenticated using (app.is_conv_member(id));
create policy convm_member on public.conversation_members for select to authenticated using (app.is_conv_member(conversation_id));
create policy msg_member on public.messages for select to authenticated using (app.is_conv_member(conversation_id) and removed_at is null);
create policy post_visible on public.community_posts for select to authenticated using (app.can_see_post(community_posts));
create policy comment_visible on public.post_comments for select to authenticated using (
  removed_at is null and not app.is_blocked_between(app.current_person_id(), author)
  and exists (select 1 from public.community_posts p where p.id = post_id and app.can_see_post(p)));
create policy report_own on public.moderation_reports for select to authenticated using (reporter = app.current_person_id() or app.is_platform_admin());
create policy call_party on public.call_sessions for select to authenticated using (app.current_person_id() in (caller, callee));
create policy signal_to_me on public.call_signals for select to authenticated using (to_person = app.current_person_id());
create policy contact_inbox on public.temple_contact_threads for select to authenticated using (
  app.has_permission(temple_id, 'contact_inbox.manage', 'T') or sender_person_id = app.current_person_id());

grant select on public.community_profiles, public.community_suspensions, public.connections, public.person_blocks, public.person_mutes,
  public.conversations, public.conversation_members, public.messages, public.community_posts, public.post_comments,
  public.moderation_reports, public.call_sessions, public.call_signals, public.temple_contact_threads to authenticated;

revoke all on function app.community_can(uuid, text), app.is_blocked_between(uuid, uuid), app.are_connected(uuid, uuid),
  app.is_conv_member(uuid), app.require_community(text), app.can_see_post(public.community_posts), app.expire_calls() from public;
grant execute on function app.community_can(uuid, text), app.is_blocked_between(uuid, uuid), app.are_connected(uuid, uuid),
  app.is_conv_member(uuid), app.can_see_post(public.community_posts) to authenticated;
grant execute on function
  app.join_temple_community(uuid), app.leave_temple_community(uuid),
  app.save_community_profile(text, int, text, text[], text[], text, text, text, boolean, text), app.profile_card(uuid), app.search_people(text),
  app.request_connection(uuid), app.respond_connection(uuid, boolean), app.remove_connection(uuid),
  app.block_person(uuid), app.unblock_person(uuid), app.set_mute(uuid, boolean),
  app.open_direct_conversation(uuid), app.create_group(text, uuid[]), app.leave_conversation(uuid), app.send_message(uuid, text),
  app.mark_read(uuid), app.my_conversations(), app.conversation_messages(uuid, timestamptz),
  app.create_post(text, text), app.delete_own_post(uuid), app.comment_post(uuid, text), app.community_feed(timestamptz),
  app.post_comments_for(uuid), app.report_content(text, uuid, text, text), app.moderation_queue(), app.decide_report(uuid, text, text),
  app.lift_suspension(uuid), app.start_call(uuid, text), app.answer_call(uuid, boolean), app.end_call(uuid, boolean),
  app.send_signal(uuid, text, jsonb), app.call_state(uuid, bigint), app.incoming_call(),
  app.contact_update(uuid, uuid, text, text), app.submit_temple_contact(text, text, text, text, text, text) to authenticated;
grant usage on schema app to anon;
grant execute on function app.submit_temple_contact(text, text, text, text, text, text), app.current_person_id(),
  app.is_verified_temple(uuid), app.rate_limit(bigint, int) to anon;


-- ===== 0009_monastic_events.sql =====
-- 0009 Monastic life + events (v1 subset of AVAILABILITY_SPEC, SCHEDULE_INVITATION_SPEC, EVENT_BOSS_QUEST_SPEC, SCORING_SPEC):
--  * schedule_entries become per-person calendar rows with status/venue/source (SI §2); availability_manual gains
--    valid_from / set_by_kind / reason / truncated_at; writes only via app.set_availability (AV manual rules)
--  * app.resolve_availability (AV priority order, UNKNOWN first-class), board (T: full) and coarse view (C: FREE/BUSY/UNKNOWN)
--  * invitations (กิจนิมนต์) lifecycle with human-only confirm (invitation.confirm, restricted) + rule-based suggestion sma-v1
--    (hard constraints HC-1..HC-4; soft score is audit-only and never shown as a ranking)
--  * events with staffing targets, participants (volunteer sign-up + approval), event tasks (quests) and derived readiness
--  * monastic activity score: written only by the system on verified completion (daily cap 30, self-created = 0),
--    practice days and My Day read models. No ranking, no comparison, no combined ledger view.
-- Not in v1 (stated in docs/v1/DECISIONS.md): skills/HC-6, rite declines/HC-5, vehicles/HC-7, meal headcount, recurrence,
-- ai_drafts, achievements, check-out, travel-time provider.

-- helper: does any of my roles grant this code with a scope string containing the letter (e.g. 'C' coarse, 'P' public)?
create function app.has_scope_letter(p_temple uuid, p_code text, p_letter text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.memberships m
                 join public.membership_roles mr on mr.temple_id = m.temple_id and mr.membership_id = m.id
                 join public.role_permissions rp on rp.role_code = mr.role_code and rp.permission_code = p_code
                 where m.temple_id = p_temple and m.person_id = app.current_person_id() and m.status = 'active'
                   and (rp.condition is null or rp.condition not in ('delegated', 'explicit_grant'))
                   and rp.scope like '%' || p_letter || '%')
$$;
create function app.is_monastic(p_temple uuid, p_person uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.memberships where temple_id = p_temple and person_id = p_person and status = 'active' and monastic_kind <> 'none')
$$;

-- Schedule entries (SI §2) ---------------------------------------------------------------------------------
alter table public.schedule_entries drop constraint schedule_entries_kind_check;
alter table public.schedule_entries
  add constraint schedule_entries_kind_check check (kind in ('invitation','ceremony','teaching','class','duty','personal','travel','meal','leave','meeting','other')),
  add column person_id uuid references public.persons(id),
  add column status text not null default 'CONFIRMED' check (status in ('PROPOSED','CONFIRMED','CANCELLED')),
  add column venue_kind text not null default 'UNKNOWN' check (venue_kind in ('IN_TEMPLE','OFF_SITE','UNKNOWN')),
  add column venue_text text,
  add column source_type text not null default 'manual' check (source_type in ('manual','invitation','event')),
  add column source_id uuid,
  add column leg text check (leg in ('OUT','BACK')),
  add column cancel_reason text,
  add column cancelled_at timestamptz,
  add constraint schedule_entries_max_len check (ends_at - starts_at <= interval '14 days'),
  add constraint schedule_entries_offsite check (kind not in ('invitation','travel') or venue_kind = 'OFF_SITE'),
  add foreign key (temple_id, person_id) references public.memberships(temple_id, person_id);
create unique index schedule_entries_source_once on public.schedule_entries (temple_id, source_type, source_id, person_id, kind, coalesce(leg, ''))
  where source_id is not null;
create index on public.schedule_entries (temple_id, person_id, starts_at);
drop policy sched_sel on public.schedule_entries;
create policy sched_sel on public.schedule_entries for select to authenticated using (
  app.is_member(temple_id) and (
    app.has_permission(temple_id, 'schedule.view', 'T')
    or (visibility = 'public' and app.has_permission(temple_id, 'schedule.view'))
    or ((owner_person_id = app.current_person_id() or person_id = app.current_person_id()) and app.has_permission(temple_id, 'schedule.view'))));
-- source-owned rows (invitation/event) change only through their source commands (SE-4)
create function app.schedule_source_guard() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.source_write', true), '') <> 'on' and
     ((tg_op = 'INSERT' and new.source_type <> 'manual') or (tg_op in ('UPDATE','DELETE') and old.source_type <> 'manual')) then
    raise exception 'schedule entry is owned by its source (%), change it there', coalesce(old.source_type, new.source_type) using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger schedule_source_guard before insert or update or delete on public.schedule_entries for each row execute function app.schedule_source_guard();

-- Availability (AV) ---------------------------------------------------------------------------------------------
alter table public.availability_manual
  add column valid_from timestamptz not null default now(),
  add column set_by_kind text not null default 'SELF' check (set_by_kind in ('SELF','ADMIN')),
  add column reason_code text check (reason_code in ('SICK','RETREAT','OTHER')),
  add column truncated_at timestamptz,
  add constraint availability_window check (valid_until > valid_from);
alter table public.checkins add column checked_out_at timestamptz;
revoke insert on public.availability_manual from authenticated;   -- writes only via app.set_availability
drop policy avail_ins on public.availability_manual;

create function app.set_availability(p_temple uuid, p_person uuid, p_state text, p_valid_from timestamptz, p_valid_until timestamptz, p_reason text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); kind text; id uuid; f timestamptz := coalesce(p_valid_from, now());
begin
  if p_valid_until is null then raise exception 'VALID_UNTIL_REQUIRED' using errcode = '23514'; end if;
  if p_valid_until <= now() or p_valid_until <= f then raise exception 'VALID_UNTIL_IN_PAST' using errcode = '23514'; end if;
  if p_state not in ('UNAVAILABLE','PERSONAL','REST','AVAILABLE') then raise exception 'CALENDAR_STATE_NOT_SETTABLE' using errcode = '22023'; end if;
  if not app.is_monastic(p_temple, p_person) then raise exception 'NOT_MONASTIC' using errcode = '22023'; end if;
  if p_person = me then
    if not app.has_permission(p_temple, 'availability.set_self') then raise exception 'not allowed' using errcode = '42501'; end if;
    kind := 'SELF';
  else
    if not app.has_permission(p_temple, 'availability.set_others', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
    if p_state <> 'UNAVAILABLE' then raise exception 'FORBIDDEN_STATE_FOR_ACTOR' using errcode = '42501'; end if;
    kind := 'ADMIN';
  end if;
  if (p_state <> 'UNAVAILABLE' and p_valid_until - f > interval '24 hours') or p_valid_until - f > interval '120 days' then
    raise exception 'VALID_UNTIL_TOO_FAR' using errcode = '23514'; end if;
  if kind = 'SELF' then   -- supersession (AV reading B): a new SELF row truncates my overlapping SELF rows
    update public.availability_manual set truncated_at = f
     where temple_id = p_temple and person_id = p_person and set_by_kind = 'SELF' and truncated_at is null
       and valid_from < p_valid_until and valid_until > f;
  end if;
  insert into public.availability_manual(temple_id, person_id, state, valid_from, valid_until, set_by_person_id, set_by_kind, reason_code)
  values (p_temple, p_person, p_state, f, p_valid_until, me, kind, p_reason) returning availability_manual.id into id;
  perform app.write_audit(p_temple, 'availability.set', 'availability_manual', id, null, p_state);
  return id;
end $$;
create function app.clear_availability(p_temple uuid, p_row uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.availability_manual;
begin
  select * into r from public.availability_manual where temple_id = p_temple and id = p_row;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  if not ((r.person_id = app.current_person_id() and r.set_by_kind = 'SELF') or app.has_permission(p_temple, 'availability.set_others', 'T')) then
    raise exception 'not allowed' using errcode = '42501'; end if;
  update public.availability_manual set truncated_at = least(coalesce(truncated_at, now()), now()) where temple_id = p_temple and id = p_row;
end $$;

-- Resolver: no caller checks (internal); exposed only through the gated functions below.
create function app.resolve_availability(p_temple uuid, p_person uuid, p_at timestamptz)
returns table (state text, location text, reason text, until_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare m record; e record; c record; loc text;
begin
  if not app.is_monastic(p_temple, p_person) then return; end if;
  select * into m from public.availability_manual a where a.temple_id = p_temple and a.person_id = p_person and a.state = 'UNAVAILABLE'
     and a.valid_from <= p_at and p_at < least(a.valid_until, coalesce(a.truncated_at, 'infinity')) order by a.created_at desc limit 1;
  if found then return query select 'UNAVAILABLE', 'UNKNOWN', 'MANUAL:' || coalesce(m.reason_code, 'OTHER'), m.valid_until; return; end if;
  select s.*, case s.kind when 'ceremony' then 2 when 'invitation' then 3 when 'travel' then 4
                          when 'teaching' then 5 when 'class' then 5 when 'duty' then 5 when 'personal' then 6 end as pr
    into e from public.schedule_entries s
   where s.temple_id = p_temple and s.person_id = p_person and s.status = 'CONFIRMED'
     and s.kind in ('ceremony','invitation','travel','teaching','class','duty','personal') and s.starts_at <= p_at and p_at < s.ends_at
   order by pr, s.starts_at, s.id limit 1;
  if found then
    loc := case when e.kind in ('invitation','travel') then 'OFF_SITE' else e.venue_kind end;
    return query select case e.pr when 2 then 'CEREMONY' when 3 then 'ON_INVITATION' when 4 then 'TRAVELING' when 5 then 'TEACHING' else 'PERSONAL' end,
      loc, 'CALENDAR:' || e.kind, e.ends_at;
    return;
  end if;
  select * into m from public.availability_manual a where a.temple_id = p_temple and a.person_id = p_person and a.state in ('PERSONAL','REST','AVAILABLE')
     and a.valid_from <= p_at and p_at < least(a.valid_until, coalesce(a.truncated_at, 'infinity'))
   order by case a.state when 'PERSONAL' then 1 when 'REST' then 2 else 3 end, a.created_at desc limit 1;
  if found then return query select m.state, 'UNKNOWN', 'MANUAL', m.valid_until; return; end if;
  select * into c from public.checkins k where k.temple_id = p_temple and k.person_id = p_person and k.checked_out_at is null
     and k.checked_in_at <= p_at and p_at < k.checked_in_at + interval '720 minutes' order by k.checked_in_at desc limit 1;
  if found then return query select 'IN_TEMPLE', 'IN_TEMPLE', 'CHECKIN', c.checked_in_at + interval '720 minutes'; return; end if;
  return query select 'UNKNOWN', 'UNKNOWN', 'NO_SIGNAL', null::timestamptz;
end $$;
revoke all on function app.resolve_availability(uuid, uuid, timestamptz) from public;

create function app.my_availability(p_temple uuid) returns table (state text, location text, reason text, until_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select * from app.resolve_availability(p_temple, app.current_person_id(), now()) where app.is_member(p_temple)
$$;
-- Full board (availability.view T): per monk state + reason + counts are derived by the caller from these rows.
create function app.availability_board(p_temple uuid, p_at timestamptz default now())
returns table (person_id uuid, display_name text, monastic_kind text, state text, location text, reason text, until_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.has_permission(p_temple, 'availability.view', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select m.person_id, p.display_name, m.monastic_kind, r.state, r.location, r.reason, r.until_at
    from public.memberships m join public.persons p on p.id = m.person_id
    cross join lateral app.resolve_availability(p_temple, m.person_id, p_at) r
   where m.temple_id = p_temple and m.status = 'active' and m.monastic_kind <> 'none' order by p.display_name;
end $$;
-- Coarse view (availability.view C): FREE / BUSY / UNKNOWN only; no reasons, no location.
create function app.availability_coarse(p_temple uuid)
returns table (person_id uuid, display_name text, coarse text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not (app.has_permission(p_temple, 'availability.view', 'T') or app.has_scope_letter(p_temple, 'availability.view', 'C')) then
    raise exception 'not allowed' using errcode = '42501'; end if;
  return query select m.person_id, p.display_name,
    case when r.state = 'AVAILABLE' then 'FREE' when r.state in ('UNKNOWN', 'IN_TEMPLE') then 'UNKNOWN' else 'BUSY' end
    from public.memberships m join public.persons p on p.id = m.person_id
    cross join lateral app.resolve_availability(p_temple, m.person_id, now()) r
   where m.temple_id = p_temple and m.status = 'active' and m.monastic_kind <> 'none' order by p.display_name;
end $$;
create function app.check_in(p_temple uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not (app.has_permission(p_temple, 'availability.set_self') or app.has_permission(p_temple, 'presence.set_self')) then
    raise exception 'not allowed' using errcode = '42501'; end if;
  update public.checkins set checked_out_at = now() where temple_id = p_temple and person_id = app.current_person_id() and checked_out_at is null;
  insert into public.checkins(temple_id, person_id, source) values (p_temple, app.current_person_id(), 'manual');
end $$;

-- Invitations (กิจนิมนต์) ------------------------------------------------------------------------------------------
create table public.rite_types (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  name_th text not null check (char_length(btrim(name_th)) between 2 and 80),
  is_routine boolean not null default true,
  requires_lead boolean not null default false,
  default_duration_min int not null default 60 check (default_duration_min between 10 and 720),
  primary key (temple_id, id)
);
create table public.invitations (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  version int not null default 1,
  status text not null default 'RECEIVED' check (status in ('RECEIVED','REVIEWING','TEAM_PROPOSED','CONFIRMED','IN_PROGRESS','COMPLETED','DECLINED','CANCELLED')),
  host_name text not null check (char_length(btrim(host_name)) between 2 and 120),
  host_phone text check (host_phone ~ '^[0-9+ -]{6,20}$'),
  host_relation text check (char_length(host_relation) <= 80),
  rite_type_id uuid not null,
  venue_text text not null check (char_length(btrim(venue_text)) between 2 and 300),
  starts_at timestamptz not null,
  duration_min int not null check (duration_min between 10 and 720),
  monks_required int not null check (monks_required between 1 and 50),
  transport text not null default 'HOST_PROVIDES' check (transport in ('HOST_PROVIDES','TEMPLE_VEHICLE','OTHER')),
  travel_out_min int check (travel_out_min between 0 and 600),
  travel_back_min int check (travel_back_min between 0 and 600),
  received_via text not null default 'phone' check (received_via in ('phone','line','walk_in','web_form','temple_contact')),
  note text check (char_length(note) <= 1000),
  decline_reason text check (decline_reason in ('DATE_CONFLICT','NOT_ENOUGH_MONKS','OUT_OF_AREA','RITE_NOT_SUITABLE','OTHER')),
  cancel_reason text,
  confirmed_by uuid references public.persons(id),
  confirmed_at timestamptz,
  created_by uuid not null references public.persons(id),
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  foreign key (temple_id, rite_type_id) references public.rite_types(temple_id, id)
);
create table public.invitation_team (
  temple_id uuid not null references public.temples(id),
  invitation_id uuid not null,
  person_id uuid not null references public.persons(id),
  role text not null default 'MEMBER' check (role in ('LEAD','MEMBER')),
  monk_response text not null default 'PENDING' check (monk_response in ('PENDING','ACKNOWLEDGED','RELEASE_REQUESTED')),
  primary key (temple_id, invitation_id, person_id),
  foreign key (temple_id, invitation_id) references public.invitations(temple_id, id),
  foreign key (temple_id, person_id) references public.memberships(temple_id, person_id)
);

create function app.inv_window(i public.invitations, p_buffer int default 30)
returns table (block_start timestamptz, block_end timestamptz, travel_known boolean) language sql immutable as $$
  select i.starts_at - make_interval(mins => coalesce(i.travel_out_min, 0)),
         i.starts_at + make_interval(mins => i.duration_min + coalesce(i.travel_back_min, 0) + case when i.travel_back_min is null then 0 else p_buffer end),
         i.travel_out_min is not null and i.travel_back_min is not null
$$;
-- Hard-constraint violations for one monk (HC-1..HC-4). Empty array = eligible.
create function app.inv_violations(p_temple uuid, p_inv uuid, p_person uuid) returns text[]
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare i public.invitations; w record; v text[] := '{}'; tz text;
begin
  select * into i from public.invitations where temple_id = p_temple and id = p_inv;
  select * into w from app.inv_window(i);
  select coalesce(t.tz, 'Asia/Bangkok') into tz from public.temples t where t.id = p_temple;
  if not exists (select 1 from public.memberships where temple_id = p_temple and person_id = p_person and status = 'active' and monastic_kind = 'bhikkhu') then
    return array['NOT_ELIGIBLE']; end if;
  if exists (select 1 from public.availability_manual a where a.temple_id = p_temple and a.person_id = p_person
             and a.state in ('UNAVAILABLE','PERSONAL','REST') and a.valid_from < w.block_end
             and least(a.valid_until, coalesce(a.truncated_at, 'infinity')) > w.block_start) then v := v || 'MANUAL_BLOCK'::text; end if;
  if exists (select 1 from public.schedule_entries s where s.temple_id = p_temple and s.person_id = p_person and s.status = 'CONFIRMED'
             and not (s.source_type = 'invitation' and s.source_id = p_inv)
             and s.kind in ('invitation','ceremony','teaching','class','duty','personal','travel')
             and s.starts_at < w.block_end
             and s.ends_at + case when s.kind in ('invitation','travel') then interval '30 minutes' else interval '0' end > w.block_start) then
    v := v || 'COMMITMENT_OVERLAP'::text; end if;
  if (select count(*) from public.invitation_team t join public.invitations x on x.temple_id = t.temple_id and x.id = t.invitation_id
      where t.temple_id = p_temple and t.person_id = p_person and x.id <> p_inv and x.status in ('CONFIRMED','IN_PROGRESS','COMPLETED')
        and (x.starts_at at time zone tz)::date = (i.starts_at at time zone tz)::date) >= 2 then v := v || 'DAILY_LIMIT'::text; end if;
  return v;
end $$;

-- sma-v1 suggestion (read-only; a human copies it into propose_team). Score is audit-only.
create function app.suggest_team(p_temple uuid, p_inv uuid)
returns table (person_id uuid, display_name text, list text, violations text[], warnings text[], score numeric)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare i public.invitations; w record;
begin
  if not app.has_permission(p_temple, 'invitation.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into i from public.invitations where temple_id = p_temple and id = p_inv;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  select * into w from app.inv_window(i);
  return query
  with cand as (
    select m.person_id, p.display_name, app.inv_violations(p_temple, p_inv, m.person_id) as v,
      exists (select 1 from public.availability_manual a where a.temple_id = p_temple and a.person_id = m.person_id and a.state = 'AVAILABLE'
              and a.valid_from <= w.block_start and least(a.valid_until, coalesce(a.truncated_at, 'infinity')) >= w.block_end) as opted,
      (select count(*) from public.invitation_team t join public.invitations x on x.temple_id = t.temple_id and x.id = t.invitation_id
        where t.temple_id = p_temple and t.person_id = m.person_id and x.status in ('CONFIRMED','IN_PROGRESS','COMPLETED')
          and x.starts_at between i.starts_at - interval '30 days' and i.starts_at) as n30,
      coalesce((select extract(epoch from sum(least(s.ends_at, (i.starts_at::date + 1)::timestamptz) - greatest(s.starts_at, i.starts_at::date::timestamptz))) / 3600
        from public.schedule_entries s where s.temple_id = p_temple and s.person_id = m.person_id and s.status = 'CONFIRMED'
          and s.starts_at < (i.starts_at::date + 1)::timestamptz and s.ends_at > i.starts_at::date::timestamptz), 0) as hours_today,
      exists (select 1 from public.invitation_team t join public.invitations x on x.temple_id = t.temple_id and x.id = t.invitation_id
        where t.temple_id = p_temple and t.person_id = m.person_id and x.status = 'COMPLETED' and x.host_name = i.host_name
          and x.starts_at > i.starts_at - interval '365 days') as same_host
    from public.memberships m join public.persons p on p.id = m.person_id
    where m.temple_id = p_temple and m.status = 'active' and m.monastic_kind <> 'none')
  select c.person_id, c.display_name,
    case when cardinality(c.v) > 0 then 'excluded' when c.opted then 'suggested' else 'needs_confirmation' end,
    c.v,
    array_remove(array[case when not c.opted and cardinality(c.v) = 0 then 'NO_AVAILABILITY_SIGNAL' end,
                       case when not w.travel_known then 'RETURN_BUFFER_UNKNOWN' end], null),
    round(30 * (1 - least(c.n30, 6) / 6.0) + 25 + case when c.opted then 15 else 0 end
          + 15 * (1 - least(c.hours_today, 8) / 8.0) + case when c.same_host then 5 else 0 end, 2)
  from cand c
  order by case when cardinality(c.v) > 0 then 3 when c.opted then 1 else 2 end, 6 desc, c.display_name;
end $$;

create function app.create_invitation(p_temple uuid, p_host_name text, p_host_phone text, p_host_relation text, p_rite uuid, p_venue text,
  p_starts_at timestamptz, p_duration int, p_monks int, p_transport text, p_out int, p_back int, p_via text, p_note text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid;
begin
  if not app.has_permission(p_temple, 'invitation.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_starts_at <= now() then raise exception 'starts_at must be in the future' using errcode = '23514'; end if;
  insert into public.invitations(temple_id, host_name, host_phone, host_relation, rite_type_id, venue_text, starts_at, duration_min, monks_required,
    transport, travel_out_min, travel_back_min, received_via, note, created_by)
  values (p_temple, btrim(p_host_name), nullif(btrim(p_host_phone), ''), nullif(btrim(p_host_relation), ''), p_rite, btrim(p_venue), p_starts_at,
    p_duration, p_monks, coalesce(p_transport, 'HOST_PROVIDES'), p_out, p_back, coalesce(p_via, 'phone'), nullif(btrim(p_note), ''), app.current_person_id())
  returning invitations.id into id;
  perform app.write_audit(p_temple, 'invitation.received', 'invitations', id, null, 'RECEIVED');
  return id;
end $$;

-- Single entry point for every invitation transition (SI §3). Returns the new version.
create function app.invitation_transition(p_temple uuid, p_inv uuid, p_version int, p_action text, p_team uuid[] default null,
  p_lead uuid default null, p_reason text default null, p_ack_warnings boolean default false)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare i public.invitations; me uuid := app.current_person_id(); nxt text; p uuid; bad text[]; w record; rt public.rite_types;
begin
  select * into i from public.invitations where temple_id = p_temple and id = p_inv for update;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  if i.version <> p_version then raise exception 'STALE_PROPOSAL' using errcode = '40001'; end if;
  select * into rt from public.rite_types where temple_id = p_temple and id = i.rite_type_id;
  if p_action in ('start_review','propose_team','revise_team','start','complete') then
    if not app.has_permission(p_temple, 'invitation.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  elsif p_action in ('confirm','decline','cancel') then
    if not app.has_permission(p_temple, 'invitation.confirm', 'T') then raise exception 'HUMAN_CONFIRM_REQUIRED: invitation.confirm needed' using errcode = '42501'; end if;
  else raise exception 'ILLEGAL_TRANSITION' using errcode = '23514';
  end if;
  nxt := case
    when p_action = 'start_review' and i.status = 'RECEIVED' then 'REVIEWING'
    when p_action = 'propose_team' and i.status = 'REVIEWING' then 'TEAM_PROPOSED'
    when p_action = 'revise_team' and i.status = 'TEAM_PROPOSED' then 'REVIEWING'
    when p_action = 'confirm' and i.status = 'TEAM_PROPOSED' then 'CONFIRMED'
    when p_action = 'start' and i.status = 'CONFIRMED' then 'IN_PROGRESS'
    when p_action = 'complete' and i.status in ('CONFIRMED','IN_PROGRESS') and now() >= i.starts_at then 'COMPLETED'
    when p_action = 'decline' and i.status in ('RECEIVED','REVIEWING','TEAM_PROPOSED') then 'DECLINED'
    when p_action = 'cancel' and i.status in ('CONFIRMED','IN_PROGRESS') then 'CANCELLED' end;
  if nxt is null then raise exception 'ILLEGAL_TRANSITION % from %', p_action, i.status using errcode = '23514'; end if;

  if p_action = 'propose_team' then
    if p_team is null or cardinality(p_team) <> i.monks_required then raise exception 'TEAM_SIZE_MISMATCH' using errcode = '23514'; end if;
    if rt.requires_lead and (p_lead is null or not p_lead = any (p_team)) then raise exception 'LEAD_REQUIRED' using errcode = '23514'; end if;
    delete from public.invitation_team where temple_id = p_temple and invitation_id = p_inv;
    foreach p in array p_team loop
      bad := app.inv_violations(p_temple, p_inv, p);
      if cardinality(bad) > 0 then raise exception 'HARD_CONSTRAINT %: %', p, array_to_string(bad, ',') using errcode = '23514'; end if;
      insert into public.invitation_team(temple_id, invitation_id, person_id, role) values (p_temple, p_inv, p, case when p = p_lead then 'LEAD' else 'MEMBER' end);
    end loop;
  elsif p_action = 'revise_team' then
    delete from public.invitation_team where temple_id = p_temple and invitation_id = p_inv;
  elsif p_action = 'confirm' then
    if i.starts_at <= now() then raise exception 'starts_at passed' using errcode = '23514'; end if;
    if (select count(*) from public.invitation_team where temple_id = p_temple and invitation_id = p_inv) <> i.monks_required then
      raise exception 'TEAM_SIZE_MISMATCH' using errcode = '23514'; end if;
    for p in select person_id from public.invitation_team where temple_id = p_temple and invitation_id = p_inv loop
      bad := app.inv_violations(p_temple, p_inv, p);
      if cardinality(bad) > 0 then raise exception 'HARD_CONSTRAINT %: %', p, array_to_string(bad, ',') using errcode = '23514'; end if;
    end loop;
    select * into w from app.inv_window(i);
    if not p_ack_warnings and (not w.travel_known or exists (select 1 from app.suggest_team(p_temple, p_inv) s
        join public.invitation_team t on t.person_id = s.person_id and t.temple_id = p_temple and t.invitation_id = p_inv where s.list = 'needs_confirmation')) then
      raise exception 'WARNINGS_NOT_ACKNOWLEDGED' using errcode = '23514'; end if;
    perform set_config('app.source_write', 'on', true);
    insert into public.schedule_entries(temple_id, kind, title, person_id, visibility, starts_at, ends_at, created_by, venue_kind, venue_text, source_type, source_id, leg)
    select p_temple, x.kind, x.title, t.person_id, 'private', x.s, x.e, me, 'OFF_SITE', i.venue_text, 'invitation', p_inv, x.leg
      from public.invitation_team t cross join lateral (values
        ('travel', 'เดินทางไปกิจนิมนต์', i.starts_at - make_interval(mins => coalesce(i.travel_out_min, 0)), i.starts_at, 'OUT'),
        ('invitation', 'กิจนิมนต์: ' || rt.name_th, i.starts_at, i.starts_at + make_interval(mins => i.duration_min), null),
        ('travel', 'เดินทางกลับวัด', i.starts_at + make_interval(mins => i.duration_min),
                   i.starts_at + make_interval(mins => i.duration_min + coalesce(i.travel_back_min, 0)), 'BACK')) x(kind, title, s, e, leg)
     where t.temple_id = p_temple and t.invitation_id = p_inv and x.e > x.s;
    perform set_config('app.source_write', 'off', true);
    update public.invitations set confirmed_by = me, confirmed_at = now() where temple_id = p_temple and id = p_inv;
  elsif p_action = 'decline' then
    if p_reason not in ('DATE_CONFLICT','NOT_ENOUGH_MONKS','OUT_OF_AREA','RITE_NOT_SUITABLE','OTHER') then raise exception 'reason code required' using errcode = '23514'; end if;
    update public.invitations set decline_reason = p_reason where temple_id = p_temple and id = p_inv;
  elsif p_action = 'cancel' then
    if coalesce(btrim(p_reason), '') = '' then raise exception 'reason required' using errcode = '23514'; end if;
    perform set_config('app.source_write', 'on', true);
    update public.schedule_entries set status = 'CANCELLED', cancel_reason = p_reason, cancelled_at = now()
     where temple_id = p_temple and source_type = 'invitation' and source_id = p_inv and status <> 'CANCELLED';
    perform set_config('app.source_write', 'off', true);
    update public.invitations set cancel_reason = p_reason where temple_id = p_temple and id = p_inv;
  end if;
  update public.invitations set status = nxt, version = version + 1 where temple_id = p_temple and id = p_inv;
  perform app.write_audit(p_temple, 'invitation.' || p_action, 'invitations', p_inv, i.status, nxt, p_reason);
  return i.version + 1;
end $$;
-- monk self actions: acknowledge / request release (changes nothing else; secretary sees the flag)
create function app.invitation_respond(p_temple uuid, p_inv uuid, p_response text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_response not in ('ACKNOWLEDGED','RELEASE_REQUESTED') then raise exception 'bad response' using errcode = '22023'; end if;
  update public.invitation_team set monk_response = p_response
   where temple_id = p_temple and invitation_id = p_inv and person_id = app.current_person_id() and app.is_member(p_temple);
  if not found then raise exception 'not on this team' using errcode = '42501'; end if;
  perform app.write_audit(p_temple, 'invitation.monk_' || lower(p_response), 'invitations', p_inv, null, p_response);
end $$;

-- Events (Boss Quest) ------------------------------------------------------------------------------------------------
create table public.events (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  kind text not null check (kind in ('festival_day','merit_offering','ceremony','ordination','course','community','other')),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue_text text check (char_length(venue_text) <= 300),
  visibility text not null default 'temple_members' check (visibility in ('internal','temple_members','public')),
  lead_person_id uuid references public.persons(id),
  status text not null default 'DRAFT' check (status in ('DRAFT','PLANNING','APPROVED','LIVE','COMPLETED','CANCELLED')),
  expected_attendance int check (expected_attendance >= 0),
  escalation_hours int not null default 48 check (escalation_hours between 1 and 720),
  cancel_reason text,
  readiness_at_start jsonb,
  created_by uuid not null references public.persons(id),
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  check (ends_at > starts_at),
  foreign key (temple_id, lead_person_id) references public.memberships(temple_id, person_id)
);
create table public.event_staffing_targets (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  category text not null check (category in ('monk','volunteer','staff')),
  label text not null check (char_length(btrim(label)) between 2 and 80),
  required int not null check (required between 1 and 500),
  min_required int not null,
  hard_gate boolean not null default true,
  primary key (temple_id, id),
  foreign key (temple_id, event_id) references public.events(temple_id, id),
  check (min_required between 0 and required)
);
create table public.event_participants (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  target_id uuid not null,
  person_id uuid not null references public.persons(id),
  status text not null default 'PENDING' check (status in ('PENDING','CONFIRMED','DECLINED','CANCELLED')),
  decided_by uuid references public.persons(id),
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  unique (temple_id, target_id, person_id),
  foreign key (temple_id, event_id) references public.events(temple_id, id),
  foreign key (temple_id, target_id) references public.event_staffing_targets(temple_id, id),
  foreign key (temple_id, person_id) references public.memberships(temple_id, person_id)
);
alter table public.quests
  add column event_id uuid,
  add column weight smallint not null default 2 check (weight between 1 and 5),
  add column is_gate boolean not null default false,
  add foreign key (temple_id, event_id) references public.events(temple_id, id);

create function app.can_view_event(e public.events) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select app.is_member(e.temple_id) and (
    app.has_permission(e.temple_id, 'event.manage')
    or (e.visibility <> 'internal' and app.has_permission(e.temple_id, 'event.view', 'T'))
    or (e.visibility = 'public' and app.has_permission(e.temple_id, 'event.view'))
    or exists (select 1 from public.event_participants p where p.temple_id = e.temple_id and p.event_id = e.id and p.person_id = app.current_person_id()))
$$;

-- Readiness (EV §5; pure derivation, never stored except the snapshot at start)
create function app.event_readiness_calc(p_temple uuid, p_event uuid, p_at timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare e public.events; wd numeric; wt numeric; s_num numeric; s_den numeric; t numeric; s numeric; pct int; st text; reason text;
  g jsonb := '{}'::jsonb; any_fail boolean; any_unknown boolean; h numeric; ntask int; ntarget int; vol_gap int;
begin
  select * into e from public.events where temple_id = p_temple and id = p_event;
  if e.status in ('DRAFT', 'CANCELLED') then return jsonb_build_object('state', null, 'reason', 'NOT_PLANNED'); end if;
  if e.status in ('LIVE', 'COMPLETED') and e.readiness_at_start is not null then return e.readiness_at_start || '{"frozen":true}'; end if;
  select coalesce(sum(weight) filter (where status = 'COMPLETED'), 0), coalesce(sum(weight), 0), count(*) into wd, wt, ntask
    from public.quests where temple_id = p_temple and event_id = p_event and status <> 'CANCELLED';
  with f as (select tg.*, least((select count(distinct p.person_id) from public.event_participants p join public.memberships m
                 on m.temple_id = p.temple_id and m.person_id = p.person_id and m.status = 'active'
                 where p.temple_id = tg.temple_id and p.target_id = tg.id and p.status = 'CONFIRMED'), tg.required) as filled
             from public.event_staffing_targets tg where tg.temple_id = p_temple and tg.event_id = p_event)
  select sum(case category when 'monk' then 3 else 2 end * filled::numeric / required), sum(case category when 'monk' then 3 else 2 end), count(*),
         coalesce(sum(required - filled) filter (where category = 'volunteer'), 0),
         bool_or(hard_gate and filled < min_required)
    into s_num, s_den, ntarget, vol_gap, any_fail
    from f;
  t := case when wt > 0 then wd / wt end;
  s := case when s_den > 0 then s_num / s_den end;
  g := jsonb_build_object(
    'G-OWNER', case when e.lead_person_id is null then 'FAIL' else 'PASS' end,
    'G-VENUE', case when coalesce(btrim(e.venue_text), '') = '' then 'FAIL' else 'PASS' end,
    'G-STAFF', case when ntarget = 0 then 'UNKNOWN' when coalesce(any_fail, false) then 'FAIL' else 'PASS' end,
    'G-CRIT', case when exists (select 1 from public.quests q where q.temple_id = p_temple and q.event_id = p_event and q.weight >= 4
                                and q.status not in ('COMPLETED','CANCELLED') and q.due_at < p_at) then 'FAIL' else 'PASS' end,
    'G-CHECK', case when exists (select 1 from public.quests q where q.temple_id = p_temple and q.event_id = p_event and q.is_gate
                                 and q.status not in ('COMPLETED','CANCELLED') and q.due_at < p_at) then 'FAIL' else 'PASS' end);
  any_fail := exists (select 1 from jsonb_each_text(g) where value = 'FAIL');
  any_unknown := exists (select 1 from jsonb_each_text(g) where value = 'UNKNOWN');
  if t is null and s is null then return jsonb_build_object('state', 'UNKNOWN', 'reason', 'NO_PLAN', 'gates', g, 'percent', null); end if;
  pct := floor(100 * (case when t is null then s when s is null then t else 0.6 * t + 0.4 * s end) + 1e-9);
  h := extract(epoch from e.starts_at - p_at) / 3600;
  if e.status = 'APPROVED' and p_at >= e.starts_at then st := 'NOT_READY'; reason := 'OVERDUE_START';
  elsif any_fail then st := 'NOT_READY'; reason := 'GATE_FAILED';
  else
    st := case when pct >= 90 then 'READY' when pct >= 75 then 'ALMOST_READY' else 'IN_PROGRESS' end;
    if st = 'READY' and (any_unknown or ntarget = 0 or exists (select 1 from public.quests q where q.temple_id = p_temple and q.event_id = p_event
        and q.is_gate and q.status not in ('COMPLETED','CANCELLED'))) then st := 'ALMOST_READY'; end if;
    if ntask = 0 and st in ('READY', 'ALMOST_READY') then st := 'IN_PROGRESS'; end if;
    if h >= 0 and h <= e.escalation_hours and st <> 'READY' then st := 'NOT_READY'; reason := 'TIME_PRESSURE'; end if;
  end if;
  return jsonb_build_object('state', st, 'reason', reason, 'percent', pct, 'tasks_done_weight', wd, 'tasks_total_weight', wt,
                            'staffing', round(coalesce(s, 0) * 100), 'volunteer_gap', vol_gap, 'gates', g);
end $$;
revoke all on function app.event_readiness_calc(uuid, uuid, timestamptz) from public;
-- Who sees what (EV §8): managers/staff with event.view T see everything; participants/public see percent + state only.
create function app.event_readiness(p_temple uuid, p_event uuid) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare e public.events; r jsonb;
begin
  select * into e from public.events where temple_id = p_temple and id = p_event;
  if not found or not app.can_view_event(e) then return null; end if;
  r := app.event_readiness_calc(p_temple, p_event);
  if app.has_permission(p_temple, 'event.manage') or (app.has_permission(p_temple, 'event.view', 'T') and not app.has_scope_letter(p_temple, 'event.view', 'P')) then
    return r; end if;
  return jsonb_build_object('state', r->'state', 'percent', r->'percent');
end $$;

create function app.save_event(p_temple uuid, p_event uuid, p_kind text, p_title text, p_description text, p_starts timestamptz, p_ends timestamptz,
  p_venue text, p_visibility text, p_lead uuid, p_expected int)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid := p_event; old public.events;
begin
  if not app.has_permission(p_temple, 'event.manage') then raise exception 'not allowed' using errcode = '42501'; end if;
  if id is null then
    insert into public.events(temple_id, kind, title, description, starts_at, ends_at, venue_text, visibility, lead_person_id, expected_attendance, created_by)
    values (p_temple, p_kind, btrim(p_title), nullif(btrim(p_description), ''), p_starts, p_ends, nullif(btrim(p_venue), ''), p_visibility, p_lead, p_expected,
            app.current_person_id()) returning events.id into id;
    perform app.write_audit(p_temple, 'event.created', 'events', id, null, 'DRAFT');
  else
    select * into old from public.events where temple_id = p_temple and events.id = p_event for update;
    if old.status not in ('DRAFT','PLANNING','APPROVED') then raise exception 'event can no longer be edited' using errcode = '23514'; end if;
    update public.events set kind = p_kind, title = btrim(p_title), description = nullif(btrim(p_description), ''), starts_at = p_starts, ends_at = p_ends,
           venue_text = nullif(btrim(p_venue), ''), visibility = p_visibility, lead_person_id = p_lead, expected_attendance = p_expected
     where temple_id = p_temple and events.id = p_event;
    if old.status = 'APPROVED' and (old.starts_at <> p_starts or old.ends_at <> p_ends) then   -- reschedule: participants must reconfirm
      update public.event_participants set status = 'PENDING' where temple_id = p_temple and event_id = p_event and status = 'CONFIRMED';
      perform app.write_audit(p_temple, 'event.rescheduled', 'events', p_event, 'APPROVED', 'APPROVED');
    end if;
  end if;
  return id;
end $$;
create function app.event_transition(p_temple uuid, p_event uuid, p_action text, p_reason text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare e public.events; nxt text;
begin
  select * into e from public.events where temple_id = p_temple and id = p_event for update;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  nxt := case
    when p_action = 'plan' and e.status = 'DRAFT' then 'PLANNING'
    when p_action = 'approve' and e.status = 'PLANNING' then 'APPROVED'
    when p_action = 'start' and e.status = 'APPROVED' then 'LIVE'
    when p_action = 'close' and e.status = 'LIVE' then 'COMPLETED'
    when p_action = 'cancel' and e.status in ('DRAFT','PLANNING','APPROVED') then 'CANCELLED' end;
  if nxt is null then raise exception 'ILLEGAL_TRANSITION % from %', p_action, e.status using errcode = '23514'; end if;
  if p_action = 'approve' or (p_action = 'cancel' and e.status = 'APPROVED') then
    if not app.has_permission(p_temple, 'event.approve', 'T') then raise exception 'event.approve needed' using errcode = '42501'; end if;
  elsif not app.has_permission(p_temple, 'event.manage') then raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_action = 'plan' and e.lead_person_id is null then raise exception 'lead person required' using errcode = '23514'; end if;
  if p_action = 'approve' and coalesce(btrim(e.venue_text), '') = '' then raise exception 'venue required' using errcode = '23514'; end if;
  if p_action = 'cancel' and coalesce(btrim(p_reason), '') = '' then raise exception 'reason required' using errcode = '23514'; end if;
  if p_action = 'start' then
    update public.events set readiness_at_start = app.event_readiness_calc(p_temple, p_event) where temple_id = p_temple and id = p_event;
  elsif p_action = 'cancel' then
    update public.quests set status = 'CANCELLED' where temple_id = p_temple and event_id = p_event and status not in ('COMPLETED','CANCELLED');
    update public.event_participants set status = 'CANCELLED' where temple_id = p_temple and event_id = p_event;
    update public.events set cancel_reason = p_reason where temple_id = p_temple and id = p_event;
  end if;
  update public.events set status = nxt where temple_id = p_temple and id = p_event;
  perform app.write_audit(p_temple, 'event.' || p_action, 'events', p_event, e.status, nxt, p_reason);
end $$;
create function app.save_staffing_target(p_temple uuid, p_event uuid, p_category text, p_label text, p_required int, p_min int, p_hard boolean)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid;
begin
  if not app.has_permission(p_temple, 'event.manage') then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.event_staffing_targets(temple_id, event_id, category, label, required, min_required, hard_gate)
  values (p_temple, p_event, p_category, btrim(p_label), p_required,
          coalesce(p_min, case when p_category = 'monk' then p_required else ceil(0.8 * p_required)::int end), coalesce(p_hard, true))
  returning event_staffing_targets.id into id;
  return id;
end $$;
-- managers add monks/staff directly (CONFIRMED); a monk added to a monk target also gets a ceremony calendar row.
create function app.add_event_participant(p_temple uuid, p_target uuid, p_person uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare tg public.event_staffing_targets; e public.events;
begin
  if not app.has_permission(p_temple, 'event.manage') then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into tg from public.event_staffing_targets where temple_id = p_temple and id = p_target;
  select * into e from public.events where temple_id = p_temple and id = tg.event_id;
  if (tg.category = 'monk') <> app.is_monastic(p_temple, p_person) then raise exception 'LEDGER_KIND_MISMATCH: wrong category for this person' using errcode = '23514'; end if;
  insert into public.event_participants(temple_id, event_id, target_id, person_id, status, decided_by)
  values (p_temple, tg.event_id, p_target, p_person, 'CONFIRMED', app.current_person_id())
  on conflict (temple_id, target_id, person_id) do update set status = 'CONFIRMED', decided_by = excluded.decided_by;
  if tg.category = 'monk' then
    perform set_config('app.source_write', 'on', true);
    insert into public.schedule_entries(temple_id, kind, title, person_id, visibility, starts_at, ends_at, created_by, venue_kind, venue_text, source_type, source_id)
    values (p_temple, 'ceremony', e.title, p_person, 'temple', e.starts_at, e.ends_at, app.current_person_id(), 'IN_TEMPLE', e.venue_text, 'event', e.id)
    on conflict do nothing;
    perform set_config('app.source_write', 'off', true);
  end if;
end $$;
-- lay members sign up as volunteers (PENDING) for events they can see; approval by event.volunteer_approve or event.manage
create function app.volunteer_signup(p_temple uuid, p_target uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare tg public.event_staffing_targets; e public.events; me uuid := app.current_person_id();
begin
  select * into tg from public.event_staffing_targets where temple_id = p_temple and id = p_target and category = 'volunteer';
  if not found then raise exception 'not a volunteer slot' using errcode = 'P0002'; end if;
  select * into e from public.events where temple_id = p_temple and id = tg.event_id;
  if not app.can_view_event(e) or e.status not in ('PLANNING','APPROVED') or app.is_monastic(p_temple, me) then
    raise exception 'sign-up not available' using errcode = '42501'; end if;
  if exists (select 1 from public.memberships where temple_id = p_temple and person_id = me and is_minor) then
    raise exception 'minors need an adult-supervised sign-up by staff' using errcode = '42501'; end if;
  insert into public.event_participants(temple_id, event_id, target_id, person_id) values (p_temple, tg.event_id, p_target, me)
  on conflict (temple_id, target_id, person_id) do update set status = 'PENDING' where event_participants.status in ('DECLINED','CANCELLED');
end $$;
create function app.decide_participant(p_temple uuid, p_participant uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not (app.has_permission(p_temple, 'event.volunteer_approve') or app.has_permission(p_temple, 'event.manage')) then
    raise exception 'not allowed' using errcode = '42501'; end if;
  update public.event_participants set status = case when p_accept then 'CONFIRMED' else 'DECLINED' end, decided_by = app.current_person_id()
   where temple_id = p_temple and id = p_participant and status = 'PENDING' and person_id <> app.current_person_id();
  if not found then raise exception 'nothing to decide' using errcode = 'P0002'; end if;
end $$;
create function app.withdraw_participation(p_temple uuid, p_participant uuid) returns void language sql security definer set search_path = public, pg_temp as $$
  update public.event_participants set status = 'CANCELLED' where temple_id = p_temple and id = p_participant and person_id = app.current_person_id()
$$;
create function app.add_event_task(p_temple uuid, p_event uuid, p_title text, p_weight int, p_is_gate boolean, p_due timestamptz, p_assignee uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare q uuid;
begin
  if not app.has_permission(p_temple, 'event.manage') then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.quests(temple_id, quest_type, title, created_by, status, verification_policy, event_id, weight, is_gate, due_at)
  values (p_temple, 'event_task', btrim(p_title), app.current_person_id(), 'OPEN', 'organizer_approval', p_event, p_weight, coalesce(p_is_gate, false), p_due)
  returning id into q;
  if p_assignee is not null then
    insert into public.quest_assignments(temple_id, quest_id, assignee_person_id) values (p_temple, q, p_assignee);
  end if;
  return q;
end $$;
-- event tasks complete when the assignee submits and a different person with event.manage verifies (existing guard)
create function app.event_task_progress(p_temple uuid, p_assignment uuid, p_action text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.quest_assignments; q public.quests;
begin
  select * into a from public.quest_assignments where temple_id = p_temple and id = p_assignment for update;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  select * into q from public.quests where temple_id = p_temple and id = a.quest_id;
  if p_action in ('start','submit') then
    if a.assignee_person_id <> app.current_person_id() then raise exception 'not your task' using errcode = '42501'; end if;
    update public.quest_assignments set status = case p_action when 'start' then 'IN_PROGRESS' else 'SUBMITTED' end where temple_id = p_temple and id = p_assignment;
  elsif p_action in ('verify','reject') then
    if not (app.has_permission(p_temple, 'event.manage') or app.in_scope(p_temple, 'quest.verify', null, q.department_id)) then
      raise exception 'not allowed' using errcode = '42501'; end if;
    update public.quest_assignments set status = case p_action when 'verify' then 'COMPLETED' else 'IN_PROGRESS' end,
           verifier_person_id = case p_action when 'verify' then app.current_person_id() else verifier_person_id end
     where temple_id = p_temple and id = p_assignment;
  else raise exception 'bad action' using errcode = '22023';
  end if;
  if p_action = 'verify' and not exists (select 1 from public.quest_assignments x where x.temple_id = p_temple and x.quest_id = q.id
       and x.status not in ('COMPLETED','CANCELLED')) then
    update public.quests set status = 'COMPLETED' where temple_id = p_temple and id = q.id;
  end if;
end $$;

-- public listing of public events of a verified temple (title/time/venue + volunteers still needed only)
create function public.temple_public_events(p_slug text)
returns table (id uuid, title text, kind text, starts_at timestamptz, ends_at timestamptz, venue_text text, volunteers_needed int)
language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.kind, e.starts_at, e.ends_at, e.venue_text,
    (select coalesce(sum(greatest(tg.required - (select count(*) from public.event_participants p where p.temple_id = tg.temple_id
        and p.target_id = tg.id and p.status = 'CONFIRMED'), 0)), 0)::int
       from public.event_staffing_targets tg where tg.temple_id = e.temple_id and tg.event_id = e.id and tg.category = 'volunteer')
    from public.events e join public.temples t on t.id = e.temple_id
   where t.slug = p_slug and app.is_verified_temple(t.id) and e.visibility = 'public' and e.status in ('APPROVED','LIVE')
     and e.ends_at > now()
   order by e.starts_at limit 50
$$;

-- Monastic activity score (SC ME-1): system-written on verified completion; cap 30/day; self-created 0 ---------------------
create function app.award_on_completion() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare q public.quests; kind text; today int; amt int; tz text;
begin
  if not (new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED') then return new; end if;
  select * into q from public.quests where temple_id = new.temple_id and id = new.quest_id;
  if q.points <= 0 or q.created_by = new.assignee_person_id then return new; end if;     -- SELF_CREATED => 0
  select monastic_kind into kind from public.memberships where temple_id = new.temple_id and person_id = new.assignee_person_id;
  if kind = 'none' then return new; end if;                                              -- community ledger handled elsewhere
  if q.quest_type not in ('monastic_daily', 'novice_learning', 'event_task', 'ceremony_task', 'general') then return new; end if;
  select coalesce(t.tz, 'Asia/Bangkok') into tz from public.temples t where t.id = new.temple_id;
  select coalesce(sum(amount), 0) into today from public.monastic_activity_ledger
   where temple_id = new.temple_id and person_id = new.assignee_person_id and amount > 0
     and (created_at at time zone tz)::date = (now() at time zone tz)::date;
  amt := least(q.points, 30 - today);
  if amt <= 0 then
    perform app.write_audit(new.temple_id, 'scoring.award_capped', 'quest_assignment', new.id, null, null, 'DAILY_CAP_HIT');
    return new;
  end if;
  insert into public.monastic_activity_ledger(temple_id, person_id, amount, reason, idempotency_key)
  values (new.temple_id, new.assignee_person_id, amt, 'QUEST_COMPLETION:' || q.title, 'quest_completion:' || new.id)
  on conflict (temple_id, idempotency_key) do nothing;
  return new;
end $$;
create trigger award_on_completion after update on public.quest_assignments for each row execute function app.award_on_completion();

-- practice days (SC §6): visible to the monk only; derived; no loss mechanics (no "streak broken").
create function app.my_practice(p_temple uuid)
returns table (practice_days_this_month bigint, practice_days_total bigint, current_run int, activity_score bigint)
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); tz text; d date; run int := 0;
begin
  if not app.is_monastic(p_temple, me) then return; end if;
  select coalesce(t.tz, 'Asia/Bangkok') into tz from public.temples t where t.id = p_temple;
  create temp table if not exists _pd (day date) on commit drop; truncate _pd;
  insert into _pd select distinct (a.updated_at at time zone tz)::date from public.quest_assignments a join public.quests q
    on q.temple_id = a.temple_id and q.id = a.quest_id
   where a.temple_id = p_temple and a.assignee_person_id = me and a.status = 'COMPLETED' and q.quest_type in ('monastic_daily', 'novice_learning');
  d := (now() at time zone tz)::date;
  if not exists (select 1 from _pd where day = d) then d := d - 1; end if;
  while exists (select 1 from _pd where day = d) loop run := run + 1; d := d - 1; end loop;
  return query select (select count(*) from _pd where date_trunc('month', day) = date_trunc('month', (now() at time zone tz)::date)),
    (select count(*) from _pd), case when run >= 2 then run else null end,
    (select coalesce(sum(amount), 0) from public.monastic_activity_ledger where temple_id = p_temple and person_id = me);
end $$;

-- My Day: my calendar rows + my open/started/submitted quest assignments for the local day
create function app.my_day(p_temple uuid, p_day date)
returns table (item_kind text, ref_id uuid, title text, starts_at timestamptz, ends_at timestamptz, status text, detail jsonb)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); tz text; s timestamptz; e timestamptz;
begin
  if not app.is_member(p_temple) then raise exception 'not a member' using errcode = '42501'; end if;
  select coalesce(t.tz, 'Asia/Bangkok') into tz from public.temples t where t.id = p_temple;
  s := p_day::timestamp at time zone tz; e := (p_day + 1)::timestamp at time zone tz;
  return query
  select 'schedule', x.id, x.title, x.starts_at, x.ends_at, x.status,
         jsonb_build_object('kind', x.kind, 'leg', x.leg, 'venue', x.venue_text, 'source', x.source_type,
           'invitation_id', case when x.source_type = 'invitation' then x.source_id end,
           'monk_response', (select t.monk_response from public.invitation_team t where t.temple_id = p_temple and t.invitation_id = x.source_id and t.person_id = me))
    from public.schedule_entries x
   where x.temple_id = p_temple and (x.person_id = me or x.owner_person_id = me) and x.status = 'CONFIRMED' and x.starts_at < e and x.ends_at > s
  union all
  select 'quest', a.id, q.title, coalesce(q.due_at, s), q.due_at, a.status,
         jsonb_build_object('quest_type', q.quest_type, 'overdue', q.due_at < now() and a.status not in ('COMPLETED','CANCELLED'),
                            'waiting_verifier', a.status = 'SUBMITTED', 'event_id', q.event_id)
    from public.quest_assignments a join public.quests q on q.temple_id = a.temple_id and q.id = a.quest_id
   where a.temple_id = p_temple and a.assignee_person_id = me and a.status not in ('CANCELLED')
     and (a.status <> 'COMPLETED' or a.updated_at >= s) and (q.due_at is null or q.due_at < e)
     and (q.due_at is null or q.due_at >= s or a.status not in ('COMPLETED'))
  order by 4;
end $$;

-- RLS for new tables ----------------------------------------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['rite_types','invitations','invitation_team','events','event_staffing_targets','event_participants'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop; end $$;
create policy rite_sel on public.rite_types for select to authenticated using (app.is_member(temple_id) and app.has_permission(temple_id, 'invitation.view'));
create policy inv_sel on public.invitations for select to authenticated using (
  app.has_permission(temple_id, 'invitation.view', 'T')
  or (app.has_permission(temple_id, 'invitation.view') and exists (select 1 from public.invitation_team t where t.temple_id = invitations.temple_id
       and t.invitation_id = invitations.id and t.person_id = app.current_person_id())));
create policy invteam_sel on public.invitation_team for select to authenticated using (
  app.has_permission(temple_id, 'invitation.view', 'T') or (person_id = app.current_person_id() and app.is_member(temple_id)));
create policy events_sel on public.events for select to authenticated using (app.can_view_event(events));
create policy targets_sel on public.event_staffing_targets for select to authenticated using (
  exists (select 1 from public.events e where e.temple_id = event_staffing_targets.temple_id and e.id = event_id and app.can_view_event(e)));
create policy participants_sel on public.event_participants for select to authenticated using (
  (person_id = app.current_person_id() and app.is_member(temple_id))
  or app.has_permission(temple_id, 'event.manage') or app.has_permission(temple_id, 'event.volunteer_approve'));
grant select on public.rite_types, public.invitations, public.invitation_team, public.events, public.event_staffing_targets,
  public.event_participants to authenticated;

create function app.save_rite_type(p_temple uuid, p_name text, p_routine boolean, p_requires_lead boolean, p_duration int) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid;
begin
  if not app.has_permission(p_temple, 'invitation.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.rite_types(temple_id, name_th, is_routine, requires_lead, default_duration_min)
  values (p_temple, btrim(p_name), coalesce(p_routine, true), coalesce(p_requires_lead, false), coalesce(p_duration, 60)) returning rite_types.id into id;
  return id;
end $$;

grant execute on function app.has_scope_letter(uuid, text, text), app.is_monastic(uuid, uuid),
  app.set_availability(uuid, uuid, text, timestamptz, timestamptz, text), app.clear_availability(uuid, uuid),
  app.my_availability(uuid), app.availability_board(uuid, timestamptz), app.availability_coarse(uuid), app.check_in(uuid),
  app.suggest_team(uuid, uuid), app.create_invitation(uuid, text, text, text, uuid, text, timestamptz, int, int, text, int, int, text, text),
  app.invitation_transition(uuid, uuid, int, text, uuid[], uuid, text, boolean), app.invitation_respond(uuid, uuid, text),
  app.can_view_event(public.events), app.event_readiness(uuid, uuid),
  app.save_event(uuid, uuid, text, text, text, timestamptz, timestamptz, text, text, uuid, int), app.event_transition(uuid, uuid, text, text),
  app.save_staffing_target(uuid, uuid, text, text, int, int, boolean), app.add_event_participant(uuid, uuid, uuid),
  app.volunteer_signup(uuid, uuid), app.decide_participant(uuid, uuid, boolean), app.withdraw_participation(uuid, uuid),
  app.add_event_task(uuid, uuid, text, int, boolean, timestamptz, uuid), app.event_task_progress(uuid, uuid, text),
  app.my_practice(uuid), app.my_day(uuid, date), app.save_rite_type(uuid, text, boolean, boolean, int) to authenticated;
revoke all on function app.inv_violations(uuid, uuid, uuid), app.inv_window(public.invitations, int) from public;
grant execute on function public.temple_public_events(text) to anon, authenticated;


-- ===== 0010_contact_follow_fixes.sql =====
-- 0010 Gaps found while building the Temple Contact / follow UI (reported by the UI agent):
--  * public_temple_ref: slug -> id/name for a VERIFIED temple only (so the app never needs owner-level lookups)
--  * join_temple_community re-activates a membership the person left earlier (it silently did nothing before)
--  * my_contact_threads: the sender's own threads with temple name and the replying staff member's display name

create function public.public_temple_ref(p_slug text) returns table (id uuid, name_th text)
language sql stable security definer set search_path = public as $$
  select t.id, t.name_th from public.temples t where t.slug = p_slug and app.is_verified_temple(t.id)
$$;
grant execute on function public.public_temple_ref(text) to anon, authenticated;

create or replace function app.join_temple_community(p_temple uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); m uuid; st text;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not app.is_verified_temple(p_temple) then raise exception 'temple not public' using errcode = '55000'; end if;
  select id, status into m, st from public.memberships where temple_id = p_temple and person_id = me;
  if m is null then
    insert into public.memberships(temple_id, person_id, status) values (p_temple, me, 'active') returning id into m;
    insert into public.membership_roles(temple_id, membership_id, role_code) values (p_temple, m, 'community_member');
    perform app.write_audit(p_temple, 'membership.followed', 'memberships', m, null, 'active');
  elsif st = 'left' and not exists (select 1 from public.membership_roles r where r.temple_id = p_temple and r.membership_id = m
                                    and r.role_code <> 'community_member') then
    update public.memberships set status = 'active' where temple_id = p_temple and id = m;
    insert into public.membership_roles(temple_id, membership_id, role_code) values (p_temple, m, 'community_member') on conflict do nothing;
    perform app.write_audit(p_temple, 'membership.followed', 'memberships', m, 'left', 'active');
  elsif st in ('suspended', 'invited') then
    raise exception 'membership is %', st using errcode = '55000';
  end if;
end $$;

create function app.my_contact_threads()
returns table (id uuid, temple_id uuid, temple_name text, ref_code text, topic text, message text, status text, reply text,
               replied_by_name text, replied_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, c.temple_id, t.name_th, c.ref_code, c.topic, c.message, c.status, c.reply, p.display_name, c.replied_at, c.created_at
    from public.temple_contact_threads c join public.temples t on t.id = c.temple_id
    left join public.persons p on p.id = c.replied_by
   where c.sender_person_id = app.current_person_id()
   order by c.created_at desc limit 100
$$;
grant execute on function app.my_contact_threads() to authenticated;

-- ===== 0011_map_points_helpers_command.sql =====
-- 0011 Map (buildings/zones registry + 2D shapes), community boon points (earn/award/redeem/refund, holds),
-- rule-based helpers (no AI model: daily summary, schedule conflicts, event checklist), Temple Command Center read model.
-- Sources: SPATIAL_REGISTRY_SPEC.md, SCORING_SPEC.md, SPEC.md AI POLICY / COMMAND CENTER, TEMPLE_DOMAIN_MODEL.md:54-56.
-- v1 simplifications are listed in docs/v1/DECISIONS.md (D-M*, D-P*, D-H*, D-CC*).

-- ===== Map: buildings + zones (temple-entered; public only after the temple confirms) ===========================
create table public.buildings (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  code text not null check (code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*(\.[A-Z0-9]+(-[A-Z0-9]+)*){1,4}$' and char_length(code) <= 64),
  name_th text not null check (char_length(btrim(name_th)) between 2 and 120),
  name_en text,
  kind text not null check (kind in ('PRANG','UBOSOT','VIHARA','MANDAPA','SALA','KUTI','BELL_TOWER','GATE','PIER','OFFICE','KITCHEN',
                                     'TOILET','PARKING','GARDEN_AREA','STORAGE','OTHER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CLOSED_TEMPORARILY','UNDER_RENOVATION','RETIRED')),
  public_visibility text not null default 'STAFF_ONLY' check (public_visibility in ('PUBLIC','STAFF_ONLY','MONASTIC_ONLY')),
  polygon2d jsonb check (polygon2d is null or (jsonb_typeof(polygon2d) = 'array' and jsonb_array_length(polygon2d) between 3 and 64)),
  source_note text check (char_length(source_note) <= 300),
  confirmed_by uuid references public.persons(id),
  confirmed_at timestamptz,
  created_by uuid not null references public.persons(id),
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  unique (temple_id, code)
);
create table public.zones (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  building_id uuid,
  code text not null check (code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*(\.[A-Z0-9]+(-[A-Z0-9]+)*){1,4}$' and char_length(code) <= 64),
  name_th text not null check (char_length(btrim(name_th)) between 2 and 120),
  kind text not null check (kind in ('INTERIOR','EXTERIOR','COURTYARD','GARDEN','RIVERFRONT','PARKING','PATH')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CLOSED_TEMPORARILY','RETIRED')),
  primary key (temple_id, id),
  unique (temple_id, code),
  foreign key (temple_id, building_id) references public.buildings(temple_id, id)
);
-- codes never change (rename = name only); rows never deleted (RETIRED)
create function app.building_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'buildings/zones are never deleted; set status RETIRED' using errcode = '42501'; end if;
  if new.code <> old.code then raise exception 'code is immutable' using errcode = '23514'; end if;
  return new;
end $$;
create trigger building_guard before update or delete on public.buildings for each row execute function app.building_guard();
create trigger zone_guard before update or delete on public.zones for each row execute function app.building_guard();

alter table public.quests add column building_id uuid, add foreign key (temple_id, building_id) references public.buildings(temple_id, id);
alter table public.events add column building_id uuid, add foreign key (temple_id, building_id) references public.buildings(temple_id, id);

create function app.polygon_ok(p jsonb) returns boolean language sql immutable as $$
  select p is null or not exists (select 1 from jsonb_array_elements(p) e
    where jsonb_typeof(e) <> 'array' or jsonb_array_length(e) <> 2
       or (e->>0)::numeric not between 0 and 1600 or (e->>1)::numeric not between 0 and 1000)
$$;
create function app.save_building(p_temple uuid, p_id uuid, p_code text, p_name_th text, p_kind text, p_status text, p_visibility text,
  p_polygon jsonb, p_source_note text) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid := p_id; old public.buildings;
begin
  if not app.has_permission(p_temple, 'asset.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  if not app.polygon_ok(p_polygon) then raise exception 'polygon points must be [x,y] inside 1600x1000' using errcode = '23514'; end if;
  if id is null then
    insert into public.buildings(temple_id, code, name_th, kind, status, public_visibility, polygon2d, source_note, created_by)
    values (p_temple, upper(btrim(p_code)), btrim(p_name_th), p_kind, coalesce(p_status, 'ACTIVE'), coalesce(p_visibility, 'STAFF_ONLY'), p_polygon,
            nullif(btrim(p_source_note), ''), app.current_person_id()) returning buildings.id into id;
  else
    select * into old from public.buildings b where b.temple_id = p_temple and b.id = p_id for update;
    -- any change of a confirmed public building clears the confirmation: the temple must confirm again before it is public
    update public.buildings set name_th = btrim(p_name_th), kind = p_kind, status = p_status, public_visibility = p_visibility, polygon2d = p_polygon,
           source_note = nullif(btrim(p_source_note), ''),
           confirmed_by = case when (old.name_th, old.kind, old.public_visibility, old.polygon2d::text) is distinct from
                                    (btrim(p_name_th), p_kind, p_visibility, p_polygon::text) then null else old.confirmed_by end,
           confirmed_at = case when (old.name_th, old.kind, old.public_visibility, old.polygon2d::text) is distinct from
                                    (btrim(p_name_th), p_kind, p_visibility, p_polygon::text) then null else old.confirmed_at end
     where temple_id = p_temple and buildings.id = p_id;
  end if;
  perform app.write_audit(p_temple, 'building.saved', 'buildings', id, null, p_status);
  return id;
end $$;
-- the temple confirms (temple admin / abbot); a platform admin cannot confirm on the temple's behalf
create function app.confirm_building(p_temple uuid, p_id uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.has_permission(p_temple, 'temple.settings', 'T') then   -- the temple itself; a platform admin cannot confirm for it
    raise exception 'only the temple can confirm' using errcode = '42501'; end if;
  update public.buildings set confirmed_by = app.current_person_id(), confirmed_at = now() where temple_id = p_temple and id = p_id;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  perform app.write_audit(p_temple, 'building.confirmed', 'buildings', p_id, null, 'CONFIRMED');
end $$;
create function app.save_zone(p_temple uuid, p_building uuid, p_code text, p_name_th text, p_kind text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid;
begin
  if not app.has_permission(p_temple, 'asset.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.zones(temple_id, building_id, code, name_th, kind) values (p_temple, p_building, upper(btrim(p_code)), btrim(p_name_th), p_kind)
  returning zones.id into id;
  return id;
end $$;
-- markers computed at read time per viewer (SR §5): never 0 when unknown; quest counts only within the viewer's scope (RLS)
create function app.map_buildings(p_temple uuid)
returns table (id uuid, code text, name_th text, kind text, status text, public_visibility text, polygon2d jsonb, confirmed boolean,
               events_today bigint, open_quests bigint)
language sql stable security invoker set search_path = public, pg_temp as $$
  select b.id, b.code, b.name_th, b.kind, b.status, b.public_visibility, b.polygon2d, b.confirmed_at is not null,
    (select count(*) from public.events e where e.temple_id = b.temple_id and e.building_id = b.id and e.status in ('APPROVED','LIVE')
       and e.starts_at < (now() + interval '1 day') and e.ends_at > now()),
    (select count(*) from public.quests q where q.temple_id = b.temple_id and q.building_id = b.id and q.status = 'OPEN')
    from public.buildings b where b.temple_id = p_temple and b.status <> 'RETIRED'
   order by b.code
$$;
-- public map: PUBLIC + temple-confirmed buildings of a verified temple only
create function public.temple_public_map(p_slug text)
returns table (code text, name_th text, kind text, status text, polygon2d jsonb)
language sql stable security definer set search_path = public as $$
  select b.code, b.name_th, b.kind, b.status, b.polygon2d from public.buildings b join public.temples t on t.id = b.temple_id
   where t.slug = p_slug and app.is_verified_temple(t.id) and b.public_visibility = 'PUBLIC' and b.confirmed_at is not null and b.status <> 'RETIRED'
   order by b.code
$$;

-- ===== Community boon points (SCORING_SPEC CB-1..CB-4; never combined with the monastic ledger) =====================
alter table public.boon_point_transactions
  add column txn_type text not null default 'EARN' check (txn_type in ('EARN','MANUAL_AWARD','REDEEM','REFUND','REVERSAL')),
  add column source_type text,
  add column source_id uuid;
drop policy bpt_ins on public.boon_point_transactions;          -- writes only via the functions below
revoke insert on public.boon_point_transactions from authenticated;

create table public.point_holds (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  person_id uuid not null references public.persons(id),
  assignment_id uuid not null,
  amount int not null check (amount > 0),
  signal text not null,
  status text not null default 'HELD' check (status in ('HELD','ACCEPTED','REJECTED')),
  decided_by uuid references public.persons(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  unique (temple_id, assignment_id),
  foreign key (temple_id, assignment_id) references public.quest_assignments(temple_id, id)
);
create table public.reward_catalog (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  name_th text not null check (char_length(btrim(name_th)) between 2 and 120),
  description text check (char_length(description) <= 500),
  cost int not null check (cost between 1 and 100000),
  stock int not null check (stock >= 0),
  per_person_limit int check (per_person_limit >= 1),
  active boolean not null default true,
  created_by uuid not null references public.persons(id),
  created_at timestamptz not null default now(),
  primary key (temple_id, id)
);
create table public.reward_redemptions (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  reward_id uuid not null,
  person_id uuid not null references public.persons(id),
  status text not null default 'REQUESTED' check (status in ('REQUESTED','FULFILLED','CANCELLED')),
  cost int not null,
  decided_by uuid references public.persons(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  primary key (temple_id, id),
  foreign key (temple_id, reward_id) references public.reward_catalog(temple_id, id),
  foreign key (temple_id, person_id) references public.memberships(temple_id, person_id)
);

-- earn on verified completion of a lay assignment (extends the 0009 trigger function for monastic rows)
create or replace function app.award_on_completion() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare q public.quests; kind text; today int; amt int; tz text; cap int; recent int; top int;
begin
  if not (new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED') then return new; end if;
  select * into q from public.quests where temple_id = new.temple_id and id = new.quest_id;
  if q.points <= 0 or q.created_by = new.assignee_person_id or q.verification_policy = 'none' then return new; end if;   -- SELF_CREATED / unverified => 0
  select monastic_kind into kind from public.memberships where temple_id = new.temple_id and person_id = new.assignee_person_id;
  select coalesce(t.tz, 'Asia/Bangkok') into tz from public.temples t where t.id = new.temple_id;
  if kind <> 'none' then
    if q.quest_type not in ('monastic_daily', 'novice_learning', 'event_task', 'ceremony_task', 'general') then return new; end if;
    select coalesce(sum(amount), 0) into today from public.monastic_activity_ledger
     where temple_id = new.temple_id and person_id = new.assignee_person_id and amount > 0 and (created_at at time zone tz)::date = (now() at time zone tz)::date;
    cap := 30;
  else
    if q.quest_type in ('monastic_daily', 'novice_learning') then
      perform app.write_audit(new.temple_id, 'scoring.award_rejected', 'quest_assignment', new.id, null, null, 'LEDGER_KIND_MISMATCH');
      return new;
    end if;
    select coalesce(sum(amount), 0) into today from public.boon_point_transactions
     where temple_id = new.temple_id and person_id = new.assignee_person_id and txn_type = 'EARN' and (created_at at time zone tz)::date = (now() at time zone tz)::date;
    cap := 100;
  end if;
  amt := least(q.points, cap - today);
  if amt <= 0 then
    perform app.write_audit(new.temple_id, 'scoring.award_capped', 'quest_assignment', new.id, null, null, 'DAILY_CAP_HIT');
    return new;
  end if;
  if kind <> 'none' then
    insert into public.monastic_activity_ledger(temple_id, person_id, amount, reason, idempotency_key)
    values (new.temple_id, new.assignee_person_id, amt, 'QUEST_COMPLETION:' || q.title, 'quest_completion:' || new.id)
    on conflict (temple_id, idempotency_key) do nothing;
    return new;
  end if;
  -- anti-cheat VERIFIER_CONCENTRATION: one verifier >= 80% of the person's last >= 10 completions => HOLD for human review
  select count(*), max(c) into recent, top from (
    select verifier_person_id, count(*) over (partition by verifier_person_id) as c from (
      select a.verifier_person_id from public.quest_assignments a where a.temple_id = new.temple_id and a.assignee_person_id = new.assignee_person_id
         and a.status = 'COMPLETED' order by a.updated_at desc limit 10) last10) x;
  if recent >= 10 and top >= 8 then
    insert into public.point_holds(temple_id, person_id, assignment_id, amount, signal) values (new.temple_id, new.assignee_person_id, new.id, amt, 'VERIFIER_CONCENTRATION')
    on conflict do nothing;
    perform app.write_audit(new.temple_id, 'scoring.award_held', 'quest_assignment', new.id, null, null, 'VERIFIER_CONCENTRATION');
    return new;
  end if;
  insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by, txn_type, source_type, source_id)
  values (new.temple_id, new.assignee_person_id, amt, 'ร่วมกิจกรรม: ' || q.title, 'quest_completion:' || new.id, 'system:scoring', 'EARN', 'quest_assignment', new.id)
  on conflict (temple_id, idempotency_key) do nothing;
  return new;
end $$;

create function app.award_points(p_temple uuid, p_person uuid, p_amount int, p_reason text, p_request uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id();
begin
  if not app.has_permission(p_temple, 'points.award_community', 'D') then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_person = me then raise exception 'SELF_AWARD_FORBIDDEN' using errcode = '42501'; end if;
  if p_amount not between 1 and 50 then raise exception 'AMOUNT_EXCEEDS_LIMIT' using errcode = '23514'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'reason required' using errcode = '23514'; end if;
  insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by, txn_type, source_type)
  values (p_temple, p_person, p_amount, btrim(p_reason), 'award:' || p_request, me::text, 'MANUAL_AWARD', 'manual')
  on conflict (temple_id, idempotency_key) do nothing;
end $$;
create function app.review_hold(p_temple uuid, p_hold uuid, p_accept boolean) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare h public.point_holds;
begin
  if not app.has_permission(p_temple, 'points.award_community', 'D') then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into h from public.point_holds where temple_id = p_temple and id = p_hold and status = 'HELD' for update;
  if not found then raise exception 'not held' using errcode = 'P0002'; end if;
  if h.person_id = app.current_person_id() then raise exception 'cannot review own points' using errcode = '42501'; end if;
  update public.point_holds set status = case when p_accept then 'ACCEPTED' else 'REJECTED' end, decided_by = app.current_person_id(), decided_at = now()
   where temple_id = p_temple and id = p_hold;
  if p_accept then
    insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by, txn_type, source_type, source_id)
    values (p_temple, h.person_id, h.amount, 'ร่วมกิจกรรม (ตรวจแล้ว)', 'quest_completion:' || h.assignment_id, app.current_person_id()::text, 'EARN', 'quest_assignment', h.assignment_id)
    on conflict (temple_id, idempotency_key) do nothing;
  end if;
end $$;

create function app.save_reward(p_temple uuid, p_id uuid, p_name text, p_description text, p_cost int, p_stock int, p_limit int, p_active boolean)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid := p_id;
begin
  if not app.has_permission(p_temple, 'reward.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  if id is null then
    insert into public.reward_catalog(temple_id, name_th, description, cost, stock, per_person_limit, active, created_by)
    values (p_temple, btrim(p_name), nullif(btrim(p_description), ''), p_cost, p_stock, p_limit, coalesce(p_active, true), app.current_person_id())
    returning reward_catalog.id into id;
  else
    update public.reward_catalog set name_th = btrim(p_name), description = nullif(btrim(p_description), ''), cost = p_cost, stock = p_stock,
           per_person_limit = p_limit, active = coalesce(p_active, true) where temple_id = p_temple and reward_catalog.id = p_id;
  end if;
  return id;
end $$;
create function app.point_balance(p_temple uuid, p_person uuid) returns bigint language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(sum(amount), 0) from public.boon_point_transactions where temple_id = p_temple and person_id = p_person
$$;
revoke all on function app.point_balance(uuid, uuid) from public;
create function app.redeem_reward(p_temple uuid, p_reward uuid, p_request uuid) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); r public.reward_catalog; id uuid; n bigint;
begin
  if not app.has_permission(p_temple, 'community.participate') or app.is_monastic(p_temple, me) then raise exception 'FORBIDDEN_MONASTIC_OR_NOT_MEMBER' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_temple::text || me::text || 'boon_point_transactions', 0));   -- same lock as ledger_guard
  select * into r from public.reward_catalog where temple_id = p_temple and reward_catalog.id = p_reward for update;
  if not found or not r.active then raise exception 'reward not available' using errcode = 'P0002'; end if;
  if r.stock < 1 then raise exception 'OUT_OF_STOCK' using errcode = '23514'; end if;
  select count(*) into n from public.reward_redemptions where temple_id = p_temple and reward_id = p_reward and person_id = me and status <> 'CANCELLED';
  if r.per_person_limit is not null and n >= r.per_person_limit then raise exception 'LIMIT_REACHED' using errcode = '23514'; end if;
  if app.point_balance(p_temple, me) < r.cost then raise exception 'INSUFFICIENT_POINTS' using errcode = '23514'; end if;
  insert into public.reward_redemptions(temple_id, reward_id, person_id, cost) values (p_temple, p_reward, me, r.cost) returning reward_redemptions.id into id;
  insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by, txn_type, source_type, source_id)
  values (p_temple, me, -r.cost, 'ของที่ระลึกจากการร่วมกิจกรรม: ' || r.name_th, 'redeem:' || p_request, me::text, 'REDEEM', 'reward_redemption', id);
  update public.reward_catalog set stock = stock - 1 where temple_id = p_temple and reward_catalog.id = p_reward;
  return id;
end $$;
create function app.decide_redemption(p_temple uuid, p_redemption uuid, p_action text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare rd public.reward_redemptions; me uuid := app.current_person_id();
begin
  select * into rd from public.reward_redemptions where temple_id = p_temple and id = p_redemption and status = 'REQUESTED' for update;
  if not found then raise exception 'not open' using errcode = 'P0002'; end if;
  if p_action = 'fulfil' then
    if not app.has_permission(p_temple, 'reward.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
    update public.reward_redemptions set status = 'FULFILLED', decided_by = me, decided_at = now() where temple_id = p_temple and id = p_redemption;
  elsif p_action = 'cancel' then
    if not (rd.person_id = me or app.has_permission(p_temple, 'reward.manage', 'T')) then raise exception 'not allowed' using errcode = '42501'; end if;
    update public.reward_redemptions set status = 'CANCELLED', decided_by = me, decided_at = now() where temple_id = p_temple and id = p_redemption;
    update public.reward_catalog set stock = stock + 1 where temple_id = p_temple and id = rd.reward_id;
    insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by, txn_type, source_type, source_id)
    values (p_temple, rd.person_id, rd.cost, 'คืนแต้ม (ยกเลิกการขอรับ)', 'refund:' || p_redemption, me::text, 'REFUND', 'reward_redemption', p_redemption);
  else raise exception 'bad action' using errcode = '22023';
  end if;
end $$;
-- own balance + explained history (every row says where the points came from)
create function app.my_points(p_temple uuid)
returns table (balance bigint, created_at timestamptz, amount int, txn_type text, reason text, source_type text)
language sql stable security definer set search_path = public, pg_temp as $$
  select app.point_balance(p_temple, app.current_person_id()), t.created_at, t.amount, t.txn_type, t.reason, t.source_type
    from (select 1) one left join public.boon_point_transactions t on t.temple_id = p_temple and t.person_id = app.current_person_id()
   where app.is_member(p_temple) and not app.is_monastic(p_temple, app.current_person_id())
   order by t.created_at desc nulls last limit 200
$$;

-- ===== Rule-based helpers (no AI model; labelled as automatic summaries from system data) ==========================
-- schedule conflicts (AV §conflicts): visible to availability.view T, or to the monk about himself
create function app.schedule_conflicts(p_temple uuid, p_from timestamptz, p_to timestamptz)
returns table (person_id uuid, display_name text, code text, severity text, a_title text, a_start timestamptz, b_title text, b_start timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); full_view boolean := app.has_permission(p_temple, 'availability.view', 'T');
begin
  if not app.is_member(p_temple) then raise exception 'not a member' using errcode = '42501'; end if;
  return query
  select x.person_id, p.display_name, 'DOUBLE_BOOKED', case when 'invitation' in (x.kind, y.kind) or 'ceremony' in (x.kind, y.kind) then 'HIGH' else 'MEDIUM' end,
         x.title, x.starts_at, y.title, y.starts_at
    from public.schedule_entries x join public.schedule_entries y on y.temple_id = x.temple_id and y.person_id = x.person_id and x.id < y.id
     and x.starts_at < y.ends_at and y.starts_at < x.ends_at and y.status = 'CONFIRMED'
     and not (x.source_id is not null and x.source_type = y.source_type and x.source_id = y.source_id)   -- legs of one invitation never conflict
    join public.persons p on p.id = x.person_id
   where x.temple_id = p_temple and x.status = 'CONFIRMED' and x.starts_at < p_to and x.ends_at > p_from
     and x.kind in ('invitation','ceremony','teaching','class','duty','personal','travel') and y.kind in ('invitation','ceremony','teaching','class','duty','personal','travel')
     and (full_view or x.person_id = me)
  union all
  select a.person_id, p.display_name, 'MANUAL_BLOCK_OVER_COMMITMENT', case when a.state = 'UNAVAILABLE' or s.kind in ('invitation','ceremony') then 'HIGH' else 'MEDIUM' end,
         'สถานะ: ' || a.state, a.valid_from, s.title, s.starts_at
    from public.availability_manual a join public.schedule_entries s on s.temple_id = a.temple_id and s.person_id = a.person_id and s.status = 'CONFIRMED'
     and s.kind in ('ceremony','invitation','travel','teaching','class','duty') and s.starts_at < least(a.valid_until, coalesce(a.truncated_at, 'infinity')) and s.ends_at > a.valid_from
    join public.persons p on p.id = a.person_id
   where a.temple_id = p_temple and a.state in ('UNAVAILABLE','PERSONAL','REST') and s.starts_at < p_to and s.ends_at > p_from
     and (full_view or a.person_id = me);
end $$;
-- event checklist: what is missing, derived from the event's own rows (managers)
create function app.event_checklist(p_temple uuid, p_event uuid) returns table (item text, done boolean, detail text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare e public.events; r jsonb;
begin
  if not app.has_permission(p_temple, 'event.manage') then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into e from public.events where temple_id = p_temple and id = p_event;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  r := app.event_readiness_calc(p_temple, p_event);
  return query values
    ('มีผู้รับผิดชอบงาน', e.lead_person_id is not null, null::text),
    ('ระบุสถานที่จัดงาน', coalesce(btrim(e.venue_text), '') <> '', null),
    ('กำหนดจำนวนคนที่ต้องการ', exists (select 1 from public.event_staffing_targets t where t.temple_id = p_temple and t.event_id = p_event), null),
    ('คนครบตามขั้นต่ำ', coalesce(r->'gates'->>'G-STAFF', 'UNKNOWN') = 'PASS', case when (r->>'volunteer_gap')::int > 0 then 'ยังขาดอาสา ' || (r->>'volunteer_gap') || ' คน' end),
    ('มีรายการงานที่ต้องเตรียม', exists (select 1 from public.quests q where q.temple_id = p_temple and q.event_id = p_event and q.status <> 'CANCELLED'), null),
    ('ไม่มีงานสำคัญที่เลยกำหนด', coalesce(r->'gates'->>'G-CRIT', 'PASS') = 'PASS' and coalesce(r->'gates'->>'G-CHECK', 'PASS') = 'PASS', null),
    ('ได้รับอนุมัติแล้ว', e.status in ('APPROVED','LIVE','COMPLETED'), null);
end $$;

-- ===== Temple Command Center (read model; owns no data; Unknown is explicit) ======================================
-- command_center.view T: all panels; D (facility_manager, department_lead, ceremony_lead, temple_admin panel_staff): no monastic panel.
create function app.command_center(p_temple uuid) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare full_view boolean := app.has_permission(p_temple, 'command_center.view', 'T'); res jsonb := '{}'; tz text; d0 timestamptz; d1 timestamptz;
begin
  if not app.has_permission(p_temple, 'command_center.view', 'D') then raise exception 'not allowed' using errcode = '42501'; end if;
  select coalesce(t.tz, 'Asia/Bangkok') into tz from public.temples t where t.id = p_temple;
  d0 := (now() at time zone tz)::date::timestamp at time zone tz; d1 := d0 + interval '1 day';
  if full_view then
    res := res || jsonb_build_object('monastic', (
      select jsonb_build_object('total', count(*), 'bhikkhu', count(*) filter (where m.monastic_kind = 'bhikkhu'),
        'samanera', count(*) filter (where m.monastic_kind = 'samanera'),
        'by_state', coalesce((select jsonb_object_agg(st, n) from (select r.state as st, count(*) as n from public.memberships mm
            cross join lateral app.resolve_availability(p_temple, mm.person_id, now()) r
            where mm.temple_id = p_temple and mm.status = 'active' and mm.monastic_kind <> 'none' group by r.state) z), '{}'))
      from public.memberships m where m.temple_id = p_temple and m.status = 'active' and m.monastic_kind <> 'none'),
      'invitations', jsonb_build_object(
        'today_confirmed', (select count(*) from public.invitations i where i.temple_id = p_temple and i.status in ('CONFIRMED','IN_PROGRESS') and i.starts_at >= d0 and i.starts_at < d1),
        'waiting_decision', (select count(*) from public.invitations i where i.temple_id = p_temple and i.status in ('RECEIVED','REVIEWING','TEAM_PROPOSED')),
        'release_requests', (select count(*) from public.invitation_team t join public.invitations i on i.temple_id = t.temple_id and i.id = t.invitation_id
                             where t.temple_id = p_temple and t.monk_response = 'RELEASE_REQUESTED' and i.status in ('CONFIRMED','IN_PROGRESS'))));
  end if;
  res := res || jsonb_build_object(
    'staff', jsonb_build_object(
      'total', (select count(*) from public.memberships m where m.temple_id = p_temple and m.status = 'active' and m.monastic_kind = 'none'
                and exists (select 1 from public.membership_roles r where r.temple_id = m.temple_id and r.membership_id = m.id and r.role_code not in ('community_member','volunteer','lay_resident'))),
      'checked_in_today', (select count(distinct c.person_id) from public.checkins c join public.memberships m on m.temple_id = c.temple_id and m.person_id = c.person_id
                           where c.temple_id = p_temple and m.monastic_kind = 'none' and c.checked_in_at >= d0),
      'on_leave', null, 'note', 'สถานะลา/เวรของเจ้าหน้าที่ยังไม่มีในระบบ จึงแสดงว่าไม่ทราบ'),
    'quests', (select jsonb_build_object('all', count(*), 'completed', count(*) filter (where q.status = 'COMPLETED'),
        'active', count(*) filter (where q.status = 'OPEN'),
        'overdue', count(*) filter (where q.status = 'OPEN' and q.due_at < now()),
        'unassigned', count(*) filter (where q.status = 'OPEN' and not exists (select 1 from public.quest_assignments a where a.temple_id = q.temple_id and a.quest_id = q.id and a.status <> 'CANCELLED')),
        'blocked', (select count(*) from public.quest_assignments a where a.temple_id = p_temple and a.status = 'BLOCKED'))
      from public.quests q where q.temple_id = p_temple and q.status <> 'CANCELLED'),
    'events', jsonb_build_object(
      'today', (select count(*) from public.events e where e.temple_id = p_temple and e.status in ('APPROVED','LIVE') and e.starts_at < d1 and e.ends_at > d0),
      'next_48h', (select count(*) from public.events e where e.temple_id = p_temple and e.status in ('PLANNING','APPROVED') and e.starts_at between now() and now() + interval '48 hours'),
      'not_ready', (select count(*) from public.events e where e.temple_id = p_temple and e.status in ('PLANNING','APPROVED') and e.starts_at > now()
                    and app.event_readiness_calc(p_temple, e.id)->>'state' = 'NOT_READY'),
      'volunteers_missing', (select coalesce(sum((app.event_readiness_calc(p_temple, e.id)->>'volunteer_gap')::int), 0) from public.events e
                             where e.temple_id = p_temple and e.status in ('PLANNING','APPROVED') and e.starts_at > now())),
    'facility', jsonb_build_object(
      'buildings', (select count(*) from public.buildings b where b.temple_id = p_temple and b.status <> 'RETIRED'),
      'buildings_closed', (select count(*) from public.buildings b where b.temple_id = p_temple and b.status in ('CLOSED_TEMPORARILY','UNDER_RENOVATION')),
      'parking_lots', (select count(*) from public.parking_lots l where l.temple_id = p_temple and l.active),
      'maintenance', null, 'assets', null, 'vehicles', null, 'kitchen', null, 'inventory', null,
      'note', 'งานซ่อม ทรัพย์สิน ยานพาหนะ ครัว และคลัง ยังไม่มีในระบบ จึงแสดงว่าไม่ทราบ'),
    'community', jsonb_build_object(
      'followers', (select count(*) from public.memberships m join public.membership_roles r on r.temple_id = m.temple_id and r.membership_id = m.id
                    where m.temple_id = p_temple and m.status = 'active' and r.role_code = 'community_member'),
      'volunteers_confirmed_upcoming', (select count(distinct p.person_id) from public.event_participants p join public.events e on e.temple_id = p.temple_id and e.id = p.event_id
                    join public.event_staffing_targets t on t.temple_id = p.temple_id and t.id = p.target_id
                    where p.temple_id = p_temple and p.status = 'CONFIRMED' and t.category = 'volunteer' and e.ends_at > now()),
      'points_issued_30d', (select coalesce(sum(amount), 0) from public.boon_point_transactions b where b.temple_id = p_temple and b.amount > 0
                    and b.txn_type in ('EARN','MANUAL_AWARD') and b.created_at > now() - interval '30 days'),
      'redemptions_waiting', (select count(*) from public.reward_redemptions r where r.temple_id = p_temple and r.status = 'REQUESTED'),
      'points_on_hold', (select count(*) from public.point_holds h where h.temple_id = p_temple and h.status = 'HELD'),
      'contact_unanswered', (select count(*) from public.temple_contact_threads c where c.temple_id = p_temple and c.status in ('NEW','ASSIGNED'))),
    'as_of', now(), 'full_view', full_view);
  return res;
end $$;
-- daily summary text parts (rule-based; the UI labels it "สรุปอัตโนมัติจากข้อมูลในระบบ ไม่ได้ใช้ AI เขียน")
create function app.daily_summary(p_temple uuid) returns table (line text, severity text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare c jsonb := app.command_center(p_temple);
begin
  return query select l, s from (values
    (case when (c->'events'->>'today')::int > 0 then 'วันนี้มีงาน ' || (c->'events'->>'today') || ' งาน' end, 'info'),
    (case when (c->'events'->>'not_ready')::int > 0 then 'งานที่ยังไม่พร้อม ' || (c->'events'->>'not_ready') || ' งาน' end, 'warn'),
    (case when (c->'events'->>'volunteers_missing')::int > 0 then 'ยังขาดอาสาสมัครรวม ' || (c->'events'->>'volunteers_missing') || ' คน' end, 'warn'),
    (case when (c->'quests'->>'overdue')::int > 0 then 'งานเลยกำหนด ' || (c->'quests'->>'overdue') || ' งาน' end, 'warn'),
    (case when (c->'quests'->>'unassigned')::int > 0 then 'งานที่ยังไม่มีคนรับ ' || (c->'quests'->>'unassigned') || ' งาน' end, 'info'),
    (case when c ? 'invitations' and (c->'invitations'->>'today_confirmed')::int > 0 then 'กิจนิมนต์วันนี้ ' || (c->'invitations'->>'today_confirmed') || ' รายการ' end, 'info'),
    (case when c ? 'invitations' and (c->'invitations'->>'waiting_decision')::int > 0 then 'กิจนิมนต์รอตัดสินใจ ' || (c->'invitations'->>'waiting_decision') || ' รายการ' end, 'warn'),
    (case when c ? 'invitations' and (c->'invitations'->>'release_requests')::int > 0 then 'พระแจ้งติดขัด ' || (c->'invitations'->>'release_requests') || ' รายการ' end, 'warn'),
    (case when c ? 'monastic' and (c->'monastic'->'by_state'->>'UNKNOWN')::int > 0 then 'ไม่ทราบสถานะพระ ' || (c->'monastic'->'by_state'->>'UNKNOWN') || ' รูป' end, 'info'),
    (case when (c->'community'->>'contact_unanswered')::int > 0 then 'ข้อความถึงวัดที่ยังไม่ตอบ ' || (c->'community'->>'contact_unanswered') || ' ข้อความ' end, 'warn'),
    (case when (c->'community'->>'redemptions_waiting')::int > 0 then 'รอมอบของที่ระลึก ' || (c->'community'->>'redemptions_waiting') || ' รายการ' end, 'info'),
    (case when (c->'community'->>'points_on_hold')::int > 0 then 'แต้มรอตรวจ ' || (c->'community'->>'points_on_hold') || ' รายการ' end, 'warn')
  ) v(l, s) where l is not null;
end $$;

-- ===== community gaps found by the UI agent: names for my block list and for the admin suspension list =====
create function app.my_blocks() returns table (person_id uuid, display_name text, blocked_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select b.blocked, coalesce(cp.display_name, p.display_name), b.created_at from public.person_blocks b
    join public.persons p on p.id = b.blocked left join public.community_profiles cp on cp.person_id = b.blocked
   where b.blocker = app.current_person_id() order by b.created_at desc
$$;
create function app.suspensions_list() returns table (person_id uuid, display_name text, reason text, until timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select s.person_id, coalesce(cp.display_name, p.display_name), s.reason, s.until, s.created_at from public.community_suspensions s
    join public.persons p on p.id = s.person_id left join public.community_profiles cp on cp.person_id = s.person_id order by s.created_at desc;
end $$;
grant execute on function app.my_blocks(), app.suspensions_list() to authenticated;

-- ===== RLS ===============================================================================================================
do $$ declare t text; begin
  foreach t in array array['buildings','zones','point_holds','reward_catalog','reward_redemptions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop; end $$;
create policy buildings_sel on public.buildings for select to authenticated using (
  app.is_member(temple_id) and (app.has_permission(temple_id, 'asset.view')
    or (confirmed_at is not null and (public_visibility = 'PUBLIC' or (public_visibility = 'MONASTIC_ONLY' and app.is_monastic(temple_id, app.current_person_id()))))));
create policy zones_sel on public.zones for select to authenticated using (app.is_member(temple_id) and app.has_permission(temple_id, 'asset.view'));
create policy holds_sel on public.point_holds for select to authenticated using (
  (person_id = app.current_person_id() and app.is_member(temple_id)) or app.has_permission(temple_id, 'points.award_community', 'D'));
create policy rewards_sel on public.reward_catalog for select to authenticated using (app.is_member(temple_id) and (active or app.has_permission(temple_id, 'reward.manage', 'T')));
create policy redemptions_sel on public.reward_redemptions for select to authenticated using (
  (person_id = app.current_person_id() and app.is_member(temple_id)) or app.has_permission(temple_id, 'reward.manage', 'T'));
grant select on public.buildings, public.zones, public.point_holds, public.reward_catalog, public.reward_redemptions to authenticated;

grant execute on function app.polygon_ok(jsonb), app.save_building(uuid, uuid, text, text, text, text, text, jsonb, text), app.confirm_building(uuid, uuid),
  app.save_zone(uuid, uuid, text, text, text), app.map_buildings(uuid), app.award_points(uuid, uuid, int, text, uuid), app.review_hold(uuid, uuid, boolean),
  app.save_reward(uuid, uuid, text, text, int, int, int, boolean), app.redeem_reward(uuid, uuid, uuid), app.decide_redemption(uuid, uuid, text),
  app.my_points(uuid), app.schedule_conflicts(uuid, timestamptz, timestamptz), app.event_checklist(uuid, uuid), app.command_center(uuid),
  app.daily_summary(uuid) to authenticated;
grant execute on function public.temple_public_map(text) to anon, authenticated;

-- ===== 0012_invitation_view_fixes.sql =====
-- 0012 Gaps reported by the monk-features UI agent:
--  * invitation team names for everyone who may see the invitation (persons RLS hides names from scope-A monks)
--  * suggest_team readable by confirmers too (invitation.confirm), so a confirmer always sees the warnings

create function app.invitation_team_view(p_temple uuid, p_inv uuid)
returns table (person_id uuid, display_name text, role text, monk_response text)
language sql stable security definer set search_path = public, pg_temp as $$
  select t.person_id, p.display_name, t.role, t.monk_response
    from public.invitation_team t join public.persons p on p.id = t.person_id
   where t.temple_id = p_temple and t.invitation_id = p_inv
     and (app.has_permission(p_temple, 'invitation.view', 'T')
          or (app.has_permission(p_temple, 'invitation.view') and exists (select 1 from public.invitation_team me
                where me.temple_id = p_temple and me.invitation_id = p_inv and me.person_id = app.current_person_id())))
   order by (t.role = 'LEAD') desc, p.display_name
$$;
grant execute on function app.invitation_team_view(uuid, uuid) to authenticated;

do $$ declare src text; begin
  select pg_get_functiondef('app.suggest_team(uuid, uuid)'::regprocedure) into src;
  src := replace(src, 'if not app.has_permission(p_temple, ''invitation.manage'', ''T'') then raise exception',
                      'if not (app.has_permission(p_temple, ''invitation.manage'', ''T'') or app.has_permission(p_temple, ''invitation.confirm'', ''T'')) then raise exception');
  execute src;
end $$;

-- ===== 0013_critical_reconfirm.sql =====
-- 0013 Gap found by the new browser E2E: re-confirming an EXPIRED critical field (donation account) needed only one
-- person, bypassing the two-person rule of advance_field_value. Now a critical re-confirmation takes two steps:
-- step 1 by anyone the temple allows (temple.settings T) records first_approved_by; step 2 must be the abbot and a
-- different person. Until step 2 the value stays expired (hidden from the public). Returns 'first' or 'done'.

alter function app.reconfirm_field_value(uuid) rename to zz_retired_reconfirm_field_value_0013;
revoke all on function app.zz_retired_reconfirm_field_value_0013(uuid) from public, anon, authenticated;
create function app.reconfirm_field_value(p_value uuid) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; me uuid := app.current_person_id();
begin
  select v.temple_id, v.status, v.verified_at, v.first_approved_by, v.first_approved_at, c.expiry_days, c.risk
    into r from public.temple_field_values v join public.data_field_catalog c using (field_key) where v.id = p_value;
  if not found or r.status not in ('TEMPLE_CONFIRMED', 'PUBLISHED') then raise exception 'not confirmed' using errcode = '22023'; end if;
  if not app.has_permission(r.temple_id, 'temple.settings', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  if r.risk = 'critical' then
    if r.first_approved_at is null or r.first_approved_at <= r.verified_at then      -- no pending step 1 in this cycle
      perform set_config('app.change_reason', 'reconfirm step 1 (critical)', true);
      update public.temple_field_values set first_approved_by = me, first_approved_at = now() where id = p_value;
      return 'first';
    end if;
    if r.first_approved_by = me then raise exception 'second approval must be a different person' using errcode = '42501'; end if;
    if not app.is_temple_abbot(r.temple_id) then raise exception 'second approval must be the abbot' using errcode = '42501'; end if;
  end if;
  perform set_config('app.change_reason', 'reconfirmed by temple', true);
  update public.temple_field_values set verified_by = me, verified_at = now(), last_reviewed_at = now(),
         verification_expires_at = case when r.expiry_days is null then null else now() + make_interval(days => r.expiry_days) end
   where id = p_value;
  return 'done';
end $$;
grant execute on function app.reconfirm_field_value(uuid) to authenticated;

-- ===== 0014_map_unknown_counts_redeem_replay.sql =====
-- 0014 Fixes found while building the map and points UI:
--  * app.map_buildings returned 0 for events/quests the caller cannot see (RLS filters them silently). "Unknown" must never be
--    shown as 0: the counts are now NULL unless the caller can see every event (event.view T) / every quest (quest.view T).
--    events_today now means "today in the temple's time zone" (it was "the next 24 hours").
--  * app.redeem_reward: replaying the same request id (double tap, retry) returns the first redemption instead of failing.

create or replace function app.map_buildings(p_temple uuid)
returns table (id uuid, code text, name_th text, kind text, status text, public_visibility text, polygon2d jsonb, confirmed boolean,
               events_today bigint, open_quests bigint)
language sql stable security invoker set search_path = public, pg_temp as $$
  with tz as (select coalesce((select t.tz from public.temples t where t.id = p_temple), 'Asia/Bangkok') as z),
  day_end as (select (((now() at time zone z)::date + 1)::timestamp at time zone z) as e from tz),
  can as (select app.has_permission(p_temple, 'event.view', 'T') as ev, app.has_permission(p_temple, 'quest.view', 'T') as qv)
  select b.id, b.code, b.name_th, b.kind, b.status, b.public_visibility, b.polygon2d, b.confirmed_at is not null,
    case when can.ev then (select count(*) from public.events e where e.temple_id = b.temple_id and e.building_id = b.id
                             and e.status in ('APPROVED','LIVE') and e.starts_at < day_end.e and e.ends_at > now()) end,
    case when can.qv then (select count(*) from public.quests q where q.temple_id = b.temple_id and q.building_id = b.id and q.status = 'OPEN') end
    from public.buildings b, can, day_end
   where b.temple_id = p_temple and b.status <> 'RETIRED'
   order by b.code
$$;

create or replace function app.redeem_reward(p_temple uuid, p_reward uuid, p_request uuid) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); r public.reward_catalog; id uuid; n bigint;
begin
  if not app.has_permission(p_temple, 'community.participate') or app.is_monastic(p_temple, me) then raise exception 'FORBIDDEN_MONASTIC_OR_NOT_MEMBER' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_temple::text || me::text || 'boon_point_transactions', 0));   -- same lock as ledger_guard
  -- replay of the same request: return the redemption it already created (no second charge, no second stock decrement)
  select source_id into id from public.boon_point_transactions
   where temple_id = p_temple and person_id = me and idempotency_key = 'redeem:' || p_request and source_type = 'reward_redemption';
  if found then return id; end if;
  select * into r from public.reward_catalog where temple_id = p_temple and reward_catalog.id = p_reward for update;
  if not found or not r.active then raise exception 'reward not available' using errcode = 'P0002'; end if;
  if r.stock < 1 then raise exception 'OUT_OF_STOCK' using errcode = '23514'; end if;
  select count(*) into n from public.reward_redemptions where temple_id = p_temple and reward_id = p_reward and person_id = me and status <> 'CANCELLED';
  if r.per_person_limit is not null and n >= r.per_person_limit then raise exception 'LIMIT_REACHED' using errcode = '23514'; end if;
  if app.point_balance(p_temple, me) < r.cost then raise exception 'INSUFFICIENT_POINTS' using errcode = '23514'; end if;
  insert into public.reward_redemptions(temple_id, reward_id, person_id, cost) values (p_temple, p_reward, me, r.cost) returning reward_redemptions.id into id;
  insert into public.boon_point_transactions(temple_id, person_id, amount, reason, idempotency_key, created_by, txn_type, source_type, source_id)
  values (p_temple, me, -r.cost, 'ของที่ระลึกจากการร่วมกิจกรรม: ' || r.name_th, 'redeem:' || p_request, me::text, 'REDEEM', 'reward_redemption', id);
  update public.reward_catalog set stock = stock - 1 where temple_id = p_temple and reward_catalog.id = p_reward;
  return id;
end $$;


-- ===== seed: roles and permissions (definitions only) =====
-- GENERATED by supabase/seed/gen_roles_seed.py from docs/master/role_permissions.yaml. Do not edit.
insert into public.roles(code, mode) values ('abbot', 'monastic');
insert into public.roles(code, mode) values ('deputy_abbot', 'monastic');
insert into public.roles(code, mode) values ('abbot_assistant', 'monastic');
insert into public.roles(code, mode) values ('monk_secretary', 'monastic');
insert into public.roles(code, mode) values ('bhikkhu', 'monastic');
insert into public.roles(code, mode) values ('samanera', 'monastic');
insert into public.roles(code, mode) values ('visiting_monastic', 'monastic');
insert into public.roles(code, mode) values ('waiyawatchakon', 'community_staff');
insert into public.roles(code, mode) values ('facility_manager', 'community_staff');
insert into public.roles(code, mode) values ('technician', 'community_staff');
insert into public.roles(code, mode) values ('department_lead', 'community_staff');
insert into public.roles(code, mode) values ('housekeeper', 'community_staff');
insert into public.roles(code, mode) values ('kitchen_staff', 'community_staff');
insert into public.roles(code, mode) values ('gardener', 'community_staff');
insert into public.roles(code, mode) values ('driver', 'community_staff');
insert into public.roles(code, mode) values ('ceremony_lead', 'community_staff');
insert into public.roles(code, mode) values ('ceremony_team', 'community_staff');
insert into public.roles(code, mode) values ('undertaker', 'community_staff');
insert into public.roles(code, mode) values ('office_staff', 'community_staff');
insert into public.roles(code, mode) values ('accountant', 'community_staff');
insert into public.roles(code, mode) values ('temple_admin', 'community_staff');
insert into public.roles(code, mode) values ('security_guard', 'community_staff');
insert into public.roles(code, mode) values ('traffic_staff', 'community_staff');
insert into public.roles(code, mode) values ('staff_general', 'community_staff');
insert into public.roles(code, mode) values ('temple_boy', 'community_staff');
insert into public.roles(code, mode) values ('lay_resident', 'community_staff');
insert into public.roles(code, mode) values ('volunteer', 'community_staff');
insert into public.roles(code, mode) values ('community_member', 'community_staff');
insert into public.permissions(code, restricted) values ('quest.view', false);
insert into public.permissions(code, restricted) values ('quest.create', false);
insert into public.permissions(code, restricted) values ('quest.request', false);
insert into public.permissions(code, restricted) values ('quest.assign', false);
insert into public.permissions(code, restricted) values ('quest.complete', false);
insert into public.permissions(code, restricted) values ('quest.verify', false);
insert into public.permissions(code, restricted) values ('quest.manage', false);
insert into public.permissions(code, restricted) values ('event.view', false);
insert into public.permissions(code, restricted) values ('event.manage', false);
insert into public.permissions(code, restricted) values ('event.approve', true);
insert into public.permissions(code, restricted) values ('event.volunteer_approve', false);
insert into public.permissions(code, restricted) values ('invitation.view', false);
insert into public.permissions(code, restricted) values ('invitation.manage', false);
insert into public.permissions(code, restricted) values ('invitation.confirm', true);
insert into public.permissions(code, restricted) values ('ceremony.confirm_monks', true);
insert into public.permissions(code, restricted) values ('funeral.assigned.view', false);
insert into public.permissions(code, restricted) values ('funeral.register.view', true);
insert into public.permissions(code, restricted) values ('schedule.view', false);
insert into public.permissions(code, restricted) values ('schedule.manage', false);
insert into public.permissions(code, restricted) values ('availability.view', false);
insert into public.permissions(code, restricted) values ('availability.set_self', false);
insert into public.permissions(code, restricted) values ('availability.set_others', false);
insert into public.permissions(code, restricted) values ('presence.view', false);
insert into public.permissions(code, restricted) values ('presence.set_self', false);
insert into public.permissions(code, restricted) values ('presence.set_others', false);
insert into public.permissions(code, restricted) values ('shift.manage', false);
insert into public.permissions(code, restricted) values ('headcount.view', false);
insert into public.permissions(code, restricted) values ('headcount.adjust', false);
insert into public.permissions(code, restricted) values ('command_center.view', false);
insert into public.permissions(code, restricted) values ('member.view', false);
insert into public.permissions(code, restricted) values ('member.manage', true);
insert into public.permissions(code, restricted) values ('asset.view', false);
insert into public.permissions(code, restricted) values ('asset.manage', false);
insert into public.permissions(code, restricted) values ('maintenance.report', false);
insert into public.permissions(code, restricted) values ('maintenance.manage', false);
insert into public.permissions(code, restricted) values ('inventory.view', false);
insert into public.permissions(code, restricted) values ('inventory.record', false);
insert into public.permissions(code, restricted) values ('inventory.manage', false);
insert into public.permissions(code, restricted) values ('parking.report', false);
insert into public.permissions(code, restricted) values ('parking.manage', false);
insert into public.permissions(code, restricted) values ('vehicle.view', false);
insert into public.permissions(code, restricted) values ('vehicle.manage', false);
insert into public.permissions(code, restricted) values ('finance.view', true);
insert into public.permissions(code, restricted) values ('finance.approve', true);
insert into public.permissions(code, restricted) values ('points.award_community', false);
insert into public.permissions(code, restricted) values ('reward.manage', false);
insert into public.permissions(code, restricted) values ('moderation.manage', false);
insert into public.permissions(code, restricted) values ('contact_inbox.manage', false);
insert into public.permissions(code, restricted) values ('community.participate', false);
insert into public.permissions(code, restricted) values ('community.p2p_chat', false);
insert into public.permissions(code, restricted) values ('community.calls', false);
insert into public.permissions(code, restricted) values ('community.public_profile', false);
insert into public.permissions(code, restricted) values ('security.log', false);
insert into public.permissions(code, restricted) values ('security.log.view', true);
insert into public.permissions(code, restricted) values ('security.incident.view', true);
insert into public.permissions(code, restricted) values ('document.view', false);
insert into public.permissions(code, restricted) values ('document.manage', false);
insert into public.permissions(code, restricted) values ('booking.manage', false);
insert into public.permissions(code, restricted) values ('report.view', false);
insert into public.permissions(code, restricted) values ('audit.view', true);
insert into public.permissions(code, restricted) values ('temple.settings', true);
insert into public.role_permissions(role_code, permission_code, scope, scope_rank, condition) values
('abbot', 'quest.view', 'T', 3, null),
('abbot_assistant', 'quest.view', 'T', 3, null),
('accountant', 'quest.view', 'A', 1, null),
('bhikkhu', 'quest.view', 'S+P', 1, null),
('ceremony_lead', 'quest.view', 'D', 2, null),
('ceremony_team', 'quest.view', 'A', 1, null),
('community_member', 'quest.view', 'P', 1, null),
('department_lead', 'quest.view', 'D', 2, null),
('deputy_abbot', 'quest.view', 'T', 3, null),
('driver', 'quest.view', 'A', 1, null),
('facility_manager', 'quest.view', 'D', 2, null),
('gardener', 'quest.view', 'A', 1, null),
('housekeeper', 'quest.view', 'A', 1, null),
('kitchen_staff', 'quest.view', 'A', 1, null),
('lay_resident', 'quest.view', 'A+P', 1, null),
('monk_secretary', 'quest.view', 'T', 3, null),
('office_staff', 'quest.view', 'D', 2, null),
('samanera', 'quest.view', 'S', 1, null),
('security_guard', 'quest.view', 'A', 1, null),
('staff_general', 'quest.view', 'A', 1, null),
('technician', 'quest.view', 'A', 1, null),
('temple_admin', 'quest.view', 'A', 1, null),
('temple_boy', 'quest.view', 'A', 1, null),
('traffic_staff', 'quest.view', 'A', 1, null),
('undertaker', 'quest.view', 'A', 1, null),
('visiting_monastic', 'quest.view', 'S+P', 1, null),
('volunteer', 'quest.view', 'A+P', 1, null),
('waiyawatchakon', 'quest.view', 'D', 2, null),
('abbot', 'quest.create', 'T', 3, null),
('abbot_assistant', 'quest.create', 'T', 3, null),
('bhikkhu', 'quest.create', 'S', 1, null),
('ceremony_lead', 'quest.create', 'D', 2, null),
('department_lead', 'quest.create', 'D', 2, null),
('deputy_abbot', 'quest.create', 'T', 3, null),
('facility_manager', 'quest.create', 'D', 2, null),
('monk_secretary', 'quest.create', 'T', 3, null),
('office_staff', 'quest.create', 'D', 2, null),
('bhikkhu', 'quest.request', 'T', 3, null),
('driver', 'quest.request', 'T', 3, null),
('gardener', 'quest.request', 'T', 3, null),
('housekeeper', 'quest.request', 'T', 3, null),
('kitchen_staff', 'quest.request', 'T', 3, null),
('office_staff', 'quest.request', 'T', 3, null),
('security_guard', 'quest.request', 'T', 3, null),
('staff_general', 'quest.request', 'T', 3, null),
('technician', 'quest.request', 'T', 3, null),
('abbot', 'quest.assign', 'T', 3, null),
('abbot_assistant', 'quest.assign', 'T', 3, null),
('ceremony_lead', 'quest.assign', 'D', 2, null),
('department_lead', 'quest.assign', 'D', 2, null),
('deputy_abbot', 'quest.assign', 'T', 3, null),
('facility_manager', 'quest.assign', 'D', 2, null),
('monk_secretary', 'quest.assign', 'T', 3, null),
('abbot', 'quest.complete', 'S', 1, null),
('abbot_assistant', 'quest.complete', 'S', 1, null),
('accountant', 'quest.complete', 'S', 1, null),
('bhikkhu', 'quest.complete', 'S', 1, null),
('ceremony_lead', 'quest.complete', 'S', 1, null),
('ceremony_team', 'quest.complete', 'S', 1, null),
('community_member', 'quest.complete', 'S', 1, null),
('department_lead', 'quest.complete', 'S', 1, null),
('deputy_abbot', 'quest.complete', 'S', 1, null),
('driver', 'quest.complete', 'S', 1, null),
('facility_manager', 'quest.complete', 'S', 1, null),
('gardener', 'quest.complete', 'S', 1, null),
('housekeeper', 'quest.complete', 'S', 1, null),
('kitchen_staff', 'quest.complete', 'S', 1, null),
('lay_resident', 'quest.complete', 'S', 1, null),
('monk_secretary', 'quest.complete', 'S', 1, null),
('office_staff', 'quest.complete', 'S', 1, null),
('samanera', 'quest.complete', 'S', 1, null),
('security_guard', 'quest.complete', 'S', 1, null),
('staff_general', 'quest.complete', 'S', 1, null),
('technician', 'quest.complete', 'S', 1, null),
('temple_admin', 'quest.complete', 'S', 1, null),
('temple_boy', 'quest.complete', 'S', 1, null),
('traffic_staff', 'quest.complete', 'S', 1, null),
('undertaker', 'quest.complete', 'S', 1, null),
('visiting_monastic', 'quest.complete', 'S', 1, null),
('volunteer', 'quest.complete', 'S', 1, null),
('waiyawatchakon', 'quest.complete', 'S', 1, null),
('abbot', 'quest.verify', 'T', 3, null),
('abbot_assistant', 'quest.verify', 'T', 3, null),
('ceremony_lead', 'quest.verify', 'D', 2, null),
('department_lead', 'quest.verify', 'D', 2, null),
('deputy_abbot', 'quest.verify', 'T', 3, null),
('facility_manager', 'quest.verify', 'D', 2, null),
('monk_secretary', 'quest.verify', 'T', 3, null),
('abbot', 'quest.manage', 'T', 3, null),
('abbot_assistant', 'quest.manage', 'T', 3, null),
('ceremony_lead', 'quest.manage', 'D', 2, null),
('department_lead', 'quest.manage', 'D', 2, null),
('deputy_abbot', 'quest.manage', 'T', 3, null),
('facility_manager', 'quest.manage', 'D', 2, null),
('abbot', 'event.view', 'T', 3, null),
('abbot_assistant', 'event.view', 'T', 3, null),
('accountant', 'event.view', 'T', 3, null),
('bhikkhu', 'event.view', 'T', 3, null),
('ceremony_lead', 'event.view', 'T', 3, null),
('ceremony_team', 'event.view', 'T', 3, null),
('community_member', 'event.view', 'P', 1, null),
('department_lead', 'event.view', 'T', 3, null),
('deputy_abbot', 'event.view', 'T', 3, null),
('driver', 'event.view', 'T', 3, null),
('facility_manager', 'event.view', 'T', 3, null),
('gardener', 'event.view', 'T', 3, null),
('housekeeper', 'event.view', 'T', 3, null),
('kitchen_staff', 'event.view', 'T', 3, null),
('lay_resident', 'event.view', 'T', 3, null),
('monk_secretary', 'event.view', 'T', 3, null),
('office_staff', 'event.view', 'T', 3, null),
('samanera', 'event.view', 'T', 3, null),
('security_guard', 'event.view', 'T', 3, null),
('staff_general', 'event.view', 'T', 3, null),
('technician', 'event.view', 'T', 3, null),
('temple_admin', 'event.view', 'T', 3, null),
('temple_boy', 'event.view', 'T', 3, null),
('traffic_staff', 'event.view', 'T', 3, null),
('undertaker', 'event.view', 'A', 1, null),
('visiting_monastic', 'event.view', 'T', 3, null),
('volunteer', 'event.view', 'T', 3, null),
('waiyawatchakon', 'event.view', 'T', 3, null),
('abbot', 'event.manage', 'T', 3, null),
('abbot_assistant', 'event.manage', 'T', 3, null),
('ceremony_lead', 'event.manage', 'D', 2, null),
('department_lead', 'event.manage', 'D', 2, null),
('deputy_abbot', 'event.manage', 'T', 3, null),
('facility_manager', 'event.manage', 'D', 2, null),
('monk_secretary', 'event.manage', 'T', 3, null),
('abbot', 'event.approve', 'T', 3, null),
('abbot_assistant', 'event.approve', 'T', 3, null),
('deputy_abbot', 'event.approve', 'T', 3, null),
('monk_secretary', 'event.approve', 'T', 3, 'delegated'),
('ceremony_lead', 'event.volunteer_approve', 'D', 2, null),
('department_lead', 'event.volunteer_approve', 'D', 2, null),
('facility_manager', 'event.volunteer_approve', 'D', 2, null),
('abbot', 'invitation.view', 'T', 3, null),
('abbot_assistant', 'invitation.view', 'T', 3, null),
('bhikkhu', 'invitation.view', 'A', 1, null),
('deputy_abbot', 'invitation.view', 'T', 3, null),
('driver', 'invitation.view', 'A', 1, null),
('monk_secretary', 'invitation.view', 'T', 3, null),
('office_staff', 'invitation.view', 'T', 3, null),
('abbot', 'invitation.manage', 'T', 3, null),
('abbot_assistant', 'invitation.manage', 'T', 3, null),
('deputy_abbot', 'invitation.manage', 'T', 3, null),
('monk_secretary', 'invitation.manage', 'T', 3, null),
('office_staff', 'invitation.manage', 'T', 3, null),
('abbot', 'invitation.confirm', 'T', 3, null),
('abbot_assistant', 'invitation.confirm', 'T', 3, null),
('deputy_abbot', 'invitation.confirm', 'T', 3, null),
('monk_secretary', 'invitation.confirm', 'T', 3, 'delegated'),
('abbot', 'ceremony.confirm_monks', 'T', 3, null),
('abbot_assistant', 'ceremony.confirm_monks', 'T', 3, null),
('deputy_abbot', 'ceremony.confirm_monks', 'T', 3, null),
('monk_secretary', 'ceremony.confirm_monks', 'T', 3, 'delegated'),
('abbot', 'funeral.assigned.view', 'T', 3, null),
('abbot_assistant', 'funeral.assigned.view', 'T', 3, null),
('bhikkhu', 'funeral.assigned.view', 'A', 1, null),
('ceremony_lead', 'funeral.assigned.view', 'D', 2, null),
('ceremony_team', 'funeral.assigned.view', 'A', 1, null),
('deputy_abbot', 'funeral.assigned.view', 'T', 3, null),
('monk_secretary', 'funeral.assigned.view', 'T', 3, null),
('samanera', 'funeral.assigned.view', 'A', 1, null),
('undertaker', 'funeral.assigned.view', 'A', 1, null),
('abbot', 'funeral.register.view', 'T', 3, null),
('office_staff', 'funeral.register.view', 'T', 3, 'create_edit'),
('abbot', 'schedule.view', 'T', 3, null),
('abbot_assistant', 'schedule.view', 'T', 3, null),
('accountant', 'schedule.view', 'S', 1, null),
('bhikkhu', 'schedule.view', 'S+P', 1, null),
('ceremony_lead', 'schedule.view', 'P', 1, null),
('ceremony_team', 'schedule.view', 'S', 1, null),
('community_member', 'schedule.view', 'P', 1, null),
('department_lead', 'schedule.view', 'S', 1, null),
('deputy_abbot', 'schedule.view', 'T', 3, null),
('driver', 'schedule.view', 'S', 1, null),
('facility_manager', 'schedule.view', 'P', 1, null),
('gardener', 'schedule.view', 'S', 1, null),
('housekeeper', 'schedule.view', 'S', 1, null),
('kitchen_staff', 'schedule.view', 'S', 1, null),
('lay_resident', 'schedule.view', 'S', 1, null),
('monk_secretary', 'schedule.view', 'T', 3, null),
('office_staff', 'schedule.view', 'T', 3, null),
('samanera', 'schedule.view', 'S+P', 1, null),
('security_guard', 'schedule.view', 'S', 1, null),
('staff_general', 'schedule.view', 'S', 1, null),
('technician', 'schedule.view', 'S', 1, null),
('temple_admin', 'schedule.view', 'S', 1, null),
('temple_boy', 'schedule.view', 'S', 1, null),
('traffic_staff', 'schedule.view', 'S', 1, null),
('undertaker', 'schedule.view', 'S', 1, null),
('visiting_monastic', 'schedule.view', 'S+P', 1, null),
('volunteer', 'schedule.view', 'S', 1, null),
('waiyawatchakon', 'schedule.view', 'S', 1, null),
('abbot', 'schedule.manage', 'T', 3, null),
('abbot_assistant', 'schedule.manage', 'T', 3, null),
('ceremony_lead', 'schedule.manage', 'D', 2, 'kind_ceremony'),
('deputy_abbot', 'schedule.manage', 'T', 3, null),
('monk_secretary', 'schedule.manage', 'T', 3, null),
('office_staff', 'schedule.manage', 'T', 3, null),
('abbot', 'availability.view', 'T', 3, null),
('abbot_assistant', 'availability.view', 'T', 3, null),
('bhikkhu', 'availability.view', 'C', 1, null),
('ceremony_lead', 'availability.view', 'C', 1, null),
('deputy_abbot', 'availability.view', 'T', 3, null),
('driver', 'availability.view', 'A', 1, null),
('monk_secretary', 'availability.view', 'T', 3, null),
('office_staff', 'availability.view', 'C', 1, null),
('abbot', 'availability.set_self', 'S', 1, null),
('abbot_assistant', 'availability.set_self', 'S', 1, null),
('bhikkhu', 'availability.set_self', 'S', 1, null),
('deputy_abbot', 'availability.set_self', 'S', 1, null),
('monk_secretary', 'availability.set_self', 'S', 1, null),
('samanera', 'availability.set_self', 'S', 1, null),
('visiting_monastic', 'availability.set_self', 'S', 1, null),
('abbot', 'availability.set_others', 'T', 3, null),
('abbot_assistant', 'availability.set_others', 'T', 3, null),
('deputy_abbot', 'availability.set_others', 'T', 3, null),
('monk_secretary', 'availability.set_others', 'T', 3, null),
('abbot', 'presence.view', 'T', 3, null),
('abbot_assistant', 'presence.view', 'T', 3, null),
('accountant', 'presence.view', 'C', 1, null),
('ceremony_lead', 'presence.view', 'D', 2, null),
('ceremony_team', 'presence.view', 'C', 1, null),
('department_lead', 'presence.view', 'D', 2, null),
('deputy_abbot', 'presence.view', 'T', 3, null),
('driver', 'presence.view', 'C', 1, null),
('facility_manager', 'presence.view', 'D', 2, null),
('gardener', 'presence.view', 'C', 1, null),
('housekeeper', 'presence.view', 'C', 1, null),
('kitchen_staff', 'presence.view', 'C', 1, null),
('office_staff', 'presence.view', 'C', 1, null),
('security_guard', 'presence.view', 'C', 1, null),
('staff_general', 'presence.view', 'C', 1, null),
('technician', 'presence.view', 'C', 1, null),
('temple_admin', 'presence.view', 'T', 3, null),
('temple_boy', 'presence.view', 'C', 1, null),
('traffic_staff', 'presence.view', 'C', 1, null),
('undertaker', 'presence.view', 'C', 1, null),
('waiyawatchakon', 'presence.view', 'C', 1, null),
('accountant', 'presence.set_self', 'S', 1, null),
('ceremony_lead', 'presence.set_self', 'S', 1, null),
('ceremony_team', 'presence.set_self', 'S', 1, null),
('department_lead', 'presence.set_self', 'S', 1, null),
('driver', 'presence.set_self', 'S', 1, null),
('facility_manager', 'presence.set_self', 'S', 1, null),
('gardener', 'presence.set_self', 'S', 1, null),
('housekeeper', 'presence.set_self', 'S', 1, null),
('kitchen_staff', 'presence.set_self', 'S', 1, null),
('lay_resident', 'presence.set_self', 'S', 1, null),
('office_staff', 'presence.set_self', 'S', 1, null),
('security_guard', 'presence.set_self', 'S', 1, null),
('staff_general', 'presence.set_self', 'S', 1, null),
('technician', 'presence.set_self', 'S', 1, null),
('temple_admin', 'presence.set_self', 'S', 1, null),
('temple_boy', 'presence.set_self', 'S', 1, null),
('traffic_staff', 'presence.set_self', 'S', 1, null),
('undertaker', 'presence.set_self', 'S', 1, null),
('volunteer', 'presence.set_self', 'S', 1, null),
('waiyawatchakon', 'presence.set_self', 'S', 1, null),
('abbot', 'presence.set_others', 'T', 3, null),
('abbot_assistant', 'presence.set_others', 'T', 3, null),
('department_lead', 'presence.set_others', 'D', 2, null),
('deputy_abbot', 'presence.set_others', 'T', 3, null),
('facility_manager', 'presence.set_others', 'D', 2, null),
('temple_admin', 'presence.set_others', 'T', 3, null),
('department_lead', 'shift.manage', 'D', 2, null),
('facility_manager', 'shift.manage', 'D', 2, null),
('temple_admin', 'shift.manage', 'T', 3, null),
('abbot', 'headcount.view', 'T', 3, null),
('abbot_assistant', 'headcount.view', 'T', 3, null),
('department_lead', 'headcount.view', 'D', 2, null),
('deputy_abbot', 'headcount.view', 'T', 3, null),
('kitchen_staff', 'headcount.view', 'D', 2, null),
('monk_secretary', 'headcount.view', 'T', 3, null),
('department_lead', 'headcount.adjust', 'D', 2, null),
('abbot', 'command_center.view', 'T', 3, null),
('abbot_assistant', 'command_center.view', 'T', 3, null),
('ceremony_lead', 'command_center.view', 'D', 2, null),
('department_lead', 'command_center.view', 'D', 2, null),
('deputy_abbot', 'command_center.view', 'T', 3, null),
('facility_manager', 'command_center.view', 'D', 2, null),
('monk_secretary', 'command_center.view', 'T', 3, null),
('temple_admin', 'command_center.view', 'D', 2, 'panel_staff'),
('abbot', 'member.view', 'T', 3, null),
('abbot_assistant', 'member.view', 'T', 3, null),
('bhikkhu', 'member.view', 'T', 3, 'monastics_only'),
('ceremony_lead', 'member.view', 'D', 2, null),
('ceremony_team', 'member.view', 'D', 2, null),
('department_lead', 'member.view', 'D', 2, null),
('deputy_abbot', 'member.view', 'T', 3, null),
('driver', 'member.view', 'D', 2, null),
('facility_manager', 'member.view', 'D', 2, null),
('gardener', 'member.view', 'D', 2, null),
('housekeeper', 'member.view', 'D', 2, null),
('kitchen_staff', 'member.view', 'D', 2, null),
('monk_secretary', 'member.view', 'T', 3, null),
('office_staff', 'member.view', 'T', 3, null),
('security_guard', 'member.view', 'D', 2, null),
('staff_general', 'member.view', 'D', 2, null),
('technician', 'member.view', 'D', 2, null),
('temple_admin', 'member.view', 'T', 3, null),
('temple_boy', 'member.view', 'D', 2, null),
('traffic_staff', 'member.view', 'D', 2, null),
('waiyawatchakon', 'member.view', 'T', 3, null),
('abbot', 'member.manage', 'T', 3, null),
('deputy_abbot', 'member.manage', 'T', 3, null),
('temple_admin', 'member.manage', 'T', 3, null),
('abbot', 'asset.view', 'T', 3, null),
('abbot_assistant', 'asset.view', 'T', 3, null),
('accountant', 'asset.view', 'T', 3, null),
('ceremony_lead', 'asset.view', 'D', 2, null),
('ceremony_team', 'asset.view', 'A', 1, null),
('department_lead', 'asset.view', 'D', 2, null),
('deputy_abbot', 'asset.view', 'T', 3, null),
('driver', 'asset.view', 'A', 1, null),
('facility_manager', 'asset.view', 'T', 3, null),
('gardener', 'asset.view', 'A', 1, null),
('housekeeper', 'asset.view', 'A', 1, null),
('kitchen_staff', 'asset.view', 'A', 1, null),
('security_guard', 'asset.view', 'A', 1, null),
('technician', 'asset.view', 'T', 3, null),
('temple_boy', 'asset.view', 'A', 1, null),
('traffic_staff', 'asset.view', 'A', 1, null),
('undertaker', 'asset.view', 'A', 1, null),
('waiyawatchakon', 'asset.view', 'T', 3, null),
('abbot', 'asset.manage', 'T', 3, null),
('facility_manager', 'asset.manage', 'T', 3, null),
('waiyawatchakon', 'asset.manage', 'T', 3, null),
('abbot', 'maintenance.report', 'T', 3, null),
('abbot_assistant', 'maintenance.report', 'T', 3, null),
('accountant', 'maintenance.report', 'T', 3, null),
('bhikkhu', 'maintenance.report', 'T', 3, null),
('ceremony_lead', 'maintenance.report', 'T', 3, null),
('ceremony_team', 'maintenance.report', 'T', 3, null),
('department_lead', 'maintenance.report', 'T', 3, null),
('deputy_abbot', 'maintenance.report', 'T', 3, null),
('driver', 'maintenance.report', 'T', 3, null),
('facility_manager', 'maintenance.report', 'T', 3, null),
('gardener', 'maintenance.report', 'T', 3, null),
('housekeeper', 'maintenance.report', 'T', 3, null),
('kitchen_staff', 'maintenance.report', 'T', 3, null),
('lay_resident', 'maintenance.report', 'T', 3, null),
('monk_secretary', 'maintenance.report', 'T', 3, null),
('office_staff', 'maintenance.report', 'T', 3, null),
('samanera', 'maintenance.report', 'T', 3, null),
('security_guard', 'maintenance.report', 'T', 3, null),
('staff_general', 'maintenance.report', 'T', 3, null),
('technician', 'maintenance.report', 'T', 3, null),
('temple_admin', 'maintenance.report', 'T', 3, null),
('temple_boy', 'maintenance.report', 'T', 3, null),
('traffic_staff', 'maintenance.report', 'T', 3, null),
('undertaker', 'maintenance.report', 'T', 3, null),
('visiting_monastic', 'maintenance.report', 'T', 3, null),
('volunteer', 'maintenance.report', 'T', 3, null),
('waiyawatchakon', 'maintenance.report', 'T', 3, null),
('abbot', 'maintenance.manage', 'T', 3, null),
('abbot_assistant', 'maintenance.manage', 'T', 3, null),
('deputy_abbot', 'maintenance.manage', 'T', 3, null),
('facility_manager', 'maintenance.manage', 'T', 3, null),
('technician', 'maintenance.manage', 'A', 1, null),
('abbot', 'inventory.view', 'T', 3, null),
('abbot_assistant', 'inventory.view', 'T', 3, null),
('accountant', 'inventory.view', 'T', 3, null),
('ceremony_lead', 'inventory.view', 'D', 2, null),
('department_lead', 'inventory.view', 'D', 2, null),
('deputy_abbot', 'inventory.view', 'T', 3, null),
('facility_manager', 'inventory.view', 'T', 3, null),
('gardener', 'inventory.view', 'D', 2, null),
('housekeeper', 'inventory.view', 'D', 2, null),
('kitchen_staff', 'inventory.view', 'D', 2, null),
('technician', 'inventory.view', 'D', 2, null),
('waiyawatchakon', 'inventory.view', 'T', 3, null),
('gardener', 'inventory.record', 'D', 2, null),
('housekeeper', 'inventory.record', 'D', 2, null),
('kitchen_staff', 'inventory.record', 'D', 2, null),
('technician', 'inventory.record', 'D', 2, null),
('department_lead', 'inventory.manage', 'D', 2, null),
('facility_manager', 'inventory.manage', 'T', 3, null),
('abbot', 'parking.report', 'T', 3, null),
('deputy_abbot', 'parking.report', 'T', 3, null),
('facility_manager', 'parking.report', 'T', 3, null),
('security_guard', 'parking.report', 'T', 3, null),
('traffic_staff', 'parking.report', 'T', 3, null),
('abbot', 'parking.manage', 'T', 3, null),
('facility_manager', 'parking.manage', 'T', 3, null),
('temple_admin', 'parking.manage', 'T', 3, null),
('abbot', 'vehicle.view', 'T', 3, null),
('abbot_assistant', 'vehicle.view', 'T', 3, null),
('deputy_abbot', 'vehicle.view', 'T', 3, null),
('driver', 'vehicle.view', 'A', 1, null),
('facility_manager', 'vehicle.view', 'T', 3, null),
('monk_secretary', 'vehicle.view', 'T', 3, null),
('office_staff', 'vehicle.view', 'T', 3, null),
('abbot', 'vehicle.manage', 'T', 3, null),
('facility_manager', 'vehicle.manage', 'T', 3, null),
('abbot', 'finance.view', 'T', 3, null),
('accountant', 'finance.view', 'T', 3, null),
('waiyawatchakon', 'finance.view', 'T', 3, null),
('waiyawatchakon', 'finance.approve', 'T', 3, 'explicit_grant'),
('abbot', 'points.award_community', 'T', 3, null),
('abbot_assistant', 'points.award_community', 'T', 3, null),
('ceremony_lead', 'points.award_community', 'D', 2, null),
('department_lead', 'points.award_community', 'D', 2, null),
('deputy_abbot', 'points.award_community', 'T', 3, null),
('facility_manager', 'points.award_community', 'D', 2, null),
('monk_secretary', 'points.award_community', 'T', 3, null),
('office_staff', 'reward.manage', 'T', 3, null),
('waiyawatchakon', 'reward.manage', 'T', 3, null),
('abbot', 'moderation.manage', 'T', 3, null),
('deputy_abbot', 'moderation.manage', 'T', 3, null),
('temple_admin', 'moderation.manage', 'T', 3, null),
('abbot', 'contact_inbox.manage', 'T', 3, null),
('abbot_assistant', 'contact_inbox.manage', 'T', 3, null),
('deputy_abbot', 'contact_inbox.manage', 'T', 3, null),
('monk_secretary', 'contact_inbox.manage', 'T', 3, null),
('office_staff', 'contact_inbox.manage', 'T', 3, null),
('accountant', 'community.participate', 'S', 1, null),
('ceremony_lead', 'community.participate', 'S', 1, null),
('ceremony_team', 'community.participate', 'S', 1, null),
('community_member', 'community.participate', 'S', 1, null),
('department_lead', 'community.participate', 'S', 1, null),
('driver', 'community.participate', 'S', 1, null),
('facility_manager', 'community.participate', 'S', 1, null),
('gardener', 'community.participate', 'S', 1, null),
('housekeeper', 'community.participate', 'S', 1, null),
('kitchen_staff', 'community.participate', 'S', 1, null),
('lay_resident', 'community.participate', 'S', 1, null),
('office_staff', 'community.participate', 'S', 1, null),
('security_guard', 'community.participate', 'S', 1, null),
('staff_general', 'community.participate', 'S', 1, null),
('technician', 'community.participate', 'S', 1, null),
('temple_admin', 'community.participate', 'S', 1, null),
('temple_boy', 'community.participate', 'S', 1, null),
('traffic_staff', 'community.participate', 'S', 1, null),
('undertaker', 'community.participate', 'S', 1, null),
('volunteer', 'community.participate', 'S', 1, null),
('waiyawatchakon', 'community.participate', 'S', 1, null),
('accountant', 'community.p2p_chat', 'S', 1, null),
('ceremony_lead', 'community.p2p_chat', 'S', 1, null),
('ceremony_team', 'community.p2p_chat', 'S', 1, null),
('community_member', 'community.p2p_chat', 'S', 1, null),
('department_lead', 'community.p2p_chat', 'S', 1, null),
('driver', 'community.p2p_chat', 'S', 1, null),
('facility_manager', 'community.p2p_chat', 'S', 1, null),
('gardener', 'community.p2p_chat', 'S', 1, null),
('housekeeper', 'community.p2p_chat', 'S', 1, null),
('kitchen_staff', 'community.p2p_chat', 'S', 1, null),
('lay_resident', 'community.p2p_chat', 'S', 1, null),
('office_staff', 'community.p2p_chat', 'S', 1, null),
('security_guard', 'community.p2p_chat', 'S', 1, null),
('staff_general', 'community.p2p_chat', 'S', 1, null),
('technician', 'community.p2p_chat', 'S', 1, null),
('temple_admin', 'community.p2p_chat', 'S', 1, null),
('temple_boy', 'community.p2p_chat', 'S', 1, null),
('traffic_staff', 'community.p2p_chat', 'S', 1, null),
('undertaker', 'community.p2p_chat', 'S', 1, null),
('volunteer', 'community.p2p_chat', 'S', 1, null),
('waiyawatchakon', 'community.p2p_chat', 'S', 1, null),
('accountant', 'community.calls', 'S', 1, null),
('ceremony_lead', 'community.calls', 'S', 1, null),
('ceremony_team', 'community.calls', 'S', 1, null),
('community_member', 'community.calls', 'S', 1, null),
('department_lead', 'community.calls', 'S', 1, null),
('driver', 'community.calls', 'S', 1, null),
('facility_manager', 'community.calls', 'S', 1, null),
('gardener', 'community.calls', 'S', 1, null),
('housekeeper', 'community.calls', 'S', 1, null),
('kitchen_staff', 'community.calls', 'S', 1, null),
('lay_resident', 'community.calls', 'S', 1, null),
('office_staff', 'community.calls', 'S', 1, null),
('security_guard', 'community.calls', 'S', 1, null),
('staff_general', 'community.calls', 'S', 1, null),
('technician', 'community.calls', 'S', 1, null),
('temple_admin', 'community.calls', 'S', 1, null),
('temple_boy', 'community.calls', 'S', 1, null),
('traffic_staff', 'community.calls', 'S', 1, null),
('undertaker', 'community.calls', 'S', 1, null),
('volunteer', 'community.calls', 'S', 1, null),
('waiyawatchakon', 'community.calls', 'S', 1, null),
('accountant', 'community.public_profile', 'S', 1, null),
('ceremony_lead', 'community.public_profile', 'S', 1, null),
('ceremony_team', 'community.public_profile', 'S', 1, null),
('community_member', 'community.public_profile', 'S', 1, null),
('department_lead', 'community.public_profile', 'S', 1, null),
('driver', 'community.public_profile', 'S', 1, null),
('facility_manager', 'community.public_profile', 'S', 1, null),
('gardener', 'community.public_profile', 'S', 1, null),
('housekeeper', 'community.public_profile', 'S', 1, null),
('kitchen_staff', 'community.public_profile', 'S', 1, null),
('lay_resident', 'community.public_profile', 'S', 1, null),
('office_staff', 'community.public_profile', 'S', 1, null),
('security_guard', 'community.public_profile', 'S', 1, null),
('staff_general', 'community.public_profile', 'S', 1, null),
('technician', 'community.public_profile', 'S', 1, null),
('temple_admin', 'community.public_profile', 'S', 1, null),
('temple_boy', 'community.public_profile', 'S', 1, null),
('traffic_staff', 'community.public_profile', 'S', 1, null),
('undertaker', 'community.public_profile', 'S', 1, null),
('volunteer', 'community.public_profile', 'S', 1, null),
('waiyawatchakon', 'community.public_profile', 'S', 1, null),
('security_guard', 'security.log', 'S', 1, null),
('traffic_staff', 'security.log', 'S', 1, null),
('abbot', 'security.log.view', 'T', 3, null),
('department_lead', 'security.log.view', 'D', 2, 'dept_security'),
('deputy_abbot', 'security.log.view', 'T', 3, null),
('security_guard', 'security.log.view', 'D', 2, null),
('traffic_staff', 'security.log.view', 'D', 2, null),
('abbot', 'security.incident.view', 'T', 3, null),
('department_lead', 'security.incident.view', 'D', 2, 'dept_security'),
('deputy_abbot', 'security.incident.view', 'T', 3, null),
('abbot', 'document.view', 'T', 3, null),
('abbot_assistant', 'document.view', 'T', 3, null),
('accountant', 'document.view', 'T', 3, null),
('deputy_abbot', 'document.view', 'T', 3, null),
('monk_secretary', 'document.view', 'T', 3, null),
('office_staff', 'document.view', 'T', 3, null),
('office_staff', 'document.manage', 'T', 3, null),
('monk_secretary', 'booking.manage', 'T', 3, null),
('office_staff', 'booking.manage', 'T', 3, null),
('abbot', 'report.view', 'T', 3, null),
('abbot_assistant', 'report.view', 'T', 3, null),
('accountant', 'report.view', 'T', 3, null),
('ceremony_lead', 'report.view', 'D', 2, null),
('department_lead', 'report.view', 'D', 2, null),
('deputy_abbot', 'report.view', 'T', 3, null),
('facility_manager', 'report.view', 'D', 2, null),
('monk_secretary', 'report.view', 'T', 3, null),
('office_staff', 'report.view', 'T', 3, null),
('waiyawatchakon', 'report.view', 'T', 3, null),
('abbot', 'audit.view', 'T', 3, null),
('abbot', 'temple.settings', 'T', 3, null),
('temple_admin', 'temple.settings', 'T', 3, 'non_restricted');

-- ===== privilege hardening (match the tested local grants; Supabase default privileges grant more) =====
revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.availability_manual from anon, authenticated;
revoke all on table public.boon_point_transactions from anon, authenticated;
revoke all on table public.buildings from anon, authenticated;
revoke all on table public.call_sessions from anon, authenticated;
revoke all on table public.call_signals from anon, authenticated;
revoke all on table public.call_signals_id_seq from anon, authenticated;
revoke all on table public.checkins from anon, authenticated;
revoke all on table public.community_posts from anon, authenticated;
revoke all on table public.community_profiles from anon, authenticated;
revoke all on table public.community_suspensions from anon, authenticated;
revoke all on table public.connections from anon, authenticated;
revoke all on table public.conversation_members from anon, authenticated;
revoke all on table public.conversations from anon, authenticated;
revoke all on table public.data_field_catalog from anon, authenticated;
revoke all on table public.data_sources from anon, authenticated;
revoke all on table public.departments from anon, authenticated;
revoke all on table public.event_participants from anon, authenticated;
revoke all on table public.event_staffing_targets from anon, authenticated;
revoke all on table public.events from anon, authenticated;
revoke all on table public.invitation_team from anon, authenticated;
revoke all on table public.invitations from anon, authenticated;
revoke all on table public.membership_departments from anon, authenticated;
revoke all on table public.membership_roles from anon, authenticated;
revoke all on table public.memberships from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
revoke all on table public.moderation_reports from anon, authenticated;
revoke all on table public.monastic_activity_ledger from anon, authenticated;
revoke all on table public.monastic_attestations from anon, authenticated;
revoke all on table public.parking_lots from anon, authenticated;
revoke all on table public.parking_status_reports from anon, authenticated;
revoke all on table public.permissions from anon, authenticated;
revoke all on table public.person_blocks from anon, authenticated;
revoke all on table public.person_mutes from anon, authenticated;
revoke all on table public.persons from anon, authenticated;
revoke all on table public.platform_admins from anon, authenticated;
revoke all on table public.point_holds from anon, authenticated;
revoke all on table public.post_comments from anon, authenticated;
revoke all on table public.quest_assignments from anon, authenticated;
revoke all on table public.quest_evidence from anon, authenticated;
revoke all on table public.quests from anon, authenticated;
revoke all on table public.reward_catalog from anon, authenticated;
revoke all on table public.reward_redemptions from anon, authenticated;
revoke all on table public.rite_types from anon, authenticated;
revoke all on table public.role_permissions from anon, authenticated;
revoke all on table public.roles from anon, authenticated;
revoke all on table public.schedule_entries from anon, authenticated;
revoke all on table public.temple_contact_threads from anon, authenticated;
revoke all on table public.temple_field_value_history from anon, authenticated;
revoke all on table public.temple_field_value_history_id_seq from anon, authenticated;
revoke all on table public.temple_field_values from anon, authenticated;
revoke all on table public.temples from anon, authenticated;
revoke all on table public.zones from anon, authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.departments to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.membership_departments to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.membership_roles to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.memberships to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.monastic_attestations to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.schedule_entries to authenticated;
grant INSERT, SELECT on table public.audit_logs to authenticated;
grant INSERT, SELECT on table public.checkins to authenticated;
grant INSERT, SELECT on table public.parking_status_reports to authenticated;
grant INSERT, SELECT on table public.quest_evidence to authenticated;
grant INSERT, SELECT, UPDATE on table public.parking_lots to authenticated;
grant INSERT, SELECT, UPDATE on table public.quest_assignments to authenticated;
grant INSERT, SELECT, UPDATE on table public.quests to authenticated;
grant SELECT on table public.availability_manual to authenticated;
grant SELECT on table public.boon_point_transactions to authenticated;
grant SELECT on table public.buildings to authenticated;
grant SELECT on table public.call_sessions to authenticated;
grant SELECT on table public.call_signals to authenticated;
grant SELECT on table public.community_posts to authenticated;
grant SELECT on table public.community_profiles to authenticated;
grant SELECT on table public.community_suspensions to authenticated;
grant SELECT on table public.connections to authenticated;
grant SELECT on table public.conversation_members to authenticated;
grant SELECT on table public.conversations to authenticated;
grant SELECT on table public.data_field_catalog to anon;
grant SELECT on table public.data_field_catalog to authenticated;
grant SELECT on table public.data_sources to authenticated;
grant SELECT on table public.event_participants to authenticated;
grant SELECT on table public.event_staffing_targets to authenticated;
grant SELECT on table public.events to authenticated;
grant SELECT on table public.invitation_team to authenticated;
grant SELECT on table public.invitations to authenticated;
grant SELECT on table public.messages to authenticated;
grant SELECT on table public.moderation_reports to authenticated;
grant SELECT on table public.monastic_activity_ledger to authenticated;
grant SELECT on table public.permissions to authenticated;
grant SELECT on table public.person_blocks to authenticated;
grant SELECT on table public.person_mutes to authenticated;
grant SELECT on table public.platform_admins to authenticated;
grant SELECT on table public.point_holds to authenticated;
grant SELECT on table public.post_comments to authenticated;
grant SELECT on table public.reward_catalog to authenticated;
grant SELECT on table public.reward_redemptions to authenticated;
grant SELECT on table public.rite_types to authenticated;
grant SELECT on table public.role_permissions to authenticated;
grant SELECT on table public.roles to authenticated;
grant SELECT on table public.temple_contact_threads to authenticated;
grant SELECT on table public.temple_field_value_history to authenticated;
grant SELECT on table public.temple_field_values to authenticated;
grant SELECT on table public.temples to authenticated;
grant SELECT on table public.zones to authenticated;
grant SELECT, UPDATE on table public.persons to authenticated;
revoke all on function listed_temples(text) from public, anon, authenticated;
revoke all on function public_temple_ref(text) from public, anon, authenticated;
revoke all on function temple_parking(text,timestamp with time zone) from public, anon, authenticated;
revoke all on function temple_profile(text) from public, anon, authenticated;
revoke all on function temple_public_events(text) from public, anon, authenticated;
revoke all on function temple_public_fields(text) from public, anon, authenticated;
revoke all on function temple_public_map(text) from public, anon, authenticated;
revoke all on function public.zz_retired_listed_temples_v1() from public, anon, authenticated;
grant execute on function listed_temples(text) to anon;
grant execute on function listed_temples(text) to authenticated;
grant execute on function public_temple_ref(text) to anon;
grant execute on function public_temple_ref(text) to authenticated;
grant execute on function temple_parking(text,timestamp with time zone) to anon;
grant execute on function temple_parking(text,timestamp with time zone) to authenticated;
grant execute on function temple_profile(text) to anon;
grant execute on function temple_profile(text) to authenticated;
grant execute on function temple_public_events(text) to anon;
grant execute on function temple_public_events(text) to authenticated;
grant execute on function temple_public_fields(text) to anon;
grant execute on function temple_public_fields(text) to authenticated;
grant execute on function temple_public_map(text) to anon;
grant execute on function temple_public_map(text) to authenticated;

commit;
select 'BOON deploy step 2 OK' as result, (select count(*) from public.roles) as roles, (select count(*) from public.role_permissions) as role_permissions;
