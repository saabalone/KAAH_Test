// Les REGLAGES du mode Entrainement (phase 36 ; saab, 2026-10-08 : « la
// possibilité de changer les réglages des ceintures, pendules, et autres options »)
// : les valeurs de depart (le profil d'Entrainement, moteur/entrainement-profil.js, en
// fait des lignes a cocher), et, grade par grade, les pendules d'une partie — par
// defaut ceux de saab : « (ceinture 1 et 2) IA 5:00 pas de bonus, Joueur 15:00 Bonus
// 2s eject 2s ; (ceinture 3 et 4) Joueur 10:00 Bonus 2s eject 2s ; (ceinture 5)
// Joueur 10:00 Delay 2s ; (ceinture 6) Joueur 7:00 Delay 2s ; (ceinture 7) Joueur
// 5:00 Delay 2s (si IA perd au tps, ajouter 1mn sur sa partie suivante de même
// couleur) ». Les Dans (2026-10-09) : la machine au niveau 8, « pas de limite de tps
// ni d'élagage pour IA, seulement pour le joueur », dont le temps baisse ; la serie
// sur 2 puis 3 variantes (blanche et rouge), un handicap (rouge) ; en PZL, un temps
// par puzzle et, pour la rouge, pas d'Annuler. La pendule des PZL a ses reglages a elle
// (saab, 2026-10-10 : « ajouter un réglage pendule pour les PZL, qu'on puisse le changer
// par rapport à Variante ») : au depart, le temps seul, sans bonus ni delai.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : REGLES_DE_SERIE_PAR_DEFAUT,
// CEINTURES (moteur/entrainement.js), TEMPS_SANS_LIMITE_S (moteur/pendules.js),
// lirePosition, ecrirePosition
// (moteur/notation.js) viennent de fichiers charges avant celui-ci.

const SECONDES_PAR_MINUTE = 60;
const TEMPS_DE_LA_MACHINE_S = 5 * SECONDES_PAR_MINUTE;
const BONUS_DU_JOUEUR_S = 2;
// L'elagage de la machine d'une ceinture (saab, 2026-10-11 : « IAn el 1+n, comme ça
// IA1el2 aura quand même 2 coups ») : son niveau, plus 1 — a chaque position, elle ne
// cherche que ce nombre de coups (ses meilleurs juste apres le coup).
const ELAGAGE_EN_PLUS_DU_NIVEAU = 1;
const REFLEXION_DE_LA_MACHINE_S = 30;
// « Sans limite » (moteur/pendules.js).
const SECONDES_SANS_LIMITE = TEMPS_SANS_LIMITE_S;
// Les jeux proposes par grade (saab, 2026-10-10 : « ça nous propose un choix de 2
// Variante/PZL ... on choisit une des 3 ») : 3 tires au hasard, parmi tous au depart.
const JEUX_PROPOSES = 3;
// A partir du 6e Dan (la serie sur 2, puis 3 variantes), une reinitialisation remet
// toute la serie a zero (saab : « par ex pour les ceintures élevées »).
const DAN_DE_LA_SERIE_ENTIERE = 6;

// Par grade : [mode, minutes du joueur, niveau de la machine, jeux par serie (null :
// ceux de la serie), handicap, minutes par PZL (null : sans limite), Annuler,
// reflexion de la machine (s)]. A partir du 1er Dan, la machine joue sans limite
// de temps ni elagage.
const GRADES_DE_DEPART = [
  ['bonus', 15, 1], ['bonus', 15, 2], ['bonus', 10, 3], ['bonus', 10, 4], ['delai', 10, 5], ['delai', 7, 6],
  ['delai', 5, 8], ['delai', 4.5, 8], ['delai', 4, 8], ['delai', 3.5, 8, null, 0, 3], ['delai', 3, 8, null, 0, 2],
  ['delai', 3, 8, 2, 0, 2], ['delai', 3, 8, 3, 0, 1.5], ['delai', 3, 8, 3, 0, 1],
  ['delai', 2.5, 8, null, 1, 1, false, 60], ['delai', 2.5, 8, null, 2, 1, false, 60],
];

function gradeDeDepart([mode, minutes, niveau, jeuxParSerie = null, handicap = 0, minutesPzl = null, annuler = true, reflexion = REFLEXION_DE_LA_MACHINE_S], grade) {
  const dan = Boolean(CEINTURES[grade].dan);
  return {
    niveau,
    ia: { tempsInitial: TEMPS_DE_LA_MACHINE_S, sansLimite: dan, elagage: dan ? 0 : niveau + ELAGAGE_EN_PLUS_DU_NIVEAU, reflexion },
    joueur: { mode, tempsInitial: minutes * SECONDES_PAR_MINUTE, bonusParCoup: BONUS_DU_JOUEUR_S, bonusParEjection: BONUS_DU_JOUEUR_S, delai: BONUS_DU_JOUEUR_S },
    jeuxParSerie,
    // Saab : « 1 aller/retour suffit », puis « on met tout à 1 par défaut » (Dans compris).
    victoiresParJeu: REGLES_DE_SERIE_PAR_DEFAUT.victoiresParJeu,
    handicap,
    pzlTemps: minutesPzl === null ? null : minutesPzl * SECONDES_PAR_MINUTE,
    pzlPendule: { mode: 'bonus', bonusParCoup: 0, bonusParEjection: 0, delai: 0 },
    annuler,
    reinitialiserTout: (CEINTURES[grade].dan ?? 0) >= DAN_DE_LA_SERIE_ENTIERE,
    variantes: null,
    variantesProposees: JEUX_PROPOSES,
    pzl: null,
    pzlProposes: JEUX_PROPOSES,
  };
}

// Au-dela de cette reflexion, le coup de la machine attend le clic du joueur (saab,
// 2026-10-14 : « si le joueur n'est pas là quand IA a joué, il ne faut pas que la pendule
// du joueur décompte »).
const REFLEXION_AVANT_D_ATTENDRE_LE_JOUEUR_S = 10;

const REGLAGES_ENTRAINEMENT_PAR_DEFAUT = Object.freeze({
  serie: REGLES_DE_SERIE_PAR_DEFAUT,
  pausesMax: 3,
  attenteDuCoupS: REFLEXION_AVANT_D_ATTENDRE_LE_JOUEUR_S,
  supplementIAApresTemps: SECONDES_PAR_MINUTE,
  ceintures: GRADES_DE_DEPART.map(gradeDeDepart),
});

const tempsDeLaMachine = (ia, supplement) => (ia.sansLimite ? SECONDES_SANS_LIMITE : ia.tempsInitial + supplement);

// La pendule d'un joueur dans son mode (moteur/pendules.js) : le bonus n'existe qu'en
// mode Bonus, le delai qu'en mode Délai.
function pendulesDansLeMode({ mode, tempsInitial, bonusParCoup, bonusParEjection, delai }) {
  const bonus = mode === 'bonus';
  return { tempsInitial, bonusParCoup: bonus ? bonusParCoup : 0, bonusParEjection: bonus ? bonusParEjection : 0, delai: bonus ? 0 : delai };
}
const pendulesDeLaMachine = (tempsInitial) => ({ tempsInitial, bonusParCoup: 0, bonusParEjection: 0, delai: 0 });

// Les reglages de pendule d'une partie de `ceinture` (moteur/pendules.js, camps) :
// le joueur dans le mode de son grade, la machine sans bonus ni delai, avec son
// `supplement` (secondes : une partie perdue au temps), ou sans limite.
function pendulesDeLaCeinture(reglages, ceinture, campDuJoueur, supplement = 0) {
  const { ia, joueur } = reglages.ceintures[ceinture];
  const siens = pendulesDansLeMode(joueur);
  const machine = pendulesDeLaMachine(tempsDeLaMachine(ia, supplement));
  const campMachine = campDuJoueur === 'noir' ? 'blanc' : 'noir';
  return { mode: 'pendule', modeChoisi: joueur.mode, ...siens, camps: { [campDuJoueur]: siens, [campMachine]: machine } };
}

// Les pendules d'un PZL de `grade` : le temps du joueur pour tout le puzzle, dans le
// mode de la pendule des PZL (son bonus ou son delai), la machine sans limite ; null
// sans temps limite (les pendules ordinaires).
function pendulesDuPuzzle(reglages, grade, campDuJoueur) {
  const { pzlTemps: temps, pzlPendule } = reglages.ceintures[grade];
  if (temps === null || temps === undefined) return null;
  const siens = pendulesDansLeMode({ ...pzlPendule, tempsInitial: temps });
  const campMachine = campDuJoueur === 'noir' ? 'blanc' : 'noir';
  return { mode: 'pendule', modeChoisi: pzlPendule.mode, ...siens, camps: { [campDuJoueur]: siens, [campMachine]: pendulesDeLaMachine(SECONDES_SANS_LIMITE) } };
}

// Le handicap (les ceintures rouges) : le compteur d'ejection du joueur part de
// `billes` de plus, ses billes restent sur le plateau — comme les variantes
// « handi_score » de KAAWA (CLAUDE.md : la victoire se lit sur le compteur).
function positionAvecHandicap(texteBrut, camp, billes) {
  if (!billes) return texteBrut;
  const etat = lirePosition(texteBrut);
  const cle = camp === 'noir' ? 'billesEjecteesNoires' : 'billesEjecteesBlanches';
  return ecrirePosition({ ...etat, [cle]: etat[cle] + billes });
}

const minutesSecondes = (secondes) => `${Math.floor(secondes / SECONDES_PAR_MINUTE)}:${String(secondes % SECONDES_PAR_MINUTE).padStart(2, '0')}`;

// « 15:00 +2 s, +2 s par éjection », « 7:00, délai 2 s » : la pendule d'un joueur.
function libelleDeLaPendule({ mode, tempsInitial, bonusParCoup, bonusParEjection, delai }) {
  let texte = minutesSecondes(tempsInitial);
  if (mode === 'bonus') {
    if (bonusParCoup) texte += ` +${bonusParCoup} s`;
    if (bonusParEjection) texte += `, +${bonusParEjection} s par éjection`;
  } else if (delai) texte += `, délai ${delai} s`;
  return texte;
}

// « Vous 15:00 +2 s, +2 s par éjection · IA 5:00 » : le tableau des grades.
function libelleDesPendules(reglages, ceinture) {
  const { ia, joueur } = reglages.ceintures[ceinture];
  return `Vous ${libelleDeLaPendule(joueur)} · IA ${ia.sansLimite ? 'sans limite' : minutesSecondes(ia.tempsInitial)}`;
}

// « Par PZL : 3:00, délai 2 s » ; rien sans temps limite.
function libelleDesPendulesDuPuzzle(reglages, grade) {
  const { pzlTemps, pzlPendule } = reglages.ceintures[grade];
  return pzlTemps ? `Par PZL : ${libelleDeLaPendule({ ...pzlPendule, tempsInitial: pzlTemps })}` : '';
}
