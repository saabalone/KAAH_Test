// Lecture de la sequence (phase 31, saab, 2026-09-30) : « le btn Play jouera
// automatiquement les coups de la sequence (avec demande de choix Branche s'il
// y a une branche), le btn Pause arrete la sequence ». Un coup par
// DELAI_LECTURE_MS, par le meme chemin que « Coup suivant » (interface/
// saisie.js) : a un embranchement, la lecture s'arrete et demande la branche,
// puis reprend depuis celle choisie.
//
// Toute autre navigation l'arrete (on a touche un coup, joue une branche...) :
// elle le voit au chemin, qui n'est plus celui ou elle a laisse la partie —
// sans avoir a se brancher sur chaque bouton.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const DELAI_LECTURE_MS = 1000;
// ︎ : forme texte, jamais l'emoji que certains telephones dessinent.
const SYMBOLE_LECTURE = '▶︎';
const SYMBOLE_PAUSE = '❚❚';

// `bouton` : #nav-lecture. `partie` : { peutAvancer(), avancer() — renvoie
// 'avance', ou 'choix' quand un embranchement demande la branche —,
// cheminActuel() (un texte) }.
function demarrerLectureSequence(bouton, partie) {
  let minuteur = null;
  let cheminLaisse = null;

  function afficher() {
    bouton.textContent = minuteur ? SYMBOLE_PAUSE : SYMBOLE_LECTURE;
    bouton.title = minuteur ? 'Pause : arrêter la lecture' : 'Lecture : jouer la séquence coup après coup';
    bouton.classList.toggle('bouton-actif', minuteur !== null);
  }

  function arreter() {
    clearInterval(minuteur);
    minuteur = null;
    afficher();
  }

  function pas() {
    if (partie.cheminActuel() !== cheminLaisse || !partie.peutAvancer()) return arreter();
    if (partie.avancer() === 'choix') return arreter();
    cheminLaisse = partie.cheminActuel();
  }

  // `tout de suite` : le premier coup sans attendre (clic sur Lecture) ; apres
  // un choix de branche, on regarde d'abord le coup choisi.
  function lancer(toutDeSuite = true) {
    if (minuteur || !partie.peutAvancer()) return;
    cheminLaisse = partie.cheminActuel();
    minuteur = setInterval(pas, DELAI_LECTURE_MS);
    afficher();
    if (toutDeSuite) pas();
  }

  bouton.addEventListener('click', () => (minuteur ? arreter() : lancer()));
  afficher();
  return { lancer, arreter };
}
