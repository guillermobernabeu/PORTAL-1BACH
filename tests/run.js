// Pasa todas las pruebas de tests/*.test.js. Uso: node tests/run.js [filtro]
const fs = require("fs"), path = require("path");
const { Arnes } = require("./harness");
(async () => {
  const filtro = process.argv[2] || "";
  const archivos = fs.readdirSync(__dirname).filter(f => f.endsWith(".test.js") && f.includes(filtro)).sort();
  const A = new Arnes(); await A.iniciar();
  let ok = 0, mal = 0; const fallos = [];
  for (const f of archivos) {
    const pruebas = require(path.join(__dirname, f));
    console.log("\n" + f);
    for (const [nombre, fn] of Object.entries(pruebas)) {
      const t0 = Date.now(); let ctx;
      try { ctx = await A.contexto(); await fn(A, ctx); if (ctx.errores.length) throw new Error("Errores JS en la página: " + ctx.errores.join(" | "));
        ok++; console.log(`  ✅ ${nombre} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      } catch (e) { mal++; fallos.push(f + " › " + nombre); console.log(`  ❌ ${nombre}\n     ${String(e.stack || e).split("\n").slice(0, 4).join("\n     ")}`); }
      finally { if (ctx) await ctx.close(); }
    }
  }
  await A.cerrar();
  console.log(`\n${ok} correctas, ${mal} fallidas` + (mal ? ":\n  - " + fallos.join("\n  - ") : ""));
  process.exit(mal ? 1 : 0);
})();
