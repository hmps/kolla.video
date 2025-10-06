#!/bin/sh
set -e

echo "Starting Next.js application..."
exec node apps/web/server.js
