// Les profils IA (phase 32, saab : « ajouter dans Reglages les parametres de
// l'IA, avec ajout et choix de fichier, comme profil, IA/date, qu'on pourra
// utiliser pour J1 ou J2 ») : un nom, la version de l'IA, un style de base (qui
// donne le nom de la machine, KAI2_Nor_5s) et les poids de l'evaluation. Trois
// profils integres, un par style, jamais modifies ; les autres sont ceux de
// l'utilisateur (interface/profils-ia.js les range sur l'appareil). Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : STYLES_IA, CLES_POIDS_IA
// (ia-evaluation.js), VERSIONS_IA, POIDS_DES_VERSIONS_IA, nomDuProfilIntegre,
// NOMS_STYLES_IA, lireMachine (ia.js), lireHistoriqueIA, valeursReglagesIA
// (historique-profil-ia.js) viennent de fichiers charges avant celui-ci ;
// nomDisponible (corbeille.js), charge apres, ne sert qu'une fois la page chargee ; rangDuJeuDAjouts
// (noms-ia.js), seulement a l'usage.

// Ce que cherche chaque profil integre (saab, 2026-10-03 : « une description
// de ce qu'il cherche a faire, a mettre partout ou c'est necessaire ») — dit
// d'apres ses poids (moteur/ia-evaluation.js, STYLES_IA).
const DESCRIPTIONS_STYLES_IA = {
  agressif: "Cherche à éjecter : une bille prise compte plus qu'une bille perdue (1200 contre 800), pousse les billes adverses vers le bord, quitte à laisser les siennes au bord.",
  normal: "Équilibré : une bille prise vaut une bille perdue (1000), tient le centre, garde ses billes ensemble, évite le bord autant qu'il y pousse l'adversaire.",
  defensif: "Cherche à ne rien perdre : une bille perdue coûte plus qu'une prise ne rapporte (1300 contre 800), reste groupé au centre, loin du bord.",
};
const DESCRIPTION_VERSION_2_IA = " Version 2 : compte aussi les sumitos possibles, les menaces d'éjection et les fourchettes.";
const DESCRIPTION_VERSION_3_IA = ' Version 3 : fuit les 2 couronnes du bord, reste groupé (compacité), une éjection pèse plus quand le score avance.';
const DESCRIPTION_VERSION_4_IA = ' Version 4 : enferme les billes adverses du bord.';
const DESCRIPTION_VERSION_5_IA = ' Version 5 : un poids par sorte de sumito (3 contre 2, 3 contre 1, 2 contre 1).';
const DESCRIPTIONS_VERSIONS_IA = {
  1: '',
  2: DESCRIPTION_VERSION_2_IA,
  3: DESCRIPTION_VERSION_2_IA + DESCRIPTION_VERSION_3_IA,
  4: DESCRIPTION_VERSION_2_IA + DESCRIPTION_VERSION_3_IA + DESCRIPTION_VERSION_4_IA,
  5: DESCRIPTION_VERSION_2_IA + DESCRIPTION_VERSION_3_IA + DESCRIPTION_VERSION_4_IA + DESCRIPTION_VERSION_5_IA,
};
// Une description lue d'un fichier : un texte court.
const DESCRIPTION_PROFIL_IA_MAX = 400;

const DESCRIPTION_ELAGAGE_IA = ` Élagage : ne cherche que les ${ELAGAGE_PAR_DEFAUT_IA} meilleurs coups de chaque position, pour aller plus loin dans le même temps.`;
// Les versions qui ont aussi leurs profils integres « el » (saab, 2026-10-04 :
// « mettre v3el et v4el, pour qu'on puisse suivre les modifs ») : a partir de la 2.
const PREMIERE_VERSION_ELAGUEE_IA = 2;

function profilIntegre(style, version, elagage) {
  return {
    nom: nomDuProfilIntegre(style, version, elagage),
    version,
    livre: true,
    elagage,
    style,
    poids: POIDS_DES_VERSIONS_IA[version].styles[style],
    description: `${DESCRIPTIONS_STYLES_IA[style]}${DESCRIPTIONS_VERSIONS_IA[version]}${elagage ? DESCRIPTION_ELAGAGE_IA : ''}`,
  };
}

// Par style (saab, 2026-10-04 : « tous les Agr v1 a v4el, puis Nor, etc. :
// plus facile de choisir les parties entre IA du meme style, juste en changeant
// de force »), puis par version, chacune suivie de celle qui elague (« … v2el »,
// saab 2026-10-03) : Agressif, Agressif v2, Agressif v2el … Agressif v4el, Normal…
const PROFILS_IA_INTEGRES = Object.keys(STYLES_IA).flatMap((style) =>
  VERSIONS_IA.flatMap((version) => [
    profilIntegre(style, version, 0),
    ...(version >= PREMIERE_VERSION_ELAGUEE_IA ? [profilIntegre(style, version, ELAGAGE_PAR_DEFAUT_IA)] : []),
  ])
);

