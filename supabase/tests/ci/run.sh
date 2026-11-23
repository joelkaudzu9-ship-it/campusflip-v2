#!/usr/bin/env bash
# Runs the database security tests against a throwaway local Postgres (14+).
#   supabase/tests/ci/run.sh            check results against expected_results.txt
#   supabase/tests/ci/run.sh --update   rewrite expected_results.txt (review the diff!)
# Exit code 0 only if every attack is still BLOCKED and every legitimate flow still works.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
RESULTS="${RESULTS_FILE:-$(mktemp /tmp/cf-db-results.XXXXXX)}"

db_phase() {
  PGBIN="$(dirname "$(command -v initdb 2>/dev/null || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")"
  export PATH="$PGBIN:$PATH"
  WORK="$(mktemp -d)"
  trap 'pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT
  PORT="${PGTEST_PORT:-5599}"
  initdb -D "$WORK/data" -U postgres --auth=trust >/dev/null
  pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
  export PGHOST="$WORK" PGPORT="$PORT" PGUSER=postgres
  psql -q -v ON_ERROR_STOP=1 -c "create database t" postgres
  export PGDATABASE=t
  psql -q -v ON_ERROR_STOP=1 -f "$HERE/stubs.sql" >/dev/null
  python3 "$HERE/extract_public.py" "$ROOT/supabase/schema.sql" > "$WORK/public.sql"
  # The dump targets Supabase (owners, publications); a few statements are expected to be skipped.
  psql -q -f "$WORK/public.sql" >/dev/null 2>"$WORK/load.err" || true
  psql -q -v ON_ERROR_STOP=1 -f "$HERE/pre_migration_grants.sql" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/20261122_security_hardening.sql" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/20261123_notifications_delete.sql" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/20261124_kuhes_welcome.sql" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/20261125_web_push.sql" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/seed.sql" >/dev/null
  : > "$RESULTS"
  for f in security_checks rpc_checks payment_checks; do
    psql -q -f "$ROOT/supabase/tests/$f.sql" >> "$RESULTS" 2>&1 || true
  done
}

if [ "${1:-}" = "--db-phase" ]; then db_phase; exit 0; fi

# Postgres refuses to run as root: do the database part as an unprivileged user.
if [ "$(id -u)" = "0" ]; then
  chmod -R a+rX "$ROOT/supabase" 2>/dev/null || true
  touch "$RESULTS"; chmod a+rw "$RESULTS"
  su nobody -s /bin/bash -c "RESULTS_FILE='$RESULTS' PATH='$PATH' '$HERE/run.sh' --db-phase"
else
  RESULTS_FILE="$RESULTS" "$HERE/run.sh" --db-phase
fi
python3 "$HERE/assert_results.py" "$RESULTS" "$@"
