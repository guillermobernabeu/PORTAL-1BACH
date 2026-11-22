const assert = require("assert");
const { U, base } = require("./harness");

module.exports = {
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
