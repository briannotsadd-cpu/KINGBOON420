-- 0010 Gaps found while building the Temple Contact / follow UI (reported by the UI agent):
--  * public_temple_ref: slug -> id/name for a VERIFIED temple only (so the app never needs owner-level lookups)
--  * join_temple_community re-activates a membership the person left earlier (it silently did nothing before)
--  * my_contact_threads: the sender's own threads with temple name and the replying staff member's display name
begin;
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
commit;
