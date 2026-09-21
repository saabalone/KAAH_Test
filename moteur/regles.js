// Coups legaux d'Abalone.
// Reproduit le comportement de KAAWA (calculate_possible_moves,
// kaa_engine_ClO_Co.py) : le premier clic fixe la premiere bille du groupe,
// et on cherche tous les groupes de 1 a 3 billes ancres sur cette bille —
// voir CLAUDE.md, "la selection se fait en 2 clics".
// Ce fichier ne modifie jamais le plateau qu'on lui donne, et ne connait
// rien d'autre de la partie (compteurs, historique...) : voir partie.js.
//
// Pas d'import ni d'export (voir plateau.js) : DIRECTIONS,
// caseDansLaDirection et depuisNotation viennent de plateau.js, charge
// avant celui-ci dans index.html.

// Regle d'Abalone : un coup deplace au maximum 3 billes alignees.
const BILLES_MAX_PAR_COUP = 3;

function couleurEn(plateau, notation) {
  return plateau[notation] ?? null; // null = case vide
}

function couleurAdverse(couleur) {
  return couleur === 'noir' ? 'blanc' : 'noir';
}

function directionsEgales(a, b) {
  return a.q === b.q && a.r === b.r;
}

function directionOpposee(direction) {
  return { q: -direction.q, r: -direction.r };
}

// Construit tous les groupes de billes amies ancres sur `depart` : la bille
// seule, puis chaque prolongement en ligne droite (2, puis 3 billes) dans
// chacune des 6 directions.
function groupesDepuis(plateau, joueurAuTrait, depart) {
  const groupes = [[depart]];

  for (const direction of DIRECTIONS) {
    let groupe = [depart];
    let derniereBille = depart;

    while (groupe.length < BILLES_MAX_PAR_COUP) {
      const suivante = caseDansLaDirection(derniereBille, direction);
      if (suivante === null || couleurEn(plateau, suivante) !== joueurAuTrait) break;
      groupe = [...groupe, suivante];
      derniereBille = suivante;
      groupes.push(groupe);
    }
  }

  return groupes;
}

// Vecteur d'alignement d'un groupe, de sa premiere a sa derniere bille,
// reduit a un seul pas. null pour une bille seule : elle n'a pas d'axe a
// exclure des deplacements lateraux.
function axeDuGroupe(groupe) {
  if (groupe.length < 2) return null;
  const debut = depuisNotation(groupe[0]);
  const fin = depuisNotation(groupe[groupe.length - 1]);
  const pas = groupe.length - 1;
  return { q: (fin.q - debut.q) / pas, r: (fin.r - debut.r) / pas };
}

// Regle d'Abalone (deplacement lateral, ou "broadside") : un groupe peut
// glisser dans une direction qui n'est pas son propre axe, si toutes les
// cases d'arrivee sont libres.
function coupLateral(groupe, direction, plateau) {
  for (const bille of groupe) {
    const arrivee = caseDansLaDirection(bille, direction);
    if (arrivee === null || couleurEn(plateau, arrivee) !== null) return null;
  }
  return { billes: groupe, direction, billesPoussees: [] };
}

// Regle d'Abalone (deplacement en ligne, avec ou sans poussee / "sumito") :
// un groupe de 2 ou 3 billes avance dans son propre axe. Il peut pousser
// jusqu'a 2 billes adverses s'il est strictement plus nombreux qu'elles, et
// que la case juste apres elles est libre ou hors du plateau (ejection).
function coupEnLigne(groupe, direction, plateau, joueurAuTrait) {
  const derniereBille = groupe[groupe.length - 1];
  const cible = caseDansLaDirection(derniereBille, direction);
  if (cible === null) return null;

  const couleurCible = couleurEn(plateau, cible);
  if (couleurCible === null) {
    return { billes: groupe, direction, billesPoussees: [] };
  }
  if (couleurCible !== couleurAdverse(joueurAuTrait)) return null;

  // On compte les billes adverses consecutives : au plus 2, puisqu'un
  // groupe d'au plus 3 billes ne peut jamais en pousser davantage.
  const adverses = [cible];
  const suivante = caseDansLaDirection(cible, direction);
  if (suivante !== null && couleurEn(plateau, suivante) === couleurAdverse(joueurAuTrait)) {
    adverses.push(suivante);
  }

  if (groupe.length <= adverses.length) return null; // pas assez nombreux pour pousser

  const derniereAdverse = adverses[adverses.length - 1];
  const caseApres = caseDansLaDirection(derniereAdverse, direction);
  const ejection = caseApres === null;
  const caseLibre = caseApres !== null && couleurEn(plateau, caseApres) === null;
  if (!ejection && !caseLibre) return null; // bloque par une bille, alliee ou adverse

  return { billes: groupe, direction, billesPoussees: adverses };
}

// Enumere les coups legaux dont le groupe est ancre sur `depart` : la bille
// que le joueur a cliquee en premier. Renvoie un tableau vide si cette case
// n'appartient pas au joueur au trait (ex. bille adverse ou case vide).
function coupsDepuis(plateau, joueurAuTrait, depart) {
  if (couleurEn(plateau, depart) !== joueurAuTrait) return [];

  const coups = [];
  for (const groupe of groupesDepuis(plateau, joueurAuTrait, depart)) {
    const axe = axeDuGroupe(groupe);

    for (const direction of DIRECTIONS) {
      const directionAlignee =
        axe && (directionsEgales(direction, axe) || directionsEgales(direction, directionOpposee(axe)));
      if (directionAlignee) continue; // traite ci-dessous, par coupEnLigne

      const coup = coupLateral(groupe, direction, plateau);
      if (coup) coups.push(coup);
    }

    if (axe) {
      const coup = coupEnLigne(groupe, axe, plateau, joueurAuTrait);
      if (coup) coups.push(coup);
    }
  }

  return coups;
}