// Les meilleurs profils de saab (2026-10-08 : « ajoute les profils »), de base
// dans la VERSION DE TRAVAIL seulement (interface/profils-ia.js) : ils portent des
// ajouts pas encore publies (ec, ea, ep, ef). v4 : v5el_v3 + ec 20, ea 0,5, ep 1
// (37 parties sur 40 contre v4el) ; v5 : v4 + ef 5 (20 des 21 puzzles jamais
// resolus, 25 parties sur 40 contre v4 sans livre) ; v6 : v5 + fn 6 (« fais avec
// fn6 » : au niveau 8, ef ne laisse plus finir la profondeur en 30 s).
const POIDS_NORMAL_V5EL_V4 = { gain: 1000, perte: 1000, centre: 10, cohesion: 10, bordSoi: 15, bordAdverse: 15, sumito32: 21, sumito31: 12, sumito21: 7, menaceEjection: 100, fourchette: 0, gainScore: 100, perteScore: 100, compacite: 100, caseE5: 0, caseD4: 0, caseC4: 0, caseC3: 0, caseB4: -15, caseB2: -15, caseA3: -20, caseA2: -20, caseA1: -22, piege: 60, sumitoVide: -20, etendueCentre: 20, etendueCases: 0.5, etendueProfondeur: 1 };
// L'issue d'une retouche du banc qui n'a pas gagne, a la fin de son nom (interface/banc-essais-reglage.js).
const ISSUES_DU_BANC = ['=', '-'];
// Normal v5ElP4_v2 de saab (2026-10-18 ; « Normal v5el_v7 ») : ses reglages, tires de son LabAl du
// 18/10 03:59 (v5ElP4 retouche : gf 15, pf 15, cohesion 10 ; 18 parties sur 20, 2 nulles).
const POIDS_NORMAL_V5EL_V7 = {
  gain: 100, gainScore: 50, gainFibonacci: 15, perte: 100, perteScore: 50, perteFibonacci: 15,
  sumito32: 3, sumito31: 2, sumito21: 1, sumitoVide: -2, menaceEjection: 20, fourchette: 2, piege: 0,
  piegeProgressifAdverse: 2, piegeProgressifMien: 2, piegeGagnantAdverse: 500, piegeGagnantMien: 500,
  compacite: 20, cohesion: 10, bordSoi: 15, bordAdverse: 15,
  centre: 10, caseE5: 0, caseD4: 0, caseC4: 0, caseC3: 0, caseB4: -15, caseB2: -15, caseA3: -20, caseA2: -20, caseA1: -22,
  etendueCentre: 20, etendueCases: 0.5, etendueProfondeur: 1, elagageFin: 5, elagageFinNiveau: 6,
};
// Normal v5ElP4_v3 (« Normal v5el_v8 »), l'IA par defaut du 19 au 20/10, et la base de v9, de
// l'Agressif et du Defensif.
const POIDS_NORMAL_V5EL_V8 = { ...POIDS_NORMAL_V5EL_V7, cohesion: 15, gainFibonacci: 20, perteFibonacci: 20, sumito32: 6, sumito31: 4, sumito21: 2 };
// L'IA par defaut, aussi dans la version publiee (interface/profils-ia.js, nomDuProfilIAParDefaut) :
// Normal v5ElP8Ph2 depuis le 2026-11-11 (saab : « On va déjà publier avec nouveau P7 par défaut » — le P6Ph2 avec Nr, Cc 10, Fa 2 et la
// fin en avance a perte 150 : aucune perdue en deux blocs avec 3 billes d'avance) ;
// Normal v5ElP7Ph2 du 7 au 11/11 (saab : « Ok, adopte » — le P6Ph2 avec Co 15, qui conclut les fins en blocs) ;
// Normal v5ElP6Ph2 du 5 au 7/11 (saab : « passer la Nor en défaut avant de publier » — elle bat AP6 sans livre
// dans les 2 camps) ; avant, Normal v5ElP5 (du 2 au 5/11 ; saab : « on repasse P5 en défaut »), Normal v5ElP5_k2 (du
// 28/10 au 2/11 ; saab : « il attaque qd même s'il est en bloc »), Normal v5ElP5 (du 22 au 28/10), Normal v5ElP4_k4
// (du 20 au 22/10).
const NOM_PROFIL_IA_PAR_DEFAUT_DE_TRAVAIL = 'Normal v5el_v14';
// Les profils de travail publies pour les testeurs (saab, 2026-11-05 : « On pourra publier aussi Agr et Def, de toutes façons on est tjs en test donc autant
// faire tester ») : l'IA par defaut, son Agressif et son Defensif ; les autres restent dans la version de travail.
const NOMS_PROFILS_IA_PUBLIES = [NOM_PROFIL_IA_PAR_DEFAUT_DE_TRAVAIL, 'Agressif v5el_v13', 'Défensif v5el_v13'];

// Le profil HOMOLOGUE de `nom` dans le style `style` (saab, 2026-11-10 : « qd on est sur le profil IA par défaut, et qu'on veut
// changer Nor en Agr ou Def, le profil de l'IA se mets sur le 1er de la liste des profil, ce n'est pas pratique, il faut qu'il
// reste sur le profil d'origine ») : un profil publie, celui du nouveau style ; sinon le meme nom, son style change (« Agressif
// P5M1 » -> « Défensif P5M1 ») ; sinon null. `profils` : [{ nom, style }], ceux qu'on peut choisir.
function profilHomologue(nom, style, profils, publies = NOMS_PROFILS_IA_PUBLIES) {
  const deCeStyle = (candidat) => profils.find((profil) => profil.nom === candidat && profil.style === style)?.nom ?? null;
  const publie = publies.includes(nom) ? publies.map(deCeStyle).find(Boolean) : null;
  if (publie) return publie;
  const motDuStyle = Object.values(NOMS_STYLES_IA).find((mot) => nom.startsWith(`${mot} `));
  return motDuStyle && NOMS_STYLES_IA[style] ? deCeStyle(`${NOMS_STYLES_IA[style]}${nom.slice(motDuStyle.length)}`) : null;
}
// Normal v5ElP4_v4 : la compacite a 50, la base des profils P5.
const POIDS_NORMAL_V5EL_V9 = { ...POIDS_NORMAL_V5EL_V8, compacite: 50 };
// Les billes poussables d'ULA (Bp, Bmp, Bpb), comme dans le P5 de saab.
const BILLES_POUSSABLES_DU_P5 = { billesPoussables: -5, billesMultipoussables: -5, billesPoussablesBord: -7 };

