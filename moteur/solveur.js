// Ce qui entoure le solveur (phase 28, PLAN.md) : lire ses reponses, et le
// cache `sol_starts` des puzzles au format EXACT de KAAWA. Pur, sans DOM ni
// stockage ni worker (interface/solveur.js et interface/verification-
// puzzle.js s'en chargent) ; le calcul lui-meme est le C++ de saab, compile
// tel quel (solveur/).
//
// Les fonctions sol_starts reproduisent kaa_engine_ClO_Co.py
// (_sol_branch_to_compact, _sol_parse_branch, _sol_merge_branches,
// _pzl_cache_max_tour, _check_pzl_solution etape 1, pzl_check_move_realtime),
// comparees a leur execution reelle (tests/reference-sol-starts-kaawa.json).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : COUP_NACRE et
// verifierSolutionPuzzle viennent de moteur/puzzles.js, charge avant.

// Une reponse de kaah_verifier (solveur/kaah-solveur.cpp) :
//   "VALID" | "INVALID <RAISON> [<rang> <coup>]" | "INDETERMINE" | "ERREUR ...".
// Un calcul interrompu par sa limite de temps n'est JAMAIS un echec : rien
// n'a ete prouve (test 4).
function lireReponseSolveur(texte) {
  const [mot, raison = null, rang = null, coup = null] = String(texte).trim().split(/\s+/);
  if (mot === 'VALID') return { verdict: 'valide', raison: null, rang: null, coup: null };
  if (mot === 'INDETERMINE') return { verdict: 'indetermine', raison: null, rang: null, coup: null };
  if (mot === 'INVALID') {
    return { verdict: 'invalide', raison, rang: rang === null ? null : Number(rang), coup };
  }
  return { verdict: 'erreur', raison, rang: null, coup: null };
}

// _sol_branch_to_compact : les coups joues (gagnant et perdant alternes, Noir
// d'abord) deviennent "1.e6c6/b6a5 2.d5d7/d8e9 3.d7b5". `decalageDuGagnant` :
// 0 si Noir gagne, 1 si Blanc gagne — le coup du perdant range au tour N est
// alors celui qui PRECEDE le N-ieme coup de Blanc (KAAWA, tel quel).
// `tourMax` (null = pas de limite) : voir tourMaxEnCache. `sansPerdantJusquAuTour` :
// tours dont le coup du perdant n'a pas ete reverifie, donc pas certifie.
function brancheCompacte(coups, decalageDuGagnant, tourMax = null, sansPerdantJusquAuTour = 0) {
  const gagnant = coups.filter((_, rang) => rang % 2 === decalageDuGagnant);
  const perdant = coups.filter((_, rang) => rang % 2 !== decalageDuGagnant);
  const morceaux = [];
  for (const [rang, coup] of gagnant.entries()) {
    const tour = rang + 1;
    if (tourMax !== null && tour > tourMax) break;
    let morceau = `${tour}.${coup.toLowerCase()}`;
    if (rang < perdant.length && tour > sansPerdantJusquAuTour) morceau += `/${perdant[rang].toLowerCase()}`;
    morceaux.push(morceau);
  }
  return morceaux.join(' ');
}

// _sol_parse_branch : [tour, coupDuGagnant, coupDuPerdant | null] par tour.
// Deux ecritures acceptees (voir moteur/puzzles.js, coupsDuGagnantDansUneBranche).
function lireBrancheSolution(texte, decalageDuGagnant) {
  const branche = String(texte).trim().toLowerCase();
  if (!branche) return [];
  const nacre = COUP_NACRE.source;
  if (new RegExp(`\\d+\\.${nacre}`).test(branche)) {
    return [...branche.matchAll(new RegExp(`(\\d+)\\.(${nacre})(?:/(${nacre}))?`, 'g'))].map(
      ([, tour, gagnant, perdant]) => [Number(tour), gagnant, perdant ?? null]
    );
  }
  const coups = [...branche.matchAll(new RegExp(nacre, 'g'))].map(([coup]) => coup);
  const gagnant = coups.filter((_, rang) => rang % 2 === decalageDuGagnant);
  const perdant = coups.filter((_, rang) => rang % 2 !== decalageDuGagnant);
  return gagnant.map((coup, rang) => [rang + 1, coup, rang < perdant.length ? perdant[rang] : null]);
}

