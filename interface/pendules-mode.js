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
// Pas d'import ni d'export (voir moteur/plateau.js) : ce fichier se charge
// comme un script classique, dans l'ordre liste par index.html.

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
// bonusParEjection, delaiParCoup, annuler, valider, fermer }.
//
// Fermer LA BOITE (Valider, Fermer, ou un clic en dehors — interface/
// fermeture-dialogues.js) applique toujours les reglages AFFICHES, jamais
// seulement ceux d'un Valider explicite (demande de saab : "on peut
// commencer la partie avec les reglages affiches ... vaut mieux les 2
// facons"). Annuler n'a donc plus besoin de fermer la boite ni de tout
// annuler : il revient seulement aux reglages d'AVANT cette ouverture, sans
// fermer (comme .Annuler de la boite Reglages) — Fermer, lui, ferme sans
// rien changer de plus.
function demarrerChoixModePendules(elements) {
  let modeChoisi = null;
  let resoudre = null;
  let valeursOuverture = null;

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
    resoudre?.(construireReglages());
    resoudre = null;
  });

  function construireReglages() {
    if (modeChoisi === 'chrono') return { mode: 'chrono', modeChoisi: 'chrono', tempsInitial: 0, bonusParCoup: 0, bonusParEjection: 0, delai: 0 };
    const tempsInitial = nombrePositifOuDefaut(elements.tempsInitial.value, TEMPS_INITIAL_PAR_DEFAUT);
    if (modeChoisi === 'delai') {
      return {
        mode: 'pendule',
        modeChoisi: 'delai',
        tempsInitial,
        bonusParCoup: 0,
        bonusParEjection: 0,
        delai: nombrePositifOuDefaut(elements.delaiParCoup.value, DELAI_PAR_COUP_PAR_DEFAUT),
      };
    }
    return {
      mode: 'pendule',
      modeChoisi: 'bonus',
      tempsInitial,
      bonusParCoup: nombrePositifOuDefaut(elements.bonusParCoup.value, BONUS_PAR_COUP_PAR_DEFAUT),
      bonusParEjection: nombrePositifOuDefaut(elements.bonusParEjection.value, BONUS_PAR_EJECTION_PAR_DEFAUT),
      delai: 0,
    };
  }

  // Remplit les champs depuis `valeurs` : au premier affichage (`ouvrir`) et
  // sur Annuler, qui y revient.
  function appliquerValeurs(valeurs) {
    choisirMode(valeurs.modeChoisi ?? 'bonus');
    elements.tempsInitial.value = valeurs.tempsInitial || TEMPS_INITIAL_PAR_DEFAUT;
    elements.bonusParCoup.value = valeurs.bonusParCoup ?? BONUS_PAR_COUP_PAR_DEFAUT;
    elements.bonusParEjection.value = valeurs.bonusParEjection ?? BONUS_PAR_EJECTION_PAR_DEFAUT;
    elements.delaiParCoup.value = valeurs.delai || DELAI_PAR_COUP_PAR_DEFAUT;
  }

  // Ouvre le popup pre-rempli avec `valeurs` (REGLAGES_PENDULES_PAR_DEFAUT ou
  // ceux de la derniere partie pour un debut de partie, les reglages EN
  // DIRECT de la partie en cours pour un changement de mode, voir l'en-tete
  // du fichier). Renvoie une Promise : les reglages affiches au moment de la
  // fermeture (jamais `null`, voir plus haut).
  function ouvrir(valeurs) {
    valeursOuverture = valeurs;
    appliquerValeurs(valeurs);
    elements.dialogue.showModal();
    return new Promise((r) => {
      resoudre = r;
    });
  }

  return { ouvrir };
}
