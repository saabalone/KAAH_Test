// Dialogue "Mes parties" (Phase 12, suite ; apercu et confirmation de
// reprise ajoutes plus tard, meme phase) : toutes les parties jouees,
// chacune sauvegardee automatiquement (voir interface/sauvegarde.js) —
// aucun geste manuel pour qu'une partie y apparaisse, saab a signale que
// ça n'avait pas de sens d'en demander un en plus de la sauvegarde
// automatique. L'equivalent, adapte au navigateur, des dossiers
// game_my/game_corr de KAAWA. Volontairement UNE SEULE liste pour
// l'instant : les puzzles et la correspondance n'existent pas encore
// comme fonctionnalites (phases 15 et 24) — construire des listes vides
// pour elles serait de l'abstraction prematuree (CLAUDE.md). Le meme
// mecanisme pourra leur servir le jour venu, sans rien changer ici.
//
// APERCU ET CONFIRMATION EN 2 CLICS, meme principe qu'interface/variantes.js
// (et interface/puzzles.js) — demande par saab, "idem que pour les
// Variantes/PZL" : un premier clic sur une ligne la previsualise (position
// a la FIN DE LA BRANCHE PRINCIPALE, `arbre.cheminOrigine` — jamais une
// branche d'essai), un second clic sur cette meme ligne OU un clic sur
// l'apercu confirme.
//
// SUPPRESSION DE PLUSIEURS PARTIES (saab : les supprimer une par une etait
// penible, surtout pour vider la liste avant de donner KAAH a des testeurs) :
// une case a cocher par ligne (`stopPropagation` : cocher ne doit ni
// previsualiser ni charger la ligne, meme raison que le bouton favori de
// variantes.js), puis "Supprimer la selection", qui demande confirmation
// dans la boite verte habituelle — jamais une boite native du navigateur.
// Cocher tout puis decocher celles qu'on garde fait donc « tout supprimer
// sauf... ». La partie EN COURS peut etre supprimee aussi : elle continue de
// se jouer, et se resauvegarde comme une nouvelle entree au prochain coup.
//
// CORRIGE (saab : "remplacer les 2 btn Tout select/deselect par un btn
// carre... et qu'on peut deplier pour choisir quel type de partie" — les
// deux boutons "Tout selectionner"/"Tout deselectionner" prenaient une
// place que la jauge, deplacee ici depuis "Réglages", reclamait) : une
// SEULE case a cocher (`caseTout`, meme case que celles des lignes) —
// cochee, elle selectionne tout ce qui correspond au FILTRE choisi ;
// decochee, elle vide la selection entiere. A cote, un bouton ▶/▼ (meme
// idiome que la Sequence, rendu/arbre-ligne.js) deplie un petit panneau qui
// choisit ce filtre : "Toutes" ou "Avec branches" (le prefixe `Br_` de
// moteur/nom-partie.js, deja reel aujourd'hui — jamais un type invente
// comme "My", qui n'existe pas encore, CLAUDE.md, pas d'abstraction
// prematuree).
//
// CONFIRMATION DE REPRISE (ouvrirPourConfirmationReprise, appelee par
// index.html seulement si une partie est reprise automatiquement au
// demarrage) : saab a signale qu'une reprise silencieuse peut donner
// l'impression, si on n'y prete pas attention, de demarrer une partie
// neuve — "il faudrait mettre un popup qui avertit qu'on est sur la
// partie en cours". Plutot qu'une popup separee, ce MEME dialogue
// s'ouvre directement previsualise sur la partie active ("mieux mettre
// le popup des parties sauvegardees, avec le focus sur la derniere en
// cours"), confirmer par la ligne ou l'apercu revient a valider — ou a
// charger une AUTRE partie choisie dans la liste a la place, exactement
// le meme geste que pour n'importe quelle autre ouverture du dialogue.
//
// CORRIGE (saab : "si je clic Fermer, c'est comme si j'avais clic la
// partie en cours, ce n'est pas bon") : la partie active est deja chargee
// AVANT meme que ce dialogue existe (index.html lit `chargerPartieActive`
// tout en haut du script) — un simple `dialogue.close()` sur "Fermer" ne
// changeait donc rien, la reprise restait acquise qu'on l'ait "refusee"
// ou pas. Ce bouton se renomme desormais "Refuser" UNIQUEMENT pendant une
// confirmation de reprise (`modeConfirmationReprise`, jamais lors d'une
// ouverture manuelle depuis la colonne de gauche) et charge alors
// explicitement la partie par defaut (Marguerite Belge) — exactement le
// meme geste que "Nouvelle partie" (voir index.html,
// #bouton-nouvelle-partie) : oublier la partie active, puis recharger.
//
// Reconstruit entierement a chaque rafraichissement (innerHTML) : rien
// n'est anime ni ne garde d'etat entre deux ouvertures, contrairement au
// plateau (voir CLAUDE.md, interdiction de reconstruire LE PLATEAU par
// innerHTML — cette regle ne vise pas cette liste, ni l'apercu qui est un
// <svg> totalement independant du plateau principal).
//
// Pas d'import ni d'export (voir moteur/plateau.js) :
// listerPartiesEnregistrees, obtenirIdPartieActive, definirIdPartieActive,
// oublierPartieActive, supprimerPartieNommee, definirRepriseDejaConfirmee
// (interface/sauvegarde.js), nomDeFichierKAAWA, possedeUneBranche
// (moteur/nom-partie.js), donneesVersArbre (moteur/sauvegarde.js), noeudA
// (moteur/arbre.js), dessinerPlateau, poserBille (rendu/plateau-svg.js),
// dessinerEjectionsApercu (rendu/ejections-apercu.js), depuisNotation
// (moteur/plateau.js) et envoyerALaCorbeille (interface/corbeille.js,
// phase 26) viennent tous des fichiers charges avant celui-ci dans
// index.html.

