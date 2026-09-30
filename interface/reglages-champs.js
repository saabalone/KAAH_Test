// Les commandes "simples" de Reglages — couleurs, cases a cocher, curseurs —
// decrites UNE fois : chacune est liee a un seul reglage ([categorie, cle] de
// moteur/reglages.js). Ajouter un reglage de ce genre = une ligne ici et une
// dans index.html, jamais un ecouteur de plus a brancher a la main
// (interface/reglages.js en avait un par couleur avant, saab 2026-09-27).
//
// Restent a part, dans interface/reglages.js : le mode simple (structurel, il
// recharge la page) et la base de coups (liste remplie par
// interface/bases-coups.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : couleurVersHex,
// hexVersCouleur (moteur/couleurs.js), BORNES_REGLAGES_KAAH, reglageDifferentDuDefaut (moteur/reglages.js)
// viennent de fichiers charges avant celui-ci.

const POURCENT = 100;

// Chaque type : lire (reglage -> valeur de la commande), ecrire (l'inverse),
// preparer (bornes d'un curseur, une fois), et si la commande previsualise
// pendant le geste (`input`, en glissant) avant de le terminer (`change`).
const TYPES_DE_CHAMPS_REGLAGES = {
  couleur: {
    enDirect: true,
    lire: (champ, valeur) => (champ.value = couleurVersHex(valeur)),
    ecrire: (champ) => hexVersCouleur(champ.value),
  },
  case: {
    enDirect: false,
    lire: (champ, valeur) => (champ.checked = valeur),
    ecrire: (champ) => champ.checked,
  },
  // Une taille, telle quelle, dans ses bornes (BORNES_REGLAGES_KAAH).
  taille: {
    enDirect: true,
    preparer: (champ, { min, max, pas }) => Object.assign(champ, { min, max, step: pas }),
    lire: (champ, valeur) => (champ.value = valeur),
    ecrire: (champ) => Number(champ.value),
  },
  // Le reglage est une OPACITE (1 = opaque) ; le curseur montre la
  // TRANSPARENCE en pourcentage (0 = opaque), le mot demande par saab.
  transparence: {
    enDirect: true,
    preparer: (champ, { min, pas }) =>
      Object.assign(champ, { min: 0, max: Math.round((1 - min) * POURCENT), step: pas * POURCENT }),
    lire: (champ, valeur) => (champ.value = Math.round((1 - valeur) * POURCENT)),
    // Calcule en pourcents entiers : 1 - 80/100 donnerait 0.19999999999999996
    // dans le fichier de reglages exporte.
    ecrire: (champ) => (POURCENT - Number(champ.value)) / POURCENT,
  },
};

// [id de la commande dans index.html, type, categorie, cle du reglage]
const CHAMPS_REGLAGES = [
  ['couleur-billes-noires', 'couleur', 'colors', 'black'],
  ['couleur-billes-blanches', 'couleur', 'colors', 'white'],
  ['couleur-fond-plateau', 'couleur', 'board', 'bg_color'],
  ['couleur-fond-trou', 'couleur', 'board', 'hole_color'],
  ['couleur-fond-fenetre', 'couleur', 'board', 'app_bg_color'],
  ['couleur-fond-eject', 'couleur', 'kaah', 'eject_bg_color'],
  ['couleur-fond-occ', 'couleur', 'kaah', 'occ_bg_color'],
  ['couleur-coord-plateau', 'couleur', 'kaah', 'coord_board_color'],
  ['couleur-coord-bille', 'couleur', 'kaah', 'coord_ball_color'],
  ['couleur-coord-bille-blanche', 'couleur', 'kaah', 'coord_white_ball_color'],
  ['couleur-select-bille', 'couleur', 'kaah', 'select_ring_color'],
  ['couleur-case-arrivee', 'couleur', 'kaah', 'dest_fill_color'],
  ['couleur-conseil-victoire', 'couleur', 'kaah', 'hint_win_color'],
  ['couleur-conseil-defaite', 'couleur', 'kaah', 'hint_loss_color'],
  ['couleur-conseil-nulle', 'couleur', 'kaah', 'hint_draw_color'],
  ['couleur-conseil-egalite', 'couleur', 'kaah', 'hint_tie_color'],
  ['curseur-transparence-conseils', 'transparence', 'kaah', 'hint_opacity'],
  ['couleur-menace-ami', 'couleur', 'kaah', 'threat_friend_color'],
  ['couleur-menace-ennemi', 'couleur', 'kaah', 'threat_enemy_color'],
  ['couleur-menace-ejection', 'couleur', 'kaah', 'threat_eject_color'],
  ['couleur-menace-ejection-fin', 'couleur', 'kaah', 'threat_win_eject_color'],
  ['curseur-transparence-menaces', 'transparence', 'kaah', 'threat_opacity'],
  ['couleur-chevron-noire', 'couleur', 'kaah', 'chevron_black_ball_color'],
  ['couleur-chevron-blanche', 'couleur', 'kaah', 'chevron_white_ball_color'],
  ['couleur-chevron-ejection', 'couleur', 'kaah', 'chevron_eject_color'],
  ['case-coordonnees-billes', 'case', 'board', 'show_ball_coords'],
  ['case-selection-bille', 'case', 'kaah', 'show_selectable_balls'],
  ['curseur-taille-trous', 'taille', 'kaah', 'simple_hole_scale'],
  ['curseur-taille-coord-bille', 'taille', 'kaah', 'ball_coord_size'],
  ['curseur-taille-coord-arrivee', 'taille', 'kaah', 'dest_coord_size'],
  ['curseur-taille-ronds-verts', 'taille', 'kaah', 'green_marker_scale'],
  ['nombre-taille-billes-perdantes', 'taille', 'kaah', 'loser_ball_scale'],
];

