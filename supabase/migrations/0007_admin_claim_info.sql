-- 0007 Platform admin: read one temple's claim details (any status) for the verification drill-down.
begin;
create function app.temple_claim_info(p_temple uuid)
returns table (name_th text, status text, claim_relationship text, claim_registry_number text, claim_evidence text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select t.name_th, t.status, t.claim_relationship, t.claim_registry_number, t.claim_evidence
    from public.temples t where t.id = p_temple;
end $$;
grant execute on function app.temple_claim_info(uuid) to authenticated;
commit;
