// ---- Datos: los 20 idioms del global de Inglés (lista de clase) ----
// en: como se enseña · enOk: otras formas válidas · es: significado de clase · esOk: respuestas en español que valen · ej: ejemplo
window.IDIOMS = [
  { id: "d01", en: "blood is thicker than water", enOk: [], es: "la familia es lo primero", esOk: ["la familia es lo primero", "la familia primero", "la familia es lo mas importante", "la sangre es mas espesa que el agua", "la sangre tira"], ej: "I'll always help my brother — blood is thicker than water." },
  { id: "d02", en: "it's raining cats and dogs", enOk: ["it is raining cats and dogs", "raining cats and dogs"], es: "está lloviendo a mares", esOk: ["esta lloviendo a mares", "llueve a mares", "llover a mares", "esta lloviendo a cantaros", "llueve a cantaros", "esta diluviando", "diluvia"], ej: "Take an umbrella, it's raining cats and dogs!" },
  { id: "d03", en: "face the music", enOk: [], es: "échale valor", esOk: ["echale valor", "echarle valor", "echale valor", "afrontar las consecuencias", "enfrentarse a algo", "dar la cara", "echale huevos"], ej: "You broke it, so face the music and tell your mum." },
  { id: "d04", en: "my lips are sealed", enOk: ["lips are sealed"], es: "mis labios están sellados", esOk: ["mis labios estan sellados", "soy una tumba", "no dire nada", "mis labios sellados"], ej: "Don't worry, I won't tell anyone — my lips are sealed." },
  { id: "d05", en: "an apple a day keeps the doctor away", enOk: ["apple a day keeps the doctor away"], es: "come sano y tendrás una vida sana", esOk: ["come sano y tendras una vida sana", "come sano y tendras vida sana", "comer sano y tener una vida sana", "come sano"], ej: "Eat your fruit: an apple a day keeps the doctor away." },
  { id: "d06", en: "hit the books", enOk: [], es: "hinca los codos", esOk: ["hinca los codos", "hincar los codos", "ponerse a estudiar", "ponte a estudiar", "empollar"], ej: "The global is on Thursday, so I need to hit the books." },
  { id: "d07", en: "you can't teach an old dog new tricks", enOk: ["you cannot teach an old dog new tricks", "can't teach an old dog new tricks"], es: "más sabe el diablo por viejo que por diablo", esOk: ["mas sabe el diablo por viejo que por diablo", "mas sabe el diablo por viejo"], ej: "My grandad won't use a smartphone — you can't teach an old dog new tricks." },
  { id: "d08", en: "don't rock the boat", enOk: ["do not rock the boat", "rock the boat"], es: "no le eches más leña al fuego", esOk: ["no le eches mas lena al fuego", "no eches mas lena al fuego", "no echar mas lena al fuego", "no le eches lena al fuego"], ej: "Everyone is calm now, so don't rock the boat." },
  { id: "d09", en: "when in Rome, do as the Romans do", enOk: ["when in rome do as the romans do"], es: "donde fueres, haz lo que vieres", esOk: ["donde fueres haz lo que vieres", "allí donde fueres haz lo que vieres", "alli donde fueres haz lo que vieres"], ej: "In Spain we have dinner at ten — when in Rome, do as the Romans do." },
  { id: "d10", en: "out of this world", enOk: [], es: "de otro planeta", esOk: ["de otro planeta", "de otro mundo", "buenisimo", "espectacular", "increible"], ej: "Your grandmother's cake is out of this world!" },
  { id: "d11", en: "make a living", enOk: ["to make a living"], es: "ganarse la vida", esOk: ["ganarse la vida", "ganarse el pan", "ganar dinero para vivir"], ej: "He makes a living as a taxi driver." },
  { id: "d12", en: "on the ball", enOk: ["be on the ball", "to be on the ball"], es: "estar al loro", esOk: ["estar al loro", "al loro", "estar atento", "estar espabilado", "estar al tanto"], ej: "Our new goalkeeper is really on the ball." },
  { id: "d13", en: "crime doesn't pay", enOk: ["crime does not pay"], es: "el que la hace la paga", esOk: ["el que la hace la paga", "quien la hace la paga", "el crimen no paga"], ej: "The thief went to prison — crime doesn't pay." },
  { id: "d14", en: "money makes the world go round", enOk: ["money makes the world go around"], es: "el dinero mueve el mundo", esOk: ["el dinero mueve el mundo", "el dinero mueve al mundo", "el dinero hace girar el mundo"], ej: "Everybody wants a better salary — money makes the world go round." },
  { id: "d15", en: "don't beat around the bush", enOk: ["do not beat around the bush", "doesn't beat around the bush", "beat around the bush", "don't beat about the bush"], es: "no te vayas por las ramas", esOk: ["no te vayas por las ramas", "no irse por las ramas", "no te andes por las ramas", "ve al grano", "no andarse por las ramas"], ej: "Don't beat around the bush — tell me what happened." },
  { id: "d16", en: "better late than never", enOk: [], es: "mejor tarde que nunca", esOk: ["mejor tarde que nunca"], ej: "You finally finished it? Better late than never!" },
  { id: "d17", en: "hit the sack", enOk: ["hit the hay"], es: "planchar la oreja", esOk: ["planchar la oreja", "irse a dormir", "ir a dormir", "irse a la cama", "acostarse"], ej: "I'm exhausted — time to hit the sack." },
  { id: "d18", en: "pull someone's leg", enOk: ["pull somebody's leg", "pull someones leg", "pull my leg", "pull your leg"], es: "tomar el pelo a alguien", esOk: ["tomar el pelo a alguien", "tomar el pelo", "tomarle el pelo a alguien", "vacilar a alguien"], ej: "Is that true or are you pulling my leg?" },
  { id: "d19", en: "to be under the weather", enOk: ["be under the weather", "under the weather"], es: "no estar de humor", esOk: ["no estar de humor", "no estoy de humor", "estar pachucho", "estar malo", "no encontrarse bien"], ej: "Leave him alone, he's a bit under the weather today." },
  { id: "d20", en: "a penny for your thoughts", enOk: ["penny for your thoughts"], es: "baja de las nubes", esOk: ["baja de las nubes", "bajar de las nubes", "en que piensas", "en que estas pensando"], ej: "You look very quiet. A penny for your thoughts?" },
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

