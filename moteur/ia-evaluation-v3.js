// L'evaluation de l'IA VERSION 3 (saab, 2026-10-03) : celle de la version 2,
// Centre par pas compris, plus :
//   - une valeur par CASE distincte (celles qu'aucune rotation ni aucun miroir
//     ne ramene l'une sur l'autre : e5 d4 c4 c3 b4 b2 a3 a2 a1), pour une bille
//     a soi, et son oppose pour une bille adverse. « Les 2 dernieres couronnes
//     etant les zones ejectables, pour les reperer facilement on pourrait leur
//     mettre un poids negatif » : b et a le sont au depart ;
//   - la COMPACITE (« par la distance de Manhattan, qui donne directement le
//     nombre exact de deplacements minimaux pour aller d'une bille a une autre,
//     donc plus la somme des distances est faible, plus le bloc de billes est
//     compact ») : la moyenne des distances entre ses billes, deux a deux — la
//     moyenne et non la somme, sinon perdre des billes rendrait plus compact ;
//   - le GAIN et la PERTE SELON LE SCORE (« comme ca en fin de partie on saurait
//     si on a le temps d'attaquer ») : la k-ieme ejection rapporte (ou coute)
//     k - 1 fois gainScore (perteScore) de plus que la premiere.
//
// Jouee par KAI++ (solveur/kai-plus.cpp, saab 2026-10-02 : « on ne fait que
// KAI++ ») ; cette copie sert a l'affichage (Essai, colonnes du tableau 1er
// coup) et tests/kai-plus.test.js l'exige egale.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : casesDuPlateau,
// versNotation (plateau.js), couleurAdverse (partie.js), evaluerPosition,
// ejectionsDe (ia-evaluation.js), evaluerPositionV2, STYLES_IA_V2
// (ia-evaluation-v2.js) viennent de fichiers charges avant celui-ci.

// Les 9 cases, du centre vers le bord, dans l'ordre de saab.
const CLES_CASES_IA_V3 = ['caseE5', 'caseD4', 'caseC4', 'caseC3', 'caseB4', 'caseB2', 'caseA3', 'caseA2', 'caseA1'];
// Les poids ajoutes par la version 3, dans l'ordre ou KAI++ les recoit.
const CLES_POIDS_IA_V3 = ['gainScore', 'perteScore', 'compacite', ...CLES_CASES_IA_V3];

// La case distincte d'une case : son anneau (la distance au centre) et sa
// distance au coin le plus proche de cet anneau (en coordonnees cubiques, la
// plus petite des trois) — par anneau, du coin vers le milieu du cote.
const CLASSES_PAR_ANNEAU_IA = [['caseE5'], ['caseD4'], ['caseC3', 'caseC4'], ['caseB2', 'caseB4'], ['caseA1', 'caseA2', 'caseA3']];

const distanceAxiale = (a, b) => Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.q + a.r - b.q - b.r));
const CENTRE_AXIAL = { q: 0, r: 0 };

const CLASSE_DES_CASES_IA = Object.fromEntries(
  casesDuPlateau().map((caseDuPlateau) => {
    const versLeCoin = Math.min(Math.abs(caseDuPlateau.q), Math.abs(caseDuPlateau.r), Math.abs(caseDuPlateau.q + caseDuPlateau.r));
    return [versNotation(caseDuPlateau.q, caseDuPlateau.r), CLASSES_PAR_ANNEAU_IA[distanceAxiale(caseDuPlateau, CENTRE_AXIAL)][versLeCoin]];
  })
);
const COORDONNEES_DES_CASES_IA = Object.fromEntries(casesDuPlateau().map((caseDuPlateau) => [versNotation(caseDuPlateau.q, caseDuPlateau.r), caseDuPlateau]));

function classeDeLaCaseIA(notation) {
  return CLASSE_DES_CASES_IA[notation];
}

