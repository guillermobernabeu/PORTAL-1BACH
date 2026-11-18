const assert = require("assert");
const { U, base } = require("./harness");

async function abrir(A, ctx, hash) {
  const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
  await p.goto(A.url + "/ingles/" + hash); await p.waitForTimeout(1500);
  return p;
}
module.exports = {
  "global de inglés: make questions y past simple se corrigen bien": async (A, ctx) => {
    const p = await abrir(A, ctx, "#preg");
    const r = await p.evaluate(() => {
      const q = id => PREGS.find(x => x.id === id).ok, s = id => PASIVA.find(x => x.id === id).ok;
      return [corr("when did she go to London", q("q01"), true), corr("Who did you see at the supermarket?", q("q13"), true), corr("Whom did you see at the supermarket?", q("q13"), true),
        corr("When she went to London?", q("q01"), true), corr("was build", s("v01"), true) , corr("isn't spoken", s("v25"), true), corr("Hamlet was written by Shakespeare", s("a01"), true)];
    });
    assert.deepEqual(r, [2, 2, 2, 0, 0, 2, 2]);
    assert.ok(/subrayado/.test(await A.texto(p, ".ask")) && await A.hay(p, ".prompt u"), "sale la parte subrayada");
  },
  "global de inglés: acertar guarda progreso del juego y el examen mezcla todo": async (A, ctx) => {
    const p = await abrir(A, ctx, "#past");
    const sol = await p.evaluate(() => R.qs[0].oks[0]);
    await p.fill("#fEsc input", sol); await p.click("#fEsc .btn"); await p.waitForTimeout(300);
    assert.ok(/Correcto/.test(await A.texto(p, ".fb")));
    await p.evaluate(() => { PASIVA.slice(0, 5).forEach(x => S.past[x.id] = { a: 2, f: 0, r: 2 }); window.dispatchEvent(new Event("ingles-cambio")); });
    await p.waitForTimeout(1200);
    const d = await A.datos(p);
    assert.ok(d.progreso.u2.apps.past && d.progreso.u2.apps.past.ok >= 5 && d.progreso.u2.apps.past.total === 54, JSON.stringify(d.progreso.u2.apps));
    await p.click("[data-tab=examen]"); await p.waitForTimeout(300);
    const js = await p.evaluate(() => [...new Set(R.qs.map(q => q.j))].sort());
    assert.deepEqual(js, ["def", "gi", "idioms", "past", "preg", "trad"]); assert.equal(await p.evaluate(() => R.qs.length), 20);
  },
  "make questions: más de 200, siempre nuevas y modo de repasar falladas": async (A, ctx) => {
    const p = await abrir(A, ctx, "#preg");
    assert.ok(await p.evaluate(() => PREGS.length) >= 200);
    const r1 = await p.evaluate(() => R.qs.map(q => q.x.id));
    await p.fill("#fEsc input", "no sé"); await p.click("#fEsc .btn"); await p.waitForTimeout(200);
    await p.click("[data-sig]");
    await p.click("[data-mp=falladas]"); await p.waitForTimeout(200);
    assert.deepEqual(await p.evaluate(() => R.qs.map(q => q.x.id)), [r1[0]], "solo la fallada");
    await p.click("[data-mp=nuevas]"); await p.waitForTimeout(200);
    const r2 = await p.evaluate(() => R.qs.map(q => q.x.id));
    assert.ok(!r2.includes(r1[0]), "no repite la ya vista");
  },
  "translate: apartado de gerund & infinitive": async (A, ctx) => {
    const p = await abrir(A, ctx, "#trad");
    await p.click(".filt [data-tab=gi]"); await p.waitForTimeout(200);
    assert.ok(/gerund|english|español/i.test(await A.texto(p, ".tag")));
    assert.equal(await p.evaluate(() => R.qs.every(q => q.j === "gi")), true);
    const r = await p.evaluate(() => { const g = id => GI.find(x => x.id === id).ok; return [corr("to buy", g("g43"), true), corr("buying", g("g43"), true), corr("I can't help laughing", g("g03")), corr("Paré para comprar pan", g("g31"))]; });
    assert.deepEqual(r, [2, 0, 2, 2]);
  },
  "gerund & infinitive: teoría ordenada y botón para practicar": async (A, ctx) => {
    const p = await abrir(A, ctx, "#gi-teoria");
    const t = await A.texto(p, ".teo");
    assert.ok(/Gerundio/.test(t) && /Infinitivo con to/.test(t) && /Cambian de significado/.test(t) && /can't afford/.test(t));
    assert.equal(await p.evaluate(() => document.querySelectorAll(".teo-b.ger .vl li").length), 28);
    await p.click(".teo [data-tab=gi]"); await p.waitForTimeout(200);
    assert.ok(await A.hay(p, "#fEsc") && !(await A.hay(p, ".teo")));
  },
};
