#!/bin/bash

set -e

echo "Starting custom PostgreSQL..."

docker-entrypoint.sh postgres &
POSTGRES_PID=$!

echo "Waiting for PostgreSQL..."
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
    sleep 2
done

echo "PostgreSQL is ready!"

# Flag de controlo — só inicializa uma vez
INIT_FLAG="/var/lib/postgresql/18/docker/.initialized"

if [ ! -f "$INIT_FLAG" ]; then
    echo "First run — initializing..."

    # Criar o user
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d postgres <<-EOSQL
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
                CREATE USER ${DB_USER} WITH PASSWORD '${DB_USER_PWD}' CREATEDB;
            END IF;
        END
        \$\$;
EOSQL

    # Criar as databases
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d postgres <<-EOSQL
        SELECT 'CREATE DATABASE ${MUKANDA_AUTH_DATABASE} OWNER ${DB_USER}'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${MUKANDA_AUTH_DATABASE}')\gexec

        SELECT 'CREATE DATABASE ${MUKANDA_BUSINESS_DATABASE} OWNER ${DB_USER}'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${MUKANDA_BUSINESS_DATABASE}')\gexec

        SELECT 'CREATE DATABASE ${N8N_DATABASE} OWNER ${DB_USER}'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${N8N_DATABASE}')\gexec

        SELECT 'CREATE DATABASE ${EVOGO_AUTH_DATABASE} OWNER ${DB_USER}'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${EVOGO_AUTH_DATABASE}')\gexec
EOSQL

    # Marca como inicializado
    touch "$INIT_FLAG"
    echo "Initialization complete!"
else
    echo "Already initialized — skipping."
fi

wait $POSTGRES_PID