// L'ajout « So », le SOLVEUR EN FIN de partie (saab, 2026-11-12 : « il me semblait qu'il mettait le solver en fin de partie pour
// trouver les meilleurs coups rapidement, non? » ; « Le solver ne doit être déconnecté que sur les PZL, mais sur les parties il doit se
// connecter » ; « on peut mettre 4 ou 5 tours pour la dernière billes, il suffit de voir si elle est piégée pour déclencher » ; « On peut
// aussi le mettre pour le mené, dès qu'il y a une sol le meneur sait aussi et donc ne recalcule pas »). A la partie 47 de l'essai 79, au
// tour 104 (5-4), KAI8 elague les reponses de Noir et croit gagner en 3 demi-coups ; le vrai gain (5 demi-coups) n'est joue que 31 tours
// plus tard. Le solveur de saab, lui, n'elague rien : quand l'adversaire n'a plus qu'une bille a perdre et qu'une de ses billes est
// piegee, la machine lui demande d'abord un gain force en So tours ; sinon, KAI++ cherche comme avant. Sa suite est exacte : les deux
// camps la gardent (interface/ia.js, interface/banc-essais-partie.js).
// Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : EJECTIONS_POUR_GAGNER, couleursDuPlateau (partie.js), couleurAdverse
// (regles.js), ecrirePosition (notation.js), VALEUR_VICTOIRE_IA (ia-evaluation.js), billesBloquees (ia-evaluation-v4.js),
// lireSequenceDuSolveur (solveur.js), coupsDesPositions, textesDeLaSequence (ia.js) viennent de fichiers charges avant celui-ci.

// La derniere bille : celle dont l'ejection finit la partie.
const BILLES_PERDUES_AVANT_LA_DERNIERE = EJECTIONS_POUR_GAGNER - 1;

// Les tours que le camp au trait de `etat` demande au solveur, ou 0 : seulement avec So (`reglage.poids.solveurEnFin`), quand son
// adversaire n'a plus qu'une bille a perdre et qu'une de ses billes est piegee (elle ne peut faire aucun pas vers le centre).
function toursDuSolveurEnFin(reglage, etat) {
  const tours = reglage.poids.solveurEnFin ?? 0;
  if (!(tours > 0)) return 0;
  const adverse = couleurAdverse(etat.joueurAuTrait);
  const perdues = adverse === 'noir' ? etat.billesEjecteesNoires : etat.billesEjecteesBlanches;
  if (perdues < BILLES_PERDUES_AVANT_LA_DERNIERE) return 0;
  return billesBloquees(couleursDuPlateau(etat.plateau), adverse) > 0 ? tours : 0;
}

// Le solveur fait toujours jouer Noir en premier (solveur/kaah-solveur.cpp, kaah_sequence) : Blanc au trait, on lui pose la meme
// position, les deux camps echanges (chaque moitie de la position garde ses cases et ses billes ejectees, elles changent de camp).
const positionCampsEchanges = (position) => {
  const [noir, blanc] = position.split('_');
  return `${blanc}_${noir}`;
};

// La question au solveur pour le camp au trait de `etat` : { position, noirGagne }.
function questionAuSolveurEnFin(etat) {
  const position = ecrirePosition(etat);
  return { position: etat.joueurAuTrait === 'noir' ? position : positionCampsEchanges(position), noirGagne: true };
}

// La reponse du solveur (kaah_sequence) pour le camp au trait de `etat` : { coup, texte, sequence (les textes de toute la suite, sans
// ambiguite), evaluation (une victoire a autant de demi-coups) }, ou null (pas de gain, temps depasse, reponse illisible). Les positions
// de sa suite, remises dans les vrais camps, disent les coups : le texte Nacre peut etre ambigu, la position jamais.
function coupDuSolveurEnFin(etat, reponse) {
  const lue = lireSequenceDuSolveur(reponse);
  if (lue.verdict !== 'valide' || lue.coups.length === 0) return null;
  const positions = lue.coups.map(({ position }) => (etat.joueurAuTrait === 'noir' ? position : positionCampsEchanges(position)));
  const coups = coupsDesPositions(etat, positions);
  if (coups.length === 0) return null;
  const sequence = textesDeLaSequence(etat, coups);
  return { coup: coups[0], texte: sequence[0], sequence, evaluation: VALEUR_VICTOIRE_IA - coups.length };
}
