// L'adversaire artificiel (phase 29 ⚠, PLAN.md, specification amendee avec
// saab le 2026-09-27) : d'abord le LIVRE D'OUVERTURES — la base de coups
// choisie dans Reglages (la _Fus par defaut) quand la position y figure —
// sinon la recherche (moteur/ia-recherche.js) avec l'evaluation du style
// choisi (moteur/ia-evaluation.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : obtenirConseils
// (next-move.js), ecrirePosition, lireCoupNacre, ecrireCoupNacreSansAmbiguite
// (notation.js), couleursDuPlateau, appliquerCoup (partie.js), rechercherCoup,
// NIVEAUX_IA (ia-recherche.js), STYLES_IA, CLES_POIDS_IA, VALEUR_VICTOIRE_IA
// (ia-evaluation.js) viennent de fichiers charges avant celui-ci.

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

// Les textes Nacre d'une suite de coups joues a partir de `etat` (la sequence
// prevue par la recherche), chacun ecrit sur SA position, comme dans la partie.
function textesDeLaSequence(etat, coups) {
  const textes = [];
  let courant = etat;
  for (const coup of coups) {
    textes.push(ecrireCoupNacreSansAmbiguite(couleursDuPlateau(courant.plateau), courant.joueurAuTrait, coup));
    courant = appliquerCoup(courant, coup).etat;
  }
  return textes;
}

// Le coup de l'IA pour le camp au trait de `etat`. `options` : { niveau (1 a
// 3), poids (moteur/ia-evaluation.js), base (moteur/next-move.js,
// analyserBaseNextMove — ou null), hasard (() => [0, 1[), maintenant (() =>
// millisecondes), echeance (en millisecondes, meme horloge), suivi (facultatif,
// moteur/ia-recherche.js) }. Generatrice, comme rechercherCoup (voir son
// en-tete). Renvoie { coup, texte (Nacre, tel qu'il sera range dans la
// partie), source ('livre' | 'recherche'), profondeur, evaluation (null pour le
// livre), sequence (textes Nacre de la suite prevue), noeuds }.
function* choisirCoupIA(etat, options) {
  const livre = coupDuLivre(options.base, etat, options.hasard);
  if (livre) return { ...livre, source: 'livre', profondeur: 0, evaluation: null, sequence: [livre.texte], noeuds: 0 };
  const { coup, profondeur, evaluation, sequence, noeuds } = yield* rechercherCoup(etat, options);
  const textes = textesDeLaSequence(etat, sequence);
  return { coup, texte: textes[0], source: 'recherche', profondeur, evaluation, sequence: textes, noeuds };
}

// Le reglage d'UNE machine (phase 32) : ce que la partie retient, ecrit dans
// son fichier (champ Machines, propre a KAAH) pour pouvoir comparer les
// reglages ensuite (saab). `version` : celle de l'IA (la 1 est celle de la
// phase 29, gardee telle quelle pour comparer aux suivantes) ; `style` : le
// style de base (nom de la machine) ; `profil` : le nom du profil IA
// (moteur/profils-ia.js) ; `poids` : ceux de l'evaluation ; `reflexionMax` : en
// secondes, SA pendule tourne pendant ce temps.
const VERSION_IA = 1;
const NOMS_STYLES_IA = { agressif: 'Agressif', normal: 'Normal', defensif: 'Défensif' };
const ABREVIATIONS_STYLES_IA = { agressif: 'Agr', normal: 'Nor', defensif: 'Def' };
const MACHINE_PAR_DEFAUT = { version: VERSION_IA, niveau: 2, style: 'normal', profil: NOMS_STYLES_IA.normal, poids: STYLES_IA.normal, reflexionMax: 5 };
const REFLEXION_MAX_BORNES_S = { min: 0.5, max: 60 };

