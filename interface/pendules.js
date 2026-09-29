// Fait vivre les pendules en temps reel. Aucune regle de calcul ici (voir
// moteur/pendules.js) : ce fichier se contente de declencher ecoulerTemps
// au bon rythme et de mettre a jour l'affichage.
//
// Le point important : on ne compte JAMAIS un intervalle suppose fixe. A
// chaque verification, on mesure le temps REELLEMENT ecoule depuis la
// derniere fois (Date.now()), et c'est CE temps-la qu'on applique. Les
// navigateurs ralentissent ou suspendent les minuteurs des onglets
// caches : si on comptait juste "250ms passees" a chaque appel, un onglet
// mis en arriere-plan ferait deriver les pendules (le vrai temps passe
// serait plus grand que ce qu'on aurait compte). En mesurant l'ecart reel
// a chaque reveil, la pendule rattrape toujours exactement le temps qui
// s'est vraiment ecoule — voir CLAUDE.md, critere de fin de cette phase.
//
// DEUX HORLOGES (phase 30, saab : « il n'y a que la branche principale qui est
// sur le reglage pendule jusqu'a une game over, ensuite tout le reste est en
// Chrono », comme KAAWA) :
//   - 'partie' : la pendule de la partie (mode et reglages choisis), qui ne
//     tourne qu'au bout de la ligne reellement jouee, tant que la partie n'est
//     pas finie — la seule qui fasse perdre au temps ;
//   - 'analyse' : un chrono (temps du coup, qui part de zero) sur toute autre
//     position qu'on peut jouer — une branche, ou la suite jouee apres la fin.
// Ailleurs (on parcourt l'historique, ou la position est definitive), un
// APERCU : le temps TEL QU'IL ETAIT au noeud regarde (moteur/arbre.js,
// marquerPendulesSnapshot), comme dans KAAWA — pendant qu'un chrono d'analyse
// tourne sans s'afficher : jouer depuis une position passee cree une branche,
// dont le coup a lui aussi sa duree. interface/saisie.js dit laquelle
// suivre a chaque coup et a chaque navigation (`suivre`) ; la pendule de la
// partie ne bouge jamais pendant ce temps et reprend exactement ou elle en
// etait.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerPendules,
// ecoulerTemps, appliquerBonusDeCoup, changerModePendules et libellePendule
// viennent de moteur/pendules.js, charge avant celui-ci dans index.html.

const INTERVALLE_DE_VERIFICATION_MS = 250;

// Seuil d'alerte visuelle (fond rouge), en secondes restantes — meme
// valeur par defaut que KAAWA (`time_alert_seconds`). Reglable par
// l'utilisateur avec le reste des pendules a la phase 22 ; fige ici pour
// l'instant, comme tempsInitial et bonusParCoup dans index.html.
const SECONDES_ALERTE_PENDULE = 30;

const REGLAGES_CHRONO_ANALYSE = { mode: 'chrono', modeChoisi: 'chrono', tempsInitial: 0 };

