// Les recherches de KAI++ par premier coup (interface/recherche-ia.js),
// gardees a part des parties (saab, 2026-10-02 : « il faut enregistrer les
// tableaux, a part de la partie mais avec un lien, pour les revoir a la
// navigation et comparer, et on pourra voir si on peut elaguer »). Le lien :
// la position (sa cle, moteur/sequence-prevue.js, cleDeSolution) — revenir
// sur une position, dans cette partie ou une autre, montre ce que la machine
// y a cherche — et, dans chaque recherche, la partie et le coup d'ou elle
// vient. Pur, sans stockage : l'interface lit et ecrit l'archive.
//
// Une archive : { positions: { cle: { rang, recherches (la plus recente en
// premier) } }, rang } — `rang` grandit a chaque ajout : la position au plus
// petit rang est la plus ancienne, oubliee la premiere quand l'archive devient
// trop volumineuse.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const RECHERCHES_PAR_POSITION_MAX = 5;
// En caracteres de son texte JSON : une part raisonnable du stockage du
// navigateur, que les parties partagent.
const TAILLE_ARCHIVE_RECHERCHES_MAX = 1500000;
const ARCHIVE_RECHERCHES_VIDE = Object.freeze({ positions: {}, rang: 0 });

// `recherche` : { machine (son nom), date, idPartie, coupsJoues, camp, details
// (interface/ia-reflexion.js, detailEnTextes : une entree par profondeur) }.
function ajouterRecherche(archive, cle, recherche, tailleMax = TAILLE_ARCHIVE_RECHERCHES_MAX) {
  const rang = archive.rang + 1;
  const anciennes = archive.positions[cle]?.recherches ?? [];
  const positions = { ...archive.positions, [cle]: { rang, recherches: [recherche, ...anciennes].slice(0, RECHERCHES_PAR_POSITION_MAX) } };
  const plusAnciennes = Object.keys(positions)
    .filter((autre) => autre !== cle)
    .sort((a, b) => positions[a].rang - positions[b].rang);
  let resultat = { positions, rang };
  while (plusAnciennes.length > 0 && JSON.stringify(resultat).length > tailleMax) {
    delete positions[plusAnciennes.shift()];
    resultat = { positions, rang };
  }
  return resultat;
}

function recherchesDeLaPosition(archive, cle) {
  return archive.positions[cle]?.recherches ?? [];
}
