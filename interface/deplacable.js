// Rendre une fenetre <dialog> deplaçable par une poignee (son titre, en
// general) — extrait de interface/reglages.js (regle des 200 lignes,
// CLAUDE.md) : la premiere a en avoir besoin (la boite Reglages masquait le
// plateau, saab), reutilisable par toute autre fenetre qui le demanderait
// plus tard.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// `dialogue` suit le doigt/la souris tant qu'on tient `poignee`. Ecouteurs
// sur `window` (pas sur `poignee`) pendant le deplacement, PLUTOT que
// setPointerCapture : suit le pointeur meme s'il sort de la poignee en
// cours de geste (un glissement rapide rate parfois une cible aussi
// etroite qu'un titre), et ne depend d'aucune API a part (moins de
// surprises d'un navigateur a l'autre). Position remise a zero (centrage
// natif de <dialog>) a chaque ouverture — voir reinitialiserPosition,
// appelee par l'appelant — jamais retenue d'une fois sur l'autre : plus
// simple, et ca n'a jamais ete demande.
function rendreDeplacable(dialogue, poignee) {
  let decalX = 0;
  let decalY = 0;

  function deplacer(evenement) {
    dialogue.style.left = `${evenement.clientX - decalX}px`;
    dialogue.style.top = `${evenement.clientY - decalY}px`;
  }

  function relacher() {
    window.removeEventListener('pointermove', deplacer);
    window.removeEventListener('pointerup', relacher);
  }

  poignee.addEventListener('pointerdown', (evenement) => {
    const rect = dialogue.getBoundingClientRect();
    decalX = evenement.clientX - rect.left;
    decalY = evenement.clientY - rect.top;
    dialogue.style.margin = '0';
    dialogue.style.right = 'auto';
    dialogue.style.bottom = 'auto';
    window.addEventListener('pointermove', deplacer);
    window.addEventListener('pointerup', relacher);
  });
}

function reinitialiserPosition(dialogue) {
  for (const proprietaire of ['left', 'top', 'right', 'bottom', 'margin']) dialogue.style[proprietaire] = '';
}
