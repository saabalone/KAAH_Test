// La ligne d'un joueur, en haut (Blanc) et en bas (Noir) du plateau : UN groupe
// `#nom-<camp>` fait de
//   - un cadre REMPLI de la couleur des billes du camp (noir ou blanc), centre
//     sur l'axe du plateau, qui porte le NOM du joueur — un clic dessus ouvre
//     sa saisie (interface/noms-joueurs.js). Le nom passe en rouge quand ce
//     camp est en danger ;
//   - a sa GAUCHE, seulement pour le camp qui a la main, un cadre ORANGE
//     ("Tour N", ou "Gagne"/"Nulle" en fin de partie) : le meme orange que les
//     boutons actifs. Il s'ajoute a cote du nom sans jamais le deplacer ;
//     abandon et nulle ont leurs boutons a part, pres du compteur d'ejections
//     (rendu/boutons-fin-piste.js).
// Decoupe de rendu/ejections.js (trop long) : ce fichier ne dessine que cette
// ligne.
//
// Le nom d'une MACHINE (phase 32, saab : « encadrer juste le Nom dans un fond
// vert, pas le btn entier qui reste Noir/Blanc ») : un fond vert (gris quand elle
// est a l'arret) derriere le nom seul, cadre et police inchanges. Son evaluation
// est a cote du compte d'ejections (rendu/evaluation.js) — pas dans le nom sur 2
// lignes, essaye puis abandonne (saab : « mauvaise idee »).
//
// La ligne du joueur du HAUT est retournee de 180 degres en face-a-face : autour
// du point (0, y) de SA ligne et non de son propre centre, sinon l'apparition du
// cadre orange la deplacerait (voir styles.css, `.nom-joueur-en-haut`, et le
// `transform-origin` pose ci-dessous).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG
// (rendu/plateau-svg.js), RAYON_PISTE, HAUTEUR_BANDE, NOM_CAMP,
// SEUIL_ALERTE_EJECTIONS (rendu/ejections.js), centreDeLEncre
// (rendu/coordonnees-bord.js) et creerBoutonsAbandonNulle,
// disposerBoutonsAbandonNulle (rendu/abandon-nulle.js), actualiserBoutonsFinPiste
// (rendu/boutons-fin-piste.js), placeSousLaPendule (rendu/place-options-fin.js) viennent de fichiers
// charges avant celui-ci, ou seulement appeles au demarrage reel (voir la
// note d'ordre en tete de rendu/ejections.js).

const RAYON_COIN_NOM = RAYON_PISTE * 0.5;
const MARGE_X_NOM = RAYON_PISTE * 0.5;
const ECART_TOUR_NOM = RAYON_PISTE * 0.4;
const RETRAIT_FOND_MACHINE = MARGE_X_NOM * 0.7;

function dessinerNomJoueur(svg, camp, y, nom, enHaut) {
  const groupe = creerElementSVG('g', { id: `nom-${camp}`, class: `nom-joueur nom-joueur-${camp}${enHaut ? ' nom-joueur-en-haut' : ''}` });
  groupe.dataset.camp = camp;
  groupe.dataset.y = y;
  groupe.style.transformOrigin = `0px ${y}px`;
  groupe.appendChild(creerElementSVG('rect', { class: 'nom-fond', rx: RAYON_COIN_NOM }));
  groupe.appendChild(creerElementSVG('rect', { class: 'nom-machine-fond', rx: RAYON_COIN_NOM / 2 }));
  const texte = creerElementSVG('text', { class: 'nom-texte' });
  texte.textContent = nom;
  groupe.appendChild(texte);
  groupe.appendChild(creerElementSVG('rect', { class: 'nom-tour-cadre', rx: RAYON_COIN_NOM }));
  const tour = creerElementSVG('text', { class: 'nom-tour' });
  tour.append(creerElementSVG('tspan', { class: 'nom-tour-numero' }), creerElementSVG('tspan', { class: 'nom-tour-options' }));
  groupe.appendChild(tour);
  // Annuler, sur la ligne de chaque joueur (saab, 2026-10-02 : a la place du
  // grand bouton sous le plateau) : interface/saisie.js le relie a Annuler.
  groupe.appendChild(creerBoutonFin('bouton-annuler-joueur', { camp }, 'ANNULER'));
  creerBoutonsAbandonNulle(groupe);
  svg.appendChild(groupe);
  disposerLigneNom(groupe);
}

