// Abandonner ou proposer nulle, depuis les boutons de chaque joueur (drapeau et « = »,
// pres de son compteur d'ejections, rendu/boutons-fin-piste.js — demande de saab). Le
// DESSIN vit dans rendu/abandon-nulle.js ; ici, seulement le deroulement :
//
//   1. un appui sur un bouton ouvre une confirmation "Valider / Refuser" qui NOMME celui
//      qui demande (« Joueur 1 abandonne ? », « Joueur 1 propose nulle ? » : une erreur
//      de bouton ferait perdre le mauvais joueur). Elle recouvre la ligne de CELUI QUI
//      DOIT REPONDRE — celui qui abandonne (KAAWA, action_resign : abandonne celui qui a
//      le trait), ou l'ADVERSAIRE de celui qui propose nulle. En face-a-face sa ligne est
//      retournee vers lui, la confirmation aussi : il repond depuis son cote. Un second
//      appui sur le meme bouton annule la demande ;
//   2. "Valider" met fin a la partie (statut "R" ou "D", moteur/arbre.js) ;
//      "Refuser" referme tout, la partie continue.
// Un coup joue, ou une navigation, referme tout (`reinitialiser`, appele par
// interface/saisie.js).
//
// Aucune regle du jeu ici : qui gagne un abandon se lit sur le joueur au trait
// (moteur/sauvegarde.js, ecrireVainqueur), jamais decide par ce fichier.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : couleurAdverse
// (moteur/regles.js), afficherConfirmationFin, masquerBoutonsFin
// (rendu/abandon-nulle.js) viennent de fichiers charges avant celui-ci dans index.html.

// `lecture` : { peutTerminer(), terminer(statut) } — `peutTerminer` dit si la partie
// est encore vivante sur la position regardee, `terminer` recoit 'R' (abandon) ou 'D'
// (nulle).
function demarrerAbandonNulle(svg, lecture) {
  let action = null; // 'abandon' | 'nulle' tant qu'une confirmation est attendue

  // Le cadre orange du tour et le bouton presse passent en vert (--vert-demande) tant
  // qu'une demande attend une reponse.
  function marquerDemande(camp, enCours) {
    svg.querySelector(`#nom-${camp}`).classList.toggle('demande-en-cours', enCours);
  }

  function reinitialiser() {
    action = null;
    masquerBoutonsFin(svg);
    marquerDemande('noir', false);
    marquerDemande('blanc', false);
    for (const bouton of svg.querySelectorAll('.bouton-fin-piste')) bouton.classList.remove('demande-en-cours');
  }

  function nomDuJoueur(camp) {
    return svg.querySelector(`#nom-${camp} .nom-texte`).textContent;
  }

  // `camp` : celui qui demande, le proprietaire du bouton.
  function demanderConfirmation(choisie, camp) {
    reinitialiser();
    action = choisie;
    marquerDemande(camp, true);
    if (choisie === 'abandon') afficherConfirmationFin(svg, camp, `${nomDuJoueur(camp)} abandonne ?`);
    else afficherConfirmationFin(svg, couleurAdverse(camp), `${nomDuJoueur(camp)} propose nulle ?`);
  }

  svg.addEventListener('click', (evenement) => {
    const cible = evenement.target;
    const bouton = cible.closest('.bouton-fin-piste');
    if (bouton) {
      if (!lecture.peutTerminer() || bouton.classList.contains('bouton-fin-piste-inactif')) return;
      const dejaDemande = bouton.classList.contains('demande-en-cours');
      reinitialiser();
      if (dejaDemande) return;
      demanderConfirmation(bouton.dataset.action, bouton.dataset.camp);
      bouton.classList.add('demande-en-cours');
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
