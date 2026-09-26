// Statistiques additionnees des coups symetriques (saab, 2026-09-27) : produit
// KAA_NEXT_MOVE_REF_Best_Stat_Fus.csv a partir de la vraie base de KAAWA, qui,
// elle, n'est jamais modifiee.
//
// Dans une position VRAIMENT symetrique — une symetrie du plateau (moteur/
// permutations.js) renvoie chaque camp exactement sur lui-meme, comme le
// demi-tour sur la Marguerite Belge — deux coups images l'un de l'autre sont le
// meme coup vu autrement (a1d4 et i9f6). La base les compte pourtant a part :
// chacun ne voit que la moitie des parties. Ici, ils RESTENT tous deux dans le
// fichier, mais recoivent chacun la SOMME de leurs statistiques ; un jumeau
// jamais joue est ajoute, juste apres son coup, avec cette meme somme.
//
// Deliberement EXCLUES (choix de saab) : les positions symetriques seulement en
// echangeant Noir et Blanc — le jumeau d'un coup de Noir y serait un coup de
// Blanc, et gagne/perdu (toujours vus par celui qui joue) seraient melanges.
//
// Les coups sont compares comme des COUPS (billes et direction), jamais comme
// des textes : l'ecriture Nacre depend de l'ordre des cases (moteur/
// notation.js, ordreDuSolveur), qu'une symetrie ne conserve pas — tourner le
// texte d'un coup ne donne pas toujours le texte sous lequel la base range son
// image.
//
// A appliquer une seule fois, TOUJOURS sur le CSV d'origine : rappliquee sur
// son propre resultat, elle additionnerait une seconde fois des jumeaux deja
// additionnes.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lirePosition,
// lireCoupNacre, designentLeMemeCoup, ecrireCoupNacreSansAmbiguite
// (notation.js), couleursDuPlateau (partie.js), coupsDepuis (regles.js),
// casesTriees, permuterCase, transformer, NOMBRE_DE_PERMUTATIONS
// (permutations.js), lireLigneCsv, SEPARATEUR_LIGNE_CSV (next-move.js) viennent
// de fichiers charges avant celui-ci.

// L'identite (index 0) laisse tout en place : jamais comptee comme symetrie.
const PREMIERE_SYMETRIE = 1;
const FIN_DE_LIGNE_CSV = '\r\n';

// Les symetries (index 1 a 11) qui laissent `etat` identique, chaque camp sur
// ses propres cases. Les compteurs d'ejection ne bougent pas : chaque camp
// garde le sien.
function symetriesPropres(etat) {
  const noires = casesTriees(etat.plateau, 'noir');
  const blanches = casesTriees(etat.plateau, 'blanc');
  const image = (cases, index) => cases.map((notation) => permuterCase(notation, index)).sort().join();
  const symetries = [];
  for (let index = PREMIERE_SYMETRIE; index < NOMBRE_DE_PERMUTATIONS; index++) {
    if (image(noires, index) === noires.join() && image(blanches, index) === blanches.join()) symetries.push(index);
  }
  return symetries;
}

// Une direction est un vecteur : la symetrie (lineaire en coordonnees axiales,
// voir permutations.js) s'y applique directement, comme a une case.
function permuterCoup(coup, index) {
  return {
    billes: coup.billes.map((notation) => permuterCase(notation, index)),
    direction: transformer(coup.direction, index),
  };
}

// Le coup legal de `camp` qui designe le meme deplacement que `image` — ecrit
// ensuite comme KAAH range tout coup (ecrireCoupNacreSansAmbiguite), relu juste
// par KAAH comme par KAAWA. Une position symetrique a forcement l'image de
// chaque coup legal parmi ses coups legaux.
function coupLegalIdentique(couleurs, camp, image) {
  for (const depart of Object.keys(couleurs)) {
    const trouve = coupsDepuis(couleurs, camp, depart).find((coup) => designentLeMemeCoup(coup, image));
    if (trouve) return trouve;
  }
  return null;
}

