// Le panneau "Réglages" (phase 22, corrigée une seconde fois — retours de
// saab en testant) : couleurs des billes et du plateau, mode simple (sans
// relief), coordonnées sur les billes, plusieurs profils nommés,
// import/export au format `settings_N.json` de KAAWA (moteur/reglages.js
// pour ce qui est pur, interface/reglages-profils.js pour le stockage des
// profils — cette partie-ci n'orchestre que la boîte de dialogue).
//
// EN DIRECT (deuxième correctif : la première version, "brouillon, rien en
// direct", n'était pas non plus ce que voulait saab — "si on change un
// réglage il doit être visible immédiatement, sans avoir à Valider") :
//   - une COULEUR s'applique a chaque `input` (pendant qu'on glisse dans le
//     selecteur natif), en recoloriant le plateau DEJA CONSTRUIT (rendu/
//     couleurs-plateau.js) puis en forcant rendu/cache-relief.js a
//     redessiner son bitmap — sans ce forcage, la couleur changeait
//     dessous mais restait invisible, figee dans l'ancienne image (bug
//     d'origine de la premiere version) ;
//   - les COORDONNEES SUR LES BILLES s'appliquent aussi tout de suite,
//     via une classe CSS (`coordonnees-billes-masquees`) plutot qu'en
//     reconstruisant quoi que ce soit (interface/saisie.js les construit
//     desormais TOUJOURS, cette classe se contente de les cacher) ;
//   - le MODE SIMPLE reste seul a exiger un rechargement IMMEDIAT (des
//     qu'on coche/decoche) : il change le nombre d'elements SVG construits
//     (CLAUDE.md, 1 278 contre 248), rien de commun avec une couleur qui
//     ne fait que changer un attribut `fill` deja en place ;
//   - a chaque changement, `actuel` part enregistre dans le PROFIL ACTIF —
//     "Défaut" cree tout seul un profil `set_kaah_<date du jour>`
//     (interface/reglages-profils.js, sauverProfilActif/nomProfilParDefaut)
//     et devient ce profil, jamais perdu meme sans cliquer "Sauver..." ;
//     "Sauver..." (bouton unique, KAAWA en a deux — Sauver et Sous...)
//     propose seulement de le RENOMMER.
//
// Pied de boite, 4 boutons :
//   - **Défaut** : remet TOUT aux valeurs d'origine de KAAWA, en direct ;
//   - **Annuler** : revient au dernier reglage change (une pile, PAS un
//     brouillon a part) — NE FERME PAS la boite (saab : "il ne doit pas
//     fermer la boite") ;
//   - **Sauver...** : renomme le profil courant ;
//   - **Fermer** : ferme la boite, sans rien appliquer de plus (deja fait).
// Changer de profil (menu deroulant) ou le supprimer, eux, RECHARGENT la
// pile d'annulation a zero (un autre profil, c'est un autre "fichier") mais
// s'appliquent aussi en direct quand c'est possible (seul le mode simple,
// structurel, force un rechargement de page).
//
// SIMPLIFIÉ par rapport à KAAWA (comme l'aide, phase 26) : pas de tailles de
// police/colonne de l'interface (KAAH s'adapte tout seul a l'ecran), pas de
// case "Infobulles" (attribut natif `title`, toujours actif). `pzl.
// random_permut_enabled` voyage dans le fichier mais n'a pas de case ici
// (rien ne le consomme encore, phase 16 amendee pas codee). "BDD moves"
// (base de coups, saab 2026-09-27) : `nextmove.bdd_file` comme KAAWA — ce
// fichier-ci ne fait que le lire, l'ecrire et le passer a
// interface/bases-coups.js (`baseCoups`), qui remplit la liste et charge la
// base.
//
// Reglages sans equivalent KAAWA (saab, 2026-09-26 et 27 ; categorie `kaah`,
// moteur/reglages.js) : couleurs de fond, coordonnees, selection, fleches et
// chevron, tailles, « Sélection sur bille ». Leurs commandes sont decrites
// dans une table (interface/reglages-champs.js), leur effet sur le plateau
// dans rendu/apparence-reglages.js — le meme qu'au demarrage. Rubriques
// repliables : interface/reglages-rubriques.js.
//
// Supprimer un profil (saab, 2026-09-26) : demande confirmation, et le bouton
// reste toujours ACTIF — sur « Défaut », il affiche une alerte au lieu de
// rien faire (CLAUDE.md : "rien d'important au survol seul", un bouton grise
// n'aurait rien dit du POURQUOI au doigt).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : REGLAGES_PAR_DEFAUT,
// fusionnerReglages (moteur/reglages.js), couleurVersHex (moteur/couleurs.js),
// actualiserCouleursPlateau (rendu/couleurs-plateau.js),
// appliquerApparenceReglages (rendu/apparence-reglages.js),
// remplirChampsReglages, brancherChampsReglages (interface/reglages-champs.js),
// demarrerRubriquesReglages (interface/reglages-rubriques.js),
// listerNomsProfils, lireNomProfilActif, lireReglagesActifs,
// sauverProfilActif, creerProfil, definirProfilActif, supprimerProfil,
// NOM_PROFIL_DEFAUT (interface/reglages-profils.js), rendreDeplacable,
// reinitialiserPosition (interface/deplacable.js), telechargerReglages,
// demarrerImportation (interface/fichiers.js) viennent de fichiers charges
// avant celui-ci dans index.html.

