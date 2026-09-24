// Champ de position compressee copiable (phase 12bis). Vu dans KAAWA
// (kaa_app_ClO_Co.py, on_position_label_click) : un champ cliquable qui copie
// directement la position affichee dans le presse-papier, sans rien demander,
// ET ouvre en plus son popup Permutations (phase 25, interface/permutations.js).
// Retour visuel bref (« Copié ! », meme principe que le bouton Copier de
// Commentaires, interface/commentaires.js) plutot qu'une boite de confirmation.
//
// Place AU-DESSUS de la ligne du titre de la partie (index.html,
// #entete-partie) : choix de saab, different de KAAWA qui le met tout en bas
// de sa fenetre, pour ne jamais confondre un clic ici avec un clic sur
// "Depart" (le noeud racine de la Sequence).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const DUREE_FLASH_COPIE_POSITION = 1200;

// `element` : le champ lui-meme (index.html, #position-copiable).
// `texteInitial` : la position affichee des la construction, avant tout coup
// ou navigation (les mises a jour suivantes passent par `actualiser`).
// `ouvrirPermutations(texte)` (facultatif, phase 25) : appele en plus de la
// copie, comme KAAWA — jamais a sa place.
function demarrerPositionCopiable(element, texteInitial, ouvrirPermutations) {
  let texteActuel = texteInitial;

  function actualiser(texte) {
    texteActuel = texte;
    element.textContent = texte;
    element.title = texte;
  }

  element.addEventListener('click', () => {
    ouvrirPermutations?.(texteActuel);
    navigator.clipboard?.writeText(texteActuel).then(() => {
      element.textContent = 'Copié !';
      setTimeout(() => actualiser(texteActuel), DUREE_FLASH_COPIE_POSITION);
    });
  });

  actualiser(texteInitial);
  return { actualiser };
}
