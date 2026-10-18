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
// La recolte (saab, 2026-10-08) : le solveur de KAAWA prouve 4 tours en quelques
// secondes, 5 en une minute environ ; 6 et plus depassent 2 minutes (mesure sur des
// fins de parties du banc). D'ou les tours maxi proposes, et la limite.
const TOURS_MAXI_RECOLTE_PROPOSES = 4;
const TOURS_MAXI_RECOLTE_LIMITE = 5;

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
// plus ancienne position d'ou il force la victoire sans interruption, dans les
// tours qui lui restaient dans la partie (`toursMaxi` au plus) —
// `victoireForcee(etat, tours)` : promesse de vrai si le solveur la prouve. Puis,
// pour celle-la, le moins de tours qui suffit (le gagnant a pu en prendre plus).
// Renvoie { etat, tours }, ou null (aucune, ou moins de `toursMini`).
async function recolteDeLaPartie(etats, gagnant, victoireForcee, { toursMini, toursMaxi }) {
  let trouve = null;
  for (let avant = 1; avant < etats.length; avant++) {
    const etat = etats[etats.length - 1 - avant];
    const tours = toursDeLaVictoire(avant, etat.joueurAuTrait === gagnant);
    if (tours < 1) continue; // le perdant au trait, a un demi-coup de la fin
    if (tours > toursMaxi || !(await victoireForcee(etat, tours))) break;
    trouve = { etat, tours };
  }
  if (!trouve) return null;
  while (trouve.tours > 1 && (await victoireForcee(trouve.etat, trouve.tours - 1))) trouve = { ...trouve, tours: trouve.tours - 1 };
  return trouve.tours >= toursMini ? trouve : null;
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

// Les premiers coups gagnants d'un puzzle (saab, 2026-10-10 : le « nb de sol » du nom,
// et les debuts de solution) : `verdictDuCoup(coup)` — promesse de 'valide',
// 'invalide' ou autre chose (le solveur n'a pas fini) pour chaque coup legal du
// gagnant. `sures` : tous les coups ont ete juges.
async function premiersCoupsGagnants(coups, verdictDuCoup) {
  const solutions = [];
  let sures = true;
  for (const coup of coups) {
    const verdict = await verdictDuCoup(coup);
    if (verdict === 'valide') solutions.push(coup);
    else if (verdict !== 'invalide') sures = false;
  }
  return { solutions, sures };
}

// L'entree d'un puzzle recolte, completee comme KAAWA l'ecrit : le nombre de solutions
// apres la lettre du gagnant (xtr5x2, xtr6y1), « move1 sol », et sol_starts. Noir ouvre
// toujours : s'il gagne (x), ses premiers coups gagnants (« 1.d3g6 | 1.e4g6 ») ; si Blanc
// gagne (y), les premiers coups de Noir qui tiennent jusqu'au dernier tour (la meilleure
// defense, comme le solveur de KAAWA les juge), ranges avec la reponse gagnante de Blanc
// (`reponses` : { coup de Noir: [reponses de Blanc] } — « 1.h4g4/a1a2 »). Seulement si
// tout est sur.
const MARQUEUR_SANS_NOMBRE = /(xtr\d+[xy])(?!\d)/;
function entreeAvecSolutions(entree, { solutions, sures, reponses = {} }) {
  if (!sures || solutions.length === 0 || !MARQUEUR_SANS_NOMBRE.test(entree.PZL_name)) return entree;
  const coups = solutions.map((coup) => coup.toLowerCase());
  const debuts = entree.winner === 'Noir' ? coups.map((coup) => `1.${coup}`) : coups.flatMap((coup) => (reponses[coup] ?? []).map((reponse) => `1.${reponse.toLowerCase()}/${coup}`));
  return {
    ...entree,
    PZL_name: entree.PZL_name.replace(MARQUEUR_SANS_NOMBRE, `$1${solutions.length}`),
    'move1 sol ': String(solutions.length),
    sol_starts: debuts.join(' | '),
  };
}

// Une partie enregistree (son arbre, moteur/sauvegarde.js) a recolter : les positions
// de la ligne jouee, dans l'ordre, et son gagnant — seulement gagnee aux billes (une
// partie finie au temps ou par abandon n'a pas de fin forcee a remonter). null sinon.
function partieARecolter(arbre) {
  const etats = [arbre.racine.etat];
  let noeud = arbre.racine;
  for (const index of arbre.cheminOrigine) {
    noeud = noeud.enfants[index];
    etats.push(noeud.etat);
  }
  const fin = noeud.etat.vainqueur;
  return fin === 'noir' || fin === 'blanc' ? { etats, fin } : null;
}

// Un puzzle REVERSIBLE (saab, 2026-10-16 : « un PZL qui peut être perdu par celui qui ne
// fait pas exactement la solution, car l'adversaire aura une solution gagnante à son
// tour ») : apres un des ecarts du gagnant (`etatsApresUnEcart`), le perdant force la
// victoire (`perdantForceLaVictoire(etat)`, une promesse). Le premier ecart perdant suffit.
async function estReversible(etatsApresUnEcart, perdantForceLaVictoire) {
  for (const etat of etatsApresUnEcart) if (await perdantForceLaVictoire(etat)) return true;
  return false;
}

// Son nom le dit : « …xtr3x1_p12_rév ».
const SUFFIXE_REVERSIBLE = '_rév';
const nomReversible = (nom) => (nom.endsWith(SUFFIXE_REVERSIBLE) ? nom : `${nom}${SUFFIXE_REVERSIBLE}`);
