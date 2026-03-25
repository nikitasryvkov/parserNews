#!/bin/sh
set -e
echo "[Start] Running migrations..."
npm run migrate
echo "[Start] Starting app..."
exec node dist/index.js
