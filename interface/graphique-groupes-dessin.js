// Le DESSIN du graphique des 4 groupes (interface/graphique-groupes.js) : les courbes en
// SVG et les barres de la position du curseur, en texte HTML. Ne decide rien.
//
// Saab, 2026-10-16 : « figer l'axe des ordonnées ... pouvoir voir qu'un nb réduit de coups
// (un genre de zoom sur 10 coups avant et après le coup) » — l'axe vertical va du plus
// bas au plus haut de toute la ligne, il ne bouge pas quand la fenetre defile ; « les 4
// barres verticales détaillant le total de chaque paramètre constituant le groupe, du plus
// important au plus petit ; à gauche de chaque partie des barres, le label du paramètre et
// sa valeur ».
//
// Pas d'import ni d'export (voir moteur/plateau.js) : GROUPES_DE_L_EVALUATION_IA
// (moteur/ia-groupes.js), COLONNES_ESSAI_IA (interface/essai-ia.js) viennent de fichiers
// charges avant celui-ci.

const LARGEUR_GRAPHIQUE = 640;
const HAUTEUR_GRAPHIQUE = 260;
const MARGE_GAUCHE_GRAPHIQUE = 48; // les valeurs de l'axe vertical
const MARGE_GRAPHIQUE = 18;
const GRADUATIONS_GRAPHIQUE = 4; // intervalles de l'axe vertical
const POURCENTAGE_MAX = 100;
const RAYON_POINT_GRAPHIQUE = 2.5;
// Au-dela, les points de chaque coup ne se distinguent plus : la courbe seule.
const COUPS_MAX_AVEC_POINTS = 60;

const nombreArrondi = (valeur) => String(Math.round(valeur));

// Les courbes de `courbes[debut..fin]` (`fenetre`), le coup `rang` marque ; l'axe vertical
// de `bas` a `haut` (toute la ligne : il ne bouge pas quand la fenetre defile).
// `debutProjete` : le rang de la premiere position d'une sequence proposee (ce qui suit
// sa position de depart se dessine en pointille), ou null. `ejections` : [{ rang, camp }] (moteur/
// ia-groupes.js, ejectionsDeLaLigne), un trait pointille vertical chacune (saab, 2026-10-21) — vert
// quand l'adversaire de `camp` (celui du graphique) perd une bille, rouge quand c'est `camp`.
const COULEUR_EJECTION_GAGNEE = '#3fcf7a';
const COULEUR_EJECTION_PERDUE = '#e04848';
function svgDesCourbes(courbes, rang, { debut, fin }, { bas, haut, enPourcentage, debutProjete = null, ejections = [], camp = null }) {
  const etendue = haut - bas || 1;
  const largeurUtile = LARGEUR_GRAPHIQUE - MARGE_GAUCHE_GRAPHIQUE - MARGE_GRAPHIQUE;
  const hauteurUtile = HAUTEUR_GRAPHIQUE - 2 * MARGE_GRAPHIQUE;
  const x = (coup) => MARGE_GAUCHE_GRAPHIQUE + ((coup - debut) * largeurUtile) / Math.max(1, fin - debut);
  const y = (valeur) => MARGE_GRAPHIQUE + hauteurUtile - ((valeur - bas) * hauteurUtile) / etendue;
  const unite = enPourcentage ? ' %' : '';
  const graduations = Array.from({ length: GRADUATIONS_GRAPHIQUE + 1 }, (_, i) => bas + (i * etendue) / GRADUATIONS_GRAPHIQUE).map(
    (valeur) => `<line x1="${MARGE_GAUCHE_GRAPHIQUE}" x2="${LARGEUR_GRAPHIQUE - MARGE_GRAPHIQUE}" y1="${y(valeur)}" y2="${y(valeur)}" stroke="#333" /><text x="${MARGE_GAUCHE_GRAPHIQUE - 4}" y="${y(valeur) + 4}" fill="#aaa" font-size="11" text-anchor="end">${nombreArrondi(valeur)}${unite}</text>`
  );
  const zero = bas < 0 && haut > 0 ? `<line x1="${MARGE_GAUCHE_GRAPHIQUE}" x2="${LARGEUR_GRAPHIQUE - MARGE_GRAPHIQUE}" y1="${y(0)}" y2="${y(0)}" stroke="#777" stroke-dasharray="4 3" />` : '';
  const montres = courbes.slice(debut, fin + 1);
  const avecPoints = fin - debut <= COUPS_MAX_AVEC_POINTS;
  const lignes = GROUPES_DE_L_EVALUATION_IA.map(({ cle, couleur }) => {
    const points = montres.map((parts, i) => [x(debut + i), y(parts[cle])]);
    const ronds = avecPoints ? points.map(([px, py]) => `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${RAYON_POINT_GRAPHIQUE}" fill="${couleur}" />`).join('') : '';
    const trait = (morceau, pointille) => (morceau.length < 2 ? '' : `<polyline fill="none" stroke="${couleur}" stroke-width="2"${pointille ? ' stroke-dasharray="5 4"' : ''} points="${morceau.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ')}" />`);
    // La partie, puis la sequence proposee (depuis sa position de depart) en pointille.
    const coupure = debutProjete === null ? points.length : Math.min(points.length, Math.max(0, debutProjete - debut));
    return `${trait(points.slice(0, coupure), false)}${trait(points.slice(Math.max(0, coupure - 1)), coupure < points.length)}${ronds}`;
  });
  const traitsDesEjections = ejections
    .filter((ejection) => ejection.rang >= debut && ejection.rang <= fin)
    .map(({ rang: rangEjection, camp: perdant }) => {
      const couleur = perdant === camp ? COULEUR_EJECTION_PERDUE : COULEUR_EJECTION_GAGNEE;
      const qui = perdant === 'noir' ? 'Noir' : 'Blanc';
      return `<line x1="${x(rangEjection)}" x2="${x(rangEjection)}" y1="${MARGE_GRAPHIQUE / 2}" y2="${HAUTEUR_GRAPHIQUE - MARGE_GRAPHIQUE / 2}" stroke="${couleur}" stroke-width="1.5" stroke-dasharray="4 4"><title>Coup ${rangEjection} : ${qui} perd une bille</title></line>`;
    })
    .join('');
  const repere = `<line x1="${x(rang)}" x2="${x(rang)}" y1="${MARGE_GRAPHIQUE / 2}" y2="${HAUTEUR_GRAPHIQUE - MARGE_GRAPHIQUE / 2}" stroke="#cc6a00" stroke-width="2" />`;
  const coups = [debut, fin].map((coup, i) => `<text x="${x(coup)}" y="${HAUTEUR_GRAPHIQUE - 3}" fill="#aaa" font-size="11" text-anchor="${i === 0 ? 'start' : 'end'}">coup ${coup}</text>`).join('');
  return `<svg viewBox="0 0 ${LARGEUR_GRAPHIQUE} ${HAUTEUR_GRAPHIQUE}" class="graphique-groupes">${graduations.join('')}${zero}${traitsDesEjections}${lignes.join('')}${repere}${coups}</svg>`;
}

