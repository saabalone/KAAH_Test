// Evaluation d'une position pour l'adversaire artificiel (phase 29 ⚠, voir
// PLAN.md, specification amendee avec saab le 2026-09-27). Un nombre, grand si
// la position est bonne pour `camp`, de signe oppose pour l'autre camp (somme
// nulle : ce que l'un gagne, l'autre le perd — c'est ce qui permet a la
// recherche, moteur/ia-recherche.js, de se mettre a la place de l'adversaire).
//
// Ce qui compte, d'apres les principes du jeu d'Abalone :
//   - les billes ejectees (le but meme : EJECTIONS_POUR_GAGNER) ;
//   - le centre : une bille au centre ne peut pas etre sortie, et elle pousse
//     dans toutes les directions ;
//   - la cohesion : des billes voisines se protegent (on ne pousse qu'en
//     superiorite numerique, CLAUDE.md "poussee 3 contre 3 impossible") ;
//   - le bord : une bille sur l'anneau exterieur est la seule qu'on puisse
//     ejecter.
// Les STYLES (saab) ne changent que les POIDS de ces termes, jamais leur
// calcul.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : casesDuPlateau,
// versNotation, voisins, RAYON_PLATEAU (plateau.js), couleurAdverse (partie.js)
// viennent de fichiers charges avant celui-ci.

// Une victoire vaut plus que toute somme de termes de position.
const VALEUR_VICTOIRE_IA = 1000000;

// Poids par style. gain/perte : par bille adverse ejectee / par bille perdue ;
// centre : par pas vers le centre ; cohesion : par paire de billes voisines ;
// bordSoi : penalite par bille a soi sur le bord ; bordAdverse : bonus par
// bille adverse sur le bord. Choisis pour que les styles restent dans le bon
// ordre une fois le centre compte AVEC le bord (une bille qui part au bord
// quitte aussi le centre) : bille adverse du centre au bord, +62 / +55 / +52 ;
// bille a soi, -40 / -55 / -78 (agressif / normal / defensif — test 5).
const STYLES_IA = {
  agressif: { gain: 1200, perte: 800, centre: 8, cohesion: 3, bordSoi: 8, bordAdverse: 30 },
  normal: { gain: 1000, perte: 1000, centre: 10, cohesion: 5, bordSoi: 15, bordAdverse: 15 },
  defensif: { gain: 800, perte: 1300, centre: 12, cohesion: 9, bordSoi: 30, bordAdverse: 4 },
};

// Distance de chaque case au centre (0 au centre, RAYON_PLATEAU sur le bord),
// calculee une fois : l'evaluation est appelee des milliers de fois par coup.
const DISTANCE_AU_CENTRE = Object.fromEntries(
  casesDuPlateau().map(({ q, r }) => [versNotation(q, r), Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))])
);

// Les voisins de chaque case, calcules une fois (meme raison).
const VOISINS_DES_CASES = Object.fromEntries(
  casesDuPlateau().map(({ q, r }) => [versNotation(q, r), voisins(q, r).map((v) => versNotation(v.q, v.r))])
);

// Les mesures de position d'UN camp : proximite du centre, paires de voisins
// (chaque paire comptee une fois), billes sur le bord.
function mesuresDuCamp(etat, camp) {
  let centre = 0;
  let paires = 0;
  let bord = 0;
  for (const [notation, bille] of Object.entries(etat.plateau)) {
    if (bille.couleur !== camp) continue;
    const distance = DISTANCE_AU_CENTRE[notation];
    centre += RAYON_PLATEAU - distance;
    if (distance === RAYON_PLATEAU) bord++;
    for (const voisine of VOISINS_DES_CASES[notation]) {
      if (etat.plateau[voisine]?.couleur === camp) paires++;
    }
  }
  return { centre, cohesion: paires / 2, bord };
}

function ejectionsDe(etat, camp) {
  return camp === 'noir' ? etat.billesEjecteesNoires : etat.billesEjecteesBlanches;
}

// La valeur de `etat` pour `camp` — le camp DE L'IA — selon SON `style`
// ('agressif', 'normal', 'defensif'). Une partie gagnee ou perdue vaut
// ±VALEUR_VICTOIRE_IA.
//
// Le style s'applique toujours au camp de l'IA, quelle que soit sa couleur
// (un Blanc agressif aime la bille NOIRE au bord). La recherche ne l'appelle
// donc que pour ce camp-la, et en prend l'oppose pour l'adversaire : la
// partie reste a somme nulle DE SON POINT DE VUE. Avec un style symetrique
// (normal : gain = perte, bordSoi = bordAdverse), la valeur pour l'autre camp
// en est exactement l'oppose.
function evaluerPosition(etat, camp, style) {
  if (etat.vainqueur) return etat.vainqueur === camp ? VALEUR_VICTOIRE_IA : -VALEUR_VICTOIRE_IA;
  const poids = STYLES_IA[style];
  const lui = couleurAdverse(camp);
  const miens = mesuresDuCamp(etat, camp);
  const siens = mesuresDuCamp(etat, lui);
  return (
    poids.gain * ejectionsDe(etat, lui) -
    poids.perte * ejectionsDe(etat, camp) +
    poids.centre * (miens.centre - siens.centre) +
    poids.cohesion * (miens.cohesion - siens.cohesion) -
    poids.bordSoi * miens.bord +
    poids.bordAdverse * siens.bord
  );
}
