// Geometrie du plateau hexagonal d'Abalone.
// Une case se repere par deux nombres (q, r), les coordonnees axiales : comme
// une latitude et une longitude, mais sur une grille hexagonale.
// Aucun acces au DOM ici : ce fichier ne sait rien de l'affichage.
//
// Pas d'import ni d'export : ce fichier se charge comme un script classique
// (<script src="...">), pour que index.html s'ouvre par simple double-clic,
// sans serveur — voir CLAUDE.md, "pourquoi pas de modules ES ici".

// Le plateau s'etend sur 4 cases depuis le centre (e5), dans les 6
// directions de la grille hexagonale. C'est ce rayon qui donne les 61 cases
// et qui fixe les lettres et chiffres de la notation officielle.
const RAYON_PLATEAU = 4;

const NOMBRE_DE_CASES = 61;

// Les 6 directions possibles sur une grille hexagonale, dans l'ordre utilise
// par KAAWA (HEX_DIRECTIONS, kaa_constants_ClO_Co.py).
const DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

// Une case est valide si elle reste dans le losange -RAYON..+RAYON sur q et
// r, ET assez proche du centre sur la troisieme diagonale (q + r) : c'est
// cette troisieme condition qui coupe les coins du losange pour donner la
// forme hexagonale du plateau.
function estCaseValide(q, r) {
  return (
    Math.abs(q) <= RAYON_PLATEAU &&
    Math.abs(r) <= RAYON_PLATEAU &&
    Math.abs(q + r) <= RAYON_PLATEAU
  );
}

// Renvoie les 61 cases du plateau, dans un ordre stable (q croissant, puis r
// croissant).
function casesDuPlateau() {
  const cases = [];
  for (let q = -RAYON_PLATEAU; q <= RAYON_PLATEAU; q++) {
    for (let r = -RAYON_PLATEAU; r <= RAYON_PLATEAU; r++) {
      if (estCaseValide(q, r)) cases.push({ q, r });
    }
  }
  return cases;
}

// Renvoie les cases voisines valides d'une case du plateau : 6 au centre,
// 3 dans un coin, 4 sur un bord.
function voisins(q, r) {
  return DIRECTIONS
    .map((direction) => ({ q: q + direction.q, r: r + direction.r }))
    .filter((voisin) => estCaseValide(voisin.q, voisin.r));
}

// Notation officielle Abalone : une lettre de colonne (a..i) suivie d'un
// chiffre de ligne (1..9), ex. e5 = le centre.
// Regle observee dans KAAWA (table ABALONE_NOTATION, kaa_constants_ClO_Co.py) :
// la lettre depend de r et le chiffre depend de q, tous deux decales du
// rayon du plateau pour que la notation reste toujours positive.
const CODE_LETTRE_A = 'a'.charCodeAt(0);
const NOTATION_VALIDE = /^[a-i][1-9]$/;

// Isolees de versNotation (au lieu d'y rester en ligne) : casesBordDuPlateau
// (plus bas) a besoin exactement de la meme regle "lettre depuis r" / "chiffre
// depuis q" — CLAUDE.md, une regle n'est jamais ecrite a deux endroits.
function lettreDeRangee(r) {
  return String.fromCharCode(CODE_LETTRE_A + (RAYON_PLATEAU - r));
}
function chiffreDeColonne(q) {
  return String(q + RAYON_PLATEAU + 1);
}

function versNotation(q, r) {
  if (!estCaseValide(q, r)) return null;
  return `${lettreDeRangee(r)}${chiffreDeColonne(q)}`;
}

function depuisNotation(notation) {
  if (!NOTATION_VALIDE.test(notation)) return null;
  const r = RAYON_PLATEAU - (notation.charCodeAt(0) - CODE_LETTRE_A);
  const q = Number(notation[1]) - RAYON_PLATEAU - 1;
  // Le format peut etre syntaxiquement valide (ex. 'a6') sans designer une
  // case reelle du plateau : la colonne 'a' ne va que jusqu'a 'a5'.
  return estCaseValide(q, r) ? { q, r } : null;
}

// Case voisine d'une notation, dans une direction donnee (un element de
// DIRECTIONS), ou null si elle sort du plateau. Utilisee par regles.js et
// partie.js : pure geometrie, aucune regle du jeu ici.
function caseDansLaDirection(notation, direction) {
  const { q, r } = depuisNotation(notation);
  const q2 = q + direction.q;
  const r2 = r + direction.r;
  return estCaseValide(q2, r2) ? versNotation(q2, r2) : null;
}

// Premiere colonne (q le plus petit) d'une rangee r, derniere rangee (r le
// plus grand) d'une colonne q : les memes bornes que estCaseValide, isolees
// ici parce que casesBordDuPlateau (juste apres) et elle en ont besoin
// toutes les deux.
function premiereColonneDeRangee(r) {
  return Math.max(-RAYON_PLATEAU, -RAYON_PLATEAU - r);
}
function derniereRangeeDeColonne(q) {
  return Math.min(RAYON_PLATEAU, RAYON_PLATEAU - q);
}

// Position des 18 "cases" fictives de la bordure du plateau (phase 19bis) :
// les lettres a-i, une par rangee, sur le cote GAUCHE ; les chiffres 1-9, un
// par colonne, sur le cote BAS (et bas-droit, ou les rangees se raccourcissent).
// JAMAIS de vraies cases (estCaseValide les rejette toutes, voir le test) :
// juste des positions, calculees avec LA MEME fonction que les vraies cases
// (rendu/plateau-svg.js, positionEcran) pour l'affichage permanent des
// coordonnees autour du plateau (PLAN.md, phase 19bis).
//
// Reproduit KAAWA (kaa_constants_ClO_Co.py, SIDE_NOTATION_COORDS) : une
// lettre se place une case a GAUCHE de la premiere case reelle de sa rangee
// (meme r, q-1) ; un chiffre se place une case en-dessous de la case reelle
// la plus BASSE de sa colonne (meme q, r+1). Verifie point par point contre
// cette vraie table dans tests/plateau.test.js — aucune lettre ni aucun
// chiffre des DEUX autres cotes (droit, haut) : KAAWA n'en affiche pas non
// plus, la notation d'une case se lit deja entierement depuis la gauche et
// le bas.
function casesBordDuPlateau() {
  const bord = [];
  for (let r = -RAYON_PLATEAU; r <= RAYON_PLATEAU; r++) {
    bord.push({ q: premiereColonneDeRangee(r) - 1, r, texte: lettreDeRangee(r) });
  }
  for (let q = -RAYON_PLATEAU; q <= RAYON_PLATEAU; q++) {
    bord.push({ q, r: derniereRangeeDeColonne(q) + 1, texte: chiffreDeColonne(q) });
  }
  return bord;
}