// Le bouton Annuler de la ligne, du cote des Options de fin (voir
// disposerLigneNom) : a droite du nom, ou a gauche de la ligne du haut
// retournee en face-a-face. Renvoie les nouveaux bords de la ligne.
function poserAnnulerJoueur(groupe, y, { xDroite, xGauche }, aGauche) {
  const annuler = groupe.querySelector('.bouton-annuler-joueur');
  const largeur = poserBoutonFin(annuler, 0, y);
  if (aGauche) {
    poserBoutonFin(annuler, xGauche - ECART_TOUR_NOM - largeur, y);
    return { xDroite, xGauche: xGauche - ECART_TOUR_NOM - largeur };
  }
  poserBoutonFin(annuler, xDroite + ECART_TOUR_NOM, y);
  return { xDroite: xDroite + ECART_TOUR_NOM + largeur, xGauche };
}

// Le camp d'une machine (phase 32, interface/ia.js) : `enMarche` faux quand
// on l'a arretee (boite du nom). `machine` faux : un humain.
function marquerNomMachine(svg, camp, { machine, enMarche = true }) {
  const groupe = svg.querySelector(`#nom-${camp}`);
  groupe.classList.toggle('nom-machine', machine);
  groupe.classList.toggle('machine-arretee', machine && !enMarche);
  disposerLigneNom(groupe);
}

// Change le nom affiche (saisie, interface/noms-joueurs.js).
function afficherNomJoueur(svg, camp, nom) {
  const groupe = svg.querySelector(`#nom-${camp}`);
  ecrireSiChange(groupe.querySelector('.nom-texte'), nom);
  poserStyleDuNom(groupe);
  disposerLigneNom(groupe);
}

// L'abreviation du style d'une machine dans son nom (KAI2_Nor_5s : « Nor »),
// dans la couleur de ses reglages (saab, 2026-10-02 ; moteur/couleurs-profil-ia.js) :
// 'modifie', 'dernier', 'ancien', ou null — rien a colorer, ou un humain.
// Retenue sur le groupe : un nom change ensuite (afficherNomJoueur) la garde.
function colorerStyleDuNom(svg, camp, abreviation, couleur) {
  const groupe = svg.querySelector(`#nom-${camp}`);
  groupe.dataset.abreviation = couleur ? abreviation : '';
  groupe.dataset.couleurStyle = couleur ?? '';
  poserStyleDuNom(groupe);
}

// Un <tspan> autour de l'abreviation : meme police, donc meme largeur — le
// cadre du nom ne bouge pas.
function poserStyleDuNom(groupe) {
  const texte = groupe.querySelector('.nom-texte');
  const nom = texte.textContent;
  const { abreviation, couleurStyle } = groupe.dataset;
  const debut = abreviation ? nom.indexOf(`_${abreviation}_`) + 1 : 0;
  if (debut === 0) {
    if (texte.children.length > 0) texte.textContent = nom;
    return;
  }
  const style = creerElementSVG('tspan', { class: `nom-style-${couleurStyle}` });
  style.textContent = abreviation;
  texte.replaceChildren(nom.slice(0, debut), style, nom.slice(debut + abreviation.length));
}

