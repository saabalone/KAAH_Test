// La boite ENTRAINEMENT / CEINTURE (phase 36 ; saab, 2026-10-10 : « il faut que ce
// soit simple et intuitif : je mets mon nom, je clique sur Variante/PZL qui affiche le
// tableau des ceintures, et dès que je clique visée ça m'affiche pour choisir »).
// Deux modes, une meme boite (saab : « en mode Entraînement on choisit la ceinture
// qu'on veut ... en mode Ceinture on aura la même chose mais avec les séries à
// réussir ») : le nom, Variantes ou PZL, le tableau des reglages, l'historique, et le
// tableau des ceintures du joueur, la ceinture ouverte montrant ses jeux proposes.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CEINTURES,
// KAA_PZL_SOLUTIONS (donnees/kaa-puzzles-solutions.js)
// typesDuJeu (moteur/entrainement.js), viserCeinture, ceinturesAConfirmer, tirerPropositions
// (moteur/entrainement-serie.js), reglesDeSerieDuGrade, nomsProposablesDuGrade,
// nombreDeJeuxProposes (moteur/entrainement-lecture.js),
// nomJoueurAutorise (moteur/nom-partie.js), estUnNomParDefaut (moteur/filtre-parties.js),
// afficherNomsConnus, retenirNomConnu, proprietaireCoche, definirProprietaire
// (interface/noms-connus.js), brancherSaisieNomJoueur (interface/noms-joueurs.js),
// demarrerReglagesEntrainement (interface/entrainement-reglages.js),
// reglagesDeLEntrainement (interface/profils-entrainement.js), parcoursDuJoueur,
// enregistrerParcours, propositionsDeLaCeinture, dernierJeuDEntrainement
// (interface/entrainement-partie.js), historiqueDEntrainement, bilanDeLaCeinture
// (interface/entrainement-historique.js), ligneDeCeinture, descriptionDuGrade,
// etatEnModeCeinture, htmlDesPropositions, etatsDesJeux, sensDuJeuChoisi,
// consigneDeLaCeinture (interface/entrainement-ceintures.js),
// colorerIconeEntrainement (interface/entrainement-icone.js), dessinerPlateau,
// poserBille (rendu/plateau-svg.js), dessinerEjectionsApercu (rendu/ejections-apercu.js),
// depuisNotation (moteur/plateau.js) viennent de fichiers charges avant celui-ci.

const CLE_JOUEUR_ENTRAINEMENT = 'kaah-entrainement-joueur';
const TITRES_DES_MODES = {
  entrainement: ['Entraînement', 'Choisissez une ceinture, un jeu, et jouez : pour vous exercer, sans rien perdre ni gagner.'],
  ceinture: ['Ceinture', 'Visez une ceinture et réussissez sa série pour l’obtenir.'],
};

