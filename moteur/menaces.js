// Menaces (Phase 19, le bouton "!?") : toutes les poussees ("sumito")
// possibles sur la position REGARDEE, pour LES DEUX CAMPS a la fois —
// jamais seulement les coups du joueur au trait, puisqu'il s'agit de
// montrer ce que CHAQUE camp pourrait faire ici, pas de jouer un coup.
// Repris de KAAWA (kaa_board_widget_ClO_Co.py, _draw_threat_arrows) :
// verifie qu'un simple deplacement (aucune bille adverse poussee) n'est
// jamais une menace, seule une vraie poussee en est une.
//
// N'invente AUCUNE regle : reutilise directement regles.coupsDepuis, deja
// capable d'enumerer les groupes et poussees legales de N'IMPORTE QUEL
// camp depuis N'IMPORTE QUELLE bille (il ne suppose jamais que ce camp
// est celui au trait) — "qu'est-ce qu'une poussee legale" ne doit jamais
// s'ecrire deux fois dans ce projet (CLAUDE.md). L'absence de doublon
// (test 1) vient directement de coupsDepuis/groupesDepuis : un groupe de
// billes alignees n'est jamais construit deux fois pour la meme direction
// (chaque groupe est ancre sur sa PROPRE bille de queue, voir regles.js).
//
// Pas d'import ni d'export (voir plateau.js) : coupsDepuis, couleurAdverse
// (regles.js), couleursDuPlateau, EJECTIONS_POUR_GAGNER (partie.js) et
// caseDansLaDirection (plateau.js) viennent tous des fichiers charges
// avant celui-ci dans index.html.

// Les notations de toutes les billes d'une couleur, dans un ordre stable
// (celui des cles de `couleurs`). `couleurs` : le plateau au format
// {notation: 'noir'|'blanc'} que regles.js attend (voir couleursDuPlateau,
// partie.js) — PAS le {notation: {couleur, id}} de `etat.plateau`.
function billesDeCouleur(couleurs, couleur) {
  return Object.keys(couleurs).filter((notation) => couleurs[notation] === couleur);
}

// Une menace : { camp, ami, billes, direction, billesPoussees, ejection,
// finDePartie }. `camp` est la couleur du groupe QUI POUSSE (jamais
// forcement le joueur au trait : les menaces des deux camps sont
// calculees ensemble). `ami` vrai si `camp` est celui au trait sur cette
// position — un code couleur d'affichage (vert/orange, PLAN.md), calcule
// ici plutot que redemande a chaque appelant : `etat.joueurAuTrait` est
// deja sous la main, jamais une regle a reecrire ailleurs. `ejection`
// vrai si la derniere bille adverse poussee sortirait du plateau ;
// `finDePartie` vrai si cette ejection donnerait au camp qui pousse sa
// EJECTIONS_POUR_GAGNER-ieme bille adverse ejectee, donc la victoire
// immediate.
//
// `etat` : le meme objet que partout ailleurs ({ plateau, joueurAuTrait,
// billesEjecteesNoires, billesEjecteesBlanches, ... }).
function menacesDeLaPosition(etat) {
  const couleurs = couleursDuPlateau(etat.plateau);
  const menaces = [];

  for (const camp of ['noir', 'blanc']) {
    for (const depart of billesDeCouleur(couleurs, camp)) {
      for (const coup of coupsDepuis(couleurs, camp, depart)) {
        if (coup.billesPoussees.length === 0) continue; // simple deplacement : pas une menace

        const derniereAdverse = coup.billesPoussees[coup.billesPoussees.length - 1];
        const ejection = caseDansLaDirection(derniereAdverse, coup.direction) === null;
        const campAdverse = couleurAdverse(camp);
        const dejaEjecteesDuCampAdverse =
          campAdverse === 'noir' ? etat.billesEjecteesNoires : etat.billesEjecteesBlanches;

        menaces.push({
          camp,
          ami: camp === etat.joueurAuTrait,
          billes: coup.billes,
          direction: coup.direction,
          billesPoussees: coup.billesPoussees,
          ejection,
          finDePartie: ejection && dejaEjecteesDuCampAdverse + 1 >= EJECTIONS_POUR_GAGNER,
        });
      }
    }
  }

  return menaces;
}
