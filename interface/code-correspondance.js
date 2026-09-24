// La boite qui montre un code KAA1 a envoyer (phase 24), ou un simple message de
// correspondance (« Coup reçu : à vous de jouer »). Comme la boite « Envoyer le
// coup » de KAAWA : le code en lecture seule, un bouton pour le copier, a
// coller ensuite dans un SMS, un courriel...
//
// Copier : l'API du presse-papiers du navigateur quand elle est permise (pas
// toujours sur une page ouverte en double-clic, file://), sinon la vieille
// methode par selection — et, au pire, le code reste selectionne a l'ecran pour
// un copier a la main.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// `elements` : { dialogue, titre, message, code, copier, fermer }. Renvoie
// { afficher({ titre, message, code }) } — `code` facultatif.
function demarrerAffichageCodeCorrespondance(elements) {
  elements.fermer.addEventListener('click', () => elements.dialogue.close());

  elements.copier.addEventListener('click', () => {
    const texte = elements.code.value;
    const confirmer = () => {
      elements.copier.textContent = 'Copié ✓';
    };
    const parSelection = () => {
      elements.code.select();
      try {
        if (document.execCommand('copy')) confirmer();
      } catch {
        // Le code reste selectionne : copier a la main.
      }
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(texte).then(confirmer, parSelection);
    else parSelection();
  });

  function afficher({ titre, message, code = null }) {
    elements.titre.textContent = titre;
    elements.message.textContent = message;
    elements.code.hidden = code === null;
    elements.copier.hidden = code === null;
    elements.code.value = code ?? '';
    elements.copier.textContent = 'Copier';
    elements.dialogue.showModal();
    if (code !== null) elements.code.select();
  }

  return { afficher };
}
