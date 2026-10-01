// Les pendules A L'HORIZONTALE (reglage « Pendules et Occ à l'horizontale »,
// saab 2026-10-01 : « on me demande souvent de ne pas avoir les pendules et Occ
// en vertical »). Occ quitte alors le plateau pour le haut de la colonne des
// tableaux (index.html) : le plateau recupere sa bande a gauche, et les
// pendules couchees se logent en haut et en bas a droite, a cote des noms,
// avec leur libelle de mode cote plateau et leur temps cumule dessous (en
// haut) ou dessus (en bas). Memes identifiants et classes que les pendules
// verticales (rendu/pendule.js) : interface/pendules.js ecrit dedans sans
// savoir comment elles sont posees.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG
// (rendu/plateau-svg.js), RAYON_PISTE, HAUTEUR_BANDE (rendu/ejections.js),
// LARGEUR_BOUTON_PENDULE, HAUTEUR_BOUTON_PENDULE, BANDE_LIBELLE_PENDULE,
// JEU_PENDULE, JEU_BANDE_PENDULE, LONGUEUR_CUMUL_PENDULE,
// EPAISSEUR_CUMUL_PENDULE (rendu/pendule.js), centreDeLEncre
// (rendu/coordonnees-bord.js), MARGE_VIEWBOX_CADRE (rendu/cadre-plateau.js)
// viennent de fichiers charges avant l'appel.

// Ecart minimal entre une pendule couchee et ce qu'elle longe (le cadre du
// plateau, ses coordonnees) : collee, sans toucher (saab, 2026-10-01 : « il
// faut qu'elles collent au plateau sinon tu perds de la place »).
const ECART_PENDULE_HORIZONTALE = RAYON_PISTE * 0.4;
// Sans Occ a gauche, une bande pour ce qui deborde du cadre de ce cote (les
// boutons Abandon/Nulle, la corde) : sans elle, ils etaient rognes.
const MARGE_GAUCHE_SANS_OCC = MARGE_VIEWBOX_CADRE * 3;

function reserverMargeGaucheSansOcc(svg) {
  const [xMin, yMin, largeur, hauteur] = svg.getAttribute('viewBox').split(' ').map(Number);
  svg.setAttribute('viewBox', `${xMin - MARGE_GAUCHE_SANS_OCC} ${yMin} ${largeur + MARGE_GAUCHE_SANS_OCC} ${hauteur}`);
}

// Le x le plus a droite occupe entre `yHaut` et `yBas` : le cadre, et les
// coordonnees dessinees contre lui (les chiffres du bas a droite).
function bordDroitOccupe(svg, cadre, yHaut, yBas) {
  let x = Math.max(bordDroitDuCadre(cadre, yHaut), bordDroitDuCadre(cadre, yBas));
  for (const texte of svg.querySelectorAll('.coordonnee-bord')) {
    const boite = texte.getBBox();
    if (boite.y < yBas && boite.y + boite.height > yHaut) x = Math.max(x, boite.x + boite.width);
  }
  return x;
}

// Le x du bord droit du cadre du plateau a la hauteur `y` (le cadre est un
// hexagone : un sommet a droite, deux cotes obliques).
function bordDroitDuCadre(cadre, y) {
  const sommets = cadre.exterieur;
  const droite = sommets.reduce((a, b) => (b.x > a.x ? b : a));
  const coins = sommets.filter((sommet) => sommet !== droite && Math.sign(sommet.y - droite.y) === Math.sign(y - droite.y));
  if (coins.length === 0) return droite.x;
  const coin = coins.reduce((a, b) => (b.x > a.x ? b : a));
  if (Math.abs(y) >= Math.abs(coin.y)) return coin.x;
  return droite.x + ((y - droite.y) * (coin.x - droite.x)) / (coin.y - droite.y);
}

// La place de chaque pendule couchee, et l'agrandissement du viewBox a droite
// qu'elle demande. `limites` : celles du plateau avant les bandes des noms.
function disposerPendulesHorizontales(svg, cadre, limites) {
  const hauteurCadre = HAUTEUR_BOUTON_PENDULE + BANDE_LIBELLE_PENDULE;
  const yHaut = limites.yMin - HAUTEUR_BANDE + JEU_PENDULE;
  const yBas = limites.yMax + HAUTEUR_BANDE - JEU_PENDULE - hauteurCadre;
  // Chacune longe le plateau a sa hauteur, son cumul aussi (dessous en haut,
  // dessus en bas) ; les deux pendules restent alignees a droite.
  const droiteNecessaire = (yPendule, yCumul) =>
    Math.max(
      bordDroitOccupe(svg, cadre, yPendule, yPendule + hauteurCadre) + ECART_PENDULE_HORIZONTALE + LARGEUR_BOUTON_PENDULE,
      bordDroitOccupe(svg, cadre, yCumul, yCumul + EPAISSEUR_CUMUL_PENDULE) + ECART_PENDULE_HORIZONTALE + LONGUEUR_CUMUL_PENDULE
    );
  const droite = Math.max(droiteNecessaire(yHaut, yHaut + hauteurCadre), droiteNecessaire(yBas, yBas - EPAISSEUR_CUMUL_PENDULE));
  const [xMin, yMin, largeur, hauteur] = svg.getAttribute('viewBox').split(' ').map(Number);
  const nouveauXMax = Math.max(xMin + largeur, droite + JEU_PENDULE);
  svg.setAttribute('viewBox', `${xMin} ${yMin} ${nouveauXMax - xMin} ${hauteur}`);
  return {
    haut: { x: droite - LARGEUR_BOUTON_PENDULE, y: yHaut, enHaut: true, droite },
    bas: { x: droite - LARGEUR_BOUTON_PENDULE, y: yBas, enHaut: false, droite },
  };
}

