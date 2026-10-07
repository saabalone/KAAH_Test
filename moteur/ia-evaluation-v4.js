// L'evaluation de l'IA VERSION 4 (saab, 2026-10-04 : « pour pieger une bille
// sur a, il suffit de lui mettre un triangle en b, c, par ex. a3_b34c4 : a3 ne
// peut plus bouger ... tu peux ajouter dans v4 pour voir ce que ca donne ») :
// la version 3, plus le PIEGE — chaque bille des couronnes b et a qui ne peut
// faire AUCUN pas vers le centre (seule, dans sa ligne d'amies, ou en
// poussant) compte `piege` pour l'adversaire.
// Le vrai piege (les deux camps jouent : solveur/kai-plus.cpp, kaiplus_piege)
// prend jusqu'a quelques secondes : trop pour chaque position evaluee. Ici,
// seulement l'immobilite, quelques cases a regarder par bille.
//
// Jouee par KAI++ (solveur/kai-plus.cpp) ; cette copie sert a l'affichage et
// tests/kai-plus.test.js l'exige egale.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : casesDuPlateau,
// versNotation (plateau.js), BILLES_MAX_PAR_COUP, couleurAdverse (regles.js),
// couleursDuPlateau (partie.js), CASES_VOISINES_IA, INDEX_DIRECTION_OPPOSEE,
// STYLES_IA_V2 (ia-evaluation-v2.js), evaluerPosition, evaluerPositionV2,
// evaluerPositionV3, STYLES_IA_V3, COORDONNEES_DES_CASES_IA, distanceAxiale
// (ia-evaluation-v3.js) viennent de fichiers charges avant celui-ci.

const CLES_POIDS_IA_V4 = ['piege'];
const STYLES_IA_V4 = {
  agressif: { ...STYLES_IA_V3.agressif, piege: 60 },
  normal: { ...STYLES_IA_V3.normal, piege: 40 },
  defensif: { ...STYLES_IA_V3.defensif, piege: 40 },
};

// Les couronnes ou une bille peut etre piegee : b (anneau 3) et a (anneau 4).
const ANNEAU_PIEGE_MIN = 3;
const ANNEAU_DES_CASES_IA = Object.fromEntries(
  Object.entries(COORDONNEES_DES_CASES_IA).map(([notation, coordonnees]) => [notation, distanceAxiale(coordonnees, { q: 0, r: 0 })])
);

// Les amies consecutives depuis `notation` dans la direction `index` (exclue).
function nombreDAmiesALaSuite(couleurs, notation, index, camp, maximum) {
  let nombre = 0;
  for (let suivante = CASES_VOISINES_IA[notation][index]; suivante !== null && couleurs[suivante] === camp && nombre < maximum; suivante = CASES_VOISINES_IA[suivante][index]) nombre++;
  return nombre;
}

// La case apres `nombre` cases depuis `notation` dans la direction `index`.
function caseApres(notation, index, nombre) {
  let ici = notation;
  for (let pas = 0; pas < nombre && ici !== null; pas++) ici = CASES_VOISINES_IA[ici][index];
  return ici;
}

// Un pas vers le centre dans la direction `index` : la ligne de la bille et
// des amies devant elle (au plus 3 en tout, renforcee d'amies derriere) avance
// sur une case vide, ou pousse moins nombreuse qu'elle (la regle de
// moteur/regles.js, coupEnLigne).
function peutAvancer(couleurs, notation, index, camp) {
  const devant = nombreDAmiesALaSuite(couleurs, notation, index, camp, BILLES_MAX_PAR_COUP);
  if (devant >= BILLES_MAX_PAR_COUP) return false;
  const derriere = nombreDAmiesALaSuite(couleurs, notation, INDEX_DIRECTION_OPPOSEE[index], camp, BILLES_MAX_PAR_COUP - 1 - devant);
  const groupe = 1 + devant + derriere;
  const front = caseApres(notation, index, devant + 1);
  if (front === null) return false;
  if (couleurs[front] === undefined) return true;
  const adverses = 1 + nombreDAmiesALaSuite(couleurs, front, index, couleurAdverse(camp), BILLES_MAX_PAR_COUP);
  if (groupe <= adverses) return false;
  const apres = caseApres(front, index, adverses);
  return apres === null || couleurs[apres] === undefined;
}

// Vrai si la bille de `notation` (couronnes b et a) ne peut faire aucun pas
// vers le centre.
function billeBloqueeVersLeCentre(couleurs, notation) {
  const anneau = ANNEAU_DES_CASES_IA[notation];
  if (anneau < ANNEAU_PIEGE_MIN) return false;
  const camp = couleurs[notation];
  return !CASES_VOISINES_IA[notation].some((voisine, index) => voisine !== null && ANNEAU_DES_CASES_IA[voisine] < anneau && peutAvancer(couleurs, notation, index, camp));
}

function billesBloquees(couleurs, camp) {
  return Object.keys(couleurs).filter((notation) => couleurs[notation] === camp && billeBloqueeVersLeCentre(couleurs, notation)).length;
}

// Le terme du piege pour `camp` (le camp de l'IA) : les billes adverses
// bloquees moins les siennes.
function termeDuPiegeIA(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return poids.piege * (billesBloquees(couleurs, couleurAdverse(camp)) - billesBloquees(couleurs, camp));
}

// La valeur de `etat` pour `camp`, version 4 (le meme ordre des operations que
// solveur/kai-plus.cpp).
function evaluerPositionV4(etat, camp, poids) {
  const base = evaluerPositionV3(etat, camp, poids);
  if (etat.vainqueur) return base;
  return base + termeDuPiegeIA(etat, camp, poids);
}

// L'evaluation de chaque version : moteur/ia-evaluation-v5.js, evaluationDeLaVersion.
