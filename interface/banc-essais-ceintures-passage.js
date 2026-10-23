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
// SANS_CEINTURE, CEINTURE_BLANCHE (moteur/entrainement-serie.js), typesDuJeu (moteur/entrainement.js), KAA_PZL_SOLUTIONS
// (donnees/kaa-puzzles-solutions.js), reglesDeSerieDuGrade, nomsProposablesDuGrade,
// nombreDeJeuxProposes (moteur/entrainement-lecture.js), reglagesDeLEntrainement
// (interface/profils-entrainement.js), jouerLaVarianteDuPassage, jouerLePuzzleDuPassage,
// JEUX_MAX_DU_PASSAGE, ESSAIS_SUR_UNE_NULLE (interface/banc-essais-ceintures.js) viennent de fichiers charges avant.

// Ce qui joue les jeux d'une IA dans `sorte` : `jeux` = { variantes, puzzles, base (le
// livre d'ouvertures) }. Renvoie jouerLeSuivant(parcours) : le jeu que l'IA choisit
// (moteur/entrainement-ia.js), joue, et son resultat range dans le parcours — { etapes :
// [{ ligne ({ ceinture, nom, sens, reussi, issue, evenement, numero (sa partie) }), apres (le
// parcours) }] }, 'aucun' (plus de jeu propose), ou null (arrete).
//
// `renfort` (facultatif, interface/banc-essais.js) : { machine(), suivi(texte), finir() } — avec
// lui, l'aller et la revanche d'un meme jeu se jouent en meme temps (saab, 2026-10-23 : « il ne
// fait qu'une partie à la fois ? C'est long ») : deux etapes, rangees dans l'ordre ; la revanche
// ne compte que si elle compte encore apres l'aller (sinon elle est oubliee).
function joueurDesCeintures(candidat, sorte, jeux, kai, controle, suivi, renfort = null) {
  const reglages = reglagesDeLEntrainement();
  const tous = sorte === 'variantes' ? jeux.variantes : jeux.puzzles;
  const typesDe = (nom) => typesDuJeu(sorte, tous.find((jeu) => jeu.nom === nom) ?? { nom });
  const tirages = new Map();
  // Ce qu'un grade propose sur cet appareil (moteur/entrainement-lecture.js).
  const proposablesDe = (grade) => nomsProposablesDuGrade(reglages, grade, sorte, tous, KAA_PZL_SOLUTIONS);
  const propositions = (grade) => {
    if (!tirages.has(grade)) {
      const { imposes = [], quotas = {} } = reglages.ceintures[grade][sorte] ?? {};
      tirages.set(grade, tirerPropositions(proposablesDe(grade), { imposes, quotas, typesDe }, nombreDeJeuxProposes(reglages, grade, sorte)));
    }
    return tirages.get(grade);
  };
  const reglesDu = (parcours) => reglesDeSerieDuGrade(reglages, parcours.cible ?? parcours.ceinture, sorte, typesDe, proposablesDe);
  // Un jeu sur `machine`, suivi par `suiviDuJeu` : son resultat, et le numero de sa partie
  // (interface/banc-essais-ceintures-page.js) ; null : arrete.
  async function jouerUnJeu(jeu, regles, machine, suiviDuJeu) {
    const position = tous.find((autre) => autre.nom === jeu.nom);
    const joue =
      sorte === 'variantes'
        ? await jouerLaVarianteDuPassage(jeu, position, candidat, reglages.ceintures[jeu.ceinture], jeux.base ?? null, Number.isFinite(regles.essaisAvantReinitialisation) ? regles.essaisAvantReinitialisation : ESSAIS_SUR_UNE_NULLE, machine, controle, suiviDuJeu)
        : await jouerLePuzzleDuPassage(jeu, position, candidat, reglages.options, machine, controle, suiviDuJeu);
    return joue && { ...joue, numero: suiviDuJeu.numero?.() };
  }
  // Le resultat d'un jeu range dans `parcours` : { ligne, apres }.
  function ranger(parcours, jeu, joue) {
    const { parcours: apres, evenement } = apresUnResultat(parcours, jeu.ceinture, jeu.nom, jeu.sens, joue.reussi, reglesDu(parcours));
    // Un jeu remis a zero : un autre jeu propose d'abord, comme le ferait un joueur.
    if (evenement === 'jeu reinitialise') tirages.set(jeu.ceinture, [...propositions(jeu.ceinture).filter((nom) => nom !== jeu.nom), jeu.nom]);
    return { ligne: { ...jeu, reussi: joue.reussi, issue: joue.issue, evenement, numero: joue.numero }, apres };
  }
  // La revanche de `jeu` (un aller), si elle reste a jouer et si la serie en demande une.
  function revancheAJouer(parcours, jeu, regles) {
    const enConfirmation = parcours.aConfirmer;
    const avecRevanche = enConfirmation ? regles.revancheDeConfirmation ?? regles.revanche : regles.revanche;
    const siens = enConfirmation ? parcours.enConfirmation?.[`${jeu.ceinture}|${jeu.nom}`] : parcours.enCours?.[jeu.nom];
    return avecRevanche && jeu.sens === 'aller' && !siens?.revanche ? { ...jeu, sens: 'revanche' } : null;
  }
  return async function jouerLeSuivant(parcours) {
    const regles = reglesDu(parcours);
    const jeu = prochainJeuDuParcours(parcours, propositions, regles);
    if (!jeu) return 'aucun';
    const revanche = renfort ? revancheAJouer(parcours, jeu, regles) : null;
    if (!revanche) {
      const joue = await jouerUnJeu(jeu, regles, kai, suivi);
      return joue && { etapes: [ranger(parcours, jeu, joue)] };
    }
    const [aller, retour] = await Promise.all([jouerUnJeu(jeu, regles, kai, suivi), jouerUnJeu(revanche, regles, renfort.machine(), renfort.suivi(`${candidat.nom} — revanche`))]);
    renfort.finir();
    if (aller === null || retour === null) return null;
    const premiere = ranger(parcours, jeu, aller);
    const seconde = ranger(premiere.apres, revanche, retour);
    return { etapes: seconde.ligne.evenement === 'refuse' ? [premiere] : [premiere, seconde] };
  };
}

