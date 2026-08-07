#!/bin/sh
set -e

echo "Starting ${APP_NAME}"

case "$APP_NAME" in

  auth-service)
    echo "Running auth migration..."
    npx prisma migrate deploy \
      --schema=./prisma/schema.prisma
    ;;

  business-service)
    echo "Running business migration..."
    npx prisma migrate deploy \
      --schema=./prisma/schema.prisma
    ;;

esac

echo "Launching Nest..."

exec node dist/apps/${APP_NAME}/main.js