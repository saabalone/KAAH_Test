// Les puzzles de KAAWA (phase 16, marquee ⚠ dans PLAN.md). Format releve
// dans les vrais fichiers (donnees/KAA_PZL_kaa.json, copie telle quelle —
// voir CLAUDE.md, "Compatibilite des fichiers"), pas devine :
//   { content: [ { PZL_name, pos, creator, winner, "nb tour",
//     sol_starts?, ... }, ... ] }
//
// UN SEUL CHAMP FAIT REELLEMENT AUTORITE : le nom. KAAWA ne lit ni
// `winner` ni `nb tour` pour jouer — il relit a chaque fois le marqueur
// `xtrNx`/`xtrNy` DANS LE NOM (kaa_engine_ClO_Co.py, une dizaine
// d'endroits, tous avec la meme expression reguliere). Les deux autres
// champs ne sont qu'un affichage, et rien ne garantit qu'ils soient
// d'accord avec le nom. KAAH fait pareil : le nom, et rien d'autre.
//
// Les trois conventions reproduites ici sont du genre a ne rien faire
// planter si on les rate — un puzzle serait juste gagnable alors qu'il ne
// devrait pas l'etre. Elles sont donc verifiees contre un etalon produit
// en EXECUTANT les vraies fonctions Python (voir tests/puzzles.test.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lirePosition vient de
// moteur/notation.js, erreurDePosition de moteur/variantes.js et
// EJECTIONS_POUR_GAGNER de moteur/partie.js — tous charges avant celui-ci
// dans index.html.

// `xtr3x1` = "gagner en 3 tours, x = Noir" ; `xtr4y1` = "en 4 tours, y =
// Blanc". Le chiffre qui suit parfois la lettre (`xtr3x1`) et tout ce qui
// traine derriere (`xtr3x1_solver_test1`, `xtr6x_test_solv`, `xtr7x1_Pzl`,
// tous presents dans les vrais fichiers) ne sont PAS lus par KAAWA : son
// expression reguliere s'arrete a la lettre de camp. La notre aussi.
const MARQUEUR_PUZZLE = /xtr(\d+)([xy])/;

// Un coup Nacre tel qu'il apparait dans sol_starts : deux coordonnees
// collees, ex. "h7i6" (voir CLAUDE.md, "Coup Nacre").
const COUP_NACRE = /[a-i]\d[a-i]\d/;

// Renvoie { toursMaximum, campGagnant } lu dans le nom, ou `null` si ce
// n'est pas un puzzle (une variante ordinaire, par exemple).
function lireNomPuzzle(nom) {
  const trouve = MARQUEUR_PUZZLE.exec(String(nom));
  if (!trouve) return null;
  return { toursMaximum: Number(trouve[1]), campGagnant: trouve[2] === 'x' ? 'noir' : 'blanc' };
}

// Decoupe UNE branche de solution en coups du camp gagnant, dans l'ordre
// des tours. KAAWA accepte deux ecritures (kaa_engine_ClO_Co.py,
// _sol_parse_branch), et les deux cohabitent dans les vrais fichiers — on
// en trouve meme une de chaque de part et d'autre d'un meme `|` :
//
//   - format recent, numerote : "1.e6c6/b6a5 2.d5d7/d8e9 3.d7b5" — le coup
//     du gagnant suit le numero de tour, celui du perdant suit un "/" et
//     reste facultatif ;
//   - format ancien, alterne : "e6c6 b6a5 d5d7 d8e9..." — tous les coups a
//     la suite, un sur deux appartenant au gagnant.
//
// Le second n'est PAS un repli du premier : c'est le format numerote qui
// est cherche d'abord, et l'ancien ne sert que si aucun "N.coup" n'est
// trouve. La difference compte, parce qu'une branche mixte
// ("1.A4A2 A1B1 2.A2B4", vue dans KAA_PZL_usual.json) est alors lue comme
// numerotee : le coup nu "A1B1" y est du perdant, et il est simplement
// IGNORE plutot que pris pour un coup du gagnant.
//
// `decalageDuGagnant` vaut 0 si le gagnant ouvre (Noir joue toujours en
// premier, voir CLAUDE.md), 1 si c'est le perdant qui ouvre.
function coupsDuGagnantDansUneBranche(texte, decalageDuGagnant) {
  const branche = String(texte).trim().toLowerCase();
  if (!branche) return [];

  if (new RegExp(`\\d+\\.${COUP_NACRE.source}`).exec(branche)) {
    const numerotes = [
      ...branche.matchAll(new RegExp(`(\\d+)\\.(${COUP_NACRE.source})(?:/(${COUP_NACRE.source}))?`, 'g')),
    ];
    return numerotes
      .map(([, tour, coupDuGagnant]) => ({ tour: Number(tour), coupDuGagnant }))
      .sort((premier, second) => premier.tour - second.tour)
      .map(({ coupDuGagnant }) => coupDuGagnant);
  }

  const tousLesCoups = [...branche.matchAll(new RegExp(COUP_NACRE.source, 'g'))].map(([coup]) => coup);
  return tousLesCoups.filter((coup, rang) => rang % 2 === decalageDuGagnant);
}

