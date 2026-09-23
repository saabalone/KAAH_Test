// Aspect visuel du plateau PRINCIPAL (phase 19ter) : grand hexagone et son
// cadre (rendu/cadre-plateau.js), relief entre les cases
// (rendu/relief-cylindres.js), trous perfores, billes
// glacees — jamais les petits apercus (Mes parties/Variantes/Puzzles,
// decide dans PLAN.md), qui gardent le rendu plat de rendu/plateau-svg.js.
//
// KAAWA obtient un effet proche avec des instructions de dessin bas niveau
// (kaa_board_widget_ClO_Co.py, draw_board) : plusieurs cercles semi-
// transparents empiles pour une bille, deux arcs pour un trou. Le SVG offre
// des degrades et des filtres NATIFS pour le meme effet, en plus simple et
// plus lisse — on les utilise ici plutot que de recopier ses instructions
// bas niveau une a une (CLAUDE.md : pas de code astucieux la ou plus simple
// suffit). Verifie dans le vrai code pour les COULEURS et la GEOMETRIE
// (elles, ne s'inventent pas), pas pour la technique de dessin.
//
// A appeler UNE SEULE FOIS, juste apres dessinerPlateau (avant de poser les
// billes) : les <defs> et le fond doivent exister avant que les billes et
// les autres bandes (coordonnees, ejections...) ne s'ajoutent par-dessus.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : casesDuPlateau
// (moteur/plateau.js), positionEcran, RAYON_BILLE, creerElementSVG
// (rendu/plateau-svg.js), dessinerReliefCylindres (rendu/relief-cylindres.js),
// calculerCadrePlateau, dessinerCadrePlateau, ajusterViewBoxAuCadre
// (rendu/cadre-plateau.js), REGLAGES_PAR_DEFAUT (moteur/reglages.js, phase
// 22), couleurVersHex, teinterNiveauGris, construireArretsBille
// (moteur/couleurs.js, phase 22) viennent de fichiers charges avant
// celui-ci dans index.html.
//
// Recolorer ce decor UNE FOIS CONSTRUIT, sans le reconstruire (phase 22,
// correctif "les couleurs doivent s'appliquer en direct") : voir
// rendu/couleurs-plateau.js, qui charge apres celui-ci et reutilise ses
// constantes de niveau de gris et ses arrets de degrade par defaut.

// Rayon du trou au centre de chaque case, en fraction de la bille (regle
// par saab : sur un vrai plateau, le trou est plus petit que la bille, qui
// repose surtout sur le relief autour). Le cercle `.case` original
// (rendu/plateau-svg.js, RAYON_CASE * 0.9) garde sa taille : c'est encore
// LUI qui recoit les clics (zone tactile de 44px, CLAUDE.md) et QUI
// s'allume en vert/orange (destination/selection) — seul son remplissage
// devient transparent sur le plateau principal (styles.css, .case-relief),
// laissant voir le trou dessine par-dessus.
const RAYON_TROU_CENTRAL = RAYON_BILLE * 0.66;
// Le fond du trou : un cercle un peu plus petit, au fond de la perforation.
// L'anneau entre les deux est la PAROI du trou ; c'est le fond qui recoit
// l'ombre de cette paroi (voir creerFiltreOmbreInterieure).
const RATIO_FOND_TROU = 0.75;

// Un degrade radial de bille, decale vers le haut-gauche (cx/cy < 50%) —
// l'eclairage venant de ce cote partout ailleurs dans KAAH (icone Puzzles,
// phase 19). `arrets` : [[offset en %, couleur], ...]. Le premier arret est
// le point le plus brillant : blanc pur (#ffffff) pour un reflet bien
// brillant, jamais mat (signale par saab).
function creerDegradeBille(id, arrets) {
  const degrade = creerElementSVG('radialGradient', { id, cx: '35%', cy: '30%', r: '75%' });
  for (const [offset, couleur] of arrets) {
    degrade.appendChild(creerElementSVG('stop', { offset: `${offset}%`, 'stop-color': couleur }));
  }
  return degrade;
}

function creerFiltreOmbre(id, dx, dy, flou, opacite) {
  const filtre = creerElementSVG('filter', { id, x: '-50%', y: '-50%', width: '200%', height: '200%' });
  filtre.appendChild(
    creerElementSVG('feDropShadow', { dx, dy, stdDeviation: flou, 'flood-color': '#000', 'flood-opacity': opacite })
  );
  return filtre;
}

