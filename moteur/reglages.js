// Les réglages (phase 22) : couleurs des billes et du plateau, coordonnées sur
// les billes, mode simple (sans relief), et les deux réglages PZL "à usage
// unique" (moteur/reglages.js, consommerReglagesPzlUsageUnique — voir
// PLAN.md, phase 28 : le vrai déclencheur, une vérification du solveur,
// n'existe pas encore). Pur et immuable comme le reste du moteur : aucune
// fonction ici ne touche à `localStorage` ni au DOM — ça, c'est
// interface/reglages.js.
//
// Clés et valeurs par défaut IDENTIQUES à KAAWA (kaa_constants_ClO_Co.py,
// kaa_settings_popup_ClO_Co.py, `_TABS`), jamais inventées — vérifiées dans
// le vrai code :
//   - board.show_ball_coords (true), board.show_shadows (true),
//     board.bg_color (BOARD_BG_COLOR, [130, 130, 130]/255) ;
//   - colors.black (BLACK), colors.white (WHITE) — les couleurs des billes ;
//   - pzl.cache_offset_tours (4), pzl.save_threshold_sec (180),
//     pzl.random_permut_enabled (true).
//
// DÉLIBÉRÉMENT NON PORTÉES (aucun équivalent KAAH, verifié dans le vrai
// popup Settings de KAAWA) : les onglets Interface (tailles de police,
// largeur de la colonne laterale — KAAH s'adapte tout seul a l'ecran),
// Tooltip (KAAH utilise l'attribut HTML natif `title`, toujours actif, sans
// le cout d'un widget a part que ce reglage economiserait chez KAAWA), les
// couleurs d'ambiance secondaires (verte/rouge/jaune/texte/fond de popup,
// noir-blanc "UI"), les categories `ui.*`/`nav.*` (scroll Kivy, rotation
// 180 : remplacee par le face-a-face, phase 20). Un fichier KAAWA qui
// contient ces cles se lit quand meme sans erreur (test 2) : elles sont
// simplement ignorees a la lecture, jamais recopiees a l'ecriture — un
// export KAAH ne les fait donc pas revivre par erreur dans un fichier
// ensuite rouvert par KAAWA.
//
// board.show_shadows : la case a cocher "Ombres" de KAAWA ne retire QUE les
// 3 taches d'ombre portee (verifie dans kaa_board_widget_ClO_Co.py) ; le
// "mode simple" de KAAH est plus radical par necessite (interface/, pas ici) —
// retire aussi les cylindres de relief et les trous perfores, pour de vrai
// gagner en vitesse sur un telephone lent (PLAN.md, phase 22, demande de
// saab 2026-09-20 : 1 278 elements SVG dont 91 avec un filtre).
//
// Les conversions de couleur (hex <-> [r,g,b,a], degrades, nuances) vivent a
// part, dans moteur/couleurs.js — regle des 200 lignes (CLAUDE.md), ce
// fichier-ci ne s'occupe que du SCHEMA des reglages.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const REGLAGES_PAR_DEFAUT = {
  board: {
    show_ball_coords: true,
    show_shadows: true,
    bg_color: [130 / 255, 130 / 255, 130 / 255, 1],
    // HOLE_COLOR de KAAWA : le fond des 61 trous perfores — deliberement
    // different de bg_color (un vrai plateau a un creux plus sombre que sa
    // surface), voir teinterNiveauGris plus bas pour les nuances qui en
    // decoulent (paroi du trou).
    hole_color: [90 / 255, 90 / 255, 90 / 255, 1],
    // app_bg_color de KAAWA (BG_COLOR, un cuivre) : PAS repris comme defaut,
    // volontairement — KAAH a le sien depuis toujours (styles.css, #595959,
    // "rappelle le bois sombre du plateau physique"), jamais celui de
    // KAAWA. Seule la CLE est reprise, pour qu'un export KAAH reste un
    // fichier settings_N.json valide et que l'import d'un fichier KAAWA
    // recupere bien sa couleur si saab la veut.
    app_bg_color: [0x59 / 255, 0x59 / 255, 0x59 / 255, 1],
  },
  colors: {
    black: [31 / 255, 31 / 255, 31 / 255, 1],
    white: [0xe4 / 255, 0xe4 / 255, 0xe4 / 255, 1],
  },
  pzl: {
    cache_offset_tours: 4,
    save_threshold_sec: 180,
    random_permut_enabled: true,
  },
  // La base de coups choisie ("BDD moves", kaa_settings_popup_ClO_Co.py F6) :
  // un nom de fichier KAA_NEXT_MOVE_REF_*.csv, ou null ("(auto)" chez KAAWA,
  // aucun defaut dans kaa_constants). null vaut, dans KAAH, sa base integree
  // (moteur/bases-coups.js, nomBaseAUtiliser).
  nextmove: {
    bdd_file: null,
  },
  // Six couleurs SANS EQUIVALENT KAAWA (comme le volume des sons, phase
  // 21bis) : demandees par saab, absentes du vrai Settings de KAAWA — rangees
  // a part, jamais dans `board`/`colors` ci-dessus qui, elles, doivent rester
  // identiques a KAAWA (voir l'en-tete du fichier). Un fichier exporte par
  // KAAH garde cette categorie ; un KAAWA qui le relit l'ignore simplement
  // (kaa_constants_ClO_Co.py, deep_update : une cle inconnue au premier
  // niveau est ajoutee a ses reglages, jamais lue par la suite — verifie
  // dans son code source, jamais une erreur).
  kaah: {
    eject_bg_color: [0x8a / 255, 0x8a / 255, 0x8a / 255, 1], // case vide d'une piste d'ejection
    occ_bg_color: [0x82 / 255, 0x82 / 255, 0x82 / 255, 1], // cadre du compteur Occ (rendu/corde.js)
    coord_board_color: [0xcf / 255, 0xcf / 255, 0xcf / 255, 1], // bordure de coordonnees a-i/1-9
    // Coordonnee ecrite sur chaque bille : claire sur bille NOIRE (cette cle),
    // foncee sur bille BLANCHE (la suivante). Une seule couleur pour les deux
    // camps (2026-09-26) la rendait invisible sur les billes blanches (saab).
    coord_ball_color: [0xe4 / 255, 0xe4 / 255, 0xe4 / 255, 1],
    coord_white_ball_color: [0x1f / 255, 0x1f / 255, 0x1f / 255, 1],
    select_ring_color: [0xc8 / 255, 0x7f / 255, 0x32 / 255, 1], // anneau autour de la case de la bille selectionnee (rendu/selection.js)
    dest_fill_color: [0x00 / 255, 0xaa / 255, 0x3e / 255, 1], // rond translucide d'une case d'arrivee possible (rendu/coordonnees-jeu.js)
    // Rond vert translucide sur chaque bille SELECTIONNABLE (camp au trait), la
    // meme couleur/mecanique que dest_fill_color (saab : "rester dans la logique
    // du vert") — pas une couleur a part, un simple interrupteur "Sélection sur
    // bille" dans Affichage (interface/reglages.js). true par defaut : nouveaute
    // KAAH, jamais dans un vrai fichier KAAWA.
    show_selectable_balls: true,
    // Tailles (saab, 2026-09-27), en unites du dessin du plateau ; bornes dans
    // BORNES_REGLAGES_KAAH plus bas. Defauts = l'aspect d'avant, au pixel pres.
    simple_hole_scale: 1, // trou du mode simple, fraction de sa taille actuelle (le maximum)
    ball_coord_size: 5, // police des coordonnees sur les billes
    dest_coord_size: 5, // police des coordonnees des cases d'arrivee
    green_marker_scale: 0.66, // rond vert (selectionnable ET arrivee), fraction du rayon d'une bille
    // Fleches de Conseils (rendu/conseils.js) : une couleur par resultat, une
    // opacite pour toutes (1 = opaque).
    hint_win_color: [0x2e / 255, 0xcc / 255, 0x55 / 255, 1],
    hint_loss_color: [0xe0 / 255, 0x40 / 255, 0x40 / 255, 1],
    hint_draw_color: [0x4a / 255, 0xa8 / 255, 0xff / 255, 1],
    hint_tie_color: [0x9a / 255, 0x9a / 255, 0x9a / 255, 1],
    hint_opacity: 1,
    // Fleches de Menaces (rendu/menaces.js) : une couleur par sorte, une
    // opacite de base (les ejections restent un peu plus appuyees, styles.css).
    threat_friend_color: [0x2e / 255, 0xcc / 255, 0x55 / 255, 1],
    threat_enemy_color: [0xcc / 255, 0x6a / 255, 0x00 / 255, 1],
    threat_eject_color: [0xe0 / 255, 0x40 / 255, 0x40 / 255, 1],
    threat_win_eject_color: [0xe0 / 255, 0x40 / 255, 0x40 / 255, 1],
    threat_opacity: 0.6,
    // Chevron du dernier coup (rendu/fleche-dernier-coup.js).
    chevron_black_ball_color: [0xe4 / 255, 0xe4 / 255, 0xe4 / 255, 1],
    chevron_white_ball_color: [0x1f / 255, 0x1f / 255, 0x1f / 255, 1],
    chevron_eject_color: [0xe0 / 255, 0x40 / 255, 0x40 / 255, 1],
  },
};

