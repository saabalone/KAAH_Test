// La SERIE du mode Ceinture (phase 36 ; regle revue avec saab le 2026-10-10) : ce
// qu'il faut gagner pour obtenir la ceinture visee. Pur : interface/entrainement*.js
// propose les jeux, lance les parties et range les parcours (un par joueur).
//
// LA REGLE :
//   - on a une ceinture (aucune au depart : la blanche se gagne aussi — saab, 2026-10-22 :
//     « change la Blanche qu'on puisse la tester ») et on en vise une plus haute — la
//     suivante, ou plus loin (« on peut sauter des niveaux ») ; une fois obtenue, la
//     blanche ne se perd plus ;
//   - une VICTOIRE = un jeu gagne a l'aller ET a la revanche (couleurs echangees,
//     ou Attaque puis Defense en PZL) ; un jeu est REUSSI a `victoiresParJeu`
//     victoires, et le reste (« on garde v1 comme réussie ») ; la serie est complete
//     a `jeuxParSerie` jeux reussis ;
//   - une defaite est un ESSAI RATE sur ce jeu, le reste est garde ; au bout de
//     `essaisAvantReinitialisation`, le jeu repart de zero (ou toute la serie,
//     `reinitialiserTousLesJeux`) ; au bout de `reinitialisationsAvantLEchec`
//     reinitialisations, c'est l'ECHEC de la ceinture visee : sa serie repart de zero, on
//     garde sa ceinture (saab, 2026-11-06 : « Oui, ECHEC suffit » ; avant, on redescendait) ;
//   - puis la CONFIRMATION : une victoire sur chaque ceinture sautee (saab : « il faut
//     valider toutes les ceintures sautées »), ou, sans saut, sur celle d'en dessous ;
//     une ceinture a confirmer qui a des jeux imposes (sautee, ou celle d'en dessous) se
//     confirme par ceux qu'on n'a pas encore reussis AU-DESSUS d'elle (saab, 2026-10-23 : « ce qui
//     est réussi au-dessus est validé en dessous » — a la visee, a une ceinture confirmee en
//     route, ou lors d'une tentative d'avant), tous (saab, 2026-10-18 :
//     « faire jouer seulement celles qui diffèrent ... donc on fait la B » ; « si on saute de
//     Blanche à Jaune, on devra confirmer tous ceux de Blanche, car Jaune fait les
//     complémentaires ») — tous deja gagnes : confirmee d'office ;
//   - apres une pause de plus de `joursAvantRegression` jours sans jouer a son grade ou
//     plus haut, on REDESCEND d'une ceinture, une seule fois pour une meme pause, et la
//     ceinture perdue devient la visee (regressionApresUnePause).
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
  reinitialisationsAvantLEchec: 3,
  // Saab, 2026-11-06 : « on va laisser plus de temps pour la régression si pas joué, on met 90 jours » (30 avant).
  joursAvantRegression: 90,
  rattrapageSurNulle: true,
});
const MS_PAR_JOUR = 24 * 60 * 60 * 1000;
const SENS_DU_JEU = ['aller', 'revanche'];
// `aConfirmerCeintures` : les ceintures a confirmer, fixees quand la serie est complete ;
// `aFaireEnConfirmation` : { ceinture a confirmer : les jeux imposes a y gagner } (voir
// plus haut), fixes eux aussi ; `jeuxConfirmes` : { ceinture : ceux deja gagnes }.
const SERIE_A_ZERO = Object.freeze({ enCours: {}, valides: [], reinitialisations: 0, aConfirmer: false, confirmees: [], enConfirmation: {}, aConfirmerCeintures: [], aFaireEnConfirmation: {}, jeuxConfirmes: {} });

// Pas encore de ceinture (au depart) : la blanche est la premiere a viser.
const SANS_CEINTURE = -1;
const CEINTURE_BLANCHE = 0;

// `precedente` (le petit rond de l'icone) : la ceinture d'avant la derniere obtenue
// ou perdue, null au depart (ou sans ceinture avant).
function parcoursNeuf() {
  return { ceinture: SANS_CEINTURE, cible: CEINTURE_BLANCHE, ...SERIE_A_ZERO, gagnes: {}, precedente: null };
}

