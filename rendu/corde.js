// La « corde » autour du plateau (demande de saab) : un trait fin, noir du
// cote du camp Noir et blanc du cote de Blanc — jamais les couleurs choisies
// pour les billes : on sait ainsi toujours qui a commence. Plateau retourne
// (Revanche) : les deux couleurs s'echangent. L'interieur de la corde est de
// la couleur du plateau (la ou etait le fond de fenetre).
//
// Le trajet de la moitie du haut, tel que saab l'a decrit (le bas en est le
// miroir) : partir du milieu du coin arrondi gauche de la rangee e ; longer
// le bord du plateau jusque vers g, s'en ecarter en arrondi vers la case 6
// de la piste d'ejection ; la contourner, filer droit (tangente) jusqu'a la
// case 1 ; monter contourner les boutons Abandonner/compteur/Nulle, longer
// Nulle sur deux cotes, redescendre en arrondi sur le bord du plateau pres de
// i ; puis longer le plateau (rangee i, bord droit) jusqu'au milieu du coin
// arrondi droit de la rangee e. Les pendules, qui ont leur propre cadre,
// restent dehors (saab : aller les toucher faisait "un truc bizarre"). Droit
// d'un element au suivant ("sinon ca fera trop de courbes"), arrondi en les
// contournant : une courroie autour de poulies (rendu/courroie.js).
//
// Calculee d'apres ce qui est REELLEMENT dessine, jamais des coordonnees
// recopiees ; UNE fois, tout dessine (index.html). Le bas est mesure puis
// retourne en haut (y -> -y) pour suivre exactement le meme trajet.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG,
// sensDuPlateau (rendu/plateau-svg.js), calculerCadrePlateau,
// RAYON_COIN_CADRE (rendu/cadre-plateau.js), RAYON_PISTE (rendu/ejections.js),
// RAYON_COIN_BOUTON_FIN_PISTE (rendu/boutons-fin-piste.js) et tracerCourroie,
// cheminDeCourroie (rendu/courroie.js) viennent de fichiers charges avant
// celui-ci.

// Espace entre un element contourne et la corde : tout pres, sans le toucher.
const MARGE_CORDE = RAYON_PISTE * 0.2;
// Rayon des arrondis ou la corde quitte ou rejoint un bord : celui d'un coin
// de bouton contourne a MARGE_CORDE (saab : "tu gardes le rayon de btn").
const RAYON_ARRONDI_CORDE = RAYON_COIN_BOUTON_FIN_PISTE + MARGE_CORDE;
// Le cadre du compteur Occ, un peu plus loin du texte.
const MARGE_CADRE_OCCURRENCES = RAYON_PISTE * 0.3;

// Boite englobante de `element` dans les coordonnees du plateau (viewBox),
// transformations comprises (les pendules et le compteur Occ sont tournes).
function boiteDansLePlateau(svg, element) {
  const versPlateau = svg.getScreenCTM().inverse();
  const r = element.getBoundingClientRect();
  const [a, b] = [new DOMPoint(r.left, r.top), new DOMPoint(r.right, r.bottom)].map((p) => p.matrixTransform(versPlateau));
  return { x1: Math.min(a.x, b.x), y1: Math.min(a.y, b.y), x2: Math.max(a.x, b.x), y2: Math.max(a.y, b.y) };
}

// Ramene en haut une boite du bas (miroir haut/bas).
function boiteEnHaut(boite, enHaut) {
  return enHaut ? boite : { x1: boite.x1, x2: boite.x2, y1: -boite.y2, y2: -boite.y1 };
}

// L'element de `selecteur` du cote demande, ramene en haut.
function boiteDuCote(svg, selecteur, enHaut) {
  for (const element of svg.querySelectorAll(selecteur)) {
    const boite = boiteDansLePlateau(svg, element);
    if ((boite.y1 + boite.y2) / 2 < 0 === enHaut) return boiteEnHaut(boite, enHaut);
  }
  return null;
}

// Les 6 cases de la piste d'ejection du cote demande, dans l'ordre de
// remplissage (1 a 6), ramenees en haut.
function casesDePiste(svg, enHaut) {
  return [...svg.querySelectorAll('.piste-case')]
    .filter((cercle) => Number(cercle.getAttribute('cy')) < 0 === enHaut)
    .sort((a, b) => Number(a.id.split('-').pop()) - Number(b.id.split('-').pop()))
    .map((cercle) => ({
      x: Number(cercle.getAttribute('cx')),
      y: Number(cercle.getAttribute('cy')) * (enHaut ? 1 : -1),
      rayon: Number(cercle.getAttribute('r')),
    }));
}

