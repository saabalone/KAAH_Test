// Les AJOUTS a l'evaluation, a mettre ou non sur n'importe quelle version
// (saab, 2026-10-07 : « on devrait pouvoir ajouter ces reglages sur toutes les
// versions precedentes, donc plutot un suffixe » ; « que les reglages soient le
// plus modulables possible ... quand ca va pas on decoche »). Un profil a un
// ajout s'il a son poids (moteur/ia.js, lireMachine) ; le nom de sa machine en
// porte le suffixe, apres l'elagage (KAI++7_Nor_30s_v4el10svec).
//   - sv : le sumito vide (moteur/ia-sumito-vide.js) ;
//   - ec, ea : l'etendue, par le centre et par les cases (moteur/ia-etendue.js) ;
//   - da : l'etendue multipliee par reference / billes adverses ;
//   - er : l'elagage de la recherche (KAI++ seulement) classe les premiers coups
//     par une courte recherche de er demi-coups (2 : apres la reponse adverse ;
//     3 : et apres son coup suivant) — saab, 2026-10-08 ;
//   - es : le meme classement (apres la reponse adverse) pour les coups suivants
//     de celui qui cherche, jusqu'a cette distance de la racine (2 : son coup d'apres) ;
//   - ep : la profondeur de l'etendue, en coups (absente : 4) — saab, 2026-10-08 ;
//   - ef : l'elagage coupe en fin de partie (KAI++ seulement) : des qu'un camp a
//     ef billes ejectees, plus d'elagage — saab, 2026-10-08 (les puzzles jamais
//     resolus l'etaient presque tous sans elagage) ;
//   - fn : ef seulement jusqu'a ce niveau (0 : a tous) — saab, 2026-10-08 : au
//     niveau 8, sans elagage en fin de partie, la profondeur 8 ne finit plus en 30 s ;
//   - gf, pf : le gain et la perte selon le score, progressifs (1, 2, 3, 5, 8 fois le
//     premier terme pour les ejections 1 a 5) plutot que lineaires — saab, 2026-10-14
//     (moteur/ia-evaluation-v3.js, version 3 et plus) ;
//   - Ppa, Ppm : le piege progressif, des billes adverses et des siennes (1, 2, 3, 5, 8
//     fois le premier terme) ; Pga, Pgm : le piege gagnant, quand l'ejection suivante
//     finit la partie — saab, 2026-10-16 (moteur/ia-evaluation-v4.js, version 4 et plus).
// `terme` : il a sa colonne (Essai, panneaux) ; da, ep, gf, pf et ceux du piege n'en ont pas, ils changent d'autres termes.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : STYLES_IA, STYLES_IA_V2
// (ia-evaluation.js, ia-evaluation-v2.js), termeDuSumitoVide
// (ia-sumito-vide.js), termesDeLEtendue, PROFONDEUR_D_ETENDUE_PAR_DEFAUT (ia-etendue.js) viennent de fichiers
// charges avant celui-ci.

const OPTIONS_IA = [
  { cle: 'sumitoVide', suffixe: 'Sv', terme: true },
  { cle: 'etendueCentre', suffixe: 'Ec', terme: true },
  { cle: 'etendueCases', suffixe: 'Ea', terme: true },
  { cle: 'etendueReference', suffixe: 'Da', terme: false },
  { cle: 'elagageReponse', suffixe: 'Er', terme: false },
  { cle: 'elagageSuite', suffixe: 'Es', terme: false },
  { cle: 'etendueProfondeur', suffixe: 'Ep', terme: false },
  { cle: 'elagageFin', suffixe: 'Ef', terme: false },
  { cle: 'elagageFinNiveau', suffixe: 'Fn', terme: false },
  { cle: 'gainFibonacci', suffixe: 'Gf', terme: false },
  { cle: 'perteFibonacci', suffixe: 'Pf', terme: false },
  { cle: 'piegeProgressifAdverse', suffixe: 'Ppa', terme: false },
  { cle: 'piegeProgressifMien', suffixe: 'Ppm', terme: false },
  { cle: 'piegeGagnantAdverse', suffixe: 'Pga', terme: false },
  { cle: 'piegeGagnantMien', suffixe: 'Pgm', terme: false },
];
// Chaque suffixe avec sa majuscule (saab, 2026-10-16 : « v5elecef est un peu confus, il
// vaudrait mieux repérer chaque suffixe par une majuscule, v5ElEcEf »).
const CLES_OPTIONS_IA = OPTIONS_IA.map((option) => option.cle);