// Les profils aux phases de P6 (saab, 2026-11-04 : « il faut des phases Ouv/Mil/Fin » ; 2026-11-05 : « faire le profile ph2 en Agr et Def ») : les poids de
// la machine qui a battu AP6 dans les 2 camps sans livre (parties 2611050032 et 2611050040). Le milieu d'abord : les autres phases n'en different que par un poids ou deux.
const sansLEtendue = ({ etendueCentre, etendueCases, ...poids }) => poids;
const POIDS_DU_MILIEU_P6 = { ...sansLEtendue({ ...POIDS_NORMAL_V5EL_V9, ...BILLES_POUSSABLES_DU_P5 }), gain: 300, perte: 300, caseE5: 20, caseD4: 15, caseC4: 10, caseC3: 10, anglesDeTriangles: 20, billesHorsDuGroupePrincipal: -20, billesHorsDuGroupeSelonLEcart: -10 };
const PHASES_AU_SCORE_DU_P6 = 2;
// L'ouverture : tout pour se regrouper au centre. La fin : une bille perdue compte plus, sauf quand on mene : 300, comme au milieu (saab, 2026-11-05 : « ça marche
// en Noir, donc on mets ce réglage en défaut ») — contre AP8, perte 150 menait 5-0 au tour 21 et perdait 5-6 ; perte 300, meme partie jusqu'au tour 20, gagne 6-2 au tour 30.
const COMPACITE_DE_L_OUVERTURE_P6 = 150;
const CENTRE_DE_L_OUVERTURE_P6 = 20;
const PERTE_DE_LA_FIN_P6 = 450;
const PERTE_DE_LA_FIN_EN_AVANCE_P6 = 300;
// Les recettes du style, les memes que de P5 a l'Agressif P5 et au Défensif P5, a chaque phase : `compacite` la multiplie.
const RECETTES_DES_STYLES_P6 = {
  normal: { poids: {}, compacite: 1 },
  agressif: { poids: { menaceEjection: 25, sumito32: 8, sumito31: 5, sumito21: 3, bordAdverse: 19 }, compacite: 1 },
  defensif: { poids: { cohesion: 20 }, compacite: 1.2 },
};

// Le P7 (saab, 2026-11-07 : « Ok, adopte » ; « fais aussi Agr et Def ») : le P6 avec Co 15, le coin du bloc adverse (moteur/ia-coin.js),
// a chaque phase — comme aux essais 60 a 62 (essais/suffixes-ia.html, ligne Co).
const AJOUTS_EN_PLUS_DU_P7 = { lignesSurLeCoin: 15 };

// `enPlus` : des ajouts en plus a chaque phase (le P7).
function profilAuxPhasesDuP6(nom, style, description, enPlus = {}) {
  const { poids: duStyle, compacite } = RECETTES_DES_STYLES_P6[style];
  const milieu = { ...POIDS_DU_MILIEU_P6, ...duStyle, ...enPlus, compacite: POIDS_DU_MILIEU_P6.compacite * compacite };
  const copie = (profil, poids) => ({ profil, version: 5, elagage: ELAGAGE_PAR_DEFAUT_IA, style, poids });
  return {
    nom,
    version: 5,
    livre: false,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style,
    poids: { ...milieu, compacite: COMPACITE_DE_L_OUVERTURE_P6 * compacite, centre: CENTRE_DE_L_OUVERTURE_P6, phasesAuScore: PHASES_AU_SCORE_DU_P6 },
    milieu: copie(`Milieu comp${milieu.compacite} centre${milieu.centre}`, milieu),
    fin: copie(`Fin perte${PERTE_DE_LA_FIN_P6}`, { ...milieu, perte: PERTE_DE_LA_FIN_P6 }),
    finEnAvance: copie(`Fin en avance perte${PERTE_DE_LA_FIN_EN_AVANCE_P6}`, { ...milieu, perte: PERTE_DE_LA_FIN_EN_AVANCE_P6 }),
    description,
  };
}

// Le P8 (saab, 2026-11-11 : « On va déjà publier avec nouveau P7 par défaut (penser à faire aussi Agr/Def ç chaque nouveau défaut) ») : le
// meilleur des essais 67 a 77 en deux blocs (essais/suffixes-ia.html, lignes Fa, Nr et Cc) — le P6 sans Co, avec Nr et Cc 10 a chaque
// phase, Fa 2, et une bille perdue a 150 dans sa fin en avance : il sacrifie tant qu'il mene de 2 billes, voit venir les nulles par
// repetition et garde e5. Le mene qui cherchait la nulle par repetition (Nr) : 59-0-33, contre 38-0-54 pour le P7.
const AJOUTS_EN_PLUS_DU_P8 = { repetitionsGardees: 1, controleDuCentre: 10 };
const AVANCE_POUR_LA_FIN_EN_AVANCE_P8 = 2;
const PERTE_DE_LA_FIN_EN_AVANCE_P8 = 150;

