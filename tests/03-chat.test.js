const assert = require("assert");
const { U, base } = require("./harness");

module.exports = {
  "enviar un mensaje con etiqueta; aparece en la lista con el nombre": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(p, "#chat");
    await p.fill("#chatTxt", "Hola a todos <b>x</b>");
    await p.click(".chatin .btn-p"); await p.waitForTimeout(600);
    const d = await A.datos(p); const m = Object.values(d.chat)[0];
    assert.equal(m.uid, "u2"); assert.equal(m.texto, "Hola a todos <b>x</b>");
    const html = await p.evaluate(() => document.querySelector("#chatlist").innerHTML);
    assert.ok(!html.includes("<b>x</b>"), "el HTML del mensaje se escapa (sin XSS)");
    assert.ok(/Gonzalo/.test(await A.texto(p, "#chatlist")));
  },
  "@menciones: sugerencias al escribir @, se guarda menc y el mencionado ve la @": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(p, "#chat");
    await p.fill("#chatTxt", "oye @Ser"); await p.waitForTimeout(300);
    assert.ok(/Sergio/.test(await A.texto(p, "#menc")), "sugiere a Sergio");
    await p.keyboard.press("Enter"); await p.waitForTimeout(200);
    assert.ok(/@Sergio Arjona/.test(await p.inputValue("#chatTxt")));
    await p.click(".chatin .btn-p"); await p.waitForTimeout(600);
    const d = await A.datos(p); assert.deepEqual(Object.values(d.chat)[0].menc, ["u3"]);
    // Sergio entra y ve la @ en el botón del chat y el mensaje resaltado
    const q = await A.pagina(ctx, { usuario: U.ser, datos: d });
    await A.abrir(q);
    assert.ok(await A.hay(q, '[data-go="chat"] .badge-m'), "badge @ en el botón del chat");
    await A.abrir(q, "#chat");
    assert.ok(await A.hay(q, ".msg.mencionado"), "mensaje resaltado");
  },
  "chat privado: conversación entre dos, no leído para el otro": async (A, ctx) => {
    const p = await A.pagina(ctx, { usuario: U.gon, datos: base() });
    await A.abrir(p, "#amigos");
    await p.evaluate(() => document.querySelector('.rk[data-perfil="u3"]').click()); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('#pfm [data-privado="u3"]').click()); await p.waitForTimeout(600);
    assert.ok((await p.evaluate(() => location.hash)).startsWith("#privado-"));
    await p.fill("#chatTxt", "hola Sergio"); await p.click(".chatin .btn-p"); await p.waitForTimeout(600);
    const d = await A.datos(p);
    assert.ok(d.privados && d.privados.u2_u3, "conversación u2_u3 creada");
    assert.equal(Object.values(d["privados/u2_u3/mensajes"])[0].texto, "hola Sergio");
    const q = await A.pagina(ctx, { usuario: U.ser, datos: d });
    await A.abrir(q, "#privados");
    assert.ok(/Gonzalo/.test(await A.texto(q, "#view")) && /hola Sergio/.test(await A.texto(q, "#view")));
  },
  "reportar un mensaje: llega al administrador en 🚩 Reportes": async (A, ctx) => {
    const d = base(); d.chat = { m1: { uid: "u3", nombre: "Sergio", texto: "tonto", t: Date.now() - 1000 } };
    const p = await A.pagina(ctx, { usuario: U.gon, datos: d });
    await A.abrir(p, "#chat");
    await p.click(".mrep"); await p.waitForTimeout(300);
    await p.fill("#repForm textarea", "Insulta"); await p.click("#repForm button[type=submit]"); await p.waitForTimeout(500);
    const d2 = await A.datos(p); const r = Object.values(d2.reportes)[0];
    assert.equal(r.de, "u2"); assert.equal(r.a, "u3"); assert.equal(r.motivo, "Insulta");
    const q = await A.pagina(ctx, { usuario: U.admin, datos: d2 });
    await A.abrir(q);
    assert.ok(/Reportes \(1\)/.test(await A.texto(q, ".adm-bar")));
    await q.click("[data-admreportes]"); await q.waitForTimeout(300);
    assert.ok(/Gonzalo.*reportó a.*Sergio/.test(await A.texto(q, "#adm")));
  },
  "bloqueo del chat: candado, sin lista ni formulario; privados siguen": async (A, ctx) => {
    const d = base(); d.bloqueos = { u2: { chat: true, motivo: "Por spam", t: 1 } };
    const p = await A.pagina(ctx, { usuario: U.gon, datos: d });
    await A.abrir(p);
    assert.ok(/🔒 Chat/.test(await A.texto(p, '[data-go="chat"]')));
    await A.abrir(p, "#chat");
    assert.ok(await A.hay(p, ".bloq-c") && !(await A.hay(p, "#chatform")) && !(await A.hay(p, "#chatlist")));
    assert.ok(/Por spam/.test(await A.texto(p, ".bloq-c")));
    await A.abrir(p, "#privados");
    assert.ok(!(await A.hay(p, ".bloq-c")), "los privados no están bloqueados");
  },
  "expulsión: pantalla centrada con el motivo y botón de cerrar sesión, en todas las páginas": async (A, ctx) => {
    const d = base(); d.baneos = { u2: { motivo: "Has sido baneado por insultar.", t: 1 } };
    const p = await A.pagina(ctx, { usuario: U.gon, datos: d });
    await A.abrir(p);
    const t = await A.texto(p, "#ban1b");
    assert.ok(/Has sido baneado por insultar/.test(t) && /Cerrar sesión/.test(t), t);
    await p.goto(A.url + "/vocabulary/"); await p.waitForTimeout(1500);
    assert.ok(await A.hay(p, "#ban1b"), "también en la app de vocabulario");
  },
  "quién ha leído un mensaje: al abrir el chat se guarda chatLeido y el clic derecho lo enseña": async (A, ctx) => {
    const d = base(); const t = Date.now() - 60000;
    d.chat = { m1: { uid: "u1", nombre: "Guillermo", texto: "¿Quién ha hecho los deberes?", t, tag: "general" } };
    d.usuarios.u3.chatLeido = t + 1000;   // Sergio ya lo vio
    const p = await A.pagina(ctx, { usuario: U.gon, datos: d });
    await A.abrir(p, "#chat"); await p.waitForTimeout(2200);
    const x = await A.datos(p);
    assert.ok(x.usuarios.u2.chatLeido >= t, "Gonzalo queda como que lo ha leído");
    await p.click("#chatlist .msg[data-mi='0'] .bur p", { button: "right" }); await p.waitForTimeout(300);
    const info = await A.texto(p, "#pfm");
    assert.ok(/Información del mensaje/.test(info) && /Leído por/.test(info), info);
    const leidos = await p.evaluate(() => [...document.querySelectorAll(".mi-l:not(.no) .mi-u b")].map(b => b.textContent).join(","));
    assert.ok(/Sergio/.test(leidos) && /Gonzalo/.test(leidos) && !/Guillermo/.test(leidos), leidos);
  },
};
