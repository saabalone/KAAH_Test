// Les machines a la table (phase 29 ⚠, PLAN.md ; phase 32 : une par camp, ou
// deux, machine contre machine). Surveille la partie, et des que c'est au camp
// d'une machine EN MARCHE de jouer sur une position jouable (ni pause, ni
// historique, ni position close), cherche son coup (interface/ia-reflexion.js :
// KAI par tranches sur ce fil, KAI++ dans son worker — rien ne se fige). Puis
// elle joue par le meme chemin qu'un coup choisi dans les Conseils
// (partie.jouerCoupTexte), jamais une regle a part, en laissant sur le coup ce
// qu'elle en a pense (tableau de reflexion, interface/reflexion-ia.js).
//
// Sa pendule tourne pendant qu'elle reflechit, comme pour un joueur (saab) :
// sa reflexion est bornee par `reflexionMax` (reglable au debut de partie).
// Sa pendule clignote pendant ce temps (styles.css, .machine-reflechit).
//
// Marche / Arret (phase 32, saab, boite du nom) : Arret pendant qu'elle
// reflechit lui fait jouer le meilleur coup deja trouve (moteur/ia-recherche.js,
// suivi.arreter), puis elle ne joue plus ; Arret quand ce n'est pas son tour
// l'arrete seulement ; Marche la relance. Saab, 2026-09-30 : tant que la boite
// du nom est ouverte, la machine ET le temps sont suspendus (suspendre) — sinon
// le coup etait deja joue avant qu'on ait touche Arret ; on y change aussi la
// machine d'un camp, ou on en met une a la place d'un humain (definirMachine,
// saab 2026-10-01) : c'est pourquoi les machines demarrent dans TOUTE partie,
// meme entre humains.
//
// Sur une position DEJA JOUEE (on est revenu en arriere, et le coup qui suit
// n'est pas le sien — joue a sa place), une machine en marche cherche quand
// meme et montre dans le tableau ce qu'elle AURAIT joue, sans le jouer : on
// peut toujours naviguer. Toucher ce coup le joue (une nouvelle branche), et la
// partie repart de la (saab, 2026-09-30). Le bouton « Relancer » du tableau les
// fait rejouer depuis la position regardee (voir `relance`).
//
// Fin de partie vue jusqu'au bout (« Gagne/Perd en n », saab 2026-10-01) : la
// machine retient la suite de sa sequence (moteur/sequence-prevue.js,
// solutionsDeLaSequence) et, si l'adversaire repond comme prevu, la joue sans
// chercher (« fin déjà vue » dans le tableau).
//
// Suggestion (saab, 2026-10-01) : un humain demande a une machine choisie dans
// la boite du nom (suggerer) ce qu'elle jouerait ici, sans qu'elle prenne sa
// place ; le tableau la montre comme « Sugg. → a1b2 » (la toucher la joue), et
// le coup que l'humain joue ensuite — celui-la ou un autre — recoit la
// suggestion en commentaire.
//
// Surveillance par un simple coup d'oeil regulier (VERIFICATION_MS) plutot
// qu'un branchement sur chaque evenement : un coup, une navigation, une pause
// levee d'un clic sur la pendule, Annuler... tous passent par des chemins
// differents, et en oublier un laisserait la machine muette. Si la position
// change PENDANT la reflexion, le coup trouve n'est pas joue (il repondait a
// une autre position) : la surveillance relance une reflexion neuve.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : textesDeLaSequence,
// nomDeLaMachine (moteur/ia.js), commentaireDeReflexion
// (moteur/sequence-prevue.js), reflechirAvecKai,
// reflechirAvecKaiPlus, MILLISECONDES_PAR_SECONDE, ATTENTE_SUSPENSION_MS
// (interface/ia-reflexion.js), creerKaiPlus (interface/kai-plus.js),
// phaseDeLaPartie (moteur/ia-evaluation.js), etatCourant, noeudCourant
// (moteur/arbre.js), positionsDepuisLaRacine (interface/nulle.js),
// marquerNomMachine, colorerStyleDuNom (rendu/ligne-joueur.js), ABREVIATIONS_STYLES_IA
// (moteur/ia.js), couleurDeLaMachineIA (moteur/couleurs-profil-ia.js),
// trouverProfilIA (interface/profils-ia.js), solutionsDeLaSequence, solutionsDeLAdversaire,
// cleDeSolution (moteur/sequence-prevue.js), noeudA, cheminsEgaux (moteur/arbre.js)
// viennent de fichiers charges avant celui-ci.

