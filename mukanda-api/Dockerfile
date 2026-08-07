ARG NODE_VERSION=22-alpine

# --- Estágio 1: Build ---
FROM node:${NODE_VERSION} AS builder

ARG APP_NAME

WORKDIR /usr/src/app

# Copia as definições de dependências da raiz do monorepo
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

COPY . .

# Cache mount: persiste o cache do npm entre builds (inclusive builds paralelos
# dos outros serviços do monorepo), evitando re-download do zero a cada vez
RUN --mount=type=cache,target=/root/.npm \
    npm i

# Gera os tipos/cliente do Prisma, apenas se o serviço tiver schema próprio
# (ex.: api-gateway não tem banco de dados, então não tem apps/api-gateway/prisma)
# Cache mount também aqui, pois o prisma generate baixa engines binários na primeira vez
RUN --mount=type=cache,target=/root/.cache/prisma \
    if [ -f "apps/${APP_NAME}/prisma/schema.prisma" ]; then \
      npx prisma generate --schema=apps/${APP_NAME}/prisma/schema.prisma; \
    else \
      echo "Sem schema Prisma para ${APP_NAME}, a saltar prisma generate"; \
      mkdir -p "apps/${APP_NAME}/prisma"; \
      touch "apps/${APP_NAME}/prisma.config.ts"; \
    fi
# Compila o serviço específico do NestJS
RUN npm run build ${APP_NAME}

# Remove dependências de desenvolvimento sem apagar os ficheiros do Prisma
RUN --mount=type=cache,target=/root/.npm \
    npm prune --omit=dev

# --- Estágio 2: Runner ---
FROM node:${NODE_VERSION} AS runner

ARG APP_NAME

ENV NODE_ENV=production
ENV APP_NAME=${APP_NAME}

WORKDIR /usr/src/app

# Copia apenas as dependências já limpas do builder (incluindo o Prisma gerado)
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/apps/${APP_NAME}/prisma ./prisma
COPY --from=builder /usr/src/app/apps/${APP_NAME}/prisma.config.ts ./prisma.config.ts

COPY script/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]