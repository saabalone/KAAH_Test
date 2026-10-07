// Ce que la machine voit d'UNE bille (saab, 2026-10-04 : « au clic droit un
// petit tableau relatif a une bille (pas la position complete), c'est-a-dire
// le poids, cohes., compac., etc. ») : ce qu'elle apporte a chaque terme de
// l'evaluation, de Gain a Fourchette (saab : « mettre tous les parametres ...
// comme tableau 1er coup ») — l'evaluation de la position avec elle, moins sans
// elle —, avec les poids d'un profil, et deux mesures pour l'attaque —
//   - menacee : combien de sumitos adverses la poussent, et si l'un l'ejecte ;
//   - sa SORTIE de la zone ejectable (saab : « etre sur d'aller attaquer une
//     bille sans chance qu'elle ne m'echappe ») : moteur/sortie-bille.js.
// Seulement montre (interface/infos-case.js) : l'evaluation n'en tient pas
// encore compte. Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : DIRECTIONS (plateau.js),
// couleurAdverse (regles.js), couleursDuPlateau (partie.js), VOISINS_DES_CASES
// (ia-evaluation.js), sumitosDuCamp, CASES_VOISINES_IA (ia-evaluation-v2.js),
// CLASSE_DES_CASES_IA, PAS_DES_CASES_IA, COORDONNEES_DES_CASES_IA,
// distanceAxiale (ia-evaluation-v3.js), detailDeLEvaluation, termesDuProfil
// (essai-ia.js), sortieDeLaZone (sortie-bille.js), billeBloqueeVersLeCentre
// (ia-evaluation-v4.js) viennent de fichiers charges avant celui-ci.

const distanceEntre = (a, b) => distanceAxiale(COORDONNEES_DES_CASES_IA[a], COORDONNEES_DES_CASES_IA[b]);

function billesDuCamp(couleurs, camp) {
  return Object.keys(couleurs).filter((notation) => couleurs[notation] === camp);
}

// La plus petite distance, en coups, de `notation` a l'une des `billes` ; null sans bille.
function plusProche(notation, billes) {
  return billes.length === 0 ? null : Math.min(...billes.map((bille) => distanceEntre(notation, bille)));
}

// Les billes poussees par un sumito (sumitosDuCamp ne garde que sa tete) : les
// adverses qui suivent la tete dans sa direction, deux au plus.
function billesPousseesPar(sumito, couleurs) {
  const index = DIRECTIONS.indexOf(sumito.direction);
  const poussee = couleurAdverse(couleurs[sumito.tete]);
  const billes = [];
  for (let suivante = CASES_VOISINES_IA[sumito.tete][index]; suivante !== null && couleurs[suivante] === poussee; suivante = CASES_VOISINES_IA[suivante][index]) {
    billes.push(suivante);
  }
  return billes;
}

// Chaque terme de l'evaluation de `etat` (detailDeLEvaluation), dans l'ordre
// des colonnes de sa version ; 0 pour un terme absent (partie finie).
function termesDeLaPosition(etat, camp, poids, version) {
  const detail = detailDeLEvaluation(etat, camp, poids, version);
  return Object.fromEntries(termesDuProfil(version, poids).map((cle) => [cle, detail[cle] ?? 0]));
}

const sommeDesTermes = (termes) => Object.values(termes).reduce((somme, terme) => somme + terme, 0);

function sansLaBille(etat, notation) {
  const plateau = { ...etat.plateau };
  delete plateau[notation];
  return { ...etat, plateau };
}

// La bille sur `notation` vue par la machine (`poids`, `version`), du point de
// vue de son propre camp ; null si la case est vide.
function detailDeLaBille(etat, notation, poids, version) {
  const couleurs = couleursDuPlateau(etat.plateau);
  const camp = couleurs[notation];
  if (!camp) return null;
  const cle = CLASSE_DES_CASES_IA[notation];
  const pas = PAS_DES_CASES_IA[cle];
  const siennes = billesDuCamp(couleurs, camp).filter((bille) => bille !== notation);
  const adverses = billesDuCamp(couleurs, couleurAdverse(camp));
  const voisines = VOISINS_DES_CASES[notation].filter((voisine) => couleurs[voisine] === camp).length;
  const poussees = sumitosDuCamp(couleurs, couleurAdverse(camp)).filter((sumito) => billesPousseesPar(sumito, couleurs).includes(notation));
  const detail = {
    notation,
    camp,
    classe: cle.slice('case'.length).toLowerCase(),
    pas,
    voisines,
    distanceMoyenne: siennes.length === 0 ? 0 : siennes.reduce((somme, bille) => somme + distanceEntre(notation, bille), 0) / siennes.length,
    attaquant: plusProche(notation, adverses),
    poussable: poussees.length,
    bloquee: billeBloqueeVersLeCentre(couleurs, notation),
    ejectable: poussees.some((sumito) => sumito.ejection && billesPousseesPar(sumito, couleurs).at(-1) === notation),
    sortie: sortieDeLaZone(etat, notation),
  };
  const avec = termesDeLaPosition(etat, camp, poids, version);
  const sans = termesDeLaPosition(sansLaBille(etat, notation), camp, poids, version);
  const termes = Object.fromEntries(Object.keys(avec).map((terme) => [terme, avec[terme] - sans[terme]]));
  return { ...detail, termes, valeur: sommeDesTermes(termes) };
}
