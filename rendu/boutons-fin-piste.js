// Les boutons « Abandonner » et « Nulle » PERMANENTS de chaque joueur (demande de
// saab), de part et d'autre de son compteur d'ejections : deux petits carres a peu
// pres de la taille d'une icone. Pas la place d'ecrire « Abandonner » dans ce coin :
// un DESSIN a la place du mot — un drapeau blanc pour abandonner, « = » (le signe de
// la nulle aux echecs) pour proposer nulle. Le sens de chaque dessin se decouvre en
// appuyant : la confirmation verte qui suit dit « Abandonner ? » ou « Nulle ? » et
// ne fait rien sans « Valider ».
//
// Abandonner est TOUJOURS a l'exterieur (a gauche, du cote de la barre d'icones) et Nulle
// vers l'interieur, pour les deux joueurs (saab). En face-a-face, chaque bouton du joueur
// du HAUT pivote de 180 degres SUR LUI-MEME (styles.css, `.boutons-fin-piste-en-haut`) :
// il garde sa place et se lit a l'endroit pour lui, jamais a la verticale. Abandonner est
// rouge, Nulle bleue.
//
// Ce fichier ne fait que dessiner et griser ; le deroulement (confirmation, fin de
// la partie) est dans interface/abandon-nulle.js. Les boutons ne dessinent rien de
// la regle : seul le camp au trait peut abandonner (KAAWA, action_resign : le fichier
// ne sait ecrire qu'un abandon de celui qui a la main, moteur/sauvegarde.js,
// ecrireVainqueur), alors que proposer nulle est permis a tout moment.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG
// (rendu/plateau-svg.js) et RAYON_PISTE (rendu/ejections.js) viennent de fichiers
// charges avant celui-ci, ou seulement appeles au demarrage reel (voir la note
// d'ordre en tete de rendu/ejections.js).

const COTE_BOUTON_FIN_PISTE = RAYON_PISTE * 3;
// Demi-largeur du chiffre du compteur (`.nombre-ejecte`, 14px) et vide entre lui et
// chaque bouton.
const DEMI_LARGEUR_COMPTE = RAYON_PISTE * 1.1;
const ECART_BOUTON_FIN_PISTE = RAYON_PISTE * 0.6;
const RAYON_COIN_BOUTON_FIN_PISTE = RAYON_PISTE * 0.4;

// Le dessin d'un bouton, dans un carre de COTE_BOUTON_FIN_PISTE dont (x, y) est le
// coin haut-gauche. Mesures en douziemes du cote.
function dessinerIconeFin(action, x, y) {
  const douzieme = COTE_BOUTON_FIN_PISTE / 12;
  const classe = 'bouton-fin-piste-dessin';
  if (action === 'nulle') {
    return [4, 7].map((haut) =>
      creerElementSVG('rect', { class: classe, x: x + douzieme * 2.5, y: y + douzieme * haut - douzieme * 0.7, width: douzieme * 7, height: douzieme * 1.4 })
    );
  }
  return [
    creerElementSVG('rect', { class: classe, x: x + douzieme * 3, y: y + douzieme * 2, width: douzieme * 1.1, height: douzieme * 8 }),
    creerElementSVG('path', {
      class: classe,
      d: `M ${x + douzieme * 4.1} ${y + douzieme * 2} L ${x + douzieme * 10} ${y + douzieme * 4.5} L ${x + douzieme * 4.1} ${y + douzieme * 7} Z`,
    }),
  ];
}

function creerBoutonFinPiste(camp, action, x, y, nom) {
  const bouton = creerElementSVG('g', { class: 'bouton-fin-piste', role: 'button', 'aria-label': nom });
  // Le point autour duquel styles.css retourne le bouton : son centre.
  bouton.style.transformOrigin = `${x + COTE_BOUTON_FIN_PISTE / 2}px ${y + COTE_BOUTON_FIN_PISTE / 2}px`;
  bouton.dataset.camp = camp;
  bouton.dataset.action = action;
  const titre = creerElementSVG('title', {});
  titre.textContent = nom;
  bouton.append(
    titre,
    creerElementSVG('rect', {
      class: 'bouton-fin-piste-fond',
      x,
      y,
      width: COTE_BOUTON_FIN_PISTE,
      height: COTE_BOUTON_FIN_PISTE,
      rx: RAYON_COIN_BOUTON_FIN_PISTE,
    }),
    ...dessinerIconeFin(action, x, y)
  );
  return bouton;
}

// Pose les deux boutons du joueur `camp` de part et d'autre de son compteur
// (`compte` : { x, y }, le centre du chiffre, voir disposerPisteTriangle). Abandonner
// a gauche, Nulle a droite.
function dessinerBoutonsFinPiste(svg, camp, compte, enHaut) {
  const groupe = creerElementSVG('g', {
    class: `boutons-fin-piste${enHaut ? ' boutons-fin-piste-en-haut' : ''}`,
  });
  const y = compte.y - COTE_BOUTON_FIN_PISTE / 2;
  groupe.append(
    creerBoutonFinPiste(camp, 'abandon', compte.x - DEMI_LARGEUR_COMPTE - ECART_BOUTON_FIN_PISTE - COTE_BOUTON_FIN_PISTE, y, 'Abandonner'),
    creerBoutonFinPiste(camp, 'nulle', compte.x + DEMI_LARGEUR_COMPTE + ECART_BOUTON_FIN_PISTE, y, 'Nulle')
  );
  svg.appendChild(groupe);
}

// Grise ce qui n'est pas possible maintenant : tout quand la partie est finie ou
// qu'on regarde une position passee (`actionnable` faux) ; l'abandon de celui qui
// n'a pas la main. A appeler apres chaque coup (rendu/ligne-joueur.js,
// actualiserTrait).
function actualiserBoutonsFinPiste(svg, joueurAuTrait, actionnable) {
  for (const bouton of svg.querySelectorAll('.bouton-fin-piste')) {
    const possible = actionnable && (bouton.dataset.action === 'nulle' || bouton.dataset.camp === joueurAuTrait);
    bouton.classList.toggle('bouton-fin-piste-inactif', !possible);
  }
}
