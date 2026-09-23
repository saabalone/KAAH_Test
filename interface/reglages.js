// Le panneau "Réglages" (phase 22, corrigée d'après les retours de saab en
// testant) : couleurs des billes et du plateau, mode simple (sans relief),
// coordonnées sur les billes, plusieurs profils nommés, import/export au
// format `settings_N.json` de KAAWA (moteur/reglages.js pour ce qui est pur,
// interface/reglages-profils.js pour le stockage des profils — cette
// partie-ci n'orchestre que la boîte de dialogue).
//
// BROUILLON, jamais en direct (correctif — la première version appliquait
// chaque couleur tout de suite, mais le fond du plateau restait fige dans
// le decor mis en cache, rendu/cache-relief.js, tant qu'on ne changeait pas
// de partie ; de plus, les nuances du relief et des trous, phase 22
// corrigee, ne peuvent de toute facon se calculer qu'a la construction du
// plateau) : chaque reglage modifie dans la boite est gardé en memoire
// (`brouillon`) jusqu'a un geste explicite —
//   - **Valider** : sauve le brouillon dans le PROFIL ACTIF (cree "Mes
//     réglages" tout seul si on est sur Défaut, qu'on ne peut jamais
//     ecraser) et recharge la page ;
//   - **Sauver...** : pareil, mais demande TOUJOURS un nom (KAAWA avait deux
//     boutons, Sauver et Sous... — saab a demande de n'en garder qu'un qui
//     fasse les deux) ;
//   - **Annuler** : ferme sans rien appliquer ;
//   - **Défaut** : remet le BROUILLON (pas encore sauve) aux valeurs
//     d'origine de KAAWA.
// Changer de PROFIL, lui, s'applique tout de suite (recharge la page) —
// comme charger un fichier dans KAAWA, ce n'est pas une simple retouche.
//
// SIMPLIFIÉ par rapport à KAAWA (comme l'aide, phase 26) : pas de tailles de
// police/colonne (KAAH s'adapte tout seul a l'ecran), pas de case
// "Infobulles" (attribut natif `title`, toujours actif), pas de couleurs
// d'ambiance secondaires (deja fixees dans styles.css). `pzl.
// random_permut_enabled` voyage dans le fichier mais n'a pas de case ici
// (rien ne le consomme encore, phase 16 amendee pas codee). "BDD moves"
// (base de coups) : KAAH n'en propose qu'UNE (donnees/kaa-next-move.js),
// donc une ligne d'info plutot qu'un vrai choix.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : REGLAGES_PAR_DEFAUT
// (moteur/reglages.js), couleurVersHex, hexVersCouleur (moteur/couleurs.js),
// listerNomsProfils, lireNomProfilActif, lireReglagesActifs,
// sauverProfilActif, creerProfil,
// definirProfilActif, supprimerProfil, NOM_PROFIL_DEFAUT
// (interface/reglages-profils.js), telechargerReglages (ci-dessous),
// demarrerImportation (interface/fichiers.js), formaterDateKAAWA
// (interface/sauvegarde.js) viennent de fichiers charges avant celui-ci
// dans index.html.

// Rend `poignee` deplaçable : `dialogue` suit le doigt/la souris tant qu'on
// la tient. Ecouteurs sur `window` (pas sur `poignee`) pendant le
// deplacement, PLUTOT que setPointerCapture : suit le pointeur meme s'il
// sort de la poignee en cours de geste (un glissement rapide rate parfois
// une cible aussi etroite qu'un titre), et ne depend d'aucune API a part
// (moins de surprises d'un navigateur a l'autre). Position remise a zero
// (centrage natif de <dialog>) a chaque ouverture — voir `afficher()` plus
// bas — jamais retenue d'une fois sur l'autre : plus simple, et ca n'a
// jamais ete demande.
function rendreDeplacable(dialogue, poignee) {
  let decalX = 0;
  let decalY = 0;

  function deplacer(evenement) {
    dialogue.style.left = `${evenement.clientX - decalX}px`;
    dialogue.style.top = `${evenement.clientY - decalY}px`;
  }

  function relacher() {
    window.removeEventListener('pointermove', deplacer);
    window.removeEventListener('pointerup', relacher);
  }

  poignee.addEventListener('pointerdown', (evenement) => {
    const rect = dialogue.getBoundingClientRect();
    decalX = evenement.clientX - rect.left;
    decalY = evenement.clientY - rect.top;
    dialogue.style.margin = '0';
    dialogue.style.right = 'auto';
    dialogue.style.bottom = 'auto';
    window.addEventListener('pointermove', deplacer);
    window.addEventListener('pointerup', relacher);
  });
}

function reinitialiserPosition(dialogue) {
  for (const proprietaire of ['left', 'top', 'right', 'bottom', 'margin']) dialogue.style[proprietaire] = '';
}

