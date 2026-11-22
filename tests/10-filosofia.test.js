const assert = require("assert");
const { U, base } = require("./harness");

module.exports = {
  "filosofía U4: apuntes sin el repaso final y con enlace al test": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await p.goto(A.url + "/filosofia/unidad4.html"); await p.waitForTimeout(600);
    const t = await p.evaluate(() => document.body.innerText);
    assert.ok(/Sternberg/.test(t) && !/lo que más te costó/i.test(t) && !/tus apuntes/i.test(t));
    assert.ok(await A.hay(p, "a[href='test-u4.html']") && await A.hay(p, ".marca"));
  },
  "filosofía U4: test de 150, acierto guarda progreso y falladas aparte": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await p.goto(A.url + "/filosofia/test-u4.html"); await p.waitForTimeout(1500);
    assert.equal(await p.evaluate(() => U4.length), 150);
    assert.equal(await p.evaluate(() => document.querySelectorAll(".opts button").length), 4);
    await p.evaluate(() => { const { q, opts } = R.qs[0]; document.querySelector(`[data-op="${opts.indexOf(q.ok)}"]`).click(); });
    assert.ok(/Correcto/.test(await A.texto(p, ".fb")));
    await p.click("[data-sig]");
    const id2 = await p.evaluate(() => R.qs[1].q.id);
    await p.evaluate(() => { const { q, opts } = R.qs[1]; document.querySelector(`[data-op="${opts.findIndex(o => o !== q.ok)}"]`).click(); });
    await p.waitForTimeout(1200);
    const d = await A.datos(p);
    assert.ok(d.progreso.u2.apps.filo4 && d.progreso.u2.apps.filo4.ok === 1 && d.progreso.u2.apps.filo4.total === 150, JSON.stringify(d.progreso.u2.apps));
    await p.click("[data-modo=falladas]"); await p.waitForTimeout(200);
    assert.deepEqual(await p.evaluate(() => R.qs.map(x => x.q.id)), [id2]);
  },
  "economía tema 3: apuntes ilustrados con ejercicios resueltos que se despliegan y el PDF original": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await p.goto(A.url + "/economia/tema3.html"); await p.waitForTimeout(600);
    assert.equal(await p.evaluate(() => document.querySelectorAll("details.sol").length), 18);
    assert.equal(await p.evaluate(() => document.querySelectorAll("details.sol[open]").length), 0, "soluciones ocultas al principio");
    await p.click("#abrirTodas");
    assert.equal(await p.evaluate(() => document.querySelectorAll("details.sol[open]").length), 18);
    assert.ok(/60,89 %/.test(await p.evaluate(() => document.body.innerText)));
    const r = await p.request.get(A.url + "/economia/tema3-original.pdf"); assert.equal(r.status(), 200);
  },
};
