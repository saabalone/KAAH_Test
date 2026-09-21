// Nulle par repetition (Phase 17). Separe de interface/saisie.js pour la
// meme raison que interface/pendules.js : une responsabilite a part —
// celle-ci decide QUAND proposer la nulle et QUOI faire de la reponse,
// jamais une regle du jeu elle-meme (ca, c'est moteur/nulle.js).
//
// SEUL Occ (la position exacte) propose la nulle — Ref (la posRef, meme
// position vue par symetrie) reste une simple indication, jamais un
// declencheur (voir moteur/nulle.js pour le detail et la reference a
// KAAWA). Occ et Ref ne comptent d'ailleurs QUE sur la sequence en cours
// (le chemin depuis la racine), jamais sur les autres branches explorees
// (confirme par saab, 2026-09-16) — voir positionsDepuisLaRacine plus bas.
// Une future info "Br_Occ"/"Br_Ref" (les memes compteurs, mais sur TOUT
// l'arbre explore, comme l'onglet "Occurrences" de KAAWA) est une idee de
// saab pour plus tard, notee ici mais pas construite : rien n'en depend
// encore et aucun affichage n'existe pour la recevoir.
//
// Pas de compteur permanent affiche pour l'instant : KAAWA montre
// "Occ.: N (Ref.: M)" a la verticale, tout a gauche DANS la fenetre du
// plateau (pas une colonne HTML a part — precision de saab, 2026-09-16,
// qui corrige une mauvaise lecture de sa demande precedente : c'est du
// texte SVG, comme dessinerNombreEjecte, voir rendu/ejections.js), et ce
// texte n'existe pas encore cote KAAH. Rien ne sert d'improviser un
// affichage provisoire qu'il faudra deja redessiner (CLAUDE.md, pas
// d'abstraction prematuree). Saab a par ailleurs annonce un bouton MANUEL
// de nulle a venir en meme temps que ce compteur, independant du seuil de
// repetition (comme le "Proposer nulle ?" separe de kaa_app_ClO_Co.py) —
// sans lien avec ce fichier-ci, qui ne gere
// QUE la proposition automatique par repetition.
//
// La QUESTION ("declarer la partie nulle ?") est posee par interface/saisie.js
// avec la meme boite de confirmation que les autres demandes (verte, boutons
// "Accepter" et "Refuser", jamais "Annuler" : ce mot est deja celui du bouton
// de navigation). Une boite native (window.confirm) affichait les mots du
// navigateur et BLOQUAIT toute la page tant qu'on n'y repondait pas : sur
// telephone, saab a vu la page se figer jusqu'a ce qu'il quitte puis revienne
// sur l'onglet.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : etatNulle et
// SEUIL_NULLE_PAR_DEFAUT viennent de moteur/nulle.js, ecrirePosition de
// moteur/notation.js, noeudCourant de moteur/arbre.js — tous charges avant
// celui-ci dans index.html.
//
// Reutilise SEUIL_NULLE_PAR_DEFAUT (moteur/nulle.js) plutot que son propre
// chiffre : les deux valaient 3 depuis le debut mais restaient deux
// constantes SEPAREES a tenir synchronisees (CLAUDE.md, "une regle n'est
// jamais ecrite a deux endroits") — fusionnees en une seule en ajoutant le
// compteur sur le plateau (rendu/ejections.js), qui devait lire ce meme
// seuil mais charge trop tot pour voir une constante definie ici.

// Les positions compressees de la racine jusqu'a `chemin` INCLUS, dans
// l'ordre — l'historique qu'attend moteur.etatNulle : Occ et Ref ne
// portent que sur le chemin REELLEMENT suivi, jamais sur les autres
// branches explorees.
function positionsDepuisLaRacine(arbre, chemin) {
  const positions = [ecrirePosition(arbre.racine.etat)];
  let noeud = arbre.racine;
  for (const index of chemin) {
    noeud = noeud.enfants[index];
    positions.push(ecrirePosition(noeud.etat));
  }
  return positions;
}

// A appeler juste apres avoir joue un coup REEL (jamais en navigant dans
// l'historique : revisiter une position deja vue ne doit pas rouvrir une
// question qu'on y a peut-etre deja tranchee). Renvoie `null` s'il n'y a rien a
// proposer, sinon { occurrences, position } : la position repetee et son
// nombre d'occurrences, de quoi poser la question.
//
// C'est l'APPELANT qui retient la position comme refusee AVANT de poser la
// question (moteur/arbre.js, refuserNulle) : CETTE position ne se reproposera
// plus JAMAIS, quel que soit le chemin par lequel elle revient, meme apres un
// "Annuler" suivi du meme coup rejoue — et fermer la boite sans repondre vaut
// refus. Si la nulle est acceptee, la partie est marquee finie de toute facon.
function repetitionAProposer(arbre) {
  const noeud = noeudCourant(arbre);
  // Rien a proposer sur une position deja definitive (victoire par
  // ejections venant d'avoir lieu sur ce meme coup, ou noeud deja marque
  // d'une fin de partie par ailleurs).
  if (noeud.etat.vainqueur || noeud.statutFin) return null;

  const positions = positionsDepuisLaRacine(arbre, arbre.chemin);
  const positionCourante = positions[positions.length - 1];
  if (arbre.nullesRefusees.includes(positionCourante)) return null;

  const etat = etatNulle(positions, positionCourante, SEUIL_NULLE_PAR_DEFAUT, false);
  if (!etat.proposable) return null; // seul Occ compte ici, voir moteur/nulle.js
  return { occurrences: etat.occurrences, position: positionCourante };
}
