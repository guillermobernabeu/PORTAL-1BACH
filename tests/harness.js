// Arnés de pruebas del portal 1 BACH: servidor estático + navegador (Playwright) + Firebase simulado.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const mods = require("./mock-firebase");
const RAIZ = path.resolve(__dirname, "..");
const MIME = { html: "text/html", js: "text/javascript", css: "text/css", json: "application/json", jpg: "image/jpeg", png: "image/png", svg: "image/svg+xml", bin: "application/octet-stream", webmanifest: "application/manifest+json" };

function servidor() {
  return new Promise(res => {
    const s = http.createServer((req, r) => {
      let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
      const f = path.join(RAIZ, p);
      if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end("no"); return; }
      r.writeHead(200, { "Content-Type": MIME[path.extname(f).slice(1)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(r);
    });
    s.listen(0, "127.0.0.1", () => res({ s, url: `http://127.0.0.1:${s.address().port}` }));
  });
}

// librerías de jsdelivr (marked, dompurify, katex) si están instaladas en tests/libs; si no, se abortan y el portal usa texto plano
const LIBS = path.join(__dirname, "libs", "node_modules");
function sirveLib(route) {
  const u = route.request().url().replace(/^https:\/\/cdn\.jsdelivr\.net\/npm\//, "").replace(/@[0-9.]+/, "").split("?")[0];
  const f = path.join(LIBS, u);
  if (fs.existsSync(f)) route.fulfill({ status: 200, contentType: u.endsWith(".css") ? "text/css" : "text/javascript", body: fs.readFileSync(f) }); else route.abort();
}

class Arnes {
  async iniciar() {
    const { s, url } = await servidor(); this.srv = s; this.url = url;
    this.browser = await chromium.launch();
    this.worker = { peticiones: [], respuesta: { texto: "# Apunte de prueba\n\nTexto." } };
  }
  async cerrar() { await this.browser.close(); this.srv.close(); }
  // Contexto nuevo con todo interceptado. opts.movil para 390px.
  async contexto(opts = {}) {
    const ctx = await this.browser.newContext({ viewport: opts.movil ? { width: 390, height: 844 } : { width: 1300, height: 900 }, deviceScaleFactor: 1, serviceWorkers: "block" });
    // (las rutas se evalúan en orden inverso: la genérica va primero para que las concretas manden)
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await ctx.route("https://www.gstatic.com/**", r => { const k = Object.keys(mods).find(k => r.request().url().split("?")[0].endsWith(k)); k ? r.fulfill({ status: 200, contentType: "text/javascript", body: mods[k] }) : r.abort(); });
    await ctx.route("https://fonts.**", r => r.abort());
    await ctx.route("https://cdn.jsdelivr.net/**", sirveLib);
    await ctx.route("https://apuntes-1bach*.maison-ichie.workers.dev/**", async r => {
      const req = r.request(); const pet = { url: req.url(), metodo: req.method(), auth: req.headers()["authorization"] || "", cuerpo: null };
      try { pet.cuerpo = JSON.parse(req.postData() || "null"); } catch (e) {}
      this.worker.peticiones.push(pet);
      const resp = typeof this.worker.respuesta === "function" ? this.worker.respuesta(pet) : this.worker.respuesta;
      r.fulfill({ status: resp.status || 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }, body: JSON.stringify(resp.body || resp) });
    });
    const errores = []; ctx.on("page", p => p.on("pageerror", e => errores.push(e.message)));
    ctx.errores = errores; return ctx;
  }
  // Página con datos semilla: usuario (null = sin sesión), colecciones de Firestore y otros valores de localStorage.
  async pagina(ctx, { usuario, datos = {}, local = {} } = {}) {
    const p = await ctx.newPage(); ctx.errores.length = 0;
    await p.goto(this.url + "/version.json");
    await p.evaluate(({ u, st, local }) => { localStorage.clear(); if (u) localStorage.u = JSON.stringify(u); localStorage.st = JSON.stringify(st); for (const k in local) localStorage.setItem(k, typeof local[k] === "string" ? local[k] : JSON.stringify(local[k])); }, { u: usuario, st: datos, local });
    return p;
  }
  // Abre una ruta del portal y pasa la pantalla de bienvenida.
  async abrir(p, ruta = "", ms = 1500) {
    await p.goto(this.url + "/" + ruta); await p.waitForTimeout(700);
    await p.evaluate(() => document.getElementById("entrar")?.click()); await p.waitForTimeout(ms);
  }
  datos(p) { return p.evaluate(() => JSON.parse(localStorage.st || "{}")); }
  texto(p, sel) { return p.evaluate(s => document.querySelector(s)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel); }
  hay(p, sel) { return p.evaluate(s => !!document.querySelector(s), sel); }
}

// Usuarios y datos de ejemplo
const HOY = (() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })();
const enDias = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const U = {
  admin: { uid: "u1", displayName: "Guillermo Bernabéu", email: "guillee.bs15@gmail.com", photoURL: "" },
  gon: { uid: "u2", displayName: "Gonzalo Carrera", email: "gon@x", photoURL: "" },
  ser: { uid: "u3", displayName: "Sergio Arjona", email: "ser@x", photoURL: "" },
};
const app = (ok, total, dia = HOY, ok0 = 0) => ({ ok, total, t: 1, dia, ok0 });
const base = () => ({
  usuarios: { u1: { nombreGoogle: "Guillermo Bernabéu", visto: Date.now() }, u2: { nombreGoogle: "Gonzalo Carrera", visto: Date.now() }, u3: { nombreGoogle: "Sergio Arjona", visto: Date.now() - 864e5 } },
  progreso: { u1: { apps: { vocab: app(50, 100) } }, u2: { apps: { vocab: app(40, 100) } }, u3: { apps: { vocab: app(30, 100), plur: app(5, 61) } } },
  chat: {},
});

module.exports = { Arnes, U, HOY, enDias, app, base };
