#!/usr/bin/env bash
# Runs the E2E suite against a fresh local DB and a production build. Leaves the dev DB empty afterwards.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"; ROOT="$HERE/../.."
CHROME="${CHROME:-$(ls -d /opt/pw-browsers/chromium-*/chrome-linux*/chrome | head -1)}"
SHOTS="${SHOTS:-$ROOT/docs/app}"; LOG="$(mktemp)"; mkdir -p "$SHOTS"
bash "$ROOT/supabase/dev/local-db.sh" reset >/dev/null
export AUTH_PEPPER="$(head -c 24 /dev/urandom | base64)" DATABASE_URL=postgres://postgres@localhost:54322/boon PLATFORM_ADMIN_EMAILS=admin@example.com MAIL_DEV_LOG=1 NEXT_TELEMETRY_DISABLED=1
cd "$HERE"
[ "${SKIP_BUILD:-0}" = 1 ] || pnpm -s build >/dev/null
if curl -s -o /dev/null http://localhost:3000/; then echo "port 3000 is already in use - stop the other server first"; exit 1; fi
setsid node node_modules/next/dist/bin/next start -p 3000 >"$LOG" 2>&1 & PID=$!
trap 'kill -- -$PID 2>/dev/null || true; bash "$ROOT/supabase/dev/local-db.sh" reset >/dev/null || true' EXIT
for i in $(seq 1 40); do curl -sf -o /dev/null http://localhost:3000/ && break; sleep 0.5; done
node e2e/registration.e2e.mjs "$CHROME" "$SHOTS" "$LOG" || { echo "--- server log (errors) ---"; grep -v "dev-mail" "$LOG" | grep -iA4 "error" | head -40; exit 1; }
