FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

FROM dependencies AS build

COPY prisma ./prisma
RUN npm run prisma:generate

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# Reutiliza a instalação já concluída e apenas remove ferramentas de
# desenvolvimento. Assim, o runtime não depende de uma segunda conexão ao
# registry do npm.
FROM dependencies AS production-dependencies

RUN npm prune --omit=dev --no-audit --no-fund

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache dumb-init
RUN mkdir -p /app/storage && chown -R node:node /app/storage

COPY package.json package-lock.json ./
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

USER node
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm run start:prod"]
