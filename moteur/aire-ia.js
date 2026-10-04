// L'AIRE d'un camp (saab, 2026-10-04 : « un btn Aire qui permet, apres avoir
// selectionne une bille, c'est-a-dire un camp, de dessiner une aire du
// plateau ... et qui permet a ce moment de calculer les poids ») : le contour
// est une suite de cases ; les billes des DEUX camps dedans, ou sur le
// contour, forment une position, evaluee terme par terme pour le camp choisi
// (saab : « un vrai calcul de la position de l'aire, donc en tenant compte des
// billes adverses ») — tout le plateau en aire donne l'evaluation de la
// machine. Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : couleurAdverse
// (regles.js), couleursDuPlateau (partie.js), COORDONNEES_DES_CASES_IA
// (ia-evaluation-v3.js), termesDeLaPosition, sommeDesTermes (bille-ia.js)
// viennent de fichiers charges avant celui-ci.

// Le centre d'une case dans le plan (coordonnees axiales -> cartesiennes : les
// cases voisines y sont toutes a 1 l'une de l'autre).
const DEMI_HAUTEUR_HEXAGONE = Math.sqrt(3) / 2;
const PRECISION_CONTOUR = 1e-9;

function pointDeLaCase(notation) {
  const { q, r } = COORDONNEES_DES_CASES_IA[notation];
  return { x: q + r / 2, y: r * DEMI_HAUTEUR_HEXAGONE };
}

function surLeSegment(p, a, b) {
  const produit = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  if (Math.abs(produit) > PRECISION_CONTOUR) return false;
  return Math.min(a.x, b.x) - PRECISION_CONTOUR <= p.x && p.x <= Math.max(a.x, b.x) + PRECISION_CONTOUR && Math.min(a.y, b.y) - PRECISION_CONTOUR <= p.y && p.y <= Math.max(a.y, b.y) + PRECISION_CONTOUR;
}

// Dedans ou sur le contour (le polygone de `sommets`, ferme).
function dansLeContour(p, sommets) {
  let dedans = false;
  for (let i = 0, j = sommets.length - 1; i < sommets.length; j = i++) {
    const a = sommets[i];
    const b = sommets[j];
    if (surLeSegment(p, a, b)) return true;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dedans = !dedans;
  }
  return dedans;
}

// Les billes de `camp` dans le contour `cases` (notations), triees.
function billesDansLAire(etat, cases, camp) {
  const sommets = cases.map(pointDeLaCase);
  const couleurs = couleursDuPlateau(etat.plateau);
  return Object.keys(couleurs)
    .filter((notation) => couleurs[notation] === camp && dansLeContour(pointDeLaCase(notation), sommets))
    .sort();
}

// La position de l'aire (ses billes seulement, les ejections de la partie) et
// sa valeur pour `camp`, terme par terme.
function detailDeLAire(etat, cases, camp, poids, version) {
  const sommets = cases.map(pointDeLaCase);
  const plateau = Object.fromEntries(Object.entries(etat.plateau).filter(([notation]) => dansLeContour(pointDeLaCase(notation), sommets)));
  const termes = termesDeLaPosition({ ...etat, plateau }, camp, poids, version);
  return {
    billes: { [camp]: billesDansLAire(etat, cases, camp), [couleurAdverse(camp)]: billesDansLAire(etat, cases, couleurAdverse(camp)) },
    termes,
    valeur: sommeDesTermes(termes),
  };
}