// Un parcours d'avant le 2026-10-22 partait de la blanche donnee : s'il n'a rien commence
// au-dela (la jaune visee, aucune serie, aucun jeu gagne, jamais redescendu), il repart
// sans ceinture — la blanche a gagner ; sinon il reste tel quel.
function parcoursAJour(parcours) {
  const entier = complet(parcours);
  const blancheDonnee = entier.ceinture === CEINTURE_BLANCHE && entier.cible === CEINTURE_BLANCHE + 1 && entier.precedente === null;
  const rienCommence = Object.keys(entier.enCours).length === 0 && entier.valides.length === 0 && !entier.aConfirmer && Object.keys(entier.gagnes ?? {}).length === 0;
  return blancheDonnee && rienCommence ? { ...parcours, ceinture: SANS_CEINTURE, cible: CEINTURE_BLANCHE } : parcours;
}

// Un parcours enregistre avant le 2026-10-10 n'a pas tous les champs.
const complet = (parcours) => ({ ...SERIE_A_ZERO, ...parcours });

// La serie de la ceinture visee : les champs de SERIE_A_ZERO.
const serieDuParcours = (parcours) => Object.fromEntries(Object.keys(SERIE_A_ZERO).map((cle) => [cle, parcours[cle] ?? SERIE_A_ZERO[cle]]));

// Viser `cible` (plus haute que la ceinture acquise ; saab, 2026-10-31 : « si je vise une autre ceinture alors que je
// n'ai pas terminé celle où j'étais, et que je reviens ... le compteur de visée est à 0 ... il faut tjs conserver ceux
// qu'on a fait ») : la serie de la ceinture quittee est gardee (`seriesGardees`) ; celle de `cible` revient si on
// l'avait commencee, sinon elle part de zero.
function viserCeinture(parcours, cible) {
  if (!Number.isInteger(cible) || cible <= parcours.ceinture || cible > CEINTURE_LA_PLUS_HAUTE || cible === parcours.cible) return parcours;
  const gardees = { ...parcours.seriesGardees, ...(parcours.cible === null ? {} : { [parcours.cible]: serieDuParcours(parcours) }) };
  return { ...parcours, cible, ...SERIE_A_ZERO, ...gardees[cible], seriesGardees: sansCle(gardees, String(cible)) };
}