// Dimensionne et place les cadres d'apres la largeur REELLE des textes : un
// <text> SVG ne la connait qu'une fois affiche, d'ou l'appel apres chaque
// changement de texte. Le cadre du nom est centre sur x = 0 (le milieu du
// plateau). `centreDeLEncre` (rendu/coordonnees-bord.js) centre chaque texte
// verticalement sur son encre reelle, pas sur sa boite de ligne.
function disposerLigneNom(groupe) {
  const y = Number(groupe.dataset.y);
  const texte = groupe.querySelector('.nom-texte');
  const tour = groupe.querySelector('.nom-tour');
  const fond = groupe.querySelector('.nom-fond');
  const cadreTour = groupe.querySelector('.nom-tour-cadre');
  const aTour = tour.textContent !== '';
  // Rien n'a change depuis la derniere disposition ? On ne touche a rien : cette
  // fonction est appelee plusieurs fois par coup, et chaque setAttribute redessine.
  const fondMachine = groupe.querySelector('.nom-machine-fond');
  const machine = groupe.classList.contains('nom-machine');
  const resultat = groupe.classList.contains('resultat-fin');
  const faceAFace = document.body.classList.contains('face-a-face');
  const cle = `${texte.textContent}|${tour.textContent}|${groupe.classList.contains('nom-en-danger')}|${machine}|${resultat}|${faceAFace}`;
  if (groupe.dataset.cle === cle) return;
  groupe.dataset.cle = cle;
  const haut = y - HAUTEUR_BANDE / 2;

  // Un <text> masque (display: none) se mesure a 0 : visible avant de mesurer.
  tour.style.display = '';
  const largeurFond = texte.getComputedTextLength() + MARGE_X_NOM * 2;
  const xFond = -largeurFond / 2;
  fond.setAttribute('x', xFond);
  fond.setAttribute('y', haut);
  fond.setAttribute('width', largeurFond);
  fond.setAttribute('height', HAUTEUR_BANDE);
  texte.setAttribute('x', xFond + MARGE_X_NOM);
  texte.setAttribute('y', y - centreDeLEncre(texte, texte.textContent).y);
  if (machine) {
    // Le fond vert : autour du nom seul, dans le cadre (voir l'en-tete), un peu
    // en retrait (saab, 2026-10-02 : « reduire un peu les cadres verts »).
    fondMachine.setAttribute('x', xFond + RETRAIT_FOND_MACHINE);
    fondMachine.setAttribute('y', haut + RETRAIT_FOND_MACHINE);
    fondMachine.setAttribute('width', largeurFond - RETRAIT_FOND_MACHINE * 2);
    fondMachine.setAttribute('height', HAUTEUR_BANDE - RETRAIT_FOND_MACHINE * 2);
  }

  cadreTour.style.display = aTour ? '' : 'none';
  tour.style.display = aTour ? '' : 'none';
  if (aTour) {
    const largeurCadreTour = tour.getComputedTextLength() + MARGE_X_NOM * 2;
    // « Gagné/Perdu Options » (saab, 2026-10-01 : a gauche du nom, il
    // recouvrait l'evaluation « Fin Gagne... ») : sous la pendule de son camp
    // quand elles sont couchees, a DROITE du nom quand elles sont debout (la
    // bande des noms y est libre, les pendules n'y montent pas).
    const pendulesCouchees = groupe.ownerSVGElement.dataset.pendulesHorizontales === 'oui';
    const place = resultat && pendulesCouchees ? placeSousLaPendule(groupe, largeurCadreTour) : null;
    // En face-a-face, la ligne du haut est retournee : sa gauche est la droite
    // de l'ecran (la ou son joueur la voit a droite de son nom).
    const aDroite = resultat && !pendulesCouchees && !(groupe.classList.contains('nom-joueur-en-haut') && faceAFace);
    const xCadreTour = place ? place.x : aDroite ? xFond + largeurFond + ECART_TOUR_NOM : xFond - ECART_TOUR_NOM - largeurCadreTour;
    const yCadreTour = place ? place.y : haut;
    cadreTour.setAttribute('x', xCadreTour);
    cadreTour.setAttribute('y', yCadreTour);
    cadreTour.setAttribute('width', largeurCadreTour);
    cadreTour.setAttribute('height', HAUTEUR_BANDE);
    tour.setAttribute('x', xCadreTour + MARGE_X_NOM);
    tour.setAttribute('y', yCadreTour + HAUTEUR_BANDE / 2 - centreDeLEncre(tour, tour.textContent).y);
  }
  const pendulesCouchees = groupe.ownerSVGElement.dataset.pendulesHorizontales === 'oui';
  const retourneeEnFaceAFace = groupe.classList.contains('nom-joueur-en-haut') && faceAFace;
  const tourADroite = aTour && resultat && !pendulesCouchees && !retourneeEnFaceAFace;
  const tourAGauche = aTour && !tourADroite && !(resultat && pendulesCouchees);
  const bords = {
    xDroite: tourADroite ? Number(cadreTour.getAttribute('x')) + Number(cadreTour.getAttribute('width')) : xFond + largeurFond,
    xGauche: tourAGauche ? Number(cadreTour.getAttribute('x')) : xFond,
  };
  disposerBoutonsAbandonNulle(groupe, poserAnnulerJoueur(groupe, y, bords, retourneeEnFaceAFace));
}