// `elements` : { bouton, dialogue, poignee, couleurNoir, couleurBlanc,
// couleurFond, couleurTrou, couleurFenetre, modeSimple, coordonneesBilles,
// selectProfil, supprimerProfil, exporter, importer, defaut, annuler,
// sauverSous, valider }. `svg` : #plateau (pour le nom du fichier exporte
// uniquement). `demarrerRechargement` (index.html) : chaque application
// passe par un rechargement complet — voir l'en-tete du fichier.
function demarrerReglages(elements, demarrerRechargement) {
  let brouillon = REGLAGES_PAR_DEFAUT;

  function remplirFormulaire() {
    elements.couleurNoir.value = couleurVersHex(brouillon.colors.black);
    elements.couleurBlanc.value = couleurVersHex(brouillon.colors.white);
    elements.couleurFond.value = couleurVersHex(brouillon.board.bg_color);
    elements.couleurTrou.value = couleurVersHex(brouillon.board.hole_color);
    elements.couleurFenetre.value = couleurVersHex(brouillon.board.app_bg_color);
    elements.modeSimple.checked = !brouillon.board.show_shadows;
    elements.coordonneesBilles.checked = brouillon.board.show_ball_coords;
  }

  function remplirProfils() {
    const actif = lireNomProfilActif();
    elements.selectProfil.replaceChildren(
      ...listerNomsProfils().map((nom) => {
        const option = document.createElement('option');
        option.value = nom;
        option.textContent = nom;
        option.selected = nom === actif;
        return option;
      })
    );
    elements.supprimerProfil.disabled = actif === NOM_PROFIL_DEFAUT;
  }

  function modifierBrouillon(retouche) {
    brouillon = retouche({ ...brouillon, board: { ...brouillon.board }, colors: { ...brouillon.colors } });
  }

  elements.couleurNoir.addEventListener('input', () => modifierBrouillon((r) => ((r.colors.black = hexVersCouleur(elements.couleurNoir.value)), r)));
  elements.couleurBlanc.addEventListener('input', () => modifierBrouillon((r) => ((r.colors.white = hexVersCouleur(elements.couleurBlanc.value)), r)));
  elements.couleurFond.addEventListener('input', () => modifierBrouillon((r) => ((r.board.bg_color = hexVersCouleur(elements.couleurFond.value)), r)));
  elements.couleurTrou.addEventListener('input', () => modifierBrouillon((r) => ((r.board.hole_color = hexVersCouleur(elements.couleurTrou.value)), r)));
  elements.couleurFenetre.addEventListener('input', () => modifierBrouillon((r) => ((r.board.app_bg_color = hexVersCouleur(elements.couleurFenetre.value)), r)));
  elements.modeSimple.addEventListener('change', () => modifierBrouillon((r) => ((r.board.show_shadows = !elements.modeSimple.checked), r)));
  elements.coordonneesBilles.addEventListener('change', () =>
    modifierBrouillon((r) => ((r.board.show_ball_coords = elements.coordonneesBilles.checked), r))
  );

  elements.defaut.addEventListener('click', () => {
    brouillon = REGLAGES_PAR_DEFAUT;
    remplirFormulaire();
  });

  elements.valider.addEventListener('click', () => {
    sauverProfilActif(brouillon);
    demarrerRechargement();
  });

  elements.sauverSous.addEventListener('click', () => {
    const propose = lireNomProfilActif() === NOM_PROFIL_DEFAUT ? '' : lireNomProfilActif();
    const nom = window.prompt('Nom de ce profil de réglages :', propose);
    if (!nom) return; // boite annulee, ou nom vide : rien ne change
    creerProfil(nom, brouillon);
    demarrerRechargement();
  });

  elements.annuler.addEventListener('click', () => elements.dialogue.close());

  elements.selectProfil.addEventListener('change', () => {
    definirProfilActif(elements.selectProfil.value);
    demarrerRechargement();
  });

  elements.supprimerProfil.addEventListener('click', () => {
    supprimerProfil(lireNomProfilActif());
    demarrerRechargement();
  });

  elements.exporter.addEventListener('click', () => telechargerReglages(brouillon));

  elements.importer.addEventListener('click', () => {
    demarrerImportation(
      (donnees) => {
        brouillon = fusionnerReglages(donnees);
        remplirFormulaire();
      },
      (message) => window.alert(message)
    );
  });

  rendreDeplacable(elements.dialogue, elements.poignee);

  elements.bouton.addEventListener('click', () => {
    brouillon = lireReglagesActifs();
    remplirFormulaire();
    remplirProfils();
    reinitialiserPosition(elements.dialogue);
    elements.dialogue.showModal();
  });
}

// Meme mecanique que telechargerPartie (interface/fichiers.js), pour un
// fichier de reglages plutot qu'une partie. Nom EXACT demande par saab :
// `settings_kaah_<date KAAWA>` (meme format de date que l'export d'une
// partie), remplace l'ancien nom fixe qui forçait le navigateur a numeroter
// les telechargements (`settings_kaah (3).json`...).
function telechargerReglages(reglages) {
  const url = URL.createObjectURL(new Blob([ecrireReglagesJSON(reglages)], { type: 'application/json' }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = `settings_kaah_${formaterDateKAAWA(new Date())}.json`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
