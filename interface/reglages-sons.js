// La boite "Sons" : un interrupteur par son et un general (interface/sons.js).
// Provisoire a l'echelle du projet : la phase 22 (reglages) en fera un onglet
// du panneau de reglages complet ; les cles retenues sont deja celles de KAAWA.
//
// Une ligne par reglage, faite d'une case a cocher dans un <label> : toute la
// ligne se touche (44 px, CLAUDE.md). Le general desactive visuellement les
// autres (KAAWA : `sound_enabled` l'emporte) sans les effacer.
//
// Reconstruite a chaque ouverture (innerHTML interdit seulement pour le
// plateau, voir CLAUDE.md) : rien n'y est anime ni ne garde d'etat.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : REGLAGES_SONS
// (interface/sons.js) vient d'un fichier charge avant celui-ci.

// `elements` : { bouton, dialogue, liste, fermer }. `sons` : ce que renvoie
// demarrerSons.
function demarrerReglagesSons(elements, sons) {
  function afficher() {
    elements.liste.replaceChildren();
    for (const { cle, libelle } of REGLAGES_SONS) {
      const ligne = document.createElement('label');
      ligne.className = 'ligne-reglage';
      const case_ = document.createElement('input');
      case_.type = 'checkbox';
      case_.checked = sons.lire(cle);
      case_.addEventListener('change', () => {
        sons.regler(cle, case_.checked);
        if (cle === 'sound.enabled') elements.liste.classList.toggle('reglages-inactifs', !case_.checked);
      });
      ligne.append(case_, document.createTextNode(` ${libelle}`));
      elements.liste.appendChild(ligne);
    }
    elements.liste.classList.toggle('reglages-inactifs', !sons.lire('sound.enabled'));
  }

  elements.bouton.addEventListener('click', () => {
    afficher();
    elements.dialogue.showModal();
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
}
