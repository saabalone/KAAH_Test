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
// (ia-evaluation.js), CLES_POIDS_IA_V2, STYLES_IA_V2 (ia-evaluation-v2.js),
// CLES_POIDS_IA_V3, STYLES_IA_V3 (ia-evaluation-v3.js), CLES_POIDS_IA_V4,
// STYLES_IA_V4 (ia-evaluation-v4.js) viennent de fichiers
// charges avant celui-ci.

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
// Les versions jouables (la 1 gardee pour comparer, saab) ; la 1 par defaut.
const VERSION_IA = 1;
// L'elagage propose (saab, 2026-10-02 : « par ex. Elag = 10 ») : celui des
// profils integres « … v2el » et le premier propose dans Reglages.
const ELAGAGE_PAR_DEFAUT_IA = 10;
// « el » pour elaguer (saab, 2026-10-03 : remplace le « b » de « v2b »).
const SUFFIXE_ELAGAGE_IA = 'el';
const VERSIONS_IA = [1, 2, 3, 4];
// Les poids de chaque version, et ceux par defaut de chaque style.
const POIDS_DES_VERSIONS_IA = {
  1: { cles: CLES_POIDS_IA, styles: STYLES_IA },
  2: { cles: [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2], styles: STYLES_IA_V2 },
  // La 3 (moteur/ia-evaluation-v3.js) : cases, compacite, gain et perte selon le score.
  3: { cles: [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2, ...CLES_POIDS_IA_V3], styles: STYLES_IA_V3 },
  // La 4 (moteur/ia-evaluation-v4.js) : le piege.
  4: { cles: [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2, ...CLES_POIDS_IA_V3, ...CLES_POIDS_IA_V4], styles: STYLES_IA_V4 },
};
const NOMS_STYLES_IA = { agressif: 'Agressif', normal: 'Normal', defensif: 'Défensif' };
const ABREVIATIONS_STYLES_IA = { agressif: 'Agr', normal: 'Nor', defensif: 'Def' };
// `moteur` (saab, 2026-09-30) : 'kai', la recherche en JavaScript de ce fichier,
// ou 'kai++', la meme en C++ (solveur/kai-plus.cpp), pour les comparer.
const MOTEURS_IA = ['kai', 'kai++'];
const PREFIXES_MOTEURS_IA = { kai: 'KAI', 'kai++': 'KAI++' };
const MACHINE_PAR_DEFAUT = { moteur: 'kai', version: VERSION_IA, niveau: 2, style: 'normal', profil: NOMS_STYLES_IA.normal, poids: STYLES_IA.normal, reflexionMax: 5, livre: true, elagage: 0 };
const REFLEXION_MAX_BORNES_S = { min: 0.5, max: 60 };
const PREMIERE_VERSION_DU_PROFIL_IA = 1;

// Le nom du profil integre d'un style et d'une version : « Normal », « Normal
// v2 », et « Normal v2el » s'il elague.
function nomDuProfilIntegre(style, version, elagage = 0) {
  if (version === VERSION_IA && !elagage) return NOMS_STYLES_IA[style];
  return `${NOMS_STYLES_IA[style]} v${version}${elagage ? SUFFIXE_ELAGAGE_IA : ''}`;
}

