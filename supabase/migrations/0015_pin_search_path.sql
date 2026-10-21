-- 0015 Pin search_path on every app function that did not set one (Supabase security advisor:
-- function_search_path_mutable). Same value as the rest of the schema; behaviour is unchanged.
-- 01_schema now asserts that no app/public function is left without a pinned search_path.
begin;
alter function app.deny_mutation() set search_path = public, pg_temp;
alter function app.effective_status(text, timestamptz) set search_path = public, pg_temp;
alter function app.rate_limit(bigint, int) set search_path = public, pg_temp;
alter function app.building_guard() set search_path = public, pg_temp;
alter function app.schedule_source_guard() set search_path = public, pg_temp;
alter function app.inv_window(public.invitations, integer) set search_path = public, pg_temp;
alter function app.polygon_ok(jsonb) set search_path = public, pg_temp;
commit;
