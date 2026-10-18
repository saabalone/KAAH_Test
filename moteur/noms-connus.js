// L'ordre des noms deja donnes (saab, 2026-10-08 : « mettre le plus utilisé en 1er
// de la liste, les suivants par ordre alphabétique, en fait faire comme pour les
// favoris des Variantes ») : le nom le plus utilise en tete (comme la Marguerite
// Belge epinglee des Variantes), puis les favoris, puis les autres — chaque
// groupe par ordre alphabetique, sans tenir compte des majuscules. Pur :
// interface/noms-connus.js range les utilisations et les favoris, et affiche.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const alphabetique = (a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' });

// `utilisations` : { nom: nombre de fois } ; `favoris` : [nom].
function ordreDesNomsConnus(utilisations, favoris) {
  const noms = Object.keys(utilisations);
  if (noms.length === 0) return [];
  const premier = noms.reduce((meilleur, nom) => (utilisations[nom] > utilisations[meilleur] ? nom : meilleur));
  const autres = noms.filter((nom) => nom !== premier);
  const favorisConnus = autres.filter((nom) => favoris.includes(nom)).sort(alphabetique);
  const reste = autres.filter((nom) => !favoris.includes(nom)).sort(alphabetique);
  return [premier, ...favorisConnus, ...reste];
}
