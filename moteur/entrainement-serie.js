// La SERIE du mode Ceinture (phase 36 ; regle revue avec saab le 2026-10-10) : ce
// qu'il faut gagner pour obtenir la ceinture visee. Pur : interface/entrainement*.js
// propose les jeux, lance les parties et range les parcours (un par joueur).
//
// LA REGLE :
//   - on a une ceinture (la blanche au depart) et on en vise une plus haute — la
//     suivante, ou plus loin (« on peut sauter des niveaux ») ;
//   - une VICTOIRE = un jeu gagne a l'aller ET a la revanche (couleurs echangees,
//     ou Attaque puis Defense en PZL) ; un jeu est REUSSI a `victoiresParJeu`
//     victoires, et le reste (« on garde v1 comme réussie ») ; la serie est complete
//     a `jeuxParSerie` jeux reussis ;
//   - une defaite est un ESSAI RATE sur ce jeu, le reste est garde ; au bout de
//     `essaisAvantReinitialisation`, le jeu repart de zero (ou toute la serie,
//     `reinitialiserTousLesJeux`) ; au bout de `reinitialisationsAvantDeRedescendre`
//     reinitialisations, on redescend d'une ceinture ;
//   - puis la CONFIRMATION : une victoire sur chaque ceinture sautee (saab : « il faut
//     valider toutes les ceintures sautées »), ou, sans saut, sur celle d'en dessous ;
//     une ceinture a confirmer qui a des jeux imposes (sautee, ou celle d'en dessous) se
//     confirme par ceux qu'on n'a pas gagnes a la ceinture visee, tous (saab, 2026-10-18 :
//     « faire jouer seulement celles qui diffèrent ... donc on fait la B » ; « si on saute de
//     Blanche à Jaune, on devra confirmer tous ceux de Blanche, car Jaune fait les
//     complémentaires ») — tous deja gagnes : confirmee d'office ;
//   - apres une pause de plus de `joursAvantReconfirmation` jours sans jouer a son grade
//     ou plus haut, le grade acquis est a reconfirmer aussi (saab : « il refera Noire 1
//     dan pour valider Noire 2 Dan ; s'il échoue 3 fois cette paire, il descend »).
//
// Les jeux proposes (saab : « Standard/mBelg/Alien, avec mBelg imposée ... dès qu'on
// aura réussi une des 2, on aura obligatoirement mBelg ») : `regles.imposes` gardent
// leur place dans la serie (jeuxChoisissables).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CEINTURE_LA_PLUS_HAUTE
// (moteur/entrainement.js) vient d'un fichier charge avant celui-ci ; placePourUnJeu
// (moteur/entrainement-propositions.js, charge apres) n'est appele qu'a l'usage.

// Une victoire par jeu au depart (saab, 2026-10-11 : « pour le moment on met tout à 1
// par défaut » ; plus, c'est un reglage).
// Le resultat d'une nulle, a cote de vrai (gagne) et faux (perdu) : un essai rate, qui
// peut valoir une partie de plus (rattrapageSurNulle, voir suiteDUnEssai).
const RESULTAT_NULLE = 'nulle';

const REGLES_DE_SERIE_PAR_DEFAUT = Object.freeze({
  victoiresParJeu: 1,
  jeuxParSerie: 1,
  revanche: true,
  confirmation: true,
  revancheDeConfirmation: true,
  essaisAvantReinitialisation: 3,
  reinitialiserTousLesJeux: false,
  reinitialisationsAvantDeRedescendre: 3,
  joursAvantReconfirmation: 30,
  rattrapageSurNulle: true,
});
const MS_PAR_JOUR = 24 * 60 * 60 * 1000;
const SENS_DU_JEU = ['aller', 'revanche'];
// `aConfirmerCeintures` : les ceintures a confirmer, fixees quand la serie est complete ;
// `aReconfirmer` : une pause trop longue, le grade acquis sera a reconfirmer ;
// `aFaireEnConfirmation` : { ceinture a confirmer : les jeux imposes a y gagner } (voir
// plus haut), fixes eux aussi ; `jeuxConfirmes` : { ceinture : ceux deja gagnes }.
const SERIE_A_ZERO = Object.freeze({ enCours: {}, valides: [], reinitialisations: 0, aConfirmer: false, confirmees: [], enConfirmation: {}, aConfirmerCeintures: [], aReconfirmer: false, aFaireEnConfirmation: {}, jeuxConfirmes: {} });