// Ombre INTERIEURE : l'ombre que la paroi du trou (cote de la lumiere,
// haut-gauche) projette sur son fond. Technique classique : on inverse la
// forme (tout ce qui l'entoure), on la decale vers le bas-droite (elle
// empiete alors sur le bord haut-gauche de la forme), on l'adoucit, on ne
// garde que ce qui tombe DANS la forme, puis on la pose par-dessus.
function creerFiltreOmbreInterieure(id, dx, dy, flou, opacite) {
  const filtre = creerElementSVG('filter', { id, x: '-20%', y: '-20%', width: '140%', height: '140%' });
  filtre.appendChild(creerElementSVG('feFlood', { 'flood-color': '#000', 'flood-opacity': opacite, result: 'noir' }));
  filtre.appendChild(creerElementSVG('feComposite', { in: 'noir', in2: 'SourceAlpha', operator: 'out', result: 'exterieur' }));
  filtre.appendChild(creerElementSVG('feOffset', { in: 'exterieur', dx, dy, result: 'decale' }));
  filtre.appendChild(creerElementSVG('feGaussianBlur', { in: 'decale', stdDeviation: flou, result: 'flou' }));
  filtre.appendChild(creerElementSVG('feComposite', { in: 'flou', in2: 'SourceAlpha', operator: 'in', result: 'ombre' }));
  const fusion = creerElementSVG('feMerge', {});
  fusion.appendChild(creerElementSVG('feMergeNode', { in: 'SourceGraphic' }));
  fusion.appendChild(creerElementSVG('feMergeNode', { in: 'ombre' }));
  filtre.appendChild(fusion);
  return filtre;
}

