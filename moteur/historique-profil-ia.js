// L'historique d'un profil IA (saab, 2026-09-30 : « voir l'historique des
// modif d'un fichier, un peu comme les branches de Sequence »). Chaque
// validation ajoute une VERSION du profil, fille de la version courante :
// revenir a une ancienne version puis valider ouvre une branche. Le profil
// porte toujours les valeurs de sa version courante (celles que la machine
// joue) ; l'historique ne sert qu'a comparer et a revenir en arriere. Pur.
//
// Les couleurs des reglages (orange, vert, jaune) : moteur/couleurs-profil-ia.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_POIDS_IA_V2
// (ia-evaluation-v2.js), CLES_CASES_IA_V3 (ia-evaluation-v3.js), NOMS_STYLES_IA,
// lireMachine (ia.js) viennent de fichiers charges avant celui-ci.

// Ce qu'une version retient, dans l'ordre ou Reglages le montre.
// Le livre d'ouvertures (saab, 2026-10-03 : colonne Livre apres la Version) et
// l'elagage (saab, 2026-10-02, version « 2el » : moteur/ia-recherche.js)
// suivent la version ; chaque poids de la version 3 (moteur/ia-evaluation-v3.js)
// suit celui qu'il complete : le score apres Gain et Perte, les cases apres le
// Centre, la compacite apres la Cohesion.
const REGLAGES_IA_HORS_POIDS = ['version', 'livre', 'elagage', 'style'];
const CLES_REGLAGES_IA = [
  ...REGLAGES_IA_HORS_POIDS,
  'gain',
  'gainScore',
  'perte',
  'perteScore',
  'centre',
  ...CLES_CASES_IA_V3,
  'cohesion',
  'compacite',
  'bordSoi',
  'bordAdverse',
  ...CLES_POIDS_IA_V2,
  // Le piege de la version 4 (moteur/ia-evaluation-v4.js).
  'piege',
];

const LIBELLES_REGLAGES_IA = {
  version: 'Version',
  livre: 'Livre',
  elagage: 'Élagage',
  style: 'Style',
  gain: 'Gain',
  gainScore: 'Gain (score)',
  perte: 'Perte',
  perteScore: 'Perte (score)',
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
  cohesion: 'Cohésion',
  compacite: 'Compacité',
  // Pas un reglage : le terme des cases, une colonne de l'Essai.
  cases: 'Cases',
  bordSoi: 'Bord (miennes)',
  bordAdverse: 'Bord (adverses)',
  sumito: 'Sumito',
  menaceEjection: "Menace d'éjection",
  fourchette: 'Fourchette',
  piege: 'Piège',
};

const NOTE_AVANT_HISTORIQUE_IA = "avant l'historique";

// Version, livre, elagage, style et poids, ramenes a des valeurs sures (moteur/ia.js).
function valeursReglagesIA(brut) {
  const { version, livre, elagage, style, poids } = lireMachine(brut);
  return { version, livre, elagage, style, poids };
}

function valeurReglageIA(valeurs, cle) {
  return REGLAGES_IA_HORS_POIDS.includes(cle) ? valeurs[cle] : valeurs.poids[cle];
}

function memesReglagesIA(a, b) {
  return CLES_REGLAGES_IA.every((cle) => valeurReglageIA(a, cle) === valeurReglageIA(b, cle));
}

// La version 1 d'un profil : ses valeurs actuelles. `date` : formaterDateKAAWA
// (interface/sauvegarde.js), '' si inconnue ; `note` : d'ou vient le profil.
function demarrerHistoriqueIA(profil, date, note) {
  const premiere = { numero: 1, parent: null, date, note, ...valeursReglagesIA(profil) };
  return { ...profil, historique: [premiere], courante: 1 };
}

function versionIA(profil, numero) {
  return profil.historique.find((version) => version.numero === numero);
}

// Les versions de la premiere a la courante ; un profil sans historique n'en a
// qu'une, lui-meme.
function cheminDeVersionIA(profil) {
  if (!profil.historique) return [valeursReglagesIA(profil)];
  const chemin = [];
  for (let version = versionIA(profil, profil.courante); version; version = versionIA(profil, version.parent)) {
    chemin.unshift(version);
  }
  return chemin;
}

// Valide `valeurs` : une nouvelle version, fille de la courante, qui devient
// le profil. Rien ne change si elles sont deja celles de la courante.
function validerVersionIA(profil, valeurs, date) {
  const nouvelles = valeursReglagesIA(valeurs);
  if (memesReglagesIA(nouvelles, profil)) return profil;
  const base = profil.historique ? profil : demarrerHistoriqueIA(profil, '', NOTE_AVANT_HISTORIQUE_IA);
  const numero = Math.max(...base.historique.map((version) => version.numero)) + 1;
  const version = { numero, parent: base.courante, date, note: '', ...nouvelles };
  return { ...base, ...nouvelles, historique: [...base.historique, version], courante: numero };
}

