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
// (rendu/boutons-fin-piste.js) viennent de fichiers
// charges avant celui-ci, ou seulement appeles au demarrage reel (voir la
// note d'ordre en tete de rendu/ejections.js).

const RAYON_COIN_NOM = RAYON_PISTE * 0.5;
const MARGE_X_NOM = RAYON_PISTE * 0.5;
const ECART_TOUR_NOM = RAYON_PISTE * 0.4;

function dessinerNomJoueur(svg, camp, y, nom, enHaut) {
  const groupe = creerElementSVG('g', { id: `nom-${camp}`, class: `nom-joueur nom-joueur-${camp}${enHaut ? ' nom-joueur-en-haut' : ''}` });
  groupe.dataset.camp = camp;
  groupe.dataset.y = y;
  groupe.style.transformOrigin = `0px ${y}px`;
  groupe.appendChild(creerElementSVG('rect', { class: 'nom-fond', rx: RAYON_COIN_NOM }));
  const texte = creerElementSVG('text', { class: 'nom-texte' });
  texte.textContent = nom;
  groupe.appendChild(texte);
  groupe.appendChild(creerElementSVG('rect', { class: 'nom-tour-cadre', rx: RAYON_COIN_NOM }));
  const tour = creerElementSVG('text', { class: 'nom-tour' });
  tour.append(creerElementSVG('tspan', { class: 'nom-tour-numero' }), creerElementSVG('tspan', { class: 'nom-tour-options' }));
  groupe.appendChild(tour);
  creerBoutonsAbandonNulle(groupe);
  svg.appendChild(groupe);
  disposerLigneNom(groupe);
}

// Change le nom affiche (saisie, interface/noms-joueurs.js).
function afficherNomJoueur(svg, camp, nom) {
  const groupe = svg.querySelector(`#nom-${camp}`);
  ecrireSiChange(groupe.querySelector('.nom-texte'), nom);
  disposerLigneNom(groupe);
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
  const cle = `${texte.textContent}|${tour.textContent}|${groupe.classList.contains('nom-en-danger')}`;
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

  cadreTour.style.display = aTour ? '' : 'none';
  tour.style.display = aTour ? '' : 'none';
  if (aTour) {
    const largeurCadreTour = tour.getComputedTextLength() + MARGE_X_NOM * 2;
    const xCadreTour = xFond - ECART_TOUR_NOM - largeurCadreTour;
    cadreTour.setAttribute('x', xCadreTour);
    cadreTour.setAttribute('y', haut);
    cadreTour.setAttribute('width', largeurCadreTour);
    cadreTour.setAttribute('height', HAUTEUR_BANDE);
    tour.setAttribute('x', xCadreTour + MARGE_X_NOM);
    tour.setAttribute('y', y - centreDeLEncre(tour, tour.textContent).y);
  }
  disposerBoutonsAbandonNulle(groupe, { xDroite: xFond + largeurFond, xGauche: aTour ? Number(cadreTour.getAttribute('x')) : xFond });
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
//   - sinon, le camp au trait (`joueurAuTrait`) : "Tour N" ;
//   - `optionsFin` (phase 20bis) : la partie est finie sur son noeud final, le cadre
//     porte " Options" et ouvre « Fin de partie : Options » (interface/fin-de-partie.js) ;
//   - l'autre camp : rien, pas de cadre orange.
// `joueurAuTrait`/`gagnant` valent chacun 'noir', 'blanc' ou `null` ;
// `gagnant` accepte aussi 'nul' (phase 17, nulle par repetition acceptee) —
// ni l'un ni l'autre camp n'a "gagne", les DEUX recoivent alors "Nulle".
// `actionnable` : la partie est vivante sur la position regardee (les boutons d'abandon
// et de nulle sont alors utilisables).
function actualiserTrait(svg, joueurAuTrait, tour, gagnant, actionnable = false, optionsFin = false) {
  for (const camp of ['noir', 'blanc']) {
    const groupe = svg.querySelector(`#nom-${camp}`);
    const estAuTrait = joueurAuTrait === camp;
    groupe.classList.toggle('au-trait', estAuTrait);
    let numero = '';
    if (gagnant === 'nul') numero = 'Nulle';
    else if (gagnant === camp) numero = 'Gagné';
    else if (estAuTrait) numero = `Tour ${tour}`;
    ecrireSiChange(groupe.querySelector('.nom-tour-numero'), numero);
    // « Gagné » / « Nulle » : un resultat, qui doit se voir (saab) — vert et
    // clignotant (styles.css), avec ou sans « Options ».
    groupe.classList.toggle('resultat-fin', Boolean(gagnant) && numero !== '');
    const suffixe = optionsFin && numero !== '' ? ' Options' : '';
    // « Gagné Options » / « Nulle Options » attend un geste (Revanche, Same, Change) :
    // vert comme toute demande en attente (saab).
    groupe.classList.toggle('attend-choix-fin', suffixe !== '');
    ecrireSiChange(groupe.querySelector('.nom-tour-options'), suffixe);
    disposerLigneNom(groupe);
  }
  actualiserBoutonsFinPiste(svg, joueurAuTrait, actionnable);
}