// Les lignes (deja lues, voir lireLigneCsv) d'UNE position symetrique :
// renvoie, pour chacune et dans le meme ordre, ce qui la remplace — elle-meme
// avec la stat additionnee, suivie des jumeaux ajoutes. Une ligne dont le coup
// ne se relit pas sur la position reste telle quelle.
function lignesAdditionnees(position, entrees, symetries) {
  const couleurs = couleursDuPlateau(lirePosition(position).plateau);
  const lus = entrees.map((entree) => {
    const camp = couleurs[entree.coup.slice(0, 2)];
    return { ...entree, camp, coupLu: camp ? lireCoupNacre(couleurs, camp, entree.coup) : null };
  });
  const memeCoup = (entree, coup) => entree.coupLu !== null && designentLeMemeCoup(entree.coupLu, coup);

  const jumeauxAjoutes = [];
  return lus.map((entree) => {
    if (!entree.coupLu) return [entree.ligne];
    const resultat = [];
    const images = symetries.map((index) => permuterCoup(entree.coupLu, index));
    const famille = [entree.coupLu, ...images];
    const presentes = lus.filter((autre) => autre.camp === entree.camp && famille.some((coup) => memeCoup(autre, coup)));
    const somme = presentes.reduce(
      (total, autre) => ({
        victoires: total.victoires + autre.victoires,
        defaites: total.defaites + autre.defaites,
        nulles: total.nulles + autre.nulles,
      }),
      { victoires: 0, defaites: 0, nulles: 0 }
    );
    const ecrire = (texteCoup) =>
      [position, texteCoup, somme.victoires, somme.defaites, somme.nulles].join(SEPARATEUR_LIGNE_CSV);
    resultat.push(ecrire(entree.coup));

    for (const image of images) {
      const dejaLa =
        presentes.some((autre) => memeCoup(autre, image)) ||
        jumeauxAjoutes.some((coup) => designentLeMemeCoup(coup, image));
      if (dejaLa) continue;
      const jumeau = coupLegalIdentique(couleurs, entree.camp, image);
      if (!jumeau) continue;
      jumeauxAjoutes.push(jumeau);
      resultat.push(ecrire(ecrireCoupNacreSansAmbiguite(couleurs, entree.camp, jumeau)));
    }
    return resultat;
  });
}

// Le texte entier du CSV (entete compris) -> le texte du CSV "_Fus". Toute
// position sans symetrie propre ressort a l'identique, au caractere pres ;
// l'ordre des lignes est garde, chaque jumeau ajoute suit son coup.
function additionnerStatsSymetriques(texteCsv) {
  const [entete, ...lignes] = texteCsv.split(FIN_DE_LIGNE_CSV).filter((ligne) => ligne !== '');

  const parPosition = new Map();
  lignes.forEach((ligne, rang) => {
    const entree = { ...lireLigneCsv(ligne), ligne, rang };
    if (!parPosition.has(entree.position)) parPosition.set(entree.position, []);
    parPosition.get(entree.position).push(entree);
  });

  // Chaque ligne d'une position symetrique est remplacee A SA PLACE (les lignes
  // d'une meme position ne se suivent pas toujours dans le CSV).
  const remplacements = new Map();
  for (const [position, entrees] of parPosition) {
    const symetries = symetriesPropres(lirePosition(position));
    if (symetries.length === 0) continue;
    const nouvelles = lignesAdditionnees(position, entrees, symetries);
    entrees.forEach((entree, i) => remplacements.set(entree.rang, nouvelles[i]));
  }

  const sortie = lignes.flatMap((ligne, rang) => remplacements.get(rang) ?? [ligne]);
  return [entete, ...sortie].join(FIN_DE_LIGNE_CSV) + FIN_DE_LIGNE_CSV;
}
