const assert = require("assert");
const { U, base } = require("./harness");

// examen de Inglés del 19/11 (e11) con sus temas en data/clase.json
const EX = "e11";
const examenIA = {
  titulo: "Examen de prueba de Inglés",
  preguntas: [
    { tipo: "test", enunciado: "Choose the plural of *child*", opciones: ["childs", "children", "childes"], correcta: 1, solucion: "children", puntos: 3 },
    { tipo: "vf", enunciado: "*Mice* is the plural of *mouse*.", correcta: true, solucion: "True", puntos: 3 },
    { tipo: "corta", enunciado: "Form a noun from *happy*", solucion: "happiness", puntos: 4 },
  ],
};

module.exports = {
  "mapa del examen: pistas de la clase (con confirmaciones) y temario, de más a menos probable": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(p, "#prep-" + EX, 2200);
    assert.ok(/Mapa del examen/.test(await A.texto(p, "#view")), "sale el mapa");
    await p.fill("#prPistaF input[name=t]", "Irregular plurals"); await p.selectOption("#prPistaF select", "seguro"); await p.click("#prPistaF button"); await p.waitForTimeout(800);
    let d = await A.datos(p); const pid = Object.keys(d.pistas || {})[0];
    assert.ok(pid && d.pistas[pid].texto === "Irregular plurals" && d.pistas[pid].examen === EX && d.pistas[pid].de === "u2");
    // Sergio dice lo mismo: se confirma la pista en vez de duplicarla
    const q = await A.pagina(ctx, { usuario: U.ser, datos: d });
    await A.abrir(q, "#prep-" + EX, 2200);
    await q.fill("#prPistaF input[name=t]", "irregular plurals"); await q.selectOption("#prPistaF select", "seguro"); await q.click("#prPistaF button"); await q.waitForTimeout(800);
    d = await A.datos(q);
    assert.equal(Object.keys(d.pistas).length, 1, "no se duplica"); assert.deepEqual(d.pistas[pid].votos, ["u3"]);
    const mapa = await A.texto(q, ".pr-seguro");
    assert.ok(/Irregular plurals/i.test(mapa) && /2 personas/.test(mapa), "va a Seguro con 2 personas: " + mapa);
  },

  "examen de prueba sin cuenta de servicio: genera, se contesta, se corrige y queda en tus intentos": async (A, ctx) => {
    A.worker.peticiones.length = 0;
    A.worker.respuesta = (pet) => pet.url.endsWith("/examen") ? { examen: examenIA, puntos: false }
      : pet.url.endsWith("/corregir") ? { nota: 7, puntos: 0, resultados: [{ i: 0, puntos: 3, bien: true, comentario: "Correcta." }, { i: 1, puntos: 0, bien: false, comentario: "Era verdadero." }, { i: 2, puntos: 4, bien: true, comentario: "Bien." }], soluciones: examenIA.preguntas.map(x => ({ solucion: x.solucion, correcta: x.correcta })) }
      : { texto: "" };
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(p, "#prep-" + EX, 2200);
    await p.click("[data-prchip='10 preguntas tipo test']");
    await p.click("#prGenF button.btn-p"); await p.waitForTimeout(1500);
    const gen = A.worker.peticiones.find(x => x.url.endsWith("/examen"));
    assert.ok(gen && gen.auth.startsWith("Bearer "), "se pide al Worker con sesión");
    assert.equal(gen.cuerpo.especificaciones, "10 preguntas tipo test"); assert.equal(gen.cuerpo.asig, "ingles");
    assert.ok(Array.isArray(gen.cuerpo.mapa) && gen.cuerpo.temario.length >= 1, "manda el mapa y el temario");
    assert.equal(await p.evaluate(() => document.querySelectorAll(".pq").length), 3);
    await p.check("input[name=q0][value='1']"); await p.check("input[name=q1][value='false']"); await p.fill("textarea[name=q2]", "happiness");
    await p.click("#prExF button[type=submit]"); await p.waitForTimeout(1500);
    const cor = A.worker.peticiones.find(x => x.url.endsWith("/corregir"));
    assert.deepEqual(cor.cuerpo.respuestas, [1, false, "happiness"], "respuestas enviadas");
    assert.ok(cor.cuerpo.preguntas && cor.cuerpo.preguntas.length === 3, "sin cuenta de servicio se manda el examen");
    assert.ok(/7/.test(await A.texto(p, ".pr-nota")), "nota");
    assert.ok(/Repasa/.test(await A.texto(p, ".pr-rep")), "lista de repaso");
    await p.click("[data-prcerrarex]"); await p.waitForTimeout(400);
    assert.ok(/7/.test(await A.texto(p, ".pr-int")), "queda en tus intentos");
  },

  "con cuenta de servicio: el examen llega sin soluciones y se corrige por id (puntos del Worker)": async (A, ctx) => {
    A.worker.peticiones.length = 0;
    A.worker.respuesta = (pet) => pet.url.endsWith("/examen") ? { id: "x1", examen: { titulo: examenIA.titulo, preguntas: examenIA.preguntas.map(({ solucion, correcta, ...q }) => q) }, puntos: true }
      : { nota: 10, puntos: 30, resultados: [0, 1, 2].map(i => ({ i, puntos: examenIA.preguntas[i].puntos, bien: true, comentario: "Bien." })), soluciones: examenIA.preguntas.map(x => ({ solucion: x.solucion, correcta: x.correcta })) };
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(p, "#prep-" + EX, 2200);
    await p.click("#prGenF button.btn-p"); await p.waitForTimeout(1500);
    assert.ok(/da puntos/.test(await A.texto(p, "#prEx")));
    await p.check("input[name=q0][value='1']"); await p.click("#prExF button[type=submit]"); await p.waitForTimeout(1500);
    const cor = A.worker.peticiones.find(x => x.url.endsWith("/corregir"));
    assert.equal(cor.cuerpo.id, "x1"); assert.ok(!cor.cuerpo.preguntas, "no manda el examen: lo corrige el Worker");
    assert.ok(/\+30 puntos/.test(await A.texto(p, ".pr-nota")));
  },

  "los puntos de exámenes (bonus) suman en el ranking de hoy": async (A, ctx) => {
    const d = base(); const H = require("./harness").HOY;
    d.progreso.u3.bonus = { [H]: 30 };   // Sergio 35 (+5 de plurales) → 65
    const p = await A.pagina(ctx, { usuario: U.admin, datos: d });
    await A.abrir(p, "#amigos");
    const t = await A.texto(p, ".ranking");
    assert.ok(/^.*Sergio/.test(t.split("Guillermo")[0]), "Sergio pasa a ir primero: " + t.slice(0, 200));
  },

  "el administrador marca qué entró y el modelo aprende": async (A, ctx) => {
    const d = base(); d.pistas = { p1: { examen: "e10", asig: "ingles", texto: "Describe a picture", nivel: "probable", de: "u2", votos: [], t: 1 } };
    const p = await A.pagina(ctx, { usuario: U.admin, datos: d });
    await A.abrir(p, "#prep-e10", 2200);   // e10 ya ha pasado
    assert.ok(await A.hay(p, "#prMarcarF"), "al admin le sale para marcar");
    await p.check("#prMarcarF input[name=m0]"); await p.fill("#prMarcarF textarea", "Talk about your holidays");
    await p.click("#prMarcarF button"); await p.waitForTimeout(1000);
    const x = await A.datos(p);
    assert.ok(x.prediccion && x.prediccion.h_e10 && x.prediccion.h_e10.items.some(i => i.texto === "Talk about your holidays" && i.entro), "historial guardado");
    assert.ok(x.prediccion.modelo && x.prediccion.modelo.examenes === 1 && x.prediccion.modelo.a.ingles, "modelo actualizado");
    // un compañero no ve el formulario
    const q = await A.pagina(ctx, { usuario: U.gon, datos: x }); await A.abrir(q, "#prep-e10", 2200);
    assert.ok(!(await A.hay(q, "#prMarcarF")));
  },
};
