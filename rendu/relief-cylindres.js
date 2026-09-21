// Relief du plateau PRINCIPAL entre les cases (phase 19ter) : chaque
// triangle de KAAWA (_draw_standalone_triangles) devient un petit CYLINDRE
// BISEAUTE vu de dessus — signale par saab : un simple degrade sur un
// triangle ne laissait pas voir le relief. Le dessus est un triangle plat
// aux coins arrondis, inscrit dans un cercle ; les 3 morceaux de cercle
// autour sont les 3 FACES BISEAUTEES, chacune eclairee selon la direction
// vers laquelle elle regarde (lumiere venant du haut-gauche, comme partout
// ailleurs sur ce plateau) — c'est cette difference de teinte entre les 3
// faces qui donne le relief, jamais un degrade.
//
// Le balayage (position de chaque triangle, regle "au moins un coin reel")
// reste celui de KAAWA ; seul le dessin de chacun change.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : RAYON_PLATEAU,
// estCaseValide (moteur/plateau.js), positionEcran, RAYON_CASE,
// creerElementSVG (rendu/plateau-svg.js) viennent de fichiers charges avant
// celui-ci dans index.html.

// Rangees/colonnes fictives en plus de chaque cote (comme KAAWA, qui
// balaie q et r de -5 a 5 pour un plateau de rayon 4) : un triangle peut
// toucher une case reelle sans que ses 3 coins en soient une.
const MARGE_RELIEF_TRIANGLES = RAYON_PLATEAU + 1;

// Taille du dessus plat, en fraction du triangle plein (sommets aux centres
// de 3 cases voisines), comme KAAWA (TRIANGLE_VERTICES_RATIO). Regle par
// saab : les premiers triangles etaient trop grands.
const RATIO_RELIEF_TRIANGLE = 0.36;
// Rayon du cylindre (le cercle qui contient le dessus et ses 3 biseaux) :
// juste assez petit pour ne pas toucher le trou des cases voisines (le
// centre d'un triangle est a RAYON_CASE du centre de chaque case).
const RAYON_BISEAU = RAYON_CASE * 0.36;
// Part de chaque cote coupee a chaque coin du dessus pour l'arrondir.
const RATIO_ARRONDI_SOMMET = 0.25;

// Vers ou regarde la lumiere (haut-gauche, repere ecran : y vers le bas).
const DIRECTION_LUMIERE = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
// Gris d'une face biseautee qui ne regarde ni vers la lumiere ni a l'oppose,
// et amplitude autour de ce gris : de sombre (face opposee a la lumiere) a
// clair (face qui la regarde).
const GRIS_BISEAU_NEUTRE = 0x70;
const AMPLITUDE_BISEAU = 0x30;

// Gris de la face biseautee dont la normale (vecteur unitaire, du centre
// vers l'exterieur) est `normale` : plus elle regarde la lumiere, plus elle
// est claire.
function couleurFaceBiseau(normale) {
  const eclairage = normale.x * DIRECTION_LUMIERE.x + normale.y * DIRECTION_LUMIERE.y;
  const niveau = Math.round(GRIS_BISEAU_NEUTRE + AMPLITUDE_BISEAU * eclairage);
  const hexa = niveau.toString(16).padStart(2, '0');
  return `#${hexa}${hexa}${hexa}`;
}

// Une des 3 faces biseautees : le morceau de cercle entre le cote AB du
// dessus (A et B, sommets du dessus) et l'arc du cylindre, delimite par les
// rayons qui passent par A et B.
function creerFaceBiseau(centre, sommetA, sommetB) {
  const pointSurCercle = (sommet) => {
    const angle = Math.atan2(sommet.y - centre.y, sommet.x - centre.x);
    return { x: centre.x + RAYON_BISEAU * Math.cos(angle), y: centre.y + RAYON_BISEAU * Math.sin(angle) };
  };
  const cercleA = pointSurCercle(sommetA);
  const cercleB = pointSurCercle(sommetB);
  // Sens de l'arc de A vers B : celui des angles croissants (1) ou non (0),
  // deduit du produit vectoriel — jamais suppose selon l'orientation du
  // triangle, qui change d'un triangle a l'autre.
  const sens = (sommetA.x - centre.x) * (sommetB.y - centre.y) - (sommetA.y - centre.y) * (sommetB.x - centre.x) > 0 ? 1 : 0;
  const milieu = { x: (sommetA.x + sommetB.x) / 2 - centre.x, y: (sommetA.y + sommetB.y) / 2 - centre.y };
  const longueur = Math.hypot(milieu.x, milieu.y);
  const chemin =
    `M${sommetA.x},${sommetA.y} L${cercleA.x},${cercleA.y} ` +
    `A${RAYON_BISEAU},${RAYON_BISEAU} 0 0 ${sens} ${cercleB.x},${cercleB.y} ` +
    `L${sommetB.x},${sommetB.y} Z`;
  return creerElementSVG('path', {
    d: chemin,
    fill: couleurFaceBiseau({ x: milieu.x / longueur, y: milieu.y / longueur }),
  });
}

