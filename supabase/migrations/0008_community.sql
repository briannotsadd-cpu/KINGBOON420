-- 0008 Community: profiles + field visibility, temple follow (community_member), connections, block/mute/report,
-- chat (direct + group), posts/comments, 1:1 voice/video call sessions with WebRTC signalling rows, Temple Contact inbox.
-- Rules (docs/master/SPEC.md §21/§24, SECURITY_MODEL.md:64-66, role_permissions.yaml:131-137, FLOWS.md J-05/J-06):
--  * community.* codes are held only by "@lay" roles; any monastic membership or minor => no community access at all
--    (no DM to monks: they can only be reached through Temple Contact, routed by temple staff).
--  * chat/calls are connection-gated; a block in either direction stops messages, calls, comments and visibility.
--  * every write goes through SECURITY DEFINER functions below (no INSERT/UPDATE/DELETE grants), with rate limits.
--  * person-to-person tables are global (no temple_id; RLS by participation). temple_contact_threads is a tenant table.
-- Decisions for spec OPEN items are recorded in docs/v1/DECISIONS.md (D-C1..D-C9).
begin;

-- Profiles -------------------------------------------------------------------------------------------
create table public.community_profiles (
  person_id uuid primary key references public.persons(id),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  birth_year int not null check (birth_year between 1900 and 2100),   -- needed only to keep minors out (D-C2)
  bio text check (char_length(bio) <= 500),
  skills text[] not null default '{}' check (cardinality(skills) <= 20),
  interests text[] not null default '{}' check (cardinality(interests) <= 20),
  bio_vis text not null default 'connections' check (bio_vis in ('public', 'connections', 'private')),
  skills_vis text not null default 'connections' check (skills_vis in ('public', 'connections', 'private')),
  interests_vis text not null default 'connections' check (interests_vis in ('public', 'connections', 'private')),
  discoverable boolean not null default true,                         -- appears in people search
  call_permission text not null default 'connections' check (call_permission in ('connections', 'nobody')),
  updated_at timestamptz not null default now()
);
create table public.community_suspensions (
  person_id uuid primary key references public.persons(id),
  reason text not null,
  until timestamptz,                                                   -- null = until lifted
  decided_by uuid not null references public.persons(id),
  created_at timestamptz not null default now()
);
create table public.connections (
  requester uuid not null references public.persons(id),
  addressee uuid not null references public.persons(id),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester, addressee),
  check (requester <> addressee)
);
create unique index connections_pair on public.connections (least(requester, addressee), greatest(requester, addressee));
create table public.person_blocks (
  blocker uuid not null references public.persons(id), blocked uuid not null references public.persons(id),
  created_at timestamptz not null default now(), primary key (blocker, blocked), check (blocker <> blocked));
create table public.person_mutes (
  muter uuid not null references public.persons(id), muted uuid not null references public.persons(id),
  created_at timestamptz not null default now(), primary key (muter, muted), check (muter <> muted));

-- Chat -----------------------------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'group')),
  title text check (title is null or char_length(btrim(title)) between 2 and 60),
  direct_key text unique,                                              -- 'a:b' sorted, direct only
  created_by uuid not null references public.persons(id),
  created_at timestamptz not null default now(),
  check ((kind = 'direct') = (direct_key is not null)),
  check (kind = 'direct' or title is not null)
);
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id),
  person_id uuid not null references public.persons(id),
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_read_at timestamptz,
  primary key (conversation_id, person_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id),
  sender uuid not null references public.persons(id),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_reason text
);
create index on public.messages (conversation_id, created_at);
create index on public.messages (sender, created_at);

-- Posts ----------------------------------------------------------------------------------------------
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author uuid not null references public.persons(id),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  visibility text not null default 'public' check (visibility in ('public', 'connections')),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_reason text
);
create index on public.community_posts (created_at desc);
create index on public.community_posts (author, created_at);
create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id),
  author uuid not null references public.persons(id),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_reason text
);
create index on public.post_comments (post_id, created_at);
create index on public.post_comments (author, created_at);

-- Reports (global community content is moderated by platform admins: D-C5) ------------------------------
create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.persons(id),
  target_kind text not null check (target_kind in ('person', 'message', 'post', 'comment')),
  target_id uuid not null,
  target_person uuid not null references public.persons(id),
  reason text not null check (reason in ('inappropriate', 'harassment', 'impersonation', 'minor_safety', 'other')),
  note text check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  decision text check (decision in ('remove_content', 'suspend', 'warn', 'dismiss')),
  decision_reason text,
  decided_by uuid references public.persons(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (reporter <> target_person)
);

