// La SORTIE d'une bille de la zone ejectable (saab, 2026-10-04 : « savoir si
// une bille adverse peut sortir d'une zone avant que je la bloque ... il faut
// tenir compte du trait, des billes bloquantes (adverses si poussee
// impossible, mais aussi 3 billes amies qui la bloquent) »).
//
// Pour une bille sur les 2 couronnes du bord (b et a) :
//   - en combien de SES coups elle atteint une case hors de la zone (anneau 2
//     ou plus pres du centre), selon les vraies regles : elle avance seule, ou
//     dans une ligne d'au plus 3 billes amies (4 amies en ligne la bloquent),
//     et ne passe une bille adverse que si sa ligne peut la pousser (sumito,
//     moteur/regles.js, coupEnLigne) ; les autres billes ne bougent pas ;
//   - pour chaque case de sortie, en combien de coups la bille adverse la plus
//     rapide l'atteint, avec les memes regles ;
//   - une sortie est LIBRE si la bille y arrive avant : avec le trait, a
//     egalite de coups elle passe la premiere ; sans le trait, il lui faut un
//     coup d'avance.
// Une recherche courte (PROFONDEUR_SORTIE_MAX coups) : au-dela, pas de sortie.
// Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : DIRECTIONS,
// caseDansLaDirection (plateau.js), coupEnLigne, couleurAdverse, directionOpposee,
// BILLES_MAX_PAR_COUP (regles.js),
// couleursDuPlateau, appliquerCoup (partie.js), ecrirePosition (notation.js),
// COORDONNEES_DES_CASES_IA, distanceAxiale (ia-evaluation-v3.js) viennent de
// fichiers charges avant celui-ci.

const ANNEAU_LE_PLUS_INTERIEUR_EJECTABLE = 3;
const PROFONDEUR_SORTIE_MAX = 4;
const CENTRE_DES_ANNEAUX = { q: 0, r: 0 };
const anneauDe = (notation) => distanceAxiale(COORDONNEES_DES_CASES_IA[notation], CENTRE_DES_ANNEAUX);
const estHorsDeLaZone = (notation) => anneauDe(notation) < ANNEAU_LE_PLUS_INTERIEUR_EJECTABLE;

// Les billes amies consecutives a partir de `notation`, dans `direction`.
function amiesALaSuite(couleurs, notation, direction, camp) {
  const amies = [];
  for (let suivante = caseDansLaDirection(notation, direction); suivante !== null && couleurs[suivante] === camp; suivante = caseDansLaDirection(suivante, direction)) {
    amies.push(suivante);
  }
  return amies;
}

// Les pas que la bille de `notation` peut faire (un par direction au plus) :
// { etat, arrivee }. Elle bouge dans une ligne d'amies qui la contient — toutes
// celles devant elle, et derriere autant qu'il en faut, la plus forte ligne
// d'abord (elle pousse le mieux).
function pasDeLaBille(etat, notation) {
  const couleurs = couleursDuPlateau(etat.plateau);
  const camp = couleurs[notation];
  const pas = [];
  for (const direction of DIRECTIONS) {
    const devant = amiesALaSuite(couleurs, notation, direction, camp);
    if (devant.length >= BILLES_MAX_PAR_COUP) continue;
    const derriere = amiesALaSuite(couleurs, notation, directionOpposee(direction), camp);
    for (let enArriere = Math.min(derriere.length, BILLES_MAX_PAR_COUP - 1 - devant.length); enArriere >= 0; enArriere--) {
      const groupe = [...derriere.slice(0, enArriere).reverse(), notation, ...devant];
      const coup = coupEnLigne(groupe, direction, couleurs, camp);
      if (!coup) continue;
      pas.push({ etat: appliquerCoup(etat, coup).etat, arrivee: caseDansLaDirection(notation, direction) });
      break;
    }
  }
  return pas;
}

// En combien de pas la bille de `depart` atteint chaque case, jusqu'a
// `profondeur` pas : { notation: pas }. Les autres billes ne jouent pas.
function distancesDeLaBille(etat, depart, profondeur) {
  const distances = { [depart]: 0 };
  let vague = [{ etat, case: depart }];
  const vus = new Set([`${depart} ${ecrirePosition(etat)}`]);
  for (let pas = 1; pas <= profondeur && vague.length > 0; pas++) {
    const suivante = [];
    for (const { etat: courant, case: ici } of vague) {
      for (const { etat: apres, arrivee } of pasDeLaBille(courant, ici)) {
        const cle = `${arrivee} ${ecrirePosition(apres)}`;
        if (vus.has(cle)) continue;
        vus.add(cle);
        distances[arrivee] ??= pas;
        suivante.push({ etat: apres, case: arrivee });
      }
    }
    vague = suivante;
  }
  return distances;
}

function sortieDeLaZone(etat, notation) {
  if (estHorsDeLaZone(notation)) return null;
  const couleurs = couleursDuPlateau(etat.plateau);
  const camp = couleurs[notation];
  const distances = distancesDeLaBille(etat, notation, PROFONDEUR_SORTIE_MAX);
  const atteintes = Object.keys(distances).filter(estHorsDeLaZone);
  if (atteintes.length === 0) return { coups: null, cases: [], libres: [], adversaire: {} };
  const coups = Math.min(...atteintes.map((sortie) => distances[sortie]));
  const cases = atteintes.filter((sortie) => distances[sortie] === coups).sort();
  // L'adversaire n'a pas besoin de chercher plus loin que la bille (plus un coup sans le trait).
  const adverses = Object.keys(couleurs).filter((bille) => couleurs[bille] === couleurAdverse(camp));
  const parAdverse = adverses.map((bille) => distancesDeLaBille(etat, bille, coups + 1));
  // Une bille adverse deja sur la case ne la bloque pas : la bille y arrive en la poussant.
  const adversaire = Object.fromEntries(
    cases.map((sortie) => [sortie, Math.min(Infinity, ...parAdverse.map((distances) => (distances[sortie] > 0 ? distances[sortie] : Infinity)))])
  );
  const avecLeTrait = etat.joueurAuTrait === camp;
  const libres = cases.filter((sortie) => (avecLeTrait ? coups <= adversaire[sortie] : coups < adversaire[sortie]));
  return { coups, cases, libres, adversaire };
}

// La reponse du PIEGE de KAI++ (solveur/kai-plus.cpp, kaiplus_piege : les deux
// camps jouent, saab 2026-10-04) relue : { etat ('hors', 'sort', 'piegee' ou
// 'incertain'), coups, noeuds, coup (son premier coup de sortie, ou null) } ;
// null si ce n'en est pas une.
const ETATS_DU_PIEGE = { H: 'hors', S: 'sort', P: 'piegee', I: 'incertain' };

function lireReponsePiege(texte) {
  const [lettre, coups, noeuds, coup] = String(texte).split(' ');
  if (!(lettre in ETATS_DU_PIEGE) || !Number.isFinite(Number(coups))) return null;
  return { etat: ETATS_DU_PIEGE[lettre], coups: Number(coups), noeuds: Number(noeuds), coup: coup && coup !== '-' ? coup : null };
}
