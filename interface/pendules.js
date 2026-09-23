// Fait vivre les pendules en temps reel. Aucune regle de calcul ici (voir
// moteur/pendules.js) : ce fichier se contente de declencher ecoulerTemps
// au bon rythme et de mettre a jour l'affichage.
//
// Le point important : on ne compte JAMAIS un intervalle suppose fixe. A
// chaque verification, on mesure le temps REELLEMENT ecoule depuis la
// derniere fois (Date.now()), et c'est CE temps-la qu'on applique. Les
// navigateurs ralentissent ou suspendent les minuteurs des onglets
// caches : si on comptait juste "250ms passees" a chaque appel, un onglet
// mis en arriere-plan ferait dériver les pendules (le vrai temps passe
// serait plus grand que ce qu'on aurait compte). En mesurant l'ecart reel
// a chaque reveil, la pendule rattrape toujours exactement le temps qui
// s'est vraiment ecoule — voir CLAUDE.md, critere de fin de cette phase.
//
// Naviguer dans l'historique (interface/saisie.js) affiche un APERCU : le
// temps TEL QU'IL ETAIT au noeud regarde (voir moteur/arbre.js,
// marquerPendulesSnapshot), comme dans KAAWA. Le VRAI decompte en direct
// (`pendules`) continue d'exister sans bouger pendant ce temps — il ne
// reprend, exactement d'ou il en etait reste, que lorsqu'on revient sur
// le point vivant de la partie (voir `afficherApercu`/`quitterApercu`).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerPendules,
// ecoulerTemps, appliquerBonusDeCoup et passerEnChrono viennent de
// moteur/pendules.js, charge avant celui-ci dans index.html.

const INTERVALLE_DE_VERIFICATION_MS = 250;

// Seuil d'alerte visuelle (fond rouge), en secondes restantes — meme
// valeur par defaut que KAAWA (`time_alert_seconds`). Reglable par
// l'utilisateur avec le reste des pendules a la phase 22 ; fige ici pour
// l'instant, comme tempsInitial et bonusParCoup dans index.html.
const SECONDES_ALERTE_PENDULE = 30;

