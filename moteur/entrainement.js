// Le mode ENTRAINEMENT (phase 36 ; saab, 2026-10-08) : des ceintures de judo,
// pour les Variantes (la ceinture = le niveau de la machine adverse) et pour les
// PZL (la ceinture = les tours et le type du puzzle), et la regle pour monter.
// Pur : interface/entrainement.js propose les jeux, lance les parties et range
// les parcours (un par joueur, par son nom) ; la regle des series est dans
// moteur/entrainement-serie.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// Les ceintures, puis les Dans (saab, 2026-10-09 : « ceinture noire : du 1er au 5e
// Dan ; ceinture blanche et rouge : du 6e au 8e Dan ; ceinture rouge : 9e et 10e
// Dan ») — 16 grades. `motif` : comment dessiner la ceinture (styles.css) ;
// `dan` : son numero de Dan.
const NOMS_DES_DANS = ['1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e'];
const MOTIFS_DES_DANS = [
  { motif: 'noire', nom: 'Noire', couleur: '#151515', dans: 5 },
  { motif: 'blanche-rouge', nom: 'Blanche et rouge', couleur: '#d22f2f', dans: 3 },
  { motif: 'rouge', nom: 'Rouge', couleur: '#d22f2f', dans: 2 },
];
const CEINTURES = Object.freeze([
  { nom: 'Blanche', couleur: '#f2f2f2' },
  { nom: 'Jaune', couleur: '#f2d23c' },
  { nom: 'Orange', couleur: '#f08c2a' },
  { nom: 'Verte', couleur: '#3fa34d' },
  { nom: 'Bleue', couleur: '#3a7bd5' },
  { nom: 'Marron', couleur: '#8b5a2b' },
  ...MOTIFS_DES_DANS.flatMap(({ motif, nom, couleur, dans }, rang) => {
    const avant = MOTIFS_DES_DANS.slice(0, rang).reduce((somme, autre) => somme + autre.dans, 0);
    return Array.from({ length: dans }, (_, i) => ({ nom: `${nom}, ${NOMS_DES_DANS[avant + i]} Dan`, couleur, motif, dan: avant + i + 1 }));
  }),
]);
const CEINTURE_LA_PLUS_HAUTE = CEINTURES.length - 1;
const PREMIER_DAN = CEINTURES.findIndex((ceinture) => ceinture.dan === 1);

// PZL : les tours, et un « Mini » (moins de billes) avant le puzzle entier, a
// tours egaux ; puis 5, 6, 7 tours et plus : du 1er au 3e Dan.
const PREFIXE_MINI_PUZZLE = /^mini/i;
const TOURS_PAR_PALIER = [2, 3, 4];
const TOURS_DU_PREMIER_DAN = 5;
const DERNIER_DAN_PAR_LES_TOURS = PREMIER_DAN + 2; // le 3e Dan : 7 tours et plus
function ceintureDuPuzzle(puzzle) {
  const palier = TOURS_PAR_PALIER.findIndex((tours) => puzzle.toursMaximum <= tours);
  if (palier === -1) return Math.min(DERNIER_DAN_PAR_LES_TOURS, PREMIER_DAN + puzzle.toursMaximum - TOURS_DU_PREMIER_DAN);
  return 2 * palier + (PREFIXE_MINI_PUZZLE.test(puzzle.nom) ? 0 : 1);
}

