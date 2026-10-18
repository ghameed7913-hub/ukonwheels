#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# A new throwaway PostgreSQL instance: never uses DATABASE_URL or a live service.
PG_BIN="${PG_BIN:-/nix/store/bgwr5i8jf8jpg75rr53rz3fqv5k8yrwp-postgresql-16.10/bin}"
tmp="$(mktemp -d /tmp/ukow-pickup-test.XXXXXX)"
trap '"$PG_BIN/pg_ctl" -D "$tmp/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$tmp"' EXIT
"$PG_BIN/initdb" -D "$tmp/data" -U ukow_test -A trust --no-locale >/dev/null
"$PG_BIN/pg_ctl" -D "$tmp/data" -l "$tmp/postgres.log" -o "-c listen_addresses='' -k $tmp -p 55439" -w start >/dev/null
"$PG_BIN/createdb" -h "$tmp" -p 55439 -U ukow_test ukow_pickup_checklist_test
export PGOPTIONS="-c ukow.isolated_test=yes"
PSQL=("$PG_BIN/psql" -h "$tmp" -p 55439 -U ukow_test -d ukow_pickup_checklist_test -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f supabase/tests/pickup-checklist.test.sql
# Exercise the existing real status RPC alongside the new checklist RPC.
node -e 'const fs=require("fs");const s=fs.readFileSync("supabase/ukow_production_architecture.sql","utf8");const start=s.indexOf("create or replace function public.update_booking_status(");if(start<0)throw Error("Missing status function");const end=s.indexOf("$$;",s.indexOf("as $$",start))+3;process.stdout.write(s.slice(start,end));' > "$tmp/status.sql"
"${PSQL[@]}" -f "$tmp/status.sql"
"${PSQL[@]}" -f supabase/pickup-checklist.sql
# Repeatability must not drop old inspections, photos or existing settings.
"${PSQL[@]}" -f supabase/pickup-checklist.sql
"${PSQL[@]}" -f supabase/tests/pickup-checklist-cases.sql