// Un reglage relu (fichier, stockage) : null pour un joueur humain, sinon
// chaque valeur valide gardee, les autres ramenees a leur defaut — un poids
// manquant ou faux prend celui du style : jamais une machine qui ne saurait pas
// jouer.
function lireMachine(brut) {
  if (!brut || typeof brut !== 'object') return null;
  const style = brut.style in STYLES_IA ? brut.style : MACHINE_PAR_DEFAUT.style;
  const version = VERSIONS_IA.includes(brut.version) ? brut.version : VERSION_IA;
  // L'elagage (moteur/ia-recherche.js, meilleursCoupsIA) : 0, aucun.
  const elagage = Number.isInteger(brut.elagage) && brut.elagage > 0 ? brut.elagage : 0;
  const { cles, styles } = POIDS_DES_VERSIONS_IA[version];
  const poids = Object.fromEntries(cles.map((cle) => [cle, Number.isFinite(brut.poids?.[cle]) ? brut.poids[cle] : styles[style][cle]]));
  const reflexion = Number(brut.reflexionMax);
  return {
    moteur: MOTEURS_IA.includes(brut.moteur) ? brut.moteur : MACHINE_PAR_DEFAUT.moteur,
    version,
    niveau: brut.niveau in NIVEAUX_IA ? Number(brut.niveau) : MACHINE_PAR_DEFAUT.niveau,
    style,
    profil: typeof brut.profil === 'string' && brut.profil !== '' ? brut.profil : nomDuProfilIntegre(style, version, elagage),
    poids,
    reflexionMax:
      Number.isFinite(reflexion) && reflexion > 0
        ? Math.min(REFLEXION_MAX_BORNES_S.max, Math.max(REFLEXION_MAX_BORNES_S.min, reflexion))
        : MACHINE_PAR_DEFAUT.reflexionMax,
    // Le livre d'ouvertures (la base de coups, saab 2026-10-01) : oui, sauf s'il
    // est explicitement refuse — un fichier d'avant ce reglage le garde.
    livre: brut.livre !== false,
    elagage,
    // L'indice de son profil (moteur/profils-ia.js), s'il en a un.
    ...(Number.isInteger(brut.indiceProfil) && brut.indiceProfil > 0 ? { indiceProfil: brut.indiceProfil } : {}),
    // La version de son profil (moteur/historique-profil-ia.js), au-dela de la 1re.
    ...(Number.isInteger(brut.versionProfil) && brut.versionProfil > PREMIERE_VERSION_DU_PROFIL_IA ? { versionProfil: brut.versionProfil } : {}),
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
// trois lettres, son temps de reflexion — ex. KAI2_Nor_5s, KAI3_Agr_1s2 ; la
// version 2 et les suivantes l'ajoutent (KAI2_Nor_5s_v2), la 1 garde son nom ;
// un profil de l'utilisateur, son indice (KAI2_Nor_5s_P3, saab 2026-10-01 : deux
// machines qui ne different que par le profil se distinguent dans le titre) ;
// un elagage, « el » et le nombre de coups gardes (KAI2_Nor_5s_v2el10) ; un
// profil retouche, la version du profil qu'elle joue (saab, 2026-10-04 : « on
// n'a pas joue sur le meme profil et rien ne l'indique ») : KAI++7_Nor_30s_v4el10_v2_P1.
// Lettres, chiffres et « _ » seulement (moteur/nom-partie.js, nomJoueurAutorise).
function nomDeLaMachine(machine) {
  const version = machine.version > VERSION_IA || machine.elagage ? `_v${machine.version}${machine.elagage ? `${SUFFIXE_ELAGAGE_IA}${machine.elagage}` : ''}` : '';
  return `${PREFIXES_MOTEURS_IA[machine.moteur ?? 'kai']}${machine.niveau}_${ABREVIATIONS_STYLES_IA[machine.style]}_${formaterTempsReflexion(machine.reflexionMax)}${version}${machine.versionProfil ? `_v${machine.versionProfil}` : ''}${machine.indiceProfil ? `_P${machine.indiceProfil}` : ''}`;
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

// KAI++ (phase 33bis, solveur/kai-plus.cpp) : ses poids en texte (CSV, dans
// l'ordre des cles ; 0 pour ceux des versions 2 a 4 absents)...
function poidsEnTexte(poids) {
  return [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2, ...CLES_POIDS_IA_V3, ...CLES_POIDS_IA_V4].map((cle) => poids[cle] ?? 0).join(',');
}

// ... sa reponse relue — « profondeur, evaluation, positions examinees, puis la
// sequence prevue en positions » —, ou null si elle n'en est pas une...
function lireReponseKaiPlus(texte) {
  const [profondeur, evaluation, noeuds, sequence = '', resume, ...lignes] = String(texte).split('\n');
  if (!Number.isFinite(Number(profondeur)) || noeuds === undefined) return null;
  return {
    profondeur: Number(profondeur),
    evaluation: Number(evaluation),
    noeuds: Number(noeuds),
    positions: sequence.split(' ').filter(Boolean),
    detail: resume ? lireDetailKaiPlus(resume, lignes) : null,
  };
}

// Le detail de la profondeur (saab, 2026-10-02) : « nombre de premiers coups
// <tab> positions examinees <tab> duree (ms) <tab> fin (ms depuis le debut de
// la reflexion) », puis un meilleur premier coup par ligne : « valeur <tab> E
// (exacte) ou H (au plus) <tab> positions sous lui <tab> sa duree (ms) <tab>
// quand il a ete trouve (ms) <tab> sa sequence en positions ».
function lireDetailKaiPlus(resume, lignes) {
  const [coups, noeuds, ms, fin] = resume.split('\t').map(Number);
  return {
    coups,
    noeuds,
    ms,
    fin,
    lignes: lignes.map((ligne) => {
      const [valeur, borne, sous, duree, trouve, positions = ''] = ligne.split('\t');
      return { valeur: Number(valeur), exacte: borne === 'E', noeuds: Number(sous), ms: Number(duree), fin: Number(trouve), positions: positions.split(' ').filter(Boolean) };
    }),
  };
}

// ... et les coups de KAI qui menent, position apres position, de `etat` a
// chacune de ses `positions` : KAI++ n'ecrit jamais de coup, seulement les
// positions, que les regles de moteur/regles.js retraduisent. S'arrete a la
// premiere position qu'aucun coup legal ne donne.
function coupsDesPositions(etat, positions) {
  const coups = [];
  let courant = etat;
  for (const position of positions) {
    const coup = tousLesCoupsLegaux(couleursDuPlateau(courant.plateau), courant.joueurAuTrait).find(
      (candidat) => ecrirePosition(appliquerCoup(courant, candidat).etat) === position
    );
    if (!coup) break;
    coups.push(coup);
    courant = appliquerCoup(courant, coup).etat;
  }
  return coups;
}
