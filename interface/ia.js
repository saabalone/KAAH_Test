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
// le coup etait deja joue avant qu'on ait touche Arret ; on y change aussi son
// profil IA (changerProfil).
//
// Sur une position DEJA JOUEE (on est revenu en arriere, et le coup qui suit
// n'est pas le sien — joue a sa place), une machine en marche cherche quand
// meme et montre dans le tableau ce qu'elle AURAIT joue, sans le jouer : on
// peut toujours naviguer. Toucher ce coup le joue (une nouvelle branche), et la
// partie repart de la (saab, 2026-09-30).
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
// (moteur/sequence-prevue.js), machineDuProfil (moteur/profils-ia.js),
// trouverProfilIA (interface/profils-ia.js), reflechirAvecKai,
// reflechirAvecKaiPlus, MILLISECONDES_PAR_SECONDE, ATTENTE_SUSPENSION_MS
// (interface/ia-reflexion.js), creerKaiPlus (interface/kai-plus.js),
// phaseDeLaPartie (moteur/ia-evaluation.js), etatCourant, noeudCourant
// (moteur/arbre.js), positionsDepuisLaRacine (interface/nulle.js),
// marquerNomMachine (rendu/ligne-joueur.js) viennent de fichiers charges avant
// celui-ci.

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
function demarrerMachines({ partie, machines, obtenirBase, svg, reflexion, evaluations }) {
  const enMarche = { noir: true, blanc: true };
  // { etat, camp, coupsJoues, suivi, debut, hypothese, arreterTout?, abandonner? }, ou null
  let reflexionEnCours = null;
  let kaiPlus = null; // le worker de KAI++, cree a sa premiere reflexion
  let arbreAffiche = null;
  // Ce qu'elle aurait joue sur des positions deja jouees (voir l'en-tete),
  // et celle de ces reponses que le tableau montre.
  let hypotheses = new WeakMap();
  let hypotheseAffichee = null;
  // L'horloge de la machine : le temps suspendu (boite du nom) n'y compte pas.
  let debutSuspension = null;
  let dureeSuspendue = 0;
  const maintenant = () => (debutSuspension ?? performance.now()) - dureeSuspendue;
  const estSuspendue = () => debutSuspension !== null;

  const pendule = (camp) => svg.querySelector(`#bouton-pendule-${camp}`);
  evaluations.definirMachines(machines);
  partie.definirNulleAutomatique(() => Boolean(machines.noir && machines.blanc));

  function marquerNoms() {
    for (const camp of ['noir', 'blanc']) marquerNomMachine(svg, camp, { machine: Boolean(machines[camp]), enMarche: enMarche[camp] });
  }
  marquerNoms();

  function positionInchangee(etat, hypothese) {
    if (etatCourant(partie.obtenirArbre()) !== etat) return false;
    return hypothese ? partie.peutEnvisagerUnCoup() : partie.peutJouerUnCoup();
  }

  // La ligne « en cours » du tableau (ou ce qu'elle aurait joue ici), et
  // l'evaluation provisoire a cote du compte d'ejections.
  function montrerReflexion() {
    if (!reflexionEnCours) {
      evaluations.definirEnCours(null);
      return reflexion.afficherEnCours(hypotheseAffichee);
    }
    const { etat, camp, coupsJoues, suivi, debut, hypothese } = reflexionEnCours;
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
      hypothese,
    });
  }

  // `hypothese` : sur une position deja jouee, elle cherche sans jouer.
  function reflechir(etat, camp, hypothese) {
    const machine = machines[camp];
    const suivi = {};
    const debut = maintenant();
    const arbre = partie.obtenirArbre();
    const coupsJoues = arbre.chemin.length + 1;
    const phase = phaseDeLaPartie(etat, arbre.chemin.length);
    const historique = positionsDepuisLaRacine(arbre, arbre.chemin);
    const base = obtenirBase();
    const livre = base.size > 0 ? base : null;
    reflexionEnCours = { etat, camp, coupsJoues, suivi, debut, hypothese };
    if (!hypothese) pendule(camp)?.classList.add('machine-reflechit');

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
      const duree = (maintenant() - debut) / MILLISECONDES_PAR_SECONDE;
      const attente = suivi.arreter || hypothese ? 0 : Math.max(0, debut + DELAI_MINIMUM_REPONSE_MS - maintenant());
      function conclure() {
        if (estSuspendue()) return setTimeout(conclure, ATTENTE_SUSPENSION_MS);
        const encoreValable = positionInchangee(etat, hypothese);
        finir();
        if (!encoreValable || !texte) return;
        const reflexionIA = { source, profondeur, evaluation, noeuds, duree, sequence, phase };
        // Saab, 2026-09-30 (« comme on est en test ») : la ligne du tableau aussi
        // en commentaire du coup, si la case du tableau est cochee.
        const commentaire = reflexion.enCommentaire() ? commentaireDeReflexion(nomDeLaMachine(machine), reflexionIA) : null;
        const jouerLeCoup = () => partie.jouerCoupTexte(texte, reflexionIA, commentaire);
        if (!hypothese) return jouerLeCoup();
        hypotheses.set(etat, { ...reflexionIA, etat, camp, coupsJoues, coup: texte, hypothese: true, jouer: jouerLeCoup });
      }
      setTimeout(conclure, attente);
    }

    const recherche = { etat, machine, suivi, historique, livre, jouer, finir };
    if (machine.moteur === 'kai++') {
      kaiPlus ??= creerKaiPlus();
      reflechirAvecKaiPlus({ ...recherche, kaiPlus, enCours: reflexionEnCours });
    } else {
      reflechirAvecKai({ ...recherche, debut, maintenant, estSuspendue, encoreUtile: () => positionInchangee(etat, hypothese) });
    }
  }

  setInterval(() => {
    if (estSuspendue()) return;
    const arbre = partie.obtenirArbre();
    if (arbre !== arbreAffiche) {
      arbreAffiche = arbre;
      reflexion.actualiser(arbre);
    }
    if (reflexionEnCours) {
      // KAI++ cherche sur un autre fil : si la position a change, on l'arrete
      // (KAI, lui, le voit a sa prochaine tranche).
      if (!positionInchangee(reflexionEnCours.etat, reflexionEnCours.hypothese)) reflexionEnCours.abandonner?.();
      return montrerReflexion();
    }
    const etat = etatCourant(arbre);
    const camp = etat.joueurAuTrait;
    const active = Boolean(machines[camp]) && enMarche[camp];
    if (active && partie.peutJouerUnCoup()) return reflechir(etat, camp, false);
    // Deja jouee, et pas par elle : que joue-t-elle ?
    const aEnvisager = active && partie.peutEnvisagerUnCoup() && !noeudCourant(arbre).enfants.some((enfant) => enfant.reflexionIA);
    if (aEnvisager && !hypotheses.has(etat)) return reflechir(etat, camp, true);
    const voulue = aEnvisager ? hypotheses.get(etat) : null;
    if (voulue !== hypotheseAffichee) {
      hypotheseAffichee = voulue;
      montrerReflexion();
    }
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
    // Un autre profil IA pour la suite de la partie (meme moteur, niveau et
    // temps de reflexion). Renvoie ses noms automatiques, ancien et nouveau
    // (moteur/ia.js, nomDeLaMachine), ou null.
    changerProfil: (camp, nomProfil) => {
      const profil = trouverProfilIA(nomProfil);
      const ancienne = machines[camp];
      if (!profil || !ancienne) return null;
      machines[camp] = machineDuProfil(profil, { niveau: ancienne.niveau, reflexionMax: ancienne.reflexionMax, moteur: ancienne.moteur });
      evaluations.definirMachines(machines);
      hypotheses = new WeakMap(); // ce qu'elle aurait joue avec ses anciens poids
      return { ancienNom: nomDeLaMachine(ancienne), nouveauNom: nomDeLaMachine(machines[camp]) };
    },
  };
}
