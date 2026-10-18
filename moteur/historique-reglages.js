// L'HISTORIQUE DES REGLAGES, commun aux profils IA (moteur/historique-profil-ia.js)
// et aux profils d'Entrainement (moteur/entrainement-profil.js) — saab,
// 2026-10-08 : « comme les profils IA avec histo » ; « commun mais si ça
// dérègle qq chose on verra ». Chaque validation ajoute une VERSION, fille de la
// version courante : revenir a une ancienne version puis valider ouvre une
// branche (« un peu comme les branches de Sequence », saab 2026-09-30). L'objet
// porte toujours les valeurs de sa version courante ; l'historique ne sert qu'a
// comparer et a revenir en arriere. Les couleurs : orange, une retouche pas
// encore validee ; vert, change a la derniere validation ; jaune, a une plus
// ancienne. Pur.
//
// `description` : ce qui differe d'un genre de reglages a l'autre —
//   { cles (dans l'ordre d'affichage), valeurs(brut) (les valeurs sures que retient
//     une version), valeur(valeurs, cle), libelle(cle), texte(cle, valeur) }.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const NOTE_AVANT_HISTORIQUE = "avant l'historique";

function memesReglages(description, a, b) {
  return description.cles.every((cle) => description.valeur(a, cle) === description.valeur(b, cle));
}

// « Centre 10→12 », pour chaque reglage qui change de `avant` a `apres`.
function differencesReglages(description, avant, apres) {
  return description.cles
    .filter((cle) => description.valeur(avant, cle) !== description.valeur(apres, cle))
    .map((cle) => `${description.libelle(cle)} ${description.texte(cle, description.valeur(avant, cle))}→${description.texte(cle, description.valeur(apres, cle))}`);
}

// La version 1 : les valeurs actuelles de `objet`. `date` : formaterDateKAAWA
// (interface/sauvegarde.js), '' si inconnue ; `note` : d'ou vient l'objet.
function demarrerHistorique(description, objet, date, note) {
  const premiere = { numero: 1, parent: null, date, note, ...description.valeurs(objet) };
  return { ...objet, historique: [premiere], courante: 1 };
}

function versionDeLHistorique(objet, numero) {
  return objet.historique.find((version) => version.numero === numero);
}

// Les versions de la premiere a la courante ; sans historique, une seule : l'objet.
function cheminDeVersion(description, objet) {
  if (!objet.historique) return [description.valeurs(objet)];
  const chemin = [];
  for (let version = versionDeLHistorique(objet, objet.courante); version; version = versionDeLHistorique(objet, version.parent)) {
    chemin.unshift(version);
  }
  return chemin;
}

// Valide `valeurs` : une nouvelle version, fille de la courante, qui devient
// l'objet. Rien ne change si elles sont deja celles de la courante.
function validerVersion(description, objet, valeurs, date) {
  const nouvelles = description.valeurs(valeurs);
  if (memesReglages(description, nouvelles, objet)) return objet;
  const base = objet.historique ? objet : demarrerHistorique(description, objet, '', NOTE_AVANT_HISTORIQUE);
  const numero = Math.max(...base.historique.map((version) => version.numero)) + 1;
  const version = { numero, parent: base.courante, date, note: '', ...nouvelles };
  return { ...base, ...nouvelles, historique: [...base.historique, version], courante: numero };
}

// Revient a une version de l'historique : l'objet reprend ses valeurs.
function choisirVersion(description, objet, numero) {
  const version = versionDeLHistorique(objet, numero);
  if (!version) return objet;
  return { ...objet, ...description.valeurs(version), courante: numero };
}

// Les lignes de la boite Historique, dans l'ordre de lecture : chaque version
// suivie de sa premiere fille (la suite de la ligne), les autres filles
// (branches) decalees d'un niveau, comme dans la Sequence.
function lignesHistorique(description, objet) {
  const historique = objet.historique ?? [];
  const surLeChemin = new Set(cheminDeVersion(description, objet).map((version) => version.numero));
  const lignes = [];
  function parcourir(version, niveau) {
    const parent = versionDeLHistorique(objet, version.parent);
    lignes.push({
      numero: version.numero,
      niveau,
      date: version.date,
      note: version.note,
      differences: parent ? differencesReglages(description, parent, version) : [],
      courante: version.numero === objet.courante,
      surLeChemin: surLeChemin.has(version.numero),
    });
    historique.filter((fille) => fille.parent === version.numero).forEach((fille, rang) => parcourir(fille, rang === 0 ? niveau : niveau + 1));
  }
  historique.filter((version) => version.parent === null).forEach((racine) => parcourir(racine, 0));
  return lignes;
}

// Un historique relu (stockage, fichier importe), ou null s'il manque ou s'il
// est abime : numeros entiers uniques, chaque parent anterieur a sa fille, une
// version courante qui existe.
function lireHistorique(description, brut) {
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
      ...description.valeurs(entree),
    });
  }
  if (!vus.has(brut.courante)) return null;
  return { historique, courante: brut.courante };
}

// De la plus forte a la plus faible.
const COULEURS_DE_LA_PLUS_FORTE = ['modifie', 'dernier', 'ancien'];

function couleurLaPlusForte(couleurs) {
  const presentes = new Set(couleurs);
  return COULEURS_DE_LA_PLUS_FORTE.find((couleur) => presentes.has(couleur)) ?? null;
}

// La couleur de chaque reglage : 'modifie', 'dernier', 'ancien' ou null.
// `brouillon` : les valeurs des champs, null s'il n'y a aucune retouche en cours.
function couleursDesReglages(description, objet, brouillon) {
  const chemin = cheminDeVersion(description, objet);
  const courante = chemin.at(-1);
  const changeA = (cle, rang) => description.valeur(chemin[rang], cle) !== description.valeur(chemin[rang - 1], cle);
  return Object.fromEntries(
    description.cles.map((cle) => {
      if (brouillon && description.valeur(brouillon, cle) !== description.valeur(courante, cle)) return [cle, 'modifie'];
      if (chemin.length > 1 && changeA(cle, chemin.length - 1)) return [cle, 'dernier'];
      for (let rang = 1; rang < chemin.length - 1; rang++) if (changeA(cle, rang)) return [cle, 'ancien'];
      return [cle, null];
    })
  );
}

// « 2609301410 » (formaterDateKAAWA) -> « 30/09 14:10 ».
function libelleDateHistorique(date) {
  const morceaux = /^\d{2}(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(date);
  if (!morceaux) return date;
  const [, mois, jour, heure, minute] = morceaux;
  return `${jour}/${mois} ${heure}:${minute}`;
}
