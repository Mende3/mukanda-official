#!/bin/bash

# Caminhos absolutos para execução no Cron
PROJECT_DIR="/home/mendes/Documents/projetos/mukanda-prod"
ENV_FILE="$PROJECT_DIR/.env"
URL="https://wppconnect.io/pt-BR/whatsapp-versions/"
VAR_NAME="CONFIG_SESSION_PHONE_VERSION"
DOCKER_CONTAINER="evolution-go"
LOG_FILE="$PROJECT_DIR/shellscripts/wa_update.log"

# 1. Busca a versão bruta na web
RAW_VERSION=$(curl -s "$URL" | grep -oP '(?<=whatsapp\.com/\?v=)[^"&]+')

if [ -z "$RAW_VERSION" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [ERRO] Não foi possível obter a versão na web." >> "$LOG_FILE"
    exit 1
fi

# 2. Remove o sufixo '-alpha' ou similar
LATEST_VERSION="${RAW_VERSION%%-*}"

# 3. Obtém a versão atual no .env
CURRENT_VERSION=""
if [ -f "$ENV_FILE" ]; then
    CURRENT_VERSION=$(grep -E "^${VAR_NAME}=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
fi

# 4. Compara e atualiza
if [ "$CURRENT_VERSION" = "$LATEST_VERSION" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [INFO] Versão $CURRENT_VERSION mantida. Nenhuma alteração." >> "$LOG_FILE"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [UPDATE] Nova versão! (${CURRENT_VERSION:-'nenhuma'} -> $LATEST_VERSION)" >> "$LOG_FILE"
    
    # Atualiza o arquivo .env
    if grep -q "^${VAR_NAME}=" "$ENV_FILE" 2>/dev/null; then
        sed -i "s|^${VAR_NAME}=.*|${VAR_NAME}=${LATEST_VERSION}|" "$ENV_FILE"
    else
        echo "${VAR_NAME}=${LATEST_VERSION}" >> "$LOG_FILE"
    fi
    
    # Recria o container para forçar a leitura do novo .env
    cd "$PROJECT_DIR" && /usr/bin/docker compose up -d --force-recreate $DOCKER_CONTAINER >> "$LOG_FILE" 2>&1

    echo "$(date '+%Y-%m-%d %H:%M:%S') - [SUCCESS] Container $DOCKER_CONTAINER recriado com a nova versão $LATEST_VERSION." >> "$LOG_FILE"
fi