// Les machines a la table (phase 29 ⚠, PLAN.md ; phase 32 : une par camp, ou
// deux, machine contre machine). Surveille la partie, et des que c'est au camp
// d'une machine EN MARCHE de jouer sur une position jouable (ni pause, ni
// historique, ni position close), cherche son coup (moteur/ia.js) PAR TRANCHES
// de quelques millisecondes — entre deux tranches le navigateur fait avancer
// les pendules et repond aux clics : rien ne se fige, meme 10 s de reflexion
// sur telephone. Puis elle joue par le meme chemin qu'un coup choisi dans les
// Conseils (partie.jouerCoupTexte), jamais une regle a part, en laissant sur
// le coup ce qu'elle en a pense (tableau de reflexion, interface/reflexion-ia.js).
//
// Sa pendule tourne pendant qu'elle reflechit, comme pour un joueur (saab) :
// sa reflexion est bornee par `reflexionMax` (reglable au debut de partie).
// Sa pendule clignote pendant ce temps (styles.css, .machine-reflechit).
//
// Marche / Arret (phase 32, saab, boite du nom) : Arret pendant qu'elle
// reflechit lui fait jouer TOUT DE SUITE le meilleur coup deja trouve
// (moteur/ia-recherche.js, suivi.arreter), puis elle ne joue plus ; Arret
// quand ce n'est pas son tour l'arrete seulement ; Marche la relance.
//
// Surveillance par un simple coup d'oeil regulier (VERIFICATION_MS) plutot
// qu'un branchement sur chaque evenement : un coup, une navigation, une pause
// levee d'un clic sur la pendule, Annuler... tous passent par des chemins
// differents, et en oublier un laisserait la machine muette. Si la position
// change PENDANT la reflexion, le coup trouve n'est pas joue (il repondait a
// une autre position) : la surveillance relance une reflexion neuve.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : choisirCoupIA,
// textesDeLaSequence, coupDuLivre, poidsEnTexte, lireReponseKaiPlus,
// coupsDesPositions (moteur/ia.js), NIVEAUX_IA (moteur/ia-recherche.js),
// ecrirePosition (moteur/notation.js), creerKaiPlus (interface/kai-plus.js), phaseDeLaPartie (moteur/ia-evaluation.js),
// etatCourant (moteur/arbre.js), positionsDepuisLaRacine (interface/nulle.js),
// marquerNomMachine (rendu/ligne-joueur.js) viennent de fichiers charges avant
// celui-ci.

const VERIFICATION_MS = 250;
// Une tranche de recherche : court devant les 16 ms d'une image, pour que
// l'animation et les pendules restent fluides.
const DUREE_TRANCHE_MS = 12;
// Jamais une reponse plus rapide que ca : le coup du joueur (animation de 300
// ms, rendu/animation.js) doit avoir fini de glisser avant qu'on voie la
// reponse, meme quand elle a ete trouvee en 3 ms.
const DELAI_MINIMUM_REPONSE_MS = 600;
const MILLISECONDES_PAR_SECONDE = 1000;
// Le hasard des coups egaux de KAI++ : une graine entiere positive (32 bits signes).
const GRAINE_MAXIMUM = 2 ** 31;

