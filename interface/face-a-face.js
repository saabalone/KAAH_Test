// Mode FACE-A-FACE (phase 20) : deux joueurs de chaque cote d'un telephone
// pose a plat. Corrige par saab (PLAN.md, phase 20) : le PLATEAU ne tourne
// JAMAIS en cours de partie — seuls s'orientent le nom de chaque joueur et
// les coordonnees des billes/cases jouables (rendu/coordonnees-jeu.js),
// lisibles depuis le cote du joueur concerne.
//
// REGLE DE LECTURE VERTICALE (saab, "c'est quand meme logique") : ce qui est
// a GAUCHE du plateau se lit de BAS en HAUT, ce qui est a DROITE de HAUT en
// BAS. Compteurs d'ejection, compteur Occ et icones de la colonne de gauche :
// -90 degres. Pendules et fenetres (Sequence, Commentaires, Conseils,
// Occurrences...) : +90. La barre de navigation, elle, se pose au milieu du
// plateau (Annuler pile a son centre) pour que les deux joueurs aient la
// meme distance a parcourir. Une premiere version RETOURNAIT les fenetres a
// 180 degres vers le joueur au trait ; abandonnee (saab) : le retournement
// faisait bouger le plateau et emportait les poignees.
//
// UN SEUL bouton, un seul interrupteur : le mode est automatique de bout en
// bout. Tout passe par une classe sur <body> (`face-a-face`) que styles.css
// exploite : aucune orientation n'est calculee ici. En mode face-a-face
// l'ecran se fixe en PAYSAGE (reponse de saab), dans la mesure ou le
// navigateur le permet : `screen.orientation.lock` n'existe pas sur
// iOS/Safari et n'est accepte ailleurs qu'en plein ecran — jamais une erreur
// si c'est refuse, le mode fonctionne quand meme.
//
// Retenu dans localStorage pour survivre a un rechargement.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : replacerNavigation
// (interface/disposition.js) et HAUTEUR_BOUTON_PENDULE (rendu/pendule.js)
// viennent de fichiers charges avant celui-ci dans index.html.

const CLE_FACE_A_FACE = 'kaah-face-a-face';

let boutonFaceAFace = null;
let faceAFaceActif = false;

function lireFaceAFace() {
  try {
    return window.localStorage.getItem(CLE_FACE_A_FACE) === '1';
  } catch {
    return false; // stockage indisponible : jamais un plantage pour un reglage
  }
}

function ecrireFaceAFace(valeur) {
  try {
    window.localStorage.setItem(CLE_FACE_A_FACE, valeur ? '1' : '0');
  } catch {
    // Tant pis : meme philosophie qu'interface/sauvegarde.js.
  }
}

// Deux rapports que styles.css ne peut pas connaitre tout seul, lus sur le
// viewBox du plateau (le dessin est deja termine quand ce fichier demarre) :
//   - largeur / hauteur du plateau, pour que les fenetres de droite prennent
//     TOUT l'espace libre jusqu'a la barre de navigation (le plateau, lui, a
//     toute la hauteur de l'ecran et sa largeur s'en deduit) ;
//   - epaisseur d'une pendule / hauteur du plateau : la barre de navigation
//     prend la meme epaisseur que les pendules (demande de saab).
function poserProportionsPlateau() {
  const svg = document.getElementById('plateau');
  const [, , largeur, hauteur] = svg.getAttribute('viewBox').split(' ').map(Number);
  const racine = document.documentElement.style;
  racine.setProperty('--rapport-plateau', largeur / hauteur);
  racine.setProperty('--rapport-pendule', HAUTEUR_BOUTON_PENDULE / hauteur);
}

// Reporte l'etat sur <body> (classe lue par styles.css) et sur le bouton
// (orange quand actif, comme les autres boutons bascule), puis replace la
// barre de navigation : au milieu du plateau en face-a-face, a sa place
// habituelle sinon.
function afficherFaceAFace() {
  poserProportionsPlateau();
  document.body.classList.toggle('face-a-face', faceAFaceActif);
  boutonFaceAFace?.classList.toggle('bouton-actif', faceAFaceActif);
  replacerNavigation();
}

// Fixe (ou libere) l'ecran en paysage — voir l'en-tete du fichier. Seulement
// sur un ecran tactile : sur ordinateur, `lock` exige le plein ecran, et
// plein ecran par surprise serait pire que pas de verrou.
function verrouillerPaysage(verrouiller) {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  const orientation = screen.orientation;
  if (!orientation) return;
  if (verrouiller) {
    Promise.resolve(document.documentElement.requestFullscreen?.())
      .then(() => orientation.lock?.('landscape'))
      .catch(() => {});
  } else {
    orientation.unlock?.();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }
}

// Retient sur <body> le camp qui a le trait : styles.css s'en sert pour
// retourner les libelles du menu deploye vers Blanc quand c'est lui qui joue.
// Aucun effet hors face-a-face. Une partie terminee (`null`) garde le dernier
// camp connu.
function signalerCampAuTrait(joueurAuTrait) {
  if (joueurAuTrait) document.body.classList.toggle('trait-blanc', joueurAuTrait === 'blanc');
}

function demarrerFaceAFace(bouton) {
  boutonFaceAFace = bouton;
  faceAFaceActif = lireFaceAFace();
  afficherFaceAFace();
  bouton.addEventListener('click', () => {
    faceAFaceActif = !faceAFaceActif;
    ecrireFaceAFace(faceAFaceActif);
    verrouillerPaysage(faceAFaceActif);
    afficherFaceAFace();
  });
}
