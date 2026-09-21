// Les boutons d'abandon et de nulle, dessines DANS la ligne du joueur
// (rendu/ligne-joueur.js) — donc retournes avec elle en face-a-face, sans
// aucun calcul de plus. Ce fichier ne fait que dessiner ; quand les montrer et
// quoi faire d'un clic est dans interface/abandon-nulle.js.
//
//   - LES DEUX CHOIX ("Nulle", "Abandonner") apparaissent a droite du nom du
//     camp au trait quand on clique sur son cadre orange "Tour N A/N" ;
//   - LA CONFIRMATION recouvre la ligne de celui qui doit repondre dans un
//     cadre vert, avec deux boutons gris "Valider" et "Refuser". Pour un
//     abandon, c'est celui qui abandonne ; pour une nulle, c'est
//     l'ADVERSAIRE de celui qui la propose — sa ligne, donc, qui est retournee
//     vers lui en face-a-face (saab).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG
// (rendu/plateau-svg.js), RAYON_PISTE, HAUTEUR_BANDE (rendu/ejections.js) et
// centreDeLEncre (rendu/coordonnees-bord.js) viennent de fichiers charges
// avant celui-ci, ou seulement appeles au demarrage reel.

const MARGE_X_BOUTON_FIN = RAYON_PISTE * 0.6;
const ECART_BOUTON_FIN = RAYON_PISTE * 0.4;
const RAYON_COIN_BOUTON_FIN = RAYON_PISTE * 0.4;

// Un bouton = un rectangle et son texte, dans un <g> cliquable.
function creerBoutonFin(classe, donnees, libelle) {
  const bouton = creerElementSVG('g', { class: classe });
  Object.assign(bouton.dataset, donnees);
  bouton.appendChild(creerElementSVG('rect', { class: `${classe}-fond`, rx: RAYON_COIN_BOUTON_FIN }));
  const texte = creerElementSVG('text', { class: `${classe}-texte` });
  texte.textContent = libelle;
  bouton.appendChild(texte);
  return bouton;
}

// Cree, masques, les deux choix et la confirmation de la ligne `groupe`.
function creerBoutonsAbandonNulle(groupe) {
  const choix = creerElementSVG('g', { class: 'choix-fin' });
  choix.append(
    creerBoutonFin('option-fin', { action: 'nulle' }, 'Nulle'),
    creerBoutonFin('option-fin', { action: 'abandon' }, 'Abandonner')
  );
  choix.style.display = 'none';

  const confirmation = creerElementSVG('g', { class: 'confirmation-fin' });
  confirmation.appendChild(creerElementSVG('rect', { class: 'confirmation-fond', rx: RAYON_COIN_BOUTON_FIN }));
  confirmation.appendChild(creerElementSVG('text', { class: 'confirmation-question' }));
  confirmation.append(
    creerBoutonFin('confirmation-bouton', { reponse: 'valider' }, 'Valider'),
    creerBoutonFin('confirmation-bouton', { reponse: 'refuser' }, 'Refuser')
  );
  confirmation.style.display = 'none';

  groupe.append(choix, confirmation);
}

// Pose un bouton a `x` (bord gauche) sur la ligne `y` et renvoie sa largeur.
// Le texte est mesure VISIBLE (voir disposerLigneNom).
function poserBoutonFin(bouton, x, y) {
  const texte = bouton.querySelector('text');
  const largeur = texte.getComputedTextLength() + MARGE_X_BOUTON_FIN * 2;
  const haut = y - HAUTEUR_BANDE / 2;
  const fond = bouton.querySelector('rect');
  fond.setAttribute('x', x);
  fond.setAttribute('y', haut);
  fond.setAttribute('width', largeur);
  fond.setAttribute('height', HAUTEUR_BANDE);
  texte.setAttribute('x', x + MARGE_X_BOUTON_FIN);
  texte.setAttribute('y', y - centreDeLEncre(texte, texte.textContent).y);
  return largeur;
}

