// Ce que la recherche de la machine (moteur/ia-recherche.js) retient d'une
// position a l'autre, le temps d'un coup (saab, 2026-10-01 : « Niveau 8, 30 s
// sur tel, ne va pas plus loin que niv 5 ou 6 ») — pour examiner moins de
// positions, donc aller plus loin dans le meme temps. Rien ici ne change la
// VALEUR trouvee a une profondeur donnee (tests/ia-memoire.test.js) :
//   - la table de transpositions : une position deja cherchee a la meme
//     profondeur restante — atteinte par un autre ordre des memes coups,
//     frequent a l'Abalone — n'est pas cherchee deux fois : sa valeur exacte,
//     ou la borne qui suffit a couper, est reprise. A profondeur EGALE
//     seulement : une valeur cherchee plus loin changerait le resultat, et
//     KAI++ (solveur/kai-plus.cpp, la meme memoire) doit trouver le meme ;
//   - son meilleur coup, essaye en premier, d'une profondeur a la suivante ;
//   - les coups tueurs : ceux qui ont coupe a la meme distance de la racine,
//     dans une position voisine, essayes tot ;
//   - l'historique : les coups qui coupent souvent, a toute distance.
// Une victoire se range relative a la position (sa distance a la racine
// retiree), et se relit a la distance ou on la retrouve : la recherche
// prefere la victoire la plus proche (moteur/ia-recherche.js, `distance`).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ecrirePosition
// (notation.js), caseDansLaDirection (plateau.js), VALEUR_VICTOIRE_IA
// (ia-evaluation.js) viennent de fichiers charges avant celui-ci.

// Au-dela, la table repart vide : quelques dizaines de Mo au plus, meme sur
// un telephone.
const TAILLE_MAX_TABLE_IA = 200000;
const TUEURS_PAR_DISTANCE = 2;

function creerMemoireIA() {
  return { table: new Map(), tueurs: [], historique: new Map() };
}

// La position ET le camp au trait : la meme position ne vaut pas la meme
// chose selon qui doit jouer.
function cleDePositionIA(etat, position = ecrirePosition(etat)) {
  return `${position}${etat.joueurAuTrait}`;
}

// Un coup, quelle que soit la position : sa premiere et sa derniere bille,
// sa direction.
function cleDeCoupIA(coup) {
  const { q, r } = coup.direction;
  return `${coup.billes[0]}${coup.billes[coup.billes.length - 1]}${q},${r}`;
}

const estUneVictoire = (valeur) => Math.abs(valeur) > VALEUR_VICTOIRE_IA / 2;

// `entree` : { profondeur (restante), valeur (pour le camp au trait), borne
// ('exacte', 'basse' : au moins, 'haute' : au plus), indexCoup (le meilleur,
// dans tousLesCoupsLegaux ; -1 sans), suite (la sequence prevue) }.
function ecrireDansLaTable(memoire, cle, distance, entree) {
  if (memoire.table.size >= TAILLE_MAX_TABLE_IA) memoire.table.clear();
  const valeur = estUneVictoire(entree.valeur) ? entree.valeur + Math.sign(entree.valeur) * distance : entree.valeur;
  memoire.table.set(cle, { ...entree, valeur });
}

function lireDansLaTable(memoire, cle, distance) {
  const entree = memoire.table.get(cle);
  if (!entree || !estUneVictoire(entree.valeur)) return entree;
  return { ...entree, valeur: entree.valeur - Math.sign(entree.valeur) * distance };
}

// La valeur gardee suffit-elle, sans chercher, dans la fenetre [alpha, beta] ?
function valeurSuffisante({ valeur, borne }, alpha, beta) {
  if (borne === 'exacte') return true;
  return borne === 'basse' ? valeur >= beta : valeur <= alpha;
}

// `coup` vient de couper a `distance` de la racine, avec `profondeur` coups
// encore a regarder : plus elle est grande, plus la coupure a epargne.
function noterCoupure(memoire, coup, distance, profondeur) {
  const cle = cleDeCoupIA(coup);
  const tueurs = memoire.tueurs[distance] ?? [];
  if (!tueurs.includes(cle)) memoire.tueurs[distance] = [cle, ...tueurs].slice(0, TUEURS_PAR_DISTANCE);
  memoire.historique.set(cle, (memoire.historique.get(cle) ?? 0) + profondeur * profondeur);
}

function ejecteUneBille(coup) {
  const derniere = coup.billesPoussees[coup.billesPoussees.length - 1];
  return derniere !== undefined && caseDansLaDirection(derniere, coup.direction) === null;
}

// Les coups les plus prometteurs d'abord — l'elagage alpha-beta coupe
// d'autant plus qu'il les rencontre tot : celui de la table, puis les
// ejections et les poussees (les plus forcants), les coups tueurs, et le reste
// par historique. Tri stable : l'ordre recu departage les egaux.
const RANGS_DES_COUPS_IA = Object.freeze({ table: 4, ejection: 3, poussee: 2, tueur: 1, autre: 0 });

function rangDuCoup(coup, cle, coupDeLaTable, tueurs) {
  if (coup === coupDeLaTable) return RANGS_DES_COUPS_IA.table;
  if (ejecteUneBille(coup)) return RANGS_DES_COUPS_IA.ejection;
  if (coup.billesPoussees.length > 0) return RANGS_DES_COUPS_IA.poussee;
  return tueurs.includes(cle) ? RANGS_DES_COUPS_IA.tueur : RANGS_DES_COUPS_IA.autre;
}

function ordonnerAvecMemoire(coups, memoire, distance, coupDeLaTable) {
  const tueurs = memoire.tueurs[distance] ?? [];
  const notes = new Map(
    coups.map((coup) => {
      const cle = cleDeCoupIA(coup);
      return [coup, { rang: rangDuCoup(coup, cle, coupDeLaTable, tueurs), historique: memoire.historique.get(cle) ?? 0 }];
    })
  );
  return [...coups].sort((a, b) => notes.get(b).rang - notes.get(a).rang || notes.get(b).historique - notes.get(a).historique);
}
