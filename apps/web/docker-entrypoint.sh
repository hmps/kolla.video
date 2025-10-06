#!/bin/sh
set -e

echo "Running database migrations..."
cd packages/db
pnpm exec tsx src/migrate.ts
cd /app

echo "Starting Next.js application..."
exec node server.js
