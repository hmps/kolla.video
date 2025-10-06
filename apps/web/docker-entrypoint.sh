#!/bin/sh
set -e

echo "Running database migrations..."

# Run migrations
cd /app/packages/db
node -r /app/packages/db/node_modules/tsx/dist/cjs/index.cjs /app/packages/db/src/migrate.ts

echo "Migrations completed successfully!"

echo "Starting Next.js application..."

# Start the Next.js application
cd /app
exec node apps/web/server.js
