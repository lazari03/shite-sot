#!/bin/sh
set -e
case "$1" in
  web)
    cd /app/web && exec node server.js ;;
  worker)
    cd /app/ops && exec node --conditions=react-server dist/worker.js ;;
  migrate)
    cd /app/ops
    node_modules/.bin/prisma migrate deploy
    # Reference data only (categories, cities, promotion price list). Idempotent.
    exec node --conditions=react-server dist/seed.js ;;
  admin-grant)
    shift; cd /app/ops && exec node --conditions=react-server dist/admin-grant.js "$@" ;;
  *)
    exec "$@" ;;
esac
