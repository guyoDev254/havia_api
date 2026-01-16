#!/bin/sh
set -e

echo "🚀 Starting container initialization..."

# Check if migrations should be run (default: yes)
RUN_MIGRATIONS=${RUN_MIGRATIONS:-true}

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "📦 Running database migrations..."
  npx prisma migrate deploy || {
    echo "⚠️  Migration failed, but continuing..."
  }
else
  echo "⏭️  Skipping migrations (RUN_MIGRATIONS=false)"
fi

echo "✅ Initialization complete"
echo "🚀 Starting API server..."

# Execute the main command (either from CMD or passed as arguments)
exec "$@"