// _sol_merge_branches : ajoute les nouvelles branches au cache existant (sans
// doublon), puis retire toute branche ENGLOBEE par une autre au moins aussi
// longue (meme coup du gagnant a chaque tour, perdant en plus ou identique).
function fusionnerBranchesSolution(existant, nouvelles) {
  const deja = new Set();
  const toutes = [];
  for (const branche of [...String(existant).split('|'), ...nouvelles]) {
    const propre = branche.trim();
    if (propre && !deja.has(propre)) {
      deja.add(propre);
      toutes.push(propre);
    }
  }
  const englobe = (court, long) => long === court || long.startsWith(`${court}/`);
  const morceaux = toutes.map((branche) => branche.split(' '));
  return toutes
    .filter((_, i) =>
      !morceaux.some(
        (autres, j) =>
          i !== j &&
          autres.length >= morceaux[i].length &&
          morceaux[i].every((morceau, k) => k >= autres.length || englobe(morceau, autres[k]))
      )
    )
    .join(' | ');
}

// _pzl_cache_max_tour : on ne met en cache que les premiers tours — le
// solveur est rapide sur les derniers. `decalage` = pzl.cache_offset_tours.
function tourMaxEnCache(toursMaximum, decalage) {
  return Math.max(1, toursMaximum - decalage);
}

// _check_pzl_solution, etape 1 : la sequence jouee (coups en minuscules, Noir
// d'abord) est-elle DEJA prouvee par le cache ? 'complete' seulement si une
// branche en accord sur TOUS ses coups (gagnant et perdant connus) couvre
// jusqu'a l'avant-dernier tour du gagnant, sans aucun coup de perdant manquant
// avant — un cache tronque ne prouve rien sur la suite. 'partielle' : branche
// en accord mais partie encore trop courte. 'aucune' sinon.
function correspondanceAuCache(solStarts, coupsJoues, campGagnant, toursMaximum) {
  const decalage = campGagnant === 'blanc' ? 1 : 0;
  const gagnant = coupsJoues.filter((_, rang) => rang % 2 === decalage);
  const perdant = coupsJoues.filter((_, rang) => rang % 2 !== decalage);
  const avantDernierDemiCoup = decalage === 0 ? Math.max(1, 2 * toursMaximum - 3) : Math.max(1, 2 * (toursMaximum - 1));
  const tourExige = toursMaximum - 1;
  let meilleure = 'aucune';
  for (const texte of String(solStarts).split('|')) {
    const tours = lireBrancheSolution(texte, decalage);
    if (tours.length === 0) continue;
    const enAccord = tours.every(
      ([tour, coupGagnant, coupPerdant]) =>
        tour <= gagnant.length &&
        gagnant[tour - 1] === coupGagnant &&
        (coupPerdant === null || (tour <= perdant.length && perdant[tour - 1] === coupPerdant))
    );
    if (!enAccord) continue;
    const dernierTour = Math.max(...tours.map(([tour]) => tour));
    const trouPerdant = tours.some(([tour, , coupPerdant]) => tour <= tourExige && coupPerdant === null);
    if (dernierTour < tourExige || trouPerdant) continue;
    if (coupsJoues.length >= avantDernierDemiCoup) return 'complete';
    meilleure = 'partielle';
  }
  return meilleure;
}

// pzl_check_move_realtime : faut-il deja lancer le solveur, sans attendre la
// fin ? Des qu'un coup du gagnant sort de toutes les branches connues
// (`branches` : coups du gagnant seuls, voir lireBranchesSolution) — pour que
// le verdict soit pret, ou presque, a la fin du puzzle. Sans aucune branche,
// KAAWA laisse passer le tout premier coup (une sequence d'un coup ne prouve
// rien) et lance au coup suivant du gagnant.
function verificationAnticipeeDue(branches, coupsJoues, decalageDuGagnant) {
  const coupsDuGagnant = coupsJoues.filter((_, rang) => rang % 2 === decalageDuGagnant);
  if (branches.length === 0) return coupsDuGagnant.length >= (decalageDuGagnant === 0 ? 2 : 1);
  return verifierSolutionPuzzle(branches, coupsDuGagnant).ecartAuCoup !== null;
}
