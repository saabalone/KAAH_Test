// Applique les reglages d'aspect au plateau DEJA construit (couleurs,
// coordonnees, ronds verts, fleches, chevron, trous du mode simple) : des
// proprietes CSS et quelques attributs, jamais rien de recree (CLAUDE.md).
//
// UN SEUL endroit pour tout ca (saab, 2026-09-27) : index.html l'appelle au
// demarrage, interface/reglages.js a chaque retouche. Jusqu'ici la meme liste
// de proprietes etait ecrite deux fois, une par appelant — chaque nouveau
// reglage devait etre ajoute aux deux, et un oubli n'aurait rien fait planter.
//
// Ce qui ne passe PAS par ici : les degrades des billes et du relief
// (rendu/couleurs-plateau.js, dessines une fois a la construction puis
// recolores par interface/reglages.js), et le mode simple (structurel : il
// recharge la page).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : bornerReglages
// (moteur/reglages.js), couleurVersHex, teinterNiveauGris (moteur/couleurs.js),
// RAYON_BILLE (rendu/plateau-svg.js), fixerRayonRondsVerts
// (rendu/coordonnees-jeu.js), fixerTailleTrousSimples (rendu/trous-simples.js)
// viennent de fichiers charges avant celui-ci.

// Niveau de gris des cases plates, a partir duquel teinterNiveauGris garde la
// teinte du fond du plateau (moteur/couleurs.js) : #8a8a8a sur le fond par defaut.
const NIVEAU_GRIS_CASE_PLATE = 0x8a;

// Chaque propriete CSS posee sur #plateau, et la couleur kaah qui la donne.
const COULEURS_KAAH_EN_CSS = [
  ['--fond-case-piste-vide', 'eject_bg_color'],
  ['--fond-cadre-occurrences', 'occ_bg_color'],
  ['--couleur-coordonnee-bord', 'coord_board_color'],
  ['--couleur-coordonnee-bille', 'coord_ball_color'],
  ['--couleur-case-selectionnee', 'select_ring_color'],
  ['--couleur-case-arrivee', 'dest_fill_color'],
  ['--couleur-fleche-conseil-victoire', 'hint_win_color'],
  ['--couleur-fleche-conseil-defaite', 'hint_loss_color'],
  ['--couleur-fleche-conseil-nulle', 'hint_draw_color'],
  ['--couleur-fleche-conseil-egalite', 'hint_tie_color'],
  ['--couleur-fleche-menace-ami', 'threat_friend_color'],
  ['--couleur-fleche-menace-ennemi', 'threat_enemy_color'],
  ['--couleur-fleche-menace-ejection', 'threat_eject_color'],
  ['--couleur-fleche-menace-ejection-fin', 'threat_win_eject_color'],
  ['--couleur-chevron-bille-noire', 'chevron_black_ball_color'],
  ['--couleur-chevron-bille-blanche', 'chevron_white_ball_color'],
  ['--couleur-chevron-ejection', 'chevron_eject_color'],
];

// `reglages` : tels que lus (lireReglagesActifs) ; bornes ici avant d'etre
// appliques (moteur/reglages.js, bornerReglages) — un fichier importe ne
// peut ainsi jamais donner une coordonnee plus grande que la bille.
function appliquerApparenceReglages(svg, reglagesLus) {
  const reglages = bornerReglages(reglagesLus);
  const kaah = reglages.kaah;
  const proprietes = [
    ['--couleur-bille-noire', couleurVersHex(reglages.colors.black)],
    ['--couleur-bille-blanche', couleurVersHex(reglages.colors.white)],
    ['--couleur-case-plate', teinterNiveauGris(couleurVersHex(reglages.board.bg_color), NIVEAU_GRIS_CASE_PLATE)],
    ...COULEURS_KAAH_EN_CSS.map(([propriete, cle]) => [propriete, couleurVersHex(kaah[cle])]),
    ['--taille-coordonnee-bille', `${kaah.ball_coord_size}px`],
    ['--taille-coordonnee-arrivee', `${kaah.dest_coord_size}px`],
    ['--opacite-fleches-conseils', kaah.hint_opacity],
    ['--opacite-fleches-menaces', kaah.threat_opacity],
  ];
  for (const [propriete, valeur] of proprietes) svg.style.setProperty(propriete, valeur);
  document.body.style.setProperty('--couleur-fond-fenetre', couleurVersHex(reglages.board.app_bg_color));

  // Masques en CSS, jamais retires : un clic sur la case a cocher les fait
  // disparaitre ou revenir EN DIRECT (interface/saisie.js les construit toujours).
  svg.classList.toggle('coordonnees-billes-masquees', !reglages.board.show_ball_coords);
  svg.classList.toggle('selection-bille-masquee', !kaah.show_selectable_balls);

  fixerRayonRondsVerts(svg, RAYON_BILLE * kaah.green_marker_scale);
  fixerTailleTrousSimples(svg, kaah.simple_hole_scale);
}
