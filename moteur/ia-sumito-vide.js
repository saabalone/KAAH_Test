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
// (partie.js), CASES_VOISINES_IA, INDEX_DIRECTION_OPPOSEE (ia-evaluation-v2.js), nombreDAmiesALaSuite, caseApres (ia-evaluation-v4.js)
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
