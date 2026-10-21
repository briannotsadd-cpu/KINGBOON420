-- 0016 Parking staff screens: lots are managed and statuses reported only through the functions below
-- (validation, rate limit and audit live here, not in the UI). Same confirm-before-public rule as buildings (D-M1):
-- a lot becomes public only after someone holding temple.settings confirms it, and editing a public-facing field
-- clears that confirmation. Platform admins cannot confirm on a temple's behalf (they hold no temple.settings).
-- No DROP statements: the existing table policies stay, but the direct table write grants are revoked.
begin;

alter table public.parking_lots
  add column confirmed_by uuid references public.persons(id),
  add column confirmed_at timestamptz;

-- writes only through the functions below (direct INSERT/UPDATE now fail with 42501)
revoke insert, update on public.parking_lots from authenticated;
revoke insert on public.parking_status_reports from authenticated;

create function app.save_parking_lot(p_temple uuid, p_id uuid, p_code text, p_name_th text, p_capacity int, p_accessible int,
  p_vehicles text[], p_fee text, p_hours text, p_public boolean, p_active boolean, p_stale int)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid := p_id; old public.parking_lots; n bigint; changed boolean;
  v_name text := btrim(coalesce(p_name_th, '')); v_fee text := nullif(btrim(coalesce(p_fee, '')), '');
  v_hours text := nullif(btrim(coalesce(p_hours, '')), ''); v_vehicles text[] := coalesce(p_vehicles, '{}');