function chaqueChampReglage(dialogue, action) {
  for (const [id, type, categorie, cle] of CHAMPS_REGLAGES) {
    action(dialogue.querySelector(`#${id}`), TYPES_DE_CHAMPS_REGLAGES[type], categorie, cle);
  }
}

// Met chaque commande a la valeur de `reglages`.
function remplirChampsReglages(dialogue, reglages) {
  chaqueChampReglage(dialogue, (champ, type, categorie, cle) => type.lire(champ, reglages[categorie][cle]));
}

// Orange (phase 31, saab : « si je modifie dans Billes/Billes noires, Billes et
// Billes noires passent en orange, Billes blanches ne change pas ») : la ligne
// d'un reglage qui differe de Défaut, et sa rubrique. `autres` : les commandes
// hors de la table ([commande, categorie, cle] : mode simple, base de coups).
function marquerReglagesModifies(dialogue, reglages, autres) {
  const lignes = [
    ...CHAMPS_REGLAGES.map(([id, , categorie, cle]) => [dialogue.querySelector(`#${id}`), categorie, cle]),
    ...autres,
  ];
  for (const [commande, categorie, cle] of lignes) {
    (commande.closest('label') ?? commande).classList.toggle('reglage-modifie', reglageDifferentDuDefaut(reglages, categorie, cle));
  }
  for (const rubrique of dialogue.querySelectorAll('details.rubrique-reglages')) {
    rubrique.classList.toggle('rubrique-modifiee', rubrique.querySelector('.reglage-modifie') !== null);
  }
}

// Branche chaque commande une fois pour toutes. `surApercu(retouche)` :
// pendant le geste (le reglage change, rien n'est encore enregistre) ;
// `surFinDeGeste()` : geste fini — voir interface/reglages.js,
// actualiserBrouillon et terminerGeste. Une case a cocher n'a qu'un geste.
function brancherChampsReglages(dialogue, surApercu, surFinDeGeste) {
  chaqueChampReglage(dialogue, (champ, type, categorie, cle) => {
    type.preparer?.(champ, BORNES_REGLAGES_KAAH[cle]);
    const retouche = (reglages) => ((reglages[categorie][cle] = type.ecrire(champ)), reglages);
    if (type.enDirect) champ.addEventListener('input', () => surApercu(retouche));
    champ.addEventListener('change', () => {
      surApercu(retouche);
      surFinDeGeste();
    });
    // Les boutons - et + d'une taille (saab, 2026-09-30) : un pas, dans les bornes,
    // comme une saisie au clavier.
    for (const bouton of champ.parentElement.querySelectorAll('[data-pas]')) {
      bouton.addEventListener('click', () => {
        if (Number(bouton.dataset.pas) > 0) champ.stepUp();
        else champ.stepDown();
        champ.dispatchEvent(new Event('change'));
      });
    }
  });
}