// Bornes des reglages kaah numeriques (min, max, pas du curseur). Mesure
// faite dans le navigateur (2026-09-27) : la coordonnee la plus large ("b4")
// fait 5,9 unites en police 5, une bille 14 de diametre (rayon 7) — elle
// deborderait donc au-dela d'une police 11,8 ; 11 laisse la marge des polices
// qui different d'un appareil a l'autre ("jamais plus grande que la bille",
// saab). Rond vert : 1 = le rayon de la bille. Trou : 1 = sa taille actuelle.
// Opacite : jamais 0, une fleche invisible passerait pour un bogue.
const BORNES_REGLAGES_KAAH = {
  simple_hole_scale: { min: 0.3, max: 1, pas: 0.05 },
  ball_coord_size: { min: 2, max: 11, pas: 0.5 },
  dest_coord_size: { min: 2, max: 11, pas: 0.5 },
  green_marker_scale: { min: 0.2, max: 1, pas: 0.02 },
  hint_opacity: { min: 0.1, max: 1, pas: 0.05 },
  threat_opacity: { min: 0.1, max: 1, pas: 0.05 },
};

// Ramene chaque reglage borne dans ses bornes, et remplace un non-nombre par
// son defaut : un fichier importe (ou abime) ne doit jamais donner une
// coordonnee plus grande que la bille. Renvoie de nouveaux reglages.
function bornerReglages(reglages) {
  const kaah = { ...reglages.kaah };
  for (const [cle, { min, max }] of Object.entries(BORNES_REGLAGES_KAAH)) {
    const valeur = kaah[cle];
    kaah[cle] = Number.isFinite(valeur) ? Math.min(max, Math.max(min, valeur)) : REGLAGES_PAR_DEFAUT.kaah[cle];
  }
  return { ...reglages, kaah };
}

