// Construire une partie a partir d'une position de depart et d'une suite de
// coups COLLEE, en notation Nacre ou AbaPro (phase 23, PHASE DELICATE ⚠ —
// voir PLAN.md). Reprend « Créer Game (Nacre/AP) » de KAAWA
// (kaa_app_ClO_Co.py, open_game_creation_popup ; kaa_utils_ClO_Co.py,
// detect_notation_type, abapro_to_nacre, apply_nacre_move), verifie contre
// ses vraies fonctions (tests/reference-abapro-kaawa.json).
//
// AbaPro, tel que KAAWA l'a verifie contre le logiciel AbaPro lui-meme (son
// commentaire F7) :
//   - 4 caracteres : la QUEUE du groupe, puis la case voisine dans le sens du
//     coup — le reste du groupe se retrouve en avancant tant que les billes
//     sont a soi (une bille seule s'ecrit donc comme en Nacre) ;
//   - 6 caracteres : les 2 EXTREMITES du groupe (dans n'importe quel ordre),
//     puis la case d'arrivee de la premiere.
// Contrairement a KAAWA, un coup AbaPro n'est JAMAIS traduit en texte Nacre
// pour etre relu : on cherche directement, parmi les coups legaux de
// regles.js, celui qui deplace exactement ce groupe dans ce sens. Les regles
// restent ecrites a un seul endroit (CLAUDE.md), et l'ambiguite du texte Nacre
// (« le plus petit groupe gagne ») ne peut plus fausser une suite AbaPro,
// elle-meme sans ambiguite.
//
// Ecarts ASSUMES avec KAAWA, tous au benefice d'une suite correctement lue :
//   - chaque branche (separateur `|`) est lue depuis la position de DEPART,
//     en AbaPro comme en Nacre : KAAWA convertit un texte AbaPro d'un seul
//     tenant (convert_abapro_sequence), sa 2e branche serait lue sur le
//     plateau de fin de la 1re, avec le mauvais joueur — et il perd les `|` ;
//   - un prefixe commun a deux branches n'est cree qu'une fois (jouerDansArbre)
//     au lieu d'etre duplique a la racine ;
//   - un coup qui ne designe aucun coup legal ARRETE tout, avec son rang, au
//     lieu d'etre applique quand meme (apply_nacre_move ne verifie rien) ;
//   - AbaPro 4 caracteres : les deux cases doivent etre voisines (KAAWA
//     normalise n'importe quel alignement, ce qui n'arrive jamais dans une vraie
//     suite AbaPro).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : depuisNotation,
// caseDansLaDirection (moteur/plateau.js), coupsDepuis, directionsEgales,
// BILLES_MAX_PAR_COUP (moteur/regles.js), appliquerCoup, couleursDuPlateau
// (moteur/partie.js), lireCoupNacre, ecrireCoupNacreSansAmbiguite, vecteurEntre,
// estUneDirection (moteur/notation.js), creerArbre, allerALaRacine,
// etatCourant, jouerDansArbre, marquerFlecheDernierCoup, marquerStatutFin
// (moteur/arbre.js), informationFlecheDernierCoup (moteur/fleche-dernier-coup.js)
// viennent de fichiers charges avant celui-ci dans index.html.

const NOTATION_NACRE = 'nacre';
const NOTATION_ABAPRO = 'abapro';
const NOTATION_INCONNUE = 'inconnue';
const LONGUEUR_COUP_ABAPRO_EN_LIGNE = 4;
const LONGUEUR_COUP_ABAPRO_LATERAL = 6;
const SEPARATEUR_DE_BRANCHES = '|';
// Memes motifs que KAAWA : un coup Nacre, un coup AbaPro (4 ou 6 caracteres),
// un prefixe numerote ("1." ou "12.-").
const MOTIF_COUP_NACRE = /[a-i]\d[a-i]\d/g;
const MOTIF_COUP_ABAPRO = /[a-i]\d[a-i]\d(?:[a-i]\d)?/g;
const MOTIF_PREFIXE_NUMEROTE = /\d+\./;
// Voir construirePartieDepuisSequence : un chemin qu'aucun noeud ne peut avoir.
const CHEMIN_JAMAIS_ATTEINT = [-1];

function jetonsDeCoups(texte, motif) {
  return String(texte).toLowerCase().match(motif) ?? [];
}

