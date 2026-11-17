const assert = require("assert");
const { U, base, app, HOY } = require("./harness");

module.exports = {
  "ranking de hoy: orden por puntos del día, medallas y tú marcado": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.admin, datos: base() });
    await A.abrir(p, "#amigos");
    const filas = await p.evaluate(() => [...document.querySelectorAll(".rk")].map(r => r.innerText.replace(/\s+/g, " ")));
    assert.equal(filas.length, 3);
    assert.ok(/🥇.*Guillermo.*\(tú\).*50/.test(filas[0]), filas[0]);
    assert.ok(/🥈.*Gonzalo.*40/.test(filas[1]), filas[1]);
    assert.ok(/Hoy|pts hoy/.test(await A.texto(p, ".ranking")));
  },
  "pestaña semana: suma de los días guardados; tocar los puntos cambia de modo": async (A, ctx) => {
    const d = base(); d.progreso.u2.dias = { "2026-11-10": 30 }; d.progreso.u2.legado = 0; d.progreso.u1.legado = 0; d.progreso.u3.legado = 0;
    const p = await A.pagina(ctx, { usuario: U.admin, datos: d });
    await A.abrir(p, "#amigos");
    await p.evaluate(() => document.querySelector(".rk button.pts").click()); await p.waitForTimeout(300);
    assert.equal(await p.evaluate(() => S.rkModo), "semana");
    assert.ok(/pts semana/.test(await A.texto(p, ".ranking")));
    const sem = await p.evaluate(() => puntosSemana(S.rank.u2));
    assert.ok(sem >= 40, "la semana de Gonzalo incluye lo de hoy: " + sem);
    await p.evaluate(() => document.querySelector('[data-rkmodo="dominio"]').click()); await p.waitForTimeout(300);
    assert.ok(/Dominio total|100 por app/.test(await A.texto(p, "#view")));
  },
  "semana: sin días guardados, la semana son los puntos de hoy": async (A, ctx) => {
    const d = base(); d.progreso.u1 = { apps: { vocab: app(90, 100, HOY, 60) } };
    const p = await A.pagina(ctx, { usuario: U.admin, datos: d });
    await A.abrir(p, "#amigos");
    const v = await p.evaluate(() => [puntosSemana(S.rank.u1), puntosHoy(S.rank.u1)]);
    assert.equal(v[1], 30, "hoy ha ganado 30 (de 60 a 90 sobre 100)");
    assert.ok(v[0] >= v[1], "semana " + v[0] + " < hoy " + v[1]);
  },
  "los expulsados no salen en el ranking ni en el panel lateral": async (A, ctx) => {
    const d = base(); d.usuarios.u3.baneado = true;
    const p = await A.pagina(ctx, { usuario: U.admin, datos: d });
    await A.abrir(p, "#amigos");
    assert.ok(!/Sergio/.test(await A.texto(p, ".ranking")));
  },
  "perfil de un compañero: puntos de hoy y de la semana, enviar privado": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(p, "#amigos");
    await p.evaluate(() => document.querySelector('.rk[data-perfil="u3"]').click()); await p.waitForTimeout(400);
    const t = await A.texto(p, "#pfm");
    assert.ok(/Sergio/.test(t) && /puntos hoy/.test(t) && /esta semana/.test(t), t);
    assert.ok(await A.hay(p, '#pfm [data-privado="u3"]'));
    assert.ok(!(await A.hay(p, "#pfm [data-expulsar]")), "un alumno no puede expulsar");
  },
  "aviso de adelanto: lo crea quien adelanta con los números del ranking y se ve una sola vez": async (A, ctx) => {
    const d = base(); // Guillermo 50, Gonzalo 40
    const p = await A.pagina(ctx, { usuario: U.gon, datos: d });
    await A.abrir(p, "#amigos");
    // Gonzalo gana puntos (llega el cambio de su progreso): su navegador avisa a quien ha pasado
    await p.evaluate(() => { const s = JSON.parse(localStorage.st); s.progreso.u2.apps.vocab.ok = 70; localStorage.st = JSON.stringify(s); });
    await p.evaluate(() => { const s = JSON.parse(localStorage.st); return window.__rank1b; });
    await p.evaluate(() => fetch("/version.json")); // nada; el simulado dispara los oyentes al escribir:
    await p.evaluate(async () => { const { fs, db } = await import("../shared/fb.js?v=1"); await fs.setDoc(fs.doc(db, "progreso", "u2"), { apps: { vocab: { ok: 70 } } }, { merge: true }); });
    await p.waitForTimeout(1200);
    let d2 = await A.datos(p);
    const avisos = Object.values(d2["avisos/u1/items"] || {});
    assert.equal(avisos.length, 1, "un aviso para Guillermo: " + JSON.stringify(d2["avisos/u1/items"]));
    assert.equal(avisos[0].de, "u2"); assert.ok(/Gonzalo.*adelantado/.test(avisos[0].texto)); assert.equal(avisos[0].posAhora, 2);
    assert.ok(!d2["avisos/u3/items"], "a Sergio no, porque sigue por detrás");
    assert.ok(A.worker.peticiones.some(x => x.url.endsWith("/push") && x.cuerpo && x.cuerpo.tipo === "adelanto"), "se pide la push");
    // Guillermo entra: ve el aviso una vez y se borra
    const q = await A.pagina(ctx, { usuario: U.admin, datos: d2 });
    await A.abrir(q, "#amigos", 2500);
    const av = await q.evaluate(() => [...document.querySelectorAll(".aviso-1b")].map(x => x.innerText));
    assert.ok(av.some(x => /Gonzalo/.test(x) && /adelantado/.test(x)), JSON.stringify(av));
    d2 = await A.datos(q); assert.ok(!d2["avisos/u1/items"] || !Object.keys(d2["avisos/u1/items"]).length, "el aviso se borra al verlo");
  },
};
