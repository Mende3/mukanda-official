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

RUN npm i

# Gera os tipos/cliente do Prisma
RUN npx prisma generate --schema=apps/${APP_NAME}/prisma/schema.prisma

# Compila o serviço específico do NestJS
RUN npm run build ${APP_NAME}

# Remove dependências de desenvolvimento sem apagar os ficheiros do Prisma
RUN npm prune --omit=dev

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

COPY script/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]