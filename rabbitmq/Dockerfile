FROM rabbitmq:3-management-alpine

# Copia o script para a raiz
COPY ./script/entrypoint.sh /entrypoint.sh

# Concede permissão de execução
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]