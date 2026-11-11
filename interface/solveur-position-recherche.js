// La RECHERCHE du panneau Solveur (interface/solveur-position.js, regle des 200 lignes), dans l'ordre du solveur de
// KAAWA (saab, 2026-11-06, sa sortie : « Tour 1. 89 moves possibles. Pas de solution au tour 1 pour noir. 0.0 s ...
// Solution n° 1 ... Sequence : 1.E5B2 A1C1 2.D6D3 ... ») :
//   1. le gain le plus court, tour par tour, une ligne par tour ;
//   2. chaque premier coup du camp au trait, et la sequence de chaque solution des qu'elle est trouvee (saab :
//      « pourquoi, il note les séquences qu'après avoir vu tous les coups ? ») — la premiere seulement, sauf si
//      « Chercher toutes les solutions » est coche (saab : « sinon par défaut il s'arrête dès qu'il en trouve une ») ;
//   3. le perdant au trait, toutes les solutions : chaque defense qui perd plus vite, en combien de tours, et sa
//      sequence — comme les « sous-opt. » du solveur de KAAWA (true_tour).
// Les sequences viennent de la table du solveur lui-meme (kaah_sequence, extract_pv de son fichier ; saab : « Ok
// ajoute »), comme celles que KAAWA affiche, au lieu d'essayer les coups un par un.
// Le solveur fait toujours commencer Noir : la position lui est donnee camps inverses si Blanc est au trait
// (entreeDuPuzzleRecolte). Les cases, donc les coups, ne changent pas : les sequences se rejouent telles quelles sur la
// position du plateau.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lireReponseSolveur, lireSequenceDuSolveur (moteur/solveur.js),
// entreeDuPuzzleRecolte, toursDeLaVictoire (moteur/banc-puzzles.js), coupsEcritsDuCamp (interface/banc-essais-puzzles.js),
// toursDeLaVictoireForcee, jugerLesPremiersCoups (moteur/solveur-position.js), coupsDesPositions, textesDeLaSequence
// (moteur/ia.js), lirePosition (moteur/notation.js), formaterDateKAAWA (interface/sauvegarde.js) viennent d'autres
// fichiers, appeles seulement a l'usage.

const NOM_DU_CAMP_DU_SOLVEUR = { noir: 'Noir', blanc: 'Blanc' };
const MILLISECONDES_PAR_SECONDE_DU_SOLVEUR = 1000;
const DECIMALES_DES_SECONDES_DU_SOLVEUR = 1; // « 0.5 s », comme le solveur de KAAWA

// `cherche` : { etat, gagnant } ; `reglages` : { toursMax, toutes } ; `solveur` : { verifier, sequence }
// (interface/solveur.js) ; `rappels` : { dire(texte) (ou on en est), ajouterUneLigne(texte) (au resultat),
// montrerLeTableau(recherche), arrete() }. Renvoie { victoire } sans gain prouve, sinon la recherche : { victoire, tours,
// campGagnant, nomDuGagnant, gagnantAuTrait, toutes, lignes: [{ coup, verdict, coups, toursReels }], toutesJugees, fini }.
async function rechercherAvecLeSolveur(cherche, { toursMax, toutes }, solveur, rappels) {
  const date = formaterDateKAAWA(new Date());
  const entreeEn = (tours) => entreeDuPuzzleRecolte({ etat: cherche.etat, gagnant: cherche.gagnant, tours, numero: 0, date, createur: '' });
  const demande = (entree, tours, coups) => ({ position: entree.pos, noirGagne: entree.winner === 'Noir', toursMaximum: tours, coups });
  const verdict = async (entree, tours, coups) => lireReponseSolveur((await solveur.verifier(demande(entree, tours, coups))).reponse).verdict;
  const debut = performance.now();
  const secondes = () => ((performance.now() - debut) / MILLISECONDES_PAR_SECONDE_DU_SOLVEUR).toFixed(DECIMALES_DES_SECONDES_DU_SOLVEUR).replace('.', ',');
  const nomDuGagnant = NOM_DU_CAMP_DU_SOLVEUR[cherche.gagnant];

  // 1. Le gain le plus court.
  const premiers = coupsEcritsDuCamp(lirePosition(entreeEn(1).pos), 'noir');
  const victoire = await toursDeLaVictoireForcee(async (tours) => {
    rappels.dire(`Tour ${tours} : gain de ${nomDuGagnant} ? (solveur)…`);
    const leVerdict = await verdict(entreeEn(tours), tours, []);
    const quoi = { valide: `gain de ${nomDuGagnant}`, invalide: `pas de gain de ${nomDuGagnant}`, indetermine: 'pas jugé à temps' }[leVerdict] ?? 'arrêté';
    rappels.ajouterUneLigne(`Tour ${tours} : ${premiers.size} coups possibles, ${quoi} (${secondes()} s).`);
    return leVerdict;
  }, toursMax);
  if (victoire.tours === null || rappels.arrete()) return { victoire };

  // 2. Les premiers coups, et la sequence de chaque solution.
  const { tours } = victoire;
  const entree = entreeEn(tours);
  const campGagnant = entree.winner === 'Noir' ? 'noir' : 'blanc';
  const recherche = { victoire, tours, campGagnant, nomDuGagnant, gagnantAuTrait: cherche.gagnant === cherche.etat.joueurAuTrait, toutes, lignes: [], toutesJugees: false, fini: false };
  // La sequence apres le premier coup `coup`, tiree de la table du solveur, ecrite comme KAAH ecrit : les coups, ou null.
  const sequenceDepuis = async (coup) => {
    rappels.dire(`Séquence de ${coup.toUpperCase()} (solveur)…`);
    const lue = lireSequenceDuSolveur((await solveur.sequence(demande(entree, tours, [coup]))).reponse);
    if (lue.verdict !== 'valide') return null;
    // Le solveur ecrit ses coups a sa facon, parfois ambigue (CLAUDE.md) : on reprend la POSITION apres chacun, comme
    // pour KAI++ (moteur/ia.js), et le coup legal qui y mene, ecrit sans ambiguite.
    const apres = premiers.get(coup);
    const positions = lue.coups.map(({ position }) => position);
    const suite = coupsDesPositions(apres, positions);
    if (suite.length !== positions.length) return null;
    return [coup, ...textesDeLaSequence(apres, suite).map((texte) => texte.toLowerCase())];
  };
  const juges = await jugerLesPremiersCoups(
    [...premiers.keys()],
    (coup) => {
      rappels.dire(`1er coup ${recherche.lignes.length + 1}/${premiers.size} : ${coup.toUpperCase()} (solveur)…`);
      return verdict(entree, tours, [coup]);
    },
    sequenceDepuis,
    {
      toutes,
      apresChaque: (lignes) => {
        recherche.lignes = lignes;
        rappels.montrerLeTableau(recherche);
      },
    }
  );
  recherche.toutesJugees = juges.toutesJugees;

  // 3. Les defenses qui perdent plus vite : le gagnant y prend son gain le plus court (kaah_sequence), dont la longueur
  // dit les tours.
  if (toutes && !recherche.gagnantAuTrait) {
    for (const ligne of recherche.lignes.filter(({ verdict: leVerdict }) => leVerdict === 'invalide')) {
      if (rappels.arrete()) return recherche;
      ligne.coups = await sequenceDepuis(ligne.coup);
      if (ligne.coups) ligne.toursReels = toursDeLaVictoire(ligne.coups.length, campGagnant === 'noir');
      rappels.montrerLeTableau(recherche);
    }
  }
  recherche.fini = true;
  rappels.montrerLeTableau(recherche);
  return recherche;
}
