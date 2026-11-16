#!/bin/sh
# Pasa todas las pruebas del portal (tests/*.test.js) con un Firebase simulado.
# Uso: sh tools/probar.sh [filtro]   · con MIPANEL_CLAVE=... también se prueba Mi panel con datos.
cd "$(dirname "$0")/.." || exit 1
command -v node >/dev/null || { echo "Hace falta Node.js"; exit 1; }
node -e "require('playwright')" 2>/dev/null || { echo "Hace falta Playwright: npm i playwright && npx playwright install chromium"; exit 1; }
for f in js/*.js shared/*.js cloudflare/*.js; do node --check "$f" || exit 1; done
exec node tests/run.js "$@"
