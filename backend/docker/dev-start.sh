#!/bin/sh
# Старт backend в dev-режиме.
#
# Главное правило: контейнер НЕ падает, даже если миграции или сид не прошли. Тогда его можно открыть
# (`docker compose exec backend sh`) и разобраться, а причина видна в логах (`docker compose logs backend`).
# Сервер запускается через `tsx watch`: при ошибке в коде он не завершает процесс, а ждёт правки файла.
#
# Используем локальные бинарники из node_modules/.bin, а не npx: npx при их отсутствии пытается скачать
# пакет из сети и зависает.

BIN=./node_modules/.bin
MIGRATE_FAILED=""

echo "=== [dev] 1/4 prisma generate"
if ! "$BIN/prisma" generate --schema=prisma/schema.prisma; then
  echo "!!! [dev] prisma generate завершился с ошибкой. Проверьте prisma/schema.prisma."
fi

echo "=== [dev] 2/4 prisma migrate deploy"
if ! "$BIN/prisma" migrate deploy; then
  MIGRATE_FAILED=1
  echo "!!! [dev] Миграции не применены."
  echo "!!! Если база осталась от прошлых запусков (ошибки P3009, P3018, 'already exists', 'does not exist'),"
  echo "!!! один раз сбросьте тома и запустите проект заново:"
  echo "!!!   docker compose -f compose.base.yaml -f compose.dev.yaml down -v"
fi

echo "=== [dev] 3/4 seed (справочники и демо-данные)"
if [ -n "$MIGRATE_FAILED" ]; then
  echo "--- [dev] seed пропущен из-за ошибки миграций"
elif ! "$BIN/tsx" src/db/seed.ts; then
  echo "!!! [dev] seed не выполнен: справочники статусов и оборудования могут быть пустыми."
fi

echo "=== [dev] 4/4 запуск сервера (tsx watch)"
exec "$BIN/tsx" watch --clear-screen=false src/server.ts
