// Les tableaux de la colonne de droite remplissent toute la hauteur libre,
// sur ordinateur hors face-a-face (saab, 2026-10-01 pour Reflexion IA, puis
// 2026-10-02 : « pour les tableaux fais comme pour Reflexion, rempli les
// espaces vides pour se deplier au maximum »). La Sequence prend ce qui reste
// (styles.css : flex) ; Reflexion IA, un <details> qui ne sait pas se
// partager la hauteur en flex, recoit ici sa hauteur maximale :
//   - toute la hauteur libre si la Sequence est fermee ;
//   - sinon, ce que la Sequence ne remplirait pas, et au moins la moitie de
//     la hauteur libre — la Sequence garde toujours sa hauteur minimale.
// Quand la Recherche par 1er coup est ouverte (dans le meme <details>), c'est
// elle qui compte (saab, 2026-10-02 : « c'est lui qui est important ») :
// Reflexion IA en garde le tiers, ou la hauteur choisie a la poignee entre les
// deux, et la Recherche prend le reste.
// Mesure faite tableaux replies, puis rendue — d'un seul trait, sans affichage
// entre les deux. Ailleurs (telephone, face-a-face), la hauteur de styles.css.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : SEUIL_ORDINATEUR
// (interface/disposition.js), garderNoeudActifVisible (interface/sequence.js)
// viennent de fichiers charges avant celui-ci.

// Jamais moins que la ligne d'en-tete et une ligne du tableau.
const HAUTEUR_MINIMUM_REFLEXION_PX = 40;
const MOITIE = 2;
const PART_REFLEXION_AVEC_RECHERCHE = 1 / 3;

function ajusterHauteursColonne() {
  const reflexion = document.getElementById('reflexion-ia');
  const defilement = reflexion.querySelector('.reflexion-ia-defilement');
  const recherche = reflexion.querySelector('.recherche-ia');
  const defilementRecherche = recherche.querySelector('.recherche-ia-defilement');
  const poignee = reflexion.querySelector('.poignee-reflexion-recherche');
  const sequence = document.getElementById('arbre-panneau');
  const colonne = reflexion.parentElement;
  const calculable = SEUIL_ORDINATEUR.matches && !document.body.classList.contains('face-a-face');
  const rechercheOuverte = calculable && recherche.open;
  poignee.hidden = !rechercheOuverte;
  if (!rechercheOuverte) defilementRecherche.style.maxHeight = defilement.style.height = '';
  if (reflexion.hidden || !reflexion.open || !calculable) {
    defilement.style.maxHeight = '';
    return;
  }
  // Une Sequence a la hauteur choisie a la poignee (interface/sequence.js) ne
  // se partage pas : Reflexion IA prend tout ce qui reste.
  const sequenceQuiRemplit = !sequence.hidden && sequence.parentElement === colonne && !sequence.classList.contains('hauteur-choisie');
  const avant = { flex: sequence.style.flex, height: sequence.style.height };
  // Deplier un tableau pour le mesurer remet son defilement en haut (saab,
  // 2026-10-02 : « la Sequence ne garde plus le focus sur le coup actif ») :
  // chaque defilement est rendu tel quel apres la mesure.
  const defilements = [...colonne.querySelectorAll('*')].filter((element) => element.scrollTop > 0).map((element) => [element, element.scrollTop]);
  // Ce que la Sequence demanderait au-dela de sa hauteur minimale.
  let besoinSequence = 0;
  if (sequenceQuiRemplit) {
    const minimum = parseFloat(getComputedStyle(sequence).minHeight) || 0;
    sequence.style.flex = 'none';
    sequence.style.height = 'auto';
    besoinSequence = Math.max(0, sequence.offsetHeight - minimum);
    sequence.style.height = `${minimum}px`;
  }
  defilement.style.maxHeight = '0px';
  if (rechercheOuverte) defilementRecherche.style.maxHeight = '0px';
  // La colonne a toute la hauteur de la fenetre : c'est le bas de son contenu
  // qu'on mesure.
  // La barre de navigation collee en bas (interface/navigation-colonne.js ; en
  // face-a-face, celle de Reflexion IA) : sa place se garde, elle ne compte pas
  // dans le bas du contenu. Entre deux tableaux, elle compte comme eux.
  const derniere = colonne.lastElementChild;
  const barreDuBas = derniere?.matches('#navigation, .navigation-reflexion-ia') ? derniere : null;
  const enfants = [...colonne.children].filter((enfant) => enfant !== barreDuBas);
  const basDuContenu = Math.max(...enfants.map((enfant) => enfant.getBoundingClientRect().bottom));
  const libre = window.innerHeight - basDuContenu - (barreDuBas ? barreDuBas.offsetHeight : 0);
  Object.assign(sequence.style, avant);
  const pourLesTableaux = sequenceQuiRemplit ? libre - Math.min(besoinSequence, libre / MOITIE) : libre;
  if (rechercheOuverte) {
    const choisie = Number(defilement.dataset.hauteurChoisie) || null;
    const souhaitee = choisie ?? Math.min(defilement.scrollHeight, pourLesTableaux * PART_REFLEXION_AVEC_RECHERCHE);
    const pourReflexion = Math.max(HAUTEUR_MINIMUM_REFLEXION_PX, Math.min(souhaitee, pourLesTableaux - HAUTEUR_MINIMUM_REFLEXION_PX));
    defilement.style.maxHeight = `${pourReflexion}px`;
    defilement.style.height = choisie ? `${pourReflexion}px` : '';
    defilementRecherche.style.maxHeight = `${Math.max(HAUTEUR_MINIMUM_REFLEXION_PX, pourLesTableaux - pourReflexion)}px`;
  } else {
    defilement.style.maxHeight = `${Math.max(HAUTEUR_MINIMUM_REFLEXION_PX, pourLesTableaux)}px`;
  }
  for (const [element, haut] of defilements) element.scrollTop = haut;
  // La Sequence a pu raccourcir : son coup actif reste en vue (interface/sequence.js).
  garderNoeudActifVisible(document.getElementById('arbre'));
}

