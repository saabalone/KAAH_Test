// L'adversaire artificiel (phase 29 ⚠, PLAN.md, specification amendee avec
// saab le 2026-09-27) : d'abord le LIVRE D'OUVERTURES — la base de coups
// choisie dans Reglages (la _Fus par defaut) quand la position y figure —
// sinon la recherche (moteur/ia-recherche.js) avec l'evaluation du style
// choisi (moteur/ia-evaluation.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : obtenirConseils
// (next-move.js), ecrirePosition, lireCoupNacre, ecrireCoupNacreSansAmbiguite
// (notation.js), couleursDuPlateau (partie.js), rechercherCoup
// (ia-recherche.js) viennent de fichiers charges avant celui-ci.

// Parmi les coups de la base, sont "parmi les meilleurs" ceux qui ont au
// moins cette fraction des victoires du premier (tri des Conseils) : un peu de
// variete d'une partie a l'autre, jamais un coup rarement gagnant.
const FRACTION_DES_VICTOIRES_LIVRE = 0.5;

// Un coup du livre pour le camp au trait de `etat`, ou null (pas de base,
// position inconnue, aucun coup gagnant connu). Memes filtres que les Conseils
// (obtenirConseils : jamais un coup de l'adversaire ni un coup qui ne colle
// pas au plateau reel).
function coupDuLivre(base, etat, hasard) {
  if (!base) return null;
  const conseils = obtenirConseils(base, ecrirePosition(etat), etat.joueurAuTrait);
  const meilleur = conseils[0]?.victoires ?? 0;
  const candidats = conseils.filter((conseil) => conseil.victoires > 0 && conseil.victoires >= meilleur * FRACTION_DES_VICTOIRES_LIVRE);
  if (candidats.length === 0) return null;
  const choisi = candidats[Math.floor(hasard() * candidats.length)];
  const coup = lireCoupNacre(couleursDuPlateau(etat.plateau), etat.joueurAuTrait, choisi.coup);
  return coup ? { coup, texte: choisi.coup } : null;
}

// Le coup de l'IA pour le camp au trait de `etat`. `options` : { niveau (1 a
// 3), style ('agressif' | 'normal' | 'defensif'), base (moteur/next-move.js,
// analyserBaseNextMove — ou null), hasard (() => [0, 1[), maintenant (() =>
// millisecondes), echeance (en millisecondes, meme horloge) }. Generatrice,
// comme rechercherCoup (voir son en-tete). Renvoie { coup, texte (Nacre, tel
// qu'il sera range dans la partie), source ('livre' | 'recherche'),
// profondeur }.
function* choisirCoupIA(etat, options) {
  const livre = coupDuLivre(options.base, etat, options.hasard);
  if (livre) return { ...livre, source: 'livre', profondeur: 0 };
  const { coup, profondeur } = yield* rechercherCoup(etat, options);
  const texte = ecrireCoupNacreSansAmbiguite(couleursDuPlateau(etat.plateau), etat.joueurAuTrait, coup);
  return { coup, texte, source: 'recherche', profondeur };
}

// Le reglage de la machine pour une partie (boite du debut de partie) : ce
// que la partie retient, ecrit dans son fichier (champ Adversaire, propre a
// KAAH) et repris a la Revanche (moteur/revanche.js). `camp` : celui que joue
// la machine ; `reflexionMax` : en secondes, SA pendule tourne pendant ce temps.
const ADVERSAIRE_PAR_DEFAUT = { niveau: 2, style: 'normal', camp: 'blanc', reflexionMax: 5 };
const REFLEXION_MAX_BORNES_S = { min: 1, max: 60 };

// Un reglage relu (fichier, stockage) : null si la partie est entre humains,
// sinon chaque valeur valide gardee, les autres ramenees a leur defaut —
// jamais une machine qui ne saurait pas jouer.
function lireAdversaire(brut) {
  if (!brut || typeof brut !== 'object') return null;
  const reflexion = Number(brut.reflexionMax);
  return {
    niveau: brut.niveau in NIVEAUX_IA ? Number(brut.niveau) : ADVERSAIRE_PAR_DEFAUT.niveau,
    style: brut.style in STYLES_IA ? brut.style : ADVERSAIRE_PAR_DEFAUT.style,
    camp: brut.camp === 'noir' || brut.camp === 'blanc' ? brut.camp : ADVERSAIRE_PAR_DEFAUT.camp,
    reflexionMax:
      Number.isFinite(reflexion) && reflexion > 0
        ? Math.min(REFLEXION_MAX_BORNES_S.max, Math.max(REFLEXION_MAX_BORNES_S.min, reflexion))
        : ADVERSAIRE_PAR_DEFAUT.reflexionMax,
  };
}

// Le nom que prend le camp de la machine : lettres, chiffres et « _ »
// seulement (moteur/nom-partie.js, nomJoueurAutorise), niveau et style lisibles
// dans le titre de la partie (Mes parties).
function nomDeLaMachine(adversaire) {
  const style = adversaire.style[0].toUpperCase() + adversaire.style.slice(1);
  return `Machine_N${adversaire.niveau}_${style}`;
}