// Le passage d'une IA dans `sorte` : de la blanche jusqu'a sa premiere regression.
// `cibleDeDepart` (saab : « au lieu de commencer par Blanche on commence par Noire 1 dan,
// comme ça elle devra confirmer jusqu'à Blanche ») : la ceinture visee d'abord, les
// ceintures sautees etant a confirmer ; null : la suivante. `surJeu({ ceinture, journal })`
// apres chaque jeu. Renvoie { ceinture (la plus haute), raison, journal }.
// Visee d'abord, un echec avant toute ceinture REDESCEND d'un cran (saab, 2026-10-23 : « s'il
// échoue qq part il redescendra pour faire les manquantes ») en gardant ses jeux reussis — ce qui
// est reussi au-dessus vaut en dessous (moteur/entrainement-serie.js) ; la premiere ceinture
// obtenue ainsi est la sienne.
async function passerLesCeintures(candidat, sorte, jeux, kai, controle, suivi, surJeu, cibleDeDepart = null, renfort = null) {
  const jouerLeSuivant = joueurDesCeintures(candidat, sorte, jeux, kai, controle, suivi, renfort);
  let parcours = cibleDeDepart === null ? parcoursNeuf() : viserCeinture(parcoursNeuf(), cibleDeDepart);
  const journal = [];
  let redescendu = false;
  while (journal.length < JEUX_MAX_DU_PASSAGE) {
    const joue = await jouerLeSuivant(parcours);
    if (joue === null) return { ceinture: parcours.ceinture, raison: 'arrêté', journal };
    if (joue === 'aucun') return { ceinture: parcours.ceinture, raison: 'plus de jeu proposé', journal };
    for (const { ligne, apres } of joue.etapes) {
      journal.push(ligne);
      const suite = suiteDuPassage(ligne.evenement, parcours, apres);
      if (suite.fini && ligne.evenement === 'regression' && cibleDeDepart !== null && parcours.ceinture === SANS_CEINTURE && parcours.cible > CEINTURE_BLANCHE) {
        parcours = viserCeinture({ ...parcoursNeuf(), gagnes: apres.gagnes }, parcours.cible - 1);
        redescendu = true;
        surJeu({ ceinture: parcours.ceinture, journal });
        break; // l'autre etape (la revanche) comptait pour la ceinture ratee
      }
      parcours = apres;
      surJeu({ ceinture: parcours.ceinture, journal });
      if (suite.fini) return { ceinture: suite.ceinture, raison: suite.raison, journal };
      if (redescendu && ligne.evenement === 'ceinture') return { ceinture: parcours.ceinture, raison: 'obtenue en redescendant', journal };
    }
  }
  return { ceinture: parcours.ceinture, raison: 'trop de jeux', journal };
}

// Tout tester : la serie de chaque grade, de `gradeLePlusHaut` jusqu'a la blanche, que
// celle du dessus soit reussie ou ratee. `surJeu({ ceinture, journal, grades })` apres
// chaque jeu. Renvoie { ceinture (la plus haute reussie, SANS_CEINTURE sinon), raison,
// journal, grades ([{ grade, issue : 'réussie' | 'ratée' | 'pas de jeu' }]) }.
// `gradeLePlusBas` : pour ne tester qu'une partie des grades (plusieurs calculs a la fois).
async function testerLesCeintures(candidat, sorte, jeux, kai, controle, suivi, surJeu, gradeLePlusHaut, gradeLePlusBas = 0, renfort = null) {
  const jouerLeSuivant = joueurDesCeintures(candidat, sorte, jeux, kai, controle, suivi, renfort);
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
        for (const { ligne, apres } of joue.etapes) {
          journal.push(ligne);
          parcours = apres;
          issue = issueDeLaSerieTestee(ligne.evenement);
          surJeu({ ceinture: plusHaute(), journal, grades: [...grades, { grade, issue: issue ?? 'en cours' }] });
          if (issue !== null) break;
        }
      }
    }
    grades.push({ grade, issue: issue ?? 'trop de jeux' });
    surJeu({ ceinture: plusHaute(), journal, grades });
  }
  return { ceinture: plusHaute(), raison: 'tout testé', journal, grades };
}
