#!/usr/bin/env bash
# Startet ein temporäres Postgres, spielt die Migrationen (ohne Cron) ein und führt die Tests aus.
# Voraussetzung: Postgres-Server-Binaries (initdb, pg_ctl) im PATH oder unter /usr/lib/postgresql/*/bin.
set -euo pipefail
SCRIPT="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
if [ "$(id -u)" = 0 ] && id postgres >/dev/null 2>&1; then
  # initdb verweigert root; als postgres-Nutzer erneut starten.
  exec runuser -u postgres -- bash -c "cd /tmp && '$SCRIPT'"
fi
cd "$(dirname "$SCRIPT")/.."

PG_BIN=$(dirname "$(command -v initdb 2>/dev/null || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")
DATA=$(mktemp -d)
PORT=${PGTEST_PORT:-54329}
trap '"$PG_BIN/pg_ctl" -D "$DATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DATA"' EXIT

"$PG_BIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $DATA -c listen_addresses=''" -l "$DATA/log" start >/dev/null

PSQL=(psql -h "$DATA" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f tests/supabase_stubs.sql
for f in migrations/*.sql; do
  case "$f" in *cron*) echo "überspringe $f (benötigt pg_cron/pg_net)"; continue ;; esac
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -o /dev/null -f tests/schema_test.sql
