// La barre de navigation du plateau (#navigation) dans la colonne des tableaux,
// sur ordinateur (saab, 2026-10-06 : « on n'a qu'a la mettre la en permanence et
// la supprimer dans celle des autres tableaux car ca fait doublon, peut-etre
// faudrait-il pouvoir la faire monter/descendre quand on veut, c'est-a-dire
// qu'elle aille s'intercaler entre 2 tableaux ») : tout en bas par defaut ; ses
// boutons ▲ ▼ la font passer au-dessus du tableau visible precedent, ou
// au-dessous du suivant. CET appareil retient la place : l'identifiant du
// tableau qui la suit, rien pour tout en bas.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const CLE_PLACE_NAVIGATION = 'kaah-place-navigation';

function lirePlaceNavigation() {
  try {
    return window.localStorage.getItem(CLE_PLACE_NAVIGATION) ?? '';
  } catch {
    return '';
  }
}

function retenirPlaceNavigation(navigation) {
  try {
    window.localStorage.setItem(CLE_PLACE_NAVIGATION, navigation.nextElementSibling?.id ?? '');
  } catch {
    // Tant pis : tout en bas a la prochaine ouverture.
  }
}

// A sa place retenue dans `colonne`, ou tout en bas.
function poserNavigationDansLaColonne(navigation, colonne) {
  const suivant = document.getElementById(lirePlaceNavigation());
  if (suivant && suivant !== navigation && suivant.parentElement === colonne) colonne.insertBefore(navigation, suivant);
  else colonne.append(navigation);
}

// Un tableau cache ne compte pas : la barre saute par-dessus.
const estVisibleDansLaColonne = (element) => element.offsetHeight > 0;

function voisinVisible(navigation, sens) {
  const propriete = sens < 0 ? 'previousElementSibling' : 'nextElementSibling';
  let voisin = navigation[propriete];
  while (voisin && !estVisibleDansLaColonne(voisin)) voisin = voisin[propriete];
  return voisin;
}

// `apresDeplacement()` : les hauteurs des tableaux a refaire.
function brancherDeplacementNavigation(navigation, monter, descendre, apresDeplacement) {
  monter.addEventListener('click', () => {
    const voisin = voisinVisible(navigation, -1);
    if (!voisin) return;
    voisin.before(navigation);
    retenirPlaceNavigation(navigation);
    apresDeplacement();
  });
  descendre.addEventListener('click', () => {
    const voisin = voisinVisible(navigation, 1);
    if (!voisin) return;
    voisin.after(navigation);
    // Plus rien de visible dessous : tout en bas de la fenetre.
    if (!voisinVisible(navigation, 1)) navigation.parentElement.append(navigation);
    retenirPlaceNavigation(navigation);
    apresDeplacement();
  });
}
