// Ce qui change d'une partie a la suivante quand on choisit Revanche ou Same dans
// « Fin de partie : Options » (phase 20bis) : les noms des joueurs et l'orientation
// du plateau. Pur, sans DOM.
//
// Regle lue dans KAAWA (kaa_engine_ClO_Co.py, start_game et `_toggle_r`) :
//   - REVANCHE : les noms s'echangent entre les camps (le joueur qui avait Noir a
//     maintenant Blanc, et inversement). Pour les noms PAR DEFAUT (Joueur 1 /
//     Joueur 2), un suffixe « R » s'ajoute ou se retire en alternance : l'ancien
//     Joueur 1 (Noir) devient « Joueur 1R » (Blanc), l'ancien Joueur 2 (Blanc)
//     devient « Joueur 2R » (Noir), et le titre de la partie le montre ; une
//     seconde revanche retire les R. Un nom PERSONNALISE est seulement echange,
//     jamais suffixe.
//   - SAME : ni les noms ni les couleurs ne changent.
//
// L'ORIENTATION (demande de saab) : en face-a-face, la Revanche retourne le
// plateau de 180 degres — l'ancien Joueur 2, assis en haut, joue maintenant Noir et
// doit avoir les Noirs en bas POUR LUI. A la revanche suivante il revient ; Same ne
// la change pas. `plateauRetourne` est ecrit dans le fichier de la partie (champ
// propre a KAAH, comme NullesRefusees : KAAWA l'ignore) pour survivre a un
// rechargement.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// Les noms d'un joueur qui n'en a pas choisi : « Joueur 1 » pour Noir, « Joueur 2 »
// pour Blanc (KAAWA : Player_1 / Player_2). Seule source de ces noms — index.html et
// rendu/ejections.js les lisent ici.
const NOMS_PAR_DEFAUT = { noir: 'Joueur 1', blanc: 'Joueur 2' };

const SUFFIXE_REVANCHE = 'R';

// Ajoute ou retire le suffixe R d'un nom PAR DEFAUT ; tout autre nom est rendu tel
// quel.
function basculerSuffixeRevanche(nom) {
  for (const parDefaut of Object.values(NOMS_PAR_DEFAUT)) {
    if (nom === parDefaut) return parDefaut + SUFFIXE_REVANCHE;
    if (nom === parDefaut + SUFFIXE_REVANCHE) return parDefaut;
  }
  return nom;
}

// Les noms apres une revanche : echanges, avec le suffixe R qui alterne pour les
// noms par defaut.
function nomsDeRevanche(joueurs) {
  return { noir: basculerSuffixeRevanche(joueurs.blanc), blanc: basculerSuffixeRevanche(joueurs.noir) };
}

// La partie qui suit, selon le choix ('revanche' ou 'same') : `{ joueurs,
// plateauRetourne }` en entree comme en sortie.
function partieSuivante(choix, { joueurs, plateauRetourne }) {
  if (choix === 'revanche') return { joueurs: nomsDeRevanche(joueurs), plateauRetourne: !plateauRetourne };
  return { joueurs, plateauRetourne };
}
