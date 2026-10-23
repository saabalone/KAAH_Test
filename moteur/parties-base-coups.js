// Fabriquer une BASE DE COUPS (Next Move) a partir de parties (saab, 2026-10-21 : « Avec les
// fichiers de parties ... faire KAA_..._NEXT_MOVE_REF_Best_Stat_Fus ») : les parties d'ULA,
// d'abal.online (AO) et de Migs++, notees comme AbaPro. Le format des bases ne change pas
// (moteur/next-move.js) : chaque coup est range sous la position CANONIQUE (moteur/
// permutations.js), tourne de la meme facon, pour que obtenirConseils le retrouve sur le vrai
// plateau ; W, L, D comptent les parties gagnees par Noir, par Blanc, et nulles — comme la base
// de KAAWA (mesure sur ses coups qui ejectent la 6e bille : W chez ceux de Noir dans la partie
// d'origine, L chez ceux de Blanc, quel que soit le camp mis devant par la forme canonique).
// Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : DIRECTIONS, depuisNotation, versNotation
// (plateau.js), tousLesCoupsLegaux (regles.js), appliquerCoup, couleursDuPlateau (partie.js),
// lirePosition, ecrirePosition, ecrireCoupNacreSansAmbiguite (notation.js), positionCanonique,
// permuterCoupNacre (permutations.js), lireLigneCsv, ENTETE (next-move.js) viennent de fichiers
// charges avant celui-ci.

const BILLES_MAX_EN_LIGNE_ABAPRO = 3;
const ENTETE_DES_BASES_DE_COUPS = 'full_posRef,next_move_Ref,nb_W,nb_L,nb_D';
// Les fins de ligne des CSV de KAAWA : moteur/stats-symetriques.js decoupe sur elles.
const FIN_DE_LIGNE_DES_BASES = '\r\n';
const RESULTATS_DES_PARTIES = { N: 'victoires', B: 'defaites', '=': 'nulles' };
const EJECTIONS_DE_LA_VICTOIRE = 6;

const memeDirection = (a, b) => a.q === b.q && a.r === b.r;
const estUneDirectionAbaPro = (vecteur) => DIRECTIONS.some((direction) => memeDirection(direction, vecteur));
const ecart = (de, a) => ({ q: a.q - de.q, r: a.r - de.r });

// Le coup legal de `etat` (camp au trait) qui deplace exactement `billes` dans `direction`, ou null.
function coupLegalDe(etat, billes, direction) {
  const cle = [...billes].sort().join();
  return tousLesCoupsLegaux(couleursDuPlateau(etat.plateau), etat.joueurAuTrait).find((coup) => [...coup.billes].sort().join() === cle && memeDirection(coup.direction, direction)) ?? null;
}

// Un coup note comme AbaPro, ou null s'il ne se lit pas sur `etat` :
//   - 2 cases (« a1b2 ») : la bille a1 avance vers b2, avec la ligne amie devant elle (au plus 3) ;
//   - 3 cases (« h9g9g8 ») : un groupe de cote, sa premiere et sa derniere bille, puis ou arrive
//     la premiere.
function lireCoupAbaPro(etat, texte) {
  const cases = texte.match(/[a-i][1-9]/g) ?? [];
  if (cases.join('') !== texte || cases.some((notation) => depuisNotation(notation) === null)) return null;
  const couleurs = couleursDuPlateau(etat.plateau);
  if (cases.length === 2) {
    const [a, b] = cases.map(depuisNotation);
    const direction = ecart(a, b);
    if (!estUneDirectionAbaPro(direction)) return null;
    const ligne = [];
    for (let ici = a; ligne.length < BILLES_MAX_EN_LIGNE_ABAPRO; ici = { q: ici.q + direction.q, r: ici.r + direction.r }) {
      const notation = versNotation(ici.q, ici.r);
      if (couleurs[notation] !== etat.joueurAuTrait) break;
      ligne.push(notation);
    }
    return ligne.length > 0 ? coupLegalDe(etat, ligne, direction) : null;
  }
  if (cases.length === 3) {
    const [premiere, derniere, arrivee] = cases.map(depuisNotation);
    const direction = ecart(premiere, arrivee);
    const etendue = ecart(premiere, derniere);
    const pas = Math.max(Math.abs(etendue.q), Math.abs(etendue.r), Math.abs(etendue.q + etendue.r));
    if (!estUneDirectionAbaPro(direction) || pas === 0 || pas >= BILLES_MAX_EN_LIGNE_ABAPRO) return null;
    const unite = { q: etendue.q / pas, r: etendue.r / pas };
    if (!estUneDirectionAbaPro(unite)) return null;
    const groupe = Array.from({ length: pas + 1 }, (_, rang) => versNotation(premiere.q + unite.q * rang, premiere.r + unite.r * rang));
    return coupLegalDe(etat, groupe, direction);
  }
  return null;
}

// Une ligne d'un fichier de parties (donnees/parties) : « position <tab> N|B|=|? <tab> coups ».
function lirePartieDeBase(ligne) {
  const [depart = '', resultat = '', coups = ''] = ligne.trim().split('\t');
  return { depart, resultat, coups: coups.split(' ').filter(Boolean) };
}

// Les positions et les coups d'une partie, jusqu'au premier coup illisible ou a la fin.
function rejouerLaPartie(partie) {
  let etat = lirePosition(partie.depart);
  const joues = [];
  for (const texte of partie.coups) {
    if (etat.vainqueur) break;
    const coup = lireCoupAbaPro(etat, texte);
    if (!coup) return { joues, fin: etat, illisible: texte };
    joues.push({ etat, coup });
    etat = appliquerCoup(etat, coup).etat;
  }
  return { joues, fin: etat, illisible: null };
}

