// L'etape 2 du BANC D'ESSAIS (saab, 2026-10-08 : « les puzzles et la recolte de
// puzzles dans les parties, avec reglage du nb de coups mini/maxi pour pzl et
// mini pour recolte ») : quels puzzles jouer, quels puzzles recolter dans une
// partie finie, comment les nommer, et le resume. Pur : KAI++ (la recherche) et
// l'affichage sont dans l'interface (interface/banc-essais-puzzles.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ecrirePosition
// (moteur/notation.js), entreePuzzleMy (moteur/positions-my.js) viennent de
// fichiers charges avant celui-ci.

// Les niveaux de KAAWA (Easy, Medium, Hard) selon les tours : ceux de la premiere
// recolte (saab, 2026-10-07 : 1 ou 2 tours, Easy ; 3, Medium), Hard au-dela.
const TOURS_MAX_EASY = 2;
const TOURS_MEDIUM = 3;
// Une recolte cherche la victoire forcee jusqu'a 6 demi-coups (3 tours) : au-dela,
// la recherche exacte (sans elagage) devient trop longue pour chaque position.
const DEMI_COUPS_MAX_RECOLTE = 6;

function niveauDuPuzzle(tours) {
  if (tours <= TOURS_MAX_EASY) return 'E';
  return tours === TOURS_MEDIUM ? 'M' : 'H';
}

// Les tours d'une victoire en `plis` demi-coups : les coups du gagnant, qui joue
// le premier (`gagnantAuTrait`) ou le second.
function toursDeLaVictoire(plis, gagnantAuTrait) {
  return gagnantAuTrait ? Math.ceil(plis / 2) : Math.floor(plis / 2);
}

// Les demi-coups d'un puzzle : Noir commence toujours ; s'il gagne, son dernier
// coup finit le tour, sinon Blanc joue aussi le sien.
function demiCoupsDuPuzzle(puzzle) {
  return 2 * puzzle.toursMaximum - (puzzle.campGagnant === 'noir' ? 1 : 0);
}

// Les puzzles a jouer : de `toursMin` a `toursMax` tours, bornes comprises.
function puzzlesDuBanc(puzzles, { toursMin, toursMax }) {
  return puzzles.filter((puzzle) => puzzle.toursMaximum >= toursMin && puzzle.toursMaximum <= toursMax);
}

// Le puzzle d'une partie gagnee par `gagnant` : en remontant depuis la fin, la
// plus ancienne position d'ou il force la victoire sans interruption
// (`victoireForcee(etat)` : promesse de { camp, plis } ou null, la recherche
// exacte de KAI++) — { etat, plis, tours }, ou null s'il en a moins de
// `toursMini` (ou aucune).
async function recolteDeLaPartie(etats, gagnant, victoireForcee, toursMini) {
  let trouve = null;
  for (let rang = etats.length - 1; rang >= 0; rang--) {
    const etat = etats[rang];
    if (etat.vainqueur) continue;
    const victoire = await victoireForcee(etat);
    if (!victoire || victoire.camp !== gagnant) break;
    trouve = { etat, plis: victoire.plis, tours: toursDeLaVictoire(victoire.plis, etat.joueurAuTrait === gagnant) };
  }
  return trouve && trouve.tours >= toursMini ? trouve : null;
}

// L'entree KAAWA d'un puzzle recolte (moteur/positions-my.js, entreePuzzleMy :
// camps inverses si Blanc est au trait, x ou y selon qui commence) ; son nom
// finit par le numero de la partie (saab, 2026-10-07 : « pour les retrouver ») :
// PZL_M_2610081900_(-5-2)xtr3x_p12.
function entreeDuPuzzleRecolte({ etat, gagnant, tours, numero, date, createur }) {
  return entreePuzzleMy({
    position: ecrirePosition(etat),
    premierJoueur: etat.joueurAuTrait,
    gagnant,
    typeDePuzzle: 'PZL',
    niveau: niveauDuPuzzle(tours),
    toursMaximum: String(tours),
    solutionsAuPremierCoup: '',
    date,
    nomSaisi: `p${numero}`,
    createur,
    debutsDeSolution: '',
  });
}

// Par essai : { joues, resolus, parTours: { tours: { joues, resolus } }, secondes
// (moyenne) } — `resultats` : [{ essai, tours, resolu, secondes }].
function resumeDesPuzzles(resultats, nombreDEssais) {
  return Array.from({ length: nombreDEssais }, (_, essai) => {
    const siens = resultats.filter((resultat) => resultat.essai === essai);
    const parTours = {};
    for (const { tours, resolu } of siens) {
      parTours[tours] ??= { joues: 0, resolus: 0 };
      parTours[tours].joues++;
      if (resolu) parTours[tours].resolus++;
    }
    return {
      joues: siens.length,
      resolus: siens.filter((resultat) => resultat.resolu).length,
      parTours,
      secondes: siens.length ? siens.reduce((somme, resultat) => somme + resultat.secondes, 0) / siens.length : 0,
    };
  });
}
