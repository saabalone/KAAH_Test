// Traductions entre le monde interne et les textes de KAAWA :
//   - la position compressee : "0a12b123..._0a45b456..."
//   - le coup Nacre : "a2b4"
//
// PHASE DELICATE (voir PLAN.md). Tout ce fichier existe pour rester
// compatible, au caractere pres, avec les fichiers de KAAWA. Les
// conventions reproduites ici viennent de kaa_utils_ClO_Co.py
// (convert_game_state_to_variant_string et convert_move_to_nacre).

// Pas d'import ni d'export (voir plateau.js) : depuisNotation,
// caseDansLaDirection et DIRECTIONS viennent de plateau.js, coupsDepuis de
// regles.js — tous deux charges avant celui-ci dans index.html.

// Un coup Nacre est toujours deux coordonnees de deux caracteres : la
// premiere bille du groupe, puis la case d'arrivee.
const LONGUEUR_COUP_NACRE = 4;

// ---------------------------------------------------------------------
// Position compressee
// ---------------------------------------------------------------------

// Chaque moitie commence par UN chiffre : le nombre de billes de cette
// couleur qui ont ete ejectees. Dans les variantes a handicap, ce compteur
// demarre a 3, 4 ou 5 alors que les 14 billes sont toujours sur le
// plateau : le handicap porte sur le score, pas sur le materiel.
const SEPARATEUR_DES_CAMPS = '_';

function lireDemiPosition(demi, couleur, plateau) {
  const notations = [];
  for (const [, lettre, chiffres] of demi.slice(1).matchAll(/([a-i])(\d+)/g)) {
    for (const chiffre of chiffres) notations.push(`${lettre}${chiffre}`);
  }

  // Les identifiants sont attribues dans l'ordre alphabetique des cases,
  // pour qu'une meme position relue deux fois donne toujours les memes.
  // Ce sont des etiquettes opaques, pas du texte a lire.
  notations.sort();
  notations.forEach((notation, index) => {
    plateau[notation] = { couleur, id: `bille-${couleur}-${index + 1}` };
  });

  return Number(demi[0]);
}

function lirePosition(texte) {
  const moities = String(texte).split(SEPARATEUR_DES_CAMPS);
  if (moities.length !== 2 || !/^\d/.test(moities[0]) || !/^\d/.test(moities[1])) {
    throw new Error(`Position illisible : ${texte}`);
  }

  const plateau = {};
  const billesEjecteesNoires = lireDemiPosition(moities[0], 'noir', plateau);
  const billesEjecteesBlanches = lireDemiPosition(moities[1], 'blanc', plateau);

  // Une position compressee ne dit pas a qui est le trait : par convention
  // KAAWA, Noir joue toujours le premier coup (voir CLAUDE.md).
  return {
    plateau,
    joueurAuTrait: 'noir',
    billesEjecteesNoires,
    billesEjecteesBlanches,
    vainqueur: null,
  };
}

// Regroupe les cases par lettre : a1, a2, b3 -> "a12b3".
function comprimer(notations) {
  // Le tri alphabetique suffit a tout ordonner : les lettres se retrouvent
  // dans l'ordre, et les chiffres aussi puisqu'il n'y en a qu'un par case.
  const triees = [...notations].sort();

  let texte = '';
  let lettrePrecedente = '';
  for (const notation of triees) {
    if (notation[0] !== lettrePrecedente) {
      texte += notation[0];
      lettrePrecedente = notation[0];
    }
    texte += notation[1];
  }
  return texte;
}

function ecrirePosition(etat) {
  const casesDe = (couleur) =>
    Object.keys(etat.plateau).filter((notation) => etat.plateau[notation].couleur === couleur);

  const noir = `${etat.billesEjecteesNoires}${comprimer(casesDe('noir'))}`;
  const blanc = `${etat.billesEjecteesBlanches}${comprimer(casesDe('blanc'))}`;
  return `${noir}${SEPARATEUR_DES_CAMPS}${blanc}`;
}

// ---------------------------------------------------------------------
// Coup Nacre
// ---------------------------------------------------------------------

// Ordre de tri herite du solveur C++ de saab, repris tel quel par
// convert_move_to_nacre : colonnes I, H, G ... A, puis rangee croissante.
// En coordonnees axiales cet ordre revient exactement a trier par r
// croissant puis q croissant.
// Verification faite en phase 4 : 34 387 coups compares au vrai
// convert_move_to_nacre de KAAWA (fonction extraite telle quelle de
// kaa_utils_ClO_Co.py, pas reecrite) — zero ecart.
function ordreDuSolveur(notationA, notationB) {
  const a = depuisNotation(notationA);
  const b = depuisNotation(notationB);
  return a.r - b.r || a.q - b.q;
}

function vecteurEntre(notationDepart, notationArrivee) {
  const depart = depuisNotation(notationDepart);
  const arrivee = depuisNotation(notationArrivee);
  return { q: arrivee.q - depart.q, r: arrivee.r - depart.r };
}

function estUneDirection(vecteur) {
  return DIRECTIONS.some((direction) => direction.q === vecteur.q && direction.r === vecteur.r);
}