// Les fenetres de la colonne changent quand un tableau s'ouvre, se ferme,
// grandit ou prend une hauteur choisie (la colonne, elle, garde la hauteur de
// l'ecran) ; la fenetre, quand on la redimensionne. Une image plus tard : ce
// reglage change lui-meme ce qui est observe.
function demarrerHauteursColonne() {
  const reajuster = () => requestAnimationFrame(ajusterHauteursColonne);
  const reflexion = document.getElementById('reflexion-ia');
  const observateur = new ResizeObserver(reajuster);
  for (const fenetre of reflexion.parentElement.children) observateur.observe(fenetre);
  window.addEventListener('resize', reajuster);
  reflexion.addEventListener('toggle', reajuster);
  reflexion.querySelector('.recherche-ia').addEventListener('toggle', reajuster);
  brancherPoigneeReflexion(reflexion);
  return reajuster;
}

// La poignee entre Reflexion IA et la Recherche par 1er coup (saab,
// 2026-10-02 : « mettre une poignee qu'on puisse faire ce qu'on veut ») : elle
// fixe la hauteur du tableau Reflexion, la Recherche prend le reste. Meme
// mecanique que celle de la Sequence (interface/sequence.js) : capture du
// pointeur relachee explicitement.
function brancherPoigneeReflexion(reflexion) {
  const poignee = reflexion.querySelector('.poignee-reflexion-recherche');
  const defilement = reflexion.querySelector('.reflexion-ia-defilement');
  let hauteurDepart = 0;
  let yDepart = 0;
  poignee.addEventListener('pointerdown', (evenement) => {
    hauteurDepart = defilement.getBoundingClientRect().height;
    yDepart = evenement.clientY;
    poignee.setPointerCapture(evenement.pointerId);
  });
  poignee.addEventListener('pointermove', (evenement) => {
    if (!poignee.hasPointerCapture(evenement.pointerId)) return;
    defilement.dataset.hauteurChoisie = String(Math.max(HAUTEUR_MINIMUM_REFLEXION_PX, hauteurDepart + evenement.clientY - yDepart));
    ajusterHauteursColonne();
  });
  poignee.addEventListener('pointerup', (evenement) => poignee.releasePointerCapture(evenement.pointerId));
  poignee.addEventListener('pointercancel', (evenement) => poignee.releasePointerCapture(evenement.pointerId));
}