// Un trou est un CREUX, pas une bosse : un degrade RADIAL donne toujours un
// petit reflet rond au milieu d'un fond plus sombre — l'oeil y lit une
// bosse brillante, jamais un creux. La paroi se lit en DEUX MOITIES : un
// degrade LINEAIRE en diagonale, sombre du cote qui regarde la lumiere
// (haut-gauche), clair du cote oppose (la paroi qui lui fait face).
function creerDegradeParoi(id, couleurSombre, couleurClaire) {
  const degrade = creerElementSVG('linearGradient', { id, x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
  degrade.appendChild(creerElementSVG('stop', { offset: '15%', 'stop-color': couleurSombre }));
  degrade.appendChild(creerElementSVG('stop', { offset: '85%', 'stop-color': couleurClaire }));
  return degrade;
}

// Arrets par defaut (regles a la main, approuves par saab, phase 19ter) — ceux
// que garde chaque bille TANT QUE sa couleur (phase 22, moteur/reglages.js)
// reste celle par defaut. Une couleur personnalisee, elle, passe par
// construireArretsBille (approximation plus simple mais generique).
const ARRETS_BILLE_NOIRE_PAR_DEFAUT = [
  [0, '#ffffff'],
  [9, '#a8a8a8'],
  [30, '#4a4a4a'],
  [60, '#1f1f1f'],
  [100, '#050505'],
];
const ARRETS_BILLE_BLANCHE_PAR_DEFAUT = [
  [0, '#ffffff'],
  [35, '#f2f2f2'],
  [65, '#d8d8d8'],
  [100, '#a8a8a8'],
];

// Niveaux de gris d'origine (phase 19ter) de la paroi du trou, sombre puis
// claire — teintes desormais avec board.hole_color (phase 22, "un seul bloc
// de matiere", saab) plutot que fixes.
const NIVEAU_GRIS_PAROI_SOMBRE = 0x4d;
const NIVEAU_GRIS_PAROI_CLAIRE = 0x96;

// Degrades des billes : ceux CHOISIS par saab (phase 22, interface/
// reglages.js, appliquerCouleurs) si differents du defaut, sinon les arrets
// d'origine ci-dessus. `hexTrou` (board.hole_color) : la paroi du trou —
// jamais la meme teinte que le plateau (un vrai creux se voit).
function creerDegradesEtFiltres(hexTrou, couleursBilles) {
  const defs = creerElementSVG('defs', {});
  defs.appendChild(
    creerDegradeParoi('degrade-paroi-trou', teinterNiveauGris(hexTrou, NIVEAU_GRIS_PAROI_SOMBRE), teinterNiveauGris(hexTrou, NIVEAU_GRIS_PAROI_CLAIRE))
  );
  const hexNoirDefaut = couleurVersHex(REGLAGES_PAR_DEFAUT.colors.black);
  const hexBlancDefaut = couleurVersHex(REGLAGES_PAR_DEFAUT.colors.white);
  const hexNoir = couleursBilles?.black ?? hexNoirDefaut;
  const hexBlanc = couleursBilles?.white ?? hexBlancDefaut;
  defs.appendChild(
    creerDegradeBille('degrade-bille-noir', hexNoir === hexNoirDefaut ? ARRETS_BILLE_NOIRE_PAR_DEFAUT : construireArretsBille(hexNoir))
  );
  defs.appendChild(
    creerDegradeBille('degrade-bille-blanc', hexBlanc === hexBlancDefaut ? ARRETS_BILLE_BLANCHE_PAR_DEFAUT : construireArretsBille(hexBlanc))
  );
  defs.appendChild(creerFiltreOmbre('ombre-bille-plateau', 0.6, 0.9, 0.5, 0.45));
  defs.appendChild(creerFiltreOmbre('ombre-fond-plateau', 1, 1.6, 1.2, 0.4));
  defs.appendChild(creerFiltreOmbre('ombre-relief-plateau', 0.4, 0.6, 0.4, 0.35));
  defs.appendChild(creerFiltreOmbreInterieure('ombre-fond-trou', 0.8, 1, 0.5, 0.65));
  return defs;
}

// Niveau de gris d'origine (phase 19ter) du fond du trou.
const NIVEAU_GRIS_FOND_TROU = 0x5a;

// Les trous perfores : pour chaque case, la paroi (l'anneau, degrade) puis
// le fond, un cercle plus petit qui prend l'ombre de la paroi — teinte avec
// `hexTrou` (board.hole_color, phase 22), en attribut (styles.css ne garde
// que le filtre, voir sa note). Jamais cliquables eux-memes (pointer-events:
// none) : le vrai cercle qui recoit les clics reste le `.case` original.
function dessinerTrousCentraux(hexTrou) {
  const groupe = creerElementSVG('g', { class: 'trous-centraux' });
  const couleurFond = teinterNiveauGris(hexTrou, NIVEAU_GRIS_FOND_TROU);
  for (const { q, r } of casesDuPlateau()) {
    const { x, y } = positionEcran(q, r);
    groupe.appendChild(creerElementSVG('circle', { cx: x, cy: y, r: RAYON_TROU_CENTRAL, class: 'case-dimple' }));
    groupe.appendChild(
      creerElementSVG('circle', { cx: x, cy: y, r: RAYON_TROU_CENTRAL * RATIO_FOND_TROU, class: 'case-fond-trou', fill: couleurFond })
    );
  }
  return groupe;
}

// A appeler une seule fois, juste apres dessinerPlateau. `.case-relief`
// (rend le grand cercle transparent, styles.css) est posee ici sur les
// cases DEJA dessinees : jamais recreees, seulement une classe en plus
// (CLAUDE.md, ne jamais reconstruire le plateau par innerHTML).
// `avecRelief` (phase 22, moteur/reglages.js, board.show_shadows) : `false`
// donne le "mode simple" — le cadre existe encore (memes coordonnees du bord,
// memes cases cliquables, meme viewBox : rien ne bouge pour l'utilisateur),
// mais ni les cylindres de relief, ni les trous perfores, ni les degrades/
// filtres ne sont crees. Le gain reel demande par saab (telephone lent) : sur
// 1 278 elements SVG dont 91 avec un filtre, ce mode-la n'en pose plus qu'une
// poignee, sans filtre du tout. Les cases gardent alors leur remplissage
// PLAT (styles.css, `.case`) au lieu de devenir transparentes sur des trous
// qui n'existent plus.
// `hexFond` (board.bg_color) teinte le fond, le relief et le dessous des
// cases plates (mode simple) — "un seul bloc de matiere" (saab). `hexTrou`
// (board.hole_color) teinte la paroi et le fond des trous, deliberement
// distinct (un vrai creux se voit). `couleursBilles` : voir
// creerDegradesEtFiltres, sans effet en mode simple (rien a colorer).
function dessinerReliefPlateau(svg, avecRelief = true, hexFond = couleurVersHex(REGLAGES_PAR_DEFAUT.board.bg_color), hexTrou = couleurVersHex(REGLAGES_PAR_DEFAUT.board.hole_color), couleursBilles) {
  const groupeCases = svg.querySelector('.cases');
  const cadre = calculerCadrePlateau();
  const fond = dessinerCadrePlateau(cadre, hexFond);
  svg.insertBefore(fond, groupeCases);

  if (avecRelief) {
    // Ordre de calque voulu, du dessous vers le dessus : defs (invisible),
    // fond (deja pose), cylindres de relief, trous, puis les cases
    // (transparentes, voir .case-relief) — chaque insertBefore place son
    // element juste devant le precedent, en partant de groupeCases.
    const trous = dessinerTrousCentraux(hexTrou);
    const cylindres = dessinerReliefCylindres(hexFond);
    const defs = creerDegradesEtFiltres(hexTrou, couleursBilles);
    svg.insertBefore(trous, groupeCases);
    svg.insertBefore(cylindres, trous);
    svg.insertBefore(defs, fond);
    for (const caseElement of groupeCases.querySelectorAll('.case')) {
      caseElement.classList.add('case-relief');
    }
  }
  // `.mode-simple` (styles.css) : sans elle, le fond garderait un filtre
  // d'ombre qui reference des <defs> qui n'existent plus en mode simple.
  svg.classList.toggle('mode-simple', !avecRelief);

  ajusterViewBoxAuCadre(svg, cadre);
}

// actualiserCouleursPlateau (recolorer tout ce qui precede SANS
// reconstruire, phase 22 "en direct") vit desormais dans
// rendu/couleurs-plateau.js (regle des 200 lignes, CLAUDE.md).
