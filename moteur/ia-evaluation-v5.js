// L'evaluation de l'IA VERSION 5 (saab, 2026-10-07 : « pour v5 ajouter sumito
// 3/2, 3/1, 2/1 ») : la version 4, le poids Sumito separe en trois, un par
// sorte de poussee (moteur/ia-evaluation-v2.js, valeurDesSumitos). Par defaut,
// chacun vaut le Sumito de la version 4 : au depart elle joue exactement comme
// elle, et les reglages diront ce que chaque sorte vaut.
//
// Jouee par KAI++ (solveur/kai-plus.cpp) ; cette copie sert a l'affichage et
// tests/kai-plus.test.js l'exige egale.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : evaluerPosition
// (ia-evaluation.js), evaluerPositionV2 (ia-evaluation-v2.js),
// evaluerPositionV3 (ia-evaluation-v3.js), evaluerPositionV4, STYLES_IA_V4
// (ia-evaluation-v4.js), valeurAvecLesAjouts (ia-ajouts.js) viennent de fichiers charges avant celui-ci.

const CLES_POIDS_IA_V5 = ['sumito32', 'sumito31', 'sumito21'];

function poidsDeLaVersion5(poidsV4) {
  const { sumito, ...autres } = poidsV4;
  return { ...autres, ...Object.fromEntries(CLES_POIDS_IA_V5.map((cle) => [cle, sumito])) };
}

const STYLES_IA_V5 = {
  agressif: poidsDeLaVersion5(STYLES_IA_V4.agressif),
  normal: poidsDeLaVersion5(STYLES_IA_V4.normal),
  defensif: poidsDeLaVersion5(STYLES_IA_V4.defensif),
};

// L'evaluation de chaque version de l'IA (la recherche, moteur/ia-recherche.js,
// et l'essai d'un profil, moteur/essai-ia.js). La 5 a le meme calcul que la 4 :
// seuls ses poids changent.
const EVALUATIONS_DES_VERSIONS_IA = { 1: evaluerPosition, 2: evaluerPositionV2, 3: evaluerPositionV3, 4: evaluerPositionV4, 5: evaluerPositionV4 };

// Celle d'une version, plus les ajouts que les poids portent (moteur/
// ia-ajouts.js, valeurAvecLesAjouts) — le meme ordre que solveur/kai-plus.cpp.
const EVALUATIONS_AVEC_AJOUTS_IA = Object.fromEntries(
  Object.entries(EVALUATIONS_DES_VERSIONS_IA).map(([version, evaluer]) => [version, (etat, camp, poids) => valeurAvecLesAjouts(evaluer(etat, camp, poids), etat, camp, poids)])
);

function evaluationDeLaVersion(version) {
  return EVALUATIONS_AVEC_AJOUTS_IA[version] ?? EVALUATIONS_AVEC_AJOUTS_IA[1];
}
