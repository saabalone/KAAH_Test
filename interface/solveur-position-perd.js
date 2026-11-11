// « PERD » dans le panneau Solveur (saab, 2026-11-07 : « Dans solveur il faudrait ajouter un btn Perd, comme ça on
// pourrait voir les coups qui perdent et donc ceux qui restent seraient une bonne défense, sinon si on cherche Gagne on
// ne voit pas les coups qu'on peut essayer qd c'est le perdant au trait ») : pour chaque coup du camp au trait, le
// gain force de l'adversaire en Tours maxi ou moins (kaah_sequence : son gain le plus court, et sa sequence). Les coups
// sans gain force « tiennent » : ce sont ceux a essayer. Contrairement a Gagne, la position de depart n'a pas besoin
// d'etre perdue. Plus long que Gagne : une recherche par coup.
//
// Apres le coup, l'adversaire est au trait : le solveur, qui fait toujours commencer Noir, recoit la position camps
// inverses si l'adversaire est Blanc (entreeDuPuzzleRecolte) — toujours « Noir gagne », donc une seule table de
// transposition gardee d'un coup a l'autre. Les cases, donc les coups, ne changent pas.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lireSequenceDuSolveur (moteur/solveur.js), entreeDuPuzzleRecolte,
// toursDeLaVictoire (moteur/banc-puzzles.js), coupsEcritsDuCamp (interface/banc-essais-puzzles.js), coupsDesPositions,
// textesDeLaSequence (moteur/ia.js), couleurAdverse (moteur/regles.js), lirePosition (moteur/notation.js),
// NOM_DU_CAMP_DU_SOLVEUR (interface/solveur-position-recherche.js) viennent d'autres fichiers, appeles seulement a l'usage.

// `cherche` : { etat } ; `reglages` : { toursMax } ; `solveur` : { sequence } (interface/solveur.js) ; `rappels` : comme
// rechercherAvecLeSolveur. Renvoie la recherche : { perd: true, tours, nomDuCamp, nomDuGagnant (l'adversaire), lignes:
// [{ coup, verdict ('valide' : tient, 'invalide' : perd, ou pas juge), coups, toursReels }], fini }.
async function rechercherLesCoupsQuiPerdent(cherche, { toursMax }, solveur, rappels) {
  const camp = cherche.etat.joueurAuTrait;
  const adversaire = couleurAdverse(camp);
  const premiers = coupsEcritsDuCamp(cherche.etat, camp);
  const recherche = { perd: true, tours: toursMax, nomDuCamp: NOM_DU_CAMP_DU_SOLVEUR[camp], nomDuGagnant: NOM_DU_CAMP_DU_SOLVEUR[adversaire], lignes: [], fini: false };
  for (const [coup, apres] of premiers) {
    if (rappels.arrete()) return recherche;
    rappels.dire(`Coup ${recherche.lignes.length + 1}/${premiers.size} : ${coup.toUpperCase()} — ${recherche.nomDuGagnant} gagne-t-il en ${toursMax} tours ou moins ? (solveur)…`);
    const entree = entreeDuPuzzleRecolte({ etat: apres, gagnant: adversaire, tours: toursMax, numero: 0, date: '', createur: '' });
    const lue = lireSequenceDuSolveur((await solveur.sequence({ position: entree.pos, noirGagne: entree.winner === 'Noir', toursMaximum: toursMax, coups: [] })).reponse);
    // Le tableau garde les verdicts de Gagne : pas de gain de l'adversaire (« AUCUNE »), le coup tient — 'valide', en
    // vert et en tete comme une solution ; un gain de l'adversaire, le coup perd — 'invalide'.
    const ligne = { coup, verdict: { invalide: 'valide', valide: 'invalide' }[lue.verdict] ?? lue.verdict, coups: null, toursReels: null };
    if (lue.verdict === 'valide') {
      // Les coups du solveur, retrouves par la position apres chacun (comme pour KAI++, moteur/ia.js).
      const depart = lirePosition(entree.pos);
      const positions = lue.coups.map(({ position }) => position);
      const suite = coupsDesPositions(depart, positions);
      if (suite.length === positions.length) ligne.coups = [coup, ...textesDeLaSequence(depart, suite).map((texte) => texte.toLowerCase())];
      // Le coup, puis le gain de l'adversaire : ses tours a lui.
      ligne.toursReels = toursDeLaVictoire(1 + positions.length, false);
    }
    recherche.lignes.push(ligne);
    rappels.montrerLeTableau(recherche);
  }
  recherche.fini = true;
  rappels.montrerLeTableau(recherche);
  return recherche;
}

// Le bilan d'une recherche Perd, en lignes de texte.
function lignesDuBilanDesPertes({ tours, nomDuCamp, nomDuGagnant, lignes }) {
  const tiennent = lignes.filter(({ verdict }) => verdict === 'valide');
  const perdent = lignes.filter(({ verdict }) => verdict === 'invalide');
  const pasJuges = lignes.length - tiennent.length - perdent.length;
  const pasJugesTexte = pasJuges ? ` ; ${pasJuges} pas jugés à temps` : '';
  const auPlusVite = perdent.length ? Math.min(...perdent.map(({ toursReels }) => toursReels)) : null;
  const auPlusTard = perdent.length ? Math.max(...perdent.map(({ toursReels }) => toursReels)) : null;
  if (tiennent.length === 0 && perdent.length > 0) {
    return [`${nomDuCamp} au trait : tous ses coups perdent en ${tours} tours ou moins ; la meilleure défense tient ${auPlusTard} tour${auPlusTard > 1 ? 's' : ''}${pasJugesTexte}.`];
  }
  const pertes = perdent.length ? `, ${perdent.length} perdent (${nomDuGagnant} gagne en ${auPlusVite} tour${auPlusVite > 1 ? 's' : ''} au plus vite)` : ', aucun ne perd';
  return [`${nomDuCamp} au trait : ${tiennent.length} coups tiennent ${tours} tours${pertes}${pasJugesTexte}.`];
}
