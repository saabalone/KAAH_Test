// Le rangement des versions d'un profil d'Entrainement dans le stockage du navigateur
// (interface/profils-entrainement.js). Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// LE RANGEMENT DES VERSIONS, au plus court : un profil dont les listes de jeux sont
// remplies pese des dizaines de Ko, et chaque version les repetait — en quelques
// validations le stockage du navigateur etait plein, et plus rien ne s'enregistrait
// (saab, 2026-10-14 : « quand je l'ai fait, ça n'a pas pris »). Chaque version ne garde
// de ses regles que ce qui differe de sa version parente : `change` ({ cle: valeur }) et
// `retire` (les regles qu'elle decoche) ; la premiere les garde toutes.
function compacterVersionsEntrainement(historique) {
  return historique.map((version) => {
    const parent = historique.find((autre) => autre.numero === version.parent);
    if (!parent) return version;
    const { regles, ...reste } = version;
    const change = Object.fromEntries(Object.entries(regles).filter(([cle, valeur]) => parent.regles[cle] !== valeur));
    return { ...reste, change, retire: Object.keys(parent.regles).filter((cle) => !(cle in regles)) };
  });
}

// L'inverse : chaque version retrouve toutes ses regles (une version qui les a deja,
// comme avant ce rangement, est rendue telle quelle).
function deployerVersionsEntrainement(historique) {
  const deployees = new Map();
  const deployer = (version) => {
    if (!version || version.regles) return version;
    if (!deployees.has(version.numero)) {
      const { change, retire, ...reste } = version;
      const regles = { ...deployer(historique.find((autre) => autre.numero === version.parent))?.regles, ...change };
      for (const cle of retire ?? []) delete regles[cle];
      deployees.set(version.numero, { ...reste, regles });
    }
    return deployees.get(version.numero);
  };
  return historique.map(deployer);
}
