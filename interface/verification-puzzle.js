// Verification d'un puzzle par le solveur (phase 28, PLAN.md) : quand la
// lancer, que faire de la reponse, et le cache `sol_starts` qui en resulte.
// Reprend le deroulement de KAAWA (kaa_engine_ClO_Co.py, pzl_check_move_realtime,
// _launch_early_verify_solver, _check_pzl_solution, _check_pzl_solution_solver) :
//
//   1. PENDANT la partie, des qu'un coup du gagnant sort de toutes les branches
//      connues (moteur/solveur.js, verificationAnticipeeDue), le solveur part
//      en arriere-plan sur les coups deja joues — demande de saab : ne pas
//      attendre la fin pour commencer un calcul qui peut durer.
//   2. A LA FIN (puzzle gagne au bon tour), la sequence deja prouvee par le
//      cache vaut "Bravo" tout de suite ; un debut deja refuse par l'etape 1
//      vaut "Ce n'est pas la solution" tout de suite ; sinon le solveur
//      verifie la sequence ENTIERE — rapide, sa table est encore chaude.
//
// ECART ASSUME avec KAAWA : chez lui, un "VALID" de l'etape 1 (qui n'a verifie
// que le DEBUT de la partie) suffit a dire "Bravo" a la fin, sans jamais
// verifier la suite — la meme classe de "Bravo a tort" que KAAWA combat
// ailleurs (_find_sol_starts_matching_depth). Ici, seul un REFUS du debut est
// definitif (une sequence refusee a un coup l'est quelle que soit la suite) ;
// une acceptation est toujours re-verifiee sur la sequence complete.
//
// Le cache vit dans le navigateur (localStorage), jamais dans donnees/ (fichiers
// de KAAWA, jamais modifies) : les branches ajoutees par KAAH sont fusionnees a
// celles du fichier a la lecture. Toujours dans l'orientation d'ORIGINE du
// puzzle (coups depermutes, phase 16bis) ; le solveur, lui, verifie la partie
// telle qu'elle est affichee, avec les coups tels qu'ils ont ete ecrits.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lireReponseSolveur,
// brancheCompacte, fusionnerBranchesSolution, tourMaxEnCache,
// correspondanceAuCache, verificationAnticipeeDue (moteur/solveur.js),
// lireBranchesSolution (moteur/puzzles.js) viennent de fichiers charges avant.

const CLE_SOLUTIONS_EN_CACHE = 'kaah-puzzles-sol-starts';

function lireSolutionsEnCache() {
  try {
    return JSON.parse(window.localStorage.getItem(CLE_SOLUTIONS_EN_CACHE) ?? '{}');
  } catch {
    return {};
  }
}

// Le sol_starts effectif d'un puzzle : celui du fichier, plus ce que KAAH a
// prouve depuis (voir l'en-tete du fichier).
function solutionEnCacheDuPuzzle(nom, solutionDuFichier) {
  const ajouts = lireSolutionsEnCache()[nom] ?? '';
  return fusionnerBranchesSolution(solutionDuFichier ?? '', ajouts.split('|'));
}

function ajouterAuCacheDuPuzzle(nom, branche) {
  if (!branche) return;
  const cache = lireSolutionsEnCache();
  cache[nom] = fusionnerBranchesSolution(cache[nom] ?? '', [branche]);
  try {
    window.localStorage.setItem(CLE_SOLUTIONS_EN_CACHE, JSON.stringify(cache));
  } catch {
    // Tant pis : la verification a eu lieu, seul le raccourci suivant manquera.
  }
}

