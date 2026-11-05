// Quelles parties de « Mes parties » ont un fichier exporte (saab, 2026-11-04 : « ce qui serait bien c'est de savoir quelles parties ont été
// exportées (mettre une couleur ou coche ou les 2 ou autre ?) ») : pour savoir ce qu'on peut supprimer sans rien perdre. On retient, par
// partie, une empreinte de ce qu'elle etait a l'export : une partie retouchee depuis (une branche, un commentaire) n'a plus de fichier a jour.
// A part des parties : le format des fichiers de KAAWA ne change pas. Pur, sans stockage (interface/parties-exportees.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// FNV-1a sur 32 bits : assez pour reconnaitre une partie, sans dependance.
const EMPREINTE_FNV_DEPART = 0x811c9dc5;
const EMPREINTE_FNV_MULTIPLICATEUR = 0x01000193;

// Ce que perdrait un fichier pas a jour : les coups, les branches, les commentaires. Ni les temps ni la position regardee : les revoir ne
// change pas la partie.
const contenuDuNoeud = (noeud) => [noeud.nacre ?? '', noeud.comment ?? '', noeud.is_origin ?? null, (noeud.children ?? []).map(contenuDuNoeud)];

function empreinteDeLaPartie(donnees) {
  const texte = JSON.stringify([donnees.Date, donnees.Event, donnees.VariantName, donnees.Players, donnees.Term, donnees.Winner, contenuDuNoeud(donnees.Tree ?? {})]);
  let empreinte = EMPREINTE_FNV_DEPART;
  for (let rang = 0; rang < texte.length; rang++) empreinte = Math.imul(empreinte ^ texte.charCodeAt(rang), EMPREINTE_FNV_MULTIPLICATEUR) >>> 0;
  return empreinte.toString(16);
}

// `exportees` : { id de la partie : empreinte }. 'jamais', 'a-jour' ou 'modifiee'.
function etatDExport(exportees, id, donnees) {
  const retenue = exportees[id];
  if (!retenue) return 'jamais';
  return retenue === empreinteDeLaPartie(donnees) ? 'a-jour' : 'modifiee';
}

const avecLExport = (exportees, id, donnees) => ({ ...exportees, [id]: empreinteDeLaPartie(donnees) });

// `entrees` : [{ id, donnees }]. Celles qu'on perdrait en les effacant.
const nombreSansExportAJour = (exportees, entrees) => entrees.filter(({ id, donnees }) => etatDExport(exportees, id, donnees) !== 'a-jour').length;

// Le filtre de Mes parties : 'toutes', 'sans' (sans fichier a jour) ou 'avec'.
function exportCorrespond(etat, choix) {
  if (choix === 'sans') return etat !== 'a-jour';
  return choix === 'avec' ? etat === 'a-jour' : true;
}
