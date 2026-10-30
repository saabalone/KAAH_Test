// L'historique d'un profil IA (saab, 2026-09-30 : « voir l'historique des
// modif d'un fichier, un peu comme les branches de Sequence »). Le moteur des
// versions est commun avec les profils d'Entrainement (moteur/historique-reglages.js,
// saab 2026-10-08) ; ce fichier dit ce qu'un profil IA retient — ses reglages,
// leurs libelles, comment les ecrire — et garde ses noms (validerVersionIA...).
// Le profil porte toujours les valeurs de sa version courante (celles que la
// machine joue). Pur.
//
// Les couleurs des reglages (orange, vert, jaune) : moteur/couleurs-profil-ia.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : le moteur des versions
// (moteur/historique-reglages.js), CLES_POIDS_IA_V2
// (ia-evaluation-v2.js), CLES_CASES_IA_V3 (ia-evaluation-v3.js), CLES_POIDS_IA_V5
// (ia-evaluation-v5.js), NOMS_STYLES_IA, lireMachine (ia.js),
// REGLAGES_DANS_L_ORDRE_DES_GROUPES_IA, groupeDuReglage (ia-groupes.js) viennent de fichiers charges avant
// celui-ci.

// Ce qu'une version retient, dans l'ordre ou Reglages le montre.
// Le livre d'ouvertures (saab, 2026-10-03 : colonne Livre apres la Version) et
// l'elagage (saab, 2026-10-02, version « 2el » : moteur/ia-recherche.js)
// suivent la version.
const REGLAGES_IA_HORS_POIDS = ['version', 'livre', 'elagage', 'style'];
// Les poids et ajouts : dans l'ordre des groupes de l'evaluation (saab, 2026-10-16,
// moteur/ia-groupes.js), le meme partout ou on les liste.
const CLES_REGLAGES_IA = [...REGLAGES_IA_HORS_POIDS, ...REGLAGES_DANS_L_ORDRE_DES_GROUPES_IA];

const LIBELLES_REGLAGES_IA = {
  version: 'Version',
  livre: 'Livre',
  elagage: 'Élagage',
  style: 'Style',
  gain: 'Gain',
  gainScore: 'Gain (score)',
  perte: 'Perte',
  perteScore: 'Perte (score)',
  gainFibonacci: 'Gain (score) progressif, 1er terme (gf)',
  perteFibonacci: 'Perte (score) progressive, 1er terme (pf)',
  piegeProgressifAdverse: 'Piège progressif adverse, 1er terme (Ppa)',
  piegeProgressifMien: 'Piège progressif des miennes, 1er terme (Ppm)',
  piegeGagnantAdverse: 'Piège gagnant adverse (Pga)',
  piegeGagnantMien: 'Piège gagnant des miennes (Pgm)',
  piegeFinAdverse: 'Piège de fin de partie adverse (Pfa)',
  piegeFinMien: 'Piège de fin de partie des miennes (Pfm)',
  centre: 'Centre',
  caseE5: 'e5',
  caseD4: 'd4',
  caseC4: 'c4',
  caseC3: 'c3',
  caseB4: 'b4',
  caseB2: 'b2',
  caseA3: 'a3',
  caseA2: 'a2',
  caseA1: 'a1',
  etendueCentre: 'Étendue (ec)',
  etendueCases: 'Étendue des cases (ea)',
  etendueReference: 'Étendue ÷ adverses (da)',
  etendueProfondeur: 'Étendue, profondeur en coups (ep)',
  elagageReponse: 'Élagage par réponse (er)',
  elagageSuite: 'Élagage par réponse, coups suivants (es)',
  elagageFin: 'Élagage coupé en fin de partie (ef)',
  elagageFinNiveau: "ef jusqu'au niveau (fn)",
  elagageGarde: "L'élagage garde les éjections / poussées (Eg)",
  centreTenu: 'Centre tenu, puis le profil du milieu (Ct)',
  groupesSepares: 'Groupes séparés (Gs)',
  sumitoContre: 'Sumito 3/2 contré (Sc)',
  billesPoussables: 'Billes poussables (Bp)',
  billesMultipoussables: 'Billes multipoussables (Bmp)',
  billesPoussablesBord: 'Billes poussables au bord (Bpb)',
  billesEjectables: 'Billes éjectables (Be)',
  billesMultiejectables: 'Billes multiéjectables (Bme)',
  billesPousseesAEffet: 'Billes poussées à effet (Bpe)',
  pousseesRetournees: 'Poussées qui se retournent (Pr)',
  cohesion: 'Cohésion',
  compacite: 'Compacité',
  // Pas un reglage : le terme des cases, une colonne de l'Essai.
  cases: 'Cases',
  bordSoi: 'Bord (miennes)',
  bordAdverse: 'Bord (adverses)',
  sumito: 'Sumito',
  sumito32: 'Sumito 3/2',
  sumito31: 'Sumito 3/1',
  sumito21: 'Sumito 2/1',
  sumitoVide: 'Sumito vide (sv)',
  menaceEjection: "Menace d'éjection",
  fourchette: 'Fourchette',
  piege: 'Piège',
};

const NOTE_AVANT_HISTORIQUE_IA = NOTE_AVANT_HISTORIQUE;

