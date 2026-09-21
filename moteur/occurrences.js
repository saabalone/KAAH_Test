// Occurrences sur TOUT L'ARBRE EXPLORE (Phase 18, suite du panneau
// Commentaires) : "Br_Occ" et "Br_Ref", les memes idees qu'Occ et Ref
// (moteur/nulle.js), mais sur toutes les branches jamais jouees plutot que
// sur la seule sequence en cours. Alimente le panneau "Occurrences" —
// verifie contre KAAWA (kaa_engine_ClO_Co.py, find_occurrences, qui
// scanne tout `tree_root` ; kaa_tab_manager_ClO_Co.py,
// setup_occurrences_tab, qui construit les deux listes cliquables Occ/Ref
// a partir de ce meme scan).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ecrirePosition vient
// de moteur/notation.js, positionCanonique de moteur/permutations.js —
// tous deux charges avant celui-ci dans index.html.

// Toutes les positions de l'arbre, racine comprise : { chemin, position }
// pour chaque noeud, dans l'ordre d'un parcours en profondeur.
function noeudsDeLArbre(arbre) {
  const resultat = [];
  function marcher(noeud, chemin) {
    resultat.push({ chemin, position: ecrirePosition(noeud.etat) });
    noeud.enfants.forEach((enfant, index) => marcher(enfant, [...chemin, index]));
  }
  marcher(arbre.racine, []);
  return resultat;
}

// Cle stable pour comparer deux chemins sans dependre de l'identite du
// tableau (une egalite structurelle simple suffit ici).
function cleDuChemin(chemin) {
  return chemin.join('.');
}

// Ou en est `position` par rapport a TOUT l'arbre explore (pas seulement
// le chemin regarde — voir moteur/nulle.js pour cette autre version).
// Renvoie :
//   brOccurrences    : combien de noeuds, dans tout l'arbre, ont EXACTEMENT
//                      cette position (celle-ci comprise) ;
//   brOccurrencesRef : combien partagent sa posRef (ejections/symetrie
//                      confondues) — au moins egal a brOccurrences ;
//   noeudsExacts     : { chemin, position }[] de ces occurrences exactes ;
//   noeudsRefSeuls   : les noeuds qui partagent la posRef SANS partager la
//                      position exacte — jamais les deux listes a la fois
//                      pour un meme noeud (meme choix d'affichage que
//                      KAAWA, "ref_only" dans setup_occurrences_tab).
function etatOccurrencesArbre(arbre, position) {
  const noeuds = noeudsDeLArbre(arbre);
  const reference = positionCanonique(position).positionReference;

  const noeudsExacts = noeuds.filter((n) => n.position === position);
  const noeudsParRef = noeuds.filter((n) => positionCanonique(n.position).positionReference === reference);

  const cheminsExacts = new Set(noeudsExacts.map((n) => cleDuChemin(n.chemin)));
  const noeudsRefSeuls = noeudsParRef.filter((n) => !cheminsExacts.has(cleDuChemin(n.chemin)));

  return {
    brOccurrences: noeudsExacts.length,
    brOccurrencesRef: noeudsParRef.length,
    noeudsExacts,
    noeudsRefSeuls,
  };
}
