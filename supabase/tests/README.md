# DB tests

```
bash supabase/tests/run.sh            # throwaway PG16 cluster (unix socket, port 54329), exits non-zero on failure
KEEP=1 PGBIN=/usr/lib/postgresql/16/bin bash supabase/tests/run.sh
python3 supabase/seed/gen_roles_seed.py          # regenerate seed/001 after editing docs/master/role_permissions.yaml
python3 supabase/seed/gen_roles_seed.py --check  # run.sh does this first; fails if stale
```
Needs PostgreSQL 16 binaries, python3 + PyYAML. As root, run.sh uses `su postgres`.

| File | Proves |
|---|---|
| 01_schema | every public table: forced RLS; tenant tables have temple_id; tenant->tenant FKs composite |
| 02_isolation | 14 tenant tables x 28 roles (from YAML seed): other temple -> 0 rows, INSERT 42501, UPDATE/DELETE 0 rows; positive controls |
| 03_ledgers | no monastic in community ledger and vice-versa; no negative balance; idempotency; no UPDATE/DELETE/TRUNCATE (ledgers, audit) |
| 04_quest_guards | legal transitions only; verifier != assignee; every transition audited; cross-temple FKs rejected |

Mutation check: change a policy (e.g. `quests_sel ... using (true or ...)`) and 02_isolation must fail.
