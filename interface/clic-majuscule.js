// MAJ + CLIC sur une case a cocher (saab, 2026-10-15 : « dans les tableaux, mettre Shift +
// clic pour sélectionner plusieurs champs, c'est-à-dire valider de la dernière à celle
// qu'on clique ») : toutes les cases entre la derniere touchee et celle-ci, dans sa
// colonne ou sa ligne, prennent l'etat de celle-ci. Pour les tableaux de l'Entrainement
// (reglages, listes, Ceintures ×).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// `voisines(caseTouchee)` : les suites ordonnees de cases ou chercher la precedente (sa
// colonne, sa ligne) ; `appliquer(cases, etat)` : les poser (le tableau les fait suivre
// comme un clic, puis se met a jour une fois). `cleDe(case)` : ce qui la reconnait si le
// tableau a ete redessine entre les deux clics (le tableau des reglages se refait a
// chaque retouche).
function brancherClicMajuscule(conteneur, voisines, appliquer, cleDe = null) {
  let derniere = null; // { element, cle }
  conteneur.addEventListener('click', (evenement) => {
    const touchee = evenement.target.closest('input[type="checkbox"]');
    if (!touchee) return;
    const avant = derniere;
    derniere = { element: touchee, cle: cleDe?.(touchee) };
    if (!evenement.shiftKey || !avant) return;
    for (const suite of voisines(touchee)) {
      const precedente = avant.element.isConnected ? avant.element : suite.find((autre) => cleDe && cleDe(autre) === avant.cle);
      if (!precedente || precedente === touchee) continue;
      const [i, j] = [suite.indexOf(precedente), suite.indexOf(touchee)];
      if (i < 0 || j < 0) continue;
      const entre = suite.slice(Math.min(i, j), Math.max(i, j) + 1).filter((autre) => autre !== touchee && !autre.disabled);
      return appliquer(entre, touchee.checked);
    }
  });
}