// Le cadre, les deux traits verticaux « || » (pause, aux deux bouts), les
// chiffres, puis la bande du libelle cote plateau (dessous en haut, dessus en
// bas).
function dessinerPenduleHorizontale(svg, camp, { x, y, enHaut, droite }) {
  const groupe = creerElementSVG('g', { id: `bouton-pendule-${camp}`, class: 'bouton-pendule' });
  groupe.appendChild(
    creerElementSVG('rect', {
      x,
      y,
      width: LARGEUR_BOUTON_PENDULE,
      height: HAUTEUR_BOUTON_PENDULE + BANDE_LIBELLE_PENDULE,
      rx: RAYON_PISTE * 0.6,
      class: `cadre-pendule cadre-pendule-${camp}`,
    })
  );
  const yChiffres = enHaut ? y : y + BANDE_LIBELLE_PENDULE;
  const yBande = enHaut ? y + HAUTEUR_BOUTON_PENDULE : y;
  const epaisseurTrait = HAUTEUR_BOUTON_PENDULE * 0.11;
  const margeTrait = HAUTEUR_BOUTON_PENDULE * 0.12;
  for (const xTrait of [x + JEU_BANDE_PENDULE, x + LARGEUR_BOUTON_PENDULE - JEU_BANDE_PENDULE - epaisseurTrait]) {
    groupe.appendChild(
      creerElementSVG('rect', {
        x: xTrait,
        y: yChiffres + margeTrait,
        width: epaisseurTrait,
        height: HAUTEUR_BOUTON_PENDULE - margeTrait * 2,
        class: 'pendule-bande',
      })
    );
  }
  const centre = x + LARGEUR_BOUTON_PENDULE / 2;
  const texte = creerElementSVG('text', { id: `pendule-${camp}`, x: centre, class: `pendule-camp pendule-camp-${camp}`, 'text-anchor': 'middle' });
  groupe.appendChild(texte);
  groupe.appendChild(
    creerElementSVG('text', {
      id: `libelle-pendule-${camp}`,
      class: `libelle-pendule libelle-pendule-${camp}`,
      x: centre,
      y: yBande + BANDE_LIBELLE_PENDULE / 2,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    })
  );
  svg.appendChild(groupe);
  // Centres sur leur encre, comme les pendules verticales (rendu/pendule.js).
  texte.setAttribute('y', yChiffres + HAUTEUR_BOUTON_PENDULE / 2 - centreDeLEncre(texte, '0123456789').y);
  dessinerCumulHorizontal(svg, camp, { droite, yCadre: enHaut ? y + HAUTEUR_BOUTON_PENDULE + BANDE_LIBELLE_PENDULE : y - EPAISSEUR_CUMUL_PENDULE });
}

// Le temps cumule, colle a la pendule cote plateau, aligne a droite.
function dessinerCumulHorizontal(svg, camp, { droite, yCadre }) {
  const debut = droite - LONGUEUR_CUMUL_PENDULE;
  const groupe = creerElementSVG('g', { id: `cumul-pendule-${camp}`, class: 'cumul-pendule' });
  groupe.appendChild(
    creerElementSVG('rect', {
      x: debut,
      y: yCadre,
      width: LONGUEUR_CUMUL_PENDULE,
      height: EPAISSEUR_CUMUL_PENDULE,
      rx: RAYON_PISTE * 0.4,
      class: `cadre-pendule cadre-pendule-${camp}`,
    })
  );
  groupe.appendChild(
    creerElementSVG('text', {
      id: `texte-cumul-pendule-${camp}`,
      class: 'texte-cumul-pendule',
      x: debut + LONGUEUR_CUMUL_PENDULE / 2,
      y: yCadre + EPAISSEUR_CUMUL_PENDULE / 2,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    })
  );
  svg.appendChild(groupe);
}
