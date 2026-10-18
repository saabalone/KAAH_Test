// L'HISTORIQUE de l'Entrainement et des Ceintures (saab, 2026-10-10 : « ça enregistre
// ce qu'on a choisi, et les résultats, càd le titre de la partie (qui donne presque
// toutes les infos), le tps et réussi/échoué (✓ vert/X rouge) ... On peut consulter
// cet histo donc mettre btn + choix du nom »). Un jeu par ligne, le plus recent en
// haut, par joueur (`kaah-entrainement-historique` : { joueur: [jeu, ...] }).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CEINTURES (moteur/entrainement.js),
// minutesSecondes (moteur/entrainement-reglages.js), lireStockageEntrainement,
// ecrireStockageEntrainement (interface/entrainement-partie.js), LIBELLES_DES_SENS
// (interface/entrainement-ceintures.js), nomsConnus
// (interface/noms-connus.js) viennent de fichiers charges avant celui-ci.

const CLE_HISTORIQUE_ENTRAINEMENT = 'kaah-entrainement-historique';
const JEUX_GARDES_PAR_JOUEUR = 1000; // au-dela, les plus anciens s'effacent
const LIBELLES_DES_MODES = { entrainement: 'Entraînement', ceinture: 'Ceinture' };
const FORMAT_DATE_HISTORIQUE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

// `jeu` : le jeu fini (interface/entrainement-partie.js) ; `titre` : le nom de la
// partie (moteur/nom-partie.js) ; `duree` : le temps pris par le joueur (secondes).
function noterDansLHistoriqueDEntrainement(jeu, reussi, titre, duree) {
  const tous = lireStockageEntrainement(CLE_HISTORIQUE_ENTRAINEMENT, {});
  const ligne = { date: Date.now(), mode: jeu.mode ?? 'ceinture', sorte: jeu.sorte, ceinture: jeu.ceinture, nom: jeu.nom, sens: jeu.sens, titre, duree: Math.round(duree), reussi };
  tous[jeu.joueur] = [ligne, ...(tous[jeu.joueur] ?? [])].slice(0, JEUX_GARDES_PAR_JOUEUR);
  ecrireStockageEntrainement(CLE_HISTORIQUE_ENTRAINEMENT, tous);
}

function historiqueDEntrainement(joueur) {
  return lireStockageEntrainement(CLE_HISTORIQUE_ENTRAINEMENT, {})[joueur] ?? [];
}

// Les jeux de `joueur` dans `mode`, `sorte` et `ceinture` : { reussis, rates }.
function bilanDeLaCeinture(joueur, mode, sorte, ceinture) {
  const siens = historiqueDEntrainement(joueur).filter((ligne) => ligne.mode === mode && ligne.sorte === sorte && ligne.ceinture === ceinture);
  return { reussis: siens.filter((ligne) => ligne.reussi).length, rates: siens.filter((ligne) => !ligne.reussi).length };
}

// `elements` : { dialogue, joueur (<select>), corps, fermer }. Renvoie { ouvrir(nom) }.
function demarrerHistoriqueDEntrainement(elements) {
  const echapper = (texte) => String(texte).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

  function afficher() {
    const lignes = historiqueDEntrainement(elements.joueur.value);
    if (lignes.length === 0) {
      elements.corps.innerHTML = '<p class="note-reglages">Aucun jeu pour l’instant.</p>';
      return;
    }
    const rangees = lignes.map((ligne) => {
      const ceinture = CEINTURES[ligne.ceinture];
      const resultat = ligne.reussi ? '<span class="resultat-reussi">✓</span>' : '<span class="resultat-rate">✗</span>';
      return `<tr><td>${resultat}</td><td>${FORMAT_DATE_HISTORIQUE.format(ligne.date)}</td><td>${LIBELLES_DES_MODES[ligne.mode]}</td><td><span class="ceinture" style="background:${ceinture.couleur}"></span> ${echapper(ceinture.nom)}</td><td>${LIBELLES_DES_SENS[ligne.sorte][ligne.sens]}</td><td>${minutesSecondes(ligne.duree)}</td><td class="titre-jeu-historique">${echapper(ligne.titre || ligne.nom)}</td></tr>`;
    });
    elements.corps.innerHTML = `<table class="tableau-historique tableau-historique-entrainement"><tr><th></th><th>Date</th><th>Mode</th><th>Ceinture</th><th>Sens</th><th>Temps</th><th>Partie</th></tr>${rangees.join('')}</table>`;
  }

  function ouvrir(nom) {
    const avecUnHistorique = Object.keys(lireStockageEntrainement(CLE_HISTORIQUE_ENTRAINEMENT, {}));
    const noms = [...new Set([nom, ...nomsConnus().noms, ...avecUnHistorique].filter(Boolean))];
    elements.joueur.innerHTML = noms.map((autre) => `<option value="${echapper(autre)}">${echapper(autre)}</option>`).join('');
    elements.joueur.value = nom || noms[0] || '';
    afficher();
    elements.dialogue.showModal();
  }

  elements.joueur.addEventListener('change', afficher);
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
  return { ouvrir };
}