// `surAlerteTemps` (facultatif, phase 21) : appele UNE FOIS par tour, quand le
// temps du joueur au trait passe sous SECONDES_ALERTE_PENDULE (KAAWA :
// `_time_alert_fired`, remis a zero a chaque coup).
//
// Demarre les pendules. `reglagesPendules` : voir
// moteur.creerPendules. `elementsAffichage` : { noir, blanc }, deux
// elements dont on definit le texte (format m:ss) ; `message` (facultatif,
// phase 27) : un element affiche/masque avec le meme etat que le vert des
// pendules (voir signalerEtatPause plus bas). `surDefaite(camp)` est
// appele une seule fois quand un camp tombe a zero sur la pendule de la
// partie — la partie continue ensuite en analyse (voir interface/saisie.js).
//
// `tempsRepris` (facultatif) : { tempsNoir, tempsBlanc } — reprend une
// partie deja sauvegardee EXACTEMENT au temps qu'il lui restait, plutot
// que de repartir a `reglagesPendules.tempsInitial` (correctif demande
// par saab : fermer/rouvrir l'appli, ou reprendre une partie en cours
// depuis "Mes parties", remettait les pendules a plein temps). Les REGLAGES
// (bonus, delai...) restent ceux de `reglagesPendules`, seuls les DEUX
// COMPTEURS EN DIRECT sont repris. La partie recommence de toute facon
// toujours EN PAUSE MANUELLE (`pauseManuelle` commence a `true` plus bas) :
// reprendre a l'heure exacte ET en pause, jamais un decompte qui continuerait
// tout seul.
function demarrerPendules(reglagesPendules, elementsAffichage, surDefaite, tempsRepris, surAlerteTemps) {
  let pendules = creerPendules(reglagesPendules);
  if (tempsRepris) {
    pendules = { ...pendules, tempsNoir: tempsRepris.tempsNoir, tempsBlanc: tempsRepris.tempsBlanc };
  }
  let chronoAnalyse = creerPendules(REGLAGES_CHRONO_ANALYSE);
  // Le libelle de mode (phase 22bis) et le cumul (phase 30) vivent dans le
  // plateau (rendu/pendule.js) : les retrouver depuis le meme <svg> evite
  // d'ajouter un parametre de plus a chaque appelant.
  const svg = elementsAffichage.noir.closest('svg');
  const elementsLibelles = {
    noir: svg?.querySelector('#libelle-pendule-noir'),
    blanc: svg?.querySelector('#libelle-pendule-blanc'),
  };
  const elementsCumuls = {
    noir: svg?.querySelector('#texte-cumul-pendule-noir'),
    blanc: svg?.querySelector('#texte-cumul-pendule-blanc'),
  };
  // Voir l'en-tete : 'partie', 'analyse', ou null (apercu).
  let horloge = null;
  let apercu = null; // instantane affiche quand aucune horloge ne tourne
  let cleAnalyse = null; // la position dont le chrono d'analyse mesure le coup
  let joueurAuTrait = 'noir';
  // Le temps deja pris par chaque camp jusqu'au noeud regarde (moteur/
  // bilan-sequence.js, tempsCumules) : le coup en cours s'y ajoute en direct.
  let cumulDuChemin = { noir: 0, blanc: 0 };
  let dernierInstant = Date.now();
  let arrete = false;
  // Pause DEMANDEE PAR LE JOUEUR (clic sur une pendule, ou sur le grand
  // bouton rond — voir rendu/pendule.js et index.html). Ne concerne que la
  // pendule de la partie : l'analyse se joue librement, son chrono tourne.
  //
  // Commence a TRUE (signale par saab) : une partie neuve OU reprise ne
  // doit jamais decompter toute seule des l'affichage — seul un clic
  // explicite sur une pendule (ou le grand bouton rond) demarre vraiment
  // le decompte, comme un vrai Start. Le grand bouton rond, LUI, ne
  // s'affiche PAS des la creation (voir interface/saisie.js, demarrerPartie :
  // saab a demande de laisser le plateau visible au tout debut) — seul le
  // vert des pendules (et, phase 27, `elementsAffichage.message` plus bas)
  // signale alors qu'un clic est attendu.
  let pauseManuelle = true;
  let alerteTempsDonnee = false;

  afficherPendules();
  const identifiantMinuteur = setInterval(verifier, INTERVALLE_DE_VERIFICATION_MS);

  // L'horloge qui mesure le coup en cours (voir l'en-tete), meme en pause.
  function horlogeDuCoup() {
    return horloge === 'partie' ? pendules : chronoAnalyse;
  }

  function horlogeQuiTourne() {
    return horloge === 'partie' && pauseManuelle ? null : horlogeDuCoup();
  }

  // Le temps du joueur au trait vient de passer sous le seuil : une seule fois
  // par tour, et seulement a la pendule de la partie (un chrono ne fait jamais
  // perdre).
  function verifierAlerteTemps() {
    if (alerteTempsDonnee || horloge !== 'partie' || pendules.mode !== 'pendule') return;
    const tempsRestant = joueurAuTrait === 'noir' ? pendules.tempsNoir : pendules.tempsBlanc;
    if (tempsRestant > 0 && tempsRestant <= SECONDES_ALERTE_PENDULE) {
      alerteTempsDonnee = true;
      surAlerteTemps?.();
    }
  }

  // Le verdict est rendu une seule fois, puis vit dans l'arbre (statut "T",
  // interface/saisie.js) : l'effacer ici evite de le rendre a chaque
  // verification — et si ce coup est annule, le decompte reprend normalement.
  function signalerDefaiteEventuelle() {
    if (!pendules.perdantParTemps) return;
    const perdant = pendules.perdantParTemps;
    pendules = { ...pendules, perdantParTemps: null };
    surDefaite(perdant);
  }

  // Fait avancer l'horloge qui tourne du temps reellement ecoule.
  function ecouler() {
    const maintenant = Date.now();
    const secondesEcoulees = (maintenant - dernierInstant) / 1000;
    dernierInstant = maintenant;
    const tourne = horlogeQuiTourne();
    if (tourne === pendules) pendules = ecoulerTemps(pendules, joueurAuTrait, secondesEcoulees);
    else if (tourne === chronoAnalyse) chronoAnalyse = ecoulerTemps(chronoAnalyse, joueurAuTrait, secondesEcoulees);
  }

  function verifier() {
    if (arrete || horlogeQuiTourne() === null) return;
    ecouler();
    afficherPendules();
    verifierAlerteTemps();
    signalerDefaiteEventuelle();
  }

  // A appeler juste apres qu'un coup soit joue par `joueurQuiAJoue`, AVANT de
  // suivre la position suivante (etatActuel donne alors la duree du coup,
  // dureeDernierCoup, a poser sur son noeud).
  function surCoupJoue(joueurQuiAJoue, ejection) {
    // On rattrape d'abord le court instant ecoule depuis la derniere
    // verification periodique, pour qu'il soit compte pour le joueur qui
    // vient de jouer et non, par erreur, pour le suivant.
    ecouler();
    if (horloge === 'partie') pendules = appliquerBonusDeCoup(pendules, joueurQuiAJoue, ejection);
    else chronoAnalyse = appliquerBonusDeCoup(chronoAnalyse, joueurQuiAJoue, ejection);
    joueurAuTrait = joueurQuiAJoue === 'noir' ? 'blanc' : 'noir';
    alerteTempsDonnee = false; // un nouveau tour : l'alerte peut sonner de nouveau
    afficherPendules();
    signalerDefaiteEventuelle();
  }

  // Quelle horloge suivre pour la position regardee (voir l'en-tete) :
  // `quelle` vaut 'partie', 'analyse' ou null ; `position` : { instantane (du
  // noeud regarde), cle (l'identifie), joueurAuTrait, cumul (tempsCumules) }.
  // L'analyse repart d'un chrono neuf a chaque nouvelle position : celui qui
  // a le trait part de zero, l'autre affiche le temps de son dernier coup.
  function suivre(quelle, position) {
    joueurAuTrait = position.joueurAuTrait;
    cumulDuChemin = position.cumul;
    if (quelle !== 'partie' && (horloge === 'partie' || cleAnalyse !== position.cle)) {
      const dernierJoueur = joueurAuTrait === 'noir' ? 'tempsBlanc' : 'tempsNoir';
      chronoAnalyse = { ...creerPendules(REGLAGES_CHRONO_ANALYSE), [dernierJoueur]: position.instantane?.dureeDernierCoup ?? 0 };
      cleAnalyse = position.cle;
    }
    if (quelle !== horloge) dernierInstant = Date.now(); // le temps passe ailleurs ne compte pour personne
    horloge = quelle;
    apercu = quelle === null ? (position.instantane ?? pendules) : null;
    afficherPendules();
  }

  // L'instantane de l'horloge qui mesure le coup en cours, pour que interface/saisie.js le pose sur le noeud qui vient d'etre cree
  // (voir moteur.marquerPendulesSnapshot).
  function etatActuel() {
    return { ...horlogeDuCoup() };
  }

  // La pendule de la partie, quoi qu'on regarde : c'est elle qu'on sauvegarde
  // pour la reprendre au prochain demarrage (`tempsRepris`).
  function penduleDeLaPartie() {
    return { ...pendules };
  }

  function arreter() {
    arrete = true;
    clearInterval(identifiantMinuteur);
  }

  // Bascule la pause manuelle (clic sur une pendule ou sur le grand
  // bouton rond, voir interface/saisie.js). REFUSEE hors de la pendule de la
  // partie (historique, partie terminee, analyse) : mettre en pause ce qui ne
  // decompte pas n'a aucun sens.
  //
  // Renvoie si la bascule A EU LIEU, jamais l'etat obtenu (lire
  // estEnPauseManuelle pour ca). Bug signale par saab : en renvoyant
  // l'etat, un refus sur une partie TERMINEE renvoyait quand meme `true`
  // quand la partie n'avait pas encore ete demarree (l'etat de depart),
  // et l'appelant affichait alors le grand bouton rond — impossible a
  // faire disparaitre ensuite, puisque chaque nouveau clic etait refuse de
  // la meme facon et renvoyait encore `true`.
  function basculerPauseManuelle() {
    if (horloge !== 'partie') return false;
    pauseManuelle = !pauseManuelle;
    // En reprenant, on ne doit pas compter le temps passe en pause comme
    // si le joueur au trait l'avait reflechi.
    if (!pauseManuelle) dernierInstant = Date.now();
    afficherPendules();
    return true;
  }

  function estEnPauseManuelle() {
    return pauseManuelle;
  }

  function horlogeSuivie() {
    return horloge;
  }

  // ecrireSiChange (rendu/plateau-svg.js) : verifier() tourne 4 fois par seconde
  // mais les chiffres ne changent qu'une fois.
  // Vert (--vert-demande) tant qu'on ATTEND un clic pour demarrer ou reprendre :
  // au depart, et en pause ; deux bandes vertes "||" (rendu/pendule.js) quand elle
  // tourne, pour dire qu'un clic met en pause. Seulement sur la pendule de la
  // partie : ailleurs cliquer ne ferait rien (basculerPauseManuelle refuse).
  // Change les classes seulement si l'etat change : appelee a chaque affichage.
  function signalerEtatPause() {
    const cliquable = horloge === 'partie';
    const enAttente = cliquable && pauseManuelle;
    for (const element of [elementsAffichage.noir, elementsAffichage.blanc]) {
      const bouton = element.closest('.bouton-pendule');
      bouton?.classList.toggle('pendule-en-attente', enAttente);
      bouton?.classList.toggle('pendule-en-marche', cliquable && !pauseManuelle);
    }
    // Phase 27 : meme condition que le vert des pendules ci-dessus.
    if (elementsAffichage.message) elementsAffichage.message.hidden = !enAttente;
  }

  function afficherPendules() {
    signalerEtatPause();
    const source = apercu ?? (horloge === 'analyse' ? chronoAnalyse : pendules);
    ecrireSiChange(elementsAffichage.noir, formaterDuree(source.tempsNoir));
    ecrireSiChange(elementsAffichage.blanc, formaterDuree(source.tempsBlanc));
    actualiserAlerte(elementsAffichage.noir, source, source.tempsNoir);
    actualiserAlerte(elementsAffichage.blanc, source, source.tempsBlanc);
    // Le libelle dit les reglages de la partie, sauf quand c'est un chrono
    // d'analyse (ou son instantane) qui s'affiche.
    const libelle = horloge !== 'partie' && source.mode === 'chrono' ? libellePendule(chronoAnalyse) : libellePendule(pendules);
    for (const camp of ['noir', 'blanc']) {
      if (elementsLibelles[camp]) ecrireSiChange(elementsLibelles[camp], libelle);
      const enCours = camp === joueurAuTrait && horloge !== null ? horlogeDuCoup().dureeCoupEnCours : 0;
      if (elementsCumuls[camp]) ecrireSiChange(elementsCumuls[camp], formaterDuree(cumulDuChemin[camp] + enCours));
    }
  }

  // Change de mode EN COURS DE PARTIE (phase 22bis, bouton dedie de la
  // colonne de gauche, PLAN.md) : voir moteur.changerModePendules. Refuse
  // ailleurs qu'a la pendule de la partie, comme basculerPauseManuelle :
  // rouvrir le choix des pendules n'aurait aucun sens sur une position qu'on
  // ne joue plus, ou en analyse.
  function changerMode(nouveauxReglages) {
    if (horloge !== 'partie') return false;
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
    suivre,
    etatActuel,
    penduleDeLaPartie,
    arreter,
    basculerPauseManuelle,
    estEnPauseManuelle,
    horlogeSuivie,
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