-- Calls (1:1, direct conversations only; media is peer-to-peer WebRTC, never recorded: D-C7) ---------------
create table public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id),
  caller uuid not null references public.persons(id),
  callee uuid not null references public.persons(id),
  media text not null check (media in ('voice', 'video')),
  status text not null default 'ringing' check (status in ('ringing', 'active', 'ended', 'declined', 'missed', 'failed')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  ended_by uuid references public.persons(id),
  check (caller <> callee)
);
create index on public.call_sessions (callee, status);
create index on public.call_sessions (caller, created_at);
create table public.call_signals (            -- SDP/ICE relay; deleted when the call ends (no retention)
  id bigint generated always as identity primary key,
  call_id uuid not null references public.call_sessions(id) on delete cascade,
  from_person uuid not null references public.persons(id),
  to_person uuid not null references public.persons(id),
  kind text not null check (kind in ('offer', 'answer', 'ice')),
  payload jsonb not null check (octet_length(payload::text) <= 16384),
  created_at timestamptz not null default now()
);
create index on public.call_signals (call_id, id);

-- Temple Contact (tenant table) -------------------------------------------------------------------------
create table public.temple_contact_threads (
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  ref_code text not null unique,
  topic text not null check (topic in ('invite_monk', 'activity', 'donate_items', 'other')),
  message text not null check (char_length(btrim(message)) between 5 and 2000),
  sender_name text check (char_length(sender_name) <= 80),
  sender_phone text check (sender_phone ~ '^[0-9+ -]{6,20}$'),
  sender_person_id uuid references public.persons(id),
  sender_ip_hash text,                                                  -- rate limiting only, sha256 from the server
  status text not null default 'NEW' check (status in ('NEW', 'ASSIGNED', 'REPLIED', 'CLOSED')),
  assigned_to uuid references public.persons(id),
  reply text check (char_length(reply) <= 2000),
  replied_by uuid references public.persons(id),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (temple_id, id)
);
create index on public.temple_contact_threads (temple_id, status, created_at);
create index on public.temple_contact_threads (sender_ip_hash, created_at);