// Les ceintures a confirmer encore : les sautees, ou celle d'en dessous.
function ceinturesSauteesOuDessous({ ceinture, cible }) {
  const toutes = cible === ceinture + 1 ? [ceinture] : Array.from({ length: cible - ceinture - 1 }, (_, i) => ceinture + 1 + i);
  return toutes.filter((grade) => grade !== SANS_CEINTURE); // sans ceinture : rien en dessous
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

// La ceinture visee obtenue. `precedente` : la plus haute confirmee, sinon l'acquise. La serie gardee de la suivante
// (viserCeinture) revient ; celles d'en dessous ne servent plus.
function ceintureObtenue(parcours, gagnes, confirmee) {
  const obtenue = parcours.cible;
  const cible = obtenue === CEINTURE_LA_PLUS_HAUTE ? null : obtenue + 1;
  const gardees = Object.fromEntries(Object.entries(parcours.seriesGardees ?? {}).filter(([autre]) => Number(autre) > obtenue));
  return {
    parcours: { ...parcours, ceinture: obtenue, cible, ...SERIE_A_ZERO, ...gardees[cible], seriesGardees: sansCle(gardees, String(cible)), gagnes, precedente: confirmee ? obtenue - 1 : parcours.ceinture === SANS_CEINTURE ? null : parcours.ceinture },
    evenement: 'ceinture',
  };
}

// Un essai rate de trop : le jeu (ou toute la serie) repart de zero ; trop de fois, c'est l'ECHEC de la ceinture
// visee (saab, 2026-11-06 : « ce n'est pas vraiment une régression c'est juste un ECHEC car je dois juste retenter
// la Noire 4 ») : sa serie repart de zero, la ceinture acquise reste.
function reinitialiser(parcours, garde, regles) {
  const reinitialisations = parcours.reinitialisations + 1;
  if (reinitialisations >= regles.reinitialisationsAvantLEchec) return { parcours: { ...parcours, ...SERIE_A_ZERO }, evenement: 'echec' };
  const suite = regles.reinitialiserTousLesJeux ? { ...parcours, ...SERIE_A_ZERO } : { ...parcours, ...garde };
  return { parcours: { ...suite, reinitialisations }, evenement: 'jeu reinitialise' };
}

// La REGRESSION apres une pause (saab, 2026-11-06 : « on met 90 jours et on ne régresse qu'une fois, si le joueur a duré
// trop longtemps (180 jours ou plus) sans jouer il n'aura à refaire que celle où il a régressé pour retenter celle qu'il a
// perdue ») : plus de `jours` jours depuis son dernier jeu a son grade ou plus haut (`derniereDate`, ms), on redescend d'une
// ceinture et la perdue devient la visee ; la serie qu'on visait est gardee pour plus tard (viserCeinture). Une seule fois
// pour une meme pause (`pauseRegressee` : la date de ce dernier jeu), et la blanche ne se perd pas.
function regressionApresUnePause(parcours, derniereDate, maintenant, jours) {
  if (!(parcours.ceinture > CEINTURE_BLANCHE) || !Number.isFinite(derniereDate) || !Number.isFinite(jours)) return parcours;
  if (maintenant - derniereDate <= jours * MS_PAR_JOUR || parcours.pauseRegressee === derniereDate) return parcours;
  const perdue = parcours.ceinture;
  const gardees = { ...parcours.seriesGardees, ...(parcours.cible === null ? {} : { [parcours.cible]: serieDuParcours(parcours) }) };
  return { ...parcours, ceinture: perdue - 1, cible: perdue, ...SERIE_A_ZERO, ...gardees[perdue], seriesGardees: sansCle(gardees, String(perdue)), precedente: perdue, pauseRegressee: derniereDate };
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
  const aConfirmer = regles.confirmation === false ? [] : ceinturesSauteesOuDessous(suite);
  if (aConfirmer.length === 0) return ceintureObtenue(suite, gagnes, false);
  const aFaireEnConfirmation = jeuxDesCeinturesAConfirmer(suite, aConfirmer, gagnes, regles);
  const confirmation = { ...suite, enCours: {}, aConfirmer: true, aConfirmerCeintures: aConfirmer, aFaireEnConfirmation, confirmees: confirmeesDOffice(aFaireEnConfirmation) };
  if (ceinturesAConfirmer(confirmation).length === 0) return ceintureObtenue(confirmation, gagnes, true);
  return { parcours: confirmation, evenement: 'confirmation' };
}

// Les jeux reussis au-dessus de `ceinture` (saab, 2026-10-23 : « ce qui est réussi au-dessus est
// validé en dessous, ça reste logique et ça allège ») : a la visee, a une ceinture confirmee en
// route, ou lors d'une tentative d'avant.
const gagnesAuDessus = (gagnes, ceinture) => Object.entries(gagnes ?? {}).filter(([autre]) => Number(autre) > ceinture).flatMap(([, noms]) => noms);

// Les jeux a gagner sur chaque ceinture a confirmer qui a des imposes (`regles.imposesDe(ceinture)`,
// moteur/entrainement-lecture.js) : ceux qu'on n'a pas encore reussis au-dessus d'elle.
function jeuxDesCeinturesAConfirmer({ cible }, aConfirmer, gagnes, regles) {
  return Object.fromEntries(
    aConfirmer
      .filter((autre) => autre < cible && (regles.imposesDe?.(autre) ?? []).length > 0)
      .map((autre) => [autre, regles.imposesDe(autre).filter((nom) => !gagnesAuDessus(gagnes, autre).includes(nom))])
  );
}
// Ce qui reste a gagner pour confirmer `ceinture` (une ceinture a jeux imposes) : ni deja confirme
// la, ni reussi au-dessus depuis ; null sans jeux imposes.
function resteAConfirmer(parcours, ceinture) {
  const entier = complet(parcours);
  const aFaire = entier.aFaireEnConfirmation[ceinture];
  if (!aFaire) return null;
  const faits = [...(entier.jeuxConfirmes[ceinture] ?? []), ...gagnesAuDessus(entier.gagnes, ceinture)];
  return aFaire.filter((nom) => !faits.includes(nom));
}
// Les jeux qu'on peut jouer pour confirmer `ceinture` : ceux qui restent a gagner sur une
// ceinture a jeux imposes, sinon ses `proposes` (un seul gagne suffit).
function jeuxDeConfirmation(parcours, ceinture, proposes) {
  return resteAConfirmer(parcours, ceinture) ?? proposes;
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
  if (aFaire && !resteAConfirmer(parcours, ceinture).includes(nom)) return null;
  if (avecRevanche && avant[sens]) return null;
  const { jeu, issue } = suiteDUnEssai(avant, gagne, regles);
  if (issue === 'essai rate' || issue === 'rattrapage') return { parcours: { ...parcours, enConfirmation: { ...parcours.enConfirmation, [cle]: jeu } }, evenement: issue };
  if (issue === 'reinitialiser') return reinitialiser(parcours, { confirmees: confirmeesDOffice(parcours.aFaireEnConfirmation), enConfirmation: {}, jeuxConfirmes: {} }, regles);
  const manche = { ...jeu, [sens]: true };
  if (avecRevanche && !(manche.aller && manche.revanche)) return { parcours: { ...parcours, enConfirmation: { ...parcours.enConfirmation, [cle]: manche } }, evenement: 'reste la revanche' };
  const gagnes = ajouterGagne(parcours.gagnes, ceinture, nom);
  const jeuxConfirmes = aFaire ? { ...parcours.jeuxConfirmes, [ceinture]: [...dejaConfirmes, nom] } : parcours.jeuxConfirmes;
  const avecLeJeu = { ...parcours, gagnes, jeuxConfirmes, enConfirmation: sansCle(parcours.enConfirmation, cle) };
  // Confirmees maintenant : celle du jeu (sans imposes, un jeu gagne suffit ; sinon tous les siens),
  // et celles du dessous dont tout est desormais reussi au-dessus.
  const finie = (autre) => (autre === ceinture && !aFaire) || resteAConfirmer(avecLeJeu, autre)?.length === 0;
  const nouvelles = ceinturesAConfirmer(avecLeJeu).filter(finie);
  if (nouvelles.length === 0) return { parcours: avecLeJeu, evenement: 'jeu reussi' };
  const enConfirmation = Object.fromEntries(Object.entries(avecLeJeu.enConfirmation).filter(([autre]) => !nouvelles.some((confirmee) => autre.startsWith(`${confirmee}|`))));
  const suite = { ...avecLeJeu, enConfirmation, confirmees: [...parcours.confirmees, ...nouvelles] };
  if (ceinturesAConfirmer(suite).length > 0) return { parcours: suite, evenement: 'ceinture confirmee' };
  return ceintureObtenue(suite, gagnes, true);
}

// Le resultat d'un jeu de `ceinture` (`nom` : la variante ou le puzzle ; `sens` :
// 'aller' ou 'revanche') : { parcours, evenement } — evenement : 'refuse' (ce jeu
// ne compte pas maintenant), 'reste la revanche' (ou l'aller), 'victoire', 'jeu
// reussi', 'confirmation' (place aux confirmations), 'ceinture confirmee', 'ceinture'
// (obtenue), 'essai rate', 'rattrapage' (une partie de plus, suiteDUnEssai), 'jeu
// reinitialise', 'echec' (la serie visee repart de zero). `gagne` : vrai, faux, ou RESULTAT_NULLE.
function apresUnResultat(parcours, ceinture, nom, sens, gagne, regles = REGLES_DE_SERIE_PAR_DEFAUT) {
  const refuse = { parcours, evenement: 'refuse' };
  if (!ceinturesJouables(parcours).includes(ceinture) || !SENS_DU_JEU.includes(sens)) return refuse;
  const entier = complet(parcours);
  const issue = entier.aConfirmer ? resultatDeConfirmation(entier, ceinture, nom, sens, gagne, regles) : resultatDeSerie(entier, nom, sens, gagne, regles);
  return issue ?? refuse;
}

// Les JOURS RESTANTS avant de redescendre (saab, 2026-10-17 : « une alerte pour le temps
// restant sur ceinture ») : la regle « Jours sans jouer » (`jours`), depuis le dernier jeu a
// ce grade ou plus haut (`derniereDate`, en ms) ; 0 si c'est deja depasse ; null s'il n'y a
// rien a perdre (la blanche ou pas de ceinture, deja redescendu pour cette pause, jamais
// joue, ou regle decochee).
function joursAvantLaRegression(parcours, derniereDate, maintenant, jours) {
  if (!(parcours.ceinture > CEINTURE_BLANCHE) || !Number.isFinite(derniereDate) || !Number.isFinite(jours) || parcours.pauseRegressee === derniereDate) return null;
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
