// Choisir precisement quelles parties selectionner dans « Mes parties »
// (demande de saab : "un champ pour chaque element du titre des parties", a
// remplir et cocher). Pur, sans DOM : interface/mes-parties.js affiche les
// champs et n'affiche que les parties qui correspondent.
//
// Les elements compares sont ceux dont le titre est fait (elementsDuTitre,
// moteur/nom-partie.js), lus dans les DONNEES — jamais en decoupant le titre
// sur ses virgules : un nom de puzzle en contient lui-meme.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : rien d'autre n'est
// necessaire ici.

// Les champs de texte, dans l'ordre du titre. `tours` est a part : compare
// en nombre exact ("2" ne doit pas trouver "12").
const CHAMPS_TEXTE_DU_TITRE = ['date', 'evenement', 'variante', 'joueurs', 'score', 'vainqueur', 'statut'];

// Un filtre : un { actif, valeur } par champ (cocher sans perdre le texte
// saisi, et inversement), plus `branches` : 'toutes', 'avec' ou 'sans'.
const FILTRE_VIDE = Object.freeze({
  branches: 'toutes',
  ...Object.fromEntries([...CHAMPS_TEXTE_DU_TITRE, 'tours'].map((champ) => [champ, { actif: false, valeur: '' }])),
});

// Vrai si la partie correspond a TOUS les champs coches et remplis.
function partieCorrespond(elements, filtre) {
  if (filtre.branches === 'avec' && !elements.branches) return false;
  if (filtre.branches === 'sans' && elements.branches) return false;
  for (const champ of CHAMPS_TEXTE_DU_TITRE) {
    const { actif, valeur } = filtre[champ];
    const cherche = valeur.trim().toLowerCase();
    if (actif && cherche && !elements[champ].toLowerCase().includes(cherche)) return false;
  }
  const { actif, valeur } = filtre.tours;
  if (actif && valeur.trim() && Number(valeur) !== elements.tours) return false;
  return true;
}
