// Le Banc d'essais : LES CEINTURES DES IA (saab, 2026-10-11 : « un autre banc d'essai
// pour que je puisse tester les ceintures entre IA : on part de Blanche et on vise la
// suivante, dès qu'on régresse le test s'arrête et sa plus haute ceinture est attribuée
// à l'IA »). Chaque profil coche suit le parcours d'un joueur (les regles du profil
// d'Entrainement actif, moteur/entrainement-serie.js ; ses choix, moteur/entrainement-ia.js)
// contre la machine de chaque grade, en Variantes et/ou en PZL. Sans pendule : l'IA
// reflechit ce que dit sa reflexion max, pas le temps du joueur. Version de travail seulement.
//
// Ici, les JEUX (une variante, un PZL) ; le deroulement est dans
// interface/banc-essais-ceintures-passage.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CEINTURES, campDuSens, plisUtilesDuPuzzle, issueDuPuzzle
// (moteur/entrainement.js), positionAvecHandicap (moteur/entrainement-reglages.js),
// machineDesCeintures,
// NIVEAU_MAX_DES_PUZZLES, ELAGAGE_DES_PUZZLES_AVEC_ELAGAGE (interface/entrainement-partie.js),
// lireMachine, poidsEnTexte, lireReponseKaiPlus, coupsDesPositions, textesDeLaSequence
// (moteur/ia.js), jouerUnePartieDuBanc, GRAINE_MAX_BANC, MILLISECONDES_PAR_SECONDE_BANC
// (interface/banc-essais-partie.js), etatDuPuzzle (moteur/puzzles.js), ecrirePosition
// (moteur/notation.js), appliquerCoup (moteur/partie.js), nomDeLaCeinture
// (interface/entrainement-ceintures.js) viennent de fichiers charges avant celui-ci.

const CLE_CEINTURES_DES_IA = 'kaah-ceintures-ia';
// Les fins de partie du banc qui sont des nulles : « nulle (répétition) », « nulle (limite) »
// (moteur/banc-essais.js, finDeLaPartieDuBanc).
const DEBUT_D_UNE_NULLE_DU_BANC = 'nulle';
// Les parties rejouees sur une nulle, quand les essais ne sont pas limites (regle decochee).
const ESSAIS_SUR_UNE_NULLE = 3;
const JEUX_MAX_DU_PASSAGE = 1000; // garde-fou : un passage ne tourne jamais sans fin
const LIBELLES_SORTES_DU_PASSAGE = { variantes: 'Variantes', pzl: 'PZL' };
const SENS_DU_PASSAGE = { variantes: { aller: 'Noir', revanche: 'Blanc' }, pzl: { aller: 'Noir', revanche: 'Blanc' } };

// Une machine de l'Entrainement, en reglage du banc ({ niveau, temps, elagage, poids, version }).
function reglageDuBancPourLaMachine(brut) {
  const machine = lireMachine(brut);
  return { niveau: machine.niveau, temps: machine.reflexionMax, elagage: machine.elagage, poids: machine.poids, version: machine.version };
}

// Une variante du grade : l'IA joue Noir (aller) ou Blanc (revanche) contre la machine
// du grade, avec le handicap du grade. La machine prend ses coups dans le livre (`base`)
// tant qu'elle y est, comme contre un joueur : entre deux machines sans livre, la meme
// partie se rejouerait a l'identique (essai du 2026-10-11 : 9 defaites pareilles de suite).
// Les NULLES (saab, 2026-10-11 : « entre IA on va dire que nulle est réussi, car surtout
// en Standard on arrive en nulle ... tu peux quand même tester sur les 3 essais pour voir
// si elle gagne, mais si elle échoue on notera réussi par nulle ») : une partie nulle se
// rejoue, jusqu'a `essais` parties ; gagnee ou perdue, c'est son resultat ; toutes nulles,
// elle est reussie par nulle. Contre un joueur, une nulle reste une defaite.
// Renvoie { reussi, issue (chaque partie jouee) } ou null (arretee).
async function jouerLaVarianteDuPassage(jeu, variante, candidat, grade, base, essais, kai, controle, suivi) {
  const campDeLIA = jeu.sens === 'aller' ? 'noir' : 'blanc';
  const machine = reglageDuBancPourLaMachine(machineDesCeintures({ niveau: grade.niveau, elagage: grade.ia.elagage, reflexionMax: grade.ia.reflexion, livre: true }));
  const position = positionAvecHandicap(variante.texteBrut, campDeLIA, grade.handicap);
  const jouees = [];
  for (let essai = 0; essai < essais; essai++) {
    const tache = { referenceNoir: campDeLIA === 'blanc', graine: Math.floor(Math.random() * GRAINE_MAX_BANC), position };
    // Une partie a regarder sur le petit plateau (interface/banc-essais-ceintures-page.js).
    suivi({ partie: { position, essaiNoir: campDeLIA === 'noir', adversaire: `machine ${CEINTURES[jeu.ceinture].nom.toLowerCase()} (niv. ${grade.niveau})`, titre: `${CEINTURES[jeu.ceinture].nom}, ${variante.nom} (${jeu.sens})` } });
    const partie = await jouerUnePartieDuBanc(tache, machine, candidat, { hasard: 0, livre: true }, kai, base, controle, suivi);
    if (!partie) return null;
    jouees.push(`${partie.fin} ${partie.score}, ${partie.coups.length} coups`);
    if (!partie.fin.startsWith(DEBUT_D_UNE_NULLE_DU_BANC)) return { reussi: partie.fin === campDeLIA, issue: jouees.join(' ; ') };
  }
  return { reussi: true, issue: `réussi par nulle — ${jouees.join(' ; ')}` };
}