// Range les deux choix a droite du cadre du nom. `xDroite` : bord droit du
// cadre du nom. `xGauche` : bord gauche de ce qu'il faut recouvrir (le cadre
// orange s'il existe).
function disposerBoutonsAbandonNulle(groupe, { xDroite, xGauche }) {
  const y = Number(groupe.dataset.y);
  groupe.dataset.xDroite = xDroite;
  groupe.dataset.xGauche = xGauche;

  const choix = groupe.querySelector('.choix-fin');
  if (choix.style.display !== 'none') {
    let x = xDroite + ECART_BOUTON_FIN;
    for (const option of choix.children) x += poserBoutonFin(option, x, y) + ECART_BOUTON_FIN;
  }

  const confirmation = groupe.querySelector('.confirmation-fin');
  if (confirmation.style.display !== 'none') disposerConfirmation(groupe, confirmation, y);
}

// Le cadre vert recouvre toute la ligne (nom et cadre orange compris), centre
// sur le milieu du plateau, et au moins assez large pour la question et les
// deux boutons.
function disposerConfirmation(groupe, confirmation, y) {
  const question = confirmation.querySelector('.confirmation-question');
  const [valider, refuser] = confirmation.querySelectorAll('.confirmation-bouton');
  const largeurRefuser = refuser.querySelector('text').getComputedTextLength() + MARGE_X_BOUTON_FIN * 2;
  const largeurValider = valider.querySelector('text').getComputedTextLength() + MARGE_X_BOUTON_FIN * 2;
  const necessaire =
    MARGE_X_BOUTON_FIN + question.getComputedTextLength() + ECART_BOUTON_FIN * 2 + largeurValider + ECART_BOUTON_FIN + largeurRefuser + MARGE_X_BOUTON_FIN;
  const moitie = Math.max(necessaire / 2, -Number(groupe.dataset.xGauche), Number(groupe.dataset.xDroite));

  const fond = confirmation.querySelector('.confirmation-fond');
  fond.setAttribute('x', -moitie);
  fond.setAttribute('y', y - HAUTEUR_BANDE / 2);
  fond.setAttribute('width', moitie * 2);
  fond.setAttribute('height', HAUTEUR_BANDE);
  question.setAttribute('x', -moitie + MARGE_X_BOUTON_FIN);
  question.setAttribute('y', y - centreDeLEncre(question, question.textContent).y);

  // Refuser tout a droite, Valider juste avant.
  const xRefuser = moitie - MARGE_X_BOUTON_FIN - largeurRefuser;
  poserBoutonFin(refuser, xRefuser, y);
  poserBoutonFin(valider, xRefuser - ECART_BOUTON_FIN - largeurValider, y);
}

// Montre ou cache les deux choix ("Nulle", "Abandonner") de la ligne de `camp`.
function afficherChoixFin(svg, camp, visible) {
  const groupe = svg.querySelector(`#nom-${camp}`);
  groupe.querySelector('.choix-fin').style.display = visible ? '' : 'none';
  if (visible) {
    disposerBoutonsAbandonNulle(groupe, { xDroite: Number(groupe.dataset.xDroite), xGauche: Number(groupe.dataset.xGauche) });
  }
}

// Recouvre la ligne de `camp` du cadre vert de confirmation, avec `question`.
function afficherConfirmationFin(svg, camp, question) {
  const groupe = svg.querySelector(`#nom-${camp}`);
  const confirmation = groupe.querySelector('.confirmation-fin');
  confirmation.querySelector('.confirmation-question').textContent = question;
  confirmation.style.display = '';
  disposerBoutonsAbandonNulle(groupe, { xDroite: Number(groupe.dataset.xDroite), xGauche: Number(groupe.dataset.xGauche) });
}

// Cache tout : choix et confirmation, sur les deux lignes.
function masquerBoutonsFin(svg) {
  for (const element of svg.querySelectorAll('.choix-fin, .confirmation-fin')) element.style.display = 'none';
}
