// Le stockage des parties exportees (moteur/parties-exportees.js) : sur cet appareil, comme toute donnee « kaah- » (« Exporter tout » l'emporte).
// Un stockage indisponible ne fait jamais planter : il prive seulement de la marque.
//
// Seul un fichier de partie compte : Exporter, l'icone ou Mes parties, et Importer (la partie vient d'un fichier). Pas « Exporter tout » ni
// KAAH_stockage_plein_ : on les reprend en bloc, et ils marqueraient tout, ce qui ne dirait plus rien.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : avecLExport (moteur/parties-exportees.js) vient d'un fichier charge avant celui-ci.

const CLE_PARTIES_EXPORTEES = 'kaah-parties-exportees';

function lirePartiesExportees() {
  try {
    const lues = JSON.parse(window.localStorage.getItem(CLE_PARTIES_EXPORTEES) ?? '{}');
    return lues && typeof lues === 'object' && !Array.isArray(lues) ? lues : {};
  } catch {
    return {};
  }
}

function ecrirePartiesExportees(exportees) {
  try {
    window.localStorage.setItem(CLE_PARTIES_EXPORTEES, JSON.stringify(exportees));
  } catch {
    // Stockage plein : la marque attendra le prochain export.
  }
}

// `entrees` : [{ id, donnees }].
const retenirPartiesExportees = (entrees) => ecrirePartiesExportees(entrees.reduce((exportees, { id, donnees }) => avecLExport(exportees, id, donnees), lirePartiesExportees()));
