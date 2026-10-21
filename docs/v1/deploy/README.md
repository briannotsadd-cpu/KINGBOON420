# Supabase deploy (project chosen by the owner: `xauusd-signals`, shared with another app)

- **Step 1 (done by Claude through the Supabase connector).** Migrations 0001–0007 and the first part of 0008 (tables, helpers and profile functions).
  - Every `DROP FUNCTION` was replaced by a rename to `zz_retired_*` plus a revoke of all privileges, which has the same effect.
  - Reason: the connector asks for a human confirmation on any `DROP` or `DELETE` statement, and that confirmation cannot be given from this session.
- **Step 2 (run once by the owner).** Run [`supabase_step2.sql`](supabase_step2.sql) in Supabase Dashboard → SQL Editor. It contains:
  - the rest of 0008, plus 0009–0014;
  - the roles and permissions seed (no temple data);
  - privilege hardening that removes the extra grants Supabase gives `anon` and `authenticated` on new `public` objects, so the grants match the tested local database exactly.

  It runs in one transaction, so if anything fails nothing is changed.
- **Testing.** Step 1 plus step 2 was replayed on a local PostgreSQL. All database tests passed, including the table × role isolation matrix.
- **Not changed.** The other app's table (`public.xauusd_signals`) and Supabase's default privileges are untouched.

## Status on 2026-10-21 (read-only check)
- **Step 2 has not been run.** The tables `events`, `buildings` and `reward_catalog` are missing and `public.roles` has 0 rows.
- **0015 is included in step 2.** It pins `search_path` on 7 functions, fixing the advisor warning `function_search_path_mutable`.
- **Open decision on which project to use.** Since commit be0a679, the app reads `KINGBOON_DATABASE_URL` and `KINGBOON_SUPABASE_PROJECT_REF`, and refuses a remote URL from any other project (`apps/web/.env.example` says to use a dedicated project).
  - **Keep using `xauusd-signals`:** its project ref must be set as `KINGBOON_SUPABASE_PROJECT_REF`. That conflicts with the "never copy XAUUSD credentials" note.
  - **Create a dedicated project:** about $10/month on the Pro plan. Re-run steps 1 and 2 there.
