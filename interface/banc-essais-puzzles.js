// L'etape 2 du banc d'essais (saab, 2026-10-08) avec KAI++ : JOUER un puzzle (le
// profil essaye attaque, la reference defend) et RECOLTER le puzzle d'une partie
// gagnee. Les regles (quels puzzles, la recolte, les noms) : moteur/banc-puzzles.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ecrirePosition
// (moteur/notation.js), appliquerCoup (moteur/partie.js), couleurAdverse
// (moteur/regles.js), lireReponseSolveur (moteur/solveur.js), etatDuPuzzle, lirePuzzles (moteur/puzzles.js), KAA_PZL_KAA
// (donnees/kaa-puzzles.js), listerEntreesMy (interface/positions-my.js), poidsEnTexte,
// lireReponseKaiPlus, coupsDesPositions, textesDeLaSequence (moteur/ia.js),
// VALEUR_VICTOIRE_IA (moteur/ia-recherche.js), demiCoupsDuPuzzle,
// recolteDeLaPartie, DEMI_COUPS_MAX_RECOLTE (moteur/banc-puzzles.js),
// MILLISECONDES_PAR_SECONDE_BANC (interface/banc-essais-partie.js) viennent de
// fichiers charges avant celui-ci.

// La defense voit jusqu'a 6 demi-coups, sans elagage (la meilleure qu'elle
// trouve), comme dans les essais du 07/10 sur les puzzles.
const DEMI_COUPS_MAX_DEFENSE_PUZZLE = 6;
const GRAINE_DES_PUZZLES = 1; // le meme coup a chaque essai, a egalite
const RECHERCHE_SANS_LIMITE_MS = 1e9; // la recolte doit etre exacte

// Les puzzles qu'on peut jouer : ceux de KAAWA (donnees/kaa-puzzles.js, tels
// quels) et/ou les miens (My, interface/positions-my.js) — relus a chaque fois :
// une recolte ajoutee a My y est aussitot.
function lirePuzzlesDuBanc({ kaawa, my }) {
  const lus = [];
  try {
    if (kaawa) lus.push(...lirePuzzles(KAA_PZL_KAA));
    if (my) lus.push(...lirePuzzles({ content: listerEntreesMy('puzzles') }, true));
  } catch (erreur) {
    console.error('Puzzles illisibles :', erreur);
  }
  return lus;
}

const enAttente = (controle) => (controle.pause ? new Promise((resoudre) => (controle.reprendre = resoudre)) : null);

