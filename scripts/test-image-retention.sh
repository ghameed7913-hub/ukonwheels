#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d /tmp/ukow-retention.XXXXXX)"
trap 'pg_ctl -D "$TMP/db" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
initdb -D "$TMP/db" -U retention_test_owner -A trust --no-locale >/dev/null
pg_ctl -D "$TMP/db" -l "$TMP/postgres.log" -o "-k $TMP -h '' -p 55440" -w start >/dev/null
P=(psql -X -U retention_test_owner -h "$TMP" -p 55440 -d postgres -v ON_ERROR_STOP=1)
"${P[@]}" -f "$ROOT/tests/image-retention-fixture.sql" >/dev/null
"${P[@]}" -f "$ROOT/supabase/image-retention.sql" >/dev/null
"${P[@]}" -f "$ROOT/supabase/image-retention.sql" >/dev/null
"${P[@]}" -f "$ROOT/tests/image-retention-assertions.sql"
