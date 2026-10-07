// Shared E2E seeding (FICTIONAL data only, in the suite's throwaway database E2E_DB). Runs SQL as the DB owner,
// so it bypasses the app — use it ONLY for setup that the feature under test does not cover.
import { execFileSync } from "node:child_process";

const DB = process.env.E2E_DB ?? "boon";
export const sql = (q) => execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-h", "localhost", "-p", "54322", "-U", "postgres", "-d", DB, "-c", q]).toString().trim();

/** A verified, listed, approved temple (all values TEST FIXTURE, sources on .invalid). Returns its id. */
export function seedVerifiedTemple(slug = "test-temple", nameTh = "วัดทดสอบระบบ") {
  return sql(`with t as (insert into public.temples(slug, name_th, status, is_listed, province) values ('${slug}', '${nameTh}', 'approved', true, 'จังหวัดทดสอบ') returning id),
    s as (insert into public.data_sources(temple_id, source_type, source_name, source_url, evidence)
          select id, 'onab_registry', 'TEST FIXTURE (fictional)', 'https://registry.example.invalid/${slug}', 'fixture' from t returning temple_id, id),
    f as (insert into public.persons(auth_user_id, display_name) values (gen_random_uuid(), 'TEST FIXTURE verifier') returning id),
    v as (insert into public.temple_field_values(temple_id, field_key, value, source_id, status, verified_by, verified_at, last_reviewed_at)
          select s.temple_id, k, to_jsonb(val), s.id, 'TEMPLE_CONFIRMED', f.id, now(), now() from s, f,
          (values ('temple.name_th', '${nameTh}'), ('temple.province', 'จังหวัดทดสอบ'), ('temple.address', 'ที่อยู่สมมติสำหรับทดสอบ')) x(k, val) returning 1)
    select id from t, (select count(*) from v) c`).split("\n")[0];
}

/** Give a signed-in user (by email) an active membership with the given role in a temple. Returns the person id. */
export function grantRole(email, templeId, role, opts = {}) {
  return sql(`with p as (select pe.id from public.persons pe join authx.users u on u.id = pe.auth_user_id where u.email = lower('${email}')),
    m as (insert into public.memberships(temple_id, person_id, status, monastic_kind, is_minor)
          select '${templeId}', id, 'active', '${opts.monastic ?? "none"}', ${opts.minor ? "true" : "false"} from p
          on conflict (temple_id, person_id) do update set status = 'active' returning id)
    insert into public.membership_roles(temple_id, membership_id, role_code) select '${templeId}', id, '${role}' from m
    on conflict do nothing returning (select id from p)`).split("\n")[0];
}
