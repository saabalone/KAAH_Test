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
// VALEUR_VICTOIRE_IA (ia-evaluation.js), sumitosDuCamp, sumitosParSorte (ia-evaluation-v2.js),
// evaluationDeLaVersion, termesDeLaVersion3, classeDeLaCaseIA,
// valeurTotaleDeLaCase, VERSION_DES_CASES_IA (ia-evaluation-v3.js),
// termeDuPiegeIA (ia-evaluation-v4.js), CLES_TERMES_OPTIONS_IA, termesDesAjouts
// (ia-ajouts.js) viennent de fichiers charges avant celui-ci.

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
  // La 5 : un Sumito par sorte (ia-evaluation-v5.js).
  5: ['gain', 'gainScore', 'perte', 'perteScore', 'centre', 'cases', 'cohesion', 'compacite', 'bordSoi', 'bordAdverse', 'sumito32', 'sumito31', 'sumito21', 'menaceEjection', 'fourchette', 'piege'],
};
const VERSION_DU_PIEGE_IA = 4;
const VERSION_DES_SORTES_DE_SUMITO_IA = 5;

function termesDeLaVersion(version) {
  return TERMES_DES_VERSIONS_IA[version] ?? TERMES_DES_VERSIONS_IA[1];
}

// Les termes de plusieurs profils a la fois (cote a cote, interface/
// panneau-bille.js) : chacun une fois, dans l'ordre des colonnes — le Sumito
// unique juste avant ceux de chaque sorte, puis le sumito vide.
// Les ajouts (moteur/ia-ajouts.js) suivent le terme qu'ils completent.
const AJOUTS_APRES_LE_TERME_IA = { centre: ['etendueCentre'], cases: ['etendueCases'], sumito21: ['sumitoVide'] };
const TERMES_DANS_L_ORDRE_IA = TERMES_DES_VERSIONS_IA[5].flatMap((terme) => [...(terme === 'sumito32' ? ['sumito'] : []), terme, ...(AJOUTS_APRES_LE_TERME_IA[terme] ?? [])]);

// Ceux d'un profil : sa version, plus ses ajouts (le sumito vide, s'il en a le poids).
function termesDuProfil(version, poids) {
  return TERMES_DANS_L_ORDRE_IA.filter((terme) => termesDeLaVersion(version).includes(terme) || (CLES_TERMES_OPTIONS_IA.includes(terme) && terme in poids));
}

// `profils` : [{ version, poids }].
function termesDesProfils(profils) {
  return TERMES_DANS_L_ORDRE_IA.filter((terme) => profils.some(({ version, poids }) => termesDuProfil(version, poids).includes(terme)));
}

// Les termes de l'evaluation de `etat` pour `camp`, un par colonne (les memes
// calculs que evaluerPosition, evaluerPositionV2 et V3, rendus a part).

function detailDeLaVersion(etat, camp, poids, version) {
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
  const sortesA = sumitosParSorte(a);
  const sortesB = sumitosParSorte(b);
  const parSorte = {
    sumito32: poids.sumito32 * (sortesA[32] - sortesB[32]),
    sumito31: poids.sumito31 * (sortesA[31] - sortesB[31]),
    sumito21: poids.sumito21 * (sortesA[21] - sortesB[21]),
  };
  const avecSumitos = {
    ...termes,
    ...(version >= VERSION_DES_SORTES_DE_SUMITO_IA ? parSorte : { sumito: poids.sumito * (a.length - b.length) }),
    menaceEjection: poids.menaceEjection * (ejections(a) - ejections(b)),
    fourchette: poids.fourchette * (enPlus(a) - enPlus(b)),
  };
  if (version < VERSION_DES_CASES_IA) return avecSumitos;
  const avecCases = { ...avecSumitos, ...termesDeLaVersion3(etat, camp, poids) };
  return version < VERSION_DU_PIEGE_IA ? avecCases : { ...avecCases, piege: termeDuPiegeIA(etat, camp, poids) };
}

// Le detail, plus le terme des ajouts que les poids portent.
function detailDeLEvaluation(etat, camp, poids, version) {
  const detail = detailDeLaVersion(etat, camp, poids, version);
  return { ...detail, ...termesDesAjouts(etat, camp, poids) };
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