// Un reglage relu (fichier, stockage) : null pour un joueur humain, sinon
// chaque valeur valide gardee, les autres ramenees a leur defaut — un poids
// manquant ou faux prend celui du style : jamais une machine qui ne saurait pas
// jouer.
function lireMachine(brut) {
  if (!brut || typeof brut !== 'object') return null;
  const style = brut.style in STYLES_IA ? brut.style : MACHINE_PAR_DEFAUT.style;
  const poids = Object.fromEntries(
    CLES_POIDS_IA.map((cle) => [cle, Number.isFinite(brut.poids?.[cle]) ? brut.poids[cle] : STYLES_IA[style][cle]])
  );
  const reflexion = Number(brut.reflexionMax);
  return {
    version: brut.version === VERSION_IA ? brut.version : VERSION_IA,
    niveau: brut.niveau in NIVEAUX_IA ? Number(brut.niveau) : MACHINE_PAR_DEFAUT.niveau,
    style,
    profil: typeof brut.profil === 'string' && brut.profil !== '' ? brut.profil : NOMS_STYLES_IA[style],
    poids,
    reflexionMax:
      Number.isFinite(reflexion) && reflexion > 0
        ? Math.min(REFLEXION_MAX_BORNES_S.max, Math.max(REFLEXION_MAX_BORNES_S.min, reflexion))
        : MACHINE_PAR_DEFAUT.reflexionMax,
  };
}

// Les machines d'une partie : { noir, blanc }, chacune un reglage ou null (un
// humain) ; null s'il n'y en a aucune. `machines` : le champ Machines du
// fichier ; `ancienAdversaire` : l'ancien champ Adversaire (phase 29, une
// seule machine et son camp), relu pour les parties d'avant la phase 32.
function lireMachines(machines, ancienAdversaire) {
  const source =
    machines && typeof machines === 'object'
      ? machines
      : ancienAdversaire && typeof ancienAdversaire === 'object'
        ? { [ancienAdversaire.camp === 'noir' ? 'noir' : 'blanc']: ancienAdversaire }
        : {};
  const lues = { noir: lireMachine(source.noir), blanc: lireMachine(source.blanc) };
  return lues.noir || lues.blanc ? lues : null;
}

// « 1s2 » pour 1,2 s (saab : « 1,2 n'est pas possible » dans un nom), « 5s ».
const DIXIEMES_PAR_SECONDE_IA = 10;
function formaterTempsReflexion(secondes) {
  const dixiemes = Math.round(secondes * DIXIEMES_PAR_SECONDE_IA);
  const entier = Math.floor(dixiemes / DIXIEMES_PAR_SECONDE_IA);
  const reste = dixiemes % DIXIEMES_PAR_SECONDE_IA;
  return reste === 0 ? `${entier}s` : `${entier}s${reste}`;
}

// Le nom que prend le camp d'une machine (saab) : KAI, son niveau, son style en
// trois lettres, son temps de reflexion — ex. KAI2_Nor_5s, KAI3_Agr_1s2.
// Lettres, chiffres et « _ » seulement (moteur/nom-partie.js, nomJoueurAutorise).
function nomDeLaMachine(machine) {
  return `KAI${machine.niveau}_${ABREVIATIONS_STYLES_IA[machine.style]}_${formaterTempsReflexion(machine.reflexionMax)}`;
}

// L'evaluation telle qu'on l'affiche : un nombre signe arrondi, ou, quand la
// recherche a vu la fin de la partie, « Gagne en n » / « Perd en n » (n coups,
// les siens et ceux de l'adversaire — moteur/ia-recherche.js, qui retire la
// distance de la valeur d'une victoire).
function libelleEvaluation(valeur) {
  if (Math.abs(valeur) > VALEUR_VICTOIRE_IA / 2) {
    const coups = VALEUR_VICTOIRE_IA - Math.abs(valeur);
    return valeur > 0 ? `Gagne en ${coups}` : `Perd en ${coups}`;
  }
  const arrondi = Math.round(valeur);
  return arrondi > 0 ? `+${arrondi}` : `${arrondi === 0 ? 0 : arrondi}`;
}
