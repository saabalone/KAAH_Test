// Ce qui change d'une partie a la suivante quand on choisit Revanche ou Same dans
// « Fin de partie : Options » (phase 20bis) : les noms des joueurs et l'orientation
// du plateau. Pur, sans DOM.
//
// Regle lue dans KAAWA (kaa_engine_ClO_Co.py, start_game et `_toggle_r`) :
//   - REVANCHE : les noms s'echangent entre les camps (le joueur qui avait Noir a
//     maintenant Blanc, et inversement). Pour les noms PAR DEFAUT (Joueur_1 /
//     Joueur_2), un suffixe « R » s'ajoute ou se retire en alternance : l'ancien
//     Joueur_1 (Noir) devient « Joueur_1R » (Blanc), l'ancien Joueur_2 (Blanc)
//     devient « Joueur_2R » (Noir), et le titre de la partie le montre ; une
//     seconde revanche retire les R. Un nom PERSONNALISE est seulement echange,
//     jamais suffixe.
//   - SAME : ni les noms ni les couleurs ne changent.
//
// L'ORIENTATION (demande de saab) : la Revanche retourne le plateau de 180
// degres — l'ancien Joueur 2, assis en haut, joue maintenant Noir et doit avoir
// les Noirs de SON cote (d'abord en face-a-face seulement, partout depuis le
// 2026-09-25). A la revanche suivante il revient ; Same ne
// la change pas. `plateauRetourne` est ecrit dans le fichier de la partie (champ
// propre a KAAH, comme NullesRefusees : KAAWA l'ignore) pour survivre a un
// rechargement.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// Les noms d'un joueur qui n'en a pas choisi : « Joueur_1 » pour Noir, « Joueur_2 »
// pour Blanc (KAAWA : Player_1 / Player_2). Seule source de ces noms — index.html et
// rendu/ejections.js les lisent ici.
// Avec "_" et jamais d'espace, comme tout nom (moteur/nom-partie.js,
// nomJoueurAutorise).
const NOMS_PAR_DEFAUT = { noir: 'Joueur_1', blanc: 'Joueur_2' };

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
// plateauRetourne, machines }` en entree comme en sortie. `machines` (phases 29
// et 32, moteur/ia.js) : { noir, blanc }, ou null entre humains ; a la Revanche
// les joueurs echangent leurs couleurs, chaque machine prend donc l'AUTRE camp.
function partieSuivante(choix, { joueurs, plateauRetourne, machines = null }) {
  if (choix === 'revanche') {
    return {
      joueurs: nomsDeRevanche(joueurs),
      plateauRetourne: !plateauRetourne,
      machines: machines && { noir: machines.blanc, blanc: machines.noir },
    };
  }
  return { joueurs, plateauRetourne, machines };
}

// Une partie demarree par une Option (Revanche, Same) la laisse rechoisir tant
// que personne n'y a vraiment joue (saab, 2026-10-02 : « pouvoir faire une
// revanche si on s'est trompe dans l'Option, car par ex. on avait clic
// Same ») : aucun coup, ou seulement le premier coup d'une machine — elle joue
// tout de suite quand elle a Noir. `arbre` : moteur/arbre.js.
function choixDeLOptionModifiable(arbre) {
  const coups = arbre.racine.enfants;
  if (coups.length === 0) return true;
  return coups.length === 1 && Boolean(coups[0].reflexionIA) && coups[0].enfants.length === 0;
}
