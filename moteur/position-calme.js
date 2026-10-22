// Une POSITION CALME (saab, 2026-10-19 : « dès qu'il y a un bloc contre bloc, l'IA met
// toujours 30 s (ou plus) ... il faudrait trouver un coup acceptable rapidement ; en bloc,
// l'attaque est rarement gagnante, et le nul devrait être la meilleure solution ») :
// aucun des deux camps ne peut pousser une bille adverse (pas de sumito). La machine y
// reflechit au plus REFLEXION_EN_POSITION_CALME_S (interface/ia.js) : la recherche
// garde le meilleur coup de la derniere profondeur finie. Pur, sans DOM.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : tousLesCoupsLegaux (moteur/regles.js),
// couleursDuPlateau (moteur/partie.js) viennent de fichiers charges avant celui-ci.

const REFLEXION_EN_POSITION_CALME_S = 5;
const CAMPS_DE_LA_POSITION = ['noir', 'blanc'];

// Regle d'Abalone : une poussee (sumito) deplace des billes adverses ; sans elle, aucune
// bille ne peut etre ejectee au coup suivant.
function positionCalme(etat) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return CAMPS_DE_LA_POSITION.every((camp) => tousLesCoupsLegaux(couleurs, camp).every((coup) => coup.billesPoussees.length === 0));
}

// La reflexion de la machine sur `etat` : la sienne (`reflexionMax`, en secondes), au plus
// REFLEXION_EN_POSITION_CALME_S en position calme.
const reflexionDeLaPosition = (etat, reflexionMax) => (positionCalme(etat) ? Math.min(reflexionMax, REFLEXION_EN_POSITION_CALME_S) : reflexionMax);
