// Les 12 symetries du plateau hexagonal, l'inversion des camps, et la
// position canonique (la "posRef" de KAAWA) : la forme unique sous laquelle
// une position est rangee dans la base de coups, quelle que soit son
// orientation sur le plateau.
//
// PHASE DELICATE (voir PLAN.md). Tout ce fichier existe pour donner
// exactement la meme cle que KAAWA, sinon la base de coups ne repond rien.
// Les conventions reproduites ici viennent de kaa_utils_ClO_Co.py
// (coord_12_permut, posRef_code_permut, move_Orig) et de la constante
// coord_plateau_intern_12_permut de kaa_constants_ClO_Co.py.
//
// KAAH ne recopie PAS la table des 12 x 61 cases de KAAWA : il la
// reconstruit par la geometrie, comme la notation en phase 1. Les 12
// permutations sont les 12 symetries de l'hexagone — 6 rotations d'un
// sixieme de tour, et ces memes 6 rotations appliquees apres un miroir.
// Verifie case par case contre la vraie table Python : 732 comparaisons,
// zero ecart (voir tests/permutations.test.js, test 8).
//
// ECART ASSUME ET MESURE vis-a-vis du code de KAAWA, le seul de ce
// fichier : quand les camps s'inversent, KAAH fait suivre les compteurs
// d'ejection a leur camp, alors que KAAWA echange les coordonnees sans
// echanger les compteurs (kaa_engine_ClO_Co.py ligne 708). La base de
// KAAWA, elle, a bien ete construite en les faisant suivre : sur ses
// 30 459 cles, PAS UNE n'a plus d'ejections a gauche qu'a droite, ce qui
// serait impossible autrement. Mesure sur 200 cles du CSV permutees au
// hasard : la regle de KAAH en retrouve 200, celle du code de KAAWA
// seulement 150 — les 50 autres fabriquent une cle que la base ne contient
// jamais, donc aucun conseil. Reproduire ce defaut reviendrait a livrer
// volontairement une recherche qui echoue une fois sur quatre.
//
// Pas d'import ni d'export (voir plateau.js) : depuisNotation et
// versNotation viennent de plateau.js, lirePosition et comprimer de
// notation.js — tous charges avant celui-ci dans index.html.

// Les 6 rotations, puis les 6 memes apres un miroir.
const NOMBRE_DE_PERMUTATIONS = 12;
const NOMBRE_DE_ROTATIONS = 6;

// Convention de KAAWA : le code de permutation porte l'inversion des camps
// en s'augmentant de 100, pour tenir dans un seul nombre.
const DECALAGE_CAMPS_INVERSES = 100;

// Un sixieme de tour en coordonnees axiales. Applique 6 fois, il ramene
// chaque case a sa place.
function tourner({ q, r }) {
  return { q: q + r, r: -q };
}

// Symetrie axiale du plateau. Une reflexion est sa propre inverse.
function refleter({ q, r }) {
  return { q: -r, r: -q };
}

// Les permutations 0 a 5 sont les rotations ; 6 a 11 sont ces memes
// rotations appliquees apres le miroir.
function transformer(caseAxiale, indexPermutation) {
  let point = indexPermutation < NOMBRE_DE_ROTATIONS ? caseAxiale : refleter(caseAxiale);
  const rotations = indexPermutation % NOMBRE_DE_ROTATIONS;
  for (let tour = 0; tour < rotations; tour++) point = tourner(point);
  return point;
}

// L'index qui defait la permutation donnee. Repris de move_Orig
// (kaa_utils_ClO_Co.py) : une rotation se defait par la rotation
// complementaire, un miroir se defait par lui-meme.
function permutationInverse(indexPermutation) {
  if (indexPermutation >= NOMBRE_DE_ROTATIONS) return indexPermutation;
  return (NOMBRE_DE_ROTATIONS - indexPermutation) % NOMBRE_DE_ROTATIONS;
}

function permuterCase(notation, indexPermutation) {
  const caseAxiale = depuisNotation(notation);
  if (!caseAxiale) return notation;
  const image = transformer(caseAxiale, indexPermutation % NOMBRE_DE_PERMUTATIONS);
  return versNotation(image.q, image.r);
}

function permuterCaseInverse(notation, indexPermutation) {
  return permuterCase(notation, permutationInverse(indexPermutation % NOMBRE_DE_PERMUTATIONS));
}

// Un coup Nacre est deux cases collees : on permute chacune.
function permuterCoupNacre(coup, indexPermutation) {
  if (coup.length !== LONGUEUR_COUP_NACRE) return coup;
  return permuterCase(coup.slice(0, 2), indexPermutation) + permuterCase(coup.slice(2), indexPermutation);
}

function permuterCoupNacreInverse(coup, indexPermutation) {
  if (coup.length !== LONGUEUR_COUP_NACRE) return coup;
  return (
    permuterCaseInverse(coup.slice(0, 2), indexPermutation) +
    permuterCaseInverse(coup.slice(2), indexPermutation)
  );
}

// ---------------------------------------------------------------------
// Position canonique (posRef)
// ---------------------------------------------------------------------

// Toutes les cases d'une couleur, triees. Le tri est celui de KAAWA :
// ordre alphabetique brut, jamais localeCompare (qui classe autrement selon
// la langue du navigateur et casserait la compatibilite).
function casesTriees(plateau, couleur) {
  return Object.keys(plateau)
    .filter((notation) => plateau[notation].couleur === couleur)
    .sort();
}

// Cle de comparaison d'un candidat. Toutes les cases faisant exactement
// deux caracteres, comparer les textes colles revient exactement a comparer
// les listes case par case, comme le fait Python.
function cleDeTri(premier, second) {
  return `${premier.join('')}_${second.join('')}`;
}

