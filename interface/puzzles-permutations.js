// La permutation aleatoire des puzzles (phase 16bis) : a l'ouverture d'un
// puzzle, une orientation au hasard parmi les 12 (moteur.tirerPermutationNonResolue),
// jamais deux fois la meme avant d'avoir vu les 12 — comme KAAWA
// (kaa_engine_ClO_Co.py, _pzl_pick_unsolved_permutation). KAAWA ecrit les
// orientations deja resolues DANS LE FICHIER du puzzle ; KAAH n'a aucun acces
// au disque depuis le navigateur (voir CLAUDE.md) : elles vivent dans
// localStorage, une entree par puzzle, meme principe que les favoris (phase
// 13) et les positions My (phase 23bis) — jamais dans donnees/kaa-puzzles.js
// (fichier statique, jamais modifie).
//
// L'interrupteur (demande de saab, 2026-09-24) vit dans la boite Puzzles,
// jamais dans Réglages : c'est un choix de puzzle, pas un reglage
// d'apparence. Desactive, la permutation 0 (la position telle qu'ecrite dans
// le fichier) est toujours celle proposee — comme `pzl.random_permut_enabled`
// a faux dans KAAWA.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : tirerPermutationNonResolue
// (moteur/puzzles.js), toutesLesPermutations (moteur/permutations.js) viennent
// de fichiers charges avant celui-ci.

const CLE_PERMUTATION_ALEATOIRE_ACTIVE = 'kaah-puzzles-permutation-aleatoire';
const CLE_PERMUTATIONS_RESOLUES = 'kaah-puzzles-permutations-resolues';
// La permutation 0 est toujours celle ecrite dans donnees/kaa-puzzles.js —
// jamais tiree au hasard quand l'interrupteur est desactive.
const PERMUTATION_PAR_DEFAUT = 0;

// Vrai par defaut (comme pzl.random_permut_enabled dans KAAWA) : seule une
// valeur EXPLICITEMENT "false" desactive le tirage.
function permutationAleatoireActive() {
  try {
    return window.localStorage.getItem(CLE_PERMUTATION_ALEATOIRE_ACTIVE) !== 'false';
  } catch {
    return true;
  }
}

function definirPermutationAleatoireActive(active) {
  try {
    window.localStorage.setItem(CLE_PERMUTATION_ALEATOIRE_ACTIVE, String(active));
  } catch {
    // Tant pis : l'interrupteur restera coche a la prochaine ouverture.
  }
}

function listerPermutationsResoluesDeTousLesPuzzles() {
  try {
    const texte = window.localStorage.getItem(CLE_PERMUTATIONS_RESOLUES);
    return texte ? JSON.parse(texte) : {};
  } catch {
    return {};
  }
}

// Les orientations deja resolues d'UN puzzle (tableau d'index 0-11, vide si
// aucune encore).
function listerPermutationsResolues(nomDuPuzzle) {
  return listerPermutationsResoluesDeTousLesPuzzles()[nomDuPuzzle] ?? [];
}

// Ajoute `index` aux orientations resolues de ce puzzle (jamais deux fois la
// meme, un Set le garantit). Ecart assume avec KAAWA, qui remet le compteur a
// zero des que les 12 sont atteintes (process_final_save) : KAAH garde
// simplement les 12, moteur.tirerPermutationNonResolue les traite deja comme
// "aucune" une fois toutes resolues (voir ce fichier) — inutile de les
// effacer pour que le tirage recommence a les proposer.
function marquerPermutationResolue(nomDuPuzzle, index) {
  try {
    const tout = listerPermutationsResoluesDeTousLesPuzzles();
    const resolues = new Set(tout[nomDuPuzzle] ?? []);
    resolues.add(index);
    tout[nomDuPuzzle] = [...resolues].sort((a, b) => a - b);
    window.localStorage.setItem(CLE_PERMUTATIONS_RESOLUES, JSON.stringify(tout));
  } catch {
    // Tant pis : cette orientation pourra revenir plus tot que prevu.
  }
}

// Quelle orientation regarder pour CE puzzle — calculee une seule fois par
// nom de puzzle (memorisee dans `choix`), pour que l'apercu (premier clic de
// interface/puzzles.js) et le chargement reel (second clic) montrent
// EXACTEMENT la meme chose, comme KAAWA (_pzl_preview_permutation : "pour que
// preview et plateau reel matchent"). `reinitialiserChoixPermutations`
// efface cette memoire : a appeler a chaque ouverture de la boite Puzzles,
// pour qu'une nouvelle visite propose un nouveau tirage.
let choix = new Map();

function reinitialiserChoixPermutations() {
  choix = new Map();
}

// `puzzle` : une entree de moteur.lirePuzzles (nom, texteBrut). Renvoie
// { texteBrut, indexPermutation } — `texteBrut` est la position a afficher/
// charger, `indexPermutation` celle qui a ete choisie (0 si l'interrupteur
// est desactive, ou si ce n'est pas un puzzle a orientations, voir
// moteur/permutations.js, toutesLesPermutations).
function choisirPermutationPourPuzzle(puzzle) {
  if (choix.has(puzzle.nom)) return choix.get(puzzle.nom);

  let resultat = { texteBrut: puzzle.texteBrut, indexPermutation: PERMUTATION_PAR_DEFAUT };
  if (permutationAleatoireActive()) {
    const index = tirerPermutationNonResolue(listerPermutationsResolues(puzzle.nom));
    const permutations = toutesLesPermutations(puzzle.texteBrut);
    resultat = { texteBrut: permutations[index].normale, indexPermutation: index };
  }
  choix.set(puzzle.nom, resultat);
  return resultat;
}

// L'orientation REELLEMENT chargee sur le plateau, retrouvee par comparaison
// (jamais stockee a part) : le texte compresse actuel du plateau est
// forcement l'une des 12 permutations de la position d'origine du puzzle
// (`puzzle.texteBrut`, toujours l'orientation 0) — laquelle, exactement, dit
// dans quel sens depermuter les coups joues avant de les comparer a
// `sol_starts` (stocke, lui, dans l'orientation 0 — voir moteur/puzzles.js,
// etatDuPuzzle, et kaa_engine_ClO_Co.py, _get_pzl_sol_starts).
function indexPermutationChargee(puzzle, texteChargeActuellement) {
  const permutations = toutesLesPermutations(puzzle.texteBrut);
  const trouvee = permutations.find((permutation) => permutation.normale === texteChargeActuellement);
  return trouvee?.index ?? PERMUTATION_PAR_DEFAUT;
}
