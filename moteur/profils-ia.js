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
// nomDisponible (corbeille.js), charge apres, ne sert qu'une fois la page chargee.

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
const DESCRIPTIONS_VERSIONS_IA = {
  1: '',
  2: DESCRIPTION_VERSION_2_IA,
  3: DESCRIPTION_VERSION_2_IA + DESCRIPTION_VERSION_3_IA,
  4: DESCRIPTION_VERSION_2_IA + DESCRIPTION_VERSION_3_IA + DESCRIPTION_VERSION_4_IA,
};
// Une description lue d'un fichier : un texte court.
const DESCRIPTION_PROFIL_IA_MAX = 400;

const DESCRIPTION_ELAGAGE_IA = ` Élagage : ne cherche que les ${ELAGAGE_PAR_DEFAUT_IA} meilleurs coups de chaque position, pour aller plus loin dans le même temps.`;
const VERSION_ELAGUEE_IA = 2;

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

// Trois par version : Agressif, Normal, Défensif (version 1), puis « … v2 », « … v3 » ;
// et trois de la version 2 qui elague, « … v2el » (saab, 2026-10-03).
// Ceux qui elaguent juste apres ceux de leur version.
const PROFILS_IA_INTEGRES = VERSIONS_IA.flatMap((version) => [
  ...Object.keys(STYLES_IA).map((style) => profilIntegre(style, version, 0)),
  ...(version === VERSION_ELAGUEE_IA ? Object.keys(STYLES_IA).map((style) => profilIntegre(style, version, ELAGAGE_PAR_DEFAUT_IA)) : []),
]);

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
  // Ce qu'il cherche a faire (voir DESCRIPTIONS_STYLES_IA) : hors de l'historique.
  const description = typeof brut.description === 'string' ? brut.description.trim().slice(0, DESCRIPTION_PROFIL_IA_MAX) : '';
  // Qui l'a exporte (voir nomDuProfilImporte).
  const auteur = typeof brut.auteur === 'string' ? brut.auteur.replace(CARACTERES_HORS_AUTEUR, '').slice(0, AUTEUR_PROFIL_IA_MAX) : '';
  const lu = lireHistoriqueIA(brut);
  if (!lu) return { nom, ...valeursReglagesIA(brut), ...indice, description, auteur };
  const courante = lu.historique.find((version) => version.numero === lu.courante);
  return { nom, ...valeursReglagesIA(courante), historique: lu.historique, courante: lu.courante, ...indice, description, auteur };
}

// L'indice d'un nouveau profil de l'utilisateur (repris dans le nom de ses
// machines, KAI2_Nor_5s_P3) : le plus grand de `profils`, plus un — jamais
// celui d'un profil encore la ; sans profil, P1 (saab, 2026-10-03 : « les
// nouveaux indexages commenceront a (P1) au lieu de (P4) »).
function prochainIndiceProfilIA(profils) {
  return Math.max(0, ...profils.map((profil) => profil.indice ?? 0)) + 1;
}

// Le nom d'un profil importe (saab, 2026-10-03 : « si collision, on pourrait
// lui ajouter un suffixe de l'expediteur, par ex. Normal_v2_(P4)_saab ») : le
// sien s'il est libre ; sinon suivi de son auteur ; deja pris aussi (ou sans
// auteur) : numerote, comme toute copie (moteur/corbeille.js, nomDisponible).
// L'auteur, lettres, chiffres et « _ », comme un nom de joueur.
const CARACTERES_HORS_AUTEUR = /[^\p{L}\p{N}_]/gu;
const AUTEUR_PROFIL_IA_MAX = 20;

function nomDuProfilImporte(nom, auteur, nomsPris) {
  if (!nomsPris.includes(nom)) return nom;
  return nomDisponible(auteur ? `${nom}_${auteur}` : nom, nomsPris);
}

// Le reglage d'une machine qui joue avec `profil` (voir moteur/ia.js,
// lireMachine) : tout le profil, pour que le fichier de la partie le garde.
// `moteur` : 'kai' ou 'kai++' (moteur/ia.js).
// `livre` : jouer l'ouverture dans la base de coups (moteur/ia.js).
function machineDuProfil(profil, { niveau, reflexionMax, moteur = 'kai', livre = true }) {
  return lireMachine({ moteur, version: profil.version, elagage: profil.elagage, niveau, style: profil.style, profil: profil.nom, indiceProfil: profil.indice, poids: profil.poids, reflexionMax, livre });
}