// Version, livre, elagage, style et poids, ramenes a des valeurs sures (moteur/ia.js).
function valeursReglagesIA(brut) {
  const { version, livre, elagage, style, poids, milieu } = lireMachine(brut);
  return { version, livre, elagage, style, poids, ...(milieu ? { milieu } : {}) };
}

// Le profil du milieu (l'ajout Ct, moteur/ia-phase.js) : un reglage de plus pour l'historique — sa
// copie entiere, qu'une autre copie (un autre profil, ou le meme retouche) change.
const CLE_PROFIL_DU_MILIEU = 'milieu';
const LIBELLE_PROFIL_DU_MILIEU = 'Profil du milieu';
const valeurDuProfilDuMilieu = (valeurs) => (valeurs.milieu ? JSON.stringify(valeurs.milieu) : undefined);
const nomDuProfilDuMilieu = (valeur) => (valeur === undefined ? '—' : JSON.parse(valeur).profil);

function valeurReglageIA(valeurs, cle) {
  return REGLAGES_IA_HORS_POIDS.includes(cle) ? valeurs[cle] : valeurs.poids[cle];
}

function texteReglageIA(cle, valeur) {
  if (valeur === undefined) return '—';
  if (cle === 'livre') return valeur ? '✓' : '—';
  return cle === 'style' ? NOMS_STYLES_IA[valeur] : String(valeur);
}

// Ses reglages, un par ligne, ceux qu'il a seulement (saab, 2026-10-18 : « avoir les
// réglages en une colonne au survol des profils IA ») : « Gain : 800 ».
// Chaque groupe sous son titre (saab, 2026-10-22 : « au survol du menu des profils IA, il n'y a
// pas non plus le code couleur des groupes » — une infobulle n'a pas de couleurs ; moteur/ia-groupes.js).
function lignesDesReglagesIA(profil) {
  const valeurs = valeursReglagesIA(profil);
  const lignes = [];
  let groupeEnCours = null;
  for (const cle of CLES_REGLAGES_IA.filter((autre) => valeurReglageIA(valeurs, autre) !== undefined)) {
    const groupe = groupeDuReglage(cle);
    if (groupe && groupe !== groupeEnCours) lignes.push(`── ${groupe.libelle} ──`);
    groupeEnCours = groupe;
    lignes.push(`${LIBELLES_REGLAGES_IA[cle]} : ${texteReglageIA(cle, valeurReglageIA(valeurs, cle))}`);
    if (cle === 'centreTenu') lignes.push(`${LIBELLE_PROFIL_DU_MILIEU} : ${valeurs.milieu?.profil ?? 'aucun (il garde le sien)'}`);
  }
  return lignes;
}

// Ce qu'un profil IA retient, pour le moteur commun des versions.
const DESCRIPTION_REGLAGES_IA = {
  cles: [...CLES_REGLAGES_IA, CLE_PROFIL_DU_MILIEU],
  valeurs: valeursReglagesIA,
  valeur: (valeurs, cle) => (cle === CLE_PROFIL_DU_MILIEU ? valeurDuProfilDuMilieu(valeurs) : valeurReglageIA(valeurs, cle)),
  libelle: (cle) => (cle === CLE_PROFIL_DU_MILIEU ? LIBELLE_PROFIL_DU_MILIEU : LIBELLES_REGLAGES_IA[cle]),
  texte: (cle, valeur) => (cle === CLE_PROFIL_DU_MILIEU ? nomDuProfilDuMilieu(valeur) : texteReglageIA(cle, valeur)),
};

const memesReglagesIA = (a, b) => memesReglages(DESCRIPTION_REGLAGES_IA, a, b);
// La version 1 d'un profil : ses valeurs actuelles.
const demarrerHistoriqueIA = (profil, date, note) => demarrerHistorique(DESCRIPTION_REGLAGES_IA, profil, date, note);
const versionIA = (profil, numero) => versionDeLHistorique(profil, numero);
const cheminDeVersionIA = (profil) => cheminDeVersion(DESCRIPTION_REGLAGES_IA, profil);
const validerVersionIA = (profil, valeurs, date) => validerVersion(DESCRIPTION_REGLAGES_IA, profil, valeurs, date);
const choisirVersionIA = (profil, numero) => choisirVersion(DESCRIPTION_REGLAGES_IA, profil, numero);
const differencesReglagesIA = (avant, apres) => differencesReglages(DESCRIPTION_REGLAGES_IA, avant, apres);
const lignesHistoriqueIA = (profil) => lignesHistorique(DESCRIPTION_REGLAGES_IA, profil);
const lireHistoriqueIA = (brut) => lireHistorique(DESCRIPTION_REGLAGES_IA, brut);

// Le nom d'un profil d'Entrainement a sa version `numero` (saab, 2026-10-02 : valider une
// retouche change aussi le nom) : le nom de base, suivi de _v<numero> au-dela de la
// premiere. Les profils IA, eux, se nomment par leurs reglages (moteur/noms-ia.js).
const SUFFIXE_VERSION_PROFIL_IA = /_v\d+$/;
const PREMIERE_VERSION_PROFIL_IA = 1;

function nomDeLaVersionIA(nom, numero) {
  const base = nom.replace(SUFFIXE_VERSION_PROFIL_IA, '');
  return numero > PREMIERE_VERSION_PROFIL_IA ? `${base}_v${numero}` : base;
}

// « 2609301410 » -> « 30/09 14:10 » (moteur/historique-reglages.js).
const libelleDateHistoriqueIA = libelleDateHistorique;
