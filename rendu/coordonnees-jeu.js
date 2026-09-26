// Coordonnees affichees PENDANT la partie (phase 19bis, partie 2/3) —
// jamais la bordure permanente (rendu/coordonnees-bord.js, un fichier a
// part, une autre responsabilite) :
//   - sur chaque bille du camp AU TRAIT, en permanence tant qu'une partie
//     est en cours (KAAWA, reglage "Coord sur billes" — SHOW_BALL_COORDS,
//     actif par defaut ; KAAH n'a pas encore de Reglages, phase 22, donc
//     actif en permanence pour l'instant, comme la valeur par defaut de
//     KAAWA) ;
//   - sur chaque case de DESTINATION possible, en vert, UNIQUEMENT pendant
//     qu'une selection est active — disparait avec elle. Un rond vert
//     translucide de la taille du trou les recouvre (elles en deviennent vertes
//     par transparence).
//
// Meme rond vert translucide, MEME TAILLE que sur une case d'arrivee (celle du
// trou, pas celle de la bille — saab, 2026-09-27 : "rester dans la logique du
// vert"), sur chaque bille SELECTIONNABLE (celles du camp au trait) — SAUF
// celle deja selectionnee, dont l'anneau orange (rendu/selection.js) tient
// lieu de mise en evidence. Pose EN ENFANT de la bille (comme sa coordonnee
// juste au-dessus), jamais par coordonnees cx/cy absolues comme
// .voile-destination : une bille ejectee glisse puis vole encore quelques
// instants avec sa classe de camp intacte (rendu/vol-ejection.js) et doit
// emporter ce rond avec elle plutot que le laisser fixe a l'ancienne case.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG
// (rendu/plateau-svg.js) et RAYON_TROU_CENTRAL (rendu/relief-plateau.js)
// viennent de fichiers charges avant celui-ci dans index.html.

// Remplace l'etiquette de coordonnee posee sur les billes : enleve d'abord
// toute etiquette existante (l'ancien camp au trait n'en a plus besoin),
// puis en pose une neuve, comme enfant de chaque bille de `joueurAuTrait`
// (jamais de x/y a lui donner : elle herite du meme transform que sa bille,
// donc du meme centre). `joueurAuTrait` peut valoir `null` (partie
// terminee) : aucune bille n'est alors etiquetee, `.bille-null` ne
// correspondant a rien. A appeler apres CHAQUE coup et CHAQUE navigation —
// voir interface/saisie.js, actualiserAffichagePartie.
function actualiserCoordonneesBilles(svg, joueurAuTrait) {
  for (const texte of svg.querySelectorAll('.coordonnee-bille')) texte.remove();
  for (const bille of svg.querySelectorAll(`.bille-${joueurAuTrait}`)) {
    const texte = creerElementSVG('text', {
      class: 'coordonnee-bille',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });
    texte.textContent = bille.dataset.notation;
    bille.appendChild(texte);
  }
}

// Coordonnees des cases de destination possibles, en vert — appelee juste a
// cote de rendu.mettreEnEvidence (interface/saisie.js, selectionner/
// deselectionner), jamais une deuxieme regle de "quelles cases sont
// possibles" : `notations` est exactement la meme liste que celle passee a
// mettreEnEvidence.
//
// `camp` (phase 20, face-a-face) : le camp qui joue — sa classe
// (`.coordonnee-destination-blanc`) permet a styles.css de retourner le texte
// vers le joueur de ce camp, sans rien calculer ici.
function actualiserCoordonneesDestinations(svg, notations, camp) {
  for (const element of svg.querySelectorAll('.coordonnee-destination, .voile-destination')) element.remove();
  for (const notation of notations) {
    const caseElement = svg.querySelector(`.case[data-notation="${notation}"]`);
    if (!caseElement) continue;
    const texte = creerElementSVG('text', {
      x: caseElement.getAttribute('cx'),
      y: caseElement.getAttribute('cy'),
      class: `coordonnee-destination coordonnee-destination-${camp}`,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });
    texte.textContent = notation;
    svg.appendChild(texte);
    // Le voile vert translucide, de la taille du trou, PAR-DESSUS la
    // coordonnee : elle en devient verte par transparence (saab).
    svg.appendChild(
      creerElementSVG('circle', {
        cx: caseElement.getAttribute('cx'),
        cy: caseElement.getAttribute('cy'),
        r: RAYON_TROU_CENTRAL,
        class: 'voile-destination',
      })
    );
  }
}

// Rond vert translucide sur chaque bille SELECTIONNABLE de `joueurAuTrait`
// (voir l'en-tete du fichier), sauf `notationSelectionnee` — a appeler APRES
// actualiserCoordonneesBilles (le rond doit recouvrir la coordonnee, comme
// pour une destination, jamais l'inverse). `joueurAuTrait` peut valoir
// `null` (partie terminee, ou apercu d'une permutation) : aucun rond alors.
function actualiserBillesSelectionnables(svg, joueurAuTrait, notationSelectionnee) {
  for (const voile of svg.querySelectorAll('.voile-selectionnable')) voile.remove();
  if (!joueurAuTrait) return;
  for (const bille of svg.querySelectorAll(`.bille-${joueurAuTrait}`)) {
    if (bille.dataset.notation === notationSelectionnee) continue;
    bille.appendChild(creerElementSVG('circle', { r: RAYON_TROU_CENTRAL, class: 'voile-selectionnable' }));
  }
}