// `surAlerteTemps` (facultatif, phase 21) : appele UNE FOIS par tour, quand le
// temps du joueur au trait passe sous SECONDES_ALERTE_PENDULE (KAAWA :
// `_time_alert_fired`, remis a zero a chaque coup).
//
// Demarre les pendules. `reglagesPendules` : voir
// moteur.creerPendules. `elementsAffichage` : { noir, blanc }, deux
// elements dont on definit le texte (format m:ss). `surDefaite(camp)` est
// appele une seule fois si un camp tombe a zero — la partie continue
// ensuite en analyse (voir interface/saisie.js) : plutot que d'arreter le
// minuteur, on bascule en chrono (passerEnChrono), qui ne fait jamais
// perdre, pour que le compte a rebours expire ne se redeclenche pas a
// chaque verification suivante.
//
// `tempsRepris` (facultatif) : { tempsNoir, tempsBlanc } — reprend une
// partie deja sauvegardee EXACTEMENT au temps qu'il lui restait, plutot
// que de repartir a `reglagesPendules.tempsInitial` (correctif demande
// par saab : fermer/rouvrir l'appli, ou reprendre une partie en cours
// depuis "Mes parties", remettait les pendules a plein temps — "pas bon"
// des qu'il fallait fermer/rouvrir apres un blocage de l'ecran). Un
// simple ecrasement de `tempsNoir`/`tempsBlanc` juste apres la creation :
// les REGLAGES (bonus, delai...) restent ceux de `reglagesPendules`,
// seuls les DEUX COMPTEURS EN DIRECT sont repris. La partie recommence de
// toute facon toujours EN PAUSE MANUELLE (`pauseManuelle` commence a
// `true` plus bas, sans lien avec ce parametre) : reprendre a l'heure
// exacte ET en pause, jamais un decompte qui continuerait tout seul.
function demarrerPendules(reglagesPendules, elementsAffichage, surDefaite, tempsRepris, surAlerteTemps) {
  let pendules = creerPendules(reglagesPendules);
  if (tempsRepris) {
    pendules = { ...pendules, tempsNoir: tempsRepris.tempsNoir, tempsBlanc: tempsRepris.tempsBlanc };
  }
  // Le libelle de mode (phase 22bis) vit dans sa propre bande du plateau
  // (rendu/pendule.js, dessinerLibellePendule), jamais transmis par
  // `elementsAffichage` : le retrouver depuis le meme <svg> evite d'ajouter
  // un parametre de plus a chaque appelant.
  const elementsLibelles = {
    noir: elementsAffichage.noir.closest('svg')?.querySelector('#libelle-pendule-noir'),
    blanc: elementsAffichage.blanc.closest('svg')?.querySelector('#libelle-pendule-blanc'),
  };
  let joueurAuTrait = 'noir';
  let dernierInstant = Date.now();
  let arrete = false;
  let enPause = false;
  let apercu = null; // instantane affiche a la place du direct, voir afficherApercu
  // Pause DEMANDEE PAR LE JOUEUR (clic sur une pendule, ou sur le grand
  // bouton rond — voir rendu/pendule.js et index.html), a ne jamais
  // confondre avec `enPause` ci-dessus (celle-la vient de la navigation
  // dans l'historique, involontaire de ce point de vue). Les deux arretent
  // le decompte, mais quitterApercu (navigation) ne doit jamais lever une
  // pause manuelle par accident, ni l'inverse.
  //
  // Commence a TRUE (signale par saab) : une partie neuve OU reprise ne
  // doit jamais decompter toute seule des l'affichage — seul un clic
  // explicite sur une pendule (ou le grand bouton rond) demarre vraiment
  // le decompte, comme un vrai Start. index.html affiche le grand bouton
  // rond des la creation si c'est le cas (voir demarrerPartie).
  let pauseManuelle = true;
  let alerteTempsDonnee = false;

  afficherPendules();
  const identifiantMinuteur = setInterval(verifier, INTERVALLE_DE_VERIFICATION_MS);

  // Le temps du joueur au trait vient de passer sous le seuil : une seule fois
  // par tour, et seulement en mode pendule (un chrono ne fait jamais perdre).
  function verifierAlerteTemps() {
    if (alerteTempsDonnee || pendules.mode !== 'pendule') return;
    const tempsRestant = joueurAuTrait === 'noir' ? pendules.tempsNoir : pendules.tempsBlanc;
    if (tempsRestant > 0 && tempsRestant <= SECONDES_ALERTE_PENDULE) {
      alerteTempsDonnee = true;
      surAlerteTemps?.();
    }
  }

  function verifier() {
    if (arrete || enPause || pauseManuelle) return;
    const maintenant = Date.now();
    const secondesEcoulees = (maintenant - dernierInstant) / 1000;
    dernierInstant = maintenant;

    pendules = ecoulerTemps(pendules, joueurAuTrait, secondesEcoulees);
    afficherPendules();
    verifierAlerteTemps();

    if (pendules.perdantParTemps) {
      const perdant = pendules.perdantParTemps;
      basculerEnChrono();
      surDefaite(perdant);
    }
  }

  // A appeler juste apres qu'un coup soit joue par `joueurQuiAJoue`.
  function surCoupJoue(joueurQuiAJoue, ejection) {
    // On rattrape d'abord le court instant ecoule depuis la derniere
    // verification periodique, pour qu'il soit compte pour le joueur qui
    // vient de jouer et non, par erreur, pour le suivant.
    const maintenant = Date.now();
    pendules = ecoulerTemps(pendules, joueurQuiAJoue, (maintenant - dernierInstant) / 1000);
    dernierInstant = maintenant;

    pendules = appliquerBonusDeCoup(pendules, joueurQuiAJoue, ejection);
    joueurAuTrait = joueurQuiAJoue === 'noir' ? 'blanc' : 'noir';
    alerteTempsDonnee = false; // un nouveau tour : l'alerte peut sonner de nouveau
    afficherPendules();

    if (pendules.perdantParTemps) {
      const perdant = pendules.perdantParTemps;
      basculerEnChrono();
      surDefaite(perdant);
    }
  }

  // Bascule vers le chrono (voir moteur.passerEnChrono) : appele au
  // premier temps ecoule (ci-dessus), mais aussi depuis l'exterieur
  // (interface/saisie.js) des qu'une partie se termine par ejections —
  // pour que le decompte ne puisse plus faire perdre pendant l'analyse
  // qui suit.
  function basculerEnChrono() {
    pendules = passerEnChrono(pendules); // fonction moteur, voir l'en-tete du fichier
    afficherPendules();
  }

  // Affiche `instantane` (voir moteur.marquerPendulesSnapshot) a la place
  // du direct, et suspend le decompte : utilise en parcourant
  // l'historique, exactement comme KAAWA fige les pendules a leur valeur
  // d'alors pendant la navigation. N'affecte jamais `pendules` (le VRAI
  // etat en direct), qui continue d'exister sans bouger pendant ce temps.
  function afficherApercu(instantane) {
    apercu = instantane;
    enPause = true;
    afficherPendules();
  }

  // Revient au direct : ce qu'on regardait pendant l'apercu n'a pas
  // avance puisque rien ne l'a fait avancer, on repart exactement d'ou le
  // direct en etait reste (pas de rattrapage du temps passe a naviguer).
  function quitterApercu() {
    if (apercu === null) return;
    apercu = null;
    enPause = false;
    dernierInstant = Date.now();
    afficherPendules();
  }

  // Un instantane du direct actuel, pour que interface/saisie.js le pose
  // sur le noeud qui vient d'etre cree (voir moteur.marquerPendulesSnapshot).
  function etatActuel() {
    return { ...pendules };
  }

  function arreter() {
    arrete = true;
    clearInterval(identifiantMinuteur);
  }

  // Bascule la pause manuelle (clic sur une pendule ou sur le grand
  // bouton rond, voir interface/saisie.js). REFUSEE quand le decompte est
  // deja fige pour une autre raison (`apercu` : navigation dans
  // l'historique, ou partie terminee — voir synchroniserPendulesAvecEtat) :
  // mettre en pause une partie finie n'a aucun sens.
  //
  // Renvoie si la bascule A EU LIEU, jamais l'etat obtenu (lire
  // estEnPauseManuelle pour ca). Bug signale par saab : en renvoyant
  // l'etat, un refus sur une partie TERMINEE renvoyait quand meme `true`
  // quand la partie n'avait pas encore ete demarree (l'etat de depart),
  // et l'appelant affichait alors le grand bouton rond — impossible a
  // faire disparaitre ensuite, puisque chaque nouveau clic etait refuse de
  // la meme facon et renvoyait encore `true`.
  function basculerPauseManuelle() {
    if (apercu !== null) return false;
    pauseManuelle = !pauseManuelle;
    // En reprenant, on ne doit pas compter le temps passe en pause comme
    // si le joueur au trait l'avait reflechi (meme precaution que
    // quitterApercu ci-dessus).
    if (!pauseManuelle) dernierInstant = Date.now();
    return true;
  }

  function estEnPauseManuelle() {
    return pauseManuelle;
  }

  // Le decompte est-il fige par la NAVIGATION (historique, ou partie
  // terminee — voir interface/saisie.js, synchroniserPendulesAvecEtat) ?
  // A ne pas confondre avec la pause manuelle : celle-ci interdit de jouer,
  // celle-la non. Voir interface/saisie.js pour pourquoi la distinction
  // compte.
  function estEnApercu() {
    return apercu !== null;
  }

  // ecrireSiChange (rendu/plateau-svg.js) : verifier() tourne 4 fois par seconde
  // mais les chiffres ne changent qu'une fois.
  // Vert (--vert-demande) tant qu'on ATTEND un clic pour demarrer ou reprendre :
  // au depart, et en pause ; deux bandes vertes "||" (rendu/pendule.js) quand elle
  // tourne, pour dire qu'un clic met en pause. Ni l'un ni l'autre pendant une
  // navigation dans l'historique ou une partie finie (`apercu`) : cliquer n'y
  // ferait rien (basculerPauseManuelle refuse). Change les classes seulement si
  // l'etat change : appelee a chaque affichage.
  function signalerEtatPause() {
    const cliquable = apercu === null;
    for (const element of [elementsAffichage.noir, elementsAffichage.blanc]) {
      const bouton = element.closest('.bouton-pendule');
      bouton?.classList.toggle('pendule-en-attente', cliquable && pauseManuelle);
      bouton?.classList.toggle('pendule-en-marche', cliquable && !pauseManuelle);
    }
  }

  function afficherPendules() {
    signalerEtatPause();
    const source = apercu ?? pendules;
    ecrireSiChange(elementsAffichage.noir, formaterDuree(source.tempsNoir));
    ecrireSiChange(elementsAffichage.blanc, formaterDuree(source.tempsBlanc));
    actualiserAlerte(elementsAffichage.noir, source, source.tempsNoir);
    actualiserAlerte(elementsAffichage.blanc, source, source.tempsBlanc);
    // Le libelle ne depend que des REGLAGES (jamais de l'apercu, qui ne fige
    // que les temps affiches, voir moteur.marquerPendulesSnapshot) : toujours
    // celui du direct, meme pendant une navigation dans l'historique.
    if (elementsLibelles.noir) ecrireSiChange(elementsLibelles.noir, libellePendule(pendules));
    if (elementsLibelles.blanc) ecrireSiChange(elementsLibelles.blanc, libellePendule(pendules));
  }

  // Change de mode EN COURS DE PARTIE (phase 22bis, bouton dedie de la
  // colonne de gauche, PLAN.md) : voir moteur.changerModePendules, qui
  // garde le temps deja ecoule. Refuse pendant un apercu ou une partie deja
  // finie, comme basculerPauseManuelle : rouvrir le choix des pendules
  // n'aurait aucun sens sur une position qu'on ne joue plus.
  function changerMode(nouveauxReglages) {
    if (apercu !== null) return false;
    pendules = changerModePendules(pendules, nouveauxReglages);
    afficherPendules();
    return true;
  }

  // Fond rouge sous le seuil d'alerte, comme KAAWA — seulement en mode
  // pendule (un chrono qui ne fait jamais perdre n'a rien a signaler) et
  // pas a zero pile (deja couvert par la defaite au temps, un autre
  // affichage).
  function actualiserAlerte(element, source, tempsRestant) {
    const enAlerte = source.mode === 'pendule' && tempsRestant > 0 && tempsRestant <= SECONDES_ALERTE_PENDULE;
    element.classList.toggle('pendule-alerte', enAlerte);
  }

  return {
    surCoupJoue,
    passerEnChrono: basculerEnChrono,
    afficherApercu,
    quitterApercu,
    etatActuel,
    arreter,
    basculerPauseManuelle,
    estEnPauseManuelle,
    estEnApercu,
    changerMode,
  };
}

// m:ss (ex. 5:07), comme l'affichage des pendules de KAAWA.
function formaterDuree(secondes) {
  const total = Math.max(0, Math.round(secondes));
  const minutes = Math.floor(total / 60);
  const reste = total % 60;
  return `${minutes}:${String(reste).padStart(2, '0')}`;
}