// Un cote de l'hexagone : direction (de `debut` vers `fin`), normale vers
// l'exterieur, et sa distance au centre le long de cette normale.
function coteDuPlateau(debut, fin) {
  const longueur = Math.hypot(fin.x - debut.x, fin.y - debut.y);
  const direction = { x: (fin.x - debut.x) / longueur, y: (fin.y - debut.y) / longueur };
  let normale = { x: direction.y, y: -direction.x };
  if (normale.x * debut.x + normale.y * debut.y < 0) normale = { x: -normale.x, y: -normale.y };
  return { debut, direction, normale, distance: normale.x * debut.x + normale.y * debut.y };
}

// Les sommets de la moitie haute de l'hexagone, reperes a l'ecran.
function sommetsDuHaut() {
  const sommets = calculerCadrePlateau().exterieur;
  const parX = [...sommets].sort((a, b) => a.x - b.x);
  const hauts = sommets.filter((p) => p.y < 0 && p !== parX[0] && p !== parX.at(-1)).sort((a, b) => a.x - b.x);
  return { gauche: parX[0], hautGauche: hauts[0], hautDroite: hauts[1], droite: parX.at(-1) };
}

// Le coin arrondi du plateau (rendu/cadre-plateau.js) : un coin de 120 degres,
// arrondi d'un cercle de RAYON_COIN_CADRE, dont le centre est vers le milieu.
function poulieCoinDuPlateau(sommet) {
  const distance = RAYON_COIN_CADRE / Math.sin(Math.PI / 3);
  const longueur = Math.hypot(sommet.x, sommet.y);
  return { x: sommet.x - (sommet.x / longueur) * distance, y: sommet.y - (sommet.y / longueur) * distance, rayon: RAYON_COIN_CADRE };
}

// Coin d'un bouton Abandonner/Nulle contourne a MARGE_CORDE, arrondi comme lui.
function poulieCoinDeBouton(boite, coin) {
  const rayonCoin = RAYON_COIN_BOUTON_FIN_PISTE;
  return {
    x: coin.includes('Gauche') ? boite.x1 + rayonCoin : boite.x2 - rayonCoin,
    y: coin.includes('haut') ? boite.y1 + rayonCoin : boite.y2 - rayonCoin,
    rayon: RAYON_ARRONDI_CORDE,
  };
}

// L'arrondi, hors du plateau, ou la corde quitte le `cote` pour contourner le
// cercle `cible` : tangent aux deux, avant la cible dans le sens du cote.
function poulieQuitteLeCote(cote, cible) {
  const { direction: d, normale: n } = cote;
  const decalage = cote.distance + RAYON_ARRONDI_CORDE - (n.x * cible.x + n.y * cible.y);
  const pied = { x: cible.x + decalage * n.x, y: cible.y + decalage * n.y };
  const recul = Math.sqrt(Math.max(0, (RAYON_ARRONDI_CORDE + cible.rayon) ** 2 - decalage ** 2));
  return { x: pied.x - recul * d.x, y: pied.y - recul * d.y, rayon: -RAYON_ARRONDI_CORDE };
}

// L'arrondi, hors du plateau, entre la verticale x = `x` (la corde descend
// le long du bouton Nulle, a sa droite) et le `cote` qu'elle rejoint.
function poulieEntreVerticaleEtCote(x, cote) {
  const { normale: n } = cote;
  const xCentre = x + RAYON_ARRONDI_CORDE;
  return { x: xCentre, y: (cote.distance + RAYON_ARRONDI_CORDE - n.x * xCentre) / n.y, rayon: -RAYON_ARRONDI_CORDE };
}

