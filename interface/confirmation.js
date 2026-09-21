// Confirmation avant une action a part entiere (Annuler le dernier coup,
// supprimer une branche de la Sequence, demarrer une nouvelle partie par-
// dessus celle en cours) — remplace window.confirm(). Le bouton de
// confirmation change de mot selon l'action (voir `demander` plus bas) :
// seules les deux premieres sont vraiment irreversibles, "Nouvelle
// partie" ne l'est pas (la partie en cours reste dans "Mes parties"),
// mais merite quand meme un geste de plus contre un clic malencontreux.
//
// CORRIGE (saab : "avec le btn Annulé de Navigation, il faut renommer
// dans le popup le btn Annuler par Refuser, car c'est confus") : une
// boite native window.confirm() affiche les mots du NAVIGATEUR ("OK" /
// "Annuler" en francais), jamais choisis par KAAH — son bouton "Annuler"
// (au sens "je renonce a cette boite") tombe alors juste a cote du bouton
// de navigation "Annuler" (au sens "annuler mon dernier coup") qui vient
// de l'ouvrir, un mot pour deux sens opposes selon lequel on regarde.
// Un <dialog> natif, comme les autres popups de KAAH, permet de choisir
// les mots exactement : "Supprimer" pour confirmer, "Refuser" pour
// decliner — jamais "Annuler" nulle part dans cette boite-ci.
//
// window.confirm() etait SYNCHRONE (bloquait jusqu'a la reponse) ; un
// <dialog> ne l'est pas — `demander` prend donc un rappel, appele
// seulement si l'utilisateur clique "Supprimer", jamais sur "Refuser" ni
// sur Echap (qui ferme le <dialog> sans rien declencher ici, exactement
// comme annuler l'ancienne boite window.confirm).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// `elements` : { dialogue, message, confirmer, refuser }.
function demarrerConfirmation(elements) {
  let rappelEnCours = null;

  // Capture puis EFFACE `rappelEnCours` AVANT `dialogue.close()` : fermer
  // un <dialog> declenche son evenement `close` de facon SYNCHRONE (voir
  // plus bas, qui remet aussi `rappelEnCours` a null) — l'appeler apres
  // aurait donc toujours trouve `rappelEnCours` deja efface, et le rappel
  // de confirmation ne se serait jamais declenche.
  elements.confirmer.addEventListener('click', () => {
    const rappel = rappelEnCours;
    rappelEnCours = null;
    elements.dialogue.close();
    rappel?.();
  });

  elements.refuser.addEventListener('click', () => elements.dialogue.close());

  // Fermer par Echap doit se comporter comme "Refuser", jamais declencher
  // le rappel de confirmation — cette seule ligne couvre Echap ET les deux
  // boutons (déjà surs, `rappelEnCours` y est deja a null a ce stade).
  elements.dialogue.addEventListener('close', () => {
    rappelEnCours = null;
  });

  // `message` : la question posee, specifique a l'appelant (annuler un
  // coup et supprimer une branche ne sont pas tout a fait la meme
  // chose, meme si les deux passent par cette seule boite). `surConfirmation`
  // n'est jamais appele de force : seul un vrai clic sur le bouton de
  // confirmation compte. `texteConfirmer` (facultatif, "Supprimer" par
  // defaut) : le mot du bouton de confirmation change selon l'action —
  // "Nouvelle partie" n'est pas une suppression (index.html,
  // #bouton-nouvelle-partie), garder "Supprimer" partout aurait ete faux.
  function demander(message, surConfirmation, texteConfirmer) {
    elements.message.textContent = message;
    elements.confirmer.textContent = texteConfirmer ?? 'Supprimer';
    rappelEnCours = surConfirmation;
    elements.dialogue.showModal();
  }

  return { demander };
}
