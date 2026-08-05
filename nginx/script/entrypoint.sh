#!/bin/sh
set -e

CERT_DIR=/etc/nginx/certs
CERT_FILE=$CERT_DIR/localhost.crt
KEY_FILE=$CERT_DIR/localhost.key

mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
	echo "[nginx] A gerar certificado SSL self-signed para localhost..."
	openssl req -x509 -nodes -newkey rsa:2048 \
		-keyout "$KEY_FILE" \
		-out "$CERT_FILE" \
		-days 365 \
		-subj "/C=AO/ST=Luanda/L=Luanda/O=Ngolo/CN=localhost" \
		-addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
		2>/dev/null
	echo "[nginx] Certificado gerado com sucesso."
else
	echo "[nginx] Certificado já existe, a reutilizar."
fi

exec nginx -g "daemon off;"
