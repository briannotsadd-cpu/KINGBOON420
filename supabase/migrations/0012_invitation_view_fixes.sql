-- 0012 Gaps reported by the monk-features UI agent:
--  * invitation team names for everyone who may see the invitation (persons RLS hides names from scope-A monks)
--  * suggest_team readable by confirmers too (invitation.confirm), so a confirmer always sees the warnings
begin;
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
commit;