// Un puzzle : `essai` attaque (son niveau, sa reflexion, son elagage), `defense`
// (la reference) defend — jusqu'a la fin du puzzle et sans limite de temps si
// `defenseComplete` (saab, 2026-10-08 : exacte partout, au prix du temps).
// `tache` : { essai, puzzle }. Renvoie { ...tache, tours, resolu, coups,
// secondes (celles de l'essai) }, ou null si on l'a arrete.
async function jouerUnPuzzleDuBanc(tache, essai, defense, kai, controle, suivi = () => {}, defenseComplete = false) {
  const { puzzle } = tache;
  const demiCoups = demiCoupsDuPuzzle(puzzle);
  let etat = puzzle.position;
  const historique = [ecrirePosition(etat)];
  const coups = [];
  let secondes = 0;
  const fin = (resolu) => ({ ...tache, tours: puzzle.toursMaximum, resolu, coups, secondes });
  while (coups.length < demiCoups) {
    if (controle.arret) return null;
    await enAttente(controle);
    const defend = etat.joueurAuTrait !== puzzle.campGagnant;
    const reglage = defend ? defense : essai;
    const debut = performance.now();
    suivi({ coup: coups.length + 1, camp: defend ? 'défense' : 'essai', debut, profondeur: null, evaluation: null });
    const texte = await kai.chercher(
      {
        position: ecrirePosition(etat),
        joueurNoir: etat.joueurAuTrait === 'noir',
        profondeur: defend ? Math.min(defenseComplete ? Infinity : DEMI_COUPS_MAX_DEFENSE_PUZZLE, Math.max(1, demiCoups - coups.length)) : essai.niveau,
        poids: poidsEnTexte(reglage.poids),
        version: reglage.version,
        graine: GRAINE_DES_PUZZLES,
        dureeMs: defend && defenseComplete ? RECHERCHE_SANS_LIMITE_MS : reglage.temps * MILLISECONDES_PAR_SECONDE_BANC,
        historique: historique.join('\n'),
        elagage: defend ? 0 : essai.elagage,
      },
      (progres) => {
        const reponse = lireReponseKaiPlus(progres);
        if (reponse) suivi({ profondeur: reponse.profondeur, evaluation: reponse.evaluation });
      }
    );
    if (!defend) secondes += (performance.now() - debut) / MILLISECONDES_PAR_SECONDE_BANC;
    const reponse = lireReponseKaiPlus(texte);
    if (!reponse) return controle.arret ? null : fin(false); // interrompu, ou KAI++ en erreur
    const coup = coupsDesPositions(etat, reponse.positions)[0];
    if (!coup) return fin(false); // plus aucun coup
    coups.push(textesDeLaSequence(etat, [coup])[0]);
    etat = appliquerCoup(etat, coup).etat;
    historique.push(ecrirePosition(etat));
    const ejectionsDuGagnant = puzzle.campGagnant === 'noir' ? etat.billesEjecteesBlanches : etat.billesEjecteesNoires;
    const suite = etatDuPuzzle(puzzle, { coupsJoues: coups, ejectionsDuGagnant, vainqueur: etat.vainqueur });
    if (suite.resultat !== 'en cours') return fin(suite.resultat === 'resolu');
  }
  return fin(false);
}

// Le puzzle d'une partie gagnee (moteur/banc-puzzles.js, recolteDeLaPartie) :
// chaque position est cherchee exactement par KAI++ (sans elagage, 6 demi-coups),
// avec les poids de la reference. Renvoie { etat, plis, tours } ou null.
function recolterLaPartie(partie, reference, kai, toursMini, suivi = () => {}) {
  if (partie.fin !== 'noir' && partie.fin !== 'blanc') return Promise.resolve(null);
  suivi({ etape: 'récolte du puzzle…' });
  const victoireForcee = async (etat) => {
    const reponse = lireReponseKaiPlus(
      await kai.chercher(
        {
          position: ecrirePosition(etat),
          joueurNoir: etat.joueurAuTrait === 'noir',
          profondeur: DEMI_COUPS_MAX_RECOLTE,
          poids: poidsEnTexte(reference.poids),
          version: reference.version,
          graine: GRAINE_DES_PUZZLES,
          dureeMs: RECHERCHE_SANS_LIMITE_MS,
          historique: '',
          elagage: 0,
        },
        () => {}
      )
    );
    if (!reponse || Math.abs(reponse.evaluation) < VALEUR_VICTOIRE_IA / 2) return null;
    // L'evaluation est celle du camp au trait.
    return { camp: reponse.evaluation > 0 ? etat.joueurAuTrait : couleurAdverse(etat.joueurAuTrait), plis: VALEUR_VICTOIRE_IA - Math.abs(reponse.evaluation) };
  };
  return recolteDeLaPartie(partie.etats, partie.fin, victoireForcee, toursMini);
}

// La verification d'un puzzle gagne par le solveur (interface/solveur.js, comme
// la boite Puzzles) : 'valide' (« Bravo »), 'invalide' (gagne, mais un coup de
// l'attaquant laissait echapper la victoire forcee), 'indetermine' (trop long)
// ou 'erreur' (moteur/solveur.js, lireReponseSolveur).
async function verifierParLeSolveur(solveur, resultat) {
  const { puzzle } = resultat;
  const { reponse } = await solveur.verifier({ position: ecrirePosition(puzzle.position), noirGagne: puzzle.campGagnant === 'noir', toursMaximum: puzzle.toursMaximum, coups: resultat.coups });
  return lireReponseSolveur(reponse).verdict;
}
