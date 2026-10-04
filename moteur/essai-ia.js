// L'essai d'un profil IA (saab, 2026-09-30 : « pouvoir connaitre les poids
// calcules, afin de savoir ce qu'on doit modifier ... juste voir l'essai puis
// le valider si besoin, pour arriver a faire jouer un coup meilleur »). Sur la
// position du plateau, avec des poids pas forcement valides :
//   - le DETAIL de l'evaluation, un terme par poids (sa somme est exactement
//     l'evaluation de la machine, test 1) ;
//   - chaque coup legal, classe comme le niveau 2 le classe (la valeur apres la
//     meilleure reponse), avec ce qu'il change terme par terme : on voit quel
//     poids retoucher pour qu'un autre coup passe devant ;
//   - la valeur d'une bille sur chacune des 9 cases distinctes du plateau.
// Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : RAYON_PLATEAU
// (plateau.js), couleurAdverse, couleursDuPlateau, appliquerCoup (partie.js),
// tousLesCoupsLegaux (regles.js), ecrireCoupNacreSansAmbiguite (notation.js),
// mesuresDuCamp, ejectionsDe, DISTANCE_AU_CENTRE, VOISINS_DES_CASES,
// VALEUR_VICTOIRE_IA (ia-evaluation.js), sumitosDuCamp (ia-evaluation-v2.js),
// evaluationDeLaVersion, termesDeLaVersion3, classeDeLaCaseIA,
// valeurTotaleDeLaCase, VERSION_DES_CASES_IA (ia-evaluation-v3.js),
// termeDuPiegeIA (ia-evaluation-v4.js) viennent de fichiers charges avant celui-ci.

// Les 9 cases qu'aucune rotation ni aucun miroir ne ramene l'une sur l'autre,
// du centre au bord (saab : « e5/d4/c34/b23/a123 »).
const CASES_DISTINCTES_IA = ['e5', 'd4', 'c3', 'c4', 'b2', 'b3', 'a1', 'a2', 'a3'];

// Les termes de chaque version, dans l'ordre des colonnes (Essai, tableau 1er
// coup) : ceux de la version 3 suivent celui qu'ils completent ; « cases » est
// le terme des 9 cases (ia-evaluation-v3.js).
const TERMES_DES_VERSIONS_IA = {
  1: ['gain', 'perte', 'centre', 'cohesion', 'bordSoi', 'bordAdverse'],
  2: ['gain', 'perte', 'centre', 'cohesion', 'bordSoi', 'bordAdverse', 'sumito', 'menaceEjection', 'fourchette'],
  3: ['gain', 'gainScore', 'perte', 'perteScore', 'centre', 'cases', 'cohesion', 'compacite', 'bordSoi', 'bordAdverse', 'sumito', 'menaceEjection', 'fourchette'],
  4: ['gain', 'gainScore', 'perte', 'perteScore', 'centre', 'cases', 'cohesion', 'compacite', 'bordSoi', 'bordAdverse', 'sumito', 'menaceEjection', 'fourchette', 'piege'],
};
const VERSION_DU_PIEGE_IA = 4;

function termesDeLaVersion(version) {
  return TERMES_DES_VERSIONS_IA[version] ?? TERMES_DES_VERSIONS_IA[1];
}

// Les termes de l'evaluation de `etat` pour `camp`, un par colonne (les memes
// calculs que evaluerPosition, evaluerPositionV2 et V3, rendus a part).

function detailDeLEvaluation(etat, camp, poids, version) {
  if (etat.vainqueur) return { victoire: etat.vainqueur === camp ? VALEUR_VICTOIRE_IA : -VALEUR_VICTOIRE_IA };
  const lui = couleurAdverse(camp);
  const miens = mesuresDuCamp(etat, camp);
  const siens = mesuresDuCamp(etat, lui);
  const termes = {
    gain: poids.gain * ejectionsDe(etat, lui),
    perte: -poids.perte * ejectionsDe(etat, camp),
    centre: poids.centre * (miens.centre - siens.centre),
    cohesion: poids.cohesion * (miens.cohesion - siens.cohesion),
    bordSoi: -poids.bordSoi * miens.bord,
    bordAdverse: poids.bordAdverse * siens.bord,
  };
  if (version < 2) return termes;
  const couleurs = couleursDuPlateau(etat.plateau);
  const a = sumitosDuCamp(couleurs, camp);
  const b = sumitosDuCamp(couleurs, lui);
  const ejections = (sumitos) => sumitos.filter((sumito) => sumito.ejection).length;
  const enPlus = (sumitos) => Math.max(0, sumitos.length - 1);
  const avecSumitos = {
    ...termes,
    sumito: poids.sumito * (a.length - b.length),
    menaceEjection: poids.menaceEjection * (ejections(a) - ejections(b)),
    fourchette: poids.fourchette * (enPlus(a) - enPlus(b)),
  };
  if (version < VERSION_DES_CASES_IA) return avecSumitos;
  const avecCases = { ...avecSumitos, ...termesDeLaVersion3(etat, camp, poids) };
  return version < VERSION_DU_PIEGE_IA ? avecCases : { ...avecCases, piege: termeDuPiegeIA(etat, camp, poids) };
}

