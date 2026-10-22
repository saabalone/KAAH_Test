// Le Banc d'essais, les CEINTURES DES IA : le deroulement — quels jeux, dans quel ordre,
// jusqu'ou (les jeux eux-memes : interface/banc-essais-ceintures.js). Deux facons :
//   - le PASSAGE (saab, 2026-10-11 : « on part de Blanche et on vise la suivante, dès
//     qu'on régresse le test s'arrête et sa plus haute ceinture est attribuée à l'IA ») :
//     le parcours d'un joueur, confirmations comprises ;
//   - TOUT TESTER (« tester la ceinture inférieure aussi si elle a raté la visée ... tout
//     tester depuis le haut jusqu'au bas, et on verra bien s'il n'y a pas de résultats
//     étranges ») : la serie de chaque grade, a part, du plus haut jusqu'a la blanche.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : parcoursNeuf, viserCeinture,
// apresUnResultat, tirerPropositions (moteur/entrainement-serie.js), prochainJeuDuParcours,
// suiteDuPassage, parcoursPourTester, issueDeLaSerieTestee (moteur/entrainement-ia.js),
// puzzlesProposablesDuGrade, typesDuJeu (moteur/entrainement.js), KAA_PZL_SOLUTIONS
// (donnees/kaa-puzzles-solutions.js), reglesDeSerieDuGrade, candidatsDuGrade,
// nombreDeJeuxProposes (moteur/entrainement-lecture.js), reglagesDeLEntrainement
// (interface/profils-entrainement.js), jouerLaVarianteDuPassage, jouerLePuzzleDuPassage,
// JEUX_MAX_DU_PASSAGE, ESSAIS_SUR_UNE_NULLE (interface/banc-essais-ceintures.js) viennent de fichiers charges avant.

// Ce qui joue les jeux d'une IA dans `sorte` : `jeux` = { variantes, puzzles, base (le
// livre d'ouvertures) }. Renvoie jouerLeSuivant(parcours) : le jeu que l'IA choisit
// (moteur/entrainement-ia.js), joue, et son resultat range dans le parcours — { ligne
// ({ ceinture, nom, sens, reussi, issue, evenement }), apres (le parcours) }, 'aucun'
// (plus de jeu propose), ou null (arrete).
function joueurDesCeintures(candidat, sorte, jeux, kai, controle, suivi) {
  const reglages = reglagesDeLEntrainement();
  const tous = sorte === 'variantes' ? jeux.variantes : jeux.puzzles;
  const typesDe = (nom) => typesDuJeu(sorte, tous.find((jeu) => jeu.nom === nom) ?? { nom });
  const tirages = new Map();
  const propositions = (grade) => {
    if (!tirages.has(grade)) {
      const duGrade = (sorte === 'variantes' ? tous : puzzlesProposablesDuGrade(tous, grade, reglages.options.pzlSolutionUnique, KAA_PZL_SOLUTIONS)).map((jeu) => jeu.nom);
      const { imposes = [], quotas = {} } = reglages.ceintures[grade][sorte] ?? {};
      tirages.set(grade, tirerPropositions(candidatsDuGrade(reglages, grade, sorte, duGrade, tous.map((jeu) => jeu.nom)), { imposes, quotas, typesDe }, nombreDeJeuxProposes(reglages, grade, sorte)));
    }
    return tirages.get(grade);
  };
  return async function jouerLeSuivant(parcours) {
    const regles = reglesDeSerieDuGrade(reglages, parcours.cible ?? parcours.ceinture, sorte, typesDe);
    const jeu = prochainJeuDuParcours(parcours, propositions, regles);
    if (!jeu) return 'aucun';
    const position = tous.find((autre) => autre.nom === jeu.nom);
    const joue =
      sorte === 'variantes'
        ? await jouerLaVarianteDuPassage(jeu, position, candidat, reglages.ceintures[jeu.ceinture], jeux.base ?? null, Number.isFinite(regles.essaisAvantReinitialisation) ? regles.essaisAvantReinitialisation : ESSAIS_SUR_UNE_NULLE, kai, controle, suivi)
        : await jouerLePuzzleDuPassage(jeu, position, candidat, reglages.options, kai, controle, suivi);
    if (joue === null) return null;
    const { parcours: apres, evenement } = apresUnResultat(parcours, jeu.ceinture, jeu.nom, jeu.sens, joue.reussi, regles);
    // Un jeu remis a zero : un autre jeu propose d'abord, comme le ferait un joueur.
    if (evenement === 'jeu reinitialise') tirages.set(jeu.ceinture, [...propositions(jeu.ceinture).filter((nom) => nom !== jeu.nom), jeu.nom]);
    return { ligne: { ...jeu, reussi: joue.reussi, issue: joue.issue, evenement }, apres };
  };
}

