#!/usr/bin/env bash
set -euo pipefail
DB_NAME="${DB_NAME:-friendsbet}"
DB_USER="${DB_USER:-friendsbet}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
export PGPASSWORD="${PGPASSWORD:-devpass}"
if [[ "${1:-}" != "-y" ]]; then
  read -r -p "This will DROP and recreate schema 'public' in database '$DB_NAME'. Type 'yes' to continue: " ans
  if [[ "$ans" != "yes" ]]; then
    echo "Aborted."
    exit 1
  fi
fi
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO ${DB_USER}; GRANT ALL ON SCHEMA public TO public;"
echo "✅ Reset complete for '$DB_NAME' on ${DB_HOST}:${DB_PORT}."
