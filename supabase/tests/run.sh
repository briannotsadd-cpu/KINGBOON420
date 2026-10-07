#!/usr/bin/env bash
# Throwaway PostgreSQL 16 cluster -> migrations + seed -> all tests. Exit non-zero on any failure.
# Env: PGBIN (default /usr/lib/postgresql/16/bin or PATH), KEEP=1 to keep the data dir.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-}"
[ -z "$PGBIN" ] && { [ -x /usr/lib/postgresql/16/bin/initdb ] && PGBIN=/usr/lib/postgresql/16/bin || PGBIN="$(dirname "$(command -v initdb)")"; }
WORK="$(mktemp -d)"; chmod 755 "$WORK"
PORT="${PGPORT:-54329}"
if [ "$(id -u)" = 0 ]; then RUN="su postgres -s /bin/bash -c"; chown postgres "$WORK"; else RUN="bash -c"; fi
sh() { $RUN "$1"; }
cleanup() { sh "$PGBIN/pg_ctl -D $WORK/data -m immediate stop >/dev/null 2>&1" || true; [ "${KEEP:-0}" = 1 ] || rm -rf "$WORK"; }
trap cleanup EXIT
python3 "$ROOT/supabase/seed/gen_roles_seed.py" --check || { echo "FAIL: 001_roles_permissions.sql is stale; run gen_roles_seed.py"; exit 1; }
sh "$PGBIN/initdb -D $WORK/data -A trust -U postgres >/dev/null"
sh "$PGBIN/pg_ctl -D $WORK/data -o \"-p $PORT -k $WORK -c listen_addresses=''\" -l $WORK/log -w start >/dev/null"
PSQL="$PGBIN/psql -X -q -v ON_ERROR_STOP=1 -h $WORK -p $PORT -U postgres"
sh "$PGBIN/createdb -h $WORK -p $PORT -U postgres boon_test"
run() { echo "== $1"; local out rc=0; out="$(sh "$PSQL -d boon_test -f $2" 2>&1)" || rc=$?; [ -n "$out" ] && echo "$out"; [ $rc = 0 ] || { echo "FAILED: $1"; exit 1; }; }
for f in "$ROOT"/supabase/migrations/*.sql; do run "migration $(basename "$f")" "$f"; done
for f in "$ROOT"/supabase/seed/*.sql; do run "seed $(basename "$f")" "$f"; done
for f in "$ROOT"/supabase/tests/[0-9]*.sql; do run "test $(basename "$f")" "$f"; done
echo "ALL DB TESTS PASSED"
