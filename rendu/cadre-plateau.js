// Le grand hexagone du plateau PRINCIPAL et son cadre (phase 19ter) : une
// BANDE dont l'exterieur est pose contre l'exterieur des cylindres de la
// couronne exterieure, et l'interieur contre l'exterieur des cylindres de la
// couronne interieure (ceux qui entourent le trou juste derriere) — signale
// par saab. Le long d'un cote, les cylindres du bord alternent entre ces deux
// rangees : la bande contient donc les cylindres exterieurs, et entre deux
// d'entre eux, devant un cylindre interieur, reste un creux ou s'ecrit une
// coordonnee (rendu/coordonnees-bord.js) — plus aucune bande a part autour du
// plateau (de la place gagnee, cette fois pour de bon : une premiere version
// posait le cadre AU-DELA des cylindres exterieurs, l'inverse).
//
// Les coins de l'hexagone sont arrondis : le rayon du coin est un multiple de
// celui d'un cylindre. La bande a la couleur du plateau : rien ne la
// distingue a l'oeil, on ne dessine donc que le contour exterieur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : depuisNotation
// (moteur/plateau.js), positionEcran, RAYON_CASE, creerElementSVG
// (rendu/plateau-svg.js), centresCylindres, RAYON_BISEAU,
// cheminPolygoneArrondi (rendu/relief-cylindres.js) viennent de fichiers
// charges avant celui-ci dans index.html.

// Les 6 coins reels du plateau (ou les rangees a/e/i commencent et
// finissent), dans l'ordre du contour — jamais une forme hexagonale
// inventee a part : c'est exactement la silhouette des 61 cases. Le cote i
// va du coin i au coin i+1 : 0 = bas (chiffres 1-5), 1 = bas-droite
// (chiffres 6-9), 2 = haut-droite, 3 = haut, 4 = haut-gauche (lettres i-f),
// 5 = bas-gauche (lettres e-a).
const COINS_PLATEAU = ['a1', 'a5', 'e9', 'i9', 'i5', 'e1'];
const COTE_CHIFFRES_BAS = 0;
const COTE_CHIFFRES_BAS_DROITE = 1;
const COTE_LETTRES_HAUT = 4;
const COTE_LETTRES_BAS = 5;

// Rayon du coin exterieur du cadre, en rayons de cylindre. Un cylindre
// tangent aux deux cotes d'un coin ne rentre dans le coin arrondi que si ce
// rayon vaut au plus 1 — plus grand, il depasse un peu du cadre, ce que
// saab accepte pour un hexagone franchement arrondi.
const RAYON_COIN_CADRE = RAYON_BISEAU * 2;
// Deux valeurs de projection sont "la meme rangee de cylindres" si elles
// different de moins que ca (les projections d'une meme rangee sont egales
// a l'arrondi pres).
const TOLERANCE_RANGEE = RAYON_CASE * 0.1;
// Un coin de 120 degres arrondi par un cercle de rayon R : la courbe
// commence a R / tan(60 degres) du sommet.
const COUPE_PAR_RAYON_COIN = 1 / Math.tan(Math.PI / 3);

// Les 6 cotes du cadre : `normale` (unitaire, vers l'exterieur) et, en
// distance depuis le centre du plateau, `exterieur` (contre l'exterieur des
// cylindres de la couronne exterieure, la rangee la plus eloignee dans cette
// direction) et `interieur` (contre l'exterieur de la couronne interieure,
// la rangee juste derriere) — calcules d'apres les cylindres eux-memes,
// jamais une distance a la main.
function cotesDuCadre() {
  const coins = COINS_PLATEAU.map((notation) => {
    const { q, r } = depuisNotation(notation);
    return positionEcran(q, r);
  });
  const centres = centresCylindres();
  return coins.map((debut, i) => {
    const fin = coins[(i + 1) % coins.length];
    const longueur = Math.hypot(fin.x - debut.x, fin.y - debut.y);
    const normale = { x: -(fin.y - debut.y) / longueur, y: (fin.x - debut.x) / longueur };
    const rangees = [];
    for (const projection of centres.map((centre) => centre.x * normale.x + centre.y * normale.y).sort((a, b) => b - a)) {
      if (rangees.length === 0 || rangees[rangees.length - 1] - projection > TOLERANCE_RANGEE) rangees.push(projection);
      if (rangees.length === 2) break;
    }
    return { normale, exterieur: rangees[0] + RAYON_BISEAU, interieur: rangees[1] + RAYON_BISEAU };
  });
}

