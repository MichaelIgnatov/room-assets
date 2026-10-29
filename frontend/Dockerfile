# Стейдж deps, общие зависимости
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Стейдж dev, Vite с HMR
FROM node:20-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm","run","dev"]

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Стейдж prod, nginx раздаёт статику
FROM nginx:1.29-alpine AS prod
RUN rm -f /etc/nginx/conf.d/default.conf
COPY ./nginx/nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
EXPOSE 80   