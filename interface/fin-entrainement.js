// La fin d'un jeu d'ENTRAINEMENT ou de CEINTURE (phase 36 ; saab, 2026-10-09 : « c'est
// pas clair, il faut expliquer ce qu'on doit faire : soit on continue l'entrainement
// sur revanche ou autre exercice de l'entrainement, soit on quitte l'entrainement ;
// donc en fin de partie, le btn Gagné Option doit avoir ces choix ») : la boite
// « Fin de partie : Options » montre le resultat et ces choix a la place de
// Revanche / Same / Change (qui lanceraient une partie hors de l'Entrainement). Elle
// s'ouvre d'elle-meme quand le resultat est note.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CEINTURES (moteur/entrainement.js),
// ceinturesAConfirmer, victoiresAttendues (moteur/entrainement-serie.js) viennent de
// fichiers charges avant celui-ci.

const LIBELLES_CONTINUER = {
  variantes: { aller: 'l’aller (Noir)', revanche: 'la revanche (Blanc)' },
  pzl: { aller: 'Noir', revanche: 'Blanc' },
};
const autreSens = (sens) => (sens === 'aller' ? 'revanche' : 'aller');

// Le jeu a jouer ensuite, ou null (au joueur de choisir) : la revanche qui reste, le
// meme jeu s'il lui faut encore des victoires, ou le meme sens apres un essai rate
// (`rejouer`). `enCours` : le jeu fini (interface/entrainement-partie.js) ;
// `parcours` : apres son resultat (null en mode Entrainement).
function jeuSuivantDEntrainement(enCours, evenement, parcours) {
  switch (evenement) {
    case 'reste la revanche':
      return { ...enCours, sens: autreSens(enCours.sens) };
    case 'victoire':
      return { ...enCours, sens: 'aller' };
    case 'essai rate':
    case 'rattrapage':
    case 'rate':
      return { ...enCours, rejouer: true };
    case 'reussi':
      return enCours.sens === 'aller' ? { ...enCours, sens: 'revanche' } : null;
    case 'jeu reinitialise':
      // Le meme jeu, repris a zero (l'aller d'abord) ; une confirmation : au choix.
      return parcours.aConfirmer ? null : { ...enCours, sens: 'aller' };
    default:
      return null;
  }
}

const nomDeCeinture = (indice) => CEINTURES[indice]?.nom.toLowerCase();
const pluriel = (nombre, mot) => `${nombre} ${mot}${nombre > 1 ? 's' : ''}`;

