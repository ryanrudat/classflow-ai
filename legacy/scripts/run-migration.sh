#!/bin/bash
# Run database migrations on Render

echo "Running migration: 012_add_content_library.sql"

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable not set"
  exit 1
fi

psql "$DATABASE_URL" < database/migrations/012_add_content_library.sql

echo "Migration completed!"
