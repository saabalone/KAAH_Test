// Nulle par repetition (Phase 17). KAAWA compte deux choses en parallele,
// affichees dans son onglet "Occurrences" (kaa_tab_manager_ClO_Co.py,
// setup_occurrences_tab) :
//   - Occ : combien de fois la position EXACTE (chaine compressee,
//     ejections comprises) est apparue sur le CHEMIN REELLEMENT SUIVI
//     depuis le depart. JAMAIS tout l'arbre explore, seulement les
//     positions par lesquelles on est reellement passe — verifie contre
//     kaa_engine_ClO_Co.py (sync_tree_to_legacy_lists reconstruit
//     move_history en ne remontant QUE les parents du noeud courant,
//     jamais les autres branches ; find_occurrences, qui LUI scanne tout
//     l'arbre, n'alimente que l'onglet "Occurrences" — un simple historique
//     de consultation, jamais le declenchement de la proposition).
//   - Ref : la meme chose, mais sur la posRef (moteur/permutations.js,
//     phase 14) plutot que sur le texte brut — deux positions qui ne
//     different que par une rotation, un miroir ou un echange des camps
//     comptent alors comme LA MEME repetition.
//
// SEUL Occ PROPOSE LA NULLE — Ref reste une simple INDICATION (un chiffre a
// afficher a cote, des que la colonne "Occurrences" existera, voir
// interface/nulle.js), jamais un declencheur. Decision de saab
// (2026-09-16), et c'est aussi exactement ce que fait le vrai code de
// KAAWA, mesure en le lisant : seul Occ declenche la popup
// (kaa_board_widget_ClO_Co.py, _add_occurrence_label -> tm.
// check_triple_repetition(count) — `count` y est TOUJOURS le compte EXACT,
// jamais nRef ; nRef, lui, ne sert qu'a colorer un chiffre affiche a cote,
// une fonctionnalite marquee "### F2" dans les commentaires de KAAWA,
// enregistree mais jamais vraiment branchee au declenchement).
// PREMIERE VERSION DE CETTE PHASE, CORRIGEE : KAAH faisait d'abord
// declencher Ref aussi (en pensant completer une fonctionnalite laissee a
// moitie faite par KAAWA) — saab a signale, en testant, qu'une simple
// ressemblance par symetrie ne doit rester qu'une information, jamais une
// vraie proposition de nulle.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : positionCanonique
// vient de moteur/permutations.js, charge avant celui-ci dans index.html.

// Reglable de 2 a 5 (voir PLAN.md) — KAAWA a deux reglages independants,
// occ_draw_limit et nref_draw_limit, tous deux a 3 par defaut ; KAAH n'en
// garde qu'UN SEUL, applique aux deux compteurs a la fois (plus simple, et
// rien dans le PLAN ni dans l'usage ne demande de les distinguer). Vrai
// reglage utilisateur a la phase 22 ; fige ici pour l'instant, meme
// philosophie que SECONDES_ALERTE_PENDULE (interface/pendules.js).
const SEUIL_NULLE_PAR_DEFAUT = 3;

// Combien de fois `position` apparait, telle quelle, dans `historique`
// (qui comprend `position` elle-meme si c'est bien la derniere jouee).
function compterOccurrences(historique, position) {
  return historique.filter((texte) => texte === position).length;
}

// Meme chose, mais en comparant les posRef : detecte donc aussi les
// repetitions obtenues par symetrie du plateau ou par echange des camps.
function compterOccurrencesRef(historique, position) {
  const reference = positionCanonique(position).positionReference;
  return historique.filter((texte) => positionCanonique(texte).positionReference === reference).length;
}

// Ou en est la partie vis-a-vis de la regle de nulle. `historique` : les
// positions compressees de la racine jusqu'au noeud regarde, INCLUS.
// `dejaTraitee` : cette POSITION a-t-elle deja ete refusee, n'importe ou
// dans cette partie (voir interface/nulle.js, qui retient l'ensemble des
// positions refusees) ? Refuser une fois pour une position donnee ne doit
// plus jamais reproposer CETTE MEME position — mais une position
// DIFFERENTE qui atteint son propre seuil doit se proposer normalement.
//
// Renvoie { occurrences, occurrencesRef, seuil, proposable }. `proposable`
// ne depend QUE d'Occ (voir l'en-tete du fichier) : `occurrencesRef` reste
// toujours calcule et renvoye, pour un futur affichage, mais ne fait
// jamais basculer `proposable` a lui seul.
function etatNulle(historique, position, seuil = SEUIL_NULLE_PAR_DEFAUT, dejaTraitee = false) {
  const occurrences = compterOccurrences(historique, position);
  const occurrencesRef = compterOccurrencesRef(historique, position);
  return {
    occurrences,
    occurrencesRef,
    seuil,
    proposable: !dejaTraitee && occurrences >= seuil,
  };
}

// Quel son jouer quand le compte Occ passe de `occurrencesAvant` a
// `occurrencesMaintenant` (phase 21) : "occ_draw" s'il atteint le seuil de
// nulle, "occ_change" s'il change sans l'atteindre, `null` (silence) sinon.
// Regle de KAAWA (kaa_board_widget_ClO_Co.py, _add_occurrence_label) : rien
// tant que la position n'est vue qu'une fois (compte <= 1), rien si le compte
// est le meme qu'avant — ce qui se produit a chaque navigation entre deux
// positions de meme compte.
function sonOccurrence(occurrencesAvant, occurrencesMaintenant, seuil = SEUIL_NULLE_PAR_DEFAUT) {
  if (occurrencesMaintenant === occurrencesAvant || occurrencesMaintenant <= 1) return null;
  return occurrencesMaintenant >= seuil ? 'occ_draw' : 'occ_change';
}
