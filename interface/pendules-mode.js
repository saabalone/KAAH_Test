// Le popup de choix du mode de pendule (phase 22bis, PLAN.md) : Chrono,
// Pendule (Bonus) ou Pendule (Délai), puis ses reglages numeriques. Utilise
// deux fois par index.html, dans deux CONTEXTES differents mais avec la
// MEME boite :
//   - a la creation d'une partie neuve (bouton "Nouvelle partie") : les
//     reglages choisis partent avec `definirPositionDepartSuivante` (comme
//     Revanche/Same) pour survivre au rechargement de page qui suit ;
//   - depuis le bouton dedie de la colonne de gauche, en cours de partie :
//     les reglages choisis passent directement a
//     `partie.changerModePendule` (interface/saisie.js), sans recharger,
//     pour ne jamais perdre le temps deja ecoule (moteur/pendules.js,
//     changerModePendules).
//   - a chaque debut de partie (variante, puzzle) depuis les phase 26/27,
//     demande de saab le 2026-09-25 : plus reserve au seul bouton
//     "Nouvelle partie".
// Ce fichier ne sait rien de ses appelants : `ouvrir(valeurs)` renvoie une
// Promise des reglages AFFICHES au moment de la fermeture (Valider, Fermer,
// Echap ou un clic en dehors — jamais `null`, voir plus bas), a eux de
// decider quoi en faire.
//
// Noir et Blanc differents (saab, 2026-10-09 : « mettre des coches pour chaque
// joueur dans Pendule, pour régler différemment chacune, par défaut les 2
// identiques ») : une case ouvre une seconde colonne de champs, ceux de Blanc
// (moteur/pendules.js, `camps`) ; le mode reste commun.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : reglagesDuCamp
// (moteur/pendules.js) vient d'un fichier charge avant celui-ci ; lireReglagesActifs
// (interface/reglages-profils.js) ne sert qu'une fois la page chargee.

// Valeur par defaut d'un champ numerique laisse vide ou invalide : jamais
// NaN dans un reglage (romprait le calcul des pendules, moteur/pendules.js).
function nombrePositifOuDefaut(valeurBrute, valeurParDefaut) {
  const nombre = Number(valeurBrute);
  return Number.isFinite(nombre) && nombre >= 0 ? nombre : valeurParDefaut;
}

// Memes valeurs par defaut que REGLAGES_PENDULES_PAR_DEFAUT (index.html,
// KAAWA) : servent ici a la fois de pre-remplissage (un champ jamais
// renseigne pour ce mode) et de repli (un champ vide ou invalide).
const TEMPS_INITIAL_PAR_DEFAUT = 300;
const BONUS_PAR_COUP_PAR_DEFAUT = 2;
const BONUS_PAR_EJECTION_PAR_DEFAUT = 0;
const DELAI_PAR_COUP_PAR_DEFAUT = 5;

