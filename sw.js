// Service worker de 1 BACH · Bernabéu
// 1) Funciona sin conexión: guarda lo que vas visitando (portal, apps de Inglés, librerías) y lo sirve si no hay red.
//    Con red, siempre pide la versión nueva (así la recarga automática por version.json sigue funcionando).
// 2) Notificaciones push (FCM) aunque el portal esté cerrado.
const VERSION = "1795374493";                       // la cambia tools/version.sh en cada subida
const CACHE = "1bach-" + VERSION;
const RAIZ = new URL("./", self.location).pathname;
const PRECARGA = ["./", "./index.html", "./css/portal.css?v=1795374493", "./data/clase.json", "./fondo.jpg", "./manifest.webmanifest", "./iconos/icono-192.png",
  "./vocabulary/", "./vocabulary/lista.html", "./vocabulary/palabras.js?v=1795374493", "./vocabulary/plurales.js?v=1795374493", "./verbos/", "./afijos/", "./wordformation/", "./apuntes/"];
const CACHEABLE = (u) => u.origin === self.location.origin
  || /^https:\/\/(www\.gstatic\.com\/firebasejs|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com)\//.test(u.href);

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(PRECARGA.map(p => fetch(p, { cache: "no-store" }).then(r => r.ok && c.put(p, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (!CACHEABLE(u) || u.pathname.endsWith("/version.json")) return;   // Firestore, Worker, version.json: directo
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const clave = u.origin === self.location.origin ? u.pathname : req.url;  // la misma ruta con otro ?v= sustituye a la anterior
    try {
      const r = await fetch(req);
      if (r.ok && (r.type === "basic" || r.type === "cors")) c.put(clave, r.clone()).catch(() => {});
      return r;
    } catch (err) {
      const hit = await c.match(clave) || (req.mode === "navigate" ? await c.match(RAIZ) || await c.match("./index.html") : null);
      return hit || new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
// ---------- notificaciones push (las envía el Worker de Cloudflare a través de Firebase Cloud Messaging) ----------
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { notification: { body: e.data && e.data.text() } }; }
  const n = d.notification || {}, extra = d.data || {};
  const titulo = n.title || extra.title || "1 BACH", cuerpo = n.body || extra.body || "";
  e.waitUntil(self.registration.showNotification(titulo, {
    body: cuerpo, icon: "./iconos/icono-192.png", badge: "./iconos/icono-96.png", tag: extra.tag || "1bach", renotify: !!extra.tag,
    data: { url: extra.url || n.click_action || "./" }, lang: "es", vibrate: [80, 40, 80],
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url || "./", self.location).href;
  e.waitUntil((async () => {
    const todas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of todas) { if (c.url.startsWith(new URL("./", self.location).href)) { await c.focus(); try { await c.navigate(url); } catch (x) {} return; } }
    await self.clients.openWindow(url);
  })());
});