function profilDuP8(nom, style, description) {
  const p6 = profilAuxPhasesDuP6(nom, style, description, AJOUTS_EN_PLUS_DU_P8);
  return {
    ...p6,
    poids: { ...p6.poids, avancePourLaFinEnAvance: AVANCE_POUR_LA_FIN_EN_AVANCE_P8 },
    finEnAvance: { ...p6.finEnAvance, profil: `Fin en avance perte${PERTE_DE_LA_FIN_EN_AVANCE_P8}`, poids: { ...p6.finEnAvance.poids, perte: PERTE_DE_LA_FIN_EN_AVANCE_P8 } },
  };
}

const PROFILS_IA_DE_TRAVAIL = [
  {
    nom: 'Normal v5el_v4',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'normal',
    poids: POIDS_NORMAL_V5EL_V4,
    description: "Profil de saab (2026-10-08) : la version 5 élaguée, Gain et Perte (score) 100, Fourchette 0, plus l'étendue (ec 20, ea 0,5, sur 1 coup : ep 1). 37 parties sur 40 contre Normal v4el, 22 des 41 puzzles difficiles.",
  },
  {
    nom: 'Normal v5el_v5',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'normal',
    poids: { ...POIDS_NORMAL_V5EL_V4, elagageFin: 5 },
    description: "Profil de saab (2026-10-08) : Normal v5el_v4, plus l'élagage coupé dès 5 billes éjectées d'un camp (ef 5) — il voit les combinaisons forcées de fin de partie : 20 des 21 puzzles qu'aucun profil ne résolvait, 25 parties sur 40 contre v5el_v4.",
  },
  {
    nom: 'Normal v5el_v6',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'normal',
    poids: { ...POIDS_NORMAL_V5EL_V4, elagageFin: 5, elagageFinNiveau: 6 },
    description: "Profil de saab (2026-10-08) : Normal v5el_v5, mais l'élagage coupé en fin de partie (ef 5) jusqu'au niveau 6 seulement (fn 6) : aux niveaux 7 et 8, la recherche sans élagage ne finit plus en 30 s. Niveaux 1 à 6 : comme v5el_v5 ; 7 et 8 : comme v5el_v4.",
  },
  // Saab, 2026-10-18 : « je viens de tester v5ElP4_v2 qui gagne largement v5ElP4, donc mettre
  // Normal v5ElP4_v2 par défaut comme IA » — ses reglages, ceux de son LabAl du 18/10 03:59
  // (v5ElP4 retouche : gf 15, pf 15, cohesion 10 ; 18 parties sur 20, 2 nulles). Son 2e jeu
  // de poids de sa famille : son nom s'affiche en _v2 (moteur/noms-ia.js).
  {
    nom: 'Normal v5el_v7',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'normal',
    numeroDePoids: 2,
    poids: POIDS_NORMAL_V5EL_V7,
    description: "Profil de saab (2026-10-18) : son v5ElP4 avec le gain et la perte progressifs à 15 (gf, pf) et la cohésion à 10 — 18 parties sur 20 contre v5ElP4 (2 nulles), au niveau 8 sans limite de temps.",
  },
  // Les reglages cherches au banc en ligne de commande (essais/outils-banc ; saab,
  // 2026-10-18 : « essayer de trouver de meilleurs réglages pour Normal v5ElP4_v2 ») : v7 +
  // cohesion 15, gf et pf 20, sumitos x2 — au niveau 8 sans limite, 18 gagnees, 0 perdue,
  // 2 nulles contre v7, quand v7 contre lui-meme fait 11-4 (le livre de la reference
  // avantage l'essai).
  {
    nom: 'Normal v5el_v8',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'normal',
    numeroDePoids: 3,
    poids: POIDS_NORMAL_V5EL_V8,
    description: "L'IA par défaut du 19 au 20/10/2026 : Normal v5ElP4_k2 avec la cohésion à 15, le gain et la perte progressifs à 20 (gf, pf) et les sumitos doublés — 18 parties gagnées, 0 perdue, 2 nulles contre v5ElP4_k2 au niveau 8 sans limite (v5ElP4_k2 contre elle-même : 11-4).",
  },
  // La compacite (saab, 2026-10-20 : « fais le 1 ») : contre AbaPro, apres le coup 20, KAI++ se
  // dispersait (compacite 3,5 a 4 contre 2,1) ; l'IA par defaut avec la compacite a 50 bat
  // v5ElP4_v3 12-3 (5 nulles) au niveau 8 sans limite, le livre pour les deux, puis l'Agressif
  // v5ElP4 17-1 (2 nulles) : l'IA par defaut du 20 au 22/10. Son 4e jeu de poids : _v4.
  {
    nom: 'Normal v5el_v9',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'normal',
    numeroDePoids: 4,
    poids: POIDS_NORMAL_V5EL_V9,
    description: "L'IA par défaut du 20 au 22/10/2026 : Normal v5ElP4_k3 avec la compacité à 50 au lieu de 20 — elle reste groupée. Au niveau 8 sans limite, le livre pour les deux camps : 12 parties gagnées, 3 perdues, 5 nulles contre Normal v5ElP4_k3, et 17 gagnées, 1 perdue, 2 nulles contre l'Agressif v5ElP4.",
  },
  // Le P5 de saab (2026-10-20 : « avec les nouveaux paramètres Bm, etc, KAI++6 gagne enfin AP6 » ;
  // 2026-10-22 : « Ok mets le P5 Agr et Nor ») : v9 avec les billes poussables d'ULA. Au niveau 8
  // sans limite : 8-4 (8 nulles) contre v9, jeu egal contre v9 + cohesion 20 (8-7, 5 nulles).
  // L'IA par defaut du 22 au 28/10, et du 2 au 5/11. Le premier jeu de poids de sa famille (P5) : pas de _k.
  {
    nom: 'Normal v5el_v10',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'normal',
    poids: { ...POIDS_NORMAL_V5EL_V9, ...BILLES_POUSSABLES_DU_P5 },
    description: "L'IA par défaut du 22 au 28/10/2026, et du 2 au 5/11 : Normal v5ElP5, le P5 de saab — Normal v5ElP4_k4 et les billes poussables d'ULA (Bp −5, Bmp −5, Bpb −7). En KAI++ niveau 6, il a battu AbaPro niveau 6 (AP6) 6-4 avec l'élagage 10 (2026-10-20), puis 6-4 avec l'élagage 20 (2026-10-24) ; le 1/11, en KAI++ niveau 8, il bat AP6 6-5 avec les Blancs et 6-1 avec les Noirs. Au niveau 8 sans limite : 8 gagnées, 4 perdues, 8 nulles contre Normal v5ElP4_k4.",
  },
  // Le P5 avec la menace d'ejection a 10 (essais 32 a 35 ; saab, 2026-10-28 : « on passe ce réglage en profil par
  // défaut, car même s'il n'est pas encore bon, il attaque qd même s'il est en bloc ») : la menace a 20 valait
  // presque une bille ejectee, P5 gardait ses menaces au lieu d'ejecter (partie Br_2610250415). Son 2e jeu de
  // poids de KAAH : _k2. L'IA par defaut du 28/10 au 2/11.
  {
    nom: 'Normal v5el_v11',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'normal',
    numeroDePoids: 2,
    poids: { ...POIDS_NORMAL_V5EL_V9, ...BILLES_POUSSABLES_DU_P5, menaceEjection: 10 },
    description: "L'IA par défaut du 28/10 au 2/11/2026 : Normal v5ElP5_k2, le P5 avec la menace d'éjection à 10 au lieu de 20 — il éjecte au lieu de garder ses menaces. Au niveau 6 contre P5 (80 parties, essais 32 et 33) : 51 gagnées, 10 perdues, 19 nulles, contre 35-5-40 pour P5 lui-même ; contre P5 au niveau 7 : 15-17 (8 nulles), P5 au niveau 6 : 14-18.",
  },
  // Le Ph 2 de saab (2026-11-05 : « Ah, enfin ça gagne dans les 2 camps ») : l'IA par defaut du 5 au 7/11. Le premier jeu de poids de sa famille (P6).
  profilAuxPhasesDuP6(
    'Normal v5el_v12',
    'normal',
    "L'IA par défaut du 5 au 7/11/2026 : Normal v5ElP6Ph2, sans livre. Elle change de réglages selon le score : se regrouper au centre jusqu'à 2 billes sorties, puis attaquer ; quand un camp a perdu 4 billes, une bille perdue compte plus, sauf si elle mène. En KAI++ niveau 6, elle bat AbaPro niveau 6 dans les 2 camps (6-3 en Noir, 6-2 en Blanc) et le niveau 8 en Noir (6-2) ; en Blanc, le niveau 8 la bat encore (2-6). Au niveau 6 contre Normal v5ElP5, avec une bille perdue à 150 quand elle mène : 31 gagnées, 4 perdues, 5 nulles."
  ),
  // Le P7 (saab, 2026-11-07 : « Ok, adopte ») : l'IA par defaut du 7 au 11/11.
  profilAuxPhasesDuP6(
    'Normal v5el_v13',
    'normal',
    "L'IA par défaut du 7 au 11/11/2026 : Normal v5ElP7Ph2, sans livre — Normal v5ElP6Ph2 avec, à chaque phase, l'ajout Co 15 (des lignes de 3 billes sur les axes du coin le moins au bord du bloc adverse), qui ne compte que quand on mène de 3 billes ou plus : avant, elle joue comme Normal v5ElP6Ph2. En blocs avec 3 billes d'avance ou plus, contre Normal v5ElP6Ph2 : au niveau 6, 54 gagnées, 2 perdues, 28 nulles (Normal v5ElP6Ph2 lui-même : 41-1-42) ; sur 27 autres blocs, 17-0-10 (12-2-13) ; au niveau 8, 48-4-32 (41-1-42). Pas encore joué contre AbaPro.",
    AJOUTS_EN_PLUS_DU_P7
  ),
  // Le P8 (saab, 2026-11-11 : « On va déjà publier avec nouveau P7 par défaut ») : l'IA par defaut depuis le 11/11.
  profilDuP8(
    NOM_PROFIL_IA_PAR_DEFAUT_DE_TRAVAIL,
    'normal',
    "L'IA par défaut depuis le 11/11/2026 : Normal v5ElP8Ph2, sans livre — Normal v5ElP6Ph2 avec, à chaque phase, Nr (la recherche voit venir les nulles par répétition) et Cc 10 (garder e5, face à un adversaire en bloc, sur ses 3 axes) ; Fa 2 (le profil de fin en avance dès 2 billes d'avance, jamais en dessous) et une bille perdue à 150 dans ce profil (sacrifier tant qu'on mène). En deux blocs avec 3 ou 4 billes d'avance (92 positions, niveau 6, contre Normal v5ElP7Ph2 qui cherche la nulle par répétition) : 59 gagnées, 0 perdue, 33 nulles (Normal v5ElP7Ph2 lui-même : 38-0-54). Pas encore joué depuis la Marguerite Belge ni contre AbaPro."
  ),
  // Son Agressif (saab, 2026-10-19 : « Ok, 1 et 2 » ; « Agr plus fort que Nor, on peut la mettre
  // mais pas en défaut ») : plus de pression (menace, sumitos, bord adverse), mais le gain garde
  // — le gain x1,25 fait courir apres les ejections et perd (4-15 au niveau 8), x1,5 aussi (7-10).
  {
    nom: 'Agressif v5el_v8',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'agressif',
    poids: { ...POIDS_NORMAL_V5EL_V8, menaceEjection: 25, sumito32: 8, sumito31: 5, sumito21: 3, bordAdverse: 19 },
    description: "L'Agressif de l'IA par défaut (2026-10-19) : Normal v5ElP4_k3 avec la menace d'éjection à 25, les sumitos à 8, 5, 3 et le bord adverse à 19 — plus de pression, le gain inchangé. 12 parties gagnées, 2 perdues, 6 nulles contre Normal v5ElP4_k3 au niveau 8 sans limite, le livre pour les deux camps.",
  },
  // L'Agressif P5 (saab, 2026-10-21 : « il faudrait que je teste KAI++6_Agr_30s_v5El10P5, mais on
  // ne l'a pas encore fait ») : l'IA par defaut (v9) avec les billes poussables d'ULA (son P5, qui
  // a battu AP6) et la pression de l'Agr. Au niveau 6 contre P5 : 3-6 (11 nulles), la meilleure
  // de trois recettes — un style, pas une version plus forte.
  {
    nom: 'Agressif v5el_v9',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'agressif',
    poids: { ...POIDS_NORMAL_V5EL_V9, ...BILLES_POUSSABLES_DU_P5, menaceEjection: 25, sumito32: 8, sumito31: 5, sumito21: 3, bordAdverse: 19 },
    description: "L'Agressif P5 (2026-10-21) : le P5 (Normal v5ElP5, qui a battu AbaPro niveau 6 en KAI++ niveau 6) avec la pression de l'Agr (menace d'éjection 25, sumitos 8, 5, 3, bord adverse 19). Au niveau 6 contre P5 : 3 gagnées, 6 perdues, 11 nulles.",
  },
  // L'Agressif de l'IA par defaut (saab, 2026-10-28 : « Il faudrait aussi ajouter Agr et Def en _k2 ») : le meme
  // changement que P5 -> P5_k2, la menace divisee par deux — 12,5, aussi 1,25 fois la menace a 10 de P5_k2, le
  // rapport de l'Agr au Normal. Son 2e jeu de poids de KAAH : _k2.
  {
    nom: 'Agressif v5el_v10',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'agressif',
    numeroDePoids: 2,
    poids: { ...POIDS_NORMAL_V5EL_V9, ...BILLES_POUSSABLES_DU_P5, menaceEjection: 12.5, sumito32: 8, sumito31: 5, sumito21: 3, bordAdverse: 19 },
    description: "L'Agressif de Normal v5ElP5_k2 (2026-10-28) : l'Agressif P5 avec la menace d'éjection à 12,5 au lieu de 25 — la moitié, comme Normal v5ElP5_k2 (et 1,25 fois sa menace à 10, le rapport de l'Agr). Pas encore essayé au banc.",
  },
  // L'Agressif du Ph 2 (saab, 2026-11-05 : « faire le profile ph2 en Agr et Def ») : la recette de l'Agressif P5, a chaque phase.
  profilAuxPhasesDuP6(
    'Agressif v5el_v11',
    'agressif',
    "L'Agressif de l'IA par défaut (2026-11-05) : Normal v5ElP6Ph2 avec, à chaque phase, la pression de l'Agr (menace d'éjection 25, sumitos 8, 5, 3, bord adverse 19), sans livre. Au niveau 6 contre Normal v5ElP6Ph2 : 14 gagnées, 8 perdues, 18 nulles."
  ),
  // L'Agressif du P7 (saab, 2026-11-07 : « fais aussi Agr et Def »).
  profilAuxPhasesDuP6(
    'Agressif v5el_v12',
    'agressif',
    "L'Agressif de l'IA par défaut (2026-11-07) : l'Agressif v5ElP6Ph2 avec, à chaque phase, l'ajout Co 15 (le coin du bloc adverse), sans livre. Pas encore essayé au banc.",
    AJOUTS_EN_PLUS_DU_P7
  ),
  // L'Agressif du P8 (saab, 2026-11-11 : « penser à faire aussi Agr/Def ç chaque nouveau défaut »).
  profilDuP8(
    'Agressif v5el_v13',
    'agressif',
    "L'Agressif de l'IA par défaut (2026-11-11) : l'Agressif v5ElP6Ph2 avec les changements du P8 — Nr et Cc 10 à chaque phase, Fa 2, une bille perdue à 150 en fin en avance —, sans livre. Pas encore essayé au banc."
  ),
  // Son Defensif (saab, 2026-10-19 : « Ok, 1 et 2 ») : partir de l'IA par defaut et serrer le
  // bloc battait les rapports des styles (essais/outils-banc) — au niveau 8 sans limite, le
  // livre pour les deux camps, 6 gagnees, 2 perdues, 12 nulles contre elle.
  {
    nom: 'Défensif v5el_v8',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'defensif',
    poids: { ...POIDS_NORMAL_V5EL_V8, cohesion: 20, compacite: 25 },
    description: "Le Défensif de l'IA par défaut (2026-10-19) : Normal v5ElP4_k3 avec la cohésion à 20 et la compacité à 25 — il serre son bloc. 6 parties gagnées, 2 perdues, 12 nulles contre Normal v5ElP4_k3 au niveau 8 sans limite, le livre pour les deux camps.",
  },
  // Le Defensif P5 (saab, 2026-10-22 : « il faudrait aussi la Def ») : P5 (l'IA par defaut) avec la
  // cohesion a 20 et la compacite a 60. Au niveau 6 contre P5 : 2-0 (18 nulles), il ne perd pas ;
  // avec la cohesion seule, 3-2 (15 nulles).
  {
    nom: 'Défensif v5el_v9',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'defensif',
    poids: { ...POIDS_NORMAL_V5EL_V9, ...BILLES_POUSSABLES_DU_P5, cohesion: 20, compacite: 60 },
    description: "Le Défensif P5 (2026-10-22) : le P5 (Normal v5ElP5) avec la cohésion à 20 et la compacité à 60 — il serre son bloc. Au niveau 6 contre Normal v5ElP5 : 2 gagnées, 0 perdue, 18 nulles.",
  },
  // Le Defensif de l'IA par defaut (saab, 2026-10-28 : « Il faudrait aussi ajouter Agr et Def en _k2 ») : le
  // Defensif P5 avec la menace a 10, comme P5_k2. Son 2e jeu de poids de KAAH : _k2.
  {
    nom: 'Défensif v5el_v10',
    version: 5,
    livre: true,
    elagage: ELAGAGE_PAR_DEFAUT_IA,
    style: 'defensif',
    numeroDePoids: 2,
    poids: { ...POIDS_NORMAL_V5EL_V9, ...BILLES_POUSSABLES_DU_P5, cohesion: 20, compacite: 60, menaceEjection: 10 },
    description: "Le Défensif de Normal v5ElP5_k2 (2026-10-28) : le Défensif P5 avec la menace d'éjection à 10 au lieu de 20, comme Normal v5ElP5_k2 — cohésion 20, compacité 60. Pas encore essayé au banc.",
  },
  // Le Defensif du Ph 2 (saab, 2026-11-05 : « faire le profile ph2 en Agr et Def ») : la recette du Defensif P5, a chaque phase.
  profilAuxPhasesDuP6(
    'Défensif v5el_v11',
    'defensif',
    "Le Défensif de l'IA par défaut (2026-11-05) : Normal v5ElP6Ph2 avec, à chaque phase, un bloc plus serré (cohésion 20, compacité 180 à l'ouverture, 60 ensuite), sans livre. Au niveau 6 contre Normal v5ElP6Ph2 : 19 gagnées, 10 perdues, 11 nulles."
  ),
  // Le Defensif du P7 (saab, 2026-11-07 : « fais aussi Agr et Def »).
  profilAuxPhasesDuP6(
    'Défensif v5el_v12',
    'defensif',
    "Le Défensif de l'IA par défaut (2026-11-07) : le Défensif v5ElP6Ph2 avec, à chaque phase, l'ajout Co 15 (le coin du bloc adverse), sans livre. Pas encore essayé au banc.",
    AJOUTS_EN_PLUS_DU_P7
  ),
  // Le Defensif du P8 (saab, 2026-11-11 : « penser à faire aussi Agr/Def ç chaque nouveau défaut »).
  profilDuP8(
    'Défensif v5el_v13',
    'defensif',
    "Le Défensif de l'IA par défaut (2026-11-11) : le Défensif v5ElP6Ph2 avec les changements du P8 — Nr et Cc 10 à chaque phase, Fa 2, une bille perdue à 150 en fin en avance —, sans livre. Pas encore essayé au banc."
  ),
];

