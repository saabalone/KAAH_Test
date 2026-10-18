// ANNULER / RETABLIR dans le tableau des reglages de l'Entrainement (saab, 2026-10-16 :
// « dans réglages Ceinture, pouvoir aussi annuler/rétablir la dernière saisie par
// ctrl+z/ctrl+y ») : chaque retouche garde le brouillon d'avant ; Ctrl+Z y revient,
// Ctrl+Y (ou Ctrl+Maj+Z) refait ce qu'on vient d'annuler. Une nouvelle retouche oublie ce
// qu'on pouvait refaire, comme partout. Extrait d'interface/entrainement-reglages.js
// (regle des 200 lignes).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// Les brouillons d'avant et ceux qu'on peut refaire (un brouillon : des valeurs, ou null
// pour « aucune retouche »).
function creerAnnulerRetablirDesReglages() {
  let passes = [];
  let annules = [];
  return {
    // Une retouche : `avant`, le brouillon qu'elle remplace.
    retenir(avant) {
      passes.push(avant);
      annules = [];
    },
    // Le brouillon d'avant `actuel`, ou undefined (rien a annuler).
    annuler(actuel) {
      if (passes.length === 0) return undefined;
      annules.push(actuel);
      return passes.pop();
    },
    // Le brouillon qu'on vient d'annuler, ou undefined (rien a refaire).
    retablir(actuel) {
      if (annules.length === 0) return undefined;
      passes.push(actuel);
      return annules.pop();
    },
    // Un autre profil, une validation : on repart de rien.
    oublier() {
      [passes, annules] = [[], []];
    },
  };
}

// Ctrl+Z et Ctrl+Y (Cmd sur Mac) dans `element` : ils remplacent ceux du navigateur, qui
// n'annuleraient que la frappe dans un champ.
function brancherCtrlZEtCtrlY(element, annuler, retablir) {
  element.addEventListener('keydown', (evenement) => {
    if (!(evenement.ctrlKey || evenement.metaKey) || evenement.altKey) return;
    const touche = evenement.key.toLowerCase();
    const refaire = touche === 'y' || (touche === 'z' && evenement.shiftKey);
    if (touche !== 'z' && touche !== 'y') return;
    evenement.preventDefault();
    if (refaire) retablir();
    else annuler();
  });
}
