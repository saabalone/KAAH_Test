// Les 4 GROUPES de l'evaluation de l'IA (saab, 2026-10-14 : « faire un graphique avec 4
// courbes : 1 Attaque (Gain, Perte, Sumito, Menace, Fourchettes, Piège, ?), 2 Compacité
// (Compacité, ?), 3 Cohésion (Cohésion, Bord, ?), 4 Matériel (Centre, Case e5-a1, ?) ; puis
// pouvoir donner un pourcentage sur chaque groupe, c'est-à-dire qu'on pourra faire varier
// ces groupes » ; 2026-10-15 : « c'est la part de chaque groupe dans l'évaluation au fil
// des tours d'une partie »). Les « ? » : le gain et la perte selon le score et le sumito
// vide vont avec l'Attaque, l'etendue (ec, ea) avec le Materiel. Pur.
//
// Saab, 2026-10-16 : « mettre les paramètres dans l'ordre des groupes (avec nom du groupe
// Attaque/Compacité/...), avec les labels de la couleur de sa courbe » — partout ou l'on
// liste les reglages (Reglages, Comparer, Essai, panneaux, banc) : cet ordre est le seul,
// CLES_REGLAGES_IA (historique-profil-ia.js) et TERMES_DANS_L_ORDRE_IA (essai-ia.js) le
// reprennent. Ce fichier se charge donc avant eux.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_CASES_IA_V3
// (ia-evaluation-v3.js), et, a l'appel seulement, detailDeLEvaluation (essai-ia.js)
// viennent de fichiers charges avant celui-ci ou apres lui.

// `termes` : ceux du detail de l'evaluation (moteur/essai-ia.js), dans l'ordre des
// colonnes ; `reglages` : les poids et ajouts qui le reglent, dans l'ordre des listes ;
// `couleur` : celle de sa courbe (interface/graphique-groupes.js) et de ses libelles.
const GROUPES_DE_L_EVALUATION_IA = [
  {
    cle: 'attaque',
    libelle: 'Attaque',
    couleur: '#e04848',
    termes: ['gain', 'gainScore', 'perte', 'perteScore', 'sumito', 'sumito32', 'sumito31', 'sumito21', 'sumitoVide', 'sumitoContre', 'billesPoussables', 'billesMultipoussables', 'billesPoussablesBord', 'billesEjectables', 'billesMultiejectables', 'menaceEjection', 'fourchette', 'piege'],
    reglages: ['gain', 'gainScore', 'gainFibonacci', 'perte', 'perteScore', 'perteFibonacci', 'sumito', 'sumito32', 'sumito31', 'sumito21', 'sumitoVide', 'sumitoContre', 'billesPoussables', 'billesMultipoussables', 'billesPoussablesBord', 'billesEjectables', 'billesMultiejectables', 'menaceEjection', 'fourchette', 'piege', 'piegeProgressifAdverse', 'piegeProgressifMien', 'piegeGagnantAdverse', 'piegeGagnantMien', 'piegeFinAdverse', 'piegeFinMien'],
  },
  { cle: 'compacite', libelle: 'Compacité', couleur: '#3a7bd5', termes: ['compacite', 'groupesSepares'], reglages: ['compacite', 'groupesSepares'] },
  { cle: 'cohesion', libelle: 'Cohésion', couleur: '#3fbf5a', termes: ['cohesion', 'bordSoi', 'bordAdverse'], reglages: ['cohesion', 'bordSoi', 'bordAdverse'] },
  {
    cle: 'materiel',
    libelle: 'Matériel',
    couleur: '#d9b62b',
    termes: ['centre', 'etendueCentre', 'cases', 'etendueCases'],
    reglages: ['centre', ...CLES_CASES_IA_V3, 'etendueCentre', 'etendueCases', 'etendueReference', 'etendueProfondeur'],
  },
];

// Les ajouts qui reglent la recherche, pas l'evaluation (er, es, ef, fn) : listes a part,
// apres les 4 groupes, sans courbe.
const REGLAGE_DE_RECHERCHE_IA = { cle: 'recherche', libelle: 'Recherche', couleur: '#9a9a9a', reglages: ['elagageReponse', 'elagageSuite', 'elagageFin', 'elagageFinNiveau', 'elagageGarde', 'centreTenu'] };

// Tous les poids et ajouts, groupe apres groupe.
const REGLAGES_DANS_L_ORDRE_DES_GROUPES_IA = [...GROUPES_DE_L_EVALUATION_IA, REGLAGE_DE_RECHERCHE_IA].flatMap((groupe) => groupe.reglages);

// Le groupe d'un reglage (Recherche comprise), ou null (Version, Livre, Elagage, Style).
const groupeDuReglage = (cle) => [...GROUPES_DE_L_EVALUATION_IA, REGLAGE_DE_RECHERCHE_IA].find((groupe) => groupe.reglages.includes(cle)) ?? null;
// Le groupe d'un terme de l'evaluation, ou null.
const groupeDuTerme = (terme) => GROUPES_DE_L_EVALUATION_IA.find((groupe) => groupe.termes.includes(terme)) ?? null;

// La part de chaque groupe dans un detail de l'evaluation : { attaque, compacite,
// cohesion, materiel } (une position finie, sa « victoire », n'en a pas).
function partsDesGroupes(detail) {
  return Object.fromEntries(GROUPES_DE_L_EVALUATION_IA.map((groupe) => [groupe.cle, groupe.termes.reduce((somme, terme) => somme + (detail[terme] ?? 0), 0)]));
}