// Un profil relu (stockage, fichier importe), ou null s'il n'a pas de nom. Les
// memes valeurs sures qu'une machine (lireMachine) : style inconnu -> normal,
// poids faux -> celui du style. Son historique (moteur/historique-profil-ia.js)
// le suit s'il est intact : le profil prend alors les valeurs de sa version
// courante.
function lireProfilIA(brut) {
  if (!brut || typeof brut !== 'object' || typeof brut.nom !== 'string' || brut.nom.trim() === '') return null;
  const nom = brut.nom.trim();
  // L'indice d'un profil de l'utilisateur (interface/profils-ia.js), repris
  // dans le nom de ses machines (moteur/ia.js, nomDeLaMachine).
  const indice = Number.isInteger(brut.indice) && brut.indice > 0 ? { indice: brut.indice } : {};
  // Son jeu de poids dans sa famille (moteur/noms-ia.js, le _v de son nom), et son nom
  // d'avant ces noms (saab, 2026-10-16 : garde pour l'infobulle).
  const noms = {
    ...(Number.isInteger(brut.numeroDePoids) && brut.numeroDePoids > 0 ? { numeroDePoids: brut.numeroDePoids } : {}),
    ...(typeof brut.ancienNom === 'string' && brut.ancienNom !== '' ? { ancienNom: brut.ancienNom } : {}),
    // Une retouche du banc gardee a cote (saab, 2026-10-18) : « = » a egalite, « - » perdue.
    ...(ISSUES_DU_BANC.includes(brut.issueDuBanc) ? { issueDuBanc: brut.issueDuBanc } : {}),
  };
  // Ce qu'il cherche a faire (voir DESCRIPTIONS_STYLES_IA) : hors de l'historique.
  const description = typeof brut.description === 'string' ? brut.description.trim().slice(0, DESCRIPTION_PROFIL_IA_MAX) : '';
  // Qui l'a exporte (voir nomDuProfilImporte).
  const auteur = typeof brut.auteur === 'string' ? brut.auteur.replace(CARACTERES_HORS_AUTEUR, '').slice(0, AUTEUR_PROFIL_IA_MAX) : '';
  const lu = lireHistoriqueIA(brut);
  if (!lu) return { nom, ...valeursReglagesIA(brut), ...indice, ...noms, description, auteur };
  const courante = lu.historique.find((version) => version.numero === lu.courante);
  return { nom, ...valeursReglagesIA(courante), historique: lu.historique, courante: lu.courante, ...indice, ...noms, description, auteur };
}