// Le rang du coup sous l'abscisse `fraction` (0 : bord gauche du dessin, 1 : bord droit).
function coupSousLaFraction(fraction, { debut, fin }) {
  const dansLeDessin = (fraction * LARGEUR_GRAPHIQUE - MARGE_GAUCHE_GRAPHIQUE) / (LARGEUR_GRAPHIQUE - MARGE_GAUCHE_GRAPHIQUE - MARGE_GRAPHIQUE);
  return Math.min(fin, Math.max(debut, debut + Math.round(dansLeDessin * (fin - debut))));
}

// Les barres (moteur/ia-groupes.js, barresDesGroupes) : une colonne par groupe, son total
// en tete ; chaque terme un morceau de hauteur proportionnelle a sa part du groupe (le
// plus lourd en haut), son libelle, sa valeur et sa part de toute l'evaluation a gauche
// (« Fourch. -60 · 2 % ») ; un terme negatif hachure. La barre du groupe qui pese le plus
// est la plus haute, chaque suivante un peu moins (saab, 2026-10-16 : « juste un visuel
// de qq pixels »).
const HAUTEUR_BARRE_PX = 100;
const BARRE_PLUS_COURTE_PAR_RANG_PX = 4;
const HAUTEUR_MIN_MORCEAU_PX = 12;
const pourcentArrondi = (part) => (part > 0 && part < 1 ? '<1' : String(Math.round(part)));
function htmlDesBarres(barres) {
  const colonnes = barres.map(({ groupe, total, rang, termes }) => {
    const hauteurDeLaBarre = HAUTEUR_BARRE_PX - rang * BARRE_PLUS_COURTE_PAR_RANG_PX;
    const poids = termes.reduce((somme, { valeur }) => somme + Math.abs(valeur), 0) || 1;
    // Chaque morceau a de quoi porter son libelle ; le reste se partage selon les valeurs :
    // la barre fait exactement sa hauteur.
    const aPartager = Math.max(0, hauteurDeLaBarre - termes.length * HAUTEUR_MIN_MORCEAU_PX);
    const morceaux = termes.map(({ terme, valeur, part }) => {
      const hauteur = HAUTEUR_MIN_MORCEAU_PX + (aPartager * Math.abs(valeur)) / poids;
      return `<div class="morceau-barre-groupe" style="height:${hauteur.toFixed(0)}px"><span>${COLONNES_ESSAI_IA[terme] ?? terme} ${nombreArrondi(valeur)} · ${pourcentArrondi(part)} %</span><b class="${valeur < 0 ? 'morceau-negatif' : ''}" style="background-color:${groupe.couleur}"></b></div>`;
    });
    return `<div class="barre-groupe"><div class="total-barre-groupe" style="color:${groupe.couleur}">${groupe.libelle} ${nombreArrondi(total)}</div>${morceaux.join('') || '<div class="note-reglages">—</div>'}</div>`;
  });
  return `<div class="barres-groupes">${colonnes.join('')}</div>`;
}
