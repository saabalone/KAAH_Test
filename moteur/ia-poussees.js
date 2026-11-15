// Ce que les POUSSEES font vraiment (saab, 2026-10-30 : « Comment montrer qu'une bille poussée/coupée par
// l'adversaire peut facilement se retourner contre lui ou facilement reformer une position forte ? ex. sumito 3/2
// qui se fait recouper donnant un 3/2 en contre ..., ou une bille poussée qui peut s'échapper pour reformer un
// groupe ou sumito, càd une position plus forte ou sans effet notable » ; « Ok, 1 et 2 ») : deux ajouts.
//   - Bpe, les billes poussees a effet : comme Bp (ia-sumito-vide.js, billesVulnerables), mais une bille ne
//     compte que si, juste apres la poussee, elle est au bord, ou n'a plus aucune bille de son camp a deux cases
//     ou moins — elle ne peut plus se regrouper en un coup. Une poussee qui la laisse pres des siennes est sans
//     effet ;
//   - Pr, les poussees qui se retournent : les sumitos de l'adversaire, sans ejection, apres lesquels on peut
//     aussitot pousser une des billes qui viennent de pousser — Sc (ia-sumito-vide.js) pour tous les sumitos, vu
//     du defenseur.
// Puis Mc, la menace de coupure (saab, 2026-11-01 : « Ok fais le ») : contre AP6 (2611012124), apres 4-4, KAI++
// finissait en 6 a 8 groupes, 28 des 44 sumitos d'AP6 le coupaient. Gs compte les groupes deja separes ; Mc, les
// sumitos de l'adversaire, sans ejection, apres lesquels le camp aurait un groupe de plus — la coupure avant qu'elle
// arrive, comme Bp les billes poussables.
// Joues par KAI++ (solveur/kai-plus.cpp, billes_poussees_a_effet, poussees_retournees, coupures_possibles) ;
// tests/kai-plus.test.js les exige egaux. Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : DIRECTIONS, RAYON_PLATEAU (plateau.js), couleurAdverse
// (regles.js), couleursDuPlateau (partie.js), DISTANCE_AU_CENTRE (ia-evaluation.js), CASES_VOISINES_IA,
// INDEX_DIRECTION_OPPOSEE, sumitosDuCamp (ia-evaluation-v2.js), pousseUneDe (ia-sumito-vide.js) viennent de
// fichiers charges avant celui-ci ; groupesEnPlus (ia-ajouts.js, charge apres) ne sert qu'a l'appel.

// La case a `pas` cases de `depart` dans la direction d'indice `index` (null hors du plateau).
function caseApresDesPas(depart, index, pas) {
  let ici = depart;
  for (let rang = 0; rang < pas && ici !== null; rang++) ici = CASES_VOISINES_IA[ici][index];
  return ici;
}

// Le plateau juste apres un sumito de `pousseur` (sumitosDuCamp), et ou sont allees ses billes et celles poussees :
// { apres, pousseurs (leurs cases), poussees ([{ origine, arrivee }], arrivee null : ejectee) }.
function apresLeSumito(couleurs, pousseur, { tete, direction, billes, poussees }) {
  const index = DIRECTIONS.indexOf(direction);
  const arriere = INDEX_DIRECTION_OPPOSEE[index];
  const queue = caseApresDesPas(tete, arriere, billes - 1);
  const cible = CASES_VOISINES_IA[tete][index];
  const origines = Array.from({ length: poussees }, (_, rang) => caseApresDesPas(cible, index, rang));
  const sortie = caseApresDesPas(cible, index, poussees);
  const apres = { ...couleurs, [cible]: pousseur };
  delete apres[queue];
  if (sortie !== null) apres[sortie] = couleurAdverse(pousseur);
  const pousseurs = [cible, ...Array.from({ length: billes - 1 }, (_, rang) => caseApresDesPas(tete, arriere, rang))];
  return { apres, pousseurs, poussees: origines.map((origine) => ({ origine, arrivee: CASES_VOISINES_IA[origine][index] })) };
}

// `camp` a-t-il une bille a deux cases ou moins de `ici` sur `couleurs` ?
function amieADeuxCases(couleurs, ici, camp) {
  for (const voisine of CASES_VOISINES_IA[ici]) {
    if (voisine === null) continue;
    if (couleurs[voisine] === camp) return true;
    for (const suivante of CASES_VOISINES_IA[voisine]) if (suivante !== null && suivante !== ici && couleurs[suivante] === camp) return true;
  }
  return false;
}

// Les billes de `camp` qu'un sumito de l'adversaire pousse avec effet (au bord, ou loin des siennes), une fois
// chacune ; une bille ejectee est comptee par Be.
function billesPousseesAEffet(couleurs, camp) {
  const touchees = new Set();
  for (const sumito of sumitosDuCamp(couleurs, couleurAdverse(camp))) {
    const { apres, poussees } = apresLeSumito(couleurs, couleurAdverse(camp), sumito);
    for (const { origine, arrivee } of poussees) {
      if (arrivee !== null && (DISTANCE_AU_CENTRE[arrivee] === RAYON_PLATEAU || !amieADeuxCases(apres, arrivee, camp))) touchees.add(origine);
    }
  }
  return touchees.size;
}