// Distance en nombre de pas entre deux cases (hex_distance de KAAWA), ou null
// si l'une n'existe pas.
function distanceEntreCases(notationA, notationB) {
  const a = depuisNotation(notationA);
  const b = depuisNotation(notationB);
  if (a === null || b === null) return null;
  const dq = b.q - a.q;
  const dr = b.r - a.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

// Detection automatique, regles de KAAWA (detect_notation_type) dans son
// ordre : un coup de 6 caracteres -> AbaPro ; un prefixe numerote -> Nacre ;
// deux coordonnees non voisines -> Nacre (en AbaPro 4 caracteres, elles le
// sont toujours) ; sinon AbaPro. Cas ambigu residuel, assume comme KAAWA : une
// suite Nacre sans prefixe faite uniquement de billes seules est vue comme
// AbaPro — sans consequence, ces coups s'ecrivent pareil dans les deux.
// `notationForcee` ('nacre' ou 'abapro') l'emporte toujours.
function detecterNotation(texte, notationForcee = null) {
  if (notationForcee === NOTATION_NACRE || notationForcee === NOTATION_ABAPRO) return notationForcee;
  const coups = jetonsDeCoups(texte, MOTIF_COUP_ABAPRO);
  if (coups.length === 0) return NOTATION_INCONNUE;
  if (coups.some((coup) => coup.length === LONGUEUR_COUP_ABAPRO_LATERAL)) return NOTATION_ABAPRO;
  if (MOTIF_PREFIXE_NUMEROTE.test(texte)) return NOTATION_NACRE;
  const nonVoisines = coups.some((coup) => (distanceEntreCases(coup.slice(0, 2), coup.slice(2, 4)) ?? 0) > 1);
  return nonVoisines ? NOTATION_NACRE : NOTATION_ABAPRO;
}

// Les cases alignees de `premiere` a `derniere` incluses (un groupe possible,
// au plus BILLES_MAX_PAR_COUP) et le pas d'une case a la suivante, ou null.
function alignement(premiere, derniere) {
  const pas = distanceEntreCases(premiere, derniere);
  if (pas === null || pas < 1 || pas >= BILLES_MAX_PAR_COUP) return null;
  const vecteur = vecteurEntre(premiere, derniere);
  const direction = { q: vecteur.q / pas, r: vecteur.r / pas };
  if (!estUneDirection(direction)) return null;
  const cases = [premiere];
  while (cases.length <= pas) cases.push(caseDansLaDirection(cases[cases.length - 1], direction));
  return { cases, direction };
}

// Le coup legal (regles.js) qui deplace exactement `billes` dans `direction`,
// ou null s'il n'y en a aucun.
function coupDesignant(plateau, joueurAuTrait, billes, direction) {
  const attendues = [...billes].sort().join();
  for (const depart of billes) {
    const coup = coupsDepuis(plateau, joueurAuTrait, depart).find(
      (candidat) => directionsEgales(candidat.direction, direction) && [...candidat.billes].sort().join() === attendues
    );
    if (coup) return coup;
  }
  return null;
}

// Relit un coup AbaPro (voir l'en-tete). `plateau` au format de
// regles.coupsDepuis ({ case: 'noir' | 'blanc' }). null si le texte ne
// designe aucun coup legal : jamais devine.
function lireCoupAbaPro(plateau, joueurAuTrait, texte) {
  const coup = String(texte).toLowerCase();
  if (coup.length === LONGUEUR_COUP_ABAPRO_EN_LIGNE) {
    const premierPas = alignement(coup.slice(0, 2), coup.slice(2, 4));
    if (premierPas === null || premierPas.cases.length !== 2) return null; // deux cases voisines
    const queue = premierPas.cases[0];
    if (plateau[queue] !== joueurAuTrait) return null;
    const groupe = [queue];
    let suivante = caseDansLaDirection(queue, premierPas.direction);
    while (suivante !== null && plateau[suivante] === joueurAuTrait) {
      groupe.push(suivante);
      suivante = caseDansLaDirection(suivante, premierPas.direction);
    }
    return coupDesignant(plateau, joueurAuTrait, groupe, premierPas.direction);
  }
  if (coup.length === LONGUEUR_COUP_ABAPRO_LATERAL) {
    const groupe = alignement(coup.slice(0, 2), coup.slice(2, 4));
    const deplacement = alignement(coup.slice(0, 2), coup.slice(4, 6));
    if (groupe === null || deplacement === null || deplacement.cases.length !== 2) return null;
    return coupDesignant(plateau, joueurAuTrait, groupe.cases, deplacement.direction);
  }
  return null;
}

// Relit un coup Nacre d'une suite collee : la convention de KAAH (2e case =
// arrivee de la derniere bille), et a defaut la « convention B » que KAAWA
// accepte aussi selon le generateur de la suite (apply_nacre_move) : 2e case =
// la TETE du groupe, une bille a soi, le groupe avancant d'un pas au-dela.
function lireCoupNacreDeSequence(plateau, joueurAuTrait, texte) {
  const coup = lireCoupNacre(plateau, joueurAuTrait, texte);
  if (coup) return coup;
  const tete = texte.slice(2, 4);
  if (plateau[tete] !== joueurAuTrait) return null;
  const groupe = alignement(texte.slice(0, 2), tete);
  if (groupe === null) return null;
  return coupDesignant(plateau, joueurAuTrait, groupe.cases, groupe.direction);
}

// Construit l'arbre de la partie. Chaque branche (`|`) est une suite COMPLETE
// depuis `etatDepart`, comme dans KAAWA ; la premiere est la partie reellement
// jouee (estOrigine), les suivantes des branches d'exploration, meme quand
// elles la prolongent. Renvoie { arbre, notation, nombreDeCoups } (coups
// reellement crees, un prefixe commun ne comptant qu'une fois), ou
// { erreur: { raison, branche, rang, texte } } — raison : 'aucun-coup',
// 'coup-impossible', 'partie-terminee' ; branche et rang comptes a partir de 1
// dans le texte colle. Ne modifie jamais `etatDepart`.
function construirePartieDepuisSequence(etatDepart, texteSequence, notationForcee = null) {
  const notation = detecterNotation(texteSequence, notationForcee);
  const motif = notation === NOTATION_ABAPRO ? MOTIF_COUP_ABAPRO : MOTIF_COUP_NACRE;
  const lireCoup = notation === NOTATION_ABAPRO ? lireCoupAbaPro : lireCoupNacreDeSequence;
  const erreur = (raison, branche, rang, texte) => ({ erreur: { raison, branche, rang, texte } });

  let arbre = creerArbre(etatDepart);
  let cheminOrigine = [];
  let nombreDeCoups = 0;
  const branches = String(texteSequence).split(SEPARATEUR_DE_BRANCHES);

  for (const [indexBranche, texteBranche] of branches.entries()) {
    const coups = jetonsDeCoups(texteBranche, motif);
    if (coups.length === 0) {
      if (indexBranche === 0) return erreur('aucun-coup', 1, 0, '');
      continue;
    }
    // jouerDansArbre prolonge l'origine des qu'on joue a son bout : pour les
    // branches suivantes, on lui masque ce bout le temps de la branche.
    arbre = { ...allerALaRacine(arbre), cheminOrigine: indexBranche === 0 ? [] : CHEMIN_JAMAIS_ATTEINT };

    for (const [indexCoup, texteCoup] of coups.entries()) {
      const etat = etatCourant(arbre);
      if (etat.vainqueur) return erreur('partie-terminee', indexBranche + 1, indexCoup + 1, texteCoup);
      const coup = lireCoup(couleursDuPlateau(etat.plateau), etat.joueurAuTrait, texteCoup);
      if (!coup) return erreur('coup-impossible', indexBranche + 1, indexCoup + 1, texteCoup);

      const racineAvant = arbre.racine;
      const resultat = appliquerCoup(etat, coup);
      const texte = ecrireCoupNacreSansAmbiguite(couleursDuPlateau(etat.plateau), etat.joueurAuTrait, coup);
      arbre = jouerDansArbre(arbre, texte, resultat.etat);
      if (arbre.racine === racineAvant) continue; // coup deja cree par une branche precedente
      nombreDeCoups += 1;
      // Comme un coup joue a la main (interface/saisie.js, jouerCoup).
      arbre = marquerFlecheDernierCoup(arbre, arbre.chemin, informationFlecheDernierCoup(coup));
      if (resultat.etat.vainqueur) arbre = marquerStatutFin(arbre, arbre.chemin, 'N');
    }
    if (indexBranche === 0) cheminOrigine = arbre.cheminOrigine;
  }

  return { arbre: { ...arbre, chemin: cheminOrigine, cheminOrigine }, notation, nombreDeCoups };
}
