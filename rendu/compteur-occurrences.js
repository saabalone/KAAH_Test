// Compteur Occ/Ref/Br_Occ/Br_Ref, a la verticale, tout a gauche du
// plateau — comme KAAWA (kaa_board_widget_ClO_Co.py,
// _add_occurrence_label), qui le place a 10 rayons de case a gauche du
// centre du plateau, PIVOTE DE 90 DEGRES pour se lire a la verticale.
// KAAWA n'y affiche qu'Occ et Ref ; Br_Occ/Br_Ref (tout l'arbre explore,
// plutot que seulement la sequence en cours) sont un ajout KAAH, deja
// dans le panneau "Occurrences" (interface/occurrences.js) — ce
// compteur-ci n'est qu'un second affichage des memes 4 chiffres, toujours
// visible, panneau ouvert ou non.
//
// Rotation de -90 (pas +90) : KAAWA tourne en Kivy, ou l'axe Y pointe vers
// le HAUT ; le SVG a son axe Y vers le BAS, donc le sens visuel EQUIVALENT
// est l'angle oppose. Verifie a l'oeil : -90 donne un texte qui se lit de
// BAS EN HAUT, exactement la description de saab.
//
// Un seul <text> persistant, identifiant stable (jamais recree) — dont on
// remplace seulement les <tspan> enfants a chaque rafraichissement.
// Permis ici (CLAUDE.md n'interdit de reconstruire par innerHTML QUE le
// plateau lui-meme, ses cases et ses billes, voir CLAUDE.md et l'en-tete
// de rendu/plateau-svg.js) : ce texte n'anime rien et ne porte aucune
// identite a faire survivre d'un coup a l'autre.
//
// Decoupe de rendu/ejections.js (trop long, CLAUDE.md, la regle des 200
// lignes) : ce fichier ne dessine que ce compteur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG et
// RAYON_CASE viennent de rendu/plateau-svg.js, MARGE_VIEWBOX_CADRE de
// rendu/cadre-plateau.js, tous deux charges avant celui-ci dans index.html.

// Epaisseur du texte une fois pivote (voir plus bas) : approximation de la
// hauteur d'une ligne a 6px (styles.css, .compteur-occurrences-plateau),
// un peu genereuse pour ne jamais serrer les chiffres contre leurs
// marges. Ne depend pas du CONTENU du texte (qui change a chaque coup) :
// pivote de 90 degres, c'est la longueur de la chaine qui devient
// l'etendue VERTICALE (largement absorbee par la hauteur du plateau), pas
// cette epaisseur-la.
const EPAISSEUR_COMPTEUR_OCCURRENCES = RAYON_CASE * 0.8;

// Agrandit le viewBox du plateau vers la GAUCHE pour loger ce texte (meme
// principe qu'agrandirViewBoxPourEjections, qui l'agrandit en haut/bas) et
// renvoie le x ou centrer le texte avant sa rotation.
//
// CORRIGE (saab : "recentrer vers la gauche le plateau de Occ a la case
// e9 ... pour avoir les memes espaces a gauche de Occ et a droite de la
// case e9") : la bande ajoutee ici vaut exactement MARGE + EPAISSEUR DU
// TEXTE + MARGE, ou MARGE est la MEME marge qu'a droite de la case e9
// (rendu/plateau-svg.js, MARGES_HORIZONTALES) — l'espace entre le nouveau
// bord gauche et le texte est donc rigoureusement identique a l'espace
// entre e9 et le bord droit, au lieu d'un centrage approximatif dans une
// bande de largeur arbitraire.
function agrandirViewBoxPourOccurrences(svg) {
  const [xMin, yMin, largeur, hauteur] = svg.getAttribute('viewBox').split(' ').map(Number);
  const marge = MARGE_VIEWBOX_CADRE;
  const largeurBande = marge * 2 + EPAISSEUR_COMPTEUR_OCCURRENCES;
  svg.setAttribute('viewBox', `${xMin - largeurBande} ${yMin} ${largeur + largeurBande} ${hauteur}`);
  return xMin - largeurBande + marge + EPAISSEUR_COMPTEUR_OCCURRENCES / 2;
}

// A appeler une seule fois, juste apres dessinerPistesEjection (et avant
// rendu.fixerProportionsPlateau, qui a besoin du viewBox definitif).
function dessinerCompteurOccurrences(svg) {
  const x = agrandirViewBoxPourOccurrences(svg);
  svg.appendChild(
    creerElementSVG('text', {
      id: 'compteur-occurrences-plateau',
      class: 'compteur-occurrences-plateau',
      x,
      y: 0, // le milieu vertical du plateau (meme y que la case e5, le centre)
      transform: `rotate(-90, ${x}, 0)`,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    })
  );
}

// `valeurs` : { occ, ref, brOcc, brRef }. `seuil` : le seuil de nulle
// (moteur.SEUIL_NULLE_PAR_DEFAUT) au-dela duquel un chiffre passe en bleu
// plutot que jaune — meme convention que KAAWA et que
// .compteur-occurrences-seuil (interface/occurrences.js), applique ICI
// segment par segment (voir styles.css,
// .compteur-occurrences-plateau-seuil) : Occ peut avoir atteint son seuil
// sans que Ref (ou Br_Occ, ou Br_Ref) ait atteint le sien.
function actualiserCompteurOccurrences(svg, valeurs, seuil) {
  const segment = (etiquette, valeur) => {
    const tspan = creerElementSVG('tspan', {});
    if (valeur >= seuil) tspan.setAttribute('class', 'compteur-occurrences-plateau-seuil');
    tspan.textContent = `${etiquette}.: ${valeur}`;
    return tspan;
  };
  svg.querySelector('#compteur-occurrences-plateau').replaceChildren(
    segment('Occ', valeurs.occ),
    document.createTextNode('  ('),
    segment('Ref', valeurs.ref),
    document.createTextNode(')   '),
    segment('Br_Occ', valeurs.brOcc),
    document.createTextNode('  ('),
    segment('Br_Ref', valeurs.brRef),
    document.createTextNode(')')
  );
}