// Le trajet de la moitie `enHaut` (ou du bas, ramenee en haut), en poulies.
function pouliesDemiCorde(svg, enHaut) {
  const sommets = sommetsDuHaut();
  const coteGauche = coteDuPlateau(sommets.gauche, sommets.hautGauche);
  const cases = casesDePiste(svg, enHaut).map((c) => ({ ...c, rayon: c.rayon + MARGE_CORDE }));
  const [premiere, sixieme] = [cases[0], cases.at(-1)];
  const abandon = boiteDuCote(svg, '.bouton-fin-piste[data-action="abandon"] .bouton-fin-piste-fond', enHaut);
  const nulle = boiteDuCote(svg, '.bouton-fin-piste[data-action="nulle"] .bouton-fin-piste-fond', enHaut);
  // Les deux moities se rejoignent au milieu des coins arrondis de la rangee e
  // (sur l'axe y = 0), en suivant leur arrondi (saab : "toi tu as fait un angle").
  const coinGauche = poulieCoinDuPlateau(sommets.gauche);
  const coinDroit = poulieCoinDuPlateau(sommets.droite);

  return [
    { x: coinGauche.x - coinGauche.rayon, y: 0, rayon: 0 },
    coinGauche,
    poulieQuitteLeCote(coteGauche, sixieme),
    sixieme,
    premiere,
    poulieCoinDeBouton(abandon, 'basGauche'),
    poulieCoinDeBouton(abandon, 'hautGauche'),
    poulieCoinDeBouton(nulle, 'hautDroite'),
    poulieEntreVerticaleEtCote(nulle.x2 + MARGE_CORDE, coteGauche),
    poulieCoinDuPlateau(sommets.hautGauche),
    poulieCoinDuPlateau(sommets.hautDroite),
    coinDroit,
    { x: coinDroit.x + coinDroit.rayon, y: 0, rayon: 0 },
  ];
}

// Pose le fond (sous le plateau, qui le recouvre) et les deux demi-cordes.
// `hexFond` : la couleur du plateau (board.bg_color) ; il la suit ensuite en
// direct avec le plateau (rendu/cadre-plateau.js, actualiserCouleurCadrePlateau).
// Rien si le plateau n'est pas affiche (aucune position mesurable).
function dessinerCorde(svg, hexFond) {
  if (!svg.getScreenCTM() || svg.getBoundingClientRect().width === 0) return;
  const haut = cheminDeCourroie(tracerCourroie(pouliesDemiCorde(svg, true)));
  const bas = cheminDeCourroie(tracerCourroie(pouliesDemiCorde(svg, false)), true);

  // Chaque moitie refermee par la rangee e, cachee sous le plateau.
  const fond = creerElementSVG('path', { d: `${haut} Z ${bas} Z`, class: 'fond-corde', fill: hexFond });
  const premier = svg.querySelector('.decor-fige') ?? svg.querySelector('.fond-plateau');
  svg.insertBefore(fond, premier);

  // Le camp du haut : Blanc, sauf plateau retourne.
  const campHaut = sensDuPlateau === 1 ? 'blanc' : 'noir';
  const campBas = campHaut === 'blanc' ? 'noir' : 'blanc';
  const cordes = creerElementSVG('g', { class: 'cordes' });
  cordes.append(
    creerElementSVG('path', { d: haut, class: `corde corde-${campHaut}` }),
    creerElementSVG('path', { d: bas, class: `corde corde-${campBas}` })
  );
  svg.insertBefore(cordes, premier.nextSibling);
}

// Le cadre du compteur Occ (demande de saab) : pointille noir et blanc, rempli
// du gris du plateau PAR DEFAUT, jamais de la couleur reglee — il ne change
// pas. A rappeler a chaque changement du texte (sa longueur change).
function ajusterCadreOccurrences(svg) {
  const texte = svg.querySelector('#compteur-occurrences-plateau');
  if (!texte || !texte.textContent || !svg.getScreenCTM()) return;
  const b = boiteDansLePlateau(svg, texte);
  const m = MARGE_CADRE_OCCURRENCES;
  const attributs = { x: b.x1 - m, y: b.y1 - m, width: b.x2 - b.x1 + 2 * m, height: b.y2 - b.y1 + 2 * m, rx: RAYON_ARRONDI_CORDE };
  let cadre = svg.querySelector('.cadre-occurrences');
  if (!cadre) {
    cadre = creerElementSVG('g', { class: 'cadre-occurrences' });
    cadre.append(
      creerElementSVG('rect', { class: 'cadre-occurrences-fond' }),
      creerElementSVG('rect', { class: 'cadre-occurrences-tirets' })
    );
    svg.insertBefore(cadre, texte);
  }
  for (const rect of cadre.children) {
    for (const [cle, valeur] of Object.entries(attributs)) rect.setAttribute(cle, valeur);
  }
}
