#!/usr/bin/env bash
# Spins up a throwaway PostgreSQL, applies the migration on a Supabase stub and runs rule tests.
set -euo pipefail
cd "$(dirname "$0")"
PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)
PATH="${PGBIN:+$PGBIN:}$PATH"
TMP=$(mktemp -d); PORT=${PGPORT_TEST:-54329}
cleanup() { pg_ctl -D "$TMP" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
initdb -D "$TMP" -U postgres -A trust >/dev/null
pg_ctl -D "$TMP" -o "-p $PORT -k $TMP -c listen_addresses=''" -w start >/dev/null
P="psql -h $TMP -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$P -c 'create database t' && P="$P -d t"
$P -f supabase_stub.sql
$P -f ../migrations/*.sql
$P -f rules_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
