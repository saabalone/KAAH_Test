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
//     finit la partie — saab, 2026-10-16 (moteur/ia-evaluation-v4.js, version 4 et plus) ;
//   - Eg : l'elagage garde aussi, au-dela de ses el meilleurs, les ejections (1) ou toutes
//     les poussees (2) — KAI++ seulement ; saab, 2026-10-19 (la valeur juste apres une
//     ejection perd la menace qu'elle comptait deja : el10 en jetait une sur cinq) ;
//   - Gs : les groupes separes — chaque groupe de billes voisines en plus du premier coute ce
//     poids au camp, et le rapporte quand c'est l'adversaire — saab, 2026-10-19 (contre
//     AbaPro, apres le coup 20, KAI++ se dispersait en 4 a 5 groupes, AbaPro en tenait 1) ;
//   - Sc : le sumito 3-2 contre (moteur/ia-sumito-vide.js) — saab, 2026-10-19 ;
//   - Bp, Bmp, Bpb, Be, Bme : les billes vulnerables, poussables (de plusieurs facons, au bord)
//     et ejectables (de plusieurs facons) — saab, 2026-10-20, d'apres ULA (moteur/ia-sumito-vide.js) ;
//   - Pfa, Pfm : le piege de fin de partie — autant de billes piegees que d'ejections qui manquent
//     pour gagner (moteur/ia-evaluation-v4.js) — saab, 2026-10-23 ;
//   - Ct : le centre tenu — des que la machine a Ct billes au centre, elle joue le profil du
//     milieu copie dans le sien ; avant, et si elle le perd, le sien — saab, 2026-10-23
//     (moteur/ia-phase.js ; il choisit le profil, il ne compte pas dans l'evaluation).
// `terme` : il a sa colonne (Essai, panneaux) ; da, ep, gf, pf et ceux du piege n'en ont pas, ils changent d'autres termes.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : STYLES_IA, STYLES_IA_V2
// (ia-evaluation.js, ia-evaluation-v2.js), termeDuSumitoVide, termeDuSumitoContre, termesDesBillesVulnerables
// (ia-sumito-vide.js), termesDeLEtendue, PROFONDEUR_D_ETENDUE_PAR_DEFAUT (ia-etendue.js), couleurAdverse
// (regles.js), couleursDuPlateau (partie.js), CASES_VOISINES_IA (ia-evaluation-v2.js) viennent de fichiers
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
  { cle: 'elagageGarde', suffixe: 'Eg', terme: false },
  { cle: 'groupesSepares', suffixe: 'Gs', terme: true },
  { cle: 'sumitoContre', suffixe: 'Sc', terme: true },
  { cle: 'billesPoussables', suffixe: 'Bp', terme: true },
  { cle: 'billesMultipoussables', suffixe: 'Bmp', terme: true },
  { cle: 'billesPoussablesBord', suffixe: 'Bpb', terme: true },
  { cle: 'billesEjectables', suffixe: 'Be', terme: true },
  { cle: 'billesMultiejectables', suffixe: 'Bme', terme: true },
  { cle: 'piegeFinAdverse', suffixe: 'Pfa', terme: false },
  { cle: 'piegeFinMien', suffixe: 'Pfm', terme: false },
  // Le centre tenu (moteur/ia-phase.js) choisit le profil qui cherche : KAI++ ne le voit jamais.
  { cle: 'centreTenu', suffixe: 'Ct', terme: false, horsDeKaiPlus: true },
];
// Chaque suffixe avec sa majuscule (saab, 2026-10-16 : « v5elecef est un peu confus, il
// vaudrait mieux repérer chaque suffixe par une majuscule, v5ElEcEf »).
const CLES_OPTIONS_IA = OPTIONS_IA.map((option) => option.cle);
// Ceux que KAI++ lit, dans son ordre (solveur/kai-plus.cpp, lire_poids ; moteur/ia.js, poidsEnTexte).
const CLES_OPTIONS_KAI_PLUS = OPTIONS_IA.filter((option) => !option.horsDeKaiPlus).map((option) => option.cle);

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
// Ce que l'elagage garde en plus de ses el meilleurs (solveur/kai-plus.cpp, meilleurs_coups).
const ELAGAGE_GARDE_LES_EJECTIONS = 1;
const ELAGAGE_GARDE_LES_POUSSEES = 2;
// Un groupe en plus vaut une Compacite de plus d'une case de distance moyenne (une base a regler).
const GROUPES_SEPARES_PROPOSES = 20;
// Les billes vulnerables : les poids d'ULA (debutsaab9 : -3, -3, -4, -10, -10, Attaque a 65 %),
// a l'echelle de KAI++ (une ejection y vaut 100 et plus, chez ULA 30 a 37).
const BILLES_VULNERABLES_PROPOSEES = { billesPoussables: -5, billesMultipoussables: -5, billesPoussablesBord: -7, billesEjectables: -15, billesMultiejectables: -15 };
// Le centre tenu : 4 des 7 cases du centre (une base a regler).
const CENTRE_TENU_PROPOSE = 4;
const POIDS_PROPOSES_OPTIONS_IA = Object.fromEntries(
  Object.keys(STYLES_IA).map((style) => [
    style,
    { sumitoVide: -STYLES_IA_V2[style].sumito, etendueCentre: STYLES_IA[style].centre, etendueCases: PART_DES_CASES_ETENDUE, etendueReference: BILLES_DE_REFERENCE_ETENDUE, elagageReponse: DISTANCE_ELAGAGE_PAR_REPONSE, elagageSuite: DISTANCE_ELAGAGE_SUITE, etendueProfondeur: PROFONDEUR_D_ETENDUE_PAR_DEFAUT, elagageFin: EJECTIONS_SANS_ELAGAGE_PROPOSEES, elagageFinNiveau: NIVEAU_MAX_SANS_ELAGAGE_EN_FIN_PROPOSE, gainFibonacci: PREMIER_TERME_DU_SCORE_PROGRESSIF, perteFibonacci: PREMIER_TERME_DU_SCORE_PROGRESSIF, piegeProgressifAdverse: PREMIER_TERME_DU_PIEGE_PROGRESSIF, piegeProgressifMien: PREMIER_TERME_DU_PIEGE_PROGRESSIF, piegeGagnantAdverse: PIEGE_GAGNANT_PROPOSE, piegeGagnantMien: PIEGE_GAGNANT_PROPOSE, piegeFinAdverse: PIEGE_GAGNANT_PROPOSE, piegeFinMien: PIEGE_GAGNANT_PROPOSE, elagageGarde: ELAGAGE_GARDE_LES_EJECTIONS, groupesSepares: GROUPES_SEPARES_PROPOSES, sumitoContre: -STYLES_IA_V2[style].sumito, ...BILLES_VULNERABLES_PROPOSEES, centreTenu: CENTRE_TENU_PROPOSE },
  ])
);

