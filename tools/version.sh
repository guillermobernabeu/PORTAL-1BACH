#!/bin/sh
# Antes de cada subida: nueva versión en version.json y ?v= en todos los .js/.css locales
# para que ningún navegador mezcle archivos viejos y nuevos (las páginas se recargan solas al cambiar version.json).
cd "$(dirname "$0")/.." || exit 1
V=$(date +%s)
printf '{"v":"%s"}\n' "$V" > version.json
grep -rlE '\.(js|css)(\?v=[0-9]+)?"' --include=*.html --include=*.js . | grep -vE 'node_modules|^\./x/|^\./cloudflare/|^\./tests/' | while read f; do
  # referencias locales: "ruta/archivo.js" o "ruta/archivo.css" (no http...), con o sin ?v=
  sed -i -E "s#\"((\.\./|\./)?[A-Za-z0-9_/.-]+\.(js|css))(\?v=[0-9]+)?\"#\"\1?v=$V\"#g" "$f"
done
# el service worker lleva la versión dentro: así se instala uno nuevo en cada subida
sed -i -E "s/^const VERSION = \"[0-9]*\";/const VERSION = \"$V\";/" sw.js
echo "$V"