// Le code du jeu d'ajouts d'un profil (« SvEcEf ») ; '' sans ajout. Son numero Pn :
// moteur/noms-ia.js.
const codeDesAjouts = (poids) => OPTIONS_IA.filter((option) => option.cle in poids).map((option) => option.suffixe).join('');
const CLES_TERMES_OPTIONS_IA = OPTIONS_IA.filter((option) => option.terme).map((option) => option.cle);

// Le poids propose quand on coche un ajout (une base, saab : « ceux par defaut
// sont juste une base a ameliorer ») : le sumito vide annule un sumito de la
// version 2 ; une case de l'etendue vaut le Centre du style ; la moitie de la
// valeur d'une case ; 14 billes de reference (1 au debut de la partie) ; les
// premiers coups classes apres la reponse adverse et son propre coup suivant ;
// l'etendue sur 4 coups, comme sans ep ; plus d'elagage des 4 billes ejectees d'un
// camp ; jusqu'au niveau 6 (au niveau 6, la profondeur finit encore en 30 s).
const PART_DES_CASES_ETENDUE = 0.5;
const BILLES_DE_REFERENCE_ETENDUE = 14;
const DISTANCE_ELAGAGE_PAR_REPONSE = 3;
const DISTANCE_ELAGAGE_SUITE = 2;
const EJECTIONS_SANS_ELAGAGE_PROPOSEES = 4;
const NIVEAU_MAX_SANS_ELAGAGE_EN_FIN_PROPOSE = 6;
// Le premier terme du score progressif (saab : « le 1er terme Fb, +10 »).
const PREMIER_TERME_DU_SCORE_PROGRESSIF = 10;
// Le premier terme du piege progressif, et ce que vaut une bille piegee quand sa perte
// finirait la partie (une base a regler, saab : « ceux par défaut sont juste une base »).
const PREMIER_TERME_DU_PIEGE_PROGRESSIF = 20;
const PIEGE_GAGNANT_PROPOSE = 500;
const POIDS_PROPOSES_OPTIONS_IA = Object.fromEntries(
  Object.keys(STYLES_IA).map((style) => [
    style,
    { sumitoVide: -STYLES_IA_V2[style].sumito, etendueCentre: STYLES_IA[style].centre, etendueCases: PART_DES_CASES_ETENDUE, etendueReference: BILLES_DE_REFERENCE_ETENDUE, elagageReponse: DISTANCE_ELAGAGE_PAR_REPONSE, elagageSuite: DISTANCE_ELAGAGE_SUITE, etendueProfondeur: PROFONDEUR_D_ETENDUE_PAR_DEFAUT, elagageFin: EJECTIONS_SANS_ELAGAGE_PROPOSEES, elagageFinNiveau: NIVEAU_MAX_SANS_ELAGAGE_EN_FIN_PROPOSE, gainFibonacci: PREMIER_TERME_DU_SCORE_PROGRESSIF, perteFibonacci: PREMIER_TERME_DU_SCORE_PROGRESSIF, piegeProgressifAdverse: PREMIER_TERME_DU_PIEGE_PROGRESSIF, piegeProgressifMien: PREMIER_TERME_DU_PIEGE_PROGRESSIF, piegeGagnantAdverse: PIEGE_GAGNANT_PROPOSE, piegeGagnantMien: PIEGE_GAGNANT_PROPOSE },
  ])
);

// Les termes des ajouts que `poids` porte, pour `camp` : { cle: valeur } ;
// rien pour une partie finie.
function termesDesAjouts(etat, camp, poids) {
  if (etat.vainqueur) return {};
  const termes = {};
  if ('sumitoVide' in poids) termes.sumitoVide = termeDuSumitoVide(etat, camp, poids);
  if ('etendueCentre' in poids || 'etendueCases' in poids) {
    const etendue = termesDeLEtendue(etat, camp, poids);
    if ('etendueCentre' in poids) termes.etendueCentre = etendue.etendueCentre;
    if ('etendueCases' in poids) termes.etendueCases = etendue.etendueCases;
  }
  return termes;
}

// La valeur des ajouts, dans l'ordre de solveur/kai-plus.cpp (evaluer) : un
// ajout a 0 ne compte pas.
function valeurAvecLesAjouts(valeur, etat, camp, poids) {
  if (etat.vainqueur) return valeur;
  let total = valeur;
  if (poids.sumitoVide) total += termeDuSumitoVide(etat, camp, poids);
  if (poids.etendueCentre || poids.etendueCases) {
    const etendue = termesDeLEtendue(etat, camp, poids);
    total += etendue.etendueCentre;
    total += etendue.etendueCases;
  }
  return total;
}
