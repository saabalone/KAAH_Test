// Les PREMIERS COUPS VARIES de KAI++ en partie (saab, 2026-11-15 : « ok » a la case « varier les premiers coups ») :
// sans livre, KAI++ est deterministe — les egalites se departagent par la compacite (solveur/kai-plus.cpp) — et rejoue
// trait pour trait la meme partie devant les memes coups (Boulet l'a battu deux fois en reprenant son ouverture,
// 2611150941 puis 2611151005). Ses premiers coups sont donc tires parmi les bons, comme ceux des ceintures du banc
// (moteur/banc-essais.js, bonsCoupsDuDepart : ceux a MARGE_DES_COUPS_VARIES points au plus du meilleur ;
// interface/banc-essais-partie.js, unBonCoupAuHasard) : jamais un coup juge mauvais.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// Trois coups de chaque machine : assez pour que la partie parte ailleurs, pas plus pour ne rien couter de son niveau.
const PREMIERS_COUPS_VARIES_EN_PARTIE = 3;
const DEMI_COUPS_PAR_TOUR = 2;

// Vrai si la machine doit tirer ce coup parmi les bons. `historique` : les positions depuis la racine de la partie, celle
// a jouer comprise (interface/nulle.js, positionsDepuisLaRacine) — ses coups deja joues en sont la moitie, arrondie en dessous.
function varierCeCoup(machine, historique) {
  const coupsDejaJoues = Math.floor((historique.length - 1) / DEMI_COUPS_PAR_TOUR);
  return machine.premiersCoupsVaries === true && coupsDejaJoues < PREMIERS_COUPS_VARIES_EN_PARTIE;
}
