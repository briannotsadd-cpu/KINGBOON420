#!/usr/bin/env bash
# Local dev database: persistent PG16 cluster in ./.pgdata on port 54322 with migrations + seed applied.
# Usage: bash supabase/dev/local-db.sh start|stop|reset   → DATABASE_URL=postgres://postgres@localhost:54322/boon
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; DATA="$ROOT/.pgdata"; PORT=54322
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
if [ "$(id -u)" = 0 ]; then RUN() { su postgres -s /bin/bash -c "$*"; }; else RUN() { bash -c "$*"; }; fi
PSQL="$PGBIN/psql -X -q -v ON_ERROR_STOP=1 -h localhost -p $PORT -U postgres"
case "${1:-start}" in
  stop)  RUN "$PGBIN/pg_ctl -D $DATA -m fast stop" ;;
  reset) "$0" stop || true; rm -rf "$DATA"; exec "$0" start ;;
  start)
    if [ ! -d "$DATA" ]; then
      mkdir -p "$DATA"; [ "$(id -u)" = 0 ] && chown postgres "$DATA"
      RUN "$PGBIN/initdb -D $DATA -A trust -U postgres >/dev/null"; FRESH=1
    fi
    RUN "$PGBIN/pg_ctl -D $DATA -o \"-p $PORT -c listen_addresses=localhost\" -l $DATA/log -w start >/dev/null" || true
    if [ "${FRESH:-0}" = 1 ]; then
      RUN "$PGBIN/createdb -h localhost -p $PORT -U postgres boon"
      for f in "$ROOT"/supabase/migrations/*.sql "$ROOT"/supabase/seed/*.sql; do RUN "$PSQL -d boon -f $f"; done
    fi
    echo "DATABASE_URL=postgres://postgres@localhost:$PORT/boon" ;;
esac