// `precedente` (le petit rond de l'icone) : la ceinture d'avant la derniere obtenue
// ou perdue, null au depart.
function parcoursNeuf() {
  return { ceinture: 0, cible: 1, ...SERIE_A_ZERO, gagnes: {}, precedente: null };
}

// Un parcours enregistre avant le 2026-10-10 n'a pas tous les champs.
const complet = (parcours) => ({ ...SERIE_A_ZERO, ...parcours });

// Viser `cible` (plus haute que la ceinture acquise) : la serie repart de zero.
function viserCeinture(parcours, cible) {
  if (!Number.isInteger(cible) || cible <= parcours.ceinture || cible > CEINTURE_LA_PLUS_HAUTE || cible === parcours.cible) return parcours;
  return { ...parcours, cible, ...SERIE_A_ZERO };
}

// Les ceintures a confirmer encore : les sautees, ou celle d'en dessous.
function ceinturesSauteesOuDessous({ ceinture, cible }) {
  return cible === ceinture + 1 ? [ceinture] : Array.from({ length: cible - ceinture - 1 }, (_, i) => ceinture + 1 + i);
}
function ceinturesAConfirmer(parcours) {
  const entier = complet(parcours);
  const toutes = entier.aConfirmerCeintures.length > 0 ? entier.aConfirmerCeintures : ceinturesSauteesOuDessous(entier);
  return toutes.filter((autre) => !entier.confirmees.includes(autre));
}

// Les ceintures dont un jeu compte maintenant : la visee, ou celles de la confirmation.
function ceinturesJouables(parcours) {
  if (parcours.cible === null) return [];
  return parcours.aConfirmer ? ceinturesAConfirmer(parcours) : [parcours.cible];
}

function victoiresAttendues(regles = REGLES_DE_SERIE_PAR_DEFAUT) {
  return regles.victoiresParJeu * regles.jeuxParSerie;
}

// Ou en est la serie : les victoires des jeux reussis et commences, sur victoiresAttendues.
function victoiresDeLaSerie(parcours, regles = REGLES_DE_SERIE_PAR_DEFAUT) {
  const { aConfirmer, valides, enCours } = complet(parcours);
  if (aConfirmer) return victoiresAttendues(regles);
  const commencees = Object.values(enCours).reduce((somme, jeu) => somme + Math.min(jeu.victoires ?? 0, regles.victoiresParJeu), 0);
  return Math.min(victoiresAttendues(regles), valides.length * regles.victoiresParJeu + commencees);
}

function ajouterGagne(gagnes, ceinture, nom) {
  return { ...gagnes, [ceinture]: [...(gagnes[ceinture] ?? []).filter((autre) => autre !== nom), nom] };
}

// La ceinture visee obtenue. `precedente` : la plus haute confirmee, sinon l'acquise.
function ceintureObtenue(parcours, gagnes, confirmee) {
  const obtenue = parcours.cible;
  return {
    parcours: { ...parcours, ceinture: obtenue, cible: obtenue === CEINTURE_LA_PLUS_HAUTE ? null : obtenue + 1, ...SERIE_A_ZERO, gagnes, precedente: confirmee ? obtenue - 1 : parcours.ceinture },
    evenement: 'ceinture',
  };
}