// `elements` : { bouton, dialogue, poignee, modeSimple, baseCoups,
// selectProfil, supprimerProfil, exporter, importer, defaut, annuler,
// sauverSous, fermer } — les couleurs, cases et curseurs, eux, sont trouves
// dans `dialogue` par leur id (interface/reglages-champs.js). `svg` :
// #plateau, pour appliquer les reglages en direct et nommer le fichier
// exporte. `decorFige` (rendu/cache-relief.js, figerLeDecor) :
// `{ forcerRedessin }` ou `undefined` (mode simple, ou navigateur sans
// ResizeObserver) — voir appliquerEnDirect. `demarrerRechargement`
// (index.html) : seul le mode simple (structurel) y a encore recours.
// `baseCoups` : { afficher(nom), charger(nom) } (interface/bases-coups.js).
function demarrerReglages(elements, svg, decorFige, demarrerRechargement, baseCoups) {
  let actuel = REGLAGES_PAR_DEFAUT;
  // Pile d'annulation (Annuler) : les etats d'AVANT chaque reglage change
  // depuis l'ouverture de la boite, ou depuis le dernier changement de
  // profil (chargerReglages la vide : un autre profil est un autre
  // "fichier", rien a annuler dedans). Jamais un simple "brouillon" a part :
  // chaque etat empile a deja ete reellement applique et enregistre.
  let pile = [];
  // Etat au debut d'un geste continu (glisser un curseur de couleur) : posee
  // par actualiserBrouillon au premier `input`, consommee par terminerGeste
  // au `change` qui suit — pour qu'Annuler revienne au debut du geste entier,
  // jamais a une valeur intermediaire du glissement.
  let avantGeste = null;

  function remplirFormulaire() {
    remplirChampsReglages(elements.dialogue, actuel);
    elements.modeSimple.checked = !actuel.board.show_shadows;
    baseCoups.afficher(actuel.nextmove.bdd_file);
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
  }

  // Recolore le plateau DEJA CONSTRUIT, sans jamais reconstruire ni
  // recharger — voir l'en-tete du fichier. Les degrades (billes, relief) se
  // recolorent ici ; tout le reste de l'aspect passe par le MEME
  // appliquerApparenceReglages qu'au demarrage (rendu/apparence-reglages.js).
  function appliquerEnDirect(reglages) {
    const couleursBilles = { black: couleurVersHex(reglages.colors.black), white: couleurVersHex(reglages.colors.white) };
    actualiserCouleursPlateau(svg, couleurVersHex(reglages.board.bg_color), couleurVersHex(reglages.board.hole_color), couleursBilles);
    decorFige?.forcerRedessin();
    appliquerApparenceReglages(svg, reglages);
    // Sans effet si c'est deja la base chargee (appele a chaque retouche).
    baseCoups.charger(reglages.nextmove.bdd_file);
  }

  // Chaque categorie modifiable est COPIEE : sans ca, une retouche ecrirait
  // dans l'objet de l'etat precedent (celui qu'Annuler doit retrouver).
  function modifierReglages(retouche) {
    return retouche({
      ...actuel,
      board: { ...actuel.board },
      colors: { ...actuel.colors },
      kaah: { ...actuel.kaah },
      nextmove: { ...actuel.nextmove },
    });
  }

  // Premier `input` d'un geste (glisser un curseur de couleur) : previsualise
  // tout de suite, sans encore toucher au profil ni a la pile — voir
  // terminerGeste, qui fait le reste une fois le geste fini.
  function actualiserBrouillon(retouche) {
    avantGeste ??= actuel;
    actuel = modifierReglages(retouche);
    appliquerEnDirect(actuel);
  }

  // Le geste est fini ('change', une fois le curseur relache — ou tout de
  // suite pour une case a cocher, qui n'a qu'un seul evenement) : enregistre
  // dans le profil actif (cree "set_kaah_<date>" tout seul si on partait de
  // Défaut) et empile l'etat D'AVANT LE GESTE ENTIER pour Annuler.
  function terminerGeste() {
    if (avantGeste === null) return;
    pile.push(avantGeste);
    avantGeste = null;
    sauverProfilActif(actuel);
    remplirProfils();
  }

  // Remplace TOUT d'un coup (Défaut, Annuler) : `nouveaux` a deja ete
  // choisi par l'appelant, jamais construit ici. Recharge la page si le
  // mode simple change (structurel) ; sinon applique en direct et
  // rafraichit le formulaire ENTIER (plusieurs champs a la fois, contrairement
  // a un seul geste de couleur). Enregistre toujours dans le profil actif.
  function remplacerReglages(nouveaux) {
    const structurel = nouveaux.board.show_shadows !== actuel.board.show_shadows;
    actuel = nouveaux;
    sauverProfilActif(actuel);
    if (structurel) {
      demarrerRechargement();
      return;
    }
    appliquerEnDirect(actuel);
    remplirFormulaire();
    remplirProfils();
  }

  // Charge un AUTRE profil (menu deroulant, Supprimer) : jamais d'ecriture
  // dans le profil qu'on vient de rendre actif (deja fait par
  // definirProfilActif/supprimerProfil), et une pile d'annulation VIDEE —
  // annuler n'a aucun sens d'un profil a l'autre.
  function chargerReglages(nouveaux) {
    pile = [];
    const structurel = nouveaux.board.show_shadows !== actuel.board.show_shadows;
    actuel = nouveaux;
    if (structurel) {
      demarrerRechargement();
      return;
    }
    appliquerEnDirect(actuel);
    remplirFormulaire();
    remplirProfils();
  }

  // Couleurs, cases a cocher et curseurs : une table (interface/reglages-champs.js).
  brancherChampsReglages(elements.dialogue, actualiserBrouillon, terminerGeste);
  demarrerRubriquesReglages(elements.dialogue);

  // Structurel (CLAUDE.md, 1 278 elements SVG contre 248) : jamais de
  // previsualisation en direct, un rechargement immediat s'impose.
  elements.modeSimple.addEventListener('change', () => {
    actuel = modifierReglages((r) => ((r.board.show_shadows = !elements.modeSimple.checked), r));
    sauverProfilActif(actuel);
    demarrerRechargement();
  });

  // Le choix de la base (a la main, ou apres un import/une suppression, voir
  // interface/bases-coups.js) : un reglage comme les autres.
  elements.baseCoups.addEventListener('change', () => {
    actualiserBrouillon((r) => ((r.nextmove.bdd_file = elements.baseCoups.value), r));
    terminerGeste();
  });

  elements.defaut.addEventListener('click', () => {
    pile.push(actuel);
    remplacerReglages(REGLAGES_PAR_DEFAUT);
  });

  // Annule le DERNIER reglage change (saab : "ne doit pas fermer la
  // boite") — jamais Fermer, voir plus bas.
  elements.annuler.addEventListener('click', () => {
    if (pile.length === 0) return;
    remplacerReglages(pile.pop());
  });

  elements.sauverSous.addEventListener('click', () => {
    const propose = lireNomProfilActif() === NOM_PROFIL_DEFAUT ? '' : lireNomProfilActif();
    const nom = window.prompt('Nom de ce profil de réglages :', propose);
    if (!nom) return; // boite annulee, ou nom vide : rien ne change
    creerProfil(nom, actuel);
    remplirProfils();
  });

  elements.fermer.addEventListener('click', () => elements.dialogue.close());

  elements.selectProfil.addEventListener('change', () => {
    definirProfilActif(elements.selectProfil.value);
    chargerReglages(lireReglagesActifs());
  });

  elements.supprimerProfil.addEventListener('click', () => {
    const nom = lireNomProfilActif();
    if (nom === NOM_PROFIL_DEFAUT) {
      window.alert('Le profil par défaut n\'est pas supprimable.');
      return;
    }
    if (!window.confirm(`Supprimer le profil « ${nom} » ?`)) return;
    supprimerProfil(nom);
    chargerReglages(lireReglagesActifs());
  });

  elements.exporter.addEventListener('click', () => telechargerReglages(actuel));

  elements.importer.addEventListener('click', () => {
    demarrerImportation(
      (donnees) => {
        pile.push(actuel);
        remplacerReglages(fusionnerReglages(donnees));
      },
      (message) => window.alert(message)
    );
  });

  rendreDeplacable(elements.dialogue, elements.poignee);

  elements.bouton.addEventListener('click', () => {
    actuel = lireReglagesActifs();
    pile = [];
    avantGeste = null;
    remplirFormulaire();
    remplirProfils();
    reinitialiserPosition(elements.dialogue);
    elements.dialogue.showModal();
  });
}
