// Predicción de qué entra en un examen · 1 BACH · Bernabéu
// Funciones puras (sin Firebase ni página) para poder probarlas solas.
//
// Cada "contenido" que puede entrar reúne pruebas de varias fuentes:
//   seguro / probable / posible → pistas de la clase ("el profe ha dicho que entra X"), con su nivel
//   temario  → está en los temas que entran en el examen
//   apuntes  → hay apuntes aprobados de la clase sobre eso (lo que se ha dado en clase)
//   repetido → salió en exámenes anteriores de la misma asignatura
// Cada fuente tiene una probabilidad de acierto aprendida (Beta: aciertos+α / intentos+α+β) por asignatura,
// con apoyo de lo aprendido en todas. Varias pruebas se combinan como "basta con que una acierte":
//   P = 1 − Π (1 − p_fuente)^peso
// Después de cada examen real se marca qué entró de verdad y se actualizan los aciertos de cada fuente.

export const FUENTES = {
  seguro: { a: 9, b: 1, txt: "El profe ha dicho que entra seguro" },
  probable: { a: 6, b: 3, txt: "El profe ha dicho que es muy probable" },
  posible: { a: 3, b: 5, txt: "El profe ha dicho que puede entrar" },
  temario: { a: 5, b: 5, txt: "Está en el temario del examen" },
  apuntes: { a: 4, b: 5, txt: "Se ha dado en clase (hay apuntes)" },
  repetido: { a: 6, b: 4, txt: "Salió en exámenes anteriores" },
};
export const NIVELES = [[0.8, "seguro", "Seguro que entra"], [0.55, "probable", "Muy probable"], [0.25, "posible", "Puede entrar"]];
const APOYO_GLOBAL = 0.3, PESO_ADMIN = 1.5;

const VACIAS = new Set("el la los las un una unos unas de del al a en y o u e que con por para su sus lo le les se es son como mas más muy tema temas parte ejercicio ejercicios pregunta preguntas examen sobre entre the of and to".split(" "));
export const normalizar = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s]/g, " ");
export const palabras = (t) => [...new Set(normalizar(t).split(/\s+/).filter(w => w.length > 2 && !VACIAS.has(w)))];
// parecido entre dos textos: proporción de palabras del más corto que están en el otro
export function parecido(a, b) {
  const A = palabras(a), B = new Set(palabras(b)); if (!A.length || !B.size) return 0;
  const corta = A.length <= B.size ? A : [...B], larga = A.length <= B.size ? B : new Set(A);
  return corta.filter(w => larga.has(w)).length / corta.length;
}
const IGUAL = 0.6;

// probabilidad aprendida de una fuente (para una asignatura)
export function pFuente(modelo, asig, s) {
  const f = FUENTES[s], g = (modelo && modelo.g && modelo.g[s]) || { h: 0, n: 0 }, l = (modelo && modelo.a && modelo.a[asig] && modelo.a[asig][s]) || { h: 0, n: 0 };
  return (l.h + APOYO_GLOBAL * g.h + f.a) / (l.n + APOYO_GLOBAL * g.n + f.a + f.b);
}
export const nivelDe = (p) => (NIVELES.find(([m]) => p >= m) || [0, "no", "Poco probable"]);

