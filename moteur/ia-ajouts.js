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
//     resolus l'etaient presque tous sans elagage).
// `terme` : il a sa colonne (Essai, panneaux) ; da et ep n'en ont pas, ils changent ec et ea.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : STYLES_IA, STYLES_IA_V2
// (ia-evaluation.js, ia-evaluation-v2.js), termeDuSumitoVide
// (ia-sumito-vide.js), termesDeLEtendue, PROFONDEUR_D_ETENDUE_PAR_DEFAUT (ia-etendue.js) viennent de fichiers
// charges avant celui-ci.

const OPTIONS_IA = [
  { cle: 'sumitoVide', suffixe: 'sv', terme: true },
  { cle: 'etendueCentre', suffixe: 'ec', terme: true },
  { cle: 'etendueCases', suffixe: 'ea', terme: true },
  { cle: 'etendueReference', suffixe: 'da', terme: false },
  { cle: 'elagageReponse', suffixe: 'er', terme: false },
  { cle: 'elagageSuite', suffixe: 'es', terme: false },
  { cle: 'etendueProfondeur', suffixe: 'ep', terme: false },
  { cle: 'elagageFin', suffixe: 'ef', terme: false },
];
const CLES_OPTIONS_IA = OPTIONS_IA.map((option) => option.cle);
const CLES_TERMES_OPTIONS_IA = OPTIONS_IA.filter((option) => option.terme).map((option) => option.cle);

// Le poids propose quand on coche un ajout (une base, saab : « ceux par defaut
// sont juste une base a ameliorer ») : le sumito vide annule un sumito de la
// version 2 ; une case de l'etendue vaut le Centre du style ; la moitie de la
// valeur d'une case ; 14 billes de reference (1 au debut de la partie) ; les
// premiers coups classes apres la reponse adverse et son propre coup suivant ;
// l'etendue sur 4 coups, comme sans ep ; plus d'elagage des 4 billes ejectees d'un camp.
const PART_DES_CASES_ETENDUE = 0.5;
const BILLES_DE_REFERENCE_ETENDUE = 14;
const DISTANCE_ELAGAGE_PAR_REPONSE = 3;
const DISTANCE_ELAGAGE_SUITE = 2;
const EJECTIONS_SANS_ELAGAGE_PROPOSEES = 4;
const POIDS_PROPOSES_OPTIONS_IA = Object.fromEntries(
  Object.keys(STYLES_IA).map((style) => [
    style,
    { sumitoVide: -STYLES_IA_V2[style].sumito, etendueCentre: STYLES_IA[style].centre, etendueCases: PART_DES_CASES_ETENDUE, etendueReference: BILLES_DE_REFERENCE_ETENDUE, elagageReponse: DISTANCE_ELAGAGE_PAR_REPONSE, elagageSuite: DISTANCE_ELAGAGE_SUITE, etendueProfondeur: PROFONDEUR_D_ETENDUE_PAR_DEFAUT, elagageFin: EJECTIONS_SANS_ELAGAGE_PROPOSEES },
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