// Ce qu'on dit au joueur apres un jeu : `resultat` (interface/entrainement-partie.js,
// noterResultatDEntrainement), `jeu` : le jeu fini.
function messageDEntrainement({ evenement, parcours, avant, regles }, jeu) {
  const autre = LIBELLES_CONTINUER[jeu.sorte][autreSens(jeu.sens)];
  switch (evenement) {
    case 'reussi':
      return `Réussi ! (Entraînement : vos ceintures ne changent pas.)`;
    case 'rate':
      return `Raté. (Entraînement : vos ceintures ne changent pas.)`;
    case 'reste la revanche':
      return `Gagné ! Il reste ${autre} de ce jeu, tout de suite ou plus tard.`;
    case 'victoire': {
      const victoires = parcours.enCours[jeu.nom]?.victoires ?? 0;
      return `Victoire sur ${jeu.nom} : ${victoires} sur ${regles.victoiresParJeu}. Encore ${pluriel(regles.victoiresParJeu - victoires, 'victoire')} sur ce jeu.`;
    }
    case 'jeu reussi':
      return `${jeu.nom} réussi, il reste acquis ! Série : ${parcours.valides.length} jeu(x) sur ${regles.jeuxParSerie} pour la ceinture ${nomDeCeinture(parcours.cible)}. Choisissez le suivant dans « Autre jeu ».`;
    case 'confirmation':
      return `Série complète ! Pour obtenir la ceinture ${nomDeCeinture(parcours.cible)}, confirmez : un jeu gagné${regles.revancheDeConfirmation ? ' (aller et revanche)' : ''} sur la ceinture ${ceinturesAConfirmer(parcours).map(nomDeCeinture).join(', ')}${parcours.aReconfirmer ? ` (la ${nomDeCeinture(parcours.ceinture)} : plus de ${regles.joursAvantReconfirmation} jours sans y jouer)` : ''}. Choisissez dans « Autre jeu ».`;
    case 'ceinture confirmee':
      return `Ceinture ${nomDeCeinture(jeu.ceinture)} confirmée. Reste à confirmer : ${ceinturesAConfirmer(parcours).map(nomDeCeinture).join(', ')}.`;
    case 'ceinture':
      return `Bravo ! Ceinture ${nomDeCeinture(parcours.ceinture)} obtenue.${parcours.cible === null ? '' : ` Prochaine visée : ${nomDeCeinture(parcours.cible)}.`}`;
    case 'essai rate': {
      const siens = avant.aConfirmer ? parcours.enConfirmation[`${jeu.ceinture}|${jeu.nom}`] : parcours.enCours[jeu.nom];
      return `${regles.rattrapageSurNulle && siens?.nulles ? 'Nulle ou perdu' : 'Perdu'} : essai raté sur ${jeu.nom} (${siens?.echecs ?? 1} sur ${regles.essaisAvantReinitialisation}). Ce qui est gagné reste ; au bout, ce jeu repart de zéro.`;
    }
    case 'rattrapage':
      return `Essais finis sur ${jeu.nom}, mais avec une nulle : une partie de plus. Une nulle (ou une victoire) la réussit ; perdue, ce jeu repart de zéro.`;
    case 'jeu reinitialise':
      return `Perdu : ${pluriel(regles.essaisAvantReinitialisation, 'essai')} raté(s), ${avant.aConfirmer ? 'les confirmations repartent' : `${jeu.nom} repart`} de zéro${regles.reinitialiserTousLesJeux ? ' (toute la série aussi)' : ''}. Remis à zéro : ${parcours.reinitialisations} sur ${regles.reinitialisationsAvantDeRedescendre} avant de redescendre.`;
    case 'regression':
      return `Trop de jeux recommencés : vous redescendez de la ceinture ${nomDeCeinture(avant.ceinture)} à la ${nomDeCeinture(parcours.ceinture)}.`;
    default:
      return 'Ce jeu ne comptait pas pour la série en cours.';
  }
}

// `elements` : { dialogue, normales (les options ordinaires), section, message,
// continuer, autre, quitter } ; `actions` : { relancer(jeu), ouvrirEntrainement(),
// quitter() }. Renvoie { montrer(message, jeuSuivant) }.
function demarrerFinDEntrainement(elements, actions) {
  let suivant = null;
  elements.continuer.addEventListener('click', () => {
    elements.dialogue.close();
    if (suivant) actions.relancer(suivant);
  });
  elements.autre.addEventListener('click', () => {
    elements.dialogue.close();
    actions.ouvrirEntrainement();
  });
  elements.quitter.addEventListener('click', () => {
    elements.dialogue.close();
    actions.quitter();
  });

  function montrer(message, jeuSuivant) {
    suivant = jeuSuivant;
    elements.normales.hidden = true;
    elements.section.hidden = false;
    elements.message.textContent = message;
    elements.continuer.hidden = !jeuSuivant;
    if (jeuSuivant) elements.continuer.textContent = `${jeuSuivant.rejouer ? 'Rejouer' : 'Continuer'} : ${LIBELLES_CONTINUER[jeuSuivant.sorte][jeuSuivant.sens]} de ${jeuSuivant.nom}`;
    if (!elements.dialogue.open) elements.dialogue.showModal();
  }
  return { montrer };
}
