// Les tableaux de la colonne de droite remplissent toute la hauteur libre,
// sur ordinateur hors face-a-face (saab, 2026-10-01 pour Reflexion IA, puis
// 2026-10-02 : « pour les tableaux fais comme pour Reflexion, rempli les
// espaces vides pour se deplier au maximum »). La Sequence prend ce qui reste
// (styles.css : flex) ; Reflexion IA, un <details> qui ne sait pas se
// partager la hauteur en flex, recoit ici sa hauteur maximale :
//   - toute la hauteur libre si la Sequence est fermee ;
//   - sinon, ce que la Sequence ne remplirait pas, et au moins la moitie de
//     la hauteur libre — la Sequence garde toujours sa hauteur minimale.
// Mesure faite tableaux replies, puis rendue — d'un seul trait, sans affichage
// entre les deux. Ailleurs (telephone, face-a-face), la hauteur de styles.css.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : SEUIL_ORDINATEUR
// (interface/disposition.js) vient d'un fichier charge avant celui-ci.

// Jamais moins que la ligne d'en-tete et une ligne du tableau.
const HAUTEUR_MINIMUM_REFLEXION_PX = 40;
const MOITIE = 2;

function ajusterHauteursColonne() {
  const reflexion = document.getElementById('reflexion-ia');
  const defilement = reflexion.querySelector('.reflexion-ia-defilement');
  const sequence = document.getElementById('arbre-panneau');
  const colonne = reflexion.parentElement;
  const calculable = SEUIL_ORDINATEUR.matches && !document.body.classList.contains('face-a-face');
  if (reflexion.hidden || !reflexion.open || !calculable) {
    defilement.style.maxHeight = '';
    return;
  }
  const sequenceOuverte = !sequence.hidden && sequence.parentElement === colonne;
  // Ce que la Sequence demanderait au-dela de sa hauteur minimale.
  let besoinSequence = 0;
  if (sequenceOuverte) {
    const minimum = parseFloat(getComputedStyle(sequence).minHeight) || 0;
    sequence.style.flex = 'none';
    besoinSequence = Math.max(0, sequence.offsetHeight - minimum);
    sequence.style.height = `${minimum}px`;
  }
  defilement.style.maxHeight = '0px';
  // La colonne a toute la hauteur de la fenetre : c'est le bas de son contenu
  // qu'on mesure.
  const basDuContenu = Math.max(...[...colonne.children].map((enfant) => enfant.getBoundingClientRect().bottom));
  const libre = window.innerHeight - basDuContenu;
  sequence.style.flex = '';
  sequence.style.height = '';
  const pourReflexion = sequenceOuverte ? libre - Math.min(besoinSequence, libre / MOITIE) : libre;
  defilement.style.maxHeight = `${Math.max(HAUTEUR_MINIMUM_REFLEXION_PX, pourReflexion)}px`;
}

// La colonne change quand un tableau s'ouvre, se ferme ou grandit ; la
// fenetre, quand on la redimensionne. Une image plus tard : ce reglage change
// lui-meme ce qui est observe.
function demarrerHauteursColonne() {
  const reajuster = () => requestAnimationFrame(ajusterHauteursColonne);
  const reflexion = document.getElementById('reflexion-ia');
  new ResizeObserver(reajuster).observe(reflexion.parentElement);
  window.addEventListener('resize', reajuster);
  reflexion.addEventListener('toggle', reajuster);
  return reajuster;
}
