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
// Pas d'import ni d'export (voir moteur/plateau.js).

const REGLAGES_PAR_DEFAUT = {
  board: {
    show_ball_coords: true,
    show_shadows: true,
    bg_color: [130 / 255, 130 / 255, 130 / 255, 1],
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
};

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

function versDeuxChiffresHex(canal255) {
  return Math.round(canal255).toString(16).padStart(2, '0');
}

// [r, g, b, a] en 0-1 (format KAAWA, voir REGLAGES_PAR_DEFAUT) -> "#rrggbb"
// (format de <input type="color">, sans alpha : le selecteur natif n'en a
// pas).
function couleurVersHex([r, g, b]) {
  return `#${versDeuxChiffresHex(r * 255)}${versDeuxChiffresHex(g * 255)}${versDeuxChiffresHex(b * 255)}`;
}

// L'inverse : alpha toujours a 1 (aucun reglage KAAH n'en propose).
function hexVersCouleur(hex) {
  const nombre = parseInt(hex.slice(1), 16);
  return [((nombre >> 16) & 0xff) / 255, ((nombre >> 8) & 0xff) / 255, (nombre & 0xff) / 255, 1];
}

// Melange deux couleurs hex : `ratio` = 0 rend `hexA` tel quel, 1 rend
// `hexB` tel quel.
function melangerHex(hexA, hexB, ratio) {
  const [rA, gA, bA] = hexVersCouleur(hexA);
  const [rB, gB, bB] = hexVersCouleur(hexB);
  const melange = (a, b) => a + (b - a) * ratio;
  return couleurVersHex([melange(rA, rB), melange(gA, gB), melange(bA, bB), 1]);
}

// Les arrets du degrade radial d'une bille de couleur personnalisee
// (rendu/relief-plateau.js garde ses deux degrades par defaut, regles a la
// main et approuves par saab — cette fonction ne sert que pour une couleur
// CHOISIE, differente des deux couleurs par defaut). Toujours un reflet
// blanc pur au centre (regle deja en place, jamais matte) puis la couleur
// choisie, puis assombrie vers le bord — une approximation plus simple que
// les degrades a 5 arrets regles a la main, suffisante pour une couleur
// qu'on choisit soi-meme.
function construireArretsBille(hexBase) {
  return [
    [0, '#ffffff'],
    [30, melangerHex(hexBase, '#ffffff', 0.35)],
    [65, hexBase],
    [100, melangerHex(hexBase, '#000000', 0.75)],
  ];
}
