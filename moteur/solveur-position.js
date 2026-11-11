// Le SOLVEUR SUR UNE POSITION (saab, 2026-11-06 : « je ne sais pas lancer le solver sur une position, il manque un
// btn, non ? » ; « On ne met ce btn que dans version travail pour le moment et dans la barre d'outils ») : le plus
// court gain force et le jugement de chaque premier coup. Pur : le solveur (WebAssembly, dans un worker) est passe
// par l'appelant (interface/solveur-position-recherche.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// Le temps max d'une recherche, en minutes, conseille pour `tours` tours maxi (saab, 2026-11-07 : « il faudrait adapter
// approximativement le tps max de recherche en fonction du Tour max ») : a peu pres ce qu'il faut sur une position
// pleine — 4 tours en quelques secondes, 5 en une minute environ, 6 en plusieurs minutes (mesure, moteur/banc-puzzles.js),
// avec de la marge, chaque tour multipliant le temps. Au-dela, le plafond du champ Temps max : les mini PZL vont bien
// plus loin, et plus vite. Ce n'est qu'une limite : une recherche finie avant s'arrete d'elle-meme.
const MINUTES_CONSEILLEES_PAR_TOURS = [1, 1, 1, 2, 5, 15, 45];
const MINUTES_MAX_DU_SOLVEUR = 120;
function minutesConseilleesDuSolveur(tours) {
  return MINUTES_CONSEILLEES_PAR_TOURS[tours - 1] ?? MINUTES_MAX_DU_SOLVEUR;
}

// Le gain le plus court jusqu'a `toursMax` : 1 tour, puis 2… `verdictEnTours(tours)` — promesse de 'valide' (gain
// force), 'invalide' (pas dans ces tours) ou autre chose (le solveur n'a pas fini : rien n'est prouve, on s'arrete).
// Renvoie { tours (null sans gain prouve), essayes (les derniers tours demandes), verdict (le dernier) }.
async function toursDeLaVictoireForcee(verdictEnTours, toursMax) {
  let verdict = 'invalide';
  for (let tours = 1; tours <= toursMax; tours++) {
    verdict = await verdictEnTours(tours);
    if (verdict === 'valide') return { tours, essayes: tours, verdict };
    if (verdict !== 'invalide') return { tours: null, essayes: tours, verdict };
  }
  return { tours: null, essayes: toursMax, verdict };
}

// Le TABLEAU DE RECHERCHE : chaque premier coup du camp au trait, juge par le solveur (`verdictDuPremier(coup)` :
// 'valide' — il garde la victoire, ou c'est la meilleure defense du perdant —, 'invalide', ou autre chose : pas juge a
// temps), et la sequence de chaque solution des qu'elle est trouvee (`sequenceDepuis(coup)` : les coups, ou null), pas
// apres tous les coups (saab, 2026-11-06 : « pourquoi, il note les séquences qu'après avoir vu tous les coups ? »).
// Sans `toutes`, on s'arrete a la premiere solution (saab : « sinon par défaut il s'arrête dès qu'il en trouve une »).
// `apresChaque(lignes)` : le tableau a montrer. Renvoie { lignes: [{ coup, verdict, coups }], toutesJugees } —
// toutesJugees : chaque coup a ete juge, le nombre de solutions est sur.
async function jugerLesPremiersCoups(premiers, verdictDuPremier, sequenceDepuis, { toutes, apresChaque = () => {} }) {
  const lignes = [];
  for (const coup of premiers) {
    const ligne = { coup, verdict: await verdictDuPremier(coup), coups: null };
    lignes.push(ligne);
    apresChaque(lignes);
    if (ligne.verdict !== 'valide') continue;
    ligne.coups = await sequenceDepuis(coup);
    apresChaque(lignes);
    if (!toutes) break;
  }
  const toutesJugees = lignes.length === premiers.length && lignes.every(({ verdict }) => verdict === 'valide' || verdict === 'invalide');
  return { lignes, toutesJugees };
}

// Comme saab ecrit une sequence (« 1.C3C5 E3C2 2.A1C3 F6C3 3.A3C3 ») : les coups par paires, numerotees — ce que
// « Créer partie » relit aussi.
function sequenceNumerotee(coups) {
  const paires = [];
  for (let rang = 0; rang < coups.length; rang += 2) {
    paires.push(`${rang / 2 + 1}.${coups.slice(rang, rang + 2).join(' ').toUpperCase()}`);
  }
  return paires.join(' ');
}
