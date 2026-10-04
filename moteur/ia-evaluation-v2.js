// L'evaluation de l'IA VERSION 2 (phase 33, saab 2026-09-30) : celle de la
// version 1 (moteur/ia-evaluation.js, inchangee et toujours jouable pour
// comparer), plus les SUMITOS. saab avait remarque que la version 1 laissait
// l'adversaire former un sumito dangereux alors qu'on pouvait l'en empecher :
// elle ne les voyait que par la recherche, trop tard. Ici chaque position
// evaluee compte :
//   - les sumitos possibles de chaque camp (une poussee 3 contre 1, 3 contre 2
//     ou 2 contre 1), et parmi eux ceux qui EJECTENT ;
//   - la FOURCHETTE (saab : « s'il peut pousser dans les 2 sens, ou si on peut
//     creer plusieurs sumitos sur un coup ») : deux sumitos distincts ou plus,
//     l'adversaire ne pouvant en parer qu'un — chaque sumito au-dela du premier
//     rapporte `fourchette` en plus.
// Toujours du point de vue du camp de l'IA : ses sumitos comptent pour elle,
// ceux de l'adversaire contre elle.
//
// La regle du sumito n'est pas reecrite : c'est coupEnLigne (moteur/regles.js)
// qui dit si un groupe pousse.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : DIRECTIONS,
// caseDansLaDirection, casesDuPlateau, versNotation (plateau.js),
// BILLES_MAX_PAR_COUP, coupEnLigne, couleurAdverse (regles.js), couleursDuPlateau (partie.js),
// evaluerPosition, STYLES_IA (ia-evaluation.js) viennent de fichiers charges
// avant celui-ci.

// Les poids ajoutes par la version 2, par style — les autres sont ceux de la
// version 1. Une ejection menacee vaut un peu plus d'un dixieme de bille ;
// une fourchette, un demi-sumito... l'Agressif pese plus les siens, le
// Defensif compte aussi, a poids presque egal, ceux de l'adversaire (la
// valeur est symetrique).
const CLES_POIDS_IA_V2 = ['sumito', 'menaceEjection', 'fourchette'];
const STYLES_IA_V2 = {
  agressif: { ...STYLES_IA.agressif, sumito: 30, menaceEjection: 150, fourchette: 80 },
  normal: { ...STYLES_IA.normal, sumito: 20, menaceEjection: 120, fourchette: 60 },
  defensif: { ...STYLES_IA.defensif, sumito: 15, menaceEjection: 110, fourchette: 50 },
};

// La case voisine de chaque case dans chaque direction (null hors du plateau),
// et l'index de la direction opposee — calcules une fois : l'evaluation est
// appelee des milliers de fois par coup. Ce n'est que la geometrie de
// moteur/plateau.js, mise en table.
const CASES_VOISINES_IA = Object.fromEntries(
  casesDuPlateau().map(({ q, r }) => {
    const notation = versNotation(q, r);
    return [notation, DIRECTIONS.map((direction) => caseDansLaDirection(notation, direction))];
  })
);
const INDEX_DIRECTION_OPPOSEE = DIRECTIONS.map((direction) =>
  DIRECTIONS.findIndex((autre) => autre.q === -direction.q && autre.r === -direction.r)
);

// Les sumitos que `camp` peut jouer sur `couleurs` (notation -> couleur) : un
// par bille de tete et par direction, [{ tete, direction, ejection }]. Le
// groupe est la tete et jusqu'a 2 billes amies derriere elle, dans l'axe.
function sumitosDuCamp(couleurs, camp) {
  const adverse = couleurAdverse(camp);
  const sumitos = [];
  for (const [tete, couleur] of Object.entries(couleurs)) {
    if (couleur !== camp) continue;
    DIRECTIONS.forEach((direction, index) => {
      const cible = CASES_VOISINES_IA[tete][index];
      if (cible === null || couleurs[cible] !== adverse) return;
      const arriere = INDEX_DIRECTION_OPPOSEE[index];
      const groupe = [tete];
      let suivante = CASES_VOISINES_IA[tete][arriere];
      while (groupe.length < BILLES_MAX_PAR_COUP && suivante !== null && couleurs[suivante] === camp) {
        groupe.unshift(suivante);
        suivante = CASES_VOISINES_IA[suivante][arriere];
      }
      if (groupe.length < 2) return;
      const coup = coupEnLigne(groupe, direction, couleurs, camp);
      if (!coup || coup.billesPoussees.length === 0) return;
      const derniere = coup.billesPoussees[coup.billesPoussees.length - 1];
      sumitos.push({ tete, direction, ejection: CASES_VOISINES_IA[derniere][index] === null });
    });
  }
  return sumitos;
}

// Ce que les sumitos d'un camp valent, avec `poids`.
function valeurDesSumitos(sumitos, poids) {
  const ejections = sumitos.filter((sumito) => sumito.ejection).length;
  const enPlus = Math.max(0, sumitos.length - 1);
  return poids.sumito * sumitos.length + poids.menaceEjection * ejections + poids.fourchette * enPlus;
}

// La valeur de `etat` pour `camp` (le camp de l'IA), version 2.
function evaluerPositionV2(etat, camp, poids) {
  const base = evaluerPosition(etat, camp, poids);
  if (etat.vainqueur) return base;
  const couleurs = couleursDuPlateau(etat.plateau);
  return base + valeurDesSumitos(sumitosDuCamp(couleurs, camp), poids) - valeurDesSumitos(sumitosDuCamp(couleurs, couleurAdverse(camp)), poids);
}
