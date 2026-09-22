// Le panneau "Réglages" (phase 22) : couleurs des billes et du plateau,
// mode simple (sans relief), coordonnées sur les billes, import/export au
// format `settings_N.json` de KAAWA (moteur/reglages.js pour tout ce qui
// est pur — cette partie-ci ne fait que lire/écrire `localStorage`, et
// orchestrer la boîte de dialogue).
//
// SIMPLIFIÉ par rapport à KAAWA (comme l'aide, phase 26, "version
// simplifiée") — décisions assumées, à revoir seulement si saab le demande :
//   - UN SEUL fichier de réglages actif, jamais le sélecteur multi-fichiers
//     de KAAWA (menu "Setting ▾", X vert/rouge) : Exporter/Importer suffit
//     pour passer d'un jeu de réglages à un autre à la main.
//   - Pas de couleurs "d'ambiance" secondaires (vert des coups valides,
//     rouge d'alerte, jaune de victoire, texte, fond des popups, noir/blanc
//     "UI" des pendules) : ce sont des choix de conception déjà réglés dans
//     styles.css, pas des préférences KAAWA à reproduire à l'identique.
//   - Pas de tailles de police/colonne (l'onglet "Interface" de KAAWA) :
//     KAAH s'adapte tout seul à l'écran (CLAUDE.md, portrait d'abord).
//   - Pas de case "Infobulles" : celles de KAAH sont l'attribut HTML natif
//     `title`, toujours actives, sans le coût qui justifie ce réglage chez
//     KAAWA (un widget de tooltip personnalisé).
//   - `pzl.random_permut_enabled` voyage dans le fichier (jamais perdu à
//     l'export/import) mais n'a pas encore de case ici : rien ne l'utilise
//     encore côté KAAH (PLAN.md, phase 16 amendée, pas codée).
//
// Mode simple et coordonnées sur les billes changent la CONSTRUCTION du
// plateau (rendu/relief-plateau.js, rendu/coordonnees-jeu.js) : jamais en
// direct, un rechargement suffit et reste cohérent avec le reste de KAAH
// (Nouvelle partie, Importer, Face-à-face agissent déjà ainsi). Les
// couleurs, elles, s'appliquent tout de suite (voir appliquerCouleurs plus
// bas) : rien de structurel n'y change.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : REGLAGES_PAR_DEFAUT,
// fusionnerReglages, lireReglagesJSON, ecrireReglagesJSON, couleurVersHex,
// hexVersCouleur, construireArretsBille (moteur/reglages.js),
// demarrerImportation (interface/fichiers.js) viennent de fichiers charges
// avant celui-ci dans index.html.

const CLE_STOCKAGE_REGLAGES = 'kaah-reglages';

// A appeler AVANT de dessiner le plateau (index.html) : mode simple et
// couleurs en dépendent dès le premier affichage.
function lireReglagesStockes() {
  try {
    return fusionnerReglages(JSON.parse(window.localStorage.getItem(CLE_STOCKAGE_REGLAGES) ?? '{}'));
  } catch {
    return REGLAGES_PAR_DEFAUT; // stockage indisponible ou illisible : jamais un plantage pour un reglage
  }
}

function ecrireReglagesStockes(reglages) {
  try {
    window.localStorage.setItem(CLE_STOCKAGE_REGLAGES, JSON.stringify(reglages));
  } catch {
    // Tant que la page reste ouverte, le reglage vaut quand meme.
  }
}

// Applique les couleurs EN DIRECT, sans recharger : le fond du plateau (une
// simple propriete CSS) et, si le relief est actif, les degrades des billes
// (regeneres dans les <defs> existantes — jamais reconstruit le plateau
// lui-meme, CLAUDE.md). `svg` : #plateau.
function appliquerCouleurs(svg, reglages) {
  const hexNoir = couleurVersHex(reglages.colors.black);
  const hexBlanc = couleurVersHex(reglages.colors.white);
  svg.style.setProperty('--couleur-bille-noire', hexNoir);
  svg.style.setProperty('--couleur-bille-blanche', hexBlanc);
  svg.style.setProperty('--couleur-fond-plateau', couleurVersHex(reglages.board.bg_color));

  const hexNoirDefaut = couleurVersHex(REGLAGES_PAR_DEFAUT.colors.black);
  const hexBlancDefaut = couleurVersHex(REGLAGES_PAR_DEFAUT.colors.white);
  const degradeNoir = svg.querySelector('#degrade-bille-noir');
  const degradeBlanc = svg.querySelector('#degrade-bille-blanc');
  if (degradeNoir) {
    degradeNoir.replaceChildren(...creerArretsSVG(hexNoir === hexNoirDefaut ? null : hexNoir, degradeNoir));
  }
  if (degradeBlanc) {
    degradeBlanc.replaceChildren(...creerArretsSVG(hexBlanc === hexBlancDefaut ? null : hexBlanc, degradeBlanc));
  }
}