// L'indice d'un nouveau profil de l'utilisateur (repris dans le nom de ses
// machines, KAI2_Nor_5s_P3) : le plus grand de `profils`, plus un — jamais
// celui d'un profil encore la ; sans profil, P1 (saab, 2026-10-03 : « les
// nouveaux indexages commenceront a (P1) au lieu de (P4) »).
function prochainIndiceProfilIA(profils) {
  return Math.max(0, ...profils.map((profil) => profil.indice ?? 0)) + 1;
}

// Le nom d'un profil importe (saab, 2026-10-03 : « on pourrait lui ajouter un
// suffixe de l'expediteur », puis 2026-10-06 : « un prefixe est plus parlant
// qu'un suffixe ») : precede de son auteur, saab_Normal_v2_(P4) — sauf sans
// auteur, deja precede, ou quand l'auteur est `moi` (son propre profil
// revenu) ; deja pris : numerote, comme toute copie (moteur/corbeille.js,
// nomDisponible). L'auteur, lettres, chiffres et « _ », comme un nom de joueur.
const CARACTERES_HORS_AUTEUR = /[^\p{L}\p{N}_]/gu;
const AUTEUR_PROFIL_IA_MAX = 20;

function nomDuProfilImporte(nom, auteur, nomsPris, moi = '') {
  const prefixe = auteur && auteur !== moi && !nom.startsWith(`${auteur}_`) ? `${auteur}_` : '';
  return nomDisponible(`${prefixe}${nom}`, nomsPris);
}