// Le passage d'une IA dans `sorte` : de la blanche jusqu'a sa premiere regression.
// `cibleDeDepart` (saab : « au lieu de commencer par Blanche on commence par Noire 1 dan,
// comme ça elle devra confirmer jusqu'à Blanche ») : la ceinture visee d'abord, les
// ceintures sautees etant a confirmer ; null : la suivante. `surJeu({ ceinture, journal })`
// apres chaque jeu. Renvoie { ceinture (la plus haute), raison, journal }.
async function passerLesCeintures(candidat, sorte, jeux, kai, controle, suivi, surJeu, cibleDeDepart = null) {
  const jouerLeSuivant = joueurDesCeintures(candidat, sorte, jeux, kai, controle, suivi);
  let parcours = cibleDeDepart === null ? parcoursNeuf() : viserCeinture(parcoursNeuf(), cibleDeDepart);
  const journal = [];
  while (journal.length < JEUX_MAX_DU_PASSAGE) {
    const joue = await jouerLeSuivant(parcours);
    if (joue === null) return { ceinture: parcours.ceinture, raison: 'arrêté', journal };
    if (joue === 'aucun') return { ceinture: parcours.ceinture, raison: 'plus de jeu proposé', journal };
    journal.push(joue.ligne);
    const suite = suiteDuPassage(joue.ligne.evenement, parcours, joue.apres);
    parcours = joue.apres;
    surJeu({ ceinture: parcours.ceinture, journal });
    if (suite.fini) return { ceinture: suite.ceinture, raison: suite.raison, journal };
  }
  return { ceinture: parcours.ceinture, raison: 'trop de jeux', journal };
}

// Tout tester : la serie de chaque grade, de `gradeLePlusHaut` jusqu'a la blanche, que
// celle du dessus soit reussie ou ratee. `surJeu({ ceinture, journal, grades })` apres
// chaque jeu. Renvoie { ceinture (la plus haute reussie, SANS_CEINTURE sinon), raison,
// journal, grades ([{ grade, issue : 'réussie' | 'ratée' | 'pas de jeu' }]) }.
// `gradeLePlusBas` : pour ne tester qu'une partie des grades (plusieurs calculs a la fois).
async function testerLesCeintures(candidat, sorte, jeux, kai, controle, suivi, surJeu, gradeLePlusHaut, gradeLePlusBas = 0) {
  const jouerLeSuivant = joueurDesCeintures(candidat, sorte, jeux, kai, controle, suivi);
  const journal = [];
  const grades = [];
  const plusHaute = () => Math.max(SANS_CEINTURE, ...grades.filter(({ issue }) => issue === 'réussie').map(({ grade }) => grade));
  for (let grade = gradeLePlusHaut; grade >= gradeLePlusBas; grade--) {
    let parcours = parcoursPourTester(grade);
    let issue = null;
    for (let joues = 0; issue === null && joues < JEUX_MAX_DU_PASSAGE; joues++) {
      const joue = await jouerLeSuivant(parcours);
      if (joue === null) return { ceinture: plusHaute(), raison: 'arrêté', journal, grades };
      if (joue === 'aucun') issue = 'pas de jeu';
      else {
        journal.push(joue.ligne);
        parcours = joue.apres;
        issue = issueDeLaSerieTestee(joue.ligne.evenement);
        surJeu({ ceinture: plusHaute(), journal, grades: [...grades, { grade, issue: issue ?? 'en cours' }] });
      }
    }
    grades.push({ grade, issue: issue ?? 'trop de jeux' });
    surJeu({ ceinture: plusHaute(), journal, grades });
  }
  return { ceinture: plusHaute(), raison: 'tout testé', journal, grades };
}
