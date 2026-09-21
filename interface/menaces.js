// Bouton "!?" (Phase 19) : bascule l'affichage des fleches de menaces
// (poussees possibles des deux camps sur la position REGARDEE) sur le
// plateau. Pas de panneau — un simple bouton ON/OFF, comme le
// `_show_threats` de KAAWA (kaa_board_widget_ClO_Co.py) : les fleches se
// dessinent DANS le plateau lui-meme, jamais dans une liste a cote (meme
// raison que Conseils, interface/next-move.js — "le plus important dans
// cette appli c'est de voir le plateau").
//
// Pas d'import ni d'export (voir moteur/plateau.js) : menacesDeLaPosition
// vient de moteur/menaces.js, dessinerFlechesMenaces/effacerFlechesMenaces
// de rendu/menaces.js — tous charges avant celui-ci dans index.html.

// `elements` : { bouton }. `obtenirEtat` : () => l'etat de la position
// REGARDEE (pas forcement le dernier coup joue — voir interface/saisie.js,
// meme convention que interface/next-move.js pour Conseils).
function demarrerMenaces(svg, elements, obtenirEtat) {
  let actif = false;

  elements.bouton.addEventListener('click', () => {
    actif = !actif;
    elements.bouton.classList.toggle('bouton-actif', actif);
    actualiser();
  });

  // A appeler a chaque coup ou navigation (voir interface/saisie.js) :
  // la position regardee a change, les fleches affichees ne valent donc
  // plus rien — meme regle que interface/next-move.js, rafraichirFleches.
  // Ne fait rien si le bouton est eteint : aucune fleche a l'ecran, rien
  // a recalculer pour rien.
  function actualiser() {
    if (!actif) {
      effacerFlechesMenaces(svg);
      return;
    }
    dessinerFlechesMenaces(svg, menacesDeLaPosition(obtenirEtat()));
  }

  return { actualiser };
}