// `elements` : { dialogue, boutonChrono, boutonBonus, boutonDelai,
// sectionTemps, sectionBonus, sectionDelai, tempsInitial, bonusParCoup,
// bonusParEjection, delaiParCoup, campsDifferents (la case), blanc ({ tempsInitial,
// bonusParCoup, bonusParEjection, delaiParCoup } : les champs de Blanc), horizontales (la case
// « Pendules et Occ à l'horizontale », facultative), annuler, valider, fermer }.
//
// Fermer LA BOITE (Valider, Fermer, ou un clic en dehors — interface/
// fermeture-dialogues.js) applique toujours les reglages AFFICHES, jamais
// seulement ceux d'un Valider explicite (demande de saab : "on peut
// commencer la partie avec les reglages affiches ... vaut mieux les 2
// facons"). Annuler n'a donc plus besoin de fermer la boite ni de tout
// annuler : il revient seulement aux reglages d'AVANT cette ouverture, sans
// fermer (comme .Annuler de la boite Reglages) — Fermer, lui, ferme sans
// rien changer de plus.
//
// `choixJoueurs` (phases 29 et 32, interface/choix-joueurs.js) : la rubrique
// « Joueurs » de la meme boite, montree seulement au DEBUT d'une partie
// (`ouvrir(valeurs, { avecAdversaire: true })`) — jamais pour un changement de
// mode en cours de partie. Les reglages rendus portent alors aussi
// `machines` ({ noir, blanc }, null entre humains).
//
// `changerLesPendulesHorizontales(valeur)` (saab, 2026-10-23 : « boite Mode pendule, ajouter le btn
// Pendule/Occ horizontal ») : le reglage de Reglages > Affichage redessine le plateau (la page se
// recharge) — applique seulement une fois la boite fermee, la partie deja lancee (elle reprend).
function demarrerChoixModePendules(elements, choixJoueurs, changerLesPendulesHorizontales = null) {
  let modeChoisi = null;
  let resoudre = null;
  let valeursOuverture = null;
  let avecAdversaire = false;

  // Affiche/masque les sections numeriques selon le mode : Chrono n'en a
  // aucune (rien a regler, il ne fait jamais perdre), Bonus et Delai
  // partagent le temps initial mais pas le reste.
  function choisirMode(nouveauModeChoisi) {
    modeChoisi = nouveauModeChoisi;
    elements.boutonChrono.classList.toggle('bouton-actif', modeChoisi === 'chrono');
    elements.boutonBonus.classList.toggle('bouton-actif', modeChoisi === 'bonus');
    elements.boutonDelai.classList.toggle('bouton-actif', modeChoisi === 'delai');
    elements.sectionTemps.hidden = modeChoisi === 'chrono';
    elements.sectionBonus.hidden = modeChoisi !== 'bonus';
    elements.sectionDelai.hidden = modeChoisi !== 'delai';
  }

  // Les champs de Blanc ne se montrent qu'avec la case ; la cocher part de
  // reglages identiques (ceux de Noir).
  function montrerLesCamps() {
    elements.dialogue.classList.toggle('pendules-par-camp', elements.campsDifferents.checked);
  }
  elements.campsDifferents.addEventListener('change', () => {
    if (elements.campsDifferents.checked) {
      for (const cle of ['tempsInitial', 'bonusParCoup', 'bonusParEjection', 'delaiParCoup']) elements.blanc[cle].value = elements[cle].value;
    }
    montrerLesCamps();
  });

  // Un CLIC sur un bouton de mode (par opposition au pre-remplissage
  // initial de `ouvrir`, plus bas) recharge des valeurs par defaut
  // raisonnables dans les champs de CE mode : sans ca, passer de Delai a
  // Bonus dans la boite affichait "Coup+0 Éject+0" (les champs Bonus,
  // jamais servis par Delai, restaient a leur zero d'origine) — un choix
  // qu'on n'a jamais fait, pas un vrai reglage a zero.
  function choisirModeDepuisClic(nouveauModeChoisi) {
    if (nouveauModeChoisi === 'bonus') {
      elements.bonusParCoup.value = BONUS_PAR_COUP_PAR_DEFAUT;
      elements.bonusParEjection.value = BONUS_PAR_EJECTION_PAR_DEFAUT;
    } else if (nouveauModeChoisi === 'delai') {
      elements.delaiParCoup.value = DELAI_PAR_COUP_PAR_DEFAUT;
    }
    choisirMode(nouveauModeChoisi);
  }

  elements.boutonChrono.addEventListener('click', () => choisirModeDepuisClic('chrono'));
  elements.boutonBonus.addEventListener('click', () => choisirModeDepuisClic('bonus'));
  elements.boutonDelai.addEventListener('click', () => choisirModeDepuisClic('delai'));

  // Annuler : revient aux reglages d'avant cette ouverture, SANS fermer (on
  // peut ensuite en rechoisir d'autres). Valider et Fermer ferment tous les
  // deux ; Echap et le clic en dehors (interface/fermeture-dialogues.js)
  // ferment de la meme facon, jamais un evenement `cancel` intercepte ici.
  elements.annuler.addEventListener('click', () => appliquerValeurs(valeursOuverture));
  elements.valider.addEventListener('click', () => elements.dialogue.close());
  elements.fermer.addEventListener('click', () => elements.dialogue.close());

  // Resout TOUJOURS avec les reglages actuellement affiches, quelle que soit
  // la facon dont la boite s'est fermee (voir l'en-tete du fichier) : jamais
  // `null`, jamais laisser l'appelant en attente indefiniment d'une Promise
  // qui ne se resoudrait plus.
  elements.dialogue.addEventListener('close', () => {
    const reglages = construireReglages();
    resoudre?.(avecAdversaire ? { ...reglages, machines: choixJoueurs.lire() } : reglages);
    resoudre = null;
    const horizontales = elements.horizontales?.checked;
    if (elements.horizontales && horizontales !== lireReglagesActifs().kaah.horizontal_clocks) setTimeout(() => changerLesPendulesHorizontales?.(horizontales));
  });

  // Les reglages d'un camp, lus dans ses champs (`champs` : ceux de Noir, ou
  // `elements.blanc`).
  function reglagesDesChamps(champs) {
    const tempsInitial = nombrePositifOuDefaut(champs.tempsInitial.value, TEMPS_INITIAL_PAR_DEFAUT);
    if (modeChoisi === 'delai') return { tempsInitial, bonusParCoup: 0, bonusParEjection: 0, delai: nombrePositifOuDefaut(champs.delaiParCoup.value, DELAI_PAR_COUP_PAR_DEFAUT) };
    return {
      tempsInitial,
      bonusParCoup: nombrePositifOuDefaut(champs.bonusParCoup.value, BONUS_PAR_COUP_PAR_DEFAUT),
      bonusParEjection: nombrePositifOuDefaut(champs.bonusParEjection.value, BONUS_PAR_EJECTION_PAR_DEFAUT),
      delai: 0,
    };
  }

  function construireReglages() {
    if (modeChoisi === 'chrono') return { mode: 'chrono', modeChoisi: 'chrono', tempsInitial: 0, bonusParCoup: 0, bonusParEjection: 0, delai: 0 };
    const reglages = { mode: 'pendule', modeChoisi, ...reglagesDesChamps(elements) };
    return elements.campsDifferents.checked ? { ...reglages, camps: { blanc: reglagesDesChamps(elements.blanc) } } : reglages;
  }

  // Remplit les champs depuis `valeurs` : au premier affichage (`ouvrir`) et
  // sur Annuler, qui y revient.
  function appliquerValeurs(valeurs) {
    choisirMode(valeurs.modeChoisi ?? 'bonus');
    const remplir = (champs, camp) => {
      champs.tempsInitial.value = camp.tempsInitial || TEMPS_INITIAL_PAR_DEFAUT;
      champs.bonusParCoup.value = camp.bonusParCoup ?? BONUS_PAR_COUP_PAR_DEFAUT;
      champs.bonusParEjection.value = camp.bonusParEjection ?? BONUS_PAR_EJECTION_PAR_DEFAUT;
      champs.delaiParCoup.value = camp.delai || DELAI_PAR_COUP_PAR_DEFAUT;
    };
    const noir = reglagesDuCamp(valeurs, 'noir');
    const blanc = reglagesDuCamp(valeurs, 'blanc');
    remplir(elements, noir);
    remplir(elements.blanc, blanc);
    // Coches seulement si les deux camps different deja.
    elements.campsDifferents.checked = JSON.stringify(noir) !== JSON.stringify(blanc);
    montrerLesCamps();
  }

  // Ouvre le popup pre-rempli avec `valeurs` (REGLAGES_PENDULES_PAR_DEFAUT ou
  // ceux de la derniere partie pour un debut de partie, les reglages EN
  // DIRECT de la partie en cours pour un changement de mode, voir l'en-tete
  // du fichier). Renvoie une Promise : les reglages affiches au moment de la
  // fermeture (jamais `null`, voir plus haut).
  function ouvrir(valeurs, options = {}) {
    valeursOuverture = valeurs;
    avecAdversaire = Boolean(options.avecAdversaire);
    choixJoueurs.preparer(avecAdversaire);
    appliquerValeurs(valeurs);
    if (elements.horizontales) elements.horizontales.checked = lireReglagesActifs().kaah.horizontal_clocks;
    elements.dialogue.showModal();
    return new Promise((r) => {
      resoudre = r;
    });
  }

  return { ouvrir };
}
