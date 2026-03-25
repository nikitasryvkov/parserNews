#!/bin/sh
set -e

DB_HOST="${DB_HOST:-postgres}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-parser_news}"
export PGPASSWORD="${DB_PASSWORD:-postgres}"

echo "Waiting for PostgreSQL at ${DB_HOST}..."
until psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; do
  sleep 1
done

EXISTS=$(psql -h "$DB_HOST" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null || echo "")

if [ "$EXISTS" != "1" ]; then
  echo "Creating database ${DB_NAME}..."
  psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME};"
fi

exec "$@"
