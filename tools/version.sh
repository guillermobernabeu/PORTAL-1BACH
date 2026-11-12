#!/bin/sh
# Antes de cada subida: nueva versión y ?v= en los scripts compartidos para que ningún navegador mezcle archivos viejos y nuevos.
V=$(date +%s)
printf '{"v":"%s"}\n' "$V" > version.json
grep -rlE '(fb|lateral|palabras|plurales)\.js' --include=*.html --include=*.js . | grep -v node_modules | while read f; do
  sed -i -E "s/((shared\/|\.\/)(fb|lateral|mipanel)\.js|(palabras|plurales)\.js)(\?v=[0-9]+)?\"/\1?v=$V\"/g" "$f"
done
echo "$V"
