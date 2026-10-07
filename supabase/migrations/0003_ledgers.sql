-- 0003 the two ledgers. Never merged: separate tables, no view/function sums them.
create table public.boon_point_transactions (       -- community (lay) ledger, signed amounts
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  person_id uuid not null references public.persons(id),
  amount int not null check (amount <> 0),
  reason text not null,
  idempotency_key text not null,
  created_by text not null default 'system:db',
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  unique (temple_id, idempotency_key),
  foreign key (temple_id, person_id) references public.memberships(temple_id, person_id)
);
create table public.monastic_activity_ledger (      -- monastic ledger; system-written only
  temple_id uuid not null references public.temples(id),
  id uuid not null default gen_random_uuid(),
  person_id uuid not null references public.persons(id),
  amount int not null check (amount <> 0),
  reason text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  primary key (temple_id, id),
  unique (temple_id, idempotency_key),
  foreign key (temple_id, person_id) references public.memberships(temple_id, person_id)
);

create function app.ledger_guard() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare kind text; bal bigint;
begin
  select monastic_kind into kind from public.memberships where temple_id = new.temple_id and person_id = new.person_id;
  if tg_table_name = 'boon_point_transactions' and kind <> 'none' then
    raise exception 'monastic membership cannot hold community boon points' using errcode = 'check_violation';
  elsif tg_table_name = 'monastic_activity_ledger' and kind = 'none' then
    raise exception 'lay membership cannot hold monastic activity ledger rows' using errcode = 'check_violation';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.temple_id::text || new.person_id::text || tg_table_name, 0));
  if tg_table_name = 'boon_point_transactions' then
    select coalesce(sum(amount), 0) into bal from public.boon_point_transactions where temple_id = new.temple_id and person_id = new.person_id;
  else
    select coalesce(sum(amount), 0) into bal from public.monastic_activity_ledger where temple_id = new.temple_id and person_id = new.person_id;
  end if;
  if bal + new.amount < 0 then raise exception 'balance cannot go negative' using errcode = 'check_violation'; end if;
  return new;
end $$;
create trigger bpt_guard before insert on public.boon_point_transactions for each row execute function app.ledger_guard();
create trigger mal_guard before insert on public.monastic_activity_ledger for each row execute function app.ledger_guard();
create trigger bpt_append_only before update or delete on public.boon_point_transactions for each row execute function app.deny_mutation();
create trigger mal_append_only before update or delete on public.monastic_activity_ledger for each row execute function app.deny_mutation();
create trigger bpt_no_truncate before truncate on public.boon_point_transactions for each statement execute function app.deny_mutation();
create trigger mal_no_truncate before truncate on public.monastic_activity_ledger for each statement execute function app.deny_mutation();

-- system writer for the monastic ledger (no INSERT policy for authenticated)
create function app.record_monastic_activity(p_temple uuid, p_person uuid, p_amount int, p_reason text, p_key text) returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into public.monastic_activity_ledger(temple_id, person_id, amount, reason, idempotency_key) values (p_temple, p_person, p_amount, p_reason, p_key)
$$;
revoke all on function app.record_monastic_activity(uuid, uuid, int, text, text) from public;

alter table public.boon_point_transactions enable row level security;
alter table public.boon_point_transactions force row level security;
alter table public.monastic_activity_ledger enable row level security;
alter table public.monastic_activity_ledger force row level security;

-- own history is implicit for any active member (G-UX-1/2). No cross-person monastic read: no ranking/comparison.
create policy bpt_sel on public.boon_point_transactions for select to authenticated using (
  app.is_member(temple_id) and (person_id = app.current_person_id() or app.has_permission(temple_id, 'points.award_community', 'D')));
create policy bpt_ins on public.boon_point_transactions for insert to authenticated with check (
  created_by = app.current_person_id()::text and amount > 0 and app.has_permission(temple_id, 'points.award_community', 'D'));
create policy mal_sel on public.monastic_activity_ledger for select to authenticated using (
  app.is_member(temple_id) and person_id = app.current_person_id());

grant select on public.monastic_activity_ledger to authenticated;
grant select, insert on public.boon_point_transactions to authenticated;
