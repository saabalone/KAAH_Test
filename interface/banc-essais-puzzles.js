// L'etape 2 du banc d'essais (saab, 2026-10-08) : JOUER un puzzle avec KAI++ (le
// profil essaye attaque, la reference defend) et RECOLTER le puzzle d'une partie
// gagnee avec le solveur. Les regles (quels puzzles, la recolte, les noms) : moteur/banc-puzzles.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ecrirePosition
// (moteur/notation.js), appliquerCoup (moteur/partie.js), lireReponseSolveur (moteur/solveur.js), etatDuPuzzle, lirePuzzles (moteur/puzzles.js), KAA_PZL_KAA
// (donnees/kaa-puzzles.js), listerEntreesMy (interface/positions-my.js), poidsEnTexte,
// lireReponseKaiPlus, coupsDesPositions, textesDeLaSequence (moteur/ia.js),
// demiCoupsDuPuzzle, recolteDeLaPartie, premiersCoupsGagnants, entreeAvecSolutions,
// entreeDuPuzzleRecolte, estReversible, nomReversible (moteur/banc-puzzles.js), lirePosition, couleursDuPlateau,
// ecrireCoupNacreSansAmbiguite (moteur/notation.js), tousLesCoupsLegaux (moteur/regles.js),
// MILLISECONDES_PAR_SECONDE_BANC (interface/banc-essais-partie.js) viennent de
// fichiers charges avant celui-ci ; telechargerTexte (interface/fichiers.js), fichierPositionsMy
// (moteur/positions-my.js), importerEntreesMy (interface/positions-my.js) servent une fois
// la page chargee.

// La defense voit jusqu'a 6 demi-coups, sans elagage (la meilleure qu'elle
// trouve), comme dans les essais du 07/10 sur les puzzles.
const DEMI_COUPS_MAX_DEFENSE_PUZZLE = 6;
const GRAINE_DES_PUZZLES = 1; // le meme coup a chaque essai, a egalite
const RECHERCHE_SANS_LIMITE_MS = 1e9; // la defense complete doit etre exacte

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
        dureeMs: defend && defenseComplete ? RECHERCHE_SANS_LIMITE_MS : dureeDeReflexionDuBancMs(reglage.temps),
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

// La verification d'un puzzle gagne par le solveur (interface/solveur.js, comme
// la boite Puzzles) : 'valide' (« Bravo »), 'invalide' (gagne, mais un coup de
// l'attaquant laissait echapper la victoire forcee), 'indetermine' (trop long)
// ou 'erreur' (moteur/solveur.js, lireReponseSolveur).
async function verifierParLeSolveur(solveur, resultat) {
  const { puzzle } = resultat;
  const { reponse } = await solveur.verifier({ position: ecrirePosition(puzzle.position), noirGagne: puzzle.campGagnant === 'noir', toursMaximum: puzzle.toursMaximum, coups: resultat.coups });
  return lireReponseSolveur(reponse).verdict;
}

// Le puzzle d'une partie gagnee (saab, 2026-10-08 : « chercher les pzl sur les
// fins de parties en remontant ») : chaque position, en remontant, est prouvee par
// le solveur de KAAWA (moteur/banc-puzzles.js, recolteDeLaPartie) — exactement
// ses regles, une position repetee comptant comme une echappee de la defense.
// `fabriquer(etat, tours)` : l'entree KAAWA (moteur/banc-puzzles.js,
// entreeDuPuzzleRecolte). Renvoie { entree, tours } ou null.
async function puzzleDeLaPartie(partie, solveur, { toursMini, toursMaxi, reversibles = false }, suivi, fabriquer) {
  if (partie.fin !== 'noir' && partie.fin !== 'blanc') return null;
  suivi({ etape: 'récolte du puzzle (solveur)…' });
  const victoireForcee = async (etat, tours) => {
    const entree = fabriquer(etat, tours); // camps inverses si Blanc est au trait : Noir commence
    const { reponse } = await solveur.verifier({ position: entree.pos, noirGagne: entree.winner === 'Noir', toursMaximum: tours, coups: [] });
    return lireReponseSolveur(reponse).verdict === 'valide';
  };
  const trouve = await recolteDeLaPartie(partie.etats, partie.fin, victoireForcee, { toursMini, toursMaxi });
  if (!trouve) return null;
  const entree = fabriquer(trouve.etat, trouve.tours);
  return { entree: await entreeCompletee(entree, trouve.tours, solveur, suivi, reversibles), tours: trouve.tours };
}

// Les coups legaux de `camp` dans `etat` : texte Nacre (minuscules) -> l'etat apres le coup.
function coupsEcritsDuCamp(etat, camp) {
  const couleurs = couleursDuPlateau(etat.plateau);
  const coups = new Map();
  for (const coup of tousLesCoupsLegaux(couleurs, camp)) {
    const texte = ecrireCoupNacreSansAmbiguite(couleurs, camp, coup).toLowerCase();
    if (!coups.has(texte)) coups.set(texte, appliquerCoup({ ...etat, joueurAuTrait: camp }, coup).etat);
  }
  return coups;
}

