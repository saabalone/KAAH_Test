// Historique de NAVIGATION dans l'arbre (phase 11bis) : ou est-on ALLE, dans quel
// ordre — pas les coups joues, deja gere par moteur/arbre.js (chemin, cheminOrigine).
// Comme le retour arriere d'un navigateur web (KAAWA, kaa_engine_ClO_Co.py,
// nav_history/nav_index) : cliquer un coup ailleurs dans l'arbre (Sequence,
// Commentaires, Occurrences) est un SAUT qui alimente cette pile ; Precedent,
// Suivant, Debut, Fin et Annuler (moteur/arbre.js : reculerDansArbre,
// avancerDansArbre, allerALaRacine, avancerJusquauProchainChoix, supprimerBranche)
// restent sequentiels et n'y touchent jamais — deux mecanismes distincts, comme
// dans KAAWA (verifie : ses boutons |<H/<H/H> sont separes de <</>>>/|<</>>|).
//
// Pur et immuable comme le reste du moteur : chaque fonction renvoie un nouvel
// historique, jamais modifie l'ancien.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : cheminsEgaux vient de
// moteur/arbre.js, charge avant celui-ci dans index.html.

function creerHistoriqueNavigation() {
  return { pile: [], index: -1 };
}

// Le chemin actuellement pointe par l'historique, ou `null` s'il est vide.
function cheminActuelHistorique(historique) {
  return historique.pile[historique.index] ?? null;
}

// Empile `chemin`, en tronquant d'abord tout ce qui suivait l'index actuel (un
// nouveau saut depuis le passe rend caduque l'ancien "retour en avant", comme
// dans un navigateur web). Ne fait rien si `chemin` est deja la position
// actuelle (un saut vers le noeud deja affiche n'est pas un vrai saut).
function empilerVisite(historique, chemin) {
  if (cheminsEgaux(cheminActuelHistorique(historique) ?? [], chemin)) return historique;
  const pile = [...historique.pile.slice(0, historique.index + 1), chemin];
  return { pile, index: pile.length - 1 };
}

// A appeler pour CHAQUE saut direct (clic sur un coup ailleurs dans l'arbre —
// jamais pour Precedent/Suivant/Debut/Fin/Annuler). Si l'historique est encore
// vide, enregistre d'abord `cheminDepart` (sinon "reculer" n'aurait nulle part ou
// revenir depuis ce tout premier saut), puis `cheminArrivee` — exactement le
// `record_navigation` appele deux fois par `jump_to_node` dans KAAWA.
function enregistrerSaut(historique, cheminDepart, cheminArrivee) {
  if (cheminsEgaux(cheminDepart, cheminArrivee)) return historique;
  const avecDepart = historique.pile.length === 0 ? empilerVisite(historique, cheminDepart) : historique;
  return empilerVisite(avecDepart, cheminArrivee);
}

function reculerHistorique(historique) {
  if (historique.index <= 0) return historique;
  return { ...historique, index: historique.index - 1 };
}

function avancerHistorique(historique) {
  if (historique.index >= historique.pile.length - 1) return historique;
  return { ...historique, index: historique.index + 1 };
}

// Revient au tout PREMIER chemin enregistre dans cette exploration — pas
// forcement la racine de l'arbre, si l'historique a commence plus loin.
function origineHistorique(historique) {
  if (historique.pile.length === 0) return historique;
  return { ...historique, index: 0 };
}
