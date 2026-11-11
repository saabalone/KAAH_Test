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
  phasesAuScore: 'Phases au score : billes sorties pour le milieu (Ph)',
  avancePourLaFinEnAvance: "Fin en avance dès ces billes d'avance (Fa)",
  niveauMortSubite: 'Mort subite : niveau, sans élagage (Ms)',
  groupesSepares: 'Groupes séparés (Gs)',
  sumitoContre: 'Sumito 3/2 contré (Sc)',
  billesPoussables: 'Billes poussables (Bp)',
  billesMultipoussables: 'Billes multipoussables (Bmp)',
  billesPoussablesBord: 'Billes poussables au bord (Bpb)',
  billesEjectables: 'Billes éjectables (Be)',
  billesMultiejectables: 'Billes multiéjectables (Bme)',
  billesPousseesAEffet: 'Billes poussées à effet (Bpe)',
  pousseesRetournees: 'Poussées qui se retournent (Pr)',
  ejectionTot: 'Éjection au plus tôt (Et)',
  ejectionTotSansEchange: 'Et, pas pour un échange (Ech)',
  pousseeRetournableJouee: 'Poussée retournable jouée (Prj)',
  pousseeRetournableJoueeMachineSeule: 'Prj, pour la machine seulement (Prk)',
  menaceDeCoupure: 'Menace de coupure (Mc)',
  anglesDeTriangles: 'Angles de triangles (At)',
  billesHorsDuGroupePrincipal: 'Hors du groupe principal (Hp)',
  billesHorsDuGroupeSelonLEcart: "Hors du groupe, par bille d'écart au score (He)",
  lignesSurLeCoin: 'Coin du bloc adverse (Co)',
  lignesQuiPoussentLeCoin: 'Coin attaqué (Ca)',
  centreAdverse: 'Centre adverse (Ce)',
  controleDuCentre: 'Contrôle du centre (Cc)',
  billesAmies: 'Billes amies (Ba)',
  elagageDebut: 'Élagage au début (Ed)',
  elagageDebutPlis: 'Ed, demi-coups (Dp)',
  repetitionsGardees: 'Répétitions gardées (Nr)',
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
  const machine = lireMachine(brut);
  const { version, livre, elagage, style, poids } = machine;
  return { version, livre, elagage, style, poids, ...Object.fromEntries(CLES_DES_COPIES_DES_PHASES.filter((cle) => machine[cle]).map((cle) => [cle, machine[cle]])) };
}

// Les copies des phases (les ajouts Ct et Ph, moteur/ia-phase.js) : un reglage de plus chacune pour l'historique — sa
// copie entiere, qu'une autre copie (un autre profil, ou le meme retouche) change.
const LIBELLES_DES_COPIES_DES_PHASES = { milieu: 'Profil du milieu', fin: 'Profil de fin', finEnAvance: 'Profil de fin, en avance' };
const CLES_DES_COPIES_DES_PHASES = Object.keys(LIBELLES_DES_COPIES_DES_PHASES);
const estUneCopieDePhase = (cle) => CLES_DES_COPIES_DES_PHASES.includes(cle);
const valeurDUneCopieDePhase = (valeurs, cle) => (valeurs[cle] ? JSON.stringify(valeurs[cle]) : undefined);
const nomDUneCopieDePhase = (valeur) => (valeur === undefined ? '—' : JSON.parse(valeur).profil);

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
    if (cle === 'centreTenu') lignes.push(`${LIBELLES_DES_COPIES_DES_PHASES.milieu} : ${valeurs.milieu?.profil ?? 'aucun (il garde le sien)'}`);
    if (cle === 'phasesAuScore') for (const copie of CLES_DES_COPIES_DES_PHASES) lignes.push(`${LIBELLES_DES_COPIES_DES_PHASES[copie]} : ${valeurs[copie]?.profil ?? 'aucun'}`);
  }
  return lignes;
}

