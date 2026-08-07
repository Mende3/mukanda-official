FROM nginx:alpine

# openssl para gerar certificado self-signed no primeiro arranque
RUN apk add --no-cache openssl

# Configuração do reverse proxy
COPY conf/nginx.conf /etc/nginx/conf.d/default.conf

# Script de entrypoint
COPY script/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]