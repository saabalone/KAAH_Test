// La boite de la NOUVELLE PARTIE (saab, 2026-10-27 : « Il y a 2 boites du même nom Mode pendule, sur btn
// Nouvelle partie et Pendule. Il faut renommer celle de Nouvelle partie, et ajouter la variante active, ainsi
// que le choix Variante/Pzl, et Correspondance (comme ça on a tout en un) ; si on valide seulement on reste
// sur les mêmes réglages ») : la boite du mode de pendule (interface/pendules-mode.js), sous son nom, avec la
// position qu'on va jouer — et, depuis le bouton Nouvelle partie, Variante…, PZL… et Correspondance… pour
// en choisir une autre ; les noms tapes des joueurs (interface/choix-joueurs.js, noms) partent avec elle.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const TITRE_DE_LA_BOITE_DES_PENDULES = 'Mode de pendule';
const TITRE_DE_LA_NOUVELLE_PARTIE = 'Nouvelle partie';

// `elements` : { dialogue, titre, section, variante, boutonsPosition, variantes, puzzles, correspondance } ;
// `choixModePendules` : la boite (interface/pendules-mode.js) ; `choixDesJoueurs` : sa rubrique Joueurs.
// Renvoie { ouvrir(reglages, { variante, choixDeLaPosition }) } : une Promise de { ...reglages, machines,
// noms, ailleurs } — `ailleurs` : 'variantes', 'puzzles' ou 'correspondance' si l'on est parti en choisir
// une autre position (rien ne demarre alors), null sinon.
function demarrerNouvellePartie(elements, choixModePendules, choixDesJoueurs) {
  let ailleurs = null;
  for (const [cle, bouton] of [['variantes', elements.variantes], ['puzzles', elements.puzzles], ['correspondance', elements.correspondance]]) {
    bouton.addEventListener('click', () => {
      ailleurs = cle;
      elements.dialogue.close();
    });
  }

  async function ouvrir(reglages, { variante, choixDeLaPosition = false }) {
    ailleurs = null;
    elements.titre.textContent = TITRE_DE_LA_NOUVELLE_PARTIE;
    elements.variante.textContent = variante;
    elements.boutonsPosition.hidden = !choixDeLaPosition;
    elements.section.hidden = false;
    const choisis = await choixModePendules.ouvrir(reglages, { avecAdversaire: true });
    elements.titre.textContent = TITRE_DE_LA_BOITE_DES_PENDULES;
    elements.section.hidden = true;
    return { ...choisis, noms: choixDesJoueurs.noms(), ailleurs };
  }

  return { ouvrir };
}
