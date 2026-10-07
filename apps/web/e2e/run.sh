#!/usr/bin/env bash
# Runs the E2E suite against a fresh local DB and a production build. Leaves the dev DB empty afterwards.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"; ROOT="$HERE/../.."
CHROME="${CHROME:-$(ls -d /opt/pw-browsers/chromium-*/chrome-linux*/chrome | head -1)}"
SHOTS="${SHOTS:-$ROOT/docs/app}"; LOG="$(mktemp)"; mkdir -p "$SHOTS"
# E2E_PORT / E2E_DB let several suites run in parallel (separate worktrees) against one local PG cluster on :54322.
# E2E_SPECS: space-separated spec files (default: every e2e/*.e2e.mjs).
PORT="${E2E_PORT:-3000}"; DB="${E2E_DB:-boon}"
PSQL="psql -X -q -v ON_ERROR_STOP=1 -h localhost -p 54322 -U postgres"
pg_isready -q -h localhost -p 54322 || bash "$ROOT/supabase/dev/local-db.sh" start >/dev/null
fresh_db() { $PSQL -d postgres -c "drop database if exists $DB with (force)" -c "create database $DB" >/dev/null
  for f in "$ROOT"/supabase/migrations/*.sql "$ROOT"/supabase/seed/*.sql; do $PSQL -d "$DB" -f "$f" >/dev/null; done; }
fresh_db
export AUTH_PEPPER="$(head -c 24 /dev/urandom | base64)" DATABASE_URL=postgres://postgres@localhost:54322/$DB PLATFORM_ADMIN_EMAILS=admin@example.com MAIL_DEV_LOG=1 NEXT_TELEMETRY_DISABLED=1 BASE="http://localhost:$PORT" E2E_DB="$DB"
cd "$HERE"
[ "${SKIP_BUILD:-0}" = 1 ] || pnpm -s build >/dev/null
if curl -s -o /dev/null "$BASE/"; then echo "port $PORT is already in use - stop the other server first"; exit 1; fi
setsid node node_modules/next/dist/bin/next start -p "$PORT" >"$LOG" 2>&1 & PID=$!
trap 'kill -- -$PID 2>/dev/null || true; fresh_db || true' EXIT
for i in $(seq 1 40); do curl -sf -o /dev/null "$BASE/" && break; sleep 0.5; done
for spec in ${E2E_SPECS:-$(ls e2e/*.e2e.mjs)}; do
  echo "== $spec"
  node "$spec" "$CHROME" "$SHOTS" "$LOG" || { echo "--- server log (errors) ---"; grep -v "dev-mail" "$LOG" | tail -40; exit 1; }
  fresh_db   # every spec starts from an empty database
done