// Les types d'un jeu, pour en imposer n dans une serie (saab, 2026-10-10 : « séparer PZL
// et Mini-PZL ; imposer n dans les types de variantes et PZL/Mini ») : ceux de la
// variante (les huit « Type » de KAAWA, moteur/classement.js), ou la CATEGORIE du PZL
// (2026-10-11 : « séparer les types de PZL par leur nb de coups, que je puisse imposer
// n dans tr2 et m dans tr3 ») — une par ceinture jusqu'au 3e Dan, dans l'ordre de
// ceintureDuPuzzle : Mini puis PZL a 2, 3, 4 tours, puis 5, 6, 7 tours et plus.
const TYPES_DE_PUZZLE = [
  ...TOURS_PAR_PALIER.flatMap((tours) => [
    { cle: `mini${tours}`, libelle: `Mini-PZL ${tours} tours` },
    { cle: `pzl${tours}`, libelle: `PZL ${tours} tours` },
  ]),
  ...Array.from({ length: DERNIER_DAN_PAR_LES_TOURS - PREMIER_DAN + 1 }, (_, dan) => {
    const tours = TOURS_DU_PREMIER_DAN + dan;
    return { cle: `pzl${tours}`, libelle: `PZL ${tours} tours${PREMIER_DAN + dan === DERNIER_DAN_PAR_LES_TOURS ? ' et plus' : ''}` };
  }),
];
// (Un PZL qui n'existe plus, sans ses tours : aucun type.)
function typesDuJeu(sorte, jeu) {
  if (sorte !== 'pzl') return jeu.types ?? [];
  const categorie = TYPES_DE_PUZZLE[ceintureDuPuzzle(jeu)];
  return categorie ? [categorie.cle] : [];
}

// Les PZL d'un grade : ceux de ses tours ; au-dela du 3e Dan, les plus difficiles
// (4 tours entiers et plus), que le temps limite et Annuler rendent plus durs
// (moteur/entrainement-reglages.js).
const CEINTURE_DES_PUZZLES_DIFFICILES = 5; // marron : 4 tours, pas Mini
function puzzlesDuGrade(puzzles, grade) {
  if (grade <= DERNIER_DAN_PAR_LES_TOURS) return puzzles.filter((puzzle) => ceintureDuPuzzle(puzzle) === grade);
  return puzzles.filter((puzzle) => ceintureDuPuzzle(puzzle) >= CEINTURE_DES_PUZZLES_DIFFICILES);
}

// Le nombre de solutions au premier coup d'un puzzle (saab, 2026-10-11 : « dans toutes
// les ceintures ne mettre que ceux à sol unique ») : celui de son nom (xtr5x2, xtr6y1),
// sinon son champ « move1 sol » de KAAWA, sinon le compte du solveur (`comptes` :
// { nom: n }, donnees/kaa-puzzles-solutions.js) ; null : inconnu.
const NOMBRE_DE_SOLUTIONS_DU_NOM = /xtr\d+[xy](\d+)/;
function solutionsDuPuzzle(puzzle, comptes = {}) {
  const duNom = NOMBRE_DE_SOLUTIONS_DU_NOM.exec(puzzle.nom)?.[1];
  if (duNom !== undefined) return Number(duNom);
  const duChamp = String(puzzle.entree?.['move1 sol '] ?? '').trim();
  if (/^\d+$/.test(duChamp)) return Number(duChamp);
  return comptes[puzzle.nom] ?? null;
}

// Les PZL DOUTEUX de KAAWA (saab, 2026-10-10 : « décoche les PZL douteux de l'appli (je
// regarderai le pb) ») : ceux ou le solveur ne trouve pas ce que dit leur nom (essais du
// 2026-10-08, essais/pzl-douteux-kaawa.html). Ils restent jouables par le menu Puzzles,
// mais aucun grade ne les propose de lui-meme. Saab les a tous corriges dans le fichier
// de KAAWA (le 2026-10-13, puis Pzl_M_0012 le 15 ; recopie ici, verifies au solveur) : la
// liste est vide, prete pour le prochain.
const PUZZLES_DOUTEUX = [];
const estPuzzleDouteux = (puzzle) => PUZZLES_DOUTEUX.includes(puzzle.nom);

// Les PZL qu'on peut proposer sans les avoir choisis un a un : pas les douteux, et, avec
// `uniqueSeulement`, ceux a une seule solution au premier coup.
function puzzlesProposables(puzzles, uniqueSeulement, comptes = {}) {
  return puzzles.filter((puzzle) => !estPuzzleDouteux(puzzle) && (!uniqueSeulement || solutionsDuPuzzle(puzzle, comptes) === 1));
}

