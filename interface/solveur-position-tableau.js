// Le TABLEAU DE RECHERCHE du panneau Solveur (saab, 2026-11-06 : « il faudrait mettre dans la colonne de droite le
// tableau de recherche du solveur ») : un premier coup du camp au trait par ligne, ce que le solveur en dit, et la
// sequence de chaque solution (interface/solveur-position-recherche.js, qui le remplit au fil de la recherche). Un clic
// sur une ligne qui a une sequence la montre sur le petit plateau (saab : « il faudrait montrer au clic sur le coup
// (ou la ligne) la séquence dans le mini plateau »).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : sequenceNumerotee (moteur/solveur-position.js) vient d'un autre
// fichier, appele seulement a l'usage.

// L'ordre du tableau une fois la recherche finie, comme le solveur de KAAWA : les solutions en tete, puis le reste ;
// a verdict egal, la plus longue sequence d'abord (saab : « le tri final met de la plus longue à la plus courte
// séquence »).
const RANG_DU_VERDICT = { valide: 0, indetermine: 1, erreur: 2, invalide: 3 };

// `recherche` : { tours, nomDuGagnant, gagnantAuTrait, perd, fini } ; `ligne` : { coup, verdict, coups (la sequence, ou
// null), toursReels (une defense qui perd plus vite, ou un coup qui perd : le gain du gagnant apres lui) }.
function texteDuVerdictDuSolveur(recherche, { verdict, coups, toursReels }) {
  if (verdict === 'indetermine') return 'pas jugé à temps';
  if (verdict === 'erreur') return 'arrêté';
  const sequence = coups ? ` : ${sequenceNumerotee(coups)}` : '';
  // Perd (interface/solveur-position-perd.js) : le coup tient, ou perd en combien de tours.
  if (recherche.perd) return verdict === 'valide' ? `tient ${recherche.tours} tours` : `perd en ${toursReels}${sequence}`;
  if (verdict === 'valide') {
    const quoi = recherche.gagnantAuTrait ? `gagne en ${recherche.tours}` : 'meilleure défense';
    if (coups) return `${quoi}${sequence}`;
    return `${quoi}${recherche.fini ? ' (séquence pas trouvée à temps)' : ', séquence…'}`;
  }
  if (recherche.gagnantAuTrait) return `pas en ${recherche.tours}`;
  return toursReels ? `perd plus vite, ${recherche.nomDuGagnant} gagne en ${toursReels}${sequence}` : 'perd plus vite';
}

// Les lignes du tableau (des <div>), dans l'ordre des coups pendant la recherche, triees a la fin.
// `montrerLaSequence(ligne)` : au clic sur une ligne qui a sa sequence.
function lignesDuTableauDuSolveur(recherche, montrerLaSequence) {
  const rang = ({ verdict }) => RANG_DU_VERDICT[verdict] ?? RANG_DU_VERDICT.indetermine;
  const longueur = ({ coups }) => coups?.length ?? 0;
  const lignes = recherche.fini ? [...recherche.lignes].sort((a, b) => rang(a) - rang(b) || longueur(b) - longueur(a)) : recherche.lignes;
  return lignes.map((ligneJugee) => {
    const ligne = document.createElement('div');
    ligne.className = 'ligne-liste ligne-solveur';
    if (ligneJugee.verdict === 'valide') ligne.classList.add('ligne-solveur-valide');
    const texte = document.createElement('span');
    texte.className = 'ligne-liste-texte';
    texte.textContent = ligneJugee.coup.toUpperCase();
    const verdict = document.createElement('span');
    verdict.textContent = texteDuVerdictDuSolveur(recherche, ligneJugee);
    ligne.append(texte, verdict);
    if (ligneJugee.coups) {
      ligne.classList.add('ligne-solveur-sequence');
      ligne.title = 'Montre cette séquence sur le petit plateau';
      ligne.addEventListener('click', () => montrerLaSequence(ligneJugee));
    }
    return ligne;
  });
}
