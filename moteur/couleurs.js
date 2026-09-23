// Conversions de couleur pures (phase 22) : le format [r, g, b, a] en 0-1 de
// KAAWA (moteur/reglages.js, REGLAGES_PAR_DEFAUT) d'un cote, le format hex
// "#rrggbb" des `<input type="color">` de l'autre, et de quoi deriver des
// NUANCES d'une meme teinte plutot que d'inventer des couleurs a part —
// separe de moteur/reglages.js pour la regle des 200 lignes (CLAUDE.md),
// aucune autre raison : ce fichier ne connait rien des reglages eux-memes.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

function versDeuxChiffresHex(canal255) {
  return Math.round(canal255).toString(16).padStart(2, '0');
}

// [r, g, b, a] en 0-1 (format KAAWA) -> "#rrggbb" (format de
// <input type="color">, sans alpha : le selecteur natif n'en a pas).
function couleurVersHex([r, g, b]) {
  return `#${versDeuxChiffresHex(r * 255)}${versDeuxChiffresHex(g * 255)}${versDeuxChiffresHex(b * 255)}`;
}

// L'inverse : alpha toujours a 1 (aucun reglage KAAH n'en propose).
function hexVersCouleur(hex) {
  const nombre = parseInt(hex.slice(1), 16);
  return [((nombre >> 16) & 0xff) / 255, ((nombre >> 8) & 0xff) / 255, (nombre & 0xff) / 255, 1];
}

// Melange deux couleurs hex : `ratio` = 0 rend `hexA` tel quel, 1 rend
// `hexB` tel quel.
function melangerHex(hexA, hexB, ratio) {
  const [rA, gA, bA] = hexVersCouleur(hexA);
  const [rB, gB, bB] = hexVersCouleur(hexB);
  const melange = (a, b) => a + (b - a) * ratio;
  return couleurVersHex([melange(rA, rB), melange(gA, gB), melange(bA, bB), 1]);
}

// Les arrets du degrade radial d'une bille de couleur personnalisee
// (rendu/relief-plateau.js garde ses deux degrades par defaut, regles a la
// main et approuves par saab — cette fonction ne sert que pour une couleur
// CHOISIE, differente des deux couleurs par defaut). Toujours un reflet
// blanc pur au centre (regle deja en place, jamais matte) puis la couleur
// choisie, puis assombrie vers le bord — une approximation plus simple que
// les degrades a 5 arrets regles a la main, suffisante pour une couleur
// qu'on choisit soi-meme.
function construireArretsBille(hexBase) {
  return [
    [0, '#ffffff'],
    [30, melangerHex(hexBase, '#ffffff', 0.35)],
    [65, hexBase],
    [100, melangerHex(hexBase, '#000000', 0.75)],
  ];
}

// [r, g, b] (0-1) -> { h (0-360), s (0-1), l (0-1) } — conversion standard.
function hexVersHSL(hex) {
  const [r, g, b] = hexVersCouleur(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l }; // gris : la teinte n'a pas de sens, 0 par convention
  const delta = max - min;
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

function hslVersHex({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return couleurVersHex([r1 + m, g1 + m, b1 + m, 1]);
}

// « Un plateau, c'est un seul bloc » (saab, phase 22 corrigee) : au lieu de
// couleurs independantes pour le relief/les trous (ce que fait KAAWA, et que
// saab juge « inutilement different » une fois vu a l'ecran), KAAH derive
// chaque nuance de la MEME teinte choisie (board.bg_color ou board.hole_color)
// — seule la CLARTE varie, exactement comme le faisaient les gris fixes
// avant cette phase (#8c8c8c, #5a5a5a...). `niveau255` : le niveau de gris
// que cette nuance avait auparavant (0-255) ; sur une base restee grise
// (saturation nulle), cette fonction redonne CE MEME gris, a l'identique
// (test 7) : aucun changement visuel tant que saab ne choisit pas de
// couleur.
function teinterNiveauGris(hexBase, niveau255) {
  const { h, s } = hexVersHSL(hexBase);
  return hslVersHex({ h, s, l: niveau255 / 255 });
}