// Les 6 sommets du contour qui suit `bord` ('interieur' ou 'exterieur') de
// chaque cote : le sommet i est l'intersection du cote i-1 et du cote i.
function sommetsDuContour(cotes, bord) {
  return cotes.map((suivant, i) => {
    const precedent = cotes[(i + cotes.length - 1) % cotes.length];
    const h1 = precedent[bord];
    const h2 = suivant[bord];
    const n1 = precedent.normale;
    const n2 = suivant.normale;
    const determinant = n1.x * n2.y - n1.y * n2.x;
    return { x: (h1 * n2.y - h2 * n1.y) / determinant, y: (n1.x * h2 - n2.x * h1) / determinant };
  });
}

// Le cadre : ses 6 cotes et son contour exterieur (celui qu'on dessine).
function calculerCadrePlateau() {
  const cotes = cotesDuCadre();
  return { cotes, exterieur: sommetsDuContour(cotes, 'exterieur') };
}

// Position d'une coordonnee (lettre ou chiffre) dans le cadre : son point
// geometrique `point` (moteur.casesBordDuPlateau, un pas hors du plateau),
// ramene AU MILIEU DE LA BANDE du cote `cote` en le faisant glisser le long
// de `axe` (vecteur unitaire ecran) — l'axe de SA rangee pour une lettre (la
// ligne des centres des cases de cette rangee), de SA colonne pour un
// chiffre : la coordonnee reste ainsi exactement dans le prolongement des
// centres de ses cases (signale par saab : glissee le long de la normale du
// cote, elle sortait de cet axe des que le cote est incline — lettres a-e
// trop hautes, f-i trop basses, chiffres 1-5 trop a droite, 6-9 a gauche).
function positionDansLeCadre(cadre, cote, point, axe) {
  const { normale, interieur, exterieur } = cadre.cotes[cote];
  const cible = (interieur + exterieur) / 2;
  const distance = (cible - (point.x * normale.x + point.y * normale.y)) / (axe.x * normale.x + axe.y * normale.y);
  return { x: point.x + axe.x * distance, y: point.y + axe.y * distance };
}

// Cote du cadre qui porte cette coordonnee (voir COINS_PLATEAU).
function coteDeLaCoordonnee(q, r, estUnChiffre) {
  if (estUnChiffre) return q <= 0 ? COTE_CHIFFRES_BAS : COTE_CHIFFRES_BAS_DROITE;
  return r >= 0 ? COTE_LETTRES_BAS : COTE_LETTRES_HAUT;
}

// Le plateau : UNE seule forme, l'hexagone arrondi qui va jusqu'a
// l'exterieur de la bande. La bande est de la couleur du plateau (signale par
// saab) : elle n'est plus une forme a part, seulement la zone ou s'ecrivent
// les coordonnees (voir positionDansLeCadre).
// `hexFond` (board.bg_color, phase 22, moteur/reglages.js) : en ATTRIBUT,
// pas en CSS (styles.css, .fond-plateau, ne garde que le filtre) — une
// couleur reglable ne peut pas rester une valeur fixe dans la feuille de
// style.
function dessinerCadrePlateau(cadre, hexFond) {
  return creerElementSVG('path', {
    d: cheminPolygoneArrondi(cadre.exterieur, RAYON_COIN_CADRE * COUPE_PAR_RAYON_COIN),
    class: 'fond-plateau',
    fill: hexFond,
  });
}

// Recolore le fond deja construit (phase 22, correctif "en direct") : sans
// cette fonction, un changement de board.bg_color dans les reglages ne se
// voyait qu'en changeant de partie (le decor est fige en bitmap, voir
// rendu/cache-relief.js — c'est l'appelant qui force son redessin apres
// avoir change cette couleur).
function actualiserCouleurCadrePlateau(svg, hexFond) {
  svg.querySelector('.fond-plateau')?.setAttribute('fill', hexFond);
}

// Marge autour du cadre dans le viewBox : de quoi laisser voir son ombre
// portee (styles.css, .fond-plateau), pas davantage.
const MARGE_VIEWBOX_CADRE = RAYON_CASE * 0.2;

// Le viewBox du plateau principal devient EXACTEMENT le cadre (plus une
// petite marge) : les coordonnees vivent dedans, donc plus aucune bande
// autour du plateau — c'est la place gagnee. Remplace celui de
// rendu/plateau-svg.js (ajusterViewBox), calcule sur les seules cases.
function ajusterViewBoxAuCadre(svg, cadre) {
  const abscisses = cadre.exterieur.map((sommet) => sommet.x);
  const ordonnees = cadre.exterieur.map((sommet) => sommet.y);
  const xMin = Math.min(...abscisses) - MARGE_VIEWBOX_CADRE;
  const yMin = Math.min(...ordonnees) - MARGE_VIEWBOX_CADRE;
  const largeur = Math.max(...abscisses) + MARGE_VIEWBOX_CADRE - xMin;
  const hauteur = Math.max(...ordonnees) + MARGE_VIEWBOX_CADRE - yMin;
  svg.setAttribute('viewBox', `${xMin} ${yMin} ${largeur} ${hauteur}`);
}
