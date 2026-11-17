# Portal 1 BACH

Portal de estudio de 1.º de Bachillerato: https://guillermobernabeu.github.io/PORTAL-1BACH/ · Bernabéu

- `index.html` + `css/portal.css` + `js/*.js` (se cargan en orden y comparten variables; `js/portal.js` es el módulo de Firebase).
- `shared/`: `fb.js` (Firebase, ranking, avisos, push), `lateral.js` (paneles de las apps), `apuntes.js` (📚 apuntes de la clase),
  `mipanel.js` (Mi panel cifrado del administrador), `prep.js` + `prediccion.js` (🎯 mapa de qué entra y exámenes de prueba con IA).
- Apps de Inglés: `vocabulary/`, `verbos/`, `afijos/`, `wordformation/`. Visor de apuntes compartidos: `apuntes/`.
- `cloudflare/worker.js`: conversor de apuntes, exámenes de prueba, notificaciones push y recordatorio de exámenes (se despliega solo desde GitHub).
- `sw.js` + `manifest.webmanifest` + `iconos/`: app instalable y sin conexión.
- Antes de cada subida: `sh tools/version.sh` (versión nueva y `?v=` en los scripts) y `sh tools/probar.sh` (pruebas en `tests/`).
