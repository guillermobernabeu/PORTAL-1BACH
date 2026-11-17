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
        corrige("It's raining cats and dogs", g("d02"), "es"), corrige("raining cats and dogs!", g("d02"), "es"),
        corrige("hit the hay", g("d17"), "es"), corrige("Don't beat around the bush", g("d15"), "es"),
        corrige("llueve a mares", g("d02"), "en"), corrige("Planchar la oreja", g("d17"), "en"),
        corrige("ganarse la bida", g("d11"), "en"), corrige("better late then never", g("d16"), "es"),
        corrige("ponerse a dormir", g("d06"), "en"), corrige("", g("d04"), "en"),
      ];
    });
    assert.deepEqual(r, [2, 2, 2, 2, 2, 2, 1, 1, 0, 0]);
  },

  "idioms: ronda con opciones; dominar un idiom sube progreso a la nube": async (A, ctx) => {
    const p = await abrir(A, ctx);
    assert.ok(await A.hay(p, ".claude"), "marca Bernabéu");
    assert.ok(await A.hay(p, ".lat-d"), "paneles laterales");
    assert.equal(await p.evaluate(() => S.tipo), "esc", "por defecto se escribe");
    await p.click("[data-tipo=opc]"); await p.waitForTimeout(200);
    assert.equal(await p.evaluate(() => R.qs.length), 10);
    assert.equal(await p.evaluate(() => document.querySelectorAll(".opts button").length), 4);
    // acierta la primera
    await p.evaluate(() => { const q = R.qs[R.n]; document.querySelector(`[data-op="${R.opts.findIndex(o => o.id === q.i.id)}"]`).click(); });
    assert.ok(/Correcto/.test(await A.texto(p, ".fb")));
    // marca un idiom como dominado (2 seguidas en cada sentido) y avisa
    await p.evaluate(() => { S.s.d01 = { en: { a: 2, f: 0, r: 2 }, es: { a: 2, f: 0, r: 2 } }; window.dispatchEvent(new Event("idioms-cambio")); });
    await p.waitForTimeout(1200);
    const d = await A.datos(p);
    const a = d.progreso.u2.apps.idioms;
    assert.ok(a && a.total === 20 && a.ok >= 1, "progreso de idioms: " + JSON.stringify(a));
  },

  "idioms: escribir, fallar y 'lo he dicho con otras palabras'": async (A, ctx) => {
    const p = await abrir(A, ctx);
    await p.click("[data-modo=en]"); await p.waitForTimeout(200);
    await p.fill("#fEsc input", "zzz no sé"); await p.click("#fEsc .btn");
    assert.ok(/No\./.test(await A.texto(p, ".fb")));
    await p.click("[data-valia]");
    assert.ok(/Correcto/.test(await A.texto(p, ".fb")));
    const q = await p.evaluate(() => { const q = R.qs[R.n]; return S.s[q.i.id][q.dir]; });
    assert.deepEqual(q, { a: 1, f: 0, r: 1 });
    await p.click("[data-sig]"); assert.ok(/2 \/ 10/.test(await A.texto(p, ".ronda-t")));
  },

  "idioms: lista con los 20": async (A, ctx) => {
    const p = await abrir(A, ctx, "#lista");
    assert.equal(await p.evaluate(() => document.querySelectorAll(".lista .row").length), 20);
  },
};