// `elements` : { bouton, dialogue, apercu, liste, fermer, message,
// caseTout, boutonFiltre, panneauFiltre, supprimer }.
// `message` est optionnel (texte d'avertissement affiche seulement pour
// une confirmation de reprise, voir l'en-tete du fichier).
// `demarrerRechargement` (index.html) : a appeler pour CHAQUE
// `location.reload()`, jamais un rechargement nu ici — pose un drapeau
// que l'ecouteur `visibilitychange` d'index.html verifie AVANT de
// resauvegarder une derniere fois (voir index.html : sans ce drapeau,
// une confirmation de reprise pouvait ecraser la partie qu'on vient de
// choisir avec l'ancien arbre encore en memoire).
// `demanderConfirmation` (interface/confirmation.js) : CORRIGE (saab,
// signale juste apres la meme securite ajoutee sur "Nouvelle partie" —
// "si on clic sur un des 3 btn pendant qu'on a une partie en cours, elle
// est remplacee, il faut faire la meme securite") : charger une AUTRE
// partie que celle deja active demande desormais confirmation, SEULEMENT
// si une partie est deja en cours (rien a perdre sinon).
// `surSuppression` (facultatif, phase 12ter) : appele apres toute suppression
// — la jauge du nombre de parties (interface/jauge-mes-parties.js) s'en sert
// pour se mettre a jour sans attendre le prochain coup joue ailleurs.
function demarrerListeParties(elements, demarrerRechargement, demanderConfirmation, surSuppression) {
  // Identifiant (pas l'objet) de l'entree previsualisee : `parties` est
  // relu a chaque rafraichissement depuis localStorage (JSON.parse produit
  // a chaque fois de TOUT NOUVEAUX objets), une comparaison par reference
  // comme celle de variantes.js (tableau statique, lui) casserait donc des
  // le premier rafraichissement suivant la previsualisation.
  let idPrevisualise = null;
  // Vrai UNIQUEMENT entre un ouvrirPourConfirmationReprise() et la
  // fermeture du dialogue (voir l'en-tete du fichier) : c'est ce qui
  // renomme "Fermer" en "Refuser" et change ce que ce bouton fait.
  let modeConfirmationReprise = false;
  // Identifiants des parties cochees pour suppression (voir l'en-tete du
  // fichier). Toujours vide a l'ouverture : une selection ne survit pas a la
  // fermeture du dialogue.
  let idsSelectionnes = new Set();
  // Le filtre choisi dans le panneau ▶/▼ (voir l'en-tete du fichier) : ce que
  // `caseTout` selectionne quand on la coche. Ne change jamais la selection
  // deja faite tout seul — seulement ce qu'un PROCHAIN clic sur la case fera.
  let filtreSelection = 'toutes';

  elements.bouton.addEventListener('click', () => {
    modeConfirmationReprise = false;
    elements.fermer.textContent = 'Fermer';
    idPrevisualise = null;
    idsSelectionnes = new Set();
    // Le filtre et son panneau ne survivent pas non plus a la fermeture,
    // meme raison que la selection.
    filtreSelection = 'toutes';
    elements.panneauFiltre.querySelector('input[value="toutes"]').checked = true;
    elements.panneauFiltre.hidden = true;
    elements.boutonFiltre.textContent = '▶';
    afficherMessage(null);
    rafraichir();
    elements.dialogue.showModal();
  });
  elements.fermer.addEventListener('click', () => {
    if (modeConfirmationReprise) {
      refuserReprise();
      return;
    }
    elements.dialogue.close();
  });

  // "Refuser" une confirmation de reprise : jamais juste fermer le
  // dialogue (voir l'en-tete du fichier, pourquoi ça ne suffit pas) —
  // charge la partie par defaut, exactement comme "Nouvelle partie".
  function refuserReprise() {
    oublierPartieActive();
    demarrerRechargement();
  }

  // Les entrees que `caseTout` doit cocher, selon le filtre choisi.
  function partiesFiltrees() {
    const parties = listerPartiesEnregistrees();
    return filtreSelection === 'branches' ? parties.filter((entree) => possedeUneBranche(entree.donnees.Tree)) : parties;
  }

  // Remplace "Tout selectionner"/"Tout deselectionner" (saab, voir l'en-tete
  // du fichier) : cochee, selectionne tout ce qui correspond au filtre ;
  // decochee, vide la selection entiere (jamais seulement le filtre — un
  // reclic doit vraiment tout desectionner, meme des parties cochees a la
  // main hors filtre).
  elements.caseTout.addEventListener('change', () => {
    idsSelectionnes = elements.caseTout.checked ? new Set(partiesFiltrees().map((entree) => entree.id)) : new Set();
    rafraichir();
  });

  // Panneau du filtre, replie par defaut : meme idiome ▶/▼ que la Sequence
  // (rendu/arbre-ligne.js) pour deplier/replier.
  elements.boutonFiltre.addEventListener('click', () => {
    elements.panneauFiltre.hidden = !elements.panneauFiltre.hidden;
    elements.boutonFiltre.textContent = elements.panneauFiltre.hidden ? '▶' : '▼';
  });
  for (const radio of elements.panneauFiltre.querySelectorAll('input[name="filtre-selection-parties"]')) {
    radio.addEventListener('change', () => {
      if (radio.checked) filtreSelection = radio.value;
    });
  }

  elements.supprimer.addEventListener('click', () => {
    const ids = [...idsSelectionnes];
    if (ids.length === 0) return;
    const contientLaPartieEnCours = ids.includes(obtenirIdPartieActive());
    demanderConfirmation(
      `Supprimer ${ids.length} partie${ids.length > 1 ? 's' : ''} ?${contientLaPartieEnCours ? ' La partie en cours en fait partie.' : ''} Elle${ids.length > 1 ? 's' : ''} ira${ids.length > 1 ? 'ont' : ''} dans la corbeille.`,
      () => supprimerSelection(ids),
      'Supprimer'
    );
  });

  // Phase 26 (corbeille) : chaque partie supprimee y part intacte AVANT
  // d'etre retiree de "Mes parties" — envoyerALaCorbeille (interface/
  // corbeille.js) vient d'un fichier charge avant celui-ci dans index.html.
  // Une partie dont la mise en corbeille echoue (stockage plein) n'est pas
  // supprimee : mieux vaut la garder que la perdre sans recours.
  function supprimerSelection(ids) {
    const parties = listerPartiesEnregistrees();
    for (const id of ids) {
      const entree = parties.find((partie) => partie.id === id);
      if (entree && envoyerALaCorbeille('parties', entree)) supprimerPartieNommee(id);
    }
    if (ids.includes(idPrevisualise)) {
      idPrevisualise = null;
      elements.apercu.innerHTML = '';
    }
    idsSelectionnes = new Set();
    rafraichir();
    surSuppression?.();
  }

  // Le bouton "Supprimer la selection" dit combien de parties il va
  // supprimer, et reste grise tant qu'aucune n'est cochee. `caseTout` reflete
  // l'etat REEL de la selection (coche seule si TOUT le filtre courant est
  // deja selectionne, "indeterminee" — le tiret natif du navigateur — pour
  // une selection partielle) plutot que de garder son propre etat a part,
  // qui aurait pu se desynchroniser d'une case cochee a la main.
  function actualiserBarre() {
    const n = idsSelectionnes.size;
    elements.supprimer.disabled = n === 0;
    elements.supprimer.textContent = n === 0 ? 'Supprimer la sélection' : `Supprimer la sélection (${n})`;
    const filtrees = partiesFiltrees();
    elements.caseTout.disabled = filtrees.length === 0;
    elements.caseTout.checked = filtrees.length > 0 && filtrees.every((entree) => idsSelectionnes.has(entree.id));
    elements.caseTout.indeterminate = n > 0 && !elements.caseTout.checked;
  }

  // Cliquer l'APERCU vaut confirmation, meme idee que pour Variantes/PZL.
  elements.apercu.addEventListener('click', () => {
    const entree = listerPartiesEnregistrees().find((e) => e.id === idPrevisualise);
    if (entree) confirmer(entree);
  });

  function rafraichir() {
    elements.liste.innerHTML = '';
    const parties = listerPartiesEnregistrees();
    // Une partie supprimee ailleurs ne doit pas rester "cochee" a notre insu.
    const idsExistants = new Set(parties.map((entree) => entree.id));
    idsSelectionnes = new Set([...idsSelectionnes].filter((id) => idsExistants.has(id)));
    actualiserBarre();
    if (parties.length === 0) {
      const vide = document.createElement('p');
      vide.textContent = "Aucune partie jouée pour l'instant.";
      elements.liste.appendChild(vide);
      return;
    }
    const idActif = obtenirIdPartieActive();
    // La plus recente en premier : plus simple a retrouver que d'avoir a
    // faire defiler jusqu'au bout a chaque fois.
    for (const entree of [...parties].reverse()) {
      elements.liste.appendChild(creerLigne(entree, entree.id === idActif));
    }
    garderLaLigneChoisieEnVue();
  }

  // Meme correctif que interface/variantes.js, garderLaLigneChoisieEnVue :
  // la ligne previsualisee doit rester visible sans avoir a la rechercher,
  // surtout au tout premier affichage d'une confirmation de reprise (la
  // partie active peut etre tres bas dans une longue liste).
  function garderLaLigneChoisieEnVue() {
    const ligne = elements.liste.querySelector('.ligne-partie-previsualisee');
    if (!ligne) return;
    const cadreListe = elements.liste.getBoundingClientRect();
    const cadreLigne = ligne.getBoundingClientRect();
    if (cadreLigne.top < cadreListe.top) {
      elements.liste.scrollTop -= cadreListe.top - cadreLigne.top;
    } else if (cadreLigne.bottom > cadreListe.bottom) {
      elements.liste.scrollTop += cadreLigne.bottom - cadreListe.bottom;
    }
  }

  function creerLigne(entree, estActive) {
    const estPrevisualisee = entree.id === idPrevisualise;
    const ligne = document.createElement('div');
    ligne.className = estPrevisualisee ? 'ligne-liste ligne-partie ligne-partie-previsualisee' : 'ligne-liste ligne-partie';

    const coche = document.createElement('input');
    coche.type = 'checkbox';
    coche.className = 'case-partie';
    coche.checked = idsSelectionnes.has(entree.id);
    coche.title = 'Cocher pour supprimer';
    // Cocher ne previsualise ni ne charge la ligne (voir l'en-tete du fichier).
    coche.addEventListener('click', (evenement) => evenement.stopPropagation());
    coche.addEventListener('change', () => {
      if (coche.checked) idsSelectionnes.add(entree.id);
      else idsSelectionnes.delete(entree.id);
      actualiserBarre();
    });
    ligne.appendChild(coche);

    const texte = document.createElement('span');
    texte.className = 'ligne-liste-texte';
    texte.textContent = nomAffiche(entree.donnees);
    ligne.appendChild(texte);

    if (estActive) {
      const label = document.createElement('span');
      label.className = 'ligne-partie-label';
      label.textContent = 'en cours';
      ligne.appendChild(label);
    }

    ligne.addEventListener('click', () => {
      if (estPrevisualisee) {
        confirmer(entree);
        return;
      }
      idPrevisualise = entree.id;
      afficherApercu(entree);
      rafraichir(); // remet en evidence la ligne previsualisee
    });

    return ligne;
  }

  // Confirme `entree` : la marque active puis ferme le dialogue. Un
  // rechargement de page n'a de sens que pour charger une AUTRE partie que
  // celle deja affichee — confirmer la partie deja active (le cas normal
  // d'une confirmation de reprise) ne fait donc que fermer le dialogue,
  // sans rien recharger pour rien.
  //
  // CORRIGE (saab : "je clic sur l'image de la partie choisie, elle
  // revient et je dois clic une seconde fois pour l'avoir sur le
  // plateau") : `definirRepriseDejaConfirmee()` avant de recharger — sans
  // ça, la partie qu'on vient tout juste de choisir ICI redevenait "la
  // partie active a reprendre au demarrage" comme n'importe quelle autre,
  // et index.html rouvrait AUSSITOT ce meme dialogue par-dessus pour la
  // "confirmer" une seconde fois — un second clic pour rien, on vient
  // deja de le faire. Voir interface/sauvegarde.js pour le detail.
  function confirmer(entree) {
    const idActifAvant = obtenirIdPartieActive();
    elements.dialogue.close();
    if (entree.id === idActifAvant) return; // deja la partie active : rien a recharger

    const chargerVraiment = () => {
      definirIdPartieActive(entree.id);
      definirRepriseDejaConfirmee();
      demarrerRechargement();
    };
    // Une partie DEJA en cours serait sinon remplacee sans avertissement
    // (voir l'en-tete du fichier) — rien a demander si la partie active
    // est encore vierge (rien a perdre).
    if (idActifAvant) {
      demanderConfirmation(
        'Charger cette partie ? La partie en cours restera dans Mes parties, mais vous n\'y serez plus.',
        chargerVraiment,
        'Charger'
      );
    } else {
      chargerVraiment();
    }
  }

  // Dessine `entree` (donnees au format export, voir moteur.arbreVersDonnees)
  // dans l'apercu : la position a la fin de la branche REELLEMENT jouee
  // (`cheminOrigine`), jamais une branche d'exploration ni forcement la
  // position ou l'arbre a ete laisse (une partie rouverte au milieu de son
  // arbre reprend au bout de l'origine, voir moteur.donneesVersArbre).
  // Protege par try/catch comme nomAffiche ci-dessous : une entree
  // corrompue affiche un apercu vide plutot que de faire planter le
  // dialogue entier.
  function afficherApercu(entree) {
    elements.apercu.innerHTML = '';
    dessinerPlateau(elements.apercu);
    try {
      const arbre = donneesVersArbre(entree.donnees);
      const etatFin = noeudA(arbre, arbre.cheminOrigine).etat;
      for (const [notation, bille] of Object.entries(etatFin.plateau)) {
        const { q, r } = depuisNotation(notation);
        poserBille(elements.apercu, { id: `apercu-partie-${bille.id}`, q, r, couleur: bille.couleur });
      }
      dessinerEjectionsApercu(elements.apercu, etatFin.billesEjecteesNoires, etatFin.billesEjecteesBlanches);
    } catch {
      // Rien de plus a dessiner : voir nomAffiche, meme philosophie.
    }
  }

  function afficherMessage(texte) {
    if (!elements.message) return;
    elements.message.hidden = !texte;
    elements.message.textContent = texte ?? '';
  }

  // Le nom de la partie, exactement comme KAAWA l'ecrirait lui-meme (voir
  // moteur/nom-partie.js — saab a demande cette convention precise
  // plutot qu'un resume invente). Une partie illisible (fichier corrompu
  // a la main) affiche un repli plutot que de faire planter toute la
  // liste pour une seule entree en cause.
  function nomAffiche(donnees) {
    try {
      return nomDeFichierKAAWA(donnees);
    } catch {
      return `${donnees.VariantName ?? 'Partie'} (illisible)`;
    }
  }

  // Appelee par index.html, seulement si une partie a ete reprise
  // automatiquement au demarrage (voir l'en-tete du fichier) : ouvre ce
  // dialogue deja previsualise sur la partie active, avertissement en
  // plus. Ne fait rien si, pour une raison ou une autre, l'entree active
  // a disparu (jamais vu en pratique, mais un dialogue vide et confus
  // vaudrait moins bien que ne rien ouvrir du tout).
  function ouvrirPourConfirmationReprise() {
    const idActif = obtenirIdPartieActive();
    const entree = listerPartiesEnregistrees().find((e) => e.id === idActif);
    if (!entree) return;
    modeConfirmationReprise = true;
    elements.fermer.textContent = 'Refuser';
    idPrevisualise = entree.id;
    afficherMessage(`Vous reprenez la partie en cours : ${nomAffiche(entree.donnees)}`);
    afficherApercu(entree);
    rafraichir();
    elements.dialogue.showModal();
  }

  // La position de depart de la partie previsualisee (texte compresse), ou null :
  // « Créer partie » (phase 23) part d'elle. Meme protection que afficherApercu.
  function positionDeDepartPrevisualisee() {
    const entree = listerPartiesEnregistrees().find((e) => e.id === idPrevisualise);
    if (!entree) return null;
    try {
      return ecrirePosition(donneesVersArbre(entree.donnees).racine.etat);
    } catch {
      return null;
    }
  }

  return { ouvrirPourConfirmationReprise, positionDeDepartPrevisualisee };
}
