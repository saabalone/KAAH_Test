// Abandonner ou proposer nulle, depuis le cadre orange "Tour N A/N" du camp qui
// a la main (demande de saab). Le DESSIN vit dans rendu/abandon-nulle.js ; ici,
// seulement le deroulement :
//
//   1. clic sur "Tour N A/N" : les deux choix ("Nulle", "Abandonner") s'ouvrent
//      (un second clic les referme) ;
//   2. clic sur un choix : une confirmation "Valider / Refuser" recouvre la
//      ligne de CELUI QUI DOIT REPONDRE — celui qui abandonne (KAAWA,
//      action_resign : abandonne celui qui a le trait), ou l'ADVERSAIRE de
//      celui qui propose nulle. En face-a-face sa ligne est retournee vers lui,
//      la confirmation aussi : il repond depuis son cote ;
//   3. "Valider" met fin a la partie (statut "R" ou "D", moteur/arbre.js) ;
//      "Refuser" referme tout, la partie continue.
// Un coup joue, ou une navigation, referme tout (`reinitialiser`, appele par
// interface/saisie.js).
//
// Aucune regle du jeu ici : qui gagne un abandon se lit sur le joueur au trait
// (moteur/sauvegarde.js, ecrireVainqueur), jamais decide par ce fichier.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : couleurAdverse
// (moteur/regles.js), afficherChoixFin, afficherConfirmationFin,
// masquerBoutonsFin (rendu/abandon-nulle.js) viennent de fichiers charges
// avant celui-ci dans index.html.

// `lecture` : { peutTerminer(), campAuTrait(), terminer(statut) } —
// `peutTerminer` dit si la partie est encore vivante sur la position regardee,
// `terminer` recoit 'R' (abandon) ou 'D' (nulle).
function demarrerAbandonNulle(svg, lecture) {
  let action = null; // 'abandon' | 'nulle' tant qu'une confirmation est attendue

  // Le cadre "Tour N A/N" passe en vert (--vert-demande) tant qu'une demande
  // attend une reponse : choix ouverts ou confirmation affichee.
  function marquerDemande(camp, enCours) {
    svg.querySelector(`#nom-${camp}`).classList.toggle('demande-en-cours', enCours);
  }

  function reinitialiser() {
    action = null;
    masquerBoutonsFin(svg);
    marquerDemande('noir', false);
    marquerDemande('blanc', false);
  }

  function ouvrirOuFermerLesChoix(camp) {
    const dejaOuverts = svg.querySelector(`#nom-${camp} .choix-fin`).style.display !== 'none';
    reinitialiser();
    if (dejaOuverts) return;
    afficherChoixFin(svg, camp, true);
    marquerDemande(camp, true);
  }

  function demanderConfirmation(choisie) {
    const camp = lecture.campAuTrait();
    reinitialiser();
    action = choisie;
    marquerDemande(camp, true);
    if (choisie === 'abandon') afficherConfirmationFin(svg, camp, 'Abandonner ?');
    else afficherConfirmationFin(svg, couleurAdverse(camp), 'Nulle ?');
  }

  svg.addEventListener('click', (evenement) => {
    const cible = evenement.target;
    if (cible.closest('.nom-tour-cadre')) {
      const camp = cible.closest('.nom-joueur').dataset.camp;
      if (lecture.peutTerminer() && camp === lecture.campAuTrait()) ouvrirOuFermerLesChoix(camp);
      return;
    }
    const choix = cible.closest('.option-fin');
    if (choix) {
      demanderConfirmation(choix.dataset.action);
      return;
    }
    const reponse = cible.closest('.confirmation-bouton');
    if (reponse) {
      const confirmee = reponse.dataset.reponse === 'valider' && action !== null;
      const statut = action === 'abandon' ? 'R' : 'D';
      reinitialiser();
      if (confirmee) lecture.terminer(statut);
    }
  });

  return { reinitialiser };
}