// Ecrit un coup en Nacre : premiere bille du groupe, puis case d'arrivee de
// la derniere. Le coup est suppose legal (meme contrat qu'appliquerCoup).
function ecrireCoupNacre(coup) {
  if (coup.billes.length === 1) {
    const depart = coup.billes[0];
    return `${depart}${caseDansLaDirection(depart, coup.direction)}`;
  }

  const triees = [...coup.billes].sort(ordreDuSolveur);
  const premiere = triees[0];
  const derniere = triees[triees.length - 1];

  const axe = vecteurEntre(premiere, derniere);
  const produitCroise = axe.q * coup.direction.r - axe.r * coup.direction.q;
  const produitScalaire = axe.q * coup.direction.q + axe.r * coup.direction.r;

  // Deplacement en ligne a rebours de l'ordre de tri : le groupe recule le
  // long de son axe, donc sa queue est la derniere bille de cet ordre.
  if (produitCroise === 0 && produitScalaire < 0) {
    return `${derniere}${caseDansLaDirection(premiere, coup.direction)}`;
  }

  let depart = premiere;
  let arrivee = caseDansLaDirection(derniere, coup.direction);

  // Deplacement lateral a 2 billes : si les deux coordonnees du texte se
  // retrouvent voisines, KAAWA prend l'autre extremite, pour que le texte
  // designe toujours les deux cases les plus eloignees l'une de l'autre.
  if (produitCroise !== 0 && coup.billes.length === 2 && estUneDirection(vecteurEntre(depart, arrivee))) {
    depart = derniere;
    arrivee = caseDansLaDirection(premiere, coup.direction);
  }

  return `${depart}${arrivee}`;
}

// L'AUTRE ecriture possible d'une poussee laterale : celle qu'ecrireCoupNacre
// N'A PAS choisie. Une poussee laterale a toujours deux cases-reperes
// possibles (une par extremite du groupe) ; ecrireCoupNacre() n'en choisit
// QU'UNE, fidele a KAAWA (kaa_utils_ClO_Co.convert_move_to_nacre). Utilisee
// par lireCoupNacre ci-dessous pour un ECART ASSUME (voir cette fonction) —
// jamais par l'ecriture elle-meme, qui reste fidele a KAAWA sans exception.
// null pour une bille seule ou un deplacement en ligne : aucune ambiguite
// d'ancre n'existe dans ces deux cas, une seule ecriture est possible.
function ecrireCoupNacreAlternatif(coup) {
  if (coup.billes.length < 2) return null;

  const triees = [...coup.billes].sort(ordreDuSolveur);
  const premiere = triees[0];
  const derniere = triees[triees.length - 1];
  const axe = vecteurEntre(premiere, derniere);
  const produitCroise = axe.q * coup.direction.r - axe.r * coup.direction.q;
  if (produitCroise === 0) return null; // en ligne : une seule ecriture, jamais d'ambiguite d'ancre

  const texteChoisi = ecrireCoupNacre(coup);
  const candidatA = `${premiere}${caseDansLaDirection(derniere, coup.direction)}`;
  const candidatB = `${derniere}${caseDansLaDirection(premiere, coup.direction)}`;
  return texteChoisi === candidatA ? candidatB : candidatA;
}

// Relit un coup Nacre. `plateau` est au meme format que pour
// regles.coupsDepuis : une case occupee vaut 'noir' ou 'blanc'.
//
// On ne cherche pas le groupe par calcul : on demande a regles.js tous les
// coups legaux partant de cette case et on garde celui qui s'ecrit comme le
// texte. Les regles restent ainsi ecrites a un seul endroit, et l'ecriture
// et la lecture ne peuvent pas diverger.
function lireCoupNacre(plateau, joueurAuTrait, texte) {
  const normalise = String(texte).toLowerCase();
  if (normalise.length !== LONGUEUR_COUP_NACRE) return null;

  // Un meme texte Nacre peut designer deux coups physiquement differents
  // (bille seule contre groupe de 2, groupe de 2 contre groupe de 3 sur la
  // meme rangee). Regle retenue, identique a KAAWA : le plus petit groupe
  // gagne — voir CLAUDE.md.
  const depart = normalise.slice(0, 2);
  const candidatsNormaux = coupsDepuis(plateau, joueurAuTrait, depart).filter(
    (coup) => ecrireCoupNacre(coup) === normalise
  );
  if (candidatsNormaux.length > 0) {
    return candidatsNormaux.sort((a, b) => a.billes.length - b.billes.length)[0];
  }

  // ECART ASSUME (bug signale par saab, verifie dans les DEUX sources
  // reelles de KAAWA avant de conclure) : une poussee laterale a 3 billes
  // peut arriver avec l'AUTRE ancre que celle qu'ecrireCoupNacre() choisit
  // en la rejouant. Verifie caractere pres dans kaa_utils_ClO_Co.py
  // (convert_move_to_nacre) ET dans KAA_Solver_ClO_Co.cpp ("Sidestep
  // triple", set_nacre(m, c0, d2)) : AUCUNE des deux sources ne generalise
  // a 3 billes la regle "choisir la paire la plus eloignee" qu'elles
  // appliquent deja a 2 (`len(selected_group) == 2` cote Python) — le
  // solveur (qui genere la base Next Move de moteur/next-move.js) et le
  // moteur en direct (qui rejoue le coup) peuvent donc choisir chacun une
  // ancre differente pour LA MEME poussee physique, et aucun des deux ne
  // sait relire l'ecriture de l'autre. Plutot que de reproduire cette
  // impasse a l'identique (un coup pourtant legal resterait injouable en
  // cliquant une suggestion), KAAH cherche ici, sur TOUTES les billes du
  // joueur, un coup dont l'AUTRE ecriture possible correspond — jamais
  // utilise pour ECRIRE, seulement pour relire ce que la base Next Move a
  // pu ecrire differemment.
  const autresCandidats = [];
  for (const autreDepart of Object.keys(plateau)) {
    if (plateau[autreDepart] !== joueurAuTrait) continue;
    for (const coup of coupsDepuis(plateau, joueurAuTrait, autreDepart)) {
      if (ecrireCoupNacreAlternatif(coup) === normalise) autresCandidats.push(coup);
    }
  }
  if (autresCandidats.length === 0) return null;
  return autresCandidats.sort((a, b) => a.billes.length - b.billes.length)[0];
}
