// Les pistes des billes ejectees, en TRIANGLE de EJECTIONS_POUR_GAGNER cases
// (3 + 2 + 1), avec leur compte numerique, dans les coins VIDES a gauche de
// l'hexagone du plateau (rendu/cadre-plateau.js) — demande de saab, pour
// rendre de la hauteur au plateau : plus de bande de piste au-dessus ni en
// dessous.
//
//   Haut (piste des billes NOIRES)    Bas (piste des billes BLANCHES)
//         0                                    x
//       x x x                                 x x
//        x x                                 x x x
//         x                                     0
//
// Le haut a sa BASE en haut (le coin y est le plus large, l'hexagone s'en
// ecarte en descendant), le bas est l'inverse ; le compte est au-dessus du
// premier, en dessous du second. Les cases se remplissent de la BASE vers la
// POINTE (regle de saab, PLAN.md phase 20) : la sixieme, celle de la victoire,
// est la pointe. Meme identifiants (`piste-<couleur>-<i>`, `nombre-<couleur>`)
// et memes classes CSS que l'ancienne piste horizontale : rendu/ejections.js
// (actualiserPistesEjection) n'a pas change.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG
// (rendu/plateau-svg.js), RAYON_PISTE (rendu/ejections.js) et
// EJECTIONS_POUR_GAGNER (moteur/partie.js) viennent de fichiers charges avant
// celui-ci dans index.html.

// Espacement entre deux cases voisines d'une rangee, en rayons de case de
// piste (2.6 : celui de l'ancienne piste horizontale), et jusqu'ou on
// accepte de le resserrer pour tenir dans le coin.
const ESPACEMENT_PISTE_MAXIMUM = 2.6;
const ESPACEMENT_PISTE_MINIMUM = 2.1;
const PAS_ESPACEMENT_PISTE = 0.05;
// Hauteur reservee au compte (au-dessus de la base, ou sous celle du bas) ;
// `.nombre-ejecte` fait 14px (styles.css).
const HAUTEUR_COMPTE_PISTE = RAYON_PISTE * 3.4;
// Degagement minimal entre une case de piste et l'hexagone, ou le bord du
// viewBox.
const JEU_PISTE = RAYON_PISTE * 0.4;

// Le cote de l'hexagone qui borde le coin haut-gauche : celui dont la normale
// pointe le plus vers le haut-gauche. Son numero change quand le plateau est
// retourne (rendu/plateau-svg.js, orienterPlateau), pas sa place a l'ecran.
function coteHautGauche(cadre) {
  const versLeHautGauche = (cote) => -cote.normale.x - cote.normale.y;
  return cadre.cotes.reduce((meilleur, cote) => (versLeHautGauche(cote) > versLeHautGauche(meilleur) ? cote : meilleur));
}

// Les 6 cases (dans l'ordre de remplissage : base puis pointe) et le
// centre du compte, pour le coin haut-gauche (`enHaut` vrai) ou bas-gauche.
// Calcule d'abord pour le HAUT, puis reflete pour le bas (le plateau est
// symetrique). On resserre l'espacement jusqu'a ce que TOUTES les cases
// degagent le cote de l'hexagone qui borde ce coin (cote 4, haut-gauche) —
// jamais des coordonnees devinees a la main.
function disposerPisteTriangle(cadre, limites, enHaut) {
  const cote = coteHautGauche(cadre);
  const yCompte = limites.yMin + HAUTEUR_COMPTE_PISTE / 2;
  const yBase = limites.yMin + HAUTEUR_COMPTE_PISTE + RAYON_PISTE + JEU_PISTE;
  const xGauche = limites.xMin + RAYON_PISTE + JEU_PISTE;

  const disposer = (espacement) => {
    const ecart = espacement * RAYON_PISTE;
    const pas = ecart * (Math.sqrt(3) / 2);
    const cases = [];
    [3, 2, 1].forEach((nombre, rangee) => {
      for (let i = 0; i < nombre; i++) {
        cases.push({ x: xGauche + rangee * (ecart / 2) + i * ecart, y: yBase + rangee * pas });
      }
    });
    return { cases, xAxe: xGauche + ecart };
  };
  const degage = ({ cases }) =>
    cases.every(({ x, y }) => x * cote.normale.x + y * cote.normale.y - cote.exterieur >= RAYON_PISTE + JEU_PISTE);

  let disposition = disposer(ESPACEMENT_PISTE_MAXIMUM);
  for (let e = ESPACEMENT_PISTE_MAXIMUM; e >= ESPACEMENT_PISTE_MINIMUM && !degage(disposition); e -= PAS_ESPACEMENT_PISTE) {
    disposition = disposer(e);
  }
  const signe = enHaut ? 1 : -1;
  return {
    cases: disposition.cases.map(({ x, y }) => ({ x, y: y * signe })),
    compte: { x: disposition.xAxe, y: yCompte * signe },
  };
}

// Dessine la piste `couleur` (celle des billes de cette couleur ejectees) et
// son compte.
function dessinerPisteTriangle(svg, couleur, disposition) {
  const groupe = creerElementSVG('g', { class: `piste-ejection piste-ejection-${couleur}` });
  disposition.cases.forEach(({ x, y }, i) => {
    groupe.appendChild(
      creerElementSVG('circle', { id: `piste-${couleur}-${i}`, cx: x, cy: y, r: RAYON_PISTE, class: 'piste-case' })
    );
    // Anneau d'alerte, a l'INTERIEUR du cercle du camp : il ne le masque
    // jamais (styles.css, .piste-anneau-alerte).
    groupe.appendChild(
      creerElementSVG('circle', {
        id: `piste-anneau-${couleur}-${i}`,
        cx: x,
        cy: y,
        r: RAYON_PISTE - RAYON_PISTE * 0.25,
        class: 'piste-anneau-alerte',
      })
    );
  });
  svg.appendChild(groupe);
  const compte = creerElementSVG('text', {
    id: `nombre-${couleur}`,
    x: disposition.compte.x,
    y: disposition.compte.y,
    // Couleur du camp qui a ejecte ces billes (styles.css) : le compte est
    // son score.
    class: `nombre-ejecte nombre-ejecte-${couleur}`,
    'text-anchor': 'middle',
  });
  // Le milieu voulu du compte ; son `y` de ligne de base est recalcule a chaque
  // ecriture pour que l'ENCRE des chiffres y soit centree (voir
  // rendu/ejections.js, ecrireCompteEjections) — `dominant-baseline: middle`
  // centrait la boite de ligne, pas les chiffres, d'ou un ecart aux billes
  // different en haut et en bas.
  compte.dataset.milieuY = disposition.compte.y;
  // Tourne (face-a-face, styles.css) autour de SON point d'ancrage et non du
  // centre de sa boite : l'ecart avec les billes reste ainsi le meme en haut
  // et en bas.
  compte.style.transformOrigin = `${disposition.compte.x}px ${disposition.compte.y}px`;
  svg.appendChild(compte);
}