// Revient a une version de l'historique : le profil reprend ses valeurs.
function choisirVersionIA(profil, numero) {
  const version = versionIA(profil, numero);
  if (!version) return profil;
  return { ...profil, ...valeursReglagesIA(version), courante: numero };
}

function texteReglageIA(cle, valeur) {
  if (valeur === undefined) return '—';
  if (cle === 'livre') return valeur ? '✓' : '—';
  return cle === 'style' ? NOMS_STYLES_IA[valeur] : String(valeur);
}

// « Centre 10→12 », pour chaque reglage qui change de `avant` a `apres`.
function differencesReglagesIA(avant, apres) {
  return CLES_REGLAGES_IA.filter((cle) => valeurReglageIA(avant, cle) !== valeurReglageIA(apres, cle)).map(
    (cle) => `${LIBELLES_REGLAGES_IA[cle]} ${texteReglageIA(cle, valeurReglageIA(avant, cle))}→${texteReglageIA(cle, valeurReglageIA(apres, cle))}`
  );
}

// Les lignes de la boite Historique, dans l'ordre de lecture : chaque version
// suivie de sa premiere fille (la suite de la ligne), les autres filles
// (branches) decalees d'un niveau, comme dans la Sequence.
function lignesHistoriqueIA(profil) {
  const historique = profil.historique ?? [];
  const surLeChemin = new Set(cheminDeVersionIA(profil).map((version) => version.numero));
  const lignes = [];
  function parcourir(version, niveau) {
    const parent = versionIA(profil, version.parent);
    lignes.push({
      numero: version.numero,
      niveau,
      date: version.date,
      note: version.note,
      differences: parent ? differencesReglagesIA(parent, version) : [],
      courante: version.numero === profil.courante,
      surLeChemin: surLeChemin.has(version.numero),
    });
    historique.filter((fille) => fille.parent === version.numero).forEach((fille, rang) => parcourir(fille, rang === 0 ? niveau : niveau + 1));
  }
  historique.filter((version) => version.parent === null).forEach((racine) => parcourir(racine, 0));
  return lignes;
}

// L'historique d'un profil relu (stockage, fichier importe), ou null s'il
// manque ou s'il est abime : numeros entiers uniques, chaque parent anterieur
// a sa fille, une version courante qui existe.
function lireHistoriqueIA(brut) {
  if (!Array.isArray(brut.historique) || brut.historique.length === 0) return null;
  const vus = new Set();
  const historique = [];
  for (const entree of brut.historique) {
    if (!entree || !Number.isInteger(entree.numero) || entree.numero < 1 || vus.has(entree.numero)) return null;
    const parent = entree.parent ?? null;
    if (parent !== null && !(vus.has(parent) && parent < entree.numero)) return null;
    vus.add(entree.numero);
    historique.push({
      numero: entree.numero,
      parent,
      date: typeof entree.date === 'string' ? entree.date : '',
      note: typeof entree.note === 'string' ? entree.note : '',
      ...valeursReglagesIA(entree),
    });
  }
  if (!vus.has(brut.courante)) return null;
  return { historique, courante: brut.courante };
}

// Le nom d'un profil a sa version `numero` (saab, 2026-10-02 : valider une
// retouche change aussi le nom, dans la meme branche de l'historique) : le nom
// de base, suivi de _v<numero> au-dela de la premiere.
const SUFFIXE_VERSION_PROFIL_IA = /_v\d+$/;
const PREMIERE_VERSION_PROFIL_IA = 1;

function nomDeLaVersionIA(nom, numero) {
  const base = nom.replace(SUFFIXE_VERSION_PROFIL_IA, '');
  return numero > PREMIERE_VERSION_PROFIL_IA ? `${base}_v${numero}` : base;
}

// Le nom d'un profil a sa version `numero` (saab, 2026-10-03 : « valider une
// retouche le renomme profil_v2, puis _v3 : Normal devient Normal_v2 ... et
// pour retouche d'un profil avec meme version on ajoute un index : Normal_v2
// devient Normal_v2_(P1) ») : son nom de base (sans version ni indice), puis,
// si un autre profil a deja ce nom (`nomsPris`), son indice `indice`.
const SUFFIXE_INDICE_PROFIL_IA = /_\(P\d+\)$/;

function nomDuProfilALaVersion(nom, numero, indice, nomsPris) {
  const voulu = nomDeLaVersionIA(nom.replace(SUFFIXE_INDICE_PROFIL_IA, ''), numero);
  return nomsPris.includes(voulu) ? `${voulu}_(P${indice})` : voulu;
}

// « 2609301410 » (formaterDateKAAWA) -> « 30/09 14:10 ».
function libelleDateHistoriqueIA(date) {
  const morceaux = /^\d{2}(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(date);
  if (!morceaux) return date;
  const [, mois, jour, heure, minute] = morceaux;
  return `${jour}/${mois} ${heure}:${minute}`;
}