// Toutes les branches d'un champ `sol_starts`, separees par "|" : un meme
// puzzle peut avoir plusieurs solutions, et elles se valent toutes (le
// PLAN en fait un critere de la phase). Une branche vide, ou dont on ne
// tire aucun coup du gagnant, est abandonnee — comme dans KAAWA.
// Renvoie [] quand il n'y a pas de solution en cache : le puzzle reste
// parfaitement jouable, il n'est simplement pas verifiable (voir
// verifierSolutionPuzzle).
function lireBranchesSolution(solution, campGagnant) {
  // Noir ouvre toujours (CLAUDE.md, "fait etabli") : si c'est Blanc qui
  // doit gagner, ses coups sont donc les seconds de chaque paire.
  const decalageDuGagnant = campGagnant === 'blanc' ? 1 : 0;
  return String(solution ?? '')
    .split('|')
    .map((branche) => coupsDuGagnantDansUneBranche(branche, decalageDuGagnant))
    .filter((coups) => coups.length > 0);
}

// Compare les coups DU GAGNANT deja joues aux branches connues. Renvoie
// { verifiable, conforme, ecartAuCoup } :
//   - verifiable : faux quand le puzzle n'a aucune solution en cache ;
//   - conforme : la sequence jouee EST une des branches, en entier ;
//   - ecartAuCoup : le rang (1, 2, 3...) du premier coup qui ne colle a
//     AUCUNE branche, ou `null` tant qu'aucun ne detonne.
//
// Un debut correct mais incomplet n'est ni conforme ni un ecart : il n'est
// pas encore fini. Et une branche plus COURTE que la sequence jouee ne
// compte pas comme un ecart non plus (meme regle que KAAWA,
// pzl_check_move_realtime : "branche plus courte -> prefixe deja valide") —
// une branche en cache s'arrete parfois avant la fin de la partie.
function verifierSolutionPuzzle(branches, coupsDuGagnant) {
  if (branches.length === 0) return { verifiable: false, conforme: false, ecartAuCoup: null };

  let branchesCompatibles = branches;
  for (const [rang, coup] of coupsDuGagnant.entries()) {
    branchesCompatibles = branchesCompatibles.filter(
      (branche) => rang >= branche.length || branche[rang] === coup
    );
    if (branchesCompatibles.length === 0) {
      return { verifiable: true, conforme: false, ecartAuCoup: rang + 1 };
    }
  }

  const conforme = branchesCompatibles.some(
    (branche) =>
      branche.length === coupsDuGagnant.length && branche.every((coup, rang) => coup === coupsDuGagnant[rang])
  );
  return { verifiable: true, conforme, ecartAuCoup: null };
}

// Le puzzle vient-il d'etre perdu ? A appeler APRES chaque coup, avec
// l'etat tel qu'il est A CE MOMENT-LA — c'est-a-dire avec `joueurAuTrait`
// deja passe a l'adversaire de celui qui vient de jouer.
//
// C'EST LE PIEGE DE CETTE PHASE (signale dans PLAN.md). KAAWA teste
// justement APRES le changement de camp (kaa_engine_ClO_Co.py, end_turn) :
// "comme le camp a deja change, on regarde si le joueur a gagne avant que
// l'adversaire joue". D'ou une condition qui parait a l'envers — on teste
// `blanc au trait` pour juger le dernier coup de NOIR — et surtout d'ou
// l'asymetrie du seuil, qui n'est pas une coquille :
//   - Noir doit gagner (xtrNx) : perdu des que le numero de tour atteint N ;
//   - Blanc doit gagner (xtrNy) : perdu seulement a N+1.
// Elle vient de ce que Noir joue en premier : au moment ou Blanc finit son
// tour N, le compteur de tours n'a pas encore avance. Les 756 combinaisons
// possibles sont comparees a KAAWA dans tests/puzzles.test.js.
function puzzlePerduApresCoup({ toursMaximum, campGagnant, joueurAuTrait, tourCourant, ejectionsDuGagnant }) {
  // Objectif atteint : il n'y a plus rien a perdre.
  if (ejectionsDuGagnant >= EJECTIONS_POUR_GAGNER) return false;
  if (campGagnant === 'noir') return joueurAuTrait === 'blanc' && tourCourant >= toursMaximum;
  return joueurAuTrait === 'noir' && tourCourant >= toursMaximum + 1;
}