// Vrai seulement pour un objet simple ({...}), jamais pour un tableau, null,
// ou une primitive — un tableau (une couleur [r,g,b,a]) est une VALEUR pour
// cette fusion, jamais une categorie a fusionner recursivement.
function estObjetSimple(valeur) {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

// Fusionne `brut` (un objet quelconque, potentiellement du JSON etranger)
// sur REGLAGES_PAR_DEFAUT : seules les cles que REGLAGES_PAR_DEFAUT connait
// deja sont reprises, tout le reste de `brut` est ignore (voir l'en-tete du
// fichier). Ne plante jamais, quelle que soit la forme de `brut`.
function fusionnerReglages(brut) {
  function fusionnerNiveau(defaut, source) {
    const objetSource = estObjetSimple(source) ? source : {};
    const resultat = {};
    for (const cle of Object.keys(defaut)) {
      const valeurDefaut = defaut[cle];
      const valeurSource = objetSource[cle];
      resultat[cle] = estObjetSimple(valeurDefaut) ? fusionnerNiveau(valeurDefaut, valeurSource) : (valeurSource ?? valeurDefaut);
    }
    return resultat;
  }
  return fusionnerNiveau(REGLAGES_PAR_DEFAUT, brut);
}

// Lit un texte JSON (un fichier settings_N.json, produit par KAAWA ou par
// KAAH lui-meme) : jamais d'erreur, meme sur un texte illisible — les
// defauts s'appliquent alors integralement (test 2bis).
function lireReglagesJSON(texte) {
  let brut;
  try {
    brut = JSON.parse(texte);
  } catch {
    brut = {};
  }
  return fusionnerReglages(brut);
}

// L'inverse d'estObjetSimple pour une comparaison de VALEUR (nombre,
// booleen, tableau de nombres) : deux valeurs sont egales si leur JSON
// l'est — suffisant ici, aucune de ces valeurs ne contient de fonction ni
// de reference circulaire.
function memeValeur(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// L'inverse de fusionnerReglages : ne garde QUE ce qui differe du defaut —
// un fichier sparse, exactement comme les vrais settings_N.json de KAAWA
// (verifie sur un exemplaire reel : 6 categories partielles seulement,
// aucune des cles restees au defaut n'y figure).
function ecrireReglagesJSON(reglages) {
  function differencesNiveau(defaut, valeurs) {
    const differences = {};
    for (const cle of Object.keys(defaut)) {
      if (estObjetSimple(defaut[cle])) {
        const sousDifferences = differencesNiveau(defaut[cle], valeurs[cle]);
        if (Object.keys(sousDifferences).length > 0) differences[cle] = sousDifferences;
      } else if (!memeValeur(valeurs[cle], defaut[cle])) {
        differences[cle] = valeurs[cle];
      }
    }
    return differences;
  }
  return JSON.stringify(differencesNiveau(REGLAGES_PAR_DEFAUT, reglages), null, 2);
}

// Les deux reglages PZL "a usage unique" (KAA_aide.txt, chapitre 12,
// "REGLAGES PZL A USAGE UNIQUE") : consommes des qu'une verification REELLE
// du solveur conclut (PLAN.md, phase 28 — pas encore construite ici, cette
// fonction n'est donc pour l'instant appelee par aucun code, seulement
// testee). `random_permut_enabled` n'est PAS concerne : c'est un choix de
// PUZZLE permanent (phase 16 amendee), pas un reglage de test ponctuel.
function consommerReglagesPzlUsageUnique(reglages) {
  return {
    ...reglages,
    pzl: {
      ...reglages.pzl,
      cache_offset_tours: REGLAGES_PAR_DEFAUT.pzl.cache_offset_tours,
      save_threshold_sec: REGLAGES_PAR_DEFAUT.pzl.save_threshold_sec,
    },
  };
}
