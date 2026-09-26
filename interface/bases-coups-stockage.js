// Les bases de coups IMPORTEES (interface/bases-coups.js), gardees sur cet
// appareil. IndexedDB, et non localStorage comme le reste de KAAH : une base
// pese environ 1,6 Mo, et localStorage (environ 5 Mo pour tout le site,
// parties comprises) n'en tiendrait qu'une ou deux avant de refuser d'ecrire
// — y compris la sauvegarde automatique des parties. IndexedDB est fait pour
// ces volumes et existe dans tous les navigateurs vises (Safari compris).
//
// Chaque base est rangee sous son nom de fichier (KAA_NEXT_MOVE_REF_*.csv),
// son texte tel quel.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const NOM_STOCKAGE_BASES = 'kaah-bases-coups';
const VERSION_STOCKAGE_BASES = 1;
const MAGASIN_BASES = 'bases';

let ouvertureStockageBases = null;

function ouvrirStockageBases() {
  ouvertureStockageBases ??= new Promise((resoudre, rejeter) => {
    if (!('indexedDB' in window)) {
      rejeter(new Error('ce navigateur ne sait pas garder de gros fichiers'));
      return;
    }
    const demande = window.indexedDB.open(NOM_STOCKAGE_BASES, VERSION_STOCKAGE_BASES);
    demande.onupgradeneeded = () => demande.result.createObjectStore(MAGASIN_BASES);
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
  });
  return ouvertureStockageBases;
}

// Une operation sur le magasin, rendue en promesse. `mode` : 'readonly' ou
// 'readwrite' ; `action(magasin)` renvoie la requete IndexedDB a attendre.
async function operationSurBases(mode, action) {
  const stockage = await ouvrirStockageBases();
  return new Promise((resoudre, rejeter) => {
    const transaction = stockage.transaction(MAGASIN_BASES, mode);
    const requete = action(transaction.objectStore(MAGASIN_BASES));
    transaction.oncomplete = () => resoudre(requete.result);
    transaction.onerror = () => rejeter(transaction.error);
    transaction.onabort = () => rejeter(transaction.error);
  });
}

// Les noms, dans l'ordre alphabetique, comme la liste de KAAWA. Jamais
// d'erreur : un navigateur sans IndexedDB n'a simplement aucune base importee.
async function listerBasesImportees() {
  try {
    const noms = await operationSurBases('readonly', (magasin) => magasin.getAllKeys());
    return [...noms].sort();
  } catch {
    return [];
  }
}

function lireBaseImportee(nom) {
  return operationSurBases('readonly', (magasin) => magasin.get(nom));
}

function enregistrerBaseImportee(nom, texte) {
  return operationSurBases('readwrite', (magasin) => magasin.put(texte, nom));
}

function supprimerBaseImportee(nom) {
  return operationSurBases('readwrite', (magasin) => magasin.delete(nom));
}
