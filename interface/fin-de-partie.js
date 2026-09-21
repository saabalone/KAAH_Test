// « Fin de partie : Options » (phase 20bis) : ce qu'on peut faire une fois la partie
// terminee, dans une boite qui s'ouvre en touchant le cadre orange du resultat
// (« Gagne Options », « Nulle Options », voir rendu/ligne-joueur.js) — jamais en
// cours de partie ni sur une branche d'analyse (moteur/arbre.js,
// optionsDeFinDisponibles). Trois choix, comme KAAWA (`show_end_options`) :
//   - Revanche (Inverser) : meme position, les joueurs echangent leurs couleurs
//     (noms echanges, suffixe R pour les noms par defaut, plateau retourne en
//     face-a-face : moteur/revanche.js) ;
//   - Same (Meme setup) : meme position, memes noms, memes couleurs ;
//   - Change (Nouvelle variante) : ouvre le choix des variantes ; rien ne demarre
//     avant qu'on ait choisi.
// Revanche et Same demarrent une partie NEUVE : arbre vide, pendules aux valeurs de
// depart, commentaire de depart absent, nouvelle date ; le score d'un handicap
// (billes deja ejectees au depart) est conserve, puisqu'il est dans la position de
// depart. L'ancienne partie reste dans « Mes parties ». Le mecanisme est celui du
// bouton « Charger » des variantes : on pose la position de depart du PROCHAIN
// chargement (interface/sauvegarde.js), puis on recharge la page.
//
// Ce fichier ne contient aucune regle du jeu : celle des noms et de l'orientation est
// dans moteur/revanche.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ce fichier n'appelle que ce que
// lui donne `lecture` (index.html, qui utilise partieSuivante de moteur/revanche.js et
// definirPositionDepartSuivante de interface/sauvegarde.js).

// `elements` : { dialogue, revanche, same, change, fermer }. `lecture` :
// { optionsDisponibles(), suivante(choix) (pose la position de depart du prochain
// chargement, sans recharger), recharger(), ouvrirVariantes() }.
function demarrerFinDePartie(svg, elements, lecture) {
  svg.addEventListener('click', (evenement) => {
    const cadre = evenement.target.closest('.nom-tour-cadre');
    if (!cadre || !lecture.optionsDisponibles()) return;
    // Retournee vers le joueur du haut s'il est celui qui a touche, en face-a-face :
    // il la lit depuis son cote.
    const enHaut = cadre.closest('.nom-joueur').classList.contains('nom-joueur-en-haut');
    elements.dialogue.classList.toggle('dialogue-retourne', enHaut && document.body.classList.contains('face-a-face'));
    elements.dialogue.showModal();
  });

  function partieNeuve(choix) {
    elements.dialogue.close();
    lecture.suivante(choix);
    lecture.recharger();
  }

  elements.revanche.addEventListener('click', () => partieNeuve('revanche'));
  elements.same.addEventListener('click', () => partieNeuve('same'));
  elements.change.addEventListener('click', () => {
    elements.dialogue.close();
    lecture.ouvrirVariantes();
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
}