// Le resultat d'une partie « ? » (« Au score ») : celui qui a ejecte la 6e bille, sinon inconnu.
function resultatRejoue(fin) {
  if (fin.billesEjecteesBlanches >= EJECTIONS_DE_LA_VICTOIRE) return 'N';
  if (fin.billesEjecteesNoires >= EJECTIONS_DE_LA_VICTOIRE) return 'B';
  return null;
}

const cleDeLaBase = (position, coup) => `${position},${coup}`;

function compterDansLaBase(stats, position, coup, champ, nombre = 1) {
  const cle = cleDeLaBase(position, coup);
  const ligne = stats.get(cle) ?? { position, coup, victoires: 0, defaites: 0, nulles: 0 };
  ligne[champ] += nombre;
  stats.set(cle, ligne);
}

// Range chaque coup de `partie` dans `stats` (cle -> { position, coup, victoires, defaites,
// nulles }). Renvoie { coups : combien ont ete ranges, illisible : le coup qui a arrete la
// partie, ou null, cles : [{ cle, camp }] coup apres coup, pour la selection Multi }. Une
// partie « ? » sans 6e bille ejectee ne range rien.
function ajouterPartieALaBase(stats, partie) {
  const { joues, fin, illisible } = rejouerLaPartie(partie);
  const resultat = partie.resultat === '?' ? resultatRejoue(fin) : partie.resultat;
  const champ = RESULTATS_DES_PARTIES[resultat];
  if (!champ) return { coups: 0, illisible, cles: [] };
  const cles = joues.map(({ etat, coup }) => {
    const { positionReference, indexPermutation } = positionCanonique(ecrirePosition(etat));
    const texte = ecrireCoupNacreSansAmbiguite(couleursDuPlateau(etat.plateau), etat.joueurAuTrait, coup);
    const coupReference = permuterCoupNacre(texte, indexPermutation);
    compterDansLaBase(stats, positionReference, coupReference, champ);
    return { cle: cleDeLaBase(positionReference, coupReference), camp: etat.joueurAuTrait };
  });
  return { coups: joues.length, illisible, cles };
}

// Ajoute a `stats` les lignes d'une base de coups deja faite (le CSV de KAAWA, par exemple).
function ajouterCsvALaBase(stats, texteCsv) {
  for (const ligne of texteCsv.split(/\r?\n/).slice(1)) {
    if (!ligne.trim()) continue;
    const { position, coup, victoires, defaites, nulles } = lireLigneCsv(ligne.trim());
    compterDansLaBase(stats, position, coup, 'victoires', victoires);
    compterDansLaBase(stats, position, coup, 'defaites', defaites);
    compterDansLaBase(stats, position, coup, 'nulles', nulles);
  }
}

// La base en CSV, dans l'ordre ou les coups ont ete ranges.
function statsEnCsv(stats) {
  const lignes = [...stats.values()].map(({ position, coup, victoires, defaites, nulles }) => `${position},${coup},${victoires},${defaites},${nulles}`);
  return `${[ENTETE_DES_BASES_DE_COUPS, ...lignes].join(FIN_DE_LIGNE_DES_BASES)}${FIN_DE_LIGNE_DES_BASES}`;
}

// La selection MULTI (saab, 2026-10-21 : « ne prendre que les next-move > 1, plus légers », comme
// le KAA_NEXT_MOVE_REF_Multi_Best_Stat.csv de KAAWA ; puis « ou ne garder que le 1er next-move
// unique pour chaque camp, ce qui montrera où est peut-être l'erreur ») : les coups vus dans au
// moins 2 parties, et, dans chaque partie, le 1er coup que nulle autre n'a joue, pour chaque camp
// — la ou elle sort du connu. `clesDesParties` : les cles de chaque partie (ajouterPartieALaBase) ;
// aucune pour une base deja faite, dont on n'a pas les parties.
const PARTIES_D_UN_COUP_REPETE = 2;
const partiesDuCoup = ({ victoires, defaites, nulles }) => victoires + defaites + nulles;

function selectionMulti(stats, clesDesParties) {
  const gardees = new Set([...stats].filter(([, ligne]) => partiesDuCoup(ligne) >= PARTIES_D_UN_COUP_REPETE).map(([cle]) => cle));
  for (const cles of clesDesParties) {
    const campsTrouves = new Set();
    for (const { cle, camp } of cles) {
      if (campsTrouves.has(camp) || partiesDuCoup(stats.get(cle) ?? { victoires: 0, defaites: 0, nulles: 0 }) !== 1) continue;
      gardees.add(cle);
      campsTrouves.add(camp);
    }
  }
  return new Map([...stats].filter(([cle]) => gardees.has(cle)));
}

// Les coups RETIRES de toutes les bases (saab, 2026-10-23 : « Il faut supprimer les 4 coups
// d'ouverture (en fait 2 sym) », depuis la Marguerite Belge) : c3d4 et g7f6 de Noir, et la reponse
// g5f5 de Blanc — une seule ligne pour ses deux images symetriques. Ils ne venaient que des
// parties AO ; sous la position canonique, comme les cles de la base (cleDeLaBase).
const COUPS_RETIRES_DES_BASES = [
  '0a12b123c23g78h789i89_0a45b456c56g45h456i56,c3d4',
  '0a12b123c23g78h789i89_0a45b456c56g45h456i56,g7f6',
  '0a12b123c23f6g8h789i89_0a45b456c56g45h456i56,c5d5',
];

// Une base en CSV, sans les lignes de `cles` (generer-bases-coups.js : COUPS_RETIRES_DES_BASES).
function retirerDesCoupsDeLaBase(texteCsv, cles) {
  const stats = new Map();
  ajouterCsvALaBase(stats, texteCsv);
  for (const cle of cles) stats.delete(cle);
  return statsEnCsv(stats);
}