// Les groupes de billes voisines de `camp` sur `couleurs` (notation -> couleur), moins le
// premier : une bille seule est un groupe ; aucune bille, rien en plus.
function groupesEnPlus(couleurs, camp) {
  const restantes = new Set(Object.keys(couleurs).filter((notation) => couleurs[notation] === camp));
  let groupes = 0;
  while (restantes.size > 0) {
    groupes++;
    const aVoir = [restantes.values().next().value];
    restantes.delete(aVoir[0]);
    while (aVoir.length > 0) {
      for (const voisine of CASES_VOISINES_IA[aVoir.pop()]) if (voisine !== null && restantes.delete(voisine)) aVoir.push(voisine);
    }
  }
  return Math.max(0, groupes - 1);
}

// Le terme des groupes separes pour `camp` (l'ajout Gs).
function termeDesGroupesSepares(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return poids.groupesSepares * (groupesEnPlus(couleurs, couleurAdverse(camp)) - groupesEnPlus(couleurs, camp));
}

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
  if ('groupesSepares' in poids) termes.groupesSepares = termeDesGroupesSepares(etat, camp, poids);
  if ('sumitoContre' in poids) termes.sumitoContre = termeDuSumitoContre(etat, camp, poids);
  return { ...termes, ...termesDesBillesVulnerables(etat, camp, poids) };
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
  if (poids.groupesSepares) total += termeDesGroupesSepares(etat, camp, poids);
  if (poids.sumitoContre) total += termeDuSumitoContre(etat, camp, poids);
  for (const valeur of Object.values(termesDesBillesVulnerables(etat, camp, poids))) total += valeur;
  return total;
}
