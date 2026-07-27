ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS builder
ARG APP_NAME

WORKDIR /usr/src/app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate --schema=libs/prisma/${APP_NAME}/schema.prisma || true

RUN npm run build ${APP_NAME}

FROM node:${NODE_VERSION} AS runner
ARG APP_NAME
ENV NODE_ENV=production
ENV APP_NAME=${APP_NAME}

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_module/.prisma ./node_module/.prisma

CMD node dist/apps/${APP_NAME}/main.js