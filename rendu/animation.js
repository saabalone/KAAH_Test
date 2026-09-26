// Anime les deplacements d'un coup : chaque bille glisse visiblement vers
// sa nouvelle case, une bille ejectee continue sa course hors du plateau puis
// vole jusqu'a sa case de piste (rendu/vol-ejection.js).
//
// Ce fichier ne fait que fixer la position finale de chaque bille ; le
// glissement lui-meme est une transition CSS sur la classe .bille (voir
// styles.css) que le navigateur joue automatiquement des que la position
// change. Aucune regle du jeu ici, et aucun innerHTML : les billes sont
// les memes <g> persistants poses par rendu/plateau-svg.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : depuisNotation vient
// de moteur/plateau.js, positionEcran de plateau-svg.js, reserverCaseDePiste et
// faireVolerBille de rendu/vol-ejection.js — tous charges avant celui-ci dans
// index.html.

// Une bille ejectee continue sa course d'1,5 case au-dela du bord avant
// d'etre retiree : assez pour que la sortie soit visible, sans traverser
// tout l'ecran.
const CASES_HORS_PLATEAU = 1.5;

// Doit correspondre a la duree de la transition CSS de .bille
// (styles.css) : le temps que l'animation de sortie ait fini de jouer
// avant que la bille ejectee ne prenne son vol.
const DUREE_ANIMATION_MS = 300;

function billeElement(svg, id) {
  return svg.querySelector(`#${CSS.escape(id)}`);
}

function animerDeplacements(svg, deplacements) {
  for (const deplacement of deplacements) {
    const bille = billeElement(svg, deplacement.id);
    if (!bille) continue;

    if (deplacement.ejectee) {
      animerEjection(bille, deplacement);
    } else {
      const { q, r } = depuisNotation(deplacement.arrivee);
      const { x, y } = positionEcran(q, r);
      bille.style.transform = `translate(${x}px, ${y}px)`;
      bille.dataset.notation = deplacement.arrivee;
    }
  }
}

// Sortie du plateau (transition CSS), puis vol jusqu'a sa case de piste le long
// du bord du plateau (rendu/vol-ejection.js, qui la retire a l'arrivee). La case est
// reservee TOUT DE SUITE, avant que le compte de la piste ne change.
function animerEjection(bille, deplacement) {
  const svg = bille.ownerSVGElement;
  const couleur = bille.classList.contains('bille-noir') ? 'noir' : 'blanc';
  const caseDePiste = reserverCaseDePiste(svg, couleur);
  const { q, r } = depuisNotation(deplacement.depart);
  const sortie = positionEcran(q + deplacement.direction.q * CASES_HORS_PLATEAU, r + deplacement.direction.r * CASES_HORS_PLATEAU);
  bille.style.transform = `translate(${sortie.x}px, ${sortie.y}px)`;
  setTimeout(() => faireVolerBille(bille, sortie, caseDePiste), DUREE_ANIMATION_MS);
}
