#!/bin/sh
set -e

echo "Starting ${APP_NAME}"


case "$APP_NAME" in

  auth-service)
    echo "Running auth migration..."
    npx prisma migrate deploy \
      --schema=apps/auth-service/prisma/schema.prisma

    npm run seed:admin
    ;;


  business-service)
    echo "Running business migration..."
    npx prisma migrate deploy \
      --schema=apps/business-service/prisma/schema.prisma

    npm run seed:plan
    ;;

esac


echo "Launching Nest..."

exec node dist/apps/${APP_NAME}/main.js