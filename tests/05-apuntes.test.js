const assert = require("assert");
const path = require("path");
const { U, base } = require("./harness");
const FOTO = path.join(__dirname, "fixtures", "apunte.jpg");

module.exports = {
  "subir fotos → convertir (Worker) → enviar → aprobar → 👍 y mejora → puntos y novedades": async (A, ctx) => {
    A.worker.peticiones.length = 0;
    A.worker.respuesta = { texto: "# Disoluciones\n\n## Molaridad\n\n- $M = \\dfrac{n}{V}$\n\n| Magnitud | Unidad |\n|---|---|\n| M | mol/L |", modelo: "x" };
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(p, "#subir-apunte");
    await p.selectOption("#apForm select[name=asig]", "fyq"); await p.fill("#apForm input[name=titulo]", "Disoluciones"); await p.fill("#apForm input[name=tema]", "Tema 2");
    await p.setInputFiles("#apFotos", [FOTO, FOTO]); await p.waitForTimeout(1200);
    assert.equal(await p.evaluate(() => document.querySelectorAll(".ap-fotos figure").length), 2);
    assert.equal(await p.inputValue("#apForm input[name=titulo]"), "Disoluciones", "el título se conserva al añadir fotos");
    await p.click("[data-apconvertir]"); await p.waitForTimeout(2500);
    const pet = A.worker.peticiones[0];
    assert.ok(pet && pet.auth.startsWith("Bearer ") && pet.cuerpo.imagenes.length === 2, "se envía al Worker con sesión y 2 fotos");
    assert.ok(/Disoluciones/.test(await A.texto(p, "#apPrev")), "vista previa");
    await p.click("#apForm button[type=submit]"); await p.waitForTimeout(1500);
    assert.ok((await p.evaluate(() => location.hash)).startsWith("#apunte-"));
    let d = await A.datos(p); const id = Object.keys(d.apuntes)[0];
    assert.equal(d.apuntes[id].estado, "pendiente"); assert.equal(Object.keys(d["apuntes/" + id + "/fotos"]).length, 2);
    // admin aprueba
    const q = await A.pagina(ctx, { usuario: U.admin, datos: d });
    await A.abrir(q, "#apuntes");
    assert.ok(/Pendientes de aprobar \(1\)/.test(await A.texto(q, ".ap-pend")));
    await A.abrir(q, "#apunte-" + id); await q.click("[data-apaprobar]"); await q.waitForTimeout(800);
    d = await A.datos(q); assert.equal(d.apuntes[id].estado, "aprobado");
    // Sergio da útil y propone mejora
    const r = await A.pagina(ctx, { usuario: U.ser, datos: d });
    await A.abrir(r, "#apunte-" + id); await r.click("[data-aputil]"); await r.waitForTimeout(500);
    await r.click("[data-apmejorar]"); await r.waitForTimeout(300);
    await r.fill("#apMejF input[name=nota]", "Añado molalidad"); await r.fill("#apMejF textarea", "# Disoluciones\n\n## Molalidad\n\n$m = n/kg$"); await r.click("#apMejF button"); await r.waitForTimeout(800);
    d = await A.datos(r); assert.deepEqual(d.apuntes[id].utiles, ["u3"]);
    // el autor acepta la mejora
    const s = await A.pagina(ctx, { usuario: U.gon, datos: d });
    await A.abrir(s, "#apunte-" + id); await s.waitForTimeout(500); await s.click("[data-apaceptar]"); await s.waitForTimeout(800);
    assert.ok(/Molalidad/.test(await A.texto(s, "#apMd")));
    await A.abrir(s, "#apuntes");
    assert.ok(/55 puntos/.test(await A.texto(s, ".ap-yo")), "50 por el apunte + 5 por el 👍");
    assert.ok(/Sergio.*20 pts/.test(await A.texto(s, ".ap-top")), "20 por la mejora aceptada");
    await A.abrir(s);
    assert.ok(/Disoluciones/.test(await A.texto(s, ".novs")), "sale en novedades");
    assert.ok(!(await p.evaluate(() => document.querySelector("#apMd")?.innerHTML.includes("<script"))));
  },
  "el XSS en un apunte no se ejecuta": async (A, ctx) => {
    const d = base(); d.apuntes = { a1: { autor: "u3", asig: "mates", titulo: "<img src=x onerror=window.__x=1>", md: "<script>window.__y=1</script><img src=x onerror=\"window.__z=1\">\n\n# Hola", estado: "aprobado", t: 1, aprobadoT: Date.now(), utiles: [], colaboradores: [] } };
    const p = await A.pagina(ctx, { usuario: U.gon, datos: d });
    await A.abrir(p, "#apunte-a1", 2500);
    const x = await p.evaluate(() => [window.__x, window.__y, window.__z]);
    assert.deepEqual(x, [undefined, undefined, undefined], "nada se ejecuta: " + JSON.stringify(x));
    assert.ok(/Hola/.test(await A.texto(p, "#apMd")));
  },
  "sin sesión el Worker no convierte (el portal avisa)": async (A, ctx) => {
    A.worker.respuesta = { status: 401, body: { error: "Entra en el portal con tu cuenta para convertir apuntes." } };
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(p, "#subir-apunte");
    await p.selectOption("#apForm select[name=asig]", "fyq"); await p.fill("#apForm input[name=titulo]", "x"); await p.setInputFiles("#apFotos", [FOTO]); await p.waitForTimeout(800);
    await p.click("[data-apconvertir]"); await p.waitForTimeout(1500);
    assert.ok(/No se ha podido convertir/.test(await A.texto(p, "#apEstado")));
    A.worker.respuesta = { texto: "# Apunte de prueba\n\nTexto." };
  },
};
