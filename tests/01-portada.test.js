const assert = require("assert");
const { U, base, enDias, HOY } = require("./harness");

module.exports = {
  "sin cuenta: se ve la portada pero el contenido pide entrar con Google": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: null, datos: base() });
    await A.abrir(p);
    assert.ok(await A.hay(p, ".aviso-cuenta [data-login]"), "la portada avisa de que hay que entrar con Google");
    assert.equal(await p.evaluate(() => document.querySelectorAll(".tile").length), 9, "se ven las asignaturas");
    await p.evaluate(() => document.querySelector('.tile[data-a="mates"]').click()); await p.waitForTimeout(500);
    assert.ok(await A.hay(p, "#pide:not([hidden])"), "al tocar una asignatura pide iniciar sesión");
    assert.ok(!/Tema/.test(await A.texto(p, "#view")) || (await p.evaluate(() => location.hash)) === "", "no se entra en la asignatura");
    await p.evaluate(() => document.querySelector("#pide [data-login]").click()); await p.waitForTimeout(1500);
    // el simulado inicia sesión al momento: ya hay nombre en la portada
    assert.ok((await A.texto(p, "#view")).includes("Guillermo"), "tras entrar debe saludar por el nombre");
  },
  "con cuenta: saludo por nombre, asignaturas, botones de chat y ranking": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(p);
    const t = await A.texto(p, "#view");
    assert.ok(/Gonzalo/.test(t), "saluda a Gonzalo");
    assert.equal(await p.evaluate(() => document.querySelectorAll(".tile").length), 9, "9 asignaturas");
    for (const s of ['[data-go="chat"]', '[data-go="amigos"]', 'a[href="#apuntes"]', "#mscroll"]) assert.ok(await A.hay(p, s), "falta " + s);
    assert.ok(/Bernabéu/.test(await A.texto(p, ".claude-ov")), "marca Bernabéu");
    assert.ok(!(await A.hay(p, ".admtabs")), "un alumno no ve las pestañas del administrador");
  },
  "examen próximo: cuenta atrás en la tarjeta y en recomendaciones; caduca a las 14:00 de su día": async (A, ctx) => {
    const d = base();
    d.clase = { cambios: { examenes: {
      t1: { nuevo: true, titulo: "Prueba de mates", asig: "mates", fecha: enDias(3), alcance: "Temas 1 y 2", temas: [] },
      t2: { nuevo: true, titulo: "Examen de ayer", asig: "tic", fecha: enDias(-1), alcance: "x", temas: [] },
    } } };
    const p = await A.pagina(ctx, { usuario: U.gon, datos: d });
    await A.abrir(p);
    assert.ok(/Examen en 3 días/.test(await A.texto(p, '.tile[data-a="mates"]')), "la tarjeta de Mates avisa del examen");
    assert.ok(!/Examen/.test(await A.texto(p, '.tile[data-a="tic"]')), "el examen de ayer ya no cuenta");
    const asig = await p.evaluate(() => S.examenes.find(e => e.id === "t2"));
    assert.equal(asig.hecho, true, "a las 14:00 del día del examen pasa a hecho");
    assert.ok(/Prueba de mates/.test(await A.texto(p, ".recos")) || /Prueba de mates/.test(await A.texto(p, "#view")), "aparece en la portada");
  },
  "calendario: el examen sale en su día con el nombre de la asignatura": async (A, ctx) => {
    const d = base(); const f = enDias(2);
    d.clase = { cambios: { examenes: { t1: { nuevo: true, titulo: "Prueba de mates", asig: "mates", fecha: f, temas: [] } } } };
    const p = await A.pagina(ctx, { usuario: U.gon, datos: d });
    await A.abrir(p);
    const dia = await p.evaluate(f => { const c = [...document.querySelectorAll("#mscroll [data-dia]")].find(x => x.dataset.dia === f); return c ? c.innerText.replace(/\s+/g, " ") : null; }, f);
    assert.ok(dia !== null, "el día del examen está en el calendario");
    assert.ok(/Mat/.test(dia), "muestra la abreviatura de Matemáticas: " + dia);
  },
  "trimestres 2 y 3 bloqueados con candado hasta su fecha": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(p, "#mates");
    const abierto = await p.evaluate(() => triAbierto(2));
    const t = await A.texto(p, "#view");
    if (!abierto) assert.ok(/🔒/.test(t), "el 2.º trimestre lleva candado");
    assert.ok(/Matemáticas/.test(t));
  },
  "móvil: sin desbordamiento horizontal en la portada": async (A, ctx) => {
    await ctx.close(); ctx = await A.contexto({ movil: true });
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(p);
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    assert.ok(w[0] <= w[1] + 1, "scrollWidth " + w[0] + " > " + w[1]);
    await ctx.close();
  },
};
