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
//     translucide de la taille du trou est pose SOUS elle (jamais dessus,
//     voir plus bas pourquoi) : elle reste ainsi toujours lisible, meme sur
//     un fond de case clair.
//
// Meme rond vert, MEME TAILLE que sur une case d'arrivee (celle du trou, pas
// celle de la bille — saab, 2026-09-27 : "rester dans la logique du vert"),
// sur chaque bille SELECTIONNABLE (celles du camp au trait) TANT QU'AUCUNE
// SELECTION N'EST ACTIVE — ils s'effacent TOUS des qu'une bille est
// selectionnee (saab : "sinon ca n'a aucun sens", seules les cases de
// DESTINATION comptent alors) et reviennent tous ensemble a la deselection.
// Pose EN ENFANT de la bille, JUSTE APRES son .bille-cercle (jamais un
// simple appendChild en bout de liste) — la coordonnee, elle, doit toujours
// rester PAR-DESSUS ce rond, jamais l'inverse (saab, 2026-09-27bis : sur
// fond vert, elle restait illisible quelle que soit l'opacite choisie,
// surtout sur les billes blanches). Cette position fixe rend l'ordre
// d'appel de cette fonction et de actualiserCoordonneesBilles sans
// importance : la coordonnee, ajoutee par un appendChild qui la place
// toujours EN DERNIER, finit de toute facon au-dessus.
// Jamais par coordonnees cx/cy absolues comme .voile-destination : une
// bille ejectee glisse puis vole encore quelques instants avec sa classe de
// camp intacte (rendu/vol-ejection.js) et doit emporter ce rond avec elle
// plutot que le laisser fixe a l'ancienne case.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG
// (rendu/plateau-svg.js) et RAYON_TROU_CENTRAL (rendu/relief-plateau.js)
// viennent de fichiers charges avant celui-ci dans index.html.

// Rayon des ronds verts (selectionnable ET arrivee, un seul reglage — saab,
// 2026-09-27) : la taille du trou par defaut, changee par fixerRayonRondsVerts
// (rendu/apparence-reglages.js, reglage kaah.green_marker_scale).
let rayonRondsVerts = RAYON_TROU_CENTRAL;

// Change le rayon des prochains ronds verts ET de ceux deja affiches, sans rien
// recreer.
function fixerRayonRondsVerts(svg, rayon) {
  rayonRondsVerts = rayon;
  for (const rond of svg.querySelectorAll('.voile-destination, .voile-selectionnable')) rond.setAttribute('r', rayon);
}

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
    // Le voile vert translucide, de la taille du trou, SOUS la coordonnee
    // (ajoute EN PREMIER : voir actualiserBillesSelectionnables plus bas,
    // meme raisonnement) — sur un fond de case clair (Reglages, "Fond du
    // plateau"), elle restait illisible si le voile passait par-dessus,
    // quelle que soit son opacite (saab, 2026-09-27).
    svg.appendChild(
      creerElementSVG('circle', {
        cx: caseElement.getAttribute('cx'),
        cy: caseElement.getAttribute('cy'),
        r: rayonRondsVerts,
        class: 'voile-destination',
      })
    );
    const texte = creerElementSVG('text', {
      x: caseElement.getAttribute('cx'),
      y: caseElement.getAttribute('cy'),
      class: `coordonnee-destination coordonnee-destination-${camp}`,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });
    texte.textContent = notation;
    svg.appendChild(texte);
  }
}

// Rond vert sur chaque bille SELECTIONNABLE de `joueurAuTrait` (voir
// l'en-tete du fichier). `joueurAuTrait` vaut `null` pour n'en afficher
// aucun : partie terminee, apercu d'une permutation, OU une selection est
// deja active (interface/saisie.js, selectionner).
function actualiserBillesSelectionnables(svg, joueurAuTrait) {
  for (const voile of svg.querySelectorAll('.voile-selectionnable')) voile.remove();
  if (!joueurAuTrait) return;
  for (const bille of svg.querySelectorAll(`.bille-${joueurAuTrait}`)) {
    const voile = creerElementSVG('circle', { r: rayonRondsVerts, class: 'voile-selectionnable' });
    // Juste apres .bille-cercle, jamais en bout de liste (voir l'en-tete) :
    // une coordonnee deja posee (actualiserCoordonneesBilles) reste ainsi
    // toujours au-dessus, quel que soit l'ordre d'appel des deux fonctions.
    bille.querySelector('.bille-cercle').insertAdjacentElement('afterend', voile);
  }
}
