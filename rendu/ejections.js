// Ce qui entoure le plateau : noms des joueurs et indicateur de trait (ici),
// pistes des billes ejectees avec leur compte (rendu/pistes-triangle.js) et
// pendules (rendu/pendule.js) — comme dans KAAWA (verifie directement dans
// kaa_board_widget_ClO_Co.py, le bloc count_b_label/count_w_label), mais
// REDISPOSE a la demande de saab pour rendre de la place au plateau :
//   - une seule ligne par joueur, sur sa propre bande fine (rendu/ligne-joueur.js) : un cadre gris
//     (celui du plateau) qui porte "(Noir) <nom>" ou "(Blanc) <nom>" pour
//     qu'on sache lequel sans avoir a se souvenir du cote. Le camp reste a
//     la couleur de ses billes ; seul le NOM passe en rouge quand CE camp
//     (pas l'autre) a lui-meme 5 billes ejectees (voir .nom-en-danger). Le
//     camp au trait a en plus, a gauche, un cadre ORANGE "Tour N" (comme un
//     bouton actif) — plus de bandeau #statut separe pour ca (saab l'a
//     demande, pour rendre cette hauteur au plateau) ; le camp qui a gagne
//     y lit "Gagne" une fois la partie terminee.
//     KAAWA permet de personnaliser ce nom (saisie non implementee ici —
//     voir JOURNAL, une phase ulterieure s'en chargera) ; par defaut,
//     "Joueur 1" (Noir) et "Joueur 2" (Blanc), comme les fichiers de
//     KAAWA (`Player_1`, `Player_2`).
//   - les pistes et leur compte, dans les coins VIDES a gauche de
//     l'hexagone, les pendules (verticales) dans ceux de droite.
//
// Convention KAAH pour la position (KAAWA la fait dependre de la rotation
// de l'ecran, phase 20) : Noir joue en bas, Blanc en haut, comme le reste du
// plateau — donc la piste des billes BLANCHES (trophees de Noir) est en bas,
// celle des billes NOIRES (trophees de Blanc) en haut.
//
// Non repris ici (delibere, voir CLAUDE.md/JOURNAL) : les lignes d'info
// bonus/delai que KAAWA affiche pres de chaque pendule (phase 22,
// reglages).
//
// Compteur Occ/Ref/Br_Occ/Br_Ref (phase 18, correctif) : voir
// dessinerCompteurOccurrences/actualiserCompteurOccurrences plus bas.
//
// Cases et textes persistants a identifiant stable (memes principes que
// les billes, voir rendu/plateau-svg.js) : actualiserPistesEjection et
// actualiserTrait ne font que changer des classes CSS ou du texte, jamais
// reconstruire.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG et
// RAYON_CASE viennent de rendu/plateau-svg.js, EJECTIONS_POUR_GAGNER de
// moteur/partie.js, calculerCadrePlateau de rendu/cadre-plateau.js, tous
// charges avant celui-ci dans index.html. Exception a l'ordre habituel :
// dessinerPistesEjection appelle dessinerPendule (rendu/pendule.js) et
// disposerPisteTriangle/dessinerPisteTriangle (rendu/pistes-triangle.js),
// charges APRES celui-ci — sans consequence, cet appel n'a lieu qu'au
// demarrage reel (index.html), bien apres que tous les scripts aient fini
// de se charger ; seul un appel AU CHARGEMENT du fichier (hors d'une
// fonction) exigerait l'ordre inverse.

const RAYON_PISTE = RAYON_CASE * 0.4;
// Bande de nom au-dessus et en dessous du plateau : UNE seule ligne
// ("(Camp) Joueur"), plus rien d'autre — pistes et pendules ont quitte ces
// bandes pour les coins vides de l'hexagone (rendu/pistes-triangle.js,
// rendu/pendule.js), ce qui rend de la hauteur au plateau.
const HAUTEUR_BANDE = RAYON_PISTE * 2.6;
const SEUIL_ALERTE_EJECTIONS = EJECTIONS_POUR_GAGNER - 1; // 5 : plus qu'une ejection avant la defaite

const NOM_CAMP = { noir: 'Noir', blanc: 'Blanc' };

// Agrandit le viewBox du plateau pour faire de la place a la ligne de nom,
// en haut et en bas, et renvoie ou la poser ainsi que les limites du
// plateau AVANT cet agrandissement (les coins vides, eux, sont dedans).
function agrandirViewBoxPourNoms(svg) {
  const [xMin, yMin, largeur, hauteur] = svg.getAttribute('viewBox').split(' ').map(Number);
  svg.setAttribute('viewBox', `${xMin} ${yMin - HAUTEUR_BANDE} ${largeur} ${hauteur + HAUTEUR_BANDE * 2}`);
  return {
    limites: { xMin, yMin, xMax: xMin + largeur, yMax: yMin + hauteur },
    yNomHaut: yMin - HAUTEUR_BANDE / 2,
    yNomBas: yMin + hauteur + HAUTEUR_BANDE / 2,
  };
}