// Le reglage d'une machine qui joue avec `profil` (voir moteur/ia.js,
// lireMachine) : tout le profil, pour que le fichier de la partie le garde.
// `moteur` : 'kai' ou 'kai++' (moteur/ia.js).
// `livre` : jouer l'ouverture dans la base de coups (moteur/ia.js).
function machineDuProfil(profil, { niveau, reflexionMax, moteur = 'kai', livre = true }) {
  return lireMachine({ moteur, version: profil.version, elagage: profil.elagage, niveau, style: profil.style, profil: profil.nom, indiceProfil: profil.indice, versionProfil: profil.courante, numeroDesAjouts: profil.numeroDesAjouts, numeroDePoids: profil.numeroDePoids, versionHistorique: profil.versionHistorique, poids: profil.poids, milieu: profil.milieu, fin: profil.fin, finEnAvance: profil.finEnAvance, reflexionMax, livre });
}

// Les profils dans l'ordre (saab, 2026-10-16 : « mets ces profils dans l'ordre Agr/Nor/Def
// avec leur version et Pn, pour bien voir lesquels on n'a pas retouchés ») : le style
// (Agressif, Normal, Défensif), la version, sans puis avec elagage, le profil de base
// avant ceux qu'on en a faits ; puis (moteur/noms-ia.js) leurs ajouts (Pn) et leur jeu
// de poids (_v) — une famille reste ensemble —, enfin leur numero et leur version.
const STYLES_DANS_L_ORDRE_IA = Object.keys(STYLES_IA);
function profilsIADansLOrdre(profils) {
  const cle = (profil) => [STYLES_DANS_L_ORDRE_IA.indexOf(profil.style), profil.version, profil.elagage, rangDuJeuDAjouts(profil.numeroDesAjouts), profil.numeroDePoids ?? 1, profil.indice ?? 0, profil.courante ?? 0];
  return [...profils].sort((a, b) => {
    const [cleA, cleB] = [cle(a), cle(b)];
    const rang = cleA.findIndex((valeur, i) => valeur !== cleB[i]);
    return rang >= 0 ? cleA[rang] - cleB[rang] : a.nom.localeCompare(b.nom, 'fr', { numeric: true });
  });
}