// Un essai rate de trop : le jeu (ou toute la serie) repart de zero, et peut-etre on redescend.
function reinitialiser(parcours, garde, regles) {
  const reinitialisations = parcours.reinitialisations + 1;
  if (reinitialisations >= regles.reinitialisationsAvantDeRedescendre) {
    const redescendue = Math.max(0, parcours.ceinture - 1);
    return { parcours: { ...parcours, ceinture: redescendue, cible: redescendue + 1, ...SERIE_A_ZERO, precedente: parcours.ceinture }, evenement: 'regression' };
  }
  const suite = regles.reinitialiserTousLesJeux ? { ...parcours, ...SERIE_A_ZERO } : { ...parcours, ...garde };
  return { parcours: { ...suite, reinitialisations }, evenement: 'jeu reinitialise' };
}

const sansCle = (objet, cle) => Object.fromEntries(Object.entries(objet).filter(([autre]) => autre !== cle));

// La suite d'un essai sur un jeu (saab, 2026-10-15 : « quand on fait Nulle, on ajoutera
// une partie en fin de tentatives si on n'a pas réussi ; si c'est encore Nulle c'est
// réussi ») : une nulle est un essai rate ; les essais finis, s'il y a eu au moins une
// nulle (regle `rattrapageSurNulle`), une partie de plus est accordee, une seule —
// gagnee ou nulle, ce sens est reussi ; perdue, le jeu repart de zero. Renvoie { jeu,
// issue : 'gagne' | 'essai rate' | 'rattrapage' | 'reinitialiser' }.
function suiteDUnEssai(jeu, gagne, regles) {
  const nulle = gagne === RESULTAT_NULLE;
  if (jeu.rattrapage === 'accorde') return gagne === true || nulle ? { jeu: { ...jeu, rattrapage: 'joue' }, issue: 'gagne' } : { jeu, issue: 'reinitialiser' };
  if (gagne === true) return { jeu, issue: 'gagne' };
  const nulles = (jeu.nulles ?? 0) + (nulle ? 1 : 0);
  const essai = { ...jeu, echecs: jeu.echecs + 1, ...(nulles > 0 ? { nulles } : {}) };
  if (essai.echecs < regles.essaisAvantReinitialisation) return { jeu: essai, issue: 'essai rate' };
  if (regles.rattrapageSurNulle && nulles > 0 && jeu.rattrapage === undefined) return { jeu: { ...essai, rattrapage: 'accorde' }, issue: 'rattrapage' };
  return { jeu: essai, issue: 'reinitialiser' };
}
const MANCHE_NEUVE = Object.freeze({ aller: false, revanche: false, victoires: 0, echecs: 0 });

// Un jeu de la serie (ceinture visee).
function resultatDeSerie(parcours, nom, sens, gagne, regles) {
  const avant = { ...MANCHE_NEUVE, ...parcours.enCours[nom] };
  if (!placePourUnJeu(parcours, nom, regles) || (regles.revanche && avant[sens])) return null;
  const { jeu, issue } = suiteDUnEssai(avant, gagne, regles);
  if (issue === 'essai rate' || issue === 'rattrapage') return { parcours: { ...parcours, enCours: { ...parcours.enCours, [nom]: jeu } }, evenement: issue };
  if (issue === 'reinitialiser') return reinitialiser(parcours, { enCours: sansCle(parcours.enCours, nom) }, regles);
  const manche = { ...jeu, [sens]: true };
  if (regles.revanche && !(manche.aller && manche.revanche)) return { parcours: { ...parcours, enCours: { ...parcours.enCours, [nom]: manche } }, evenement: 'reste la revanche' };
  const gagnes = ajouterGagne(parcours.gagnes, parcours.cible, nom);
  const victoires = jeu.victoires + 1;
  if (victoires < regles.victoiresParJeu) {
    return { parcours: { ...parcours, gagnes, enCours: { ...parcours.enCours, [nom]: { ...MANCHE_NEUVE, victoires } } }, evenement: 'victoire' };
  }
  const suite = { ...parcours, gagnes, enCours: sansCle(parcours.enCours, nom), valides: [...parcours.valides, nom] };
  if (suite.valides.length < regles.jeuxParSerie) return { parcours: suite, evenement: 'jeu reussi' };
  const aConfirmer = [...new Set([...(suite.aReconfirmer ? [suite.ceinture] : []), ...(regles.confirmation === false ? [] : ceinturesSauteesOuDessous(suite))])];
  if (aConfirmer.length === 0) return ceintureObtenue(suite, gagnes, false);
  const aFaireEnConfirmation = jeuxDesCeinturesAConfirmer(suite, aConfirmer, gagnes, regles);
  const confirmation = { ...suite, enCours: {}, aConfirmer: true, aConfirmerCeintures: aConfirmer, aFaireEnConfirmation, confirmees: confirmeesDOffice(aFaireEnConfirmation) };
  if (ceinturesAConfirmer(confirmation).length === 0) return ceintureObtenue(confirmation, gagnes, true);
  return { parcours: confirmation, evenement: 'confirmation' };
}