begin
  if not app.has_permission(p_temple, 'parking.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  if char_length(v_name) not between 2 and 120 then raise exception 'name_th must be 2-120 characters' using errcode = '23514'; end if;
  if p_capacity is not null and p_capacity not between 1 and 10000 then raise exception 'capacity must be 1-10000' using errcode = '23514'; end if;
  if p_accessible is not null and (p_accessible < 0 or (p_capacity is not null and p_accessible > p_capacity)) then
    raise exception 'accessible_spaces must be 0..capacity' using errcode = '23514'; end if;
  if cardinality(v_vehicles) = 0 or not v_vehicles <@ array['car','motorcycle','van','bus'] then
    raise exception 'vehicle_types must be a non-empty subset of car, motorcycle, van, bus' using errcode = '23514'; end if;
  if char_length(v_fee) > 200 or char_length(v_hours) > 200 then raise exception 'fee/hours note too long' using errcode = '23514'; end if;
  if coalesce(p_stale, 60) not between 5 and 1440 then raise exception 'stale_after_minutes must be 5-1440' using errcode = '23514'; end if;
  select count(*) into n from public.audit_logs a
   where a.temple_id = p_temple and a.action = 'parking.lot_saved' and a.at > now() - interval '10 minutes';
  perform app.rate_limit(n, 60);
  if id is null then
    if coalesce(p_code, '') !~ '^[A-Z0-9][A-Z0-9-]{0,15}$' then raise exception 'code must be 1-16 of A-Z, 0-9, -' using errcode = '23514'; end if;
    select count(*) into n from public.parking_lots l where l.temple_id = p_temple;
    if n >= 50 then raise exception 'too many lots' using errcode = '54000'; end if;
    insert into public.parking_lots(temple_id, code, name_th, capacity, accessible_spaces, vehicle_types, fee_note_th, hours_note_th,
                                    is_public, active, stale_after_minutes)
    values (p_temple, p_code, v_name, p_capacity, p_accessible, v_vehicles, v_fee, v_hours, coalesce(p_public, true), coalesce(p_active, true),
            coalesce(p_stale, 60))
    returning parking_lots.id into id;
  else
    select * into old from public.parking_lots l where l.temple_id = p_temple and l.id = p_id for update;
    if not found then raise exception 'not found' using errcode = 'P0002'; end if;
    -- the code never changes; anything visitors see clears the temple's confirmation
    changed := (old.name_th, old.capacity, old.accessible_spaces, old.vehicle_types, old.fee_note_th, old.hours_note_th, old.is_public)
               is distinct from (v_name, p_capacity, p_accessible, v_vehicles, v_fee, v_hours, coalesce(p_public, old.is_public));
    update public.parking_lots set name_th = v_name, capacity = p_capacity, accessible_spaces = p_accessible, vehicle_types = v_vehicles,
           fee_note_th = v_fee, hours_note_th = v_hours, is_public = coalesce(p_public, old.is_public), active = coalesce(p_active, old.active),
           stale_after_minutes = coalesce(p_stale, old.stale_after_minutes),
           verification_status = case when changed then 'WAITING_TEMPLE_CONFIRMATION' else old.verification_status end,
           confirmed_by = case when changed then null else old.confirmed_by end,
           confirmed_at = case when changed then null else old.confirmed_at end
     where temple_id = p_temple and parking_lots.id = p_id;
  end if;
  perform app.write_audit(p_temple, 'parking.lot_saved', 'parking_lots', id, null, case when coalesce(p_active, true) then 'ACTIVE' else 'INACTIVE' end);
  return id;
end $$;

create function app.confirm_parking_lot(p_temple uuid, p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.has_permission(p_temple, 'temple.settings', 'T') then raise exception 'only the temple can confirm' using errcode = '42501'; end if;
  update public.parking_lots set verification_status = 'TEMPLE_CONFIRMED', confirmed_by = app.current_person_id(), confirmed_at = now()
   where temple_id = p_temple and id = p_id;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  perform app.write_audit(p_temple, 'parking.lot_confirmed', 'parking_lots', p_id, null, 'TEMPLE_CONFIRMED');
end $$;

create function app.set_parking_declared(p_temple uuid, p_declared text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare old text;
begin
  if not app.has_permission(p_temple, 'parking.manage', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_declared not in ('unknown', 'none', 'lots') then raise exception 'declared must be unknown, none or lots' using errcode = '23514'; end if;
  select parking_declared into old from public.temples where id = p_temple for update;
  update public.temples set parking_declared = p_declared where id = p_temple;
  perform app.write_audit(p_temple, 'parking.declared', 'temples', p_temple, old, p_declared);
end $$;

-- Reporting: one tap at the gate. The reporter is always the caller; the guard trigger from 0004 still checks the numbers.
create function app.report_parking_status(p_temple uuid, p_lot uuid, p_status text, p_free int, p_note text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := app.current_person_id(); n bigint; id uuid; v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if me is null or not app.has_permission(p_temple, 'parking.report', 'T') then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_status not in ('AVAILABLE', 'FILLING', 'FULL', 'CLOSED') then raise exception 'status must be AVAILABLE, FILLING, FULL or CLOSED' using errcode = '23514'; end if;
  if p_status = 'CLOSED' and p_free is not null then raise exception 'CLOSED with free_spaces' using errcode = '23514'; end if;
  if char_length(v_note) > 200 then raise exception 'note too long' using errcode = '23514'; end if;
  if not exists (select 1 from public.parking_lots l where l.temple_id = p_temple and l.id = p_lot and l.active) then
    raise exception 'lot not found' using errcode = 'P0002'; end if;
  select count(*) into n from public.parking_status_reports s where s.reported_by = me and s.reported_at > now() - interval '10 minutes';
  perform app.rate_limit(n, 30);
  insert into public.parking_status_reports(temple_id, lot_id, status, free_spaces, note_th, reported_by)
  values (p_temple, p_lot, p_status, case when p_status = 'FULL' then coalesce(p_free, 0) else p_free end, v_note, me)
  returning parking_status_reports.id into id;
  return id;
end $$;

-- Staff view: every lot the caller may see (RLS: members of the temple), with the latest report and whether it is still fresh.
-- The freshness rule is the same as public.temple_parking: older than stale_after_minutes => UNKNOWN.
create function app.parking_staff_lots(p_temple uuid)
returns table (id uuid, code text, name_th text, capacity int, accessible_spaces int, vehicle_types text[], fee_note_th text,
               hours_note_th text, is_public boolean, active boolean, stale_after_minutes int, verification_status text,
               status text, free_spaces int, note_th text, reported_at timestamptz, reported_by_me boolean)
language sql stable security invoker set search_path = public, pg_temp as $$
  select l.id, l.code, l.name_th, l.capacity, l.accessible_spaces, l.vehicle_types, l.fee_note_th, l.hours_note_th, l.is_public, l.active,
         l.stale_after_minutes, l.verification_status,
         case when r.reported_at is null or r.reported_at < now() - make_interval(mins => l.stale_after_minutes) then 'UNKNOWN' else r.status end,
         case when r.reported_at is null or r.reported_at < now() - make_interval(mins => l.stale_after_minutes) then null else r.free_spaces end,
         r.note_th, r.reported_at, r.reported_by = app.current_person_id()
    from public.parking_lots l
    left join lateral (select s.status, s.free_spaces, s.note_th, s.reported_at, s.reported_by from public.parking_status_reports s
                        where s.temple_id = l.temple_id and s.lot_id = l.id order by s.reported_at desc limit 1) r on true
   where l.temple_id = p_temple
   order by l.active desc, l.code
$$;

revoke all on function app.save_parking_lot(uuid, uuid, text, text, int, int, text[], text, text, boolean, boolean, int),
  app.confirm_parking_lot(uuid, uuid), app.set_parking_declared(uuid, text),
  app.report_parking_status(uuid, uuid, text, int, text), app.parking_staff_lots(uuid) from public, anon;
grant execute on function app.save_parking_lot(uuid, uuid, text, text, int, int, text[], text, text, boolean, boolean, int),
  app.confirm_parking_lot(uuid, uuid), app.set_parking_declared(uuid, text),
  app.report_parking_status(uuid, uuid, text, int, text), app.parking_staff_lots(uuid) to authenticated;

commit;
