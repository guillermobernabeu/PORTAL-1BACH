# Progreso del trabajo nocturno (Fable) · 2026-11-16
Plan: 1 ordenar+pruebas+seguridad · 2 PWA+push · 3 pistas/predicción + exámenes IA · 4 informe.
- [x] index.html dividido en css/portal.css + js/*.js (orden: base, examenes, calendario, practica, portada, ranking, chat, admin, amigos, asignatura, app, portal(módulo)).
- [x] tests/ + tools/probar.sh (32 pruebas)
- [x] seguridad: topes de puntos, Worker con límites, reglas endurecidas en scratchpad/firestore.rules (NO en el repo)
- [x] PWA
- [x] push (FCM vía Worker; falta VAPID + FIREBASE_SA)
- [x] pistas/predicción (shared/prediccion.js + shared/prep.js)
- [x] exámenes IA (Worker /examen y /corregir)
- [x] informe (incluye reglas Firestore completas; pasos VAPID + FIREBASE_SA en Cloudflare)
Notas: el usuario está dormido; no preguntar. Pedido en el primer mensaje: clave VAPID (puede pegarla) y secreto FIREBASE_SA en Cloudflare.