// Polygone aux coins arrondis : a chaque sommet, on coupe `distanceCoupe`
// sur chacun des deux cotes et on relie par une courbe dont le sommet
// d'origine est le point de controle. Sert au dessus des cylindres ET au
// grand hexagone du plateau (rendu/cadre-plateau.js).
function cheminPolygoneArrondi(sommets, distanceCoupe) {
  const total = sommets.length;
  return (
    sommets
      .map((sommet, i) => {
        const versCote = (autre) => {
          const dx = autre.x - sommet.x;
          const dy = autre.y - sommet.y;
          const longueur = Math.hypot(dx, dy);
          return { x: sommet.x + (dx / longueur) * distanceCoupe, y: sommet.y + (dy / longueur) * distanceCoupe };
        };
        const debut = versCote(sommets[(i + total - 1) % total]);
        const fin = versCote(sommets[(i + 1) % total]);
        return `${i === 0 ? 'M' : 'L'}${debut.x},${debut.y} Q${sommet.x},${sommet.y} ${fin.x},${fin.y}`;
      })
      .join(' ') + ' Z'
  );
}

// Les triangles du relief, avec leur balayage de KAAWA
// (_draw_standalone_triangles) : pour chaque position (q, r), 2 triangles
// avec ses voisins immediats — seulement ceux dont au moins un coin est une
// vraie case, jamais un triangle perdu entierement hors du plateau. Chacun :
// { pleins, centre, dessus } (sommets aux centres de 3 cases voisines, leur
// centre, et le dessus plat retreci).
function trianglesDuRelief() {
  const triangles = [];
  const ajouter = (q1, r1, q2, r2, q3, r3) => {
    const coins = [
      [q1, r1],
      [q2, r2],
      [q3, r3],
    ];
    if (!coins.some(([q, r]) => estCaseValide(q, r))) return;
    const pleins = coins.map(([q, r]) => positionEcran(q, r));
    const centre = {
      x: (pleins[0].x + pleins[1].x + pleins[2].x) / 3,
      y: (pleins[0].y + pleins[1].y + pleins[2].y) / 3,
    };
    const dessus = pleins.map(({ x, y }) => ({
      x: centre.x + (x - centre.x) * RATIO_RELIEF_TRIANGLE,
      y: centre.y + (y - centre.y) * RATIO_RELIEF_TRIANGLE,
    }));
    triangles.push({ pleins, centre, dessus });
  };
  for (let q = -MARGE_RELIEF_TRIANGLES; q <= MARGE_RELIEF_TRIANGLES; q++) {
    for (let r = -MARGE_RELIEF_TRIANGLES; r <= MARGE_RELIEF_TRIANGLES; r++) {
      ajouter(q, r, q + 1, r, q, r + 1);
      ajouter(q, r, q + 1, r, q + 1, r - 1);
    }
  }
  return triangles;
}

// Le centre de chaque cylindre — rendu/cadre-plateau.js s'en sert pour
// poser le cadre du plateau juste contre les plus exterieurs.
function centresCylindres() {
  return trianglesDuRelief().map((triangle) => triangle.centre);
}

function dessinerReliefCylindres() {
  const groupe = creerElementSVG('g', { class: 'relief-cylindres' });
  for (const { centre, dessus } of trianglesDuRelief()) {
    const cylindre = creerElementSVG('g', { class: 'relief-cylindre' });
    for (let i = 0; i < dessus.length; i++) {
      cylindre.appendChild(creerFaceBiseau(centre, dessus[i], dessus[(i + 1) % dessus.length]));
    }
    const coupe = RATIO_ARRONDI_SOMMET * Math.hypot(dessus[1].x - dessus[0].x, dessus[1].y - dessus[0].y);
    cylindre.appendChild(creerElementSVG('path', { d: cheminPolygoneArrondi(dessus, coupe), class: 'relief-dessus' }));
    cylindre.appendChild(creerElementSVG('circle', { cx: centre.x, cy: centre.y, r: RAYON_BISEAU, class: 'relief-contour' }));
    groupe.appendChild(cylindre);
  }
  return groupe;
}