// Les jeux a gagner sur chaque ceinture a confirmer qui a des imposes (`regles.imposesDe(ceinture)`,
// moteur/entrainement-lecture.js) : ceux qu'on n'a pas gagnes a la ceinture visee.
function jeuxDesCeinturesAConfirmer({ cible }, aConfirmer, gagnes, regles) {
  const dejaGagnes = gagnes[cible] ?? [];
  return Object.fromEntries(
    aConfirmer
      .filter((autre) => autre < cible && (regles.imposesDe?.(autre) ?? []).length > 0)
      .map((autre) => [autre, regles.imposesDe(autre).filter((nom) => !dejaGagnes.includes(nom))])
  );
}
// Les jeux qu'on peut jouer pour confirmer `ceinture` : ceux qui restent a gagner sur une
// ceinture a jeux imposes, sinon ses `proposes` (un seul gagne suffit).
function jeuxDeConfirmation(parcours, ceinture, proposes) {
  const aFaire = complet(parcours).aFaireEnConfirmation[ceinture];
  if (!aFaire) return proposes;
  const confirmes = complet(parcours).jeuxConfirmes[ceinture] ?? [];
  return aFaire.filter((nom) => !confirmes.includes(nom));
}

// Une ceinture a confirmer dont tout est deja gagne : confirmee d'office.
const confirmeesDOffice = (aFaire) => Object.entries(aFaire).filter(([, noms]) => noms.length === 0).map(([ceinture]) => Number(ceinture));

// Un jeu de confirmation, sur `ceinture`.
function resultatDeConfirmation(parcours, ceinture, nom, sens, gagne, regles) {
  const avecRevanche = regles.revancheDeConfirmation ?? regles.revanche;
  const cle = `${ceinture}|${nom}`;
  const avant = { ...MANCHE_NEUVE, ...parcours.enConfirmation[cle] };
  // Une ceinture a jeux imposes : seulement ceux qui restent a gagner.
  const aFaire = parcours.aFaireEnConfirmation[ceinture];
  const dejaConfirmes = parcours.jeuxConfirmes[ceinture] ?? [];
  if (aFaire && (!aFaire.includes(nom) || dejaConfirmes.includes(nom))) return null;
  if (avecRevanche && avant[sens]) return null;
  const { jeu, issue } = suiteDUnEssai(avant, gagne, regles);
  if (issue === 'essai rate' || issue === 'rattrapage') return { parcours: { ...parcours, enConfirmation: { ...parcours.enConfirmation, [cle]: jeu } }, evenement: issue };
  if (issue === 'reinitialiser') return reinitialiser(parcours, { confirmees: confirmeesDOffice(parcours.aFaireEnConfirmation), enConfirmation: {}, jeuxConfirmes: {} }, regles);
  const manche = { ...jeu, [sens]: true };
  if (avecRevanche && !(manche.aller && manche.revanche)) return { parcours: { ...parcours, enConfirmation: { ...parcours.enConfirmation, [cle]: manche } }, evenement: 'reste la revanche' };
  const gagnes = ajouterGagne(parcours.gagnes, ceinture, nom);
  if (aFaire && aFaire.some((autre) => autre !== nom && !dejaConfirmes.includes(autre))) {
    const jeuxConfirmes = { ...parcours.jeuxConfirmes, [ceinture]: [...dejaConfirmes, nom] };
    return { parcours: { ...parcours, gagnes, enConfirmation: sansCle(parcours.enConfirmation, cle), jeuxConfirmes }, evenement: 'jeu reussi' };
  }
  const enConfirmation = Object.fromEntries(Object.entries(parcours.enConfirmation).filter(([autre]) => !autre.startsWith(`${ceinture}|`)));
  const suite = { ...parcours, gagnes, enConfirmation, confirmees: [...parcours.confirmees, ceinture] };
  if (ceinturesAConfirmer(suite).length > 0) return { parcours: suite, evenement: 'ceinture confirmee' };
  return ceintureObtenue(suite, gagnes, true);
}

