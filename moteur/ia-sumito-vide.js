// L'ajout « sv », le SUMITO VIDE (saab, 2026-10-07 : « des pseudo sumito
// 2/1o2, c'est-a-dire sumito 2m/1a suivi d'un trou (o) suivi de 2a ... faire
// 2m/1a alors qu'en face on a 1ao2a va former un 2m/3a, qui est un sumito
// adverse 3a/2m, et donc c'est tres souvent inutile de pousser, sauf si sur la
// case o on avait un sumito 2m/o ou 3m/o sur les cotes pour reprendre cette
// case qui est devenue 1a »). Un sumito 2 contre 1 est vide quand la bille
// poussee tombe dans un trou suivi d'au moins 2 billes adverses — sauf si une
// ligne de 2 ou 3 billes amies, sur un autre axe, pourra pousser la bille
// arrivee dans le trou. Seul le 2 contre 1 l'est : apres un 3 contre 1, c'est
// 3 contre 3, personne ne repousse.
//
// Un AJOUT, pas une version (saab : « on devrait pouvoir ajouter ces reglages
// sur toutes les versions precedentes, donc plutot un suffixe ») : un profil
// l'a s'il a son poids (moteur/ia.js, lireMachine), et son nom porte le
// suffixe (nomDeLaMachine : KAI++7_Nor_30s_v4el10sv). Son poids, negatif,
// retire au camp la valeur de ses sumitos vides : celui propose annule un
// sumito 2 contre 1 de la version 2.
//
// Joue par KAI++ (solveur/kai-plus.cpp, sumitos_vides) ; cette copie sert a
// l'affichage et tests/kai-plus.test.js l'exige egale.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : DIRECTIONS (plateau.js),
// BILLES_MAX_PAR_COUP, couleurAdverse (regles.js), couleursDuPlateau
// (partie.js), DISTANCE_AU_CENTRE (ia-evaluation.js), RAYON_PLATEAU (plateau.js), CASES_VOISINES_IA,
// INDEX_DIRECTION_OPPOSEE, sumitosDuCamp (ia-evaluation-v2.js), nombreDAmiesALaSuite, caseApres (ia-evaluation-v4.js)
// viennent de fichiers charges avant celui-ci.

// La liste des ajouts et leurs poids proposes : moteur/ia-ajouts.js.
const BILLES_DU_SUMITO_VIDE = 2;
const ADVERSES_DERRIERE_LE_TROU = 2;

// Une ligne amie sur un autre axe que `index` pourra-t-elle pousser la bille
// arrivee dans le trou ? Ses billes visent le trou ; la bille et celles qui la
// suivent sont moins nombreuses, puis une case vide ou le bord.
function trouRepris(couleurs, trou, index, camp) {
  const adverse = couleurAdverse(camp);
  return DIRECTIONS.some((_, axe) => {
    if (axe === index || axe === INDEX_DIRECTION_OPPOSEE[index]) return false;
    const amies = nombreDAmiesALaSuite(couleurs, trou, INDEX_DIRECTION_OPPOSEE[axe], camp, BILLES_MAX_PAR_COUP);
    const poussees = 1 + nombreDAmiesALaSuite(couleurs, trou, axe, adverse, BILLES_MAX_PAR_COUP);
    if (amies < BILLES_DU_SUMITO_VIDE || amies <= poussees) return false;
    const apres = caseApres(trou, axe, poussees);
    return apres === null || couleurs[apres] === undefined;
  });
}

// Combien de sumitos vides `camp` a sur `couleurs` (notation -> couleur).
function sumitosVides(couleurs, camp) {
  const adverse = couleurAdverse(camp);
  let nombre = 0;
  for (const [tete, couleur] of Object.entries(couleurs)) {
    if (couleur !== camp) continue;
    DIRECTIONS.forEach((_, index) => {
      const cible = CASES_VOISINES_IA[tete][index];
      if (cible === null || couleurs[cible] !== adverse) return;
      // Exactement 2 billes : la tete et une amie derriere elle.
      const arriere = INDEX_DIRECTION_OPPOSEE[index];
      if (nombreDAmiesALaSuite(couleurs, tete, arriere, camp, BILLES_MAX_PAR_COUP) !== BILLES_DU_SUMITO_VIDE - 1) return;
      const trou = CASES_VOISINES_IA[cible][index];
      if (trou === null || couleurs[trou] !== undefined) return;
      if (nombreDAmiesALaSuite(couleurs, trou, index, adverse, BILLES_MAX_PAR_COUP) < ADVERSES_DERRIERE_LE_TROU) return;
      if (!trouRepris(couleurs, trou, index, camp)) nombre++;
    });
  }
  return nombre;
}

// Le terme du sumito vide pour `camp` (le camp de l'IA) : ses sumitos vides
// moins ceux de l'adversaire, fois le poids.
function termeDuSumitoVide(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return poids.sumitoVide * (sumitosVides(couleurs, camp) - sumitosVides(couleurs, couleurAdverse(camp)));
}

// L'ajout « Sc », le SUMITO CONTRE (saab, 2026-10-19 : « il pousse des sumito 3-2 qui se font
// contrer » ; « fait le sumito 3-2 comme le 2-1 ») : un sumito 3 contre 2 sans ejection est
// contre quand, juste apres lui, l'adversaire peut pousser une des trois billes qui viennent
// de pousser. Le contre ne vient jamais de la meme ligne (3 contre 3 ne pousse pas), mais
// d'un autre axe : le sumito vide, lui, ne regarde que la ligne. Son poids, negatif, retire au
// camp la valeur de ses 3-2 contres ; celui propose annule le Sumito 3/2.
// Joue par KAI++ (solveur/kai-plus.cpp, sumitos_contres) ; tests/kai-plus.test.js l'exige egal.
const BILLES_DU_SUMITO_CONTRE = 3;
const POUSSEES_DU_SUMITO_CONTRE = 2;

