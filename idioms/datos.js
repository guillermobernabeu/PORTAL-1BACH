// ---- Datos: los 16 idioms del global de Inglés ----
// en: como se enseña · enOk: otras formas válidas · es: significado · esOk: respuestas en español que valen · ej: ejemplo
window.IDIOMS = [
  { id: "i01", en: "my lips are sealed", enOk: ["lips are sealed"], es: "no diré nada / soy una tumba", esOk: ["no dire nada", "soy una tumba", "no dire nada a nadie", "no voy a decir nada", "mis labios estan sellados", "no lo contare", "no dire ni una palabra", "guardare el secreto"], ej: "Don't worry, I won't tell anyone — my lips are sealed." },
  { id: "i02", en: "face the music", enOk: [], es: "afrontar las consecuencias", esOk: ["afrontar las consecuencias", "enfrentar las consecuencias", "asumir las consecuencias", "dar la cara", "afrontar los hechos"], ej: "He broke the window, so now he has to face the music." },
  { id: "i03", en: "it's raining cats and dogs", enOk: ["it is raining cats and dogs", "raining cats and dogs", "rain cats and dogs"], es: "llueve a cántaros", esOk: ["llueve a cantaros", "esta lloviendo a cantaros", "llover a cantaros", "llueve mucho", "esta lloviendo mucho", "diluvia", "esta diluviando", "cae el diluvio"], ej: "Take an umbrella, it's raining cats and dogs!" },
  { id: "i04", en: "under the weather", enOk: ["to be under the weather", "be under the weather", "feel under the weather", "feeling under the weather"], es: "estar malo / pachucho", esOk: ["estar malo", "pachucho", "estar pachucho", "estar enfermo", "encontrarse mal", "sentirse mal", "estar indispuesto", "malo", "enfermo"], ej: "I'm a bit under the weather today, so I'm staying home." },
  { id: "i05", en: "hit the sack", enOk: ["hit the hay"], es: "irse a dormir", esOk: ["irse a dormir", "ir a dormir", "irse a la cama", "ir a la cama", "acostarse", "irse a acostar", "me voy a dormir"], ej: "I'm exhausted — time to hit the sack." },
  { id: "i06", en: "beat around the bush", enOk: ["beat about the bush"], es: "andarse por las ramas", esOk: ["andarse por las ramas", "irse por las ramas", "andar por las ramas", "dar rodeos", "andarse con rodeos", "no ir al grano"], ej: "Stop beating around the bush and tell me what happened." },
  { id: "i07", en: "out of this world", enOk: [], es: "buenísimo / de otro planeta", esOk: ["buenisimo", "de otro planeta", "de otro mundo", "increible", "espectacular", "riquisimo", "alucinante", "fuera de este mundo"], ej: "Your grandmother's cake is out of this world!" },
  { id: "i08", en: "as busy as a bee", enOk: ["busy as a bee", "be as busy as a bee"], es: "muy atareado / ocupadísimo", esOk: ["muy atareado", "muy ocupado", "ocupadisimo", "atareadisimo", "liadisimo", "muy liado", "estar muy ocupado", "no parar"], ej: "With exams and football, she's as busy as a bee." },
  { id: "i09", en: "bring home the bacon", enOk: ["bring the bacon home"], es: "ganarse el pan / traer el dinero a casa", esOk: ["ganarse el pan", "ganarse la vida", "traer el dinero a casa", "traer dinero a casa", "mantener a la familia", "ganar el pan", "ganar dinero"], ej: "Both of my parents work to bring home the bacon." },
  { id: "i10", en: "hit the books", enOk: [], es: "ponerse a estudiar / hincar los codos", esOk: ["ponerse a estudiar", "hincar los codos", "estudiar mucho", "estudiar", "empollar", "ponerse a empollar"], ej: "The global is on Thursday, so I need to hit the books." },
  { id: "i11", en: "in the loop", enOk: ["be in the loop", "keep in the loop", "keep someone in the loop"], es: "estar al tanto / al corriente", esOk: ["estar al tanto", "al tanto", "estar al corriente", "al corriente", "estar informado", "mantener informado", "estar enterado"], ej: "Keep me in the loop about the trip, please." },
  { id: "i12", en: "blood is thicker than water", enOk: [], es: "la familia es lo primero", esOk: ["la familia es lo primero", "la familia primero", "la familia es lo mas importante", "la sangre es mas espesa que el agua", "la sangre tira"], ej: "I'll always help my brother — blood is thicker than water." },
  { id: "i13", en: "as white as a sheet", enOk: ["white as a sheet", "go as white as a sheet", "turn as white as a sheet"], es: "blanco como la pared / pálido", esOk: ["blanco como la pared", "blanco como el papel", "blanco como una sabana", "palido", "muy palido", "blanco como la leche", "ponerse blanco"], ej: "When he saw the exam, he went as white as a sheet." },
  { id: "i14", en: "a golden opportunity", enOk: ["golden opportunity"], es: "una oportunidad de oro", esOk: ["una oportunidad de oro", "oportunidad de oro", "una ocasion de oro", "una oportunidad unica", "oportunidad unica", "una gran oportunidad"], ej: "This exchange is a golden opportunity to practise English." },
  { id: "i15", en: "have a whale of a time", enOk: ["had a whale of a time", "a whale of a time", "having a whale of a time"], es: "pasarlo en grande / pasarlo bomba", esOk: ["pasarlo en grande", "pasarlo genial", "pasarlo bomba", "pasarselo en grande", "pasarlo muy bien", "pasarlo de lujo", "pasarlo pipa", "divertirse mucho"], ej: "We had a whale of a time at the party." },
  { id: "i16", en: "out of the blue", enOk: [], es: "de repente / sin avisar", esOk: ["de repente", "sin avisar", "de la nada", "de improviso", "inesperadamente", "de sopetón", "de golpe", "sin previo aviso"], ej: "My cousin called me out of the blue after two years." },
];

// ---- Corrección ----
window.norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, "").replace(/[^a-z0-9ñ\s]/g, " ").replace(/\b(its)\b/g, "it is").replace(/\s+/g, " ").trim();
window.sinArt = (t) => t.replace(/^(to |be |a |an |the |estar |el |la |los |las |un |una |muy )+/, "");
window.lev = function lev(a, b) { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
// 2 = bien · 1 = casi (falta de ortografía) · 0 = mal
window.corrigeIdiom = function corrige(resp, idiom, dir) {
  const r = norm(resp); if (!r) return 0;
  const val = dir === "es" ? [idiom.en, ...idiom.enOk] : [...idiom.esOk, ...idiom.es.split("/")];
  const ok = val.map(norm);
  if (ok.some(v => v === r || sinArt(v) === sinArt(r))) return 2;
  // en español vale si contiene una de las respuestas largas (p. ej. "pues irse a dormir")
  if (dir === "en" && ok.some(v => v.length >= 8 && r.includes(v))) return 2;
  const tol = (v) => v.length >= 14 ? 3 : v.length >= 7 ? 2 : v.length >= 4 ? 1 : 0;
  if (ok.some(v => lev(sinArt(v), sinArt(r)) <= tol(sinArt(v)))) return 1;
  return 0;
}