// Les sumitos de l'adversaire, sans ejection, que `camp` peut aussitot retourner contre lui.
function pousseesRetournees(couleurs, camp) {
  return sumitosDuCamp(couleurs, couleurAdverse(camp)).filter((sumito) => {
    if (sumito.ejection) return false;
    const { apres, pousseurs } = apresLeSumito(couleurs, couleurAdverse(camp), sumito);
    return pousseUneDe(apres, camp, new Set(pousseurs));
  }).length;
}

// Le terme Bpe pour `camp` : ses billes poussees a effet moins celles de l'adversaire, fois le poids (negatif).
function termeDesBillesPousseesAEffet(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return poids.billesPousseesAEffet * (billesPousseesAEffet(couleurs, camp) - billesPousseesAEffet(couleurs, couleurAdverse(camp)));
}

// Le terme Pr pour `camp` : les poussees de l'adversaire qu'il retourne moins les siennes que l'adversaire
// retourne, fois le poids (positif).
function termeDesPousseesRetournees(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return poids.pousseesRetournees * (pousseesRetournees(couleurs, camp) - pousseesRetournees(couleurs, couleurAdverse(camp)));
}

// Les sumitos de l'adversaire, sans ejection (une ejection, la menace d'ejection la compte deja), apres lesquels
// `camp` aurait un groupe de plus.
function coupuresPossibles(couleurs, camp) {
  const lui = couleurAdverse(camp);
  const avant = groupesEnPlus(couleurs, camp);
  return sumitosDuCamp(couleurs, lui).filter((sumito) => !sumito.ejection && groupesEnPlus(apresLeSumito(couleurs, lui, sumito).apres, camp) > avant).length;
}

// Le terme Mc pour `camp` : ses coupures possibles moins celles de l'adversaire, fois le poids (negatif).
function termeDeLaMenaceDeCoupure(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return poids.menaceDeCoupure * (coupuresPossibles(couleurs, camp) - coupuresPossibles(couleurs, couleurAdverse(camp)));
}

// L'ajout « Td », les lignes 3/2 OUVERTES (saab, 2026-11-12 : « la case e5 évite les éjections 3/2 adverse dans l'axe et on pourrait
// repérer les autres cases qui évitent aussi les 3/2 sur les 2 couronnes » ; « ok, essaie les 2 »). Une ejection 3/2 : 5 cases alignees,
// les 3 premieres a l'attaquant, les 2 dernieres au defenseur, la derniere au bord dans cette direction. Tenir une des 3 premieres
// l'empeche : e5 en ferme 6, chaque case de l'anneau 1 et chaque case de l'anneau 2 sur les axes de e5 en ferment 5. Td compte, comme Bp
// mais avant la menace, les lignes ou deux de ses billes sont ainsi au bord sans qu'aucune des 3 cases de l'attaquant soit a soi.
const BILLES_DE_L_ATTAQUANT_DU_TROIS_DEUX = 3;
const BILLES_DU_DEFENSEUR_DU_TROIS_DEUX = 2;
const CASES_D_UNE_EJECTION_TROIS_DEUX = BILLES_DE_L_ATTAQUANT_DU_TROIS_DEUX + BILLES_DU_DEFENSEUR_DU_TROIS_DEUX;

function lignesTroisDeuxOuvertes(couleurs, camp) {
  let ouvertes = 0;
  for (const depart of Object.keys(CASES_VOISINES_IA)) {
    for (let index = 0; index < CASES_VOISINES_IA[depart].length; index++) {
      const ligne = Array.from({ length: CASES_D_UNE_EJECTION_TROIS_DEUX }, (_, pas) => caseApresDesPas(depart, index, pas));
      if (ligne.includes(null) || CASES_VOISINES_IA[ligne.at(-1)][index] !== null) continue; // la derniere au bord
      const defenseur = ligne.slice(BILLES_DE_L_ATTAQUANT_DU_TROIS_DEUX);
      const attaquant = ligne.slice(0, BILLES_DE_L_ATTAQUANT_DU_TROIS_DEUX);
      if (defenseur.every((notation) => couleurs[notation] === camp) && !attaquant.some((notation) => couleurs[notation] === camp)) ouvertes++;
    }
  }
  return ouvertes;
}

// Le terme Td pour `camp` : ses lignes ouvertes moins celles de l'adversaire, fois le poids (negatif).
function termeDesLignesTroisDeuxOuvertes(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return poids.lignesTroisDeuxOuvertes * (lignesTroisDeuxOuvertes(couleurs, camp) - lignesTroisDeuxOuvertes(couleurs, couleurAdverse(camp)));
}