// Le nombre de solutions et les debuts de solution d'un puzzle recolte (saab,
// 2026-10-10 : « il manque le nb de sol » ; moteur/banc-puzzles.js, entreeAvecSolutions) :
// chaque coup legal de Noir, verifie par le solveur (sa table est encore chaude). Noir
// gagne : ses premiers coups gagnants. Blanc gagne (2026-10-11 : « le nb de sol perdantes
// pour Noir, xtr6y1 ») : les premiers coups de Noir que le solveur accepte (la meilleure
// defense), puis les reponses gagnantes de Blanc a chacun.
//
// `reversibles` (saab, 2026-10-16 : « dans Recherche de PZL, il faudrait tester aussi
// quand le joueur gagne si le joueur peut perdre s'il sort de la solution ») : chaque
// ecart du gagnant a son premier coup — Noir qui gagne : ses coups qui ne sont pas des
// solutions ; Blanc qui gagne : ses reponses non gagnantes aux defenses de Noir —, le
// perdant force-t-il alors la victoire dans les memes tours ? Oui pour un seul : le nom
// le dit (« _rév », moteur/banc-puzzles.js). Long : un appel au solveur par ecart.
async function entreeCompletee(entree, tours, solveur, suivi, reversibles = false) {
  suivi({ etape: 'solutions au premier coup (solveur)…' });
  const noirGagne = entree.winner === 'Noir';
  const verdict = async (coups) => lireReponseSolveur((await solveur.verifier({ position: entree.pos, noirGagne, toursMaximum: tours, coups })).reponse).verdict;
  const premiers = coupsEcritsDuCamp(lirePosition(entree.pos), 'noir');
  const { solutions, sures } = await premiersCoupsGagnants([...premiers.keys()], (coup) => verdict([coup]));
  const reponses = {};
  const ecarts = noirGagne ? [...premiers].filter(([coup]) => !solutions.includes(coup)).map(([, etat]) => etat) : [];
  let toutesSures = sures;
  for (const coup of noirGagne ? [] : solutions) {
    const reponsesDeBlanc = coupsEcritsDuCamp(premiers.get(coup), 'blanc');
    const suite = await premiersCoupsGagnants([...reponsesDeBlanc.keys()], (reponse) => verdict([coup, reponse]));
    reponses[coup] = suite.solutions;
    toutesSures &&= suite.sures;
    ecarts.push(...[...reponsesDeBlanc].filter(([reponse]) => !suite.solutions.includes(reponse)).map(([, etat]) => etat));
  }
  const completee = entreeAvecSolutions(entree, { solutions, sures: toutesSures, reponses });
  if (!reversibles || completee === entree) return completee;
  suivi({ etape: `réversible ? ${ecarts.length} écarts du gagnant (solveur)…` });
  const perdant = noirGagne ? 'blanc' : 'noir';
  const perdantForceLaVictoire = async (etat) => {
    // Le perdant au trait : camps inverses s'il est Blanc (Noir commence), comme une recolte.
    const sienne = entreeDuPuzzleRecolte({ etat, gagnant: perdant, tours, numero: 0, date: '', createur: '' });
    return lireReponseSolveur((await solveur.verifier({ position: sienne.pos, noirGagne: sienne.winner === 'Noir', toursMaximum: tours, coups: [] })).reponse).verdict === 'valide';
  };
  return (await estReversible(ecarts, perdantForceLaVictoire)) ? { ...completee, PZL_name: nomReversible(completee.PZL_name) } : completee;
}

// Les boutons de la RECOLTE (extrait d'interface/banc-essais.js, regle des 200 lignes) :
// les puzzles recoltes au format de KAAWA (Puzzles > Importer les reprend), ou ajoutes a
// My. `recolte()` : { entrees, date, ajoutee }, celle du banc en cours.
function brancherLaRecolteDuBanc(elements, recolte) {
  elements.exporterRecolte.addEventListener('click', () => {
    telechargerTexte(fichierPositionsMy(recolte().entrees.map(({ entree }) => entree)), `KAA_PZL_banc_${recolte().date}.json`, 'application/json');
  });
  elements.ajouterRecolte.addEventListener('click', () => {
    const renommees = importerEntreesMy('puzzles', recolte().entrees.map(({ entree }) => entree));
    if (renommees === null) return window.alert("Le navigateur a refusé d'enregistrer les puzzles (stockage plein ?).");
    recolte().ajoutee = true;
    elements.ajouterRecolte.disabled = true;
    const renommes = renommees.length ? ` (${renommees.length} renommés : nom déjà pris)` : '';
    window.alert(`${recolte().entrees.length} puzzles ajoutés à My${renommes}.`);
  });
}
