// Ou vivent les recherches de KAI++ (interface/recherche-ia.js) : dans le
// stockage du navigateur, ou — si l'appareil ne les garde pas (saab,
// 2026-10-04 : « un btn qui empeche de memoriser les recherches, pour ne pas
// surcharger la memoire de ceux qui ne savent pas que ca prend de la place »)
// — seulement le temps de cette ouverture. Par defaut, l'appareil ne les garde
// pas : on choisit de les garder (case Garder). Celles deja gardees restent
// visibles jusqu'a Vider.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ajouterRecherche,
// ARCHIVE_RECHERCHES_VIDE, TAILLE_ARCHIVE_RECHERCHES_MAX, tableauDesRecherches,
// ecrireCsv, positionsOubliees (moteur/archive-recherches.js), formaterDateKAAWA
// (interface/sauvegarde.js), telechargerTexte (interface/fichiers.js) viennent
// de fichiers charges avant celui-ci.

const CLE_ARCHIVE_RECHERCHES = 'kaah-recherches-ia';
const CLE_GARDER_RECHERCHES = 'kaah-garder-recherches';
const ESSAIS_D_ECRITURE_ARCHIVE = 3; // en reduisant de moitie a chaque refus du stockage
const MARQUE_UTF8_EXCEL = '\uFEFF';

// Les recherches de cette ouverture quand l'appareil ne les garde pas (parties
// des gardees), ou null.
let archiveDeLaSeance = null;

function gardeLesRecherches() {
  try {
    return window.localStorage.getItem(CLE_GARDER_RECHERCHES) === 'oui';
  } catch {
    return false;
  }
}

function lireArchiveStockee() {
  try {
    return JSON.parse(window.localStorage.getItem(CLE_ARCHIVE_RECHERCHES)) ?? ARCHIVE_RECHERCHES_VIDE;
  } catch {
    return ARCHIVE_RECHERCHES_VIDE;
  }
}

function lireArchiveRecherches() {
  return archiveDeLaSeance ?? lireArchiveStockee();
}

// Les ecrit dans le stockage ; le stockage plein (les parties d'abord),
// l'archive se resserre. Faux si rien n'a pu etre ecrit.
function ecrireArchiveStockee(archive) {
  try {
    window.localStorage.setItem(CLE_ARCHIVE_RECHERCHES, JSON.stringify(archive));
    return true;
  } catch {
    return false;
  }
}

// `avantDOublier(archive)` : appele AVANT d'ecrire un ajout qui fait oublier
// des positions (l'archive pleine), avec l'archive encore entiere.
function garderDansLArchive(cle, recherche, avantDOublier) {
  const avant = lireArchiveRecherches();
  if (!gardeLesRecherches()) {
    archiveDeLaSeance = ajouterRecherche(avant, cle, recherche, TAILLE_ARCHIVE_RECHERCHES_MAX);
    return;
  }
  let tailleMax = TAILLE_ARCHIVE_RECHERCHES_MAX;
  for (let essai = 0; essai < ESSAIS_D_ECRITURE_ARCHIVE; essai++, tailleMax /= 2) {
    const apres = ajouterRecherche(avant, cle, recherche, tailleMax);
    if (essai === 0 && positionsOubliees(avant, apres, cle) > 0) avantDOublier(avant);
    if (ecrireArchiveStockee(apres)) return;
  }
}

// Garder (ou non) les recherches sur l'appareil ; celles de cette ouverture y
// passent des qu'on choisit de les garder.
function choisirDeGarderLesRecherches(garder) {
  try {
    window.localStorage.setItem(CLE_GARDER_RECHERCHES, garder ? 'oui' : 'non');
  } catch {
    return;
  }
  if (garder && archiveDeLaSeance && ecrireArchiveStockee(archiveDeLaSeance)) archiveDeLaSeance = null;
}

function oublierLesRecherches() {
  archiveDeLaSeance = null;
  try {
    window.localStorage.removeItem(CLE_ARCHIVE_RECHERCHES);
  } catch {
    // Rien a oublier.
  }
}

// La place qu'elles prennent sur l'appareil, en caracteres.
function placeDesRecherches() {
  try {
    return window.localStorage.getItem(CLE_ARCHIVE_RECHERCHES)?.length ?? 0;
  } catch {
    return 0;
  }
}

// Toutes les recherches en tableau pour Excel ; le BOM fait lire les accents a Excel.
function exporterLesRecherches(archive) {
  telechargerTexte(`${MARQUE_UTF8_EXCEL}${ecrireCsv(tableauDesRecherches(archive))}`, `recherches_kaah_${formaterDateKAAWA(new Date())}.csv`, 'text/csv');
}