// Les poids de depart de la version 3, par style (a retoucher dans Reglages) :
// les cases des 2 dernieres couronnes negatives, la case du coin a peine plus
// que le reste du bord ; l'Agressif pese plus le score de ses prises, le
// Defensif celui de ses pertes et la compacite.
const CASES_DE_DEPART_IA_V3 = { caseE5: 0, caseD4: 0, caseC4: 0, caseC3: 0, caseB4: -5, caseB2: -5, caseA3: -10, caseA2: -10, caseA1: -12 };
const STYLES_IA_V3 = {
  agressif: { ...STYLES_IA_V2.agressif, gainScore: 300, perteScore: 150, compacite: 10, ...CASES_DE_DEPART_IA_V3 },
  normal: { ...STYLES_IA_V2.normal, gainScore: 200, perteScore: 200, compacite: 20, ...CASES_DE_DEPART_IA_V3 },
  defensif: { ...STYLES_IA_V2.defensif, gainScore: 150, perteScore: 300, compacite: 30, ...CASES_DE_DEPART_IA_V3 },
};

// Ce que vaut une bille a soi sur la case `cle`, Centre par pas compris (saab,
// 2026-10-04 : « pourquoi jusqu'a v2el, e5 a a1 = — alors qu'elles ont la
// valeur calculee du centre ? ») : les pas de la case fois le Centre, plus sa
// valeur propre en version 3. Le bord a son poids a part (bordSoi, bordAdverse).
const PAS_DES_CASES_IA = { caseE5: 4, caseD4: 3, caseC4: 2, caseC3: 2, caseB4: 1, caseB2: 1, caseA3: 0, caseA2: 0, caseA1: 0 };
const VERSION_DES_CASES_IA = 3;

function valeurTotaleDeLaCase(poids, version, cle) {
  return poids.centre * PAS_DES_CASES_IA[cle] + (version >= VERSION_DES_CASES_IA ? poids[cle] : 0);
}

// Ce que les billes de `camp` valent par leurs cases.
function valeurDesCasesDuCamp(etat, camp, poids) {
  let valeur = 0;
  for (const [notation, bille] of Object.entries(etat.plateau)) {
    if (bille.couleur === camp) valeur += poids[CLASSE_DES_CASES_IA[notation]];
  }
  return valeur;
}

// Le terme des cases pour `camp` (le camp de l'IA) : les siennes moins les adverses.
function termeDesCasesIA(etat, camp, poids) {
  return valeurDesCasesDuCamp(etat, camp, poids) - valeurDesCasesDuCamp(etat, couleurAdverse(camp), poids);
}

// La distance moyenne, en coups, entre deux billes de `camp` ; 0 sous deux billes.
function compaciteDuCamp(etat, camp) {
  const billes = Object.entries(etat.plateau)
    .filter(([, bille]) => bille.couleur === camp)
    .map(([notation]) => COORDONNEES_DES_CASES_IA[notation]);
  let somme = 0;
  let paires = 0;
  for (let i = 0; i < billes.length; i++) {
    for (let j = i + 1; j < billes.length; j++) {
      somme += distanceAxiale(billes[i], billes[j]);
      paires++;
    }
  }
  return paires === 0 ? 0 : somme / paires;
}

// Ce qu'apportent en plus du gain (ou de la perte) les `ejections` deja
// faites : 0 + 1 + ... + (ejections - 1) fois le poids du score.
const rangsAuDelaDuPremier = (ejections) => (ejections * (ejections - 1)) / 2;

// Les termes ajoutes par la version 3 (le detail de l'Essai les montre a part).
function termesDeLaVersion3(etat, camp, poids) {
  const lui = couleurAdverse(camp);
  return {
    cases: termeDesCasesIA(etat, camp, poids),
    compacite: poids.compacite * (compaciteDuCamp(etat, lui) - compaciteDuCamp(etat, camp)),
    gainScore: poids.gainScore * rangsAuDelaDuPremier(ejectionsDe(etat, lui)),
    perteScore: -poids.perteScore * rangsAuDelaDuPremier(ejectionsDe(etat, camp)),
  };
}

// La valeur de `etat` pour `camp`, version 3 (le meme ordre des operations que
// solveur/kai-plus.cpp, pour des valeurs identiques au bit pres).
function evaluerPositionV3(etat, camp, poids) {
  const base = evaluerPositionV2(etat, camp, poids);
  if (etat.vainqueur) return base;
  const { cases, compacite, gainScore, perteScore } = termesDeLaVersion3(etat, camp, poids);
  return base + cases + compacite + gainScore + perteScore;
}

// L'evaluation de chaque version : moteur/ia-evaluation-v4.js, evaluationDeLaVersion.
