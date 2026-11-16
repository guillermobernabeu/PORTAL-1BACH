const assert = require("assert");
const { U, base } = require("./harness");

// Las apps de Inglés piden cuenta; con sesión deben cargar sin errores, mostrar los paneles laterales y guardar progreso en la nube.
async function abrirApp(A, ctx, ruta, usuario = U.gon, datos = base()) {
  const p = await A.pagina(ctx, { usuario, datos });
  await p.goto(A.url + "/" + ruta); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById("go")?.click()); await p.waitForTimeout(800);
  return p;
}

module.exports = {
  "vocabulary: definición → palabra; acierto guarda puntos y progreso en la nube; marca Bernabéu y paneles": async (A, ctx) => {
    const p = await abrirApp(A, ctx, "vocabulary/");
    assert.ok(await A.hay(p, ".marca, .claude-ov, [title*='Bernabéu']"), "marca Bernabéu");
    assert.ok(await A.hay(p, ".lat-d") && await A.hay(p, ".lat-i"), "paneles laterales");
    assert.ok(/Deep Work/.test(await A.texto(p, ".lat-i")), "botón Deep Work");
    const w = await p.evaluate(() => S.q && { en: S.q.en, id: S.q.id });
    assert.ok(w, "hay una palabra preguntada");
    await p.fill(".card .inp input", w.en); await p.click(".card .inp .btn"); await p.waitForTimeout(1500);
    assert.ok(/Correcto/.test(await A.texto(p, ".fb")), "acierto");
    const st = await p.evaluate(() => JSON.parse(localStorage.vocabStats));
    assert.equal(st[w.id].a, 1);
    const d = await A.datos(p);
    assert.ok(d.progreso.u2.apps && d.progreso.u2.apps.vocab && d.progreso.u2.apps.vocab.total > 100, "progreso de vocab en la nube: " + JSON.stringify(d.progreso.u2.apps));
    assert.ok(d.progreso.u2.vocabStats && d.progreso.u2.vocabStats[w.id], "stats sincronizadas");
  },
  "vocabulary: sinónimos aceptados y respuesta casi correcta": async (A, ctx) => {
    const p = await abrirApp(A, ctx, "vocabulary/");
    const r = await p.evaluate(() => { const w = S.words.find(x => x.ok && x.ok.length); return w ? [corrige(w.ok[0], w), corrige(w.en.toUpperCase() + " ", w), corrige("zzzz", w)] : null; });
    assert.ok(r, "hay palabras con sinónimos");
    assert.equal(r[0], 2, "sinónimo vale"); assert.equal(r[1], 2, "mayúsculas y espacios no importan"); assert.equal(r[2], 0);
  },
  "vocabulary: pestaña de plurales irregulares con puntos propios (plur)": async (A, ctx) => {
    const p = await abrirApp(A, ctx, "vocabulary/#plurales");
    assert.ok(/Escribe el (plural|singular)/.test(await A.texto(p, "#main")));
    const sol = await p.evaluate(() => { const q = S.pq; return S.pdir === "ps" ? q[0] : q[1][0]; }).catch(() => null);
    const dir = await p.evaluate(() => S.pdir);
    const resp = await p.evaluate(() => { const q = S.pq; const ask = document.querySelector(".ask").textContent; return /plural de/.test(ask) ? q[1][0] : q[0]; });
    await p.fill(".card:not(.pl-cab) .inp input", resp); await p.click(".card:not(.pl-cab) .inp .btn"); await p.waitForTimeout(1800);
    assert.ok(/Correcto/.test(await A.texto(p, ".fb")));
    const d = await A.datos(p);
    assert.ok(d.progreso.u2.apps && d.progreso.u2.apps.plur, "puntos de plurales en la nube");
  },
  "vocabulary: ronda de 20 aleatorias y la lista en blanco y negro": async (A, ctx) => {
    const p = await abrirApp(A, ctx, "vocabulary/");
    await p.click("#rondaB"); await p.waitForTimeout(500);
    assert.ok(/Ronda de 20/.test(await A.texto(p, "#main")));
    await p.goto(A.url + "/vocabulary/lista.html"); await p.waitForTimeout(1500);
    const n = await p.evaluate(() => document.querySelectorAll(".tabla .c.en").length);
    assert.ok(n > 100, "lista con todas las palabras: " + n);
    assert.ok(!/lista oficial/i.test(await A.texto(p, "body")));
    await p.selectOption("#orden", "nose"); await p.waitForTimeout(200);
    assert.ok(await A.hay(p, ".leyenda"));
  },
  "verbos (Verbomat): carga, paneles, y guarda progreso en la nube sin bajar nunca": async (A, ctx) => {
    const p = await abrirApp(A, ctx, "verbos/");
    assert.ok(await A.hay(p, "#app") && await A.hay(p, ".lat-d"));
    assert.ok(/Bernabéu/.test(await A.texto(p, "body")));
    await p.evaluate(() => { const st = JSON.parse(localStorage.verbomat_v1 || "{}"); st.stats = { go: { streak: 3 }, be: { streak: 2 } }; localStorage.verbomat_v1 = JSON.stringify(st); document.dispatchEvent(new Event("visibilitychange")); });
    await p.waitForTimeout(1500);
    // el estado se lee desde localStorage en otro paso: se fuerza el envío como al salir de la página
    await p.evaluate(() => dispatchEvent(new Event("pagehide"))); await p.waitForTimeout(800);
    const d = await A.datos(p);
    assert.ok(d.progreso.u2.apps && d.progreso.u2.apps.verbos && d.progreso.u2.apps.verbos.ok >= 2, JSON.stringify(d.progreso.u2.apps));
  },
  "afijos (Afijomat) y Word Formation: cargan con cuenta, sin Used to": async (A, ctx) => {
    const p = await abrirApp(A, ctx, "afijos/");
    assert.ok(await A.hay(p, "#app") && await A.hay(p, ".lat-i"), "afijos carga");
    const q = await abrirApp(A, ctx, "wordformation/");
    assert.ok(await A.hay(q, "#view-practicar") && await A.hay(q, ".lat-i"), "word formation carga");
    assert.ok(!(await q.evaluate(() => { const b = document.getElementById("mode-ut"); return b && b.offsetParent !== null; })), "el botón de Used to está oculto");
    assert.equal(await q.evaluate(() => document.getElementById("tricks-ut").children.length), 0, "sin trucos de Used to");
  },
  "sin cuenta, las apps mandan a la portada a iniciar sesión": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: null, datos: base() });
    await p.goto(A.url + "/vocabulary/"); await p.waitForTimeout(2500);
    const u = new URL(p.url());
    assert.ok(u.pathname === "/" || u.pathname.endsWith("/index.html"), "vuelve a la portada: " + p.url());
    assert.ok(/volver=/.test(u.search), "recuerda a dónde volver");
  },
};
