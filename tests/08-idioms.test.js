const assert = require("assert");
const { U, base } = require("./harness");

async function abrir(A, ctx, hash = "") {
  const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
  await p.goto(A.url + "/idioms/" + hash); await p.waitForTimeout(1500);
  if (!hash) { await p.click("#go"); await p.waitForTimeout(300); }
  return p;
}

module.exports = {
  "idioms: corrección flexible en los dos sentidos": async (A, ctx) => {
    const p = await abrir(A, ctx);
    const r = await p.evaluate(() => {
      const g = id => IDIOMS.find(i => i.id === id);
      return [
        corrige("It's raining cats and dogs", g("i03"), "es"), corrige("raining cats and dogs!", g("i03"), "es"),
        corrige("hit the hay", g("i05"), "es"), corrige("busy as a bee", g("i08"), "es"),
        corrige("llueve a cántaros", g("i03"), "en"), corrige("Pasarlo bomba", g("i15"), "en"),
        corrige("afrontar las consecuensias", g("i02"), "en"), corrige("out of the blu", g("i16"), "es"),
        corrige("ponerse a dormir", g("i10"), "en"), corrige("", g("i01"), "en"),
      ];
    });
    assert.deepEqual(r, [2, 2, 2, 2, 2, 2, 1, 1, 0, 0]);
  },

  "idioms: ronda con opciones; dominar un idiom sube progreso a la nube": async (A, ctx) => {
    const p = await abrir(A, ctx);
    assert.ok(await A.hay(p, ".claude"), "marca Bernabéu");
    assert.ok(await A.hay(p, ".lat-d"), "paneles laterales");
    assert.equal(await p.evaluate(() => R.qs.length), 10);
    assert.equal(await p.evaluate(() => document.querySelectorAll(".opts button").length), 4);
    // acierta la primera
    await p.evaluate(() => { const q = R.qs[R.n]; document.querySelector(`[data-op="${R.opts.findIndex(o => o.id === q.i.id)}"]`).click(); });
    assert.ok(/Correcto/.test(await A.texto(p, ".fb")));
    // marca un idiom como dominado (2 seguidas en cada sentido) y avisa
    await p.evaluate(() => { S.s.i01 = { en: { a: 2, f: 0, r: 2 }, es: { a: 2, f: 0, r: 2 } }; window.dispatchEvent(new Event("idioms-cambio")); });
    await p.waitForTimeout(1200);
    const d = await A.datos(p);
    const a = d.progreso.u2.apps.idioms;
    assert.ok(a && a.total === 16 && a.ok >= 1, "progreso de idioms: " + JSON.stringify(a));
  },

  "idioms: escribir, fallar y 'lo he dicho con otras palabras'": async (A, ctx) => {
    const p = await abrir(A, ctx);
    await p.click("[data-tipo=esc]"); await p.click("[data-modo=en]"); await p.waitForTimeout(200);
    await p.fill("#fEsc input", "zzz no sé"); await p.click("#fEsc .btn");
    assert.ok(/No\./.test(await A.texto(p, ".fb")));
    await p.click("[data-valia]");
    assert.ok(/Correcto/.test(await A.texto(p, ".fb")));
    const q = await p.evaluate(() => { const q = R.qs[R.n]; return S.s[q.i.id][q.dir]; });
    assert.deepEqual(q, { a: 1, f: 0, r: 1 });
    await p.click("[data-sig]"); assert.ok(/2 \/ 10/.test(await A.texto(p, ".ronda-t")));
  },

  "idioms: lista con los 16": async (A, ctx) => {
    const p = await abrir(A, ctx, "#lista");
    assert.equal(await p.evaluate(() => document.querySelectorAll(".lista .row").length), 16);
  },
};
