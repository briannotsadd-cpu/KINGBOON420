-- every tenant table has temple_id + enabled AND forced RLS; tenant->tenant FKs are composite on temple_id
do $$
declare t record; bad text := ''; n int := 0;
begin
  for t in select c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity,
                  exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'temple_id' and not a.attisdropped) as has_tid
           from pg_class c join pg_namespace s on s.oid = c.relnamespace
           where s.nspname = 'public' and c.relkind in ('r','p') loop
    n := n + 1;
    if not (t.relrowsecurity and t.relforcerowsecurity) then bad := bad || format(' [%s: RLS not enabled+forced]', t.relname); end if;
    if not t.has_tid and t.relname not in ('persons','temples','roles','permissions','role_permissions') then
      bad := bad || format(' [%s: no temple_id and not an allowlisted global table]', t.relname); end if;
  end loop;
  perform test.assert(bad = '', 'schema rules violated:' || bad);
  -- composite FK check
  for t in select c.conname, c.conrelid::regclass::text as tbl
           from pg_constraint c
           where c.contype = 'f' and c.connamespace = 'public'::regnamespace
             and c.confrelid::regclass::text not in ('temples','persons','roles','permissions')
             and not exists (select 1 from pg_attribute a where a.attrelid = c.conrelid and a.attname = 'temple_id' and a.attnum = any (c.conkey)) loop
    bad := bad || format(' [%s.%s not composite on temple_id]', t.tbl, t.conname);
  end loop;
  perform test.assert(bad = '', 'FK rules violated:' || bad);
  -- seed sanity: generated from YAML
  perform test.assert((select count(*) from public.roles) = 28, 'expected 28 roles');
  perform test.assert((select count(*) from public.role_permissions) > 400, 'role_permissions seeded');
  raise notice 'PASS 01_schema: % public tables, all forced RLS, all tenant FKs composite', n;
end $$;