function ecartsDesTermes(avant, apres) {
  const cles = new Set([...Object.keys(avant), ...Object.keys(apres)]);
  return Object.fromEntries([...cles].map((cle) => [cle, (apres[cle] ?? 0) - (avant[cle] ?? 0)]));
}

// Chaque coup du camp au trait : `unCoup`, la valeur juste apres lui ;
// `deuxCoups`, apres la meilleure reponse (ce que le niveau 2 compare) ;
// `ecarts`, ce qu'il change a chaque terme. Du meilleur au pire.
function essaiDesCoups(etat, poids, version) {
  const camp = etat.joueurAuTrait;
  const evaluer = evaluationDeLaVersion(version);
  const detail = detailDeLEvaluation(etat, camp, poids, version);
  const coups = tousLesCoupsLegaux(couleursDuPlateau(etat.plateau), camp).map((coup) => {
    const apres = appliquerCoup(etat, coup).etat;
    const unCoup = evaluer(apres, camp, poids);
    const reponses = apres.vainqueur ? [] : tousLesCoupsLegaux(couleursDuPlateau(apres.plateau), apres.joueurAuTrait);
    const deuxCoups = reponses.length === 0 ? unCoup : Math.min(...reponses.map((reponse) => evaluer(appliquerCoup(apres, reponse).etat, camp, poids)));
    return {
      coup,
      texte: ecrireCoupNacreSansAmbiguite(couleursDuPlateau(etat.plateau), camp, coup),
      unCoup,
      deuxCoups,
      ecarts: ecartsDesTermes(detail, detailDeLEvaluation(apres, camp, poids, version)),
    };
  });
  coups.sort((a, b) => b.deuxCoups - a.deuxCoups || b.unCoup - a.unCoup);
  return { detail, coups };
}

// Ce que vaut une bille sur chacune des 9 cases distinctes : `miennes` pour
// une bille du camp de la machine, `adverses` pour une de l'adversaire (le
// centre compte par pas depuis le bord, chaque case a en plus sa valeur en
// version 3 ; le bord a son propre poids) ;
// `voisines` : combien de cases voisines (la cohesion possible).
function valeursDesCases(poids, version) {
  return CASES_DISTINCTES_IA.map((notation) => {
    const pas = RAYON_PLATEAU - DISTANCE_AU_CENTRE[notation];
    const auBord = pas === 0;
    const valeur = valeurTotaleDeLaCase(poids, version, classeDeLaCaseIA(notation));
    return {
      notation,
      pas,
      voisines: VOISINS_DES_CASES[notation].length,
      miennes: valeur - (auBord ? poids.bordSoi : 0),
      adverses: -valeur + (auBord ? poids.bordAdverse : 0),
    };
  });
}

// Ce que la sequence entiere (des coups ecrits, joues depuis `etat`) change a
// chaque terme, pour le camp au trait de `etat` (saab, 2026-10-02 : colonnes
// Gain, Perte, Centre... du tableau Recherche par 1er coup, interface/
// recherche-ia.js). etatsDeLaSequence vient de moteur/sequence-prevue.js.
function ecartsDeLaSequence(etat, sequence, poids, version) {
  const fin = etatsDeLaSequence(etat, sequence).at(-1);
  const camp = etat.joueurAuTrait;
  return ecartsDesTermes(detailDeLEvaluation(etat, camp, poids, version), detailDeLEvaluation(fin, camp, poids, version));
}
