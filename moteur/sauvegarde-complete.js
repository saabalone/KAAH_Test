// La SAUVEGARDE COMPLETE (saab, 2026-10-09 : « comment faire qd on change
// d'appareil pour ne pas perdre toutes nos données ? ») : tout ce que KAAH garde
// dans le navigateur (localStorage, une cle « kaah-… » par sorte de donnees :
// parties, historique des joueurs, ceintures, profils IA et d'Entrainement, noms,
// favoris, positions My, reglages) dans un seul fichier, a importer sur l'autre
// appareil. Pur : interface/sauvegarde-complete.js lit et ecrit le stockage.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const FORMAT_SAUVEGARDE_COMPLETE = 'KAAH_sauvegarde_complete_1';
const PREFIXE_DES_DONNEES_KAAH = 'kaah-';

const estUneDonneeKAAH = (cle, valeur) => typeof cle === 'string' && cle.startsWith(PREFIXE_DES_DONNEES_KAAH) && typeof valeur === 'string';

// `stockage` : { cle: texte } (tout le localStorage) ; `date` : formaterDateKAAWA.
function sauvegardeComplete(stockage, date) {
  return {
    format: FORMAT_SAUVEGARDE_COMPLETE,
    date,
    donnees: Object.fromEntries(Object.entries(stockage).filter(([cle, valeur]) => estUneDonneeKAAH(cle, valeur))),
  };
}

// Les donnees d'un fichier de sauvegarde complete, ou null si ce n'en est pas un.
function lireSauvegardeComplete(brut) {
  if (!brut || brut.format !== FORMAT_SAUVEGARDE_COMPLETE || typeof brut.donnees !== 'object' || brut.donnees === null) return null;
  return Object.fromEntries(Object.entries(brut.donnees).filter(([cle, valeur]) => estUneDonneeKAAH(cle, valeur)));
}

// Le stockage plein (saab, 2026-10-31 : « exporter automatiquement les parties ou autres fichiers en mémoire qui sature
// le navigateur pour être sûr de ne rien perdre ») : la partie en cours n'a pas pu s'ecrire dans Mes parties
// (`cleMesParties`, un tableau de { id, donnees } en texte) ; elle y prend sa place — la sienne si elle en a une, au bout
// sinon — dans une copie de `stockage`, celle que le fichier exporte.
function stockageAvecLaPartie(stockage, cleMesParties, id, donnees) {
  let parties = [];
  try {
    parties = JSON.parse(stockage[cleMesParties] ?? '[]');
  } catch {
    // illisible : la partie en cours seule
  }
  const entree = { id, donnees };
  const avecElle = parties.some((autre) => autre.id === id) ? parties.map((autre) => (autre.id === id ? entree : autre)) : [...parties, entree];
  return { ...stockage, [cleMesParties]: JSON.stringify(avecElle) };
}

// IMPORTER DES PARTIES d'une sauvegarde complete (saab, 2026-10-31 : « je voudrais voir si je peux facilement choisir
// d'importer une partie ou des parties de ce fichier sinon ça ne va pas » ; « Oui, fais le ») : on y choisit ses
// parties, qui s'ajoutent a Mes parties ; rien d'autre ne change (interface/import-parties.js).
// Les parties de Mes parties (`cleMesParties`) dans les donnees relues (lireSauvegardeComplete) : [{ id, donnees }],
// dans leur ordre ;
// une entree sans partie est laissee, un Mes parties illisible n'en donne aucune.
function partiesDeLaSauvegarde(donnees, cleMesParties) {
  try {
    const parties = JSON.parse(donnees[cleMesParties] ?? '[]');
    return Array.isArray(parties) ? parties.filter((entree) => entree && typeof entree.donnees === 'object' && entree.donnees !== null) : [];
  } catch {
    return [];
  }
}

// Chaque partie du fichier ({ id, donnees, dejaLa }) : `dejaLa` vaut 'mes-parties' si Mes parties (`existantes`) a
// deja la meme (meme id : la meme partie, peut-etre allee plus loin ici ; ou meme contenu), 'fichier' si c'est la
// copie d'une partie plus haut dans le fichier, null sinon — celles-la seules s'importent.
function partiesAImporter(existantes, partiesDuFichier) {
  const ids = new Set(existantes.map((entree) => entree.id));
  const contenus = new Set(existantes.map((entree) => JSON.stringify(entree.donnees)));
  const vus = new Set();
  return partiesDuFichier.map(({ id, donnees }) => {
    const contenu = JSON.stringify(donnees);
    const dejaLa = ids.has(id) || contenus.has(contenu) ? 'mes-parties' : vus.has(contenu) ? 'fichier' : null;
    vus.add(contenu);
    return { id, donnees, dejaLa };
  });
}

// La CORBEILLE d'une sauvegarde (saab, 2026-10-31 : « Et pour la corbeille aussi il faut pouvoir la récupérer ») :
// ses entrees ({ genre, donnees, dateSuppression } : parties, puzzles et variantes My, profils d'Entrainement), dans
// leur ordre ; une entree sans genre est laissee.
function corbeilleDeLaSauvegarde(donnees, cleCorbeille) {
  try {
    const entrees = JSON.parse(donnees[cleCorbeille] ?? '[]');
    return Array.isArray(entrees) ? entrees.filter((entree) => entree && typeof entree.genre === 'string') : [];
  } catch {
    return [];
  }
}

// Chaque entree de la Corbeille du fichier ({ entree, dejaLa }) : 'corbeille' si la Corbeille d'ici (`existante`) a la
// meme, 'fichier' si c'est la copie d'une entree plus haut dans le fichier, null sinon — celles-la seules s'importent.
function corbeilleAImporter(existante, duFichier) {
  const ici = new Set(existante.map((entree) => JSON.stringify(entree)));
  const vues = new Set();
  return duFichier.map((entree) => {
    const contenu = JSON.stringify(entree);
    const dejaLa = ici.has(contenu) ? 'corbeille' : vues.has(contenu) ? 'fichier' : null;
    vues.add(contenu);
    return { entree, dejaLa };
  });
}

// VIDER LE STOCKAGE PLEIN, une fois son contenu telecharge (saab, 2026-10-31 : « si on a exporté tout automatiquement,
// les fichiers devrait être vide sinon ça ne sert à rien ... il faut garder la partie en cours qu'on puisse la
// continuer sans avoir à la recharger ... c'est donc juste les fichiers des parties et réflexion qui sont encombrant ») :
// Mes parties (`cleMesParties`) ne garde que la partie en cours (`idEnCours`, null si elle n'y est pas encore), les
// `clesAVider` presentes partent ; le reste (reglages, profils, Entrainement…) ne change pas. Renvoie { ecrire:
// { cle: texte }, retirer: [cle], partiesRetirees }.
function videDuStockagePlein(stockage, cleMesParties, idEnCours, clesAVider) {
  let parties = [];
  try {
    parties = JSON.parse(stockage[cleMesParties] ?? '[]');
  } catch {
    // illisible : Mes parties repart vide
  }
  const gardees = parties.filter((entree) => entree?.id === idEnCours && idEnCours !== null);
  return {
    ecrire: { [cleMesParties]: JSON.stringify(gardees) },
    retirer: clesAVider.filter((cle) => cle in stockage),
    partiesRetirees: parties.length - gardees.length,
  };
}
