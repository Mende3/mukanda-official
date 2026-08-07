#!/bin/bash
set -e

echo "Starting custom rabbitmq..."

# 1. Inicia o RabbitMQ original em segundo plano (background)
/usr/local/bin/docker-entrypoint.sh rabbitmq-server &

echo "Aguardando o serviço ficar pronto..."
# 2. Aguarda o RabbitMQ responder ao ping
until rabbitmq-diagnostics -q check_running > /dev/null 2>&1; do
  sleep 2
done

echo "RabbitMQ pronto! Aplicando configurações..."

# 3. Cria o vhost usando a sua variável de ambiente
rabbitmqctl add_vhost "$RABBITMQ_MUKANDA_VHOST"

# 4. Define as permissões (ajustado para usar a variável também, mantendo a consistência)
rabbitmqctl set_permissions -p "$RABBITMQ_MUKANDA_VHOST" "$RABBITMQ_DEFAULT_USER" ".*" ".*" ".*"

echo 

echo "Configurações aplicadas com sucesso!"

# 5. Traz o processo do RabbitMQ de volta para o primeiro plano (foreground)
# Isso impede que o container Docker feche após o fim do script
wait %1