// Les PZL qu'un grade propose de lui-meme : les proposables de ses tours (puzzlesDuGrade).
function puzzlesProposablesDuGrade(puzzles, grade, uniqueSeulement, comptes = {}) {
  return puzzlesProposables(puzzlesDuGrade(puzzles, grade), uniqueSeulement, comptes);
}

// Le PREREGLAGE des PZL de `grade`, par categorie (saab, 2026-10-11 : « tout cocher par
// catégorie, avec 1/1 imposé pour Blanc, puis 1/1 + 2/2 de blanc pour jaune, etc. : on
// ajoute les pzl de catégorie inférieure avec 1 de plus imposé et on met 1/1 pour sa
// catégorie ; si pas de pzl dans sa catégorie on augmente tout sur les catégories
// inférieures ») : tous les `puzzles` (les proposables) des categories jusqu'a celle du
// grade ; 1 impose dans la sienne, 1 de plus a chaque categorie en dessous — jamais plus
// qu'elle n'a de PZL. Renvoie la liste { candidats, imposes, quotas }.
function prereglageDesPuzzles(puzzles, grade) {
  const quotas = {};
  TYPES_DE_PUZZLE.slice(0, grade + 1).forEach((type, categorie) => {
    const existants = puzzles.filter((puzzle) => ceintureDuPuzzle(puzzle) === categorie).length;
    if (existants > 0) quotas[type.cle] = Math.min(existants, grade - categorie + 1);
  });
  return { candidats: puzzles.filter((puzzle) => ceintureDuPuzzle(puzzle) <= grade).map((puzzle) => puzzle.nom), imposes: [], quotas };
}

// Jusqu'ou la machine doit chercher dans un PZL de `toursMaximum` tours, le gagnant en
// ayant deja joue `coupsDuGagnantJoues` : jusqu'au dernier coup de l'attaquant, pas plus
// (saab, 2026-10-10 : « il suffit qu'il joue pour ne pas perdre en n coups restants de
// l'attaquant »). Elle attaque (`machineGagnante`) : son coup compris.
function plisUtilesDuPuzzle(toursMaximum, coupsDuGagnantJoues, machineGagnante) {
  const coupsRestants = toursMaximum - coupsDuGagnantJoues;
  return Math.max(1, 2 * coupsRestants - (machineGagnante ? 1 : 0));
}

// Le camp du joueur : Noir a l'aller, Blanc a la revanche — en partie comme en PZL (saab,
// 2026-10-17 : « en PZL le 1er jeu se fait toujours en Noir, et donc la revanche en
// Blanc » ; avant, l'aller d'un PZL etait l'attaque, mais la machine jouait alors le 1er
// bon coup de la defense : une indication). Noir joue toujours le premier : a l'aller, le
// joueur cherche lui-meme le 1er bon coup.
const campDuSens = (sens) => (sens === 'aller' ? 'noir' : 'blanc');
// En PZL, on attaque si son camp est celui qui doit gagner, sinon on defend.
const attaqueDansLePuzzle = (sens, campGagnant) => campDuSens(sens) === campGagnant;

// L'issue d'un PZL d'entrainement (`etat` : moteur/puzzles.js, etatDuPuzzle) :
// vrai, faux, ou null tant qu'il n'est pas fini. En attaque (`attaque`) : resolu,
// c'est reussi (meme plus tot que prevu). En defense, contre l'attaque de la machine :
// reussi si elle n'a gagne qu'au dernier tour (on a trouve la meilleure defense), ou pas
// du tout ; sans `dernierTour` (decochee), seulement si elle n'a pas gagne.
function issueDuPuzzle(attaque, etat, dernierTour = true) {
  if (etat.resultat !== 'resolu' && etat.resultat !== 'perdu') return null;
  if (attaque) return etat.resultat === 'resolu';
  return etat.resultat === 'perdu' || (dernierTour && !etat.tropTot);
}

// L'issue d'une partie pour `camp` (`vainqueur` : 'noir', 'blanc', 'nulle', ou
// null tant qu'elle n'est pas finie) : une nulle ne fait pas monter (saab : une defaite).
function issueDeLaPartie(camp, vainqueur) {
  if (!vainqueur) return null;
  return vainqueur === camp;
}
