FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund --include=dev

FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Скрипт старта лежит вне /app, поэтому bind-mount исходников его не затирает.
# sed убирает CRLF: при клонировании в Windows файл может получить \r\n и тогда shebang не сработает.
COPY docker/dev-start.sh /usr/local/bin/dev-start.sh
RUN sed -i 's/\r$//' /usr/local/bin/dev-start.sh && chmod +x /usr/local/bin/dev-start.sh
EXPOSE 3000
CMD ["dev-start.sh"]

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

USER node
EXPOSE 3000
CMD ["sh","-c","node_modules/.bin/prisma migrate deploy && node dist/db/seed.js && node dist/server.js"]