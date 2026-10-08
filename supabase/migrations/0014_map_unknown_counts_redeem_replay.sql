-- 0014 Fixes found while building the map and points UI:
--  * app.map_buildings returned 0 for events/quests the caller cannot see (RLS filters them silently). "Unknown" must never be
--    shown as 0: the counts are now NULL unless the caller can see every event (event.view T) / every quest (quest.view T).
--    events_today now means "today in the temple's time zone" (it was "the next 24 hours").
--  * app.redeem_reward: replaying the same request id (double tap, retry) returns the first redemption instead of failing.
begin;

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

commit;
