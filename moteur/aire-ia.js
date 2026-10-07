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
// (regles.js), versNotation (plateau.js), couleursDuPlateau (partie.js),
// COORDONNEES_DES_CASES_IA, distanceAxiale (ia-evaluation-v3.js),
// termesDeLaPosition, sommeDesTermes (bille-ia.js) viennent de fichiers charges
// avant celui-ci.

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

// Les cases de `depart` (exclue) a `arrivee` (comprise), en ligne droite : celles
// que la souris a sautees en dessinant le contour (saab, 2026-10-04 : « il manque
// le lien de la derniere case »). Une ligne droite sur l'hexagone : le point a
// chaque pas, arrondi a la case la plus proche (coordonnees cubiques).
function casesEntre(depart, arrivee) {
  const a = COORDONNEES_DES_CASES_IA[depart];
  const b = COORDONNEES_DES_CASES_IA[arrivee];
  const pas = distanceAxiale(a, b);
  const cases = [];
  for (let i = 1; i <= pas; i++) {
    const q = a.q + ((b.q - a.q) * i) / pas;
    const r = a.r + ((b.r - a.r) * i) / pas;
    cases.push(versNotation(...arrondiCubique(q, r)));
  }
  return cases;
}

// La case la plus proche du point (q, r) : arrondir les trois coordonnees
// cubiques, puis corriger celle qui s'est le plus ecartee.
function arrondiCubique(q, r) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const [eq, er, es] = [Math.abs(rq - q), Math.abs(rr - r), Math.abs(rs - s)];
  if (eq > er && eq > es) rq = -rr - rs;
  else if (er > es) rr = -rq - rs;
  return [rq, rr];
}

// Le tour du plateau, ses 24 cases du bord (saab, 2026-10-04 : « faire l'aire
// complete du plateau d'un coup, sans avoir a faire les 6 points ») : de coin en coin.
const COINS_DU_PLATEAU = ['a1', 'a5', 'e9', 'i9', 'i5', 'e1'];
const CONTOUR_DU_PLATEAU = COINS_DU_PLATEAU.flatMap((coin, rang) => [coin, ...casesEntre(coin, COINS_DU_PLATEAU[(rang + 1) % COINS_DU_PLATEAU.length]).slice(0, -1)]);

// Les billes de `camp` dans le contour `cases` (notations), triees.
function billesDansLAire(etat, cases, camp) {
  const sommets = cases.map(pointDeLaCase);
  const couleurs = couleursDuPlateau(etat.plateau);
  return Object.keys(couleurs)
    .filter((notation) => couleurs[notation] === camp && dansLeContour(pointDeLaCase(notation), sommets))
    .sort();
}

// L'aire pour `camp`, terme par terme, de deux facons (saab, 2026-10-05) :
//   - SEULE (termes, valeur) : la position de ses billes seulement, comme si
//     rien d'autre n'existait — sans les ejections de la partie, faites
//     ailleurs (saab, 2026-10-06 : « +3000 est bien une valeur ext, non ? ») ;
//   - son APPORT (apport, valeurApport) : ce que ses billes apportent a toute
//     la position — l'evaluation avec elles, moins sans elles ni les
//     ejections (les billes du dehors comptent : sumitos, voisines, compacite
//     avec le reste ; Gain et Perte, toutes les ejections de la partie). Tout
//     le plateau : l'evaluation de la machine.
function detailDeLAire(etat, cases, camp, poids, version) {
  const sommets = cases.map(pointDeLaCase);
  const dedans = (notation) => dansLeContour(pointDeLaCase(notation), sommets);
  const sousPosition = (garder) => ({
    ...etat,
    billesEjecteesNoires: 0,
    billesEjecteesBlanches: 0,
    plateau: Object.fromEntries(Object.entries(etat.plateau).filter(([notation]) => garder(notation))),
  });
  const termes = termesDeLaPosition(sousPosition(dedans), camp, poids, version);
  const avec = termesDeLaPosition(etat, camp, poids, version);
  const sans = termesDeLaPosition(sousPosition((notation) => !dedans(notation)), camp, poids, version);
  const apport = Object.fromEntries(Object.keys(avec).map((terme) => [terme, avec[terme] - sans[terme]]));
  return {
    billes: { [camp]: billesDansLAire(etat, cases, camp), [couleurAdverse(camp)]: billesDansLAire(etat, cases, couleurAdverse(camp)) },
    termes,
    valeur: sommeDesTermes(termes),
    apport,
    valeurApport: sommeDesTermes(apport),
  };
}