// Un PZL du grade : l'IA en Noir a l'aller, en Blanc a la revanche — elle attaque avec le
// camp gagnant, defend sinon (moteur/entrainement.js, attaqueDansLePuzzle) ; la machine ne cherche que les tours qui restent, sans elagage (comme
// contre un joueur), l'IA avec ses propres reglages, mais elle non plus pas plus loin que les
// tours qui restent — comme la machine d'une partie face a un PZL (interface/ia.js, aide.plis).
// Saab, 2026-10-22 : KAI++8 « échoue sur PZL_E_0005 » : a 8 demi-coups, l'elagage jette a la
// racine le gain en 3 (d4b4) et elle joue un gain en 5, trop tard pour le PZL. Saab, 2026-10-23 :
// « adapter l'élagage aussi pour les PZL -4-4 ou autres, comme ce n'est que pour tester les
// ceintures » — l'IA testee y cherche sans elagage (ef ne couvrait que les -5-5). Renvoie { reussi
// (moteur, issueDuPuzzle), issue } ou null (arretee).
async function jouerLePuzzleDuPassage(jeu, puzzle, candidat, options, kai, controle, suivi) {
  let etat = puzzle.position;
  const historique = [ecrirePosition(etat)];
  const coups = [];
  suivi({ partie: { position: historique[0], essaiNoir: campDuSens(jeu.sens) === 'noir', adversaire: 'machine du PZL', titre: `${CEINTURES[jeu.ceinture].nom}, ${puzzle.nom} (${jeu.sens})` } });
  for (;;) {
    if (controle.arret) return null;
    if (controle.pause) await new Promise((resoudre) => (controle.reprendre = resoudre));
    const attaque = etat.joueurAuTrait === puzzle.campGagnant;
    const iaAuTrait = etat.joueurAuTrait === campDuSens(jeu.sens);
    const coupsDuGagnant = coups.filter((_, rang) => rang % 2 === (puzzle.campGagnant === 'blanc' ? 1 : 0)).length;
    const plis = Math.min(NIVEAU_MAX_DES_PUZZLES, plisUtilesDuPuzzle(puzzle.toursMaximum, coupsDuGagnant, attaque));
    const reglage = iaAuTrait ? { ...candidat, niveau: Math.min(candidat.niveau, plis), elagage: 0 } : reglageDuBancPourLaMachine(machineDesCeintures({ niveau: plis, elagage: options.pzlSansElagage ? 0 : ELAGAGE_DES_PUZZLES_AVEC_ELAGAGE, reflexionMax: options.reflexionPzl, livre: false }));
    suivi({ coup: coups.length + 1, camp: iaAuTrait ? 'essai' : 'machine', debut: performance.now(), profondeur: null, evaluation: null });
    const texte = await kai.chercher({
      position: ecrirePosition(etat),
      joueurNoir: etat.joueurAuTrait === 'noir',
      profondeur: reglage.niveau,
      poids: poidsEnTexte(poidsPourUnPuzzle(reglage.poids)), // ef a tous les niveaux (moteur/ia.js)
      version: reglage.version,
      graine: Math.floor(Math.random() * GRAINE_MAX_BANC),
      dureeMs: dureeDeReflexionDuBancMs(reglage.temps),
      historique: historique.join('\n'),
      elagage: reglage.elagage,
    }, (progres) => {
      const enCours = lireReponseKaiPlus(progres);
      if (enCours) suivi({ profondeur: enCours.profondeur, evaluation: enCours.evaluation });
    });
    const reponse = lireReponseKaiPlus(texte);
    const coup = reponse ? coupsDesPositions(etat, reponse.positions)[0] : null;
    if (!coup) return controle.arret ? null : { reussi: false, issue: 'plus de coup' };
    coups.push(textesDeLaSequence(etat, [coup])[0]);
    suivi({ coupsJoues: [...coups] }); // pour la regarder en cours
    etat = appliquerCoup(etat, coup).etat;
    historique.push(ecrirePosition(etat));
    const ejectionsDuGagnant = puzzle.campGagnant === 'noir' ? etat.billesEjecteesBlanches : etat.billesEjecteesNoires;
    const issue = issueDuPuzzle(attaqueDansLePuzzle(jeu.sens, puzzle.campGagnant), etatDuPuzzle(puzzle, { coupsJoues: coups, ejectionsDuGagnant, vainqueur: etat.vainqueur }), options.pzlDernierTour);
    if (issue !== null) return { reussi: issue, issue: `${coups.length} coups` };
  }
}
