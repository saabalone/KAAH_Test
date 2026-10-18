// L'ALERTE DES CEINTURES au chargement (saab, 2026-10-17 : « mettre après la boîte de
// chargement une alerte pour le temps restant sur ceinture, avec un bouton Entraînement
// (qui ouvre la boîte Entr/Ceint) et un bouton Fermer rouge ») : pour chaque joueur et
// chaque parcours (Variantes, PZL) qui a une ceinture a garder, les jours qui restent
// avant de devoir la reconfirmer (moteur/entrainement-serie.js, joursAvantReconfirmation).
// Une fois par ouverture : un rechargement (chaque nouvelle partie en est un) ne la redit
// pas. Fermer passe au rouge quand il reste moins d'un quart du delai a l'une d'elles.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : joursAvantReconfirmation
// (moteur/entrainement-serie.js), CEINTURES (moteur/entrainement.js), lireStockageEntrainement,
// CLE_PARCOURS_ENTRAINEMENT, PARCOURS_ENTRAINEMENT (interface/entrainement-partie.js),
// historiqueDEntrainement (interface/entrainement-historique.js), reglagesDeLEntrainement
// (interface/profils-entrainement.js) viennent de fichiers charges avant celui-ci.

const CLE_ALERTE_CEINTURES_DITE = 'kaah-alerte-ceintures-dite';
const PART_DU_DELAI_URGENTE = 0.25;
const NOMS_DES_PARCOURS = { variantes: 'Variantes', pzl: 'PZL' };

// Les ceintures a garder : [{ joueur, sorte, ceinture, jours }], et le delai de la regle.
function ceinturesAGarder(maintenant = Date.now()) {
  const delai = reglagesDeLEntrainement().serie.joursAvantReconfirmation;
  const tous = lireStockageEntrainement(CLE_PARCOURS_ENTRAINEMENT, {});
  const lignes = Object.entries(tous).flatMap(([joueur, siens]) =>
    PARCOURS_ENTRAINEMENT.map((sorte) => {
      const parcours = siens?.[sorte];
      if (!parcours) return null;
      const dernier = historiqueDEntrainement(joueur).find((ligne) => ligne.sorte === sorte && ligne.ceinture >= parcours.ceinture);
      const jours = joursAvantReconfirmation(parcours, dernier?.date ?? null, maintenant, delai);
      return jours === null ? null : { joueur, sorte, ceinture: parcours.ceinture, jours };
    }).filter(Boolean)
  );
  return { lignes, delai };
}

// L'alerte, si une ceinture est a garder et qu'elle n'a pas deja ete dite a cette
// ouverture ; `confirmation` : interface/confirmation.js ; `ouvrirEntrainement()`.
function alerterDesCeintures(confirmation, ouvrirEntrainement) {
  try {
    if (window.sessionStorage.getItem(CLE_ALERTE_CEINTURES_DITE) === 'oui') return;
    window.sessionStorage.setItem(CLE_ALERTE_CEINTURES_DITE, 'oui');
  } catch {
    // sans stockage : elle se redira au prochain rechargement
  }
  const { lignes, delai } = ceinturesAGarder();
  if (lignes.length === 0) return;
  const texte = lignes.map(({ joueur, sorte, ceinture, jours }) => `${joueur} — ${NOMS_DES_PARCOURS[sorte]}, ceinture ${CEINTURES[ceinture].nom.toLowerCase()} : ${jours === 0 ? 'à reconfirmer' : `encore ${jours} jour${jours > 1 ? 's' : ''}`}`);
  const urgent = lignes.some(({ jours }) => jours < delai * PART_DU_DELAI_URGENTE);
  confirmation.demander(
    `Le temps qui reste pour jouer à sa ceinture (ou plus haut) avant de devoir la reconfirmer (${delai} jours sans jouer) :\n${texte.join('\n')}`,
    ouvrirEntrainement,
    'Entraînement',
    { texte: 'Fermer', danger: urgent },
    { confirmerVert: true }
  );
}
