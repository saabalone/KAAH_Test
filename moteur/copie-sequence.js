// « Copie séquence Nacre » et « Copie séquence AP » de KAAWA (onglet Séquence,
// kaa_tab_manager_ClO_Co.py ; _file_copy_nacre, kaa_app_ClO_Co.py) : la suite
// des coups joues, du depart jusqu'au coup regarde, en texte a coller ailleurs.
// Pur, sans presse-papiers (interface/sequence.js s'en charge).
//
// L'ecriture AbaPro reproduit nacre_to_abapro (kaa_utils_ClO_Co.py), comparee
// a son execution reelle sur 3 082 coups (tests/copie-sequence.test.js) :
//   - une bille : les deux cases, comme en Nacre ;
//   - en ligne (2 ou 3 billes, poussee comprise) : la bille ARRIERE, puis la
//     case ou elle arrive ;
//   - lateral : les deux billes extremes, puis la case ou arrive la premiere
//     des deux — 6 caracteres.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : caseDansLaDirection
// (moteur/plateau.js), appliquerCoup, couleursDuPlateau (moteur/partie.js),
// lireCoupNacre (moteur/notation.js) viennent de fichiers charges avant.

function directionOpposeeDe({ q, r }) {
  return { q: -q, r: -r };
}

// Un coup (moteur/regles.js : { billes, direction, billesPoussees }) en AbaPro.
function ecrireCoupAbaPro(coup) {
  const { billes, direction } = coup;
  if (billes.length === 1) return `${billes[0]}${caseDansLaDirection(billes[0], direction)}`;

  const enLigne = billes.includes(caseDansLaDirection(billes[0], direction)) ||
    billes.includes(caseDansLaDirection(billes[0], directionOpposeeDe(direction)));
  if (enLigne) {
    const arriere = billes.find((bille) => !billes.includes(caseDansLaDirection(bille, directionOpposeeDe(direction))));
    return `${arriere}${caseDansLaDirection(arriere, direction)}`;
  }

  // Lateral : billes triees par leur ecriture ("a5" < "b5"). KAAWA inverse les
  // deux extremes sur l'axe ou seule la lettre change (a5-b5-c5, meme chiffre).
  const triees = [...billes].sort();
  const memeChiffre = triees.every((bille) => bille[1] === triees[0][1]);
  const [premiere, derniere] = memeChiffre ? [triees.at(-1), triees[0]] : [triees[0], triees.at(-1)];
  return `${premiere}${derniere}${caseDansLaDirection(premiere, direction)}`;
}

// _file_copy_nacre : "1. a1a2 i9i8 2. b1b2" — Noir joue toujours en premier.
function sequenceNacre(coups) {
  return numeroterSequence(coups, ' ');
}

// action_copy_sequence_abapro : rejoue la partie depuis `etatDepart` pour
// ecrire chaque coup en AbaPro, puis "1.xxxx yyyy 2.zzzz" (sans espace apres
// le point, contrairement a la copie Nacre — tel quel chez KAAWA).
function sequenceAbaPro(etatDepart, coupsNacre) {
  let etat = etatDepart;
  let camp = 'noir';
  const coupsAbaPro = [];
  for (const texte of coupsNacre) {
    const coup = lireCoupNacre(couleursDuPlateau(etat.plateau), camp, texte);
    coupsAbaPro.push(ecrireCoupAbaPro(coup));
    etat = appliquerCoup(etat, coup).etat;
    camp = camp === 'noir' ? 'blanc' : 'noir';
  }
  return numeroterSequence(coupsAbaPro, '');
}

function numeroterSequence(coups, apresLePoint) {
  const morceaux = [];
  for (let rang = 0; rang < coups.length; rang += 2) {
    const blanc = coups[rang + 1] ?? '';
    morceaux.push(`${rang / 2 + 1}.${apresLePoint}${coups[rang]} ${blanc}`.trim());
  }
  return morceaux.join(' ');
}
