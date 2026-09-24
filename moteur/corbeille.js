// La corbeille (phase 26, PLAN.md) : supprimer une variante My, un puzzle My
// ou une partie ne l'efface jamais tout de suite. Reprend kaa_menus_ClO_Co.py
// (move_to_trash, confirm_restore, empty_trash_confirm) : une entree
// supprimee garde ses donnees intactes, jamais transformees ; restaurer la
// relit telle quelle ; vider est un simple retour a une liste vide. KAAWA
// range variantes et puzzles dans un seul KAA_trash.json (un champ
// `original_type` les distingue) mais deplace les parties d'un dossier a un
// autre (aucun fichier commun) — KAAH n'a pas de dossiers : une seule
// corbeille pour les trois genres, distingues ici de la meme facon, par un
// champ `genre` ('variantes', 'puzzles' ou 'parties').
//
// Pur, sans stockage : ranger la corbeille dans le navigateur est l'affaire
// de interface/corbeille.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// `donnees` : l'entree originale, intacte (l'objet KAAWA pour une variante
// ou un puzzle, `{ id, donnees }` pour une partie — moteur/corbeille.js ne
// regarde jamais a l'interieur). `maintenant` (facultatif) : injectable pour
// les tests, comme ailleurs dans ce projet.
function mettreALaCorbeille(corbeille, genre, donnees, maintenant = () => new Date()) {
  return [...corbeille, { genre, donnees, dateSuppression: maintenant().toISOString() }];
}

// Retire l'entree de rang `index` et la renvoie a part : la corbeille ne
// sait pas ou est sa liste d'origine (interface/corbeille.js s'en charge,
// avec le `genre` de l'entree).
function restaurerDepuisCorbeille(corbeille, index) {
  return { corbeille: corbeille.filter((_, rang) => rang !== index), entree: corbeille[index] };
}

// Definitif, comme empty_trash_confirm de KAAWA : rien de plus qu'une liste
// vide, quoi que contenait `corbeille`.
function viderLaCorbeille() {
  return [];
}

// Renomme `nomSouhaite` s'il est deja dans `nomsExistants`, en ajoutant
// " (2)", " (3)"... jusqu'a un nom libre. Sert a l'import (voir
// moteur/positions-my.js, fusionnerEntreesMy) : ecart assume avec KAAWA
// (kaa_menus_ClO_Co.py, _merge_json), qui ignore silencieusement un nom deja
// pris et perd l'entree importee — decide avec saab, aucune importation ne
// doit faire disparaitre une entree sans le dire.
function nomDisponible(nomSouhaite, nomsExistants) {
  if (!nomsExistants.includes(nomSouhaite)) return nomSouhaite;
  let rang = 2;
  while (nomsExistants.includes(`${nomSouhaite} (${rang})`)) rang++;
  return `${nomSouhaite} (${rang})`;
}
