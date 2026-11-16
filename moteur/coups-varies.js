// Les PREMIERS COUPS VARIES de KAI++ en partie (saab, 2026-11-15 : « ok » a la case « varier les premiers coups ») :
// sans livre, KAI++ est deterministe — les egalites se departagent par la compacite (solveur/kai-plus.cpp) — et rejoue
// trait pour trait la meme partie devant les memes coups (Boulet l'a battu deux fois en reprenant son ouverture,
// 2611150941 puis 2611151005). Ses premiers coups sont donc tires parmi les meilleurs du livre (saab, 2026-11-16 : « pourquoi
// calculer des coups qui sont déjà testés dans le livre, autant prendre les 3 meilleurs du livre, ça sera plus rapide et plus
// sûr ») : la recherche a 3 demi-coups d'avant tirait b1d3 une fois sur deux au 1er coup de Noir (17e sur 52 a 5 demi-coups).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : conseilsDuCampAuTrait (moteur/next-move.js), PARTIES_MINIMUM_LIVRE,
// partiesDuConseil (moteur/ia.js),
// positionCanonique (moteur/permutations.js), lireCoupNacre, ecrirePosition (moteur/notation.js), appliquerCoup,
// couleursDuPlateau (moteur/partie.js) viennent de fichiers charges avant celui-ci.

// Trois coups de chaque machine : assez pour que la partie parte ailleurs, pas plus pour ne rien couter de son niveau.
const PREMIERS_COUPS_VARIES_EN_PARTIE = 3;
const DEMI_COUPS_PAR_TOUR = 2;

// Vrai si la machine doit tirer ce coup parmi les bons. `historique` : les positions depuis la racine de la partie, celle
// a jouer comprise (interface/nulle.js, positionsDepuisLaRacine) — ses coups deja joues en sont la moitie, arrondie en dessous.
function varierCeCoup(machine, historique) {
  const coupsDejaJoues = Math.floor((historique.length - 1) / DEMI_COUPS_PAR_TOUR);
  return machine.premiersCoupsVaries === true && coupsDejaJoues < PREMIERS_COUPS_VARIES_EN_PARTIE;
}

// Trois : assez pour que la partie parte ailleurs ; au-dela, des coups peu joues dans le livre.
const COUPS_DU_LIVRE_POUR_VARIER = 3;

// Un des COUPS_DU_LIVRE_POUR_VARIER meilleurs coups du livre (`base`, moteur/next-move.js) pour le camp au trait : { coup, texte },
// ou null (pas de livre, position inconnue : la machine cherche elle-meme). Les meilleurs (saab, 2026-11-16 : « A ») : par
// victoires, parmi les coups joues au moins PARTIES_MINIMUM_LIVRE fois (en dessous, le livre tombait sur des coups joues 1 ou 2
// fois), meme rouges — sinon Blanc perdait i5f5, sa reponse la plus jouee (2304 gagnees, 2577 perdues : Noir gagne un peu plus
// souvent), et la partie sortait du livre. Un coup et son symetrique (meme position d'apres, a une rotation ou un miroir pres)
// ne comptent qu'une fois, sinon le tirage retomberait deux fois sur le meme coup.
function coupVarieDuLivre(base, etat, hasard) {
  if (!base) return null;
  const plateau = couleursDuPlateau(etat.plateau);
  const meilleurs = [];
  const positionsVues = new Set();
  for (const conseil of conseilsDuCampAuTrait(base, ecrirePosition(etat), etat.joueurAuTrait).filter((conseil) => partiesDuConseil(conseil) >= PARTIES_MINIMUM_LIVRE)) {
    const coup = lireCoupNacre(plateau, etat.joueurAuTrait, conseil.coup);
    if (!coup) continue;
    const apres = positionCanonique(ecrirePosition(appliquerCoup(etat, coup).etat)).positionReference;
    if (positionsVues.has(apres)) continue;
    positionsVues.add(apres);
    meilleurs.push({ coup, texte: conseil.coup });
    if (meilleurs.length === COUPS_DU_LIVRE_POUR_VARIER) break;
  }
  return meilleurs.length === 0 ? null : meilleurs[Math.floor(hasard() * meilleurs.length)];
}