// La forme canonique d'une position : la plus petite des 24 facons de la
// regarder (12 symetries, chacune avec ou sans inversion des camps quand
// les deux camps ont le meme nombre de billes).
//
// `texte` est une position compressee ("0a12b123..._0a45b456...").
// Renvoie :
//   positionReference : la position canonique, compteurs d'ejection compris
//   indexPermutation  : laquelle des 12 symetries y mene (0 a 11)
//   campsInverses     : si les deux camps ont ete echanges pour y arriver
//   codePermutation   : indexPermutation, +100 si campsInverses (KAAWA)
function positionCanonique(texte) {
  const etat = lirePosition(texte);

  let premieresCases = casesTriees(etat.plateau, 'noir');
  let secondesCases = casesTriees(etat.plateau, 'blanc');
  let premieresEjections = etat.billesEjecteesNoires;
  let secondesEjections = etat.billesEjecteesBlanches;

  // Le camp qui a le plus de billes passe devant. Quand les deux en ont
  // autant, on ne peut pas trancher ici : les deux ordres restent en lice
  // plus bas, et c'est la position elle-meme qui departagera.
  let campsInverses = false;
  if (secondesCases.length > premieresCases.length) {
    [premieresCases, secondesCases] = [secondesCases, premieresCases];
    [premieresEjections, secondesEjections] = [secondesEjections, premieresEjections];
    campsInverses = true;
  }
  const memeNombreDeBilles = premieresCases.length === secondesCases.length;

  // Les 24 facons de regarder la position, dans l'ordre EXACT de KAAWA :
  // d'abord les 12 symetries sans inversion des camps, ensuite seulement
  // les 12 avec. L'ordre compte : deux facons differentes peuvent donner
  // exactement la meme position canonique (une position symetrique en
  // donne toujours), et c'est alors la premiere rencontree qui l'emporte,
  // comme le fait le tri stable de Python. Se tromper d'ordre ne change
  // pas la position trouvee mais change son code de permutation, donc le
  // chemin du retour vers le vrai plateau : les coups suggeres seraient
  // silencieusement tournes de travers.
  const symetries = [];
  for (let index = 0; index < NOMBRE_DE_PERMUTATIONS; index++) {
    symetries.push({
      premieres: premieresCases.map((notation) => permuterCase(notation, index)).sort(),
      secondes: secondesCases.map((notation) => permuterCase(notation, index)).sort(),
      index,
    });
  }

  const candidats = symetries.map((symetrie) => ({ ...symetrie, inverses: false }));
  if (memeNombreDeBilles) {
    for (const symetrie of symetries) {
      candidats.push({
        premieres: symetrie.secondes,
        secondes: symetrie.premieres,
        index: symetrie.index,
        inverses: true,
      });
    }
  }

  let meilleure = null;
  for (const candidat of candidats) {
    candidat.cle = cleDeTri(candidat.premieres, candidat.secondes);
    if (meilleure === null || candidat.cle < meilleure.cle) meilleure = candidat;
  }

  // Les deux inversions ne peuvent jamais se cumuler : la premiere ne joue
  // que si les camps n'ont pas le meme nombre de billes, la seconde
  // seulement s'ils l'ont.
  const inversionFinale = campsInverses || meilleure.inverses;
  const ejections = meilleure.inverses
    ? [secondesEjections, premieresEjections]
    : [premieresEjections, secondesEjections];

  const positionReference =
    `${ejections[0]}${comprimer(meilleure.premieres)}` +
    `${SEPARATEUR_DES_CAMPS}` +
    `${ejections[1]}${comprimer(meilleure.secondes)}`;

  return {
    positionReference,
    indexPermutation: meilleure.index,
    campsInverses: inversionFinale,
    codePermutation: meilleure.index + (inversionFinale ? DECALAGE_CAMPS_INVERSES : 0),
  };
}

// ---------------------------------------------------------------------
// Popup Permutations (phase 25)
// ---------------------------------------------------------------------

// KAAWA numerote les 6 rotations 0-5, puis SAUTE a 10-15 pour les 6 miroirs
// (compute_all_permutations, _display_index) — pour que 0-5 et 10-15 ne se
// touchent jamais a l'oeil dans le tableau affiche, la difference entre une
// rotation et un miroir se voit sans avoir a la lire.
function indiceAffichePermutation(index) {
  return index < NOMBRE_DE_ROTATIONS ? index : index + 4;
}

// Les 12 lignes du popup Permutations : `normale` garde les deux camps dans
// leur ordre d'origine (chacun ses propres cases tournees, son propre
// compteur d'ejection) ; `camp` echange leur PLACE (le second passe en
// premier) — jamais un texte recompose a la main, c'est exactement
// compute_all_permutations de KAAWA (plugins/permut_plugin). `texte` est une
// position compressee ; ne modifie rien, ne lit aucun etat de partie.
function toutesLesPermutations(texte) {
  const etat = lirePosition(texte);
  const casesNoires = casesTriees(etat.plateau, 'noir');
  const casesBlanches = casesTriees(etat.plateau, 'blanc');

  const permutations = [];
  for (let index = 0; index < NOMBRE_DE_PERMUTATIONS; index++) {
    const noiresPermutees = comprimer(casesNoires.map((notation) => permuterCase(notation, index)));
    const blanchesPermutees = comprimer(casesBlanches.map((notation) => permuterCase(notation, index)));
    const noir = `${etat.billesEjecteesNoires}${noiresPermutees}`;
    const blanc = `${etat.billesEjecteesBlanches}${blanchesPermutees}`;
    permutations.push({
      index,
      normale: `${noir}${SEPARATEUR_DES_CAMPS}${blanc}`,
      camp: `${blanc}${SEPARATEUR_DES_CAMPS}${noir}`,
    });
  }
  return permutations;
}