// Saca los apartados (## y ###) de un apunte en Markdown
export const apartados = (md) => String(md || "").split("\n").map(l => (l.match(/^#{2,3}\s+(.+)/) || [])[1]).filter(Boolean).map(s => s.replace(/[*_`$]/g, "").trim()).filter(s => s.length > 2).slice(0, 25);

/**
 * @param {object} o
 *  examen: {id, asig, titulo, alcance}
 *  temas: [{id, titulo, puntos?: []}]  (los temas que entran)
 *  pistas: [{id, texto, nivel, de, votos?: [uid], admin?: bool}]
 *  apuntes: [{titulo, tema, md}]  (aprobados de esa asignatura)
 *  historial: [{asig, items: [{texto, entro}]}]  (exámenes anteriores ya marcados)
 *  modelo: {g: {fuente: {h, n}}, a: {asig: {fuente: {h, n}}}}
 * @returns [{texto, p, nivel, etiqueta, razones: [], fuentes: {fuente: peso}}] de más a menos probable
 */
export function predecir({ examen, temas = [], pistas = [], apuntes = [], historial = [], modelo = null }) {
  const asig = examen && examen.asig, items = [];
  const buscar = (texto) => items.find(x => parecido(x.texto, texto) >= IGUAL);
  const poner = (texto, fuente, peso, extra) => {
    texto = String(texto || "").trim(); if (!texto) return null;
    let x = buscar(texto);
    if (!x) { x = { texto, fuentes: {}, quien: new Set(), pistas: [] }; items.push(x); }
    x.fuentes[fuente] = Math.max(x.fuentes[fuente] || 0, 0) + peso;
    if (extra) extra(x);
    return x;
  };
  // 1) pistas: cada persona cuenta una vez por contenido; el administrador pesa más
  for (const p of pistas) {
    if (!FUENTES[p.nivel] || !String(p.texto || "").trim()) continue;
    const gente = [p.de, ...(p.votos || [])].filter(Boolean);
    let x = buscar(p.texto);
    if (!x) { x = { texto: p.texto.trim(), fuentes: {}, quien: new Set(), pistas: [] }; items.push(x); }
    x.pistas.push(p.id);
    for (const u of gente) {
      const k = p.nivel + ":" + u; if (x.quien.has(k)) continue; x.quien.add(k);
      x.fuentes[p.nivel] = (x.fuentes[p.nivel] || 0) + (p.admin && u === p.de ? PESO_ADMIN : 1);
    }
  }
  // 2) temario: los temas del examen y sus puntos
  for (const t of temas) {
    if ((t.puntos || []).length) t.puntos.forEach(pt => poner(pt, "temario", 1, x => { x.tema = x.tema || t.titulo; }));
    else poner(t.titulo, "temario", 1, x => { x.tema = x.tema || t.titulo; });
  }
  // 3) apuntes: los apartados de los apuntes de esos temas (lo que se ha dado en clase)
  const temaDe = (a) => temas.find(t => parecido(t.titulo, a.tema || a.titulo) >= 0.5 || parecido(t.titulo, a.titulo) >= 0.5);
  for (const a of apuntes) {
    if (temas.length && !temaDe(a)) continue;
    const secs = apartados(a.md);
    (secs.length ? secs : [a.titulo]).forEach(s => {
      const x = buscar(s);
      if (x) x.fuentes.apuntes = Math.min(3, (x.fuentes.apuntes || 0) + 1);
      else if (secs.length) poner(s, "apuntes", 1);
    });
  }
  // 4) exámenes anteriores de la asignatura
  for (const h of historial) {
    if (h.asig !== asig) continue;
    for (const it of h.items || []) {
      if (!it.entro) continue;
      const x = buscar(it.texto); if (x) x.fuentes.repetido = Math.min(3, (x.fuentes.repetido || 0) + 1);
    }
  }
  // combinar
  return items.map(x => {
    let no = 1; const razones = [];
    for (const s in x.fuentes) {
      const peso = x.fuentes[s]; if (!(peso > 0)) continue;
      no *= Math.pow(1 - pFuente(modelo, asig, s), peso);
      const n = s in { seguro: 1, probable: 1, posible: 1 } ? [...x.quien].filter(k => k.startsWith(s + ":")).length : 0;
      razones.push(FUENTES[s].txt + (n > 1 ? ` (${n} personas)` : s === "repetido" && peso > 1 ? ` (${peso} veces)` : ""));
    }
    const p = Math.round((1 - no) * 100) / 100, [, nivel, etiqueta] = nivelDe(p);
    return { texto: x.texto, p, nivel, etiqueta, razones, fuentes: x.fuentes, pistas: x.pistas, tema: x.tema || "" };
  }).sort((a, b) => b.p - a.p || a.texto.localeCompare(b.texto));
}

/**
 * Aprende de un examen ya hecho: para cada contenido que se predijo, suma a cada fuente que lo apoyaba un intento
 * y, si entró, un acierto (en la asignatura y en el total).
 * @param modelo  {g, a}
 * @param asig
 * @param marcados [{fuentes: {fuente: peso}, entro: bool}]
 * @returns modelo nuevo (no modifica el anterior)
 */
export function aprender(modelo, asig, marcados) {
  const m = JSON.parse(JSON.stringify(modelo || {})); m.g = m.g || {}; m.a = m.a || {}; m.a[asig] = m.a[asig] || {};
  for (const it of marcados) {
    for (const s in it.fuentes || {}) {
      if (!FUENTES[s] || !(it.fuentes[s] > 0)) continue;
      for (const destino of [m.g, m.a[asig]]) { const c = destino[s] = destino[s] || { h: 0, n: 0 }; c.n += 1; if (it.entro) c.h += 1; }
    }
  }
  m.examenes = (m.examenes || 0) + 1;
  return m;
}

// Precisión del modelo para enseñarla: de lo que se marcó como "Seguro/Muy probable", cuánto entró
export function acierto(historial) {
  let si = 0, n = 0;
  for (const h of historial || []) for (const it of h.items || []) if (typeof it.p === "number" && it.p >= 0.55) { n++; if (it.entro) si++; }
  return n ? Math.round(si / n * 100) : null;
}
