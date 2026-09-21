// Bordure de coordonnees PERMANENTE autour du plateau (phase 19bis, partie
// 1/3) : les lettres a-i et chiffres 1-9, exactement comme KAAWA
// (kaa_board_widget_ClO_Co.py, boucle sur SIDE_NOTATION_COORDS). Aucun
// interrupteur : KAAWA n'en propose pas non plus (verifie dans son code et
// ses Reglages), donc ni dans KAAH pour l'instant.
//
// Les positions elles-memes (moteur/plateau.js, casesBordDuPlateau) ne sont
// PAS de vraies cases : ce fichier se contente de les dessiner, avec la
// MEME fonction ecran que les vraies cases (positionEcran) — aucune regle
// de geometrie inventee ici.
//
// Les coordonnees vivent DANS le cadre du grand hexagone (rendu/cadre-plateau.js),
// au milieu de son epaisseur — signale par saab : plus aucune bande a part
// autour du plateau, de la place gagnee. A appeler apres dessinerReliefPlateau,
// qui a deja pose le cadre et ajuste le viewBox dessus.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : casesBordDuPlateau
// (moteur/plateau.js), positionEcran, creerElementSVG (rendu/plateau-svg.js),
// calculerCadrePlateau, coteDeLaCoordonnee, positionDansLeCadre
// (rendu/cadre-plateau.js) viennent de fichiers charges avant celui-ci dans
// index.html.

// Un chiffre (1-9) se lit dans l'axe de sa COLONNE, qui n'est pas vertical
// sur une grille hexagonale pointy-top : incline de 30 degres, exactement
// comme KAAWA (kaa_board_widget_ClO_Co.py, la boucle sur
// SIDE_NOTATION_COORDS, `Rotate(angle=30, ...)` sur chaque chiffre, jamais
// sur une lettre). Signe INVERSE de KAAWA : KAAWA tourne en Kivy, dont
// l'axe Y pointe vers le HAUT, le SVG a le sien vers le BAS — meme
// principe deja documente dans rendu/ejections.js pour la rotation du
// compteur d'occurrences.
const ROTATION_CHIFFRE_BORD = -30;

// Taille a laquelle on mesure l'encre d'un texte : assez grande pour que
// l'arrondi des mesures du navigateur ne compte pas, puis ramenee a la vraie
// taille par une simple proportion.
const TAILLE_DE_MESURE = 100;
let contexteDeMesure = null;

// Ou se trouve le CENTRE de l'encre d'un texte (le vrai dessin des glyphes,
// pas sa boite de ligne) par rapport a son origine — coin gauche de la ligne
// de base. `text-anchor: middle` et `dominant-baseline: middle` centrent la
// boite, pas les glyphes : signale par saab, les lettres sortaient trop bas
// (leur boite inclut la place des jambages) et les chiffres trop a gauche (le
// "1" a un grand blanc a sa gauche). On mesure donc l'encre reelle, dans la
// police et a la taille que le CSS donne a cet element.
function centreDeLEncre(element, texte) {
  contexteDeMesure ??= document.createElement('canvas').getContext('2d');
  const style = getComputedStyle(element);
  contexteDeMesure.font = `${style.fontWeight} ${TAILLE_DE_MESURE}px ${style.fontFamily}`;
  const mesure = contexteDeMesure.measureText(texte);
  const echelle = parseFloat(style.fontSize) / TAILLE_DE_MESURE;
  return {
    x: ((mesure.actualBoundingBoxRight - mesure.actualBoundingBoxLeft) / 2) * echelle,
    y: ((mesure.actualBoundingBoxDescent - mesure.actualBoundingBoxAscent) / 2) * echelle,
  };
}

// Vecteur unitaire ecran d'un pas dans la direction axiale (q, r).
function axeEcran(q, r) {
  const { x, y } = positionEcran(q, r);
  const longueur = Math.hypot(x, y);
  return { x: x / longueur, y: y / longueur };
}

// Une lettre s'aligne sur sa RANGEE (r constant, q qui varie), un chiffre
// sur sa COLONNE (q constant, r qui varie) — voir positionDansLeCadre.
const AXE_RANGEE = axeEcran(1, 0);
const AXE_COLONNE = axeEcran(0, 1);

// A appeler une seule fois.
function dessinerCoordonneesBord(svg) {
  const cadre = calculerCadrePlateau();
  for (const { q, r, texte } of casesBordDuPlateau()) {
    const estUnChiffre = texte >= '0' && texte <= '9';
    const cote = coteDeLaCoordonnee(q, r, estUnChiffre);
    const centre = positionDansLeCadre(cadre, cote, positionEcran(q, r), estUnChiffre ? AXE_COLONNE : AXE_RANGEE);
    const element = creerElementSVG('text', {
      class: estUnChiffre ? 'coordonnee-bord coordonnee-bord-chiffre' : 'coordonnee-bord',
    });
    element.textContent = texte;
    svg.appendChild(element); // dans le document avant de mesurer : le style calcule en depend
    const encre = centreDeLEncre(element, texte);
    element.setAttribute('x', centre.x - encre.x);
    element.setAttribute('y', centre.y - encre.y);
    // L'inclinaison tourne autour du centre de l'encre, pas de l'origine du texte.
    if (estUnChiffre) element.setAttribute('transform', `rotate(${ROTATION_CHIFFRE_BORD} ${centre.x} ${centre.y})`);
  }
}