const VERIFICATION_MS = 250;
// Jamais une reponse plus rapide que ca : le coup du joueur (animation de 300
// ms, rendu/animation.js) doit avoir fini de glisser avant qu'on voie la
// reponse, meme quand elle a ete trouvee en 3 ms.
const DELAI_MINIMUM_REPONSE_MS = 600;

// `partie` : ce que renvoie demarrerPartie (interface/saisie.js).
// `machines` : { noir, blanc }, chacune un reglage (moteur/ia.js, lireMachine)
// ou null — le MEME objet que celui que la sauvegarde ecrit (changerProfil le
// modifie sur place). `obtenirBase()` : la base de coups chargee (le livre
// d'ouvertures), Map vide tant qu'elle se charge. `svg` : #plateau (pendule qui
// clignote). `reflexion` : interface/reflexion-ia.js ; `evaluations` :
// interface/evaluations.js. Renvoie la commande de la boite du nom
// (interface/noms-joueurs.js).
//
// Entre deux machines, une nulle par repetition est acceptee toute seule (saab :
// « 3 Occ et Nulle automatique validee ») ; chacune sait qu'un coup qui fait
// revenir une position une troisieme fois mene a la nulle (moteur/ia-recherche.js,
// historique) et ne le choisit que si tout le reste est pire pour elle.
// `toujoursEnvisager` : une copie d'essai « Es_ » (index.html, creerPartieEssai)
// — ses poids ont change, elle dit donc ce qu'elle jouerait sur TOUTE position
// deja jouee, meme la ou elle avait joue.
function demarrerMachines({ partie, machines, obtenirBase, svg, reflexion, evaluations, toujoursEnvisager = false }) {
  const enMarche = { noir: true, blanc: true };
  // { etat, camp, coupsJoues, suivi, debut, hypothese, arreterTout?, abandonner? }, ou null
  let reflexionEnCours = null;
  let kaiPlus = null; // le worker de KAI++, cree a sa premiere reflexion
  let arbreAffiche = null;
  // Ce qu'elle aurait joue sur des positions deja jouees (voir l'en-tete),
  // et celle de ces reponses que le tableau montre.
  let hypotheses = new WeakMap();
  let hypotheseAffichee = null;
  // Les suggestions demandees (position -> ce que la machine choisie jouerait,
  // et la ligne de commentaire a poser sur le coup joue ensuite).
  const suggestions = new Map();
  // Les coups deja connus d'une fin de partie vue jusqu'au bout (voir l'en-tete).
  let solutions = new Map();
  // L'horloge de la machine : le temps suspendu (boite du nom) n'y compte pas.
  let debutSuspension = null;
  let dureeSuspendue = 0;
  const maintenant = () => (debutSuspension ?? performance.now()) - dureeSuspendue;
  const estSuspendue = () => debutSuspension !== null;

  const pendule = (camp) => svg.querySelector(`#bouton-pendule-${camp}`);
  evaluations.definirMachines(machines);
  partie.definirNulleAutomatique(() => Boolean(machines.noir && machines.blanc));
  partie.definirPauseSansRideau(() => Boolean(machines.noir || machines.blanc));

  // Les noms (cadre vert d'une machine) et le tableau de reflexion, montre
  // seulement s'il y a une machine a la table.
  // L'abreviation de son style (« Nor ») dans la couleur de ses reglages.
  function marquerNoms() {
    for (const camp of ['noir', 'blanc']) {
      const machine = machines[camp];
      marquerNomMachine(svg, camp, { machine: Boolean(machine), enMarche: enMarche[camp] });
      colorerStyleDuNom(svg, camp, machine ? ABREVIATIONS_STYLES_IA[machine.style] : '', machine ? couleurDeLaMachineIA(machine, trouverProfilIA(machine.profil)) : null);
    }
    montrerTableau();
  }

  // Le tableau de reflexion : avec une machine a la table, ou une suggestion.
  function montrerTableau() {
    reflexion.montrer(Boolean(machines.noir || machines.blanc || hypotheseAffichee?.suggestion || reflexionEnCours?.genre === 'suggestion'));
  }
  marquerNoms();

  // Relancer (saab, 2026-10-01 : « si je remets au debut une partie, l'IA ne
  // redemarre pas ») : depuis la position regardee, les machines jouent meme
  // sur des positions deja jouees — leur coup suit la branche existante s'il
  // est le meme, en ouvre une autre sinon. La relance tient tant que la partie
  // avance d'un coup a la fois depuis la ou elle en est (machine ou humain) ;
  // naviguer ailleurs l'arrete.
  let relance = null; // { chemin } : la position ou elle en est, ou null

  // Pas a pas (saab, 2026-10-03 : « faire avancer les parties IA contre IA au
  // coup par coup ou auto ») : la machine au trait attend « Coup IA » (un coup
  // permis), et le temps avec elle — sa pendule ne tourne pas pendant qu'on
  // regarde. Auto : comme avant.
  let pasAPas = false;
  let coupsPermis = 0;
  let tempsArretePourAttendre = false;

  function suitLaRelance(chemin) {
    if (cheminsEgaux(chemin, relance.chemin)) return true;
    const unCoupDePlus = chemin.length === relance.chemin.length + 1 && cheminsEgaux(chemin.slice(0, -1), relance.chemin);
    if (unCoupDePlus) relance.chemin = chemin;
    return unCoupDePlus;
  }

  // Une position ou la machine au trait joue : une feuille, ou, en relance, une
  // position deja jouee.
  const peutJouerIci = () => partie.peutJouerUnCoup() || (relance !== null && partie.peutEnvisagerUnCoup());

  // `genre` : 'jeu' (elle joue), 'hypothese' (ce qu'elle aurait joue sur une
  // position deja jouee) ou 'suggestion' (demandee par un humain).
  function positionInchangee(etat, genre) {
    if (etatCourant(partie.obtenirArbre()) !== etat) return false;
    if (genre === 'suggestion') return true;
    return genre === 'hypothese' ? partie.peutEnvisagerUnCoup() : peutJouerIci();
  }

  // La ligne « en cours » du tableau (ou ce qu'elle aurait joue ici), et
  // l'evaluation provisoire a cote du compte d'ejections.
  function montrerReflexion() {
    if (!reflexionEnCours) {
      evaluations.definirEnCours(null);
      return reflexion.afficherEnCours(hypotheseAffichee);
    }
    const { etat, camp, coupsJoues, suivi, debut, genre, machine } = reflexionEnCours;
    evaluations.definirEnCours({ camp, profondeur: suivi.profondeur, evaluation: suivi.evaluation });
    reflexion.afficherEnCours({
      etat,
      camp,
      coupsJoues,
      duree: (maintenant() - debut) / MILLISECONDES_PAR_SECONDE,
      profondeur: suivi.profondeur,
      noeuds: suivi.noeuds,
      evaluation: suivi.evaluation,
      sequence: suivi.sequence ? textesDeLaSequence(etat, suivi.sequence) : [],
      details: suivi.details, // KAI++ : sa recherche par premier coup, et les poids de ses colonnes
      poids: machine.poids,
      version: machine.version,
      reflexionMax: machine.reflexionMax,
      hypothese: genre !== 'jeu',
      suggestion: genre === 'suggestion',
    });
  }

  // `genre` : voir positionInchangee ; `machine` : celle d'une suggestion, sinon
  // celle du camp.
  function reflechir(etat, camp, genre, machine = machines[camp]) {
    const hypothese = genre !== 'jeu';
    const suivi = {};
    const debut = maintenant();
    const arbre = partie.obtenirArbre();
    const coupsJoues = arbre.chemin.length + 1;
    const phase = phaseDeLaPartie(etat, arbre.chemin.length);
    const historique = positionsDepuisLaRacine(arbre, arbre.chemin);
    // Le livre d'ouvertures (la base de coups chargee), si la machine s'en sert
    // (saab, 2026-10-01 : case Livre, interface/choix-joueurs.js).
    const base = obtenirBase();
    const livre = machine.livre && base.size > 0 ? base : null;
    reflexionEnCours = { etat, camp, coupsJoues, suivi, debut, genre, machine };
    if (!hypothese) pendule(camp)?.classList.add('machine-reflechit');
    montrerTableau();

    function finir() {
      reflexionEnCours = null;
      hypotheseAffichee = null;
      pendule(camp)?.classList.remove('machine-reflechit');
      montrerReflexion();
    }

    // Le coup trouve, par KAI comme par KAI++ : joue (un arret demande le joue
    // tout de suite ; sinon, jamais avant la fin de l'animation du coup
    // precedent), ou retenu comme ce qu'elle aurait joue. Jamais pendant que la
    // boite du nom est ouverte.
    function jouer({ texte, source, profondeur, evaluation, noeuds, sequence }) {
      // La recherche de KAI++ par premier coup, gardee a part (interface/recherche-ia.js).
      if (suivi.details) reflexion.garderRecherche({ etat, machine: nomDeLaMachine(machine), coupsJoues, camp, genre, details: suivi.details, poids: machine.poids, version: machine.version, reflexionMax: machine.reflexionMax });
      const duree = (maintenant() - debut) / MILLISECONDES_PAR_SECONDE;
      const attente = suivi.arreter || hypothese ? 0 : Math.max(0, debut + DELAI_MINIMUM_REPONSE_MS - maintenant());
      function conclure() {
        if (estSuspendue()) return setTimeout(conclure, ATTENTE_SUSPENSION_MS);
        const encoreValable = positionInchangee(etat, genre);
        finir();
        if (!encoreValable || !texte) return;
        if (genre !== 'suggestion' && machines[camp] !== machine) return; // la boite du nom l'a remplacee entre-temps
        const reflexionIA = { source, profondeur, evaluation, noeuds, duree, sequence, phase, niveau: machine.niveau };
        if (genre === 'suggestion') {
          const ligne = `Suggestion ${commentaireDeReflexion(`${nomDeLaMachine(machine)} (profil ${machine.profil})`, reflexionIA)}`;
          suggestions.set(etat, { ...reflexionIA, etat, camp, coupsJoues, coup: texte, hypothese: true, suggestion: true, ligne, jouer: () => partie.jouerCoupTexte(texte) });
          hypotheseAffichee = null; // la surveillance l'affiche
          return;
        }
        // Saab, 2026-09-30 (« comme on est en test ») : la ligne du tableau aussi
        // en commentaire du coup, si la case du tableau est cochee.
        const commentaire = reflexion.enCommentaire() ? commentaireDeReflexion(nomDeLaMachine(machine), reflexionIA) : null;
        const jouerLeCoup = () => partie.jouerCoupTexte(texte, reflexionIA, commentaire);
        if (hypothese) return hypotheses.set(etat, { ...reflexionIA, etat, camp, coupsJoues, coup: texte, hypothese: true, jouer: jouerLeCoup });
        for (const solution of solutionsDeLaSequence(etat, sequence, evaluation)) solutions.set(solution.cle, { ...solution, machine });
        // La machine d'en face le sait aussi : elle joue sa part de la fin sans
        // chercher (saab, 2026-10-02 : « il faut qu'elle sache qu'elle a perdu »).
        // Pas si cette fin a ete vue en elaguant : rien ne dit qu'elle est forcee.
        const adverse = machines[camp === 'noir' ? 'blanc' : 'noir'];
        if (adverse && !machine.elagage) {
          for (const solution of solutionsDeLAdversaire(etat, sequence, evaluation)) if (!solutions.has(solution.cle)) solutions.set(solution.cle, { ...solution, machine: adverse });
        }
        jouerLeCoup();
      }
      setTimeout(conclure, attente);
    }

    // La suite d'une fin de partie deja vue : jouee sans chercher.
    const connue = genre === 'jeu' ? solutions.get(cleDeSolution(etat)) : null;
    if (connue?.machine === machine) {
      return jouer({ texte: connue.coup, source: 'solution', profondeur: connue.sequence.length, evaluation: connue.evaluation, noeuds: 0, sequence: connue.sequence });
    }

    const recherche = { etat, machine, suivi, historique, livre, jouer, finir };
    if (machine.moteur === 'kai++') {
      kaiPlus ??= creerKaiPlus();
      reflechirAvecKaiPlus({ ...recherche, kaiPlus, enCours: reflexionEnCours });
    } else {
      reflechirAvecKai({ ...recherche, debut, maintenant, estSuspendue, encoreUtile: () => positionInchangee(etat, genre) && (genre === 'suggestion' || machines[camp] === machine) });
    }
  }

  setInterval(() => {
    if (estSuspendue()) return;
    const arbre = partie.obtenirArbre();
    if (arbre !== arbreAffiche) {
      arbreAffiche = arbre;
      reflexion.actualiser(arbre);
      commenterLaSuggestion(arbre);
    }
    if (relance && !suitLaRelance(arbre.chemin)) relance = null;
    if (reflexionEnCours) {
      // KAI++ cherche sur un autre fil : si la position a change, on l'arrete
      // (KAI, lui, le voit a sa prochaine tranche).
      if (!positionInchangee(reflexionEnCours.etat, reflexionEnCours.genre)) reflexionEnCours.abandonner?.();
      return montrerReflexion();
    }
    const etat = etatCourant(arbre);
    const camp = etat.joueurAuTrait;
    const active = Boolean(machines[camp]) && enMarche[camp];
    const attend = active && peutJouerIci() && pasAPas && coupsPermis === 0;
    // A chaque coup d'oeil : la boite du nom, refermee, relance le temps.
    if (attend) {
      tempsArretePourAttendre = true;
      partie.suspendreLeTemps(true);
      return;
    }
    if (tempsArretePourAttendre) {
      tempsArretePourAttendre = false;
      partie.suspendreLeTemps(false);
    }
    if (active && peutJouerIci()) {
      coupsPermis = Math.max(0, coupsPermis - 1);
      return reflechir(etat, camp, 'jeu');
    }
    // Deja jouee, et pas par elle : que joue-t-elle ?
    const aEnvisager = active && partie.peutEnvisagerUnCoup() && (toujoursEnvisager || !noeudCourant(arbre).enfants.some((enfant) => enfant.reflexionIA));
    if (aEnvisager && !hypotheses.has(etat)) return reflechir(etat, camp, 'hypothese');
    const voulue = suggestions.get(etat) ?? (aEnvisager ? hypotheses.get(etat) : null) ?? null;
    if (voulue !== hypotheseAffichee) {
      hypotheseAffichee = voulue;
      montrerReflexion();
      montrerTableau();
    }
  }, VERIFICATION_MS);

  // Le coup joue depuis une position ou une suggestion avait ete demandee la
  // recoit en commentaire, qu'il soit celui suggere ou non (une seule fois).
  function commenterLaSuggestion(arbre) {
    if (arbre.chemin.length === 0) return;
    const parent = noeudA(arbre, arbre.chemin.slice(0, -1));
    const suggestion = suggestions.get(parent.etat);
    if (!suggestion) return;
    suggestions.delete(parent.etat);
    partie.ajouterAuCommentaire(arbre.chemin, suggestion.ligne);
  }

  // Annuler retire aussi le coup du joueur quand le dernier coup etait celui
  // de LA machine (voir interface/saisie.js) : apres la premiere suppression,
  // c'est a elle de jouer, et elle rejouerait aussitot. Seulement contre UNE
  // machine en marche : entre deux machines (ou une machine arretee), Annuler
  // ne retire qu'un coup.
  // Le bouton « Relancer » du tableau (voir `relance` plus haut) : les machines
  // arretees repartent aussi. Une hypothese en cours finit tout de suite.
  reflexion.brancherNavigation((chemin) => partie.sauterVersNoeud(chemin));
  reflexion.brancherPasAPas(
    (oui) => {
      pasAPas = oui;
      coupsPermis = 0;
    },
    () => {
      coupsPermis = 1;
    }
  );
  reflexion.brancherRelance(() => {
    relance = { chemin: partie.obtenirArbre().chemin };
    for (const camp of ['noir', 'blanc']) if (machines[camp]) enMarche[camp] = true;
    if (reflexionEnCours?.genre === 'hypothese') {
      reflexionEnCours.abandonner?.();
      reflexionEnCours.suivi.arreter = true;
    }
    marquerNoms();
  });

  partie.definirAnnulationEnDouble((arbre) => {
    const campHumain = machines.noir && !machines.blanc ? 'blanc' : machines.blanc && !machines.noir ? 'noir' : null;
    if (!campHumain || arbre.chemin.length === 0) return false;
    const trait = etatCourant(arbre).joueurAuTrait;
    return trait !== campHumain && enMarche[trait];
  });

  return {
    estMachine: (camp) => Boolean(machines[camp]),
    estEnMarche: (camp) => enMarche[camp],
    machineDe: (camp) => machines[camp],
    basculer: (camp) => {
      enMarche[camp] = !enMarche[camp];
      if (!enMarche[camp] && reflexionEnCours?.camp === camp) {
        reflexionEnCours.suivi.arreter = true;
        reflexionEnCours.arreterTout?.();
      }
      marquerNoms();
    },
    // La machine et le temps, suspendus puis repris (boite du nom).
    suspendre: (oui) => {
      if (oui && debutSuspension === null) debutSuspension = performance.now();
      if (!oui && debutSuspension !== null) {
        dureeSuspendue += performance.now() - debutSuspension;
        debutSuspension = null;
      }
      partie.suspendreLeTemps(oui);
    },
    // Une autre machine pour la suite de la partie (moteur/ia.js, lireMachine),
    // ou null : un humain. Une reflexion en cours pour ce camp est abandonnee.
    definirMachine: (camp, machine) => {
      if (reflexionEnCours?.camp === camp) reflexionEnCours.abandonner?.();
      machines[camp] = machine;
      enMarche[camp] = true;
      evaluations.definirMachines(machines);
      hypotheses = new WeakMap(); // ce qu'elle aurait joue avec ses anciens reglages
      solutions = new Map();
      marquerNoms();
    },
    // Une suggestion de `machine` pour le camp au trait (voir l'en-tete).
    suggerer: (machine) => {
      const etat = etatCourant(partie.obtenirArbre());
      if (etat.vainqueur) return;
      suggestions.delete(etat);
      // Une hypothese en cours cede la place ; un coup de la machine, lui, finit.
      if (reflexionEnCours?.genre === 'hypothese') {
        reflexionEnCours.abandonner?.();
        reflexionEnCours.suivi.arreter = true;
      }
      const lancer = () => (reflexionEnCours ? setTimeout(lancer, VERIFICATION_MS) : reflechir(etat, etat.joueurAuTrait, 'suggestion', machine));
      lancer();
    },
  };
}