// `camp` peut-il pousser une des billes de `arrivees` sur `couleurs` ?
function pousseUneDe(couleurs, camp, arrivees) {
  return sumitosDuCamp(couleurs, camp).some(({ tete, direction, poussees }) => {
    const index = DIRECTIONS.indexOf(direction);
    let poussee = tete;
    for (let rang = 0; rang < poussees; rang++) {
      poussee = CASES_VOISINES_IA[poussee][index];
      if (arrivees.has(poussee)) return true;
    }
    return false;
  });
}

// Combien de sumitos 3-2 contres `camp` a sur `couleurs` (notation -> couleur).
function sumitosContres(couleurs, camp) {
  const adverse = couleurAdverse(camp);
  return sumitosDuCamp(couleurs, camp).filter(({ tete, direction, billes, poussees, ejection }) => {
    if (billes !== BILLES_DU_SUMITO_CONTRE || poussees !== POUSSEES_DU_SUMITO_CONTRE || ejection) return false;
    const index = DIRECTIONS.indexOf(direction);
    const milieu = CASES_VOISINES_IA[tete][INDEX_DIRECTION_OPPOSEE[index]];
    const queue = CASES_VOISINES_IA[milieu][INDEX_DIRECTION_OPPOSEE[index]];
    const premiere = CASES_VOISINES_IA[tete][index];
    const sortie = CASES_VOISINES_IA[CASES_VOISINES_IA[premiere][index]][index];
    // Apres la poussee : la queue se vide, tout avance d'une case.
    const apres = { ...couleurs, [premiere]: camp, [sortie]: adverse };
    delete apres[queue];
    return pousseUneDe(apres, adverse, new Set([milieu, tete, premiere]));
  }).length;
}

// Le terme du sumito contre pour `camp` : ses 3-2 contres moins ceux de l'adversaire, fois le poids.
function termeDuSumitoContre(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return poids.sumitoContre * (sumitosContres(couleurs, camp) - sumitosContres(couleurs, couleurAdverse(camp)));
}

// Les BILLES VULNERABLES (saab, 2026-10-20, d'apres les reglages d'ULA, qui bat AP10 : « boules
// poussables, multipoussables, poussables sur bord, ejectables, multiejectables » ; « OK ») :
// les billes de `camp` que l'adversaire peut pousser sur `couleurs`, comptees bille par bille
// (KAI++ ne comptait que les sumitos possibles) — de plusieurs facons (multi), au bord, et
// celles qu'un sumito ejecte. Une facon : un sumito de l'adversaire (sumitosDuCamp, un par
// premiere bille poussee et direction). Les ajouts Bp, Bmp, Bpb, Be, Bme (moteur/ia-ajouts.js).
// Joue par KAI++ (solveur/kai-plus.cpp, billes_vulnerables) ; tests/kai-plus.test.js l'exige egal.
function billesVulnerables(couleurs, camp) {
  const poussees = {};
  const ejectables = {};
  for (const { tete, direction, poussees: nombre, ejection } of sumitosDuCamp(couleurs, couleurAdverse(camp))) {
    const index = DIRECTIONS.indexOf(direction);
    let bille = tete;
    for (let rang = 0; rang < nombre; rang++) {
      bille = CASES_VOISINES_IA[bille][index];
      poussees[bille] = (poussees[bille] ?? 0) + 1;
    }
    if (ejection) ejectables[bille] = (ejectables[bille] ?? 0) + 1;
  }
  return {
    poussables: Object.keys(poussees).length,
    multipoussables: Object.values(poussees).filter((facons) => facons > 1).length,
    poussablesAuBord: Object.keys(poussees).filter((bille) => DISTANCE_AU_CENTRE[bille] === RAYON_PLATEAU).length,
    ejectables: Object.keys(ejectables).length,
    multiejectables: Object.values(ejectables).filter((facons) => facons > 1).length,
  };
}

// Chaque ajout et ce qu'il compte, dans l'ordre de solveur/kai-plus.cpp (evaluer).
const COMPTES_DES_BILLES_VULNERABLES = {
  billesPoussables: 'poussables',
  billesMultipoussables: 'multipoussables',
  billesPoussablesBord: 'poussablesAuBord',
  billesEjectables: 'ejectables',
  billesMultiejectables: 'multiejectables',
};

// Les termes des billes vulnerables que `poids` porte, pour `camp` : { cle: valeur } — chaque
// poids (negatif) par bille vulnerable du camp, moins celles de l'adversaire ; un poids a 0 ne
// compte pas.
function termesDesBillesVulnerables(etat, camp, poids) {
  const presents = Object.keys(COMPTES_DES_BILLES_VULNERABLES).filter((cle) => cle in poids);
  if (presents.length === 0) return {};
  const couleurs = couleursDuPlateau(etat.plateau);
  const miennes = billesVulnerables(couleurs, camp);
  const siennes = billesVulnerables(couleurs, couleurAdverse(camp));
  return Object.fromEntries(presents.map((cle) => [cle, poids[cle] * (miennes[COMPTES_DES_BILLES_VULNERABLES[cle]] - siennes[COMPTES_DES_BILLES_VULNERABLES[cle]])]));
}