// Redispose les deux lignes (le face-a-face retourne celle du haut :
// interface/face-a-face.js).
function redisposerLignesNoms(svg) {
  for (const groupe of svg.querySelectorAll('.nom-joueur')) disposerLigneNom(groupe);
}

// Passe le NOM (jamais le cadre) en rouge quand CE camp (pas l'adversaire) a
// lui-meme atteint le seuil de danger.
function actualiserNomJoueur(svg, camp, nombreEjecteesDeCeCamp) {
  const groupe = svg.querySelector(`#nom-${camp}`);
  groupe.classList.toggle('nom-en-danger', nombreEjecteesDeCeCamp >= SEUIL_ALERTE_EJECTIONS);
  disposerLigneNom(groupe); // le rouge est en gras : la largeur change
}

// Le cadre orange ne montre que le camp qui a la main ("Tour N"), ou le
// resultat de la partie :
//   - le camp qui vient de gagner (`gagnant`) : "Gagne" ;
//   - le camp qui a perdu (ejections ou abandon, jamais une nulle) : "Perdu" —
//     meme cadre, meme clic pour ouvrir les Options, mais en ROUGE (styles.css,
//     .perdant) : demande de saab, pour que le perdant puisse lui aussi
//     proposer Revanche/Same/Change, sans devoir passer par le gagnant ;
//   - sinon, le camp au trait (`joueurAuTrait`) : "Tour N" ;
//   - `optionsFin` (phase 20bis) : la partie est finie sur son noeud final, le cadre
//     porte " Options" et ouvre « Fin de partie : Options » (interface/fin-de-partie.js) ;
//   - l'autre camp : rien, pas de cadre orange.
// `joueurAuTrait`/`gagnant` valent chacun 'noir', 'blanc' ou `null` ;
// `gagnant` accepte aussi 'nul' (phase 17, nulle par repetition acceptee) —
// ni l'un ni l'autre camp n'a "gagne" ni "perdu", les DEUX recoivent alors
// "Nulle".
// `actionnable` : la partie est vivante sur la position regardee (les boutons d'abandon
// et de nulle sont alors utilisables).
function actualiserTrait(svg, joueurAuTrait, tour, gagnant, actionnable = false, optionsFin = false) {
  for (const camp of ['noir', 'blanc']) {
    const groupe = svg.querySelector(`#nom-${camp}`);
    const estAuTrait = joueurAuTrait === camp;
    groupe.classList.toggle('au-trait', estAuTrait);
    const perdant = Boolean(gagnant) && gagnant !== 'nul' && gagnant !== camp;
    let numero = '';
    if (gagnant === 'nul') numero = 'Nulle';
    else if (gagnant === camp) numero = 'Gagné';
    else if (perdant) numero = 'Perdu';
    else if (estAuTrait) numero = `Tour ${tour}`;
    ecrireSiChange(groupe.querySelector('.nom-tour-numero'), numero);
    groupe.classList.toggle('perdant', perdant);
    // « Gagné » / « Perdu » / « Nulle » : un resultat, qui doit se voir (saab)
    // — vert et clignotant (rouge pour le perdant, voir .perdant plus haut),
    // avec ou sans « Options ».
    groupe.classList.toggle('resultat-fin', Boolean(gagnant) && numero !== '');
    const suffixe = optionsFin && numero !== '' ? ' Options' : '';
    // « ... Options » attend un geste (Revanche, Same, Change) : vert (ou
    // rouge pour le perdant) comme toute demande en attente (saab).
    groupe.classList.toggle('attend-choix-fin', suffixe !== '');
    ecrireSiChange(groupe.querySelector('.nom-tour-options'), suffixe);
    disposerLigneNom(groupe);
  }
  actualiserBoutonsFinPiste(svg, joueurAuTrait, actionnable);
}