// Lit un fichier KAA_PZL_*.json en entier. Meme forme que lireVariantes
// (moteur/variantes.js), et meme purete : l'objet recu n'est jamais
// modifie. Une entree dont le nom ne porte aucun marqueur xtr est ignoree
// plutot que refusee — les fichiers de saab melangent parfois puzzles et
// autres entrees, et un fichier entier ne doit pas devenir illisible pour
// une ligne. `estMy` et `entree` : comme lireVariantes (moteur/variantes.js).
function lirePuzzles(donnees, estMy = false) {
  const puzzles = [];
  for (const entree of donnees.content ?? []) {
    const objectif = lireNomPuzzle(entree.PZL_name);
    if (!objectif) continue;

    const erreur = erreurDePosition(entree.pos);
    if (erreur) throw new Error(`Puzzle "${entree.PZL_name}" invalide : ${erreur}`);

    puzzles.push({
      nom: entree.PZL_name,
      position: lirePosition(entree.pos),
      texteBrut: entree.pos,
      createur: entree.creator ?? '',
      categorie: entree.type ?? '', // PZL_E, Mini_PZL_M... (moteur/classement.js)
      toursMaximum: objectif.toursMaximum,
      campGagnant: objectif.campGagnant,
      branchesSolution: lireBranchesSolution(entree.sol_starts, objectif.campGagnant),
      my: estMy,
      entree,
    });
  }
  return puzzles;
}

// Ou en est un puzzle en cours ? Prend tous les coups joues depuis la
// position de depart, dans l'ordre (Noir d'abord, toujours — CLAUDE.md),
// et renvoie :
//   { resultat: 'en cours' | 'resolu' | 'perdu', tour, tropTot, verification }
// `verification` est celle de verifierSolutionPuzzle sur les seuls coups du
// camp qui doit gagner.
//
// `tropTot` : gagner AVANT le tour demande reste une victoire, mais ce
// n'est pas la solution du puzzle — KAAWA le dit mot pour mot ("Trop
// rapide! ... gagne au tour X/N", _check_pzl_timing).
//
// La regle de fin n'est PAS reecrite ici : elle est demandee a
// puzzlePerduApresCoup, evaluee au moment ou KAAWA l'evalue — juste apres
// le dernier coup du camp qui doit gagner, camp au trait deja passe a
// l'adversaire. C'est ce decalage d'un cran qui fait toute la difficulte
// de cette regle, et il ne doit exister qu'a un seul endroit.
function etatDuPuzzle(puzzle, { coupsJoues, ejectionsDuGagnant, vainqueur }) {
  const decalageDuGagnant = puzzle.campGagnant === 'blanc' ? 1 : 0;
  const coupsDuGagnant = coupsJoues.filter((_, rang) => rang % 2 === decalageDuGagnant);
  const verification = verifierSolutionPuzzle(puzzle.branchesSolution, coupsDuGagnant);
  const tour = numeroDeTour(coupsJoues.length);

  if (vainqueur === puzzle.campGagnant) {
    return { resultat: 'resolu', tour, tropTot: tour < puzzle.toursMaximum, verification };
  }
  if (vainqueur) return { resultat: 'perdu', tour, tropTot: false, verification };

  // Nombre de coups joues au moment ou le gagnant venait de finir son
  // dernier tour : c'est LA que la regle se juge.
  const coupsAuDernierTourDuGagnant = coupsDuGagnant.length * 2 - (decalageDuGagnant === 0 ? 1 : 0);
  const perdu =
    coupsDuGagnant.length > 0 &&
    puzzlePerduApresCoup({
      toursMaximum: puzzle.toursMaximum,
      campGagnant: puzzle.campGagnant,
      joueurAuTrait: puzzle.campGagnant === 'noir' ? 'blanc' : 'noir',
      tourCourant: numeroDeTour(coupsAuDernierTourDuGagnant),
      ejectionsDuGagnant,
    });

  return { resultat: perdu ? 'perdu' : 'en cours', tour, tropTot: false, verification };
}