// Ce qu'un profil IA retient, pour le moteur commun des versions.
const DESCRIPTION_REGLAGES_IA = {
  cles: [...CLES_REGLAGES_IA, ...CLES_DES_COPIES_DES_PHASES],
  valeurs: valeursReglagesIA,
  valeur: (valeurs, cle) => (estUneCopieDePhase(cle) ? valeurDUneCopieDePhase(valeurs, cle) : valeurReglageIA(valeurs, cle)),
  libelle: (cle) => (estUneCopieDePhase(cle) ? LIBELLES_DES_COPIES_DES_PHASES[cle] : LIBELLES_REGLAGES_IA[cle]),
  texte: (cle, valeur) => (estUneCopieDePhase(cle) ? nomDUneCopieDePhase(valeur) : texteReglageIA(cle, valeur)),
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

// Le _v d'une version (saab, 2026-11-04 : « je ne retrouve plus le profile v5El10LsP5M9_v4_h9, avec histo
// IA je vois v5El10LsP5M9_h9, pourquoi _v4 n'y est pas ? ») : le numero du jeu de poids dans sa famille
// change avec les ajouts, le profil ne porte que celui de sa version courante. Une version le retient donc
// quand le profil la quitte.
const retenirLeNumeroDePoidsDeLaVersionIA = (historique, numero, numeroDePoids) => historique.map((version) => (version.numero === numero ? { ...version, numeroDePoids } : version));

function memesPoidsQueLaVersionIA(machine, version) {
  const { poids } = lireMachine(machine);
  return REGLAGES_DANS_L_ORDRE_DES_GROUPES_IA.every((cle) => poids[cle] === version.poids[cle]);
}

// La machine d'une partie jouee par cette version, a sa version courante d'alors. Une ancienne version
// choisie (versionHistorique) portait le _v du profil de ce moment, pas le sien ; les poids ecartent un
// indice repris depuis par un autre profil (moteur/profils-ia.js, prochainIndiceProfilIA).
function machineJoueeALaVersionIA(machine, profil, version) {
  if (!machine?.numeroDePoids || machine.versionHistorique || machine.indiceProfil !== profil.indice) return false;
  if ((machine.versionProfil ?? PREMIERE_VERSION_DU_PROFIL_IA) !== version.numero) return false;
  return memesPoidsQueLaVersionIA(machine, version);
}

// Le profil d'une machine en jeu, null s'il n'existe plus (saab, 2026-11-05 : « je viens de changer en ph2 dans Réglages IA, puis dans
// boite joueur IA je vois profil IA avec ph1 mais pas de ph2 ») : valider une retouche peut renommer le profil, sa machine garde l'ancien
// nom. Alors son indice, si la version qu'elle joue y a les memes poids : un indice peut avoir ete repris par un autre profil.
function profilDeLaMachine(machine, profils) {
  const deCeNom = profils.find((profil) => profil.nom === machine.profil);
  if (deCeNom || !machine.indiceProfil) return deCeNom ?? null;
  const numero = machine.versionProfil ?? PREMIERE_VERSION_DU_PROFIL_IA;
  return (
    profils.find((profil) => {
      const version = profil.indice === machine.indiceProfil ? profil.historique?.find((autre) => autre.numero === numero) : null;
      return version && memesPoidsQueLaVersionIA(machine, version);
    }) ?? null
  );
}

// Le _v de la version `numero`, ou null si rien ne le dit. Une version quittee avant qu'on le retienne le
// retrouve dans la derniere partie qu'elle a jouee (son fichier garde la machine entiere). `lireParties()` :
// Mes parties, lues seulement s'il le faut.
function numeroDePoidsDeLaVersionIA(profil, numero, lireParties) {
  const version = versionIA(profil, numero);
  if (!version) return null;
  if (version.numeroDePoids) return version.numeroDePoids;
  let trouve = null;
  let dateTrouvee = '';
  for (const { donnees } of lireParties()) {
    for (const machine of Object.values(donnees.Machines ?? {})) {
      if (machineJoueeALaVersionIA(machine, profil, version) && donnees.Date >= dateTrouvee) {
        trouve = machine.numeroDePoids;
        dateTrouvee = donnees.Date;
      }
    }
  }
  return trouve;
}

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
