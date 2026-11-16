# Pruebas del portal 1 BACH

`sh tools/probar.sh` pasa todas las pruebas (`tests/*.test.js`) en un Chromium sin cabeza con un Firebase simulado (`tests/mock-firebase.js`), así que no tocan la base de datos real.

- `tests/harness.js`: servidor estático, navegador y utilidades (`A.pagina`, `A.abrir`, `A.texto`, `A.datos`…). El Worker de Cloudflare también se simula (`A.worker.respuesta`).
- `MIPANEL_CLAVE=...` (la clave del panel cifrado) prueba además Mi panel con datos; sin ella esa parte se omite.
- Librerías de jsdelivr (marked, DOMPurify, KaTeX): si existen en `tests/libs/node_modules` se usan; si no, el portal usa su texto plano de reserva.

Añadir una prueba: exporta funciones `async (A, ctx) => {...}` desde un archivo `tests/NN-nombre.test.js`.