do $$ declare t text; begin
  foreach t in array array['community_profiles','community_suspensions','connections','person_blocks','person_mutes',
    'conversations','conversation_members','messages','community_posts','post_comments','moderation_reports',
    'call_sessions','call_signals','temple_contact_threads'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop; end $$;

-- Helpers ---------------------------------------------------------------------------------------------
-- Highest rank of a community permission for ANY person (not only the caller), over all active memberships.
-- Fail-closed: any monastic membership, any minor flag, a minor birth year, no profile, or a suspension => false.
create function app.community_can(p_person uuid, p_code text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select p_person is not null
     and exists (select 1 from public.community_profiles cp where cp.person_id = p_person
                 and extract(year from now())::int - cp.birth_year >= 21)      -- under-20 rule, fail-closed (D-C2)
     and not exists (select 1 from public.memberships m where m.person_id = p_person and m.status = 'active'
                     and (m.monastic_kind <> 'none' or m.is_minor))
     and not exists (select 1 from public.community_suspensions s where s.person_id = p_person
                     and (s.until is null or s.until > now()))
     and exists (select 1 from public.memberships m
                 join public.membership_roles mr on mr.temple_id = m.temple_id and mr.membership_id = m.id
                 join public.role_permissions rp on rp.role_code = mr.role_code and rp.permission_code = p_code
                 where m.person_id = p_person and m.status = 'active'
                   and (rp.condition is null or rp.condition not in ('delegated', 'explicit_grant')))
$$;
create function app.is_blocked_between(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.person_blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a))
$$;
create function app.are_connected(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.connections where status = 'accepted'
                 and ((requester = a and addressee = b) or (requester = b and addressee = a)))
$$;
create function app.is_conv_member(p_conv uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.conversation_members where conversation_id = p_conv
                 and person_id = app.current_person_id() and left_at is null)
$$;
create function app.require_community(p_code text) returns uuid language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id();
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not app.community_can(me, p_code) then raise exception 'community not allowed' using errcode = '42501'; end if;
  return me;
end $$;
create function app.rate_limit(p_count bigint, p_max int) returns void language plpgsql immutable as $$
begin if p_count >= p_max then raise exception 'rate limited' using errcode = '54000'; end if; end $$;

-- Follow a verified temple as community_member (the only self-service role; F-41) ----------------------
create function app.join_temple_community(p_temple uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); m uuid;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not app.is_verified_temple(p_temple) then raise exception 'temple not public' using errcode = '55000'; end if;
  select id into m from public.memberships where temple_id = p_temple and person_id = me;
  if m is null then
    insert into public.memberships(temple_id, person_id, status) values (p_temple, me, 'active') returning id into m;
    insert into public.membership_roles(temple_id, membership_id, role_code) values (p_temple, m, 'community_member');
    perform app.write_audit(p_temple, 'membership.followed', 'memberships', m, null, 'active');
  end if;
end $$;
create function app.leave_temple_community(p_temple uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); m uuid;
begin
  select id into m from public.memberships ms where ms.temple_id = p_temple and ms.person_id = me and ms.status = 'active'
     and not exists (select 1 from public.membership_roles r where r.temple_id = ms.temple_id and r.membership_id = ms.id
                     and r.role_code <> 'community_member');
  if m is null then raise exception 'only a follow-only membership can be left here' using errcode = '55000'; end if;
  update public.memberships set status = 'left' where temple_id = p_temple and id = m;
  perform app.write_audit(p_temple, 'membership.unfollowed', 'memberships', m, 'active', 'left');
end $$;

-- Profile ------------------------------------------------------------------------------------------------
create function app.save_community_profile(p_display_name text, p_birth_year int, p_bio text, p_skills text[], p_interests text[],
  p_bio_vis text, p_skills_vis text, p_interests_vis text, p_discoverable boolean, p_call_permission text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id();
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.community_profiles as cp (person_id, display_name, birth_year, bio, skills, interests, bio_vis, skills_vis,
    interests_vis, discoverable, call_permission)
  values (me, btrim(p_display_name), p_birth_year, nullif(btrim(p_bio), ''), coalesce(p_skills, '{}'), coalesce(p_interests, '{}'),
    p_bio_vis, p_skills_vis, p_interests_vis, coalesce(p_discoverable, true), p_call_permission)
  on conflict (person_id) do update set display_name = excluded.display_name,
    birth_year = cp.birth_year,                                         -- birth year cannot be changed after first save
    bio = excluded.bio, skills = excluded.skills, interests = excluded.interests, bio_vis = excluded.bio_vis,
    skills_vis = excluded.skills_vis, interests_vis = excluded.interests_vis, discoverable = excluded.discoverable,
    call_permission = excluded.call_permission, updated_at = now();
end $$;

-- What viewer may see of a person (null when not visible: blocked, ineligible, private) ---------------
create function app.profile_card(p_person uuid)
returns table (person_id uuid, display_name text, bio text, skills text[], interests text[], is_connected boolean,
               connection_status text, i_requested boolean, can_message boolean, can_call boolean, is_muted boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); conn boolean; st text; mine boolean; p public.community_profiles;
  vis_ok boolean;
begin
  if me is null or not app.community_can(me, 'community.participate') then return; end if;
  if p_person <> me and (app.is_blocked_between(me, p_person) or not app.community_can(p_person, 'community.participate')) then return; end if;
  select * into p from public.community_profiles where community_profiles.person_id = p_person;
  if not found then return; end if;
  conn := app.are_connected(me, p_person);
  select c.status, c.requester = me into st, mine from public.connections c
   where (c.requester = me and c.addressee = p_person) or (c.requester = p_person and c.addressee = me);
  return query select p.person_id, p.display_name,
    case when p_person = me or p.bio_vis = 'public' or (p.bio_vis = 'connections' and conn) then p.bio end,
    case when p_person = me or p.skills_vis = 'public' or (p.skills_vis = 'connections' and conn) then p.skills else '{}'::text[] end,
    case when p_person = me or p.interests_vis = 'public' or (p.interests_vis = 'connections' and conn) then p.interests else '{}'::text[] end,
    conn, st, coalesce(mine, false),
    p_person <> me and conn and app.community_can(me, 'community.p2p_chat') and app.community_can(p_person, 'community.p2p_chat'),
    p_person <> me and conn and p.call_permission = 'connections' and app.community_can(me, 'community.calls')
      and app.community_can(p_person, 'community.calls'),
    exists (select 1 from public.person_mutes where muter = me and muted = p_person);
end $$;

create function app.search_people(p_query text)
returns table (person_id uuid, display_name text) language sql stable security definer set search_path = public, pg_temp as $$
  select cp.person_id, cp.display_name from public.community_profiles cp
   where app.community_can(app.current_person_id(), 'community.participate')
     and char_length(btrim(coalesce(p_query, ''))) >= 2
     and cp.person_id <> app.current_person_id() and cp.discoverable
     and cp.display_name ilike '%' || btrim(p_query) || '%'
     and not app.is_blocked_between(app.current_person_id(), cp.person_id)
     and app.community_can(cp.person_id, 'community.participate')
   order by cp.display_name limit 30
$$;

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

commit;
