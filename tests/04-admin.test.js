const assert = require("assert");
const { U, base, enDias } = require("./harness");
const CLAVE = process.env.MIPANEL_CLAVE || "";

module.exports = {
  "el administrador ve su barra y pestañas; un alumno no, y no puede escribir en clase/*": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.admin, datos: base() });
    await A.abrir(p);
    assert.ok(await A.hay(p, ".adm-bar") && await A.hay(p, ".admtabs"));
    assert.ok(!(await A.hay(p, ".adm-1b")), "ya no hay interruptor jugador/administrador");
    const q = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(q);
    assert.ok(!(await A.hay(q, ".adm-bar")) && !(await A.hay(q, ".admtabs")) && !(await A.hay(q, "[data-admedit]")));
    const err = await q.evaluate(() => window.guardarCambio("examenes", "zz", { titulo: "hack", nuevo: true }).then(() => "ok", e => e.code));
    assert.equal(err, "permission-denied", "las reglas impiden que un alumno edite la clase");
  },
  "añadir, editar, mover y borrar un examen desde la barra": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.admin, datos: base() });
    await A.abrir(p);
    await p.click("[data-admnew='examenes']"); await p.waitForTimeout(300);
    await p.fill("#admForm [name=titulo]", "Control de prueba"); await p.selectOption("#admForm [name=asig]", "mates"); await p.fill("#admForm [name=fecha]", enDias(4));
    await p.click("#admForm button[type=submit]"); await p.waitForTimeout(600);
    let d = await A.datos(p); const id = Object.keys(d.clase.cambios.examenes)[0];
    assert.equal(d.clase.cambios.examenes[id].titulo, "Control de prueba");
    assert.ok(/Examen en 4 días/.test(await A.texto(p, '.tile[data-a="mates"]')));
    await A.abrir(p, "#mates");
    await p.click(`[data-admedit="examenes:${id}"]`); await p.waitForTimeout(300);
    await p.fill("#admForm [name=titulo]", "Control editado"); await p.click("#admForm button[type=submit]"); await p.waitForTimeout(600);
    assert.ok(/Control editado/.test(await A.texto(p, "#view")));
    await p.click(`[data-admdel="examenes:${id}"]`); await p.waitForTimeout(200);
    await p.click("[data-admok]"); await p.waitForTimeout(600);
    d = await A.datos(p); assert.equal(d.clase.cambios.examenes[id].borrado, true);
    assert.ok(!/Control editado/.test(await A.texto(p, ".exams")));
  },
  "expulsar y readmitir desde el perfil; bloquear acciones": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.admin, datos: base() });
    await A.abrir(p, "#companeros");
    assert.ok(/Gonzalo/.test(await A.texto(p, ".co-l")));
    await p.evaluate(() => document.querySelector('.co-it[data-perfil="u2"]').click()); await p.waitForTimeout(300);
    await p.click("[data-expulsar=u2]"); await p.waitForTimeout(300);
    await p.fill("#banForm textarea", "Fuera por insultar"); await p.click("#banForm button[type=submit]"); await p.waitForTimeout(500);
    let d = await A.datos(p); assert.equal(d.baneos.u2.motivo, "Fuera por insultar"); assert.equal(d.usuarios.u2.baneado, true);
    await p.click("[data-admexpulsados]"); await p.waitForTimeout(300);
    assert.ok(/Gonzalo/.test(await A.texto(p, "#adm")));
    await p.click("[data-readmitir=u2]"); await p.waitForTimeout(500);
    d = await A.datos(p); assert.ok(!d.baneos.u2 && d.usuarios.u2.baneado === false);
    await A.abrir(p, "#companeros");
    await p.evaluate(() => document.querySelector('.co-it[data-perfil="u3"]').click()); await p.waitForTimeout(300);
    await p.click("[data-bloquear=u3]"); await p.waitForTimeout(300); await p.check("#bloqForm input[name=chat]"); await p.click("#bloqForm button[type=submit]"); await p.waitForTimeout(500);
    d = await A.datos(p); assert.equal(d.bloqueos.u3.chat, true);
  },
  "Mi panel: pide la clave, rechaza una mala y (con clave) muestra asignaturas y publica": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.admin, datos: base() });
    await A.abrir(p, "#mipanel", 2500);
    assert.ok(await A.hay(p, "#mpClaveF"), "pide la clave");
    await p.fill("#mpClaveF input", "mala"); await p.click("#mpClaveF button"); await p.waitForTimeout(1000);
    assert.ok(/no es correcta/.test(await A.texto(p, ".mp-err")));
    if (!CLAVE) { console.log("     (sin MIPANEL_CLAVE: se omite la parte con datos)"); return; }
    await p.fill("#mpClaveF input", CLAVE); await p.click("#mpClaveF button"); await p.waitForTimeout(2000);
    assert.ok(/Asignaturas/.test(await A.texto(p, "#view")) && await A.hay(p, '.mp-tiles .tile[data-a="fyq"]'));
    const d = await A.datos(p); assert.ok(d.adminpriv && d.adminpriv.clave.k === CLAVE, "la clave se guarda en la cuenta");
    await A.abrir(p, "#mipanel-fyq", 2000);
    assert.ok(!/Word formation|Vocabulary.*en \d+ días/.test(await A.texto(p, "#view")));
    const pub = await p.evaluate(() => document.querySelector("[data-mppub^='recursos:']")?.dataset.mppub);
    assert.ok(pub, "hay algo que publicar");
    await p.click(`[data-mppub="${pub}"]`); await p.waitForTimeout(300); await p.click("#mpPubF button[type=submit]"); await p.waitForTimeout(800);
    const d2 = await A.datos(p); const id = pub.split(":")[1];
    assert.ok(d2.clase.cambios.recursos[id] && d2.clase.cambios.recursos[id].nuevo, "publicado en la clase");
    const q = await A.pagina(ctx, { usuario: U.gon, datos: d2 });
    await A.abrir(q);
    assert.ok(/Novedades de la clase/.test(await A.texto(q, "#view")), "el compañero ve la novedad");
    assert.ok(!(await A.hay(q, ".admtabs")));
    await A.abrir(q, "#mipanel");
    assert.ok(/solo para el administrador/.test(await A.texto(q, "#view")));
  },
};