// Le resultat d'un jeu de `ceinture` (`nom` : la variante ou le puzzle ; `sens` :
// 'aller' ou 'revanche') : { parcours, evenement } — evenement : 'refuse' (ce jeu
// ne compte pas maintenant), 'reste la revanche' (ou l'aller), 'victoire', 'jeu
// reussi', 'confirmation' (place aux confirmations), 'ceinture confirmee', 'ceinture'
// (obtenue), 'essai rate', 'rattrapage' (une partie de plus, suiteDUnEssai), 'jeu
// reinitialise', 'regression'. `gagne` : vrai, faux, ou RESULTAT_NULLE. `contexte` : { date,
// derniereActivite } (ms) — le jeu, et le dernier joue avant lui a ce grade ou plus haut.
function apresUnResultat(parcours, ceinture, nom, sens, gagne, regles = REGLES_DE_SERIE_PAR_DEFAUT, { date, derniereActivite } = {}) {
  const refuse = { parcours, evenement: 'refuse' };
  if (!ceinturesJouables(parcours).includes(ceinture) || !SENS_DU_JEU.includes(sens)) return refuse;
  const pause = !parcours.aConfirmer && Number.isFinite(derniereActivite) && date - derniereActivite > (regles.joursAvantReconfirmation ?? Infinity) * MS_PAR_JOUR;
  const entier = { ...complet(parcours), ...(pause ? { aReconfirmer: true } : {}) };
  const issue = entier.aConfirmer ? resultatDeConfirmation(entier, ceinture, nom, sens, gagne, regles) : resultatDeSerie(entier, nom, sens, gagne, regles);
  return issue ?? refuse;
}

// Les JOURS RESTANTS avant de devoir reconfirmer son grade (saab, 2026-10-17 : « une
// alerte pour le temps restant sur ceinture ») : la regle « Jours sans jouer » (`jours`),
// depuis le dernier jeu a ce grade ou plus haut (`derniereDate`, en ms) ; 0 si c'est deja
// depasse ; null s'il n'y a rien a garder (pas encore de ceinture, deja a reconfirmer,
// jamais joue, ou regle decochee).
function joursAvantReconfirmation(parcours, derniereDate, maintenant, jours) {
  if (!(parcours.ceinture > 0) || parcours.aConfirmer || !Number.isFinite(derniereDate) || !Number.isFinite(jours)) return null;
  return Math.max(0, Math.ceil(jours - (maintenant - derniereDate) / MS_PAR_JOUR));
}

// Les NOUVEAUX JEUX A VALIDER (saab, 2026-10-17 : « si je rajoute des PZL, il faudra les
// valider dans la plus haute ceinture réussie ») : les `actuels` (les jeux des ceintures
// deja acquises) que le parcours ne connaissait pas — aucun tant qu'il n'a rien retenu
// (`jeuxConnus` : retenus a la premiere ouverture, puis chaque jeu valide en gagnant).
function nouveauxJeuxAValider(parcours, actuels) {
  if (!Array.isArray(parcours.jeuxConnus)) return [];
  return actuels.filter((nom) => !parcours.jeuxConnus.includes(nom));
}

const avecDesJeuxConnus = (parcours, noms) => ({ ...parcours, jeuxConnus: [...new Set([...(parcours.jeuxConnus ?? []), ...noms])] });