// Les <stop> d'un degrade existant : soit ses arrets PAR DEFAUT (deja geres
// par rendu/relief-plateau.js a la construction, `null` = ne pas les
// regenerer ici pour eviter toute divergence avec l'original), soit ceux
// d'une couleur personnalisee (construireArretsBille). Reconstruire un
// <stop> est sans risque ici (CLAUDE.md n'interdit que de reconstruire le
// PLATEAU, ses cases et ses billes) : un degrade n'a pas d'identite propre a
// faire survivre d'un reglage a l'autre.
function creerArretsSVG(hexPersonnalise, degradeExistant) {
  if (hexPersonnalise === null) return [...degradeExistant.children]; // deja les bons arrets, on ne touche a rien
  const ESPACE_SVG = 'http://www.w3.org/2000/svg';
  return construireArretsBille(hexPersonnalise).map(([offset, couleur]) => {
    const arret = document.createElementNS(ESPACE_SVG, 'stop');
    arret.setAttribute('offset', `${offset}%`);
    arret.setAttribute('stop-color', couleur);
    return arret;
  });
}

// `elements` : { bouton, dialogue, fermer, couleurNoir, couleurBlanc,
// couleurFond, modeSimple, coordonneesBilles, exporter, importer }.
// `svg` : #plateau. `demarrerRechargement` (index.html) : voir son en-tete —
// un reglage structurel (mode simple, coordonnees) passe toujours par un
// rechargement complet, jamais par un ajustement en direct.
function demarrerReglages(elements, svg, demarrerRechargement) {
  function afficher() {
    const reglages = lireReglagesStockes();
    elements.couleurNoir.value = couleurVersHex(reglages.colors.black);
    elements.couleurBlanc.value = couleurVersHex(reglages.colors.white);
    elements.couleurFond.value = couleurVersHex(reglages.board.bg_color);
    elements.modeSimple.checked = !reglages.board.show_shadows;
    elements.coordonneesBilles.checked = reglages.board.show_ball_coords;
  }

  function modifierCouleur(categorie, cle, hex) {
    const reglages = lireReglagesStockes();
    reglages[categorie][cle] = hexVersCouleur(hex);
    ecrireReglagesStockes(reglages);
    appliquerCouleurs(svg, reglages);
  }

  elements.couleurNoir.addEventListener('input', () => modifierCouleur('colors', 'black', elements.couleurNoir.value));
  elements.couleurBlanc.addEventListener('input', () => modifierCouleur('colors', 'white', elements.couleurBlanc.value));
  elements.couleurFond.addEventListener('input', () => modifierCouleur('board', 'bg_color', elements.couleurFond.value));

  function modifierEtRecharger(cle, valeur) {
    const reglages = lireReglagesStockes();
    reglages.board[cle] = valeur;
    ecrireReglagesStockes(reglages);
    demarrerRechargement();
  }

  elements.modeSimple.addEventListener('change', () => modifierEtRecharger('show_shadows', !elements.modeSimple.checked));
  elements.coordonneesBilles.addEventListener('change', () => modifierEtRecharger('show_ball_coords', elements.coordonneesBilles.checked));

  elements.exporter.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([ecrireReglagesJSON(lireReglagesStockes())], { type: 'application/json' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'settings_kaah.json';
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  elements.importer.addEventListener('click', () => {
    demarrerImportation(
      (donnees) => {
        ecrireReglagesStockes(fusionnerReglages(donnees));
        demarrerRechargement();
      },
      (message) => window.alert(message)
    );
  });

  elements.bouton.addEventListener('click', () => {
    afficher();
    elements.dialogue.showModal();
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
}
