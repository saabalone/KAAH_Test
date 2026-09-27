// La machine a la table (phase 29 ⚠, PLAN.md) : surveille la partie, et des
// que c'est a elle de jouer sur le point vivant (ni pause, ni historique, ni
// partie finie), cherche son coup (moteur/ia.js) PAR TRANCHES de quelques
// millisecondes — entre deux tranches le navigateur fait avancer les pendules
// et repond aux clics : rien ne se fige, meme 10 s de reflexion sur telephone.
// Puis elle joue par le meme chemin qu'un coup choisi dans les Conseils
// (partie.jouerCoupTexte), jamais une regle a part.
//
// Sa pendule tourne pendant qu'elle reflechit, comme pour un joueur (saab) :
// sa reflexion est bornee par `reflexionMax` (reglable au debut de partie).
// Sa pendule clignote pendant ce temps (styles.css, .machine-reflechit).
//
// Surveillance par un simple coup d'oeil regulier (VERIFICATION_MS) plutot
// qu'un branchement sur chaque evenement : un coup, une navigation, une pause
// levee d'un clic sur la pendule, Annuler... tous passent par des chemins
// differents, et en oublier un laisserait la machine muette. Si la position
// change PENDANT la reflexion, le coup trouve n'est pas joue (il repondait a
// une autre position) : la surveillance relance une reflexion neuve.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : choisirCoupIA
// (moteur/ia.js), etatCourant (moteur/arbre.js) viennent de fichiers charges
// avant celui-ci.

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
// `adversaire` : { niveau, style, camp, reflexionMax } (moteur/ia.js,
// lireAdversaire). `obtenirBase()` : la base de coups chargee (le livre
// d'ouvertures), Map vide tant qu'elle se charge. `svg` : #plateau (pendule
// qui clignote).
function demarrerMachine({ partie, adversaire, obtenirBase, svg }) {
  let reflexionEnCours = null; // l'etat auquel la machine repond, ou null

  const pendule = () => svg.querySelector(`#bouton-pendule-${adversaire.camp}`);
  function marquerReflexion(active) {
    pendule()?.classList.toggle('machine-reflechit', active);
  }

  function positionInchangee(etat) {
    return etatCourant(partie.obtenirArbre()) === etat && partie.peutJouerUnCoup();
  }

  function reflechir(etat) {
    reflexionEnCours = etat;
    marquerReflexion(true);
    const debut = performance.now();
    const base = obtenirBase();
    const recherche = choisirCoupIA(etat, {
      niveau: adversaire.niveau,
      style: adversaire.style,
      base: base.size > 0 ? base : null,
      hasard: Math.random,
      maintenant: () => performance.now(),
      echeance: debut + adversaire.reflexionMax * MILLISECONDES_PAR_SECONDE,
    });

    function finir() {
      reflexionEnCours = null;
      marquerReflexion(false);
    }

    function tranche() {
      if (!positionInchangee(etat)) return finir();
      const finDeTranche = performance.now() + DUREE_TRANCHE_MS;
      let pas = recherche.next();
      while (!pas.done && performance.now() < finDeTranche) pas = recherche.next();
      if (!pas.done) return setTimeout(tranche, 0);
      const attente = Math.max(0, debut + DELAI_MINIMUM_REPONSE_MS - performance.now());
      setTimeout(() => {
        const encoreValable = positionInchangee(etat);
        finir();
        if (encoreValable) partie.jouerCoupTexte(pas.value.texte);
      }, attente);
    }
    setTimeout(tranche, 0);
  }

  setInterval(() => {
    if (reflexionEnCours || !partie.peutJouerUnCoup()) return;
    const etat = etatCourant(partie.obtenirArbre());
    if (etat.joueurAuTrait === adversaire.camp) reflechir(etat);
  }, VERIFICATION_MS);

  // Annuler retire aussi le coup du joueur quand le dernier coup etait celui
  // de la machine (voir interface/saisie.js) : apres la premiere suppression,
  // c'est a elle de jouer.
  partie.definirAnnulationEnDouble((arbre) => arbre.chemin.length > 0 && etatCourant(arbre).joueurAuTrait === adversaire.camp);
}
