// Les ajouts « ec » et « ea », l'ETENDUE de chaque camp (saab, 2026-10-07 :
// « un poids sur les cases (vides ou pleines, car ce sera celui qui peut y
// acceder qui aura le meilleur poids) selon la distance de cette case, en
// prenant la bille comme centre, sur 4 couronnes autour d'elle — un peu comme
// si chaque bille etait l'equivalent de e5 ... et les plus proches prendraient
// le dessus sur les plus eloignees »).
//
// Chaque case VIDE va au camp qui l'atteint en le moins de coups (4 au plus ;
// a egalite, a personne), et vaut pour lui, divise par ce nombre de coups :
//   - ec (etendueCentre) : son poids, le meme pour toutes les cases ;
//   - ea (etendueCases) : une part (son poids) de la valeur de la case
//     (e5 … a1, moteur/ia-evaluation-v3.js) — une version 3 ou plus.
// Une case occupee compte deja par sa bille (Centre, Cases).
// Les coups se comptent par les vraies regles, les autres billes immobiles :
// un pas est permis si la ligne de la bille (elle et ses amies devant, 3 au
// plus) avance sur une case vide ou pousse moins nombreuse qu'elle
// (ia-evaluation-v4.js, peutAvancer) — 4 ou 5 billes en ligne n'avancent pas
// dans leur axe (saab : « elles n'iront au mieux que jusqu'a la couronne 3 ou 4 »).
//
// L'ajout « da » (etendueReference) multiplie l'etendue d'un camp par
// reference / billes adverses (saab : « si on divise par le camp adverse, ca
// pourrait donner plus de poids pour le plus nombreux ») : 1 a 14 contre 14.
//
// Joue par KAI++ (solveur/kai-plus.cpp, etendue_du_camp) ; cette copie sert a
// l'affichage et tests/kai-plus.test.js l'exige egale : les cases se comptent
// en nombres entiers, par distance et par classe, et la somme se fait toujours
// dans le meme ordre.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : DIRECTIONS (plateau.js),
// couleurAdverse (regles.js), couleursDuPlateau (partie.js), CASES_VOISINES_IA
// (ia-evaluation-v2.js), CLES_CASES_IA_V3, CLASSE_DES_CASES_IA
// (ia-evaluation-v3.js), peutAvancer (ia-evaluation-v4.js) viennent de
// fichiers charges avant celui-ci.

const COUPS_D_ETENDUE_MAX = 4;

// En combien de coups `camp` atteint chaque case (COUPS_D_ETENDUE_MAX au plus) :
// { notation: coups } — 0 pour ses billes.
function distancesDuCamp(couleurs, camp) {
  const distances = {};
  let vague = Object.keys(couleurs).filter((notation) => couleurs[notation] === camp);
  for (const notation of vague) distances[notation] = 0;
  for (let coups = 1; coups <= COUPS_D_ETENDUE_MAX && vague.length > 0; coups++) {
    const suivante = [];
    for (const ici of vague) {
      DIRECTIONS.forEach((_, index) => {
        const voisine = CASES_VOISINES_IA[ici][index];
        if (voisine === null || voisine in distances || !peutAvancer(couleurs, ici, index, camp)) return;
        distances[voisine] = coups;
        suivante.push(voisine);
      });
    }
    vague = suivante;
  }
  return distances;
}

// Les cases vides de chaque camp, comptees par coups (1 a 4) et par classe
// (l'ordre de CLES_CASES_IA_V3) : { noir: [[...9], ...4], blanc: ... }.
function casesDeLEtendue(couleurs) {
  const vide = () => Array.from({ length: COUPS_D_ETENDUE_MAX }, () => CLES_CASES_IA_V3.map(() => 0));
  const comptes = { noir: vide(), blanc: vide() };
  const distances = { noir: distancesDuCamp(couleurs, 'noir'), blanc: distancesDuCamp(couleurs, 'blanc') };
  for (const notation of Object.keys(CASES_VOISINES_IA)) {
    if (couleurs[notation] !== undefined) continue;
    const noir = distances.noir[notation] ?? Infinity;
    const blanc = distances.blanc[notation] ?? Infinity;
    if (noir === blanc) continue;
    const camp = noir < blanc ? 'noir' : 'blanc';
    comptes[camp][Math.min(noir, blanc) - 1][CLES_CASES_IA_V3.indexOf(CLASSE_DES_CASES_IA[notation])]++;
  }
  return comptes;
}

// L'etendue d'un camp : { centre (ses cases, chacune divisee par ses coups),
// cases (la valeur de chacune, divisee par ses coups) }.
function etendueDuCamp(comptes, poids) {
  let centre = 0;
  let cases = 0;
  for (let coups = 1; coups <= COUPS_D_ETENDUE_MAX; coups++) {
    const parClasse = comptes[coups - 1];
    centre += parClasse.reduce((somme, nombre) => somme + nombre, 0) / coups;
    CLES_CASES_IA_V3.forEach((cle, classe) => {
      cases += (parClasse[classe] * (poids[cle] ?? 0)) / coups;
    });
  }
  return { centre, cases };
}

// Les termes ec et ea pour `camp` (le camp de l'IA) : son etendue moins celle
// de l'adversaire, chacune multipliee par reference / billes adverses (« da »),
// fois le poids.
function termesDeLEtendue(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  const lui = couleurAdverse(camp);
  const comptes = casesDeLEtendue(couleurs);
  const billes = (couleur) => Object.values(couleurs).filter((autre) => autre === couleur).length;
  // « da » a 0 ne change rien, comme absent (solveur/kai-plus.cpp).
  const facteur = (couleur) => (poids.etendueReference ? poids.etendueReference / billes(couleurAdverse(couleur)) : 1);
  const miens = etendueDuCamp(comptes[camp], poids);
  const siens = etendueDuCamp(comptes[lui], poids);
  return {
    etendueCentre: (poids.etendueCentre ?? 0) * (miens.centre * facteur(camp) - siens.centre * facteur(lui)),
    etendueCases: (poids.etendueCases ?? 0) * (miens.cases * facteur(camp) - siens.cases * facteur(lui)),
  };
}
