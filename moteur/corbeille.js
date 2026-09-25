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

// Retire les entrees de rangs `rangs` (cases cochees dans la corbeille) et
// les renvoie a part, dans l'ordre de la corbeille, quel que soit l'ordre des
// rangs recus : la corbeille ne sait pas ou sont leurs listes d'origine
// (interface/corbeille.js s'en charge, avec le `genre` de chaque entree).
function restaurerPlusieurs(corbeille, rangs) {
  const choisis = new Set(rangs);
  return {
    corbeille: corbeille.filter((_, rang) => !choisis.has(rang)),
    entrees: corbeille.filter((_, rang) => choisis.has(rang)),
  };
}

// Chaque boite (Mes parties, Variantes, Puzzles) a SA corbeille, vue et
// videe a part — demande de saab : une seule corbeille dans Mes parties etait
// introuvable depuis les deux autres. Definitif, comme empty_trash_confirm de
// KAAWA, mais pour ce genre seulement.
function viderLeGenre(corbeille, genre) {
  return corbeille.filter((entree) => entree.genre !== genre);
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