// `partie` : ce que renvoie demarrerPartie (interface/saisie.js).
// `machines` : { noir, blanc }, chacune un reglage (moteur/ia.js, lireMachine)
// ou null. `obtenirBase()` : la base de coups chargee (le livre d'ouvertures),
// Map vide tant qu'elle se charge. `svg` : #plateau (pendule qui clignote).
// `reflexion` : interface/reflexion-ia.js ; `evaluations` :
// interface/evaluations.js. Renvoie { estMachine, estEnMarche, basculer } pour
// la boite du nom (interface/noms-joueurs.js).
//
// Entre deux machines, une nulle par repetition est acceptee toute seule (saab :
// « 3 Occ et Nulle automatique validee ») ; chacune sait qu'un coup qui fait
// revenir une position une troisieme fois mene a la nulle (moteur/ia-recherche.js,
// historique) et ne le choisit que si tout le reste est pire pour elle.
function demarrerMachines({ partie, machines, obtenirBase, svg, reflexion, evaluations }) {
  const enMarche = { noir: true, blanc: true };
  let reflexionEnCours = null; // { etat, camp, suivi, debut, arreterTout?, abandonner? }, ou null
  let kaiPlus = null; // le worker de KAI++, cree a sa premiere reflexion
  let arbreAffiche = null;

  const pendule = (camp) => svg.querySelector(`#bouton-pendule-${camp}`);
  evaluations.definirMachines(machines);
  partie.definirNulleAutomatique(() => Boolean(machines.noir && machines.blanc));

  function marquerNoms() {
    for (const camp of ['noir', 'blanc']) marquerNomMachine(svg, camp, { machine: Boolean(machines[camp]), enMarche: enMarche[camp] });
  }
  marquerNoms();

  function positionInchangee(etat) {
    return etatCourant(partie.obtenirArbre()) === etat && partie.peutJouerUnCoup();
  }

  // La ligne « en cours » du tableau, et l'evaluation provisoire sur le nom.
  function montrerReflexion() {
    if (!reflexionEnCours) {
      evaluations.definirEnCours(null);
      return reflexion.afficherEnCours(null);
    }
    const { etat, camp, suivi, debut } = reflexionEnCours;
    evaluations.definirEnCours({ camp, profondeur: suivi.profondeur, evaluation: suivi.evaluation });
    reflexion.afficherEnCours({
      camp,
      coupsJoues: partie.obtenirArbre().chemin.length + 1,
      duree: (performance.now() - debut) / MILLISECONDES_PAR_SECONDE,
      profondeur: suivi.profondeur,
      noeuds: suivi.noeuds,
      evaluation: suivi.evaluation,
      sequence: suivi.sequence ? textesDeLaSequence(etat, suivi.sequence) : [],
    });
  }

  function reflechir(etat, camp) {
    const machine = machines[camp];
    const suivi = {};
    const debut = performance.now();
    const arbre = partie.obtenirArbre();
    const phase = phaseDeLaPartie(etat, arbre.chemin.length);
    const historique = positionsDepuisLaRacine(arbre, arbre.chemin);
    const base = obtenirBase();
    const livre = base.size > 0 ? base : null;
    reflexionEnCours = { etat, camp, suivi, debut };
    pendule(camp)?.classList.add('machine-reflechit');

    function finir() {
      reflexionEnCours = null;
      pendule(camp)?.classList.remove('machine-reflechit');
      montrerReflexion();
    }

    // Joue le coup trouve, par KAI comme par KAI++. Un arret demande (boite du
    // nom) joue tout de suite ; sinon, jamais avant la fin de l'animation du
    // coup precedent.
    function jouer({ texte, source, profondeur, evaluation, noeuds, sequence }) {
      const duree = (performance.now() - debut) / MILLISECONDES_PAR_SECONDE;
      const attente = suivi.arreter ? 0 : Math.max(0, debut + DELAI_MINIMUM_REPONSE_MS - performance.now());
      setTimeout(() => {
        const encoreValable = positionInchangee(etat);
        finir();
        if (encoreValable && texte) partie.jouerCoupTexte(texte, { source, profondeur, evaluation, noeuds, duree, sequence, phase });
      }, attente);
    }

    if (machine.moteur === 'kai++') reflechirAvecKaiPlus({ etat, machine, suivi, historique, livre, jouer, finir });
    else reflechirAvecKai({ etat, machine, suivi, debut, historique, livre, jouer, finir });
  }

  // KAI : la recherche en JavaScript, deroulee par tranches sur ce fil (voir
  // l'en-tete du fichier).
  function reflechirAvecKai({ etat, machine, suivi, debut, historique, livre, jouer, finir }) {
    const recherche = choisirCoupIA(etat, {
      niveau: machine.niveau,
      poids: machine.poids,
      version: machine.version,
      base: livre,
      hasard: Math.random,
      maintenant: () => performance.now(),
      echeance: debut + machine.reflexionMax * MILLISECONDES_PAR_SECONDE,
      suivi,
      historique,
    });
    function tranche() {
      if (!positionInchangee(etat)) return finir();
      const finDeTranche = performance.now() + DUREE_TRANCHE_MS;
      let pas = recherche.next();
      while (!pas.done && performance.now() < finDeTranche) pas = recherche.next();
      if (!pas.done) return setTimeout(tranche, 0);
      jouer(pas.value);
    }
    setTimeout(tranche, 0);
  }

  // KAI++ (phase 33bis) : le meme livre d'ouvertures, puis la recherche en C++
  // dans son worker (interface/kai-plus.js). Elle rend des positions ; les coups
  // en sont retrouves par les regles (moteur/ia.js, coupsDesPositions). Au
  // niveau 3 elle va aussi loin que son temps le permet (NIVEAUX_IA).
  function reflechirAvecKaiPlus({ etat, machine, suivi, historique, livre, jouer, finir }) {
    const duLivre = coupDuLivre(livre, etat, Math.random);
    if (duLivre) return jouer({ texte: duLivre.texte, source: 'livre', profondeur: 0, evaluation: null, noeuds: 0, sequence: [duLivre.texte] });
    kaiPlus ??= creerKaiPlus();
    let derniere = null; // la derniere profondeur annoncee
    let abandonnee = false;
    reflexionEnCours.arreterTout = () => {
      if (derniere) kaiPlus.interrompre(); // sinon : a la premiere annonce, voir plus bas
    };
    reflexionEnCours.abandonner = () => {
      abandonnee = true;
      kaiPlus.interrompre();
    };
    const niveau = NIVEAUX_IA[machine.niveau];
    kaiPlus
      .chercher(
        {
          position: ecrirePosition(etat),
          joueurNoir: etat.joueurAuTrait === 'noir',
          profondeur: niveau.profondeurKaiPlus ?? niveau.profondeur,
          poids: poidsEnTexte(machine.poids),
          version: machine.version,
          graine: Math.floor(Math.random() * GRAINE_MAXIMUM),
          dureeMs: machine.reflexionMax * MILLISECONDES_PAR_SECONDE,
          historique: historique.join('\n'),
        },
        (texte) => {
          const reponse = lireReponseKaiPlus(texte);
          if (!reponse) return;
          derniere = reponse;
          Object.assign(suivi, { profondeur: reponse.profondeur, evaluation: reponse.evaluation, noeuds: reponse.noeuds, sequence: coupsDesPositions(etat, reponse.positions) });
          if (suivi.arreter) kaiPlus.interrompre();
        }
      )
      .then((texte) => {
        const reponse = lireReponseKaiPlus(texte) ?? derniere;
        if (abandonnee || !reponse) return finir();
        const textes = textesDeLaSequence(etat, coupsDesPositions(etat, reponse.positions));
        jouer({ texte: textes[0], source: 'recherche', profondeur: reponse.profondeur, evaluation: reponse.evaluation, noeuds: reponse.noeuds, sequence: textes });
      });
  }

  setInterval(() => {
    const arbre = partie.obtenirArbre();
    if (arbre !== arbreAffiche) {
      arbreAffiche = arbre;
      reflexion.actualiser(arbre);
    }
    if (reflexionEnCours) {
      // KAI++ cherche sur un autre fil : si la position a change, on l'arrete
      // (KAI, lui, le voit a sa prochaine tranche).
      if (!positionInchangee(reflexionEnCours.etat)) reflexionEnCours.abandonner?.();
      return montrerReflexion();
    }
    if (!partie.peutJouerUnCoup()) return;
    const etat = etatCourant(arbre);
    const camp = etat.joueurAuTrait;
    if (machines[camp] && enMarche[camp]) reflechir(etat, camp);
  }, VERIFICATION_MS);

  // Annuler retire aussi le coup du joueur quand le dernier coup etait celui
  // de LA machine (voir interface/saisie.js) : apres la premiere suppression,
  // c'est a elle de jouer, et elle rejouerait aussitot. Seulement contre UNE
  // machine en marche : entre deux machines (ou une machine arretee), Annuler
  // ne retire qu'un coup.
  const campHumain = !machines.noir ? 'noir' : !machines.blanc ? 'blanc' : null;
  partie.definirAnnulationEnDouble((arbre) => {
    if (!campHumain || arbre.chemin.length === 0) return false;
    const trait = etatCourant(arbre).joueurAuTrait;
    return trait !== campHumain && enMarche[trait];
  });

  return {
    estMachine: (camp) => Boolean(machines[camp]),
    estEnMarche: (camp) => enMarche[camp],
    basculer: (camp) => {
      enMarche[camp] = !enMarche[camp];
      if (!enMarche[camp] && reflexionEnCours?.camp === camp) {
        reflexionEnCours.suivi.arreter = true;
        reflexionEnCours.arreterTout?.();
      }
      marquerNoms();
    },
  };
}
