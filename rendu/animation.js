// Anime les deplacements d'un coup : chaque bille glisse visiblement vers
// sa nouvelle case, une bille ejectee continue sa course hors du plateau
// avant de disparaitre.
//
// Ce fichier ne fait que fixer la position finale de chaque bille ; le
// glissement lui-meme est une transition CSS sur la classe .bille (voir
// styles.css) que le navigateur joue automatiquement des que la position
// change. Aucune regle du jeu ici, et aucun innerHTML : les billes sont
// les memes <g> persistants poses par rendu/plateau-svg.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : depuisNotation vient
// de moteur/plateau.js, positionEcran de plateau-svg.js — tous deux
// charges avant celui-ci dans index.html.

// Une bille ejectee continue sa course d'1,5 case au-dela du bord avant
// d'etre retiree : assez pour que la sortie soit visible, sans traverser
// tout l'ecran.
const CASES_HORS_PLATEAU = 1.5;

// Doit correspondre a la duree de la transition CSS de .bille
// (styles.css) : le temps que l'animation de sortie ait fini de jouer
// avant de retirer la bille ejectee pour de bon.
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

function animerEjection(bille, deplacement) {
  const { q, r } = depuisNotation(deplacement.depart);
  const { x, y } = positionEcran(
    q + deplacement.direction.q * CASES_HORS_PLATEAU,
    r + deplacement.direction.r * CASES_HORS_PLATEAU
  );
  bille.style.transform = `translate(${x}px, ${y}px)`;
  setTimeout(() => bille.remove(), DUREE_ANIMATION_MS);
}