// `elements` : { bouton (l'icone), choix ({ dialogue, entrainement, ceinture, fermer } :
// la boite du choix du mode), dialogue, titre, explication, champ, nomsConnus,
// proprietaire, message, onglets (data-sorte), boutonTableau, tableauReglages ({ dialogue,
// corps, fermer }), boutonHistorique, tableau, fermer } ; `variantes`, `puzzles` : ce qui
// existe ; `lancer(jeu, position)` ; `historique` : demarrerHistoriqueDEntrainement ;
// `ouvrirListe` : demarrerListesEntrainement (interface/entrainement-listes.js) ;
// `ouvrirCeinturesJeux` : demarrerCeinturesJeux
// (interface/entrainement-ceintures-jeux.js). Renvoie { ouvrir(mode) }.
function demarrerEntrainement(elements, variantes, puzzles, lancer, historique, ouvrirListe, ouvrirCeinturesJeux) {
  let mode = 'ceinture';
  let sorte = 'variantes';
  let ouverte = null; // la ceinture dont on voit les jeux
  let choisi = null; // le jeu touche, montre en image
  let tirages = new Map(); // mode Entrainement : les propositions, tirees a l'ouverture
  brancherSaisieNomJoueur(elements.champ);
  // Les types d'un jeu (moteur/entrainement.js), pour les quotas par type.
  const typesDUnJeu = (laSorte, nom) => {
    const jeu = (laSorte === 'variantes' ? variantes : puzzles).find((autre) => autre.nom === nom);
    return jeu ? typesDuJeu(laSorte, jeu) : [];
  };
  // Le tableau des reglages : il montre tout ; seule la version de travail le change
  // (saab : « ce tableau pourra rester dans _Test mais inactif »).
  const tableauReglages = demarrerReglagesEntrainement(elements.tableauReglages.corps, () => afficher(), {
    disposition: 'tableau',
    lectureSeule: !document.body.classList.contains('version-de-travail'),
    ouvrirListe,
    ouvrirCeinturesJeux,
    typesDUnJeu,
  });

  function joueur() {
    const nom = nomJoueurAutorise(elements.champ.value);
    return nom && !estUnNomParDefaut(nom) ? nom : null;
  }

  const tousLesJeux = () => (sorte === 'variantes' ? variantes : puzzles);

  const typesDe = (nom) => typesDUnJeu(sorte, nom);

  // Ce qu'un grade propose sur cet appareil (moteur/entrainement-lecture.js).
  const candidatsDe = (grade, reglages) => nomsProposablesDuGrade(reglages, grade, sorte, tousLesJeux(), KAA_PZL_SOLUTIONS);
  // Les PZL ajoutes aux ceintures deja acquises (interface/entrainement-nouveaux.js).
  const nouveauxPzl = (nom, reglages) => (sorte === 'pzl' ? nouveauxPzlAValider(nom, (grade) => candidatsDe(grade, reglages)) : []);

  function propositions(grade, reglages) {
    const regle = reglages.ceintures[grade][sorte] ?? {};
    // En Entrainement, a sa plus haute ceinture reussie : les nouveaux PZL imposes, meme
    // ceux ajoutes a une ceinture plus basse.
    const nouveaux = mode === 'entrainement' && joueur() && grade === parcoursDuJoueur(joueur(), sorte).ceinture ? nouveauxPzl(joueur(), reglages) : [];
    const candidats = [...new Set([...candidatsDe(grade, reglages), ...nouveaux])];
    const { imposes: imposesDuGrade = [], quotas = {} } = regle;
    const imposes = [...new Set([...imposesDuGrade, ...nouveaux])];
    const nombre = nombreDeJeuxProposes(reglages, grade, sorte);
    if (mode === 'ceinture') return propositionsDeLaCeinture(joueur(), sorte, grade, candidats, { imposes, quotas, typesDe }, nombre);
    const cle = `${sorte}|${grade}`;
    // Le jeu qu'on vient de jouer reste parmi les propositions (pour sa revanche).
    const garde = choisi && candidats.includes(choisi) ? [choisi] : [];
    if (!tirages.has(cle)) tirages.set(cle, tirerPropositions(candidats, { imposes: [...imposes, ...garde], quotas, typesDe }, nombre));
    return tirages.get(cle);
  }

  function afficherTableau(nom) {
    const reglages = reglagesDeLEntrainement();
    const parcours = parcoursDuJoueur(nom, sorte);
    const regles = reglesDeSerieDuGrade(reglages, parcours.cible ?? parcours.ceinture, sorte, typesDe, (grade) => candidatsDe(grade, reglages));
    const aConfirmer = parcours.aConfirmer ? ceinturesAConfirmer(parcours) : [];
    const nouveaux = nouveauxPzl(nom, reglages);
    const echapperSignal = (texte) => String(texte).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
    const lignes = CEINTURES.map((_, grade) => {
      const bilan = bilanDeLaCeinture(nom, mode, sorte, grade);
      const compte = mode === 'ceinture' ? (parcours.gagnes[grade]?.length ? `${parcours.gagnes[grade].length} gagné(s)` : '') : bilan.reussis + bilan.rates ? `<span class="resultat-reussi">${bilan.reussis} ✓</span> <span class="resultat-rate">${bilan.rates} ✗</span>` : '';
      const etat = mode === 'ceinture' ? etatEnModeCeinture(parcours, grade, regles, aConfirmer) : `<button class="bouton-dialogue${grade === ouverte ? ' bouton-actif' : ''}" type="button" data-ouvrir="${grade}">Choisir</button>`;
      const estOuverte = grade === ouverte && (mode === 'entrainement' || aConfirmer.includes(grade) || (grade === parcours.cible && !parcours.aConfirmer));
      const vue = { mode, sorte };
      const jeux = estOuverte ? etatsDesJeux(vue, grade, parcours, regles, propositions(grade, reglages), reglages.ceintures[grade][sorte]?.imposes ?? []) : [];
      const sens = choisi ? sensDuJeuChoisi(vue, grade, parcours, choisi, jeux.find((jeu) => jeu.nom === choisi)?.etat ?? 'libre') : [];
      const html = estOuverte ? htmlDesPropositions({ sorte, grade, consigne: consigneDeLaCeinture(vue, grade, parcours, regles), jeux, choisi, sens }) : '';
      const signal = grade === parcours.ceinture ? signalDesNouveauxPzl(nouveaux, echapperSignal) : '';
      return ligneDeCeinture({ grade, description: descriptionDuGrade(reglages, grade, sorte, candidatsDe(grade, reglages).length) + signal, etat, compte, ouverte: estOuverte, propositions: html });
    });
    elements.tableau.innerHTML = `<table class="tableau-historique tableau-ceintures">${lignes.join('')}</table>`;
    dessinerApercu();
  }

  // L'image du jeu touche (meme principe que les Variantes : un <svg> a part).
  function dessinerApercu() {
    const svg = elements.tableau.querySelector('#apercu-entrainement');
    const jeu = tousLesJeux().find((autre) => autre.nom === choisi);
    if (!svg || !jeu) return;
    dessinerPlateau(svg);
    for (const [notation, bille] of Object.entries(jeu.position.plateau)) poserBille(svg, { id: `apercu-entr-${bille.id}`, ...depuisNotation(notation), couleur: bille.couleur });
    dessinerEjectionsApercu(svg, jeu.position.billesEjecteesNoires, jeu.position.billesEjecteesBlanches);
    svg.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function afficher() {
    const [titre, explication] = TITRES_DES_MODES[mode];
    elements.titre.textContent = titre;
    elements.explication.textContent = explication;
    for (const onglet of elements.onglets) onglet.classList.toggle('actif', onglet.dataset.sorte === sorte);
    const nom = joueur();
    elements.proprietaire.checked = Boolean(nom) && nom === proprietaireCoche();
    elements.proprietaire.disabled = !nom;
    colorerIconeEntrainement(elements.bouton);
    elements.message.hidden = Boolean(nom);
    elements.tableau.hidden = !nom;
    if (nom) afficherTableau(nom);
  }

  elements.tableau.addEventListener('click', (evenement) => {
    const cible = evenement.target.closest('[data-viser], [data-ouvrir], [data-jeu], [data-sens]');
    if (!cible || !joueur()) return;
    if (cible.dataset.sens) return lancerLeJeu(cible);
    if (cible.dataset.jeu) choisi = cible.dataset.jeu;
    else {
      const grade = Number(cible.dataset.viser ?? cible.dataset.ouvrir);
      if (cible.dataset.viser) enregistrerParcours(joueur(), sorte, viserCeinture(parcoursDuJoueur(joueur(), sorte), grade));
      ouverte = ouverte === grade && cible.dataset.ouvrir ? null : grade;
      choisi = null;
    }
    afficher();
  });

  function lancerLeJeu(bouton) {
    const position = tousLesJeux().find((jeu) => jeu.nom === bouton.dataset.nom);
    if (!position) return;
    try {
      window.localStorage.setItem(CLE_JOUEUR_ENTRAINEMENT, joueur());
    } catch {
      // le nom sera simplement a retaper
    }
    retenirNomConnu(joueur());
    elements.dialogue.close();
    lancer({ joueur: joueur(), mode, sorte, ceinture: Number(bouton.dataset.ceinture), sens: bouton.dataset.sens }, position);
  }

  for (const onglet of elements.onglets) {
    onglet.addEventListener('click', () => {
      sorte = onglet.dataset.sorte;
      ouverte = choisi = null;
      afficher();
    });
  }
  elements.champ.addEventListener('input', afficher);
  elements.proprietaire.addEventListener('change', () => {
    definirProprietaire(elements.proprietaire.checked ? joueur() : null);
    afficher();
  });
  elements.boutonTableau.addEventListener('click', () => {
    tableauReglages.afficher();
    elements.tableauReglages.dialogue.showModal();
  });
  // Fermer (ou Echap) : jamais en laissant des retouches pas validees sans le dire.
  elements.tableauReglages.fermer.addEventListener('click', () => {
    if (tableauReglages.peutFermer()) elements.tableauReglages.dialogue.close();
  });
  elements.tableauReglages.dialogue.addEventListener('cancel', (evenement) => {
    if (!tableauReglages.peutFermer()) evenement.preventDefault();
  });
  elements.boutonHistorique.addEventListener('click', () => historique.ouvrir(joueur()));
  elements.fermer.addEventListener('click', () => elements.dialogue.close());

  // Ouvre la boite dans `mode` : le dernier joueur, et la ceinture du dernier jeu de ce
  // mode (en Entrainement : la derniere essayee, la blanche au depart).
  function ouvrir(nouveauMode) {
    mode = nouveauMode;
    try {
      elements.champ.value = window.localStorage.getItem(CLE_JOUEUR_ENTRAINEMENT) ?? '';
    } catch {
      elements.champ.value = '';
    }
    const dernier = dernierJeuDEntrainement();
    const memeMode = dernier && (dernier.mode ?? 'ceinture') === mode;
    if (memeMode) sorte = dernier.sorte;
    const essaye = joueur() ? historiqueDEntrainement(joueur()).find((ligne) => ligne.mode === 'entrainement' && ligne.sorte === sorte) : null;
    ouverte = memeMode ? dernier.ceinture : mode === 'entrainement' ? essaye?.ceinture ?? 0 : null;
    choisi = memeMode ? dernier.nom : null;
    tirages = new Map();
    afficherNomsConnus(elements.nomsConnus, elements.champ);
    afficher();
    elements.dialogue.showModal();
  }

  // L'icone : le choix du mode, avec ce qui les distingue.
  colorerIconeEntrainement(elements.bouton);
  elements.bouton.addEventListener('click', () => elements.choix.dialogue.showModal());
  for (const choixDuMode of ['entrainement', 'ceinture']) {
    elements.choix[choixDuMode].addEventListener('click', () => {
      elements.choix.dialogue.close();
      ouvrir(choixDuMode);
    });
  }
  elements.choix.fermer.addEventListener('click', () => elements.choix.dialogue.close());
  return { ouvrir };
}
