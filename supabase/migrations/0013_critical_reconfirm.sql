-- 0013 Gap found by the new browser E2E: re-confirming an EXPIRED critical field (donation account) needed only one
-- person, bypassing the two-person rule of advance_field_value. Now a critical re-confirmation takes two steps:
-- step 1 by anyone the temple allows (temple.settings T) records first_approved_by; step 2 must be the abbot and a
-- different person. Until step 2 the value stays expired (hidden from the public). Returns 'first' or 'done'.
begin;
drop function app.reconfirm_field_value(uuid);
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
commit;