// Dessine ce qui entoure le plateau : les deux triangles d'ejection et leur
// compteur (coins de gauche), les deux pendules verticales (coins de
// droite), et les deux lignes de nom. A appeler une seule fois, juste apres
// dessinerCoordonneesBord. `noms` : { noir, blanc }, facultatif.
//
// `campDuHaut` : le camp assis en haut — Blanc d'habitude ; Noir apres une Revanche
// en face-a-face (plateau retourne, rendu/plateau-svg.js, orienterPlateau). Les
// pendules, pistes et noms ne bougent PAS quand le plateau se retourne (saab : une
// pendule ne doit jamais se retrouver du cote des icones) ; ce sont les camps qui
// changent de place.
// Trophees d'un joueur = les billes de la couleur ADVERSE qu'il a ejectees : la
// piste du haut est donc celle des billes du camp du bas, et inversement.
function dessinerPistesEjection(svg, noms = NOMS_PAR_DEFAUT, campDuHaut = 'blanc') {
  const { limites, yNomHaut, yNomBas } = agrandirViewBoxPourNoms(svg);
  const cadre = calculerCadrePlateau();
  const campDuBas = campDuHaut === 'blanc' ? 'noir' : 'blanc';

  const dispositionHaut = disposerPisteTriangle(cadre, limites, true);
  dessinerPisteTriangle(svg, campDuBas, dispositionHaut);
  dessinerBoutonsFinPiste(svg, campDuHaut, dispositionHaut.compte, true);
  dessinerPendule(svg, campDuHaut, positionPendule(limites, true));
  dessinerNomJoueur(svg, campDuHaut, yNomHaut, noms[campDuHaut], true);

  const dispositionBas = disposerPisteTriangle(cadre, limites, false);
  dessinerPisteTriangle(svg, campDuHaut, dispositionBas);
  dessinerBoutonsFinPiste(svg, campDuBas, dispositionBas.compte, false);
  dessinerPendule(svg, campDuBas, positionPendule(limites, false));
  dessinerNomJoueur(svg, campDuBas, yNomBas, noms[campDuBas], false);
}

// La ligne de chaque joueur (nom, cadre "Tour N", abandon/nulle) vit dans
// rendu/ligne-joueur.js ; ici, seulement l'appel commun apres chaque coup.
// A appeler a chaque changement d'etat (voir interface/saisie.js,
// actualiserAffichagePartie), avec les compteurs de l'etat courant.
function actualiserPistesEjection(svg, billesEjecteesNoires, billesEjecteesBlanches) {
  actualiserUnePiste(svg, 'noir', billesEjecteesNoires);
  actualiserUnePiste(svg, 'blanc', billesEjecteesBlanches);
  actualiserNomJoueur(svg, 'noir', billesEjecteesNoires);
  actualiserNomJoueur(svg, 'blanc', billesEjecteesBlanches);
}

// dessinerPendule vit maintenant dans rendu/pendule.js (correctif phase 15 :
// cadre-bouton cliquable + grand bouton rond de pause, assez pour justifier
// son propre fichier — voir CLAUDE.md, la regle des 200 lignes).

// Remplit les `nombreEjectees` premieres cases de la piste `couleur`,
// ecrit le meme compte en toutes lettres a cote (voir dessinerNombreEjecte)
// et bascule l'alerte au seuil (voir SEUIL_ALERTE_EJECTIONS).
function actualiserUnePiste(svg, couleur, nombreEjectees) {
  const enAlerte = nombreEjectees >= SEUIL_ALERTE_EJECTIONS;
  for (let i = 0; i < EJECTIONS_POUR_GAGNER; i++) {
    const cercle = svg.querySelector(`#piste-${couleur}-${i}`);
    cercle.classList.toggle('piste-remplie', i < nombreEjectees);
    svg.querySelector(`#piste-anneau-${couleur}-${i}`).classList.toggle('piste-alerte', enAlerte);
  }
  ecrireCompteEjections(svg.querySelector(`#nombre-${couleur}`), nombreEjectees);
}

// Le compte est un SCORE : le nombre de billes que le camp qui possede la piste
// a ejectees (saab). Chiffres centres sur leur encre reelle, sur le milieu voulu.
function ecrireCompteEjections(texte, nombreEjectees) {
  if (texte.dataset.valeur === String(nombreEjectees)) return; // rien de change : pas de redessin
  texte.dataset.valeur = nombreEjectees;
  texte.textContent = String(nombreEjectees);
  texte.setAttribute('y', Number(texte.dataset.milieuY) - centreDeLEncre(texte, texte.textContent).y);
}

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