// Les EJECTIONS d'une ligne (saab, 2026-10-21 : « sur le Graphique il n'y a pas les lignes
// pointillées d'éject ») : le rang de chaque position atteinte par une ejection, et le camp qui y a
// perdu une bille (ou plusieurs : une par rang).
function ejectionsDeLaLigne(etats) {
  return etats.flatMap((etat, rang) => {
    const avant = etats[rang - 1];
    if (!avant) return [];
    return [
      ...(etat.billesEjecteesNoires > avant.billesEjecteesNoires ? [{ rang, camp: 'noir' }] : []),
      ...(etat.billesEjecteesBlanches > avant.billesEjecteesBlanches ? [{ rang, camp: 'blanc' }] : []),
    ];
  });
}

// Les parts a chaque position de `etats`, pour `camp`, avec `poids` et `version`.
const courbesDesGroupes = (etats, camp, poids, version) => etats.map((etat) => partsDesGroupes(detailDeLEvaluation(etat, camp, poids, version)));

// Ce qu'un pourcentage sur un groupe ne multiplie pas : ea (une part de la valeur des
// cases, deja multipliees), da et ep (un rapport et une profondeur, pas des poids).
const REGLAGES_QU_UN_POURCENTAGE_NE_MULTIPLIE_PAS = ['etendueCases', 'etendueReference', 'etendueProfondeur'];

// Les poids d'un groupe multiplies par `facteur` (0,6 : 60 %), les autres intacts.
function multiplierUnGroupe(poids, groupe, facteur) {
  const siens = (GROUPES_DE_L_EVALUATION_IA.find((autre) => autre.cle === groupe)?.reglages ?? []).filter((cle) => !REGLAGES_QU_UN_POURCENTAGE_NE_MULTIPLIE_PAS.includes(cle));
  return Object.fromEntries(Object.entries(poids).map(([cle, valeur]) => [cle, siens.includes(cle) ? valeur * facteur : valeur]));
}

// Les parts en pourcentage du total des 4 (saab, 2026-10-15 : « basculer en pourcentage ») :
// le signe oublie, une part negative pese aussi dans l'evaluation ; aucune part : 0 partout.
function pourcentagesDesGroupes(parts) {
  const total = Object.values(parts).reduce((somme, part) => somme + Math.abs(part), 0);
  return Object.fromEntries(Object.entries(parts).map(([cle, part]) => [cle, total === 0 ? 0 : (100 * Math.abs(part)) / total]));
}

// LES BARRES d'une position (saab, 2026-10-16 : « les 4 barres verticales détaillant le
// total de chaque paramètre constituant le groupe, du plus important au plus petit ») :
// par groupe, { groupe, total, rang, termes : [{ terme, valeur, part }] }, du plus lourd
// (en valeur absolue) au plus leger, sans ceux qui valent 0. part : le pourcentage du
// terme dans le total des termes, signe oublie (« le % de chaque paramètre par rapport au
// total de l'évaluation ») ; rang : celui du groupe par sa part (0 : la plus grande —
// « celle qui a le plus de % est la plus grande, puis tu diminues un peu les autres »).
function barresDesGroupes(detail) {
  const tousLesTermes = GROUPES_DE_L_EVALUATION_IA.flatMap((groupe) => groupe.termes);
  const poidsTotal = tousLesTermes.reduce((somme, terme) => somme + Math.abs(detail[terme] ?? 0), 0) || 1;
  const parts = pourcentagesDesGroupes(partsDesGroupes(detail));
  const ordre = [...GROUPES_DE_L_EVALUATION_IA].sort((a, b) => parts[b.cle] - parts[a.cle]);
  return GROUPES_DE_L_EVALUATION_IA.map((groupe) => {
    const termes = groupe.termes
      .filter((terme) => (detail[terme] ?? 0) !== 0)
      .map((terme) => ({ terme, valeur: detail[terme], part: (100 * Math.abs(detail[terme])) / poidsTotal }))
      .sort((a, b) => Math.abs(b.valeur) - Math.abs(a.valeur));
    return { groupe, total: termes.reduce((somme, { valeur }) => somme + valeur, 0), rang: ordre.indexOf(groupe), termes };
  });
}

// La FENETRE du graphique (saab, 2026-10-16 : « un genre de zoom sur 10 coups avant et
// après le coup quand on navigue, on pourra régler ce nb ») : les rangs { debut, fin }
// montres pour le curseur `rang` sur `nombre` positions, `ecart` de part et d'autre —
// toujours aussi large pres des bouts ; 0 : toute la partie.
function fenetreDuGraphique(rang, nombre, ecart) {
  const dernier = nombre - 1;
  if (ecart === 0 || 2 * ecart >= dernier) return { debut: 0, fin: dernier };
  const debut = Math.min(Math.max(0, rang - ecart), dernier - 2 * ecart);
  return { debut, fin: debut + 2 * ecart };
}

// La ligne que suivent les courbes (saab : « afficher sur n'importe quelle partie en
// cours ») : la leur tant que la position regardee (`regarde`, son chemin) en fait partie
// — on y navigue —, sinon celle qu'on regarde (un coup de plus, une autre branche).
function ligneSuivieParLeGraphique(ligne, regarde) {
  const surLaLigne = regarde.length <= ligne.length && regarde.every((index, rang) => index === ligne[rang]);
  return surLaLigne ? ligne : regarde;
}
