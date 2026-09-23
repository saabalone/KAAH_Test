// Le classement des variantes et des puzzles (phase 20ter), calque sur les menus de
// KAAWA (kaa_menus_ClO_Co.py : populate_type_variants, populate_handi_variants,
// populate_other_puz). Pur, sans DOM.
//
// Les etiquettes viennent des fichiers de KAAWA : `equilibre`, `handi_score`,
// `handi_bille` et le dictionnaire `Type` pour les variantes ; le champ `type` pour
// les puzzles. Leurs valeurs sont des CHAINES "True" / "False" (moteur/variantes.js,
// lireVariantes, les convertit une fois pour toutes) : "False" ne doit jamais passer
// pour vrai.
//
// Les positions « My » de KAAWA (celles qu'on cree soi-meme) n'existent pas encore dans
// KAAH — elles naitront avec la phase 23 (creer une partie) : aucune categorie « My »
// tant qu'il n'y en a pas (PLAN.md, phase 20ter).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// Les categories de variantes, dans l'ordre d'affichage : `cle`, `libelle`. Les huit
// derniers sont les « Type » de KAAWA, dans son ordre (« 1. bloc defensif »...).
const CATEGORIES_VARIANTES = [
  { cle: 'tous', libelle: 'Toutes' },
  { cle: 'equilibre', libelle: 'Équilibrées' },
  { cle: 'handi', libelle: 'Handi' },
  { cle: 'bloc_def', libelle: 'Bloc défensif' },
  { cle: 'bloc_emp', libelle: 'Bloc emprisonnant' },
  { cle: 'espace_def', libelle: 'Espace défensif' },
  { cle: 'espace_emp', libelle: 'Espace emprisonnant' },
  { cle: 'sub_group_off', libelle: 'Sous-groupes offensifs' },
  { cle: 'sub_group_emp', libelle: 'Sous-groupes emprisonnants' },
  { cle: 'entrecrois', libelle: 'Entrecroisement' },
  { cle: 'eclate', libelle: 'Éclatement' },
];

// Les categories de puzzles : la valeur du champ `type` de KAAWA.
const CATEGORIES_PUZZLES = [
  { cle: 'tous', libelle: 'Tous' },
  { cle: 'PZL_E', libelle: 'Easy' },
  { cle: 'PZL_M', libelle: 'Medium' },
  { cle: 'PZL_H', libelle: 'Hard' },
  { cle: 'Mini_PZL_E', libelle: 'Mini Easy' },
  { cle: 'Mini_PZL_M', libelle: 'Mini Medium' },
  { cle: 'Mini_PZL_H', libelle: 'Mini Hard' },
];

// Les variantes de la categorie `cle`. « handi » : handi_score OU handi_bille (KAAWA,
// populate_handi_variants). Une variante a plusieurs types apparait dans chacun.
function filtrerVariantes(variantes, cle) {
  if (cle === 'tous') return variantes;
  if (cle === 'equilibre') return variantes.filter((variante) => variante.equilibre);
  if (cle === 'handi') return variantes.filter((variante) => variante.handi);
  return variantes.filter((variante) => variante.types.includes(cle));
}

function filtrerPuzzles(puzzles, cle) {
  return cle === 'tous' ? puzzles : puzzles.filter((puzzle) => puzzle.categorie === cle);
}

// Les categories qui ont au moins un element : une categorie vide (Hard, Mini Hard
// aujourd'hui) n'a pas de bouton. `contenu(cle)` renvoie les elements de la categorie.
// Chaque categorie porte aussi son `nombre` d'elements (saab : l'afficher sur son
// bouton, "PZL Easy (32)") — calcule ici, jamais recompte une seconde fois ailleurs.
function categoriesNonVides(categories, contenu) {
  return categories
    .map((categorie) => ({ ...categorie, nombre: contenu(categorie.cle).length }))
    .filter((categorie) => categorie.nombre > 0);
}