// `puzzle` : { nom, toursMaximum, campGagnant }. `positionJouee` : la position
// de depart telle qu'elle est affichee (orientation choisie, phase 16bis).
// `rappels` : { surVerdict() — reafficher le bandeau ; marquerResolue() —
// orientation resolue (phase 16bis) ; reglagesPzl() — { cache_offset_tours,
// save_threshold_sec } ; consommerReglagesPzl() — voir moteur/reglages.js }.
function demarrerVerificationPuzzle(solveur, puzzle, positionJouee, solutionDuFichier, rappels) {
  const decalage = puzzle.campGagnant === 'blanc' ? 1 : 0;
  // Par sequence de coups affiches : { verdict: 'en cours' } puis la reponse
  // lue (lireReponseSolveur) avec sa duree, et `finale` pour la verif de fin.
  const resultats = new Map();
  let resolueDejaMarquee = false;

  function solution() {
    return solutionEnCacheDuPuzzle(puzzle.nom, solutionDuFichier);
  }

  function lancer(coupsAffiches, coupsCanoniques, finale) {
    const cle = coupsAffiches.join(' ');
    resultats.set(cle, { verdict: 'en cours', finale });
    solveur
      .verifier({ position: positionJouee, noirGagne: decalage === 0, toursMaximum: puzzle.toursMaximum, coups: coupsAffiches })
      .then(({ reponse, duree }) => {
        // `lente` : au-dela de pzl.save_threshold_sec, KAAWA previent (popup
        // "Vérification lente") — ici, le bandeau (interface/puzzles.js).
        const lente = duree > rappels.reglagesPzl().save_threshold_sec;
        const lu = { ...lireReponseSolveur(reponse), duree, finale, lente };
        resultats.set(cle, lu);
        if (finale) conclure(lu, coupsCanoniques);
        rappels.surVerdict();
      });
  }

  // _check_pzl_solution_solver : ce qu'un verdict FINAL laisse derriere lui.
  function conclure(lu, coupsCanoniques) {
    const { cache_offset_tours: decalageCache } = rappels.reglagesPzl();
    const tourMax = tourMaxEnCache(puzzle.toursMaximum, decalageCache);
    if (lu.verdict === 'valide') {
      ajouterAuCacheDuPuzzle(puzzle.nom, brancheCompacte(coupsCanoniques, decalage, tourMax));
      marquerResolue();
    } else if (lu.verdict === 'invalide' && lu.rang > 1) {
      // _save_confirmed_prefix_on_invalid : les coups AVANT le coup fautif
      // ont ete valides un par un, ils sont surs.
      ajouterAuCacheDuPuzzle(puzzle.nom, brancheCompacte(coupsCanoniques.slice(0, lu.rang - 1), decalage, tourMax));
    }
    if (lu.verdict === 'valide' || lu.verdict === 'invalide') rappels.consommerReglagesPzl();
  }

  function marquerResolue() {
    if (resolueDejaMarquee) return;
    resolueDejaMarquee = true;
    rappels.marquerResolue();
  }

  // Un debut de cette sequence deja refuse par le solveur ?
  function refusSurUnDebut(cle) {
    for (const [autre, lu] of resultats) {
      if (lu.verdict === 'invalide' && (cle === autre || cle.startsWith(`${autre} `))) return lu;
    }
    return null;
  }

  // A appeler a chaque changement de la partie. `etat` : moteur.etatDuPuzzle.
  // Renvoie le verdict a afficher pour cette sequence, ou null (rien a dire).
  function suivre(coupsAffiches, coupsCanoniques, etat) {
    const cle = coupsAffiches.join(' ');
    if (etat.resultat === 'en cours') {
      // UNE verification anticipee a la fois, comme KAAWA (_pzl_early_solver_started) :
      // sans cache, chaque coup suivant serait "hors branche", et les calculs
      // s'empileraient dans le worker, devant la verification de fin.
      const uneDejaEnCours = [...resultats.values()].some((lu) => lu.verdict === 'en cours');
      const branches = lireBranchesSolution(solution(), puzzle.campGagnant);
      if (!uneDejaEnCours && !resultats.has(cle) && verificationAnticipeeDue(branches, coupsCanoniques, decalage)) {
        lancer(coupsAffiches, coupsCanoniques, false);
      }
      return null;
    }
    if (etat.resultat !== 'resolu' || etat.tropTot) return null;

    const connu = resultats.get(cle);
    if (connu?.finale) return connu;
    if (correspondanceAuCache(solution(), coupsCanoniques, puzzle.campGagnant, puzzle.toursMaximum) === 'complete') {
      marquerResolue();
      return { verdict: 'valide', duree: 0, finale: true };
    }
    const refus = refusSurUnDebut(cle);
    if (refus) return { ...refus, finale: true };
    lancer(coupsAffiches, coupsCanoniques, true);
    return resultats.get(cle);
  }

  return { suivre };
}
