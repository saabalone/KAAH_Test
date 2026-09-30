// L'historique d'un profil IA (saab, 2026-09-30 : « voir l'historique des
// modif d'un fichier, un peu comme les branches de Sequence »). Chaque
// validation ajoute une VERSION du profil, fille de la version courante :
// revenir a une ancienne version puis valider ouvre une branche. Le profil
// porte toujours les valeurs de sa version courante (celles que la machine
// joue) ; l'historique ne sert qu'a comparer et a revenir en arriere. Pur.
//
// Les couleurs des reglages (saab) : orange, retouche pas encore validee ;
// vert, change a la derniere validation ; jaune, change a une validation plus
// ancienne — « le vert indique toujours les dernieres modif, et les jaunes les
// plus anciennes ».
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_POIDS_IA
// (ia-evaluation.js), CLES_POIDS_IA_V2 (ia-evaluation-v2.js), NOMS_STYLES_IA,
// lireMachine (ia.js) viennent de fichiers charges avant celui-ci.

// Ce qu'une version retient, dans l'ordre ou Reglages le montre.
const CLES_REGLAGES_IA = ['version', 'style', ...CLES_POIDS_IA, ...CLES_POIDS_IA_V2];

const LIBELLES_REGLAGES_IA = {
  version: 'Version',
  style: 'Style',
  gain: 'Gain',
  perte: 'Perte',
  centre: 'Centre',
  cohesion: 'Cohésion',
  bordSoi: 'Bord (siennes)',
  bordAdverse: 'Bord (adverses)',
  sumito: 'Sumito',
  menaceEjection: "Menace d'éjection",
  fourchette: 'Fourchette',
};

const NOTE_AVANT_HISTORIQUE_IA = "avant l'historique";

// Version, style et poids, ramenes a des valeurs sures (moteur/ia.js).
function valeursReglagesIA(brut) {
  const { version, style, poids } = lireMachine(brut);
  return { version, style, poids };
}

function valeurReglageIA(valeurs, cle) {
  return cle === 'version' || cle === 'style' ? valeurs[cle] : valeurs.poids[cle];
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

// La couleur de chaque reglage (voir l'en-tete) : 'modifie', 'dernier',
// 'ancien' ou null. `brouillon` : les valeurs des champs, null s'il n'y a
// aucune retouche en cours.
function couleursDesReglagesIA(profil, brouillon) {
  const chemin = cheminDeVersionIA(profil);
  const courante = chemin.at(-1);
  const changeA = (cle, rang) => valeurReglageIA(chemin[rang], cle) !== valeurReglageIA(chemin[rang - 1], cle);
  return Object.fromEntries(
    CLES_REGLAGES_IA.map((cle) => {
      if (brouillon && valeurReglageIA(brouillon, cle) !== valeurReglageIA(courante, cle)) return [cle, 'modifie'];
      if (chemin.length > 1 && changeA(cle, chemin.length - 1)) return [cle, 'dernier'];
      for (let rang = 1; rang < chemin.length - 1; rang++) if (changeA(cle, rang)) return [cle, 'ancien'];
      return [cle, null];
    })
  );
}

function texteReglageIA(cle, valeur) {
  if (valeur === undefined) return '—';
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

// « 2609301410 » (formaterDateKAAWA) -> « 30/09 14:10 ».
function libelleDateHistoriqueIA(date) {
  const morceaux = /^\d{2}(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(date);
  if (!morceaux) return date;
  const [, mois, jour, heure, minute] = morceaux;
  return `${jour}/${mois} ${heure}:${minute}`;
}
