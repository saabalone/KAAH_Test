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
// textesDeLaSequence (moteur/ia.js), phaseDeLaPartie (moteur/ia-evaluation.js),
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
  let reflexionEnCours = null; // { etat, camp, suivi, debut }, ou null
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
    reflexionEnCours = { etat, camp, suivi, debut };
    pendule(camp)?.classList.add('machine-reflechit');
    const base = obtenirBase();
    const recherche = choisirCoupIA(etat, {
      niveau: machine.niveau,
      poids: machine.poids,
      base: base.size > 0 ? base : null,
      hasard: Math.random,
      maintenant: () => performance.now(),
      echeance: debut + machine.reflexionMax * MILLISECONDES_PAR_SECONDE,
      suivi,
      historique: positionsDepuisLaRacine(arbre, arbre.chemin),
    });

    function finir() {
      reflexionEnCours = null;
      pendule(camp)?.classList.remove('machine-reflechit');
      montrerReflexion();
    }

    function tranche() {
      if (!positionInchangee(etat)) return finir();
      const finDeTranche = performance.now() + DUREE_TRANCHE_MS;
      let pas = recherche.next();
      while (!pas.done && performance.now() < finDeTranche) pas = recherche.next();
      if (!pas.done) return setTimeout(tranche, 0);
      const { texte, source, profondeur, evaluation, noeuds, sequence } = pas.value;
      const duree = (performance.now() - debut) / MILLISECONDES_PAR_SECONDE;
      // Un arret demande (boite du nom) joue tout de suite ; sinon, jamais avant
      // la fin de l'animation du coup precedent.
      const attente = suivi.arreter ? 0 : Math.max(0, debut + DELAI_MINIMUM_REPONSE_MS - performance.now());
      setTimeout(() => {
        const encoreValable = positionInchangee(etat);
        finir();
        if (encoreValable) partie.jouerCoupTexte(texte, { source, profondeur, evaluation, noeuds, duree, sequence, phase });
      }, attente);
    }
    setTimeout(tranche, 0);
  }

  setInterval(() => {
    const arbre = partie.obtenirArbre();
    if (arbre !== arbreAffiche) {
      arbreAffiche = arbre;
      reflexion.actualiser(arbre);
    }
    if (reflexionEnCours) return montrerReflexion();
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
      if (!enMarche[camp] && reflexionEnCours?.camp === camp) reflexionEnCours.suivi.arreter = true;
      marquerNoms();
    },
  };
}
