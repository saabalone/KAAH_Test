// Les recherches de KAI++ par premier coup (interface/recherche-ia.js),
// gardees a part des parties (saab, 2026-10-02 : « il faut enregistrer les
// tableaux, a part de la partie mais avec un lien, pour les revoir a la
// navigation et comparer, et on pourra voir si on peut elaguer »). Le lien :
// la position (sa cle, moteur/sequence-prevue.js, cleDeSolution) — revenir
// sur une position, dans cette partie ou une autre, montre ce que la machine
// y a cherche — et, dans chaque recherche, la partie et le coup d'ou elle
// vient. Pur, sans stockage : l'interface lit et ecrit l'archive.
//
// Une archive : { positions: { cle: { rang, recherches (la plus recente en
// premier) } }, rang } — `rang` grandit a chaque ajout : la position au plus
// petit rang est la plus ancienne, oubliee la premiere quand l'archive devient
// trop volumineuse.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const RECHERCHES_PAR_POSITION_MAX = 5;
// En caracteres de son texte JSON : une part raisonnable du stockage du
// navigateur, que les parties partagent.
const TAILLE_ARCHIVE_RECHERCHES_MAX = 1500000;
const ARCHIVE_RECHERCHES_VIDE = Object.freeze({ positions: {}, rang: 0 });

// `recherche` : { machine (son nom), date, idPartie, coupsJoues, camp, details
// (interface/ia-reflexion.js, detailEnTextes : une entree par profondeur) }.
function ajouterRecherche(archive, cle, recherche, tailleMax = TAILLE_ARCHIVE_RECHERCHES_MAX) {
  const rang = archive.rang + 1;
  const anciennes = archive.positions[cle]?.recherches ?? [];
  const positions = { ...archive.positions, [cle]: { rang, recherches: [recherche, ...anciennes].slice(0, RECHERCHES_PAR_POSITION_MAX) } };
  return resserrer(positions, rang, [cle], tailleMax);
}

// Trop volumineuse : oublier les positions les plus anciennes, jamais celles de
// `aGarder` (`positions` est une copie, modifiable).
function resserrer(positions, rang, aGarder, tailleMax) {
  const plusAnciennes = Object.keys(positions)
    .filter((autre) => !aGarder.includes(autre))
    .sort((a, b) => positions[a].rang - positions[b].rang);
  let resultat = { positions, rang };
  while (plusAnciennes.length > 0 && JSON.stringify(resultat).length > tailleMax) {
    delete positions[plusAnciennes.shift()];
    resultat = { positions, rang };
  }
  return resultat;
}

// Ajouter des recherches importees (`importees` : { cle: [recherche] }, lu par
// lireRecherchesExportees) : a leur position, sans doublon (meme machine, meme
// camp, meme date), les plus recentes d'abord. Trop volumineuse, l'archive
// oublie les plus anciennes — la derniere position importee reste. Renvoie
// { archive, ajoutees }.
const identiteDeLaRecherche = (recherche) => `${recherche.date}|${recherche.machine}|${recherche.camp}`;

function fusionnerRecherches(archive, importees, tailleMax = TAILLE_ARCHIVE_RECHERCHES_MAX) {
  const positions = { ...archive.positions };
  let rang = archive.rang;
  let ajoutees = 0;
  let derniere = null;
  for (const [cle, recherches] of Object.entries(importees)) {
    const anciennes = positions[cle]?.recherches ?? [];
    const connues = new Set(anciennes.map(identiteDeLaRecherche));
    const neuves = recherches.filter((recherche) => !connues.has(identiteDeLaRecherche(recherche)));
    if (neuves.length === 0) continue;
    ajoutees += neuves.length;
    rang += 1;
    derniere = cle;
    positions[cle] = { rang, recherches: [...neuves, ...anciennes].sort((a, b) => b.date - a.date).slice(0, RECHERCHES_PAR_POSITION_MAX) };
  }
  if (derniere === null) return { archive, ajoutees };
  return { archive: resserrer(positions, rang, [derniere], tailleMax), ajoutees };
}

// La page exportee (interface/export-recherches.js) porte aussi ses recherches,
// en donnees, pour les reimporter (saab, 2026-10-06) : { format, positions },
// chaque recherche avec le titre de sa partie (`titreDe(idPartie)`, Mes
// parties, ou celui qu'elle avait deja) — chez celui qui l'importe, la partie
// n'existe pas sous le meme identifiant.
const FORMAT_RECHERCHES_EXPORTEES = 'kaah-recherches-1';
const BALISE_RECHERCHES_EXPORTEES = '<script type="application/json" id="recherches-kaah">';

function donneesDesRecherchesExportees(archive, titreDe) {
  const positions = Object.fromEntries(
    Object.entries(archive.positions).map(([cle, { recherches }]) => [
      cle,
      recherches.map((recherche) => {
        const titrePartie = titreDe(recherche.idPartie) ?? recherche.titrePartie;
        return titrePartie ? { ...recherche, titrePartie } : recherche;
      }),
    ])
  );
  return { format: FORMAT_RECHERCHES_EXPORTEES, positions };
}

// En JSON dans la page : « < » echappe, le texte ne ferme jamais la balise.
function ecrireRecherchesDansLaPage(donnees) {
  return `${BALISE_RECHERCHES_EXPORTEES}${JSON.stringify(donnees).replaceAll('<', '\\u003c')}</script>`;
}

// Les recherches d'une page exportee ({ cle: [recherche] }), ou null si ce n'en
// est pas une.
function lireRecherchesExportees(texte) {
  const debut = texte.indexOf(BALISE_RECHERCHES_EXPORTEES);
  if (debut < 0) return null;
  const fin = texte.indexOf('</script>', debut);
  try {
    const donnees = JSON.parse(texte.slice(debut + BALISE_RECHERCHES_EXPORTEES.length, fin));
    return donnees.format === FORMAT_RECHERCHES_EXPORTEES && donnees.positions ? donnees.positions : null;
  } catch {
    return null;
  }
}

function recherchesDeLaPosition(archive, cle) {
  return archive.positions[cle]?.recherches ?? [];
}

// L'archive par parties, pour l'exporter (saab, 2026-10-05 : « simples, legers
// et coherents et par parties ... la vraie copie de ce qu'il affiche dans la
// colonne laterale ... au changement de camp une ligne affichant le profil ») :
// [{ idPartie, recherches: [{ cle, recherche, profilChange }] }] — la partie
// commencee la premiere d'abord, ses recherches dans l'ordre des coups ;
// `profilChange` : la premiere recherche d'un camp dans la partie, ou sa
// machine (nom, poids) a change depuis la precedente — le profil se dit la,
// une seule fois, au lieu d'etre repete partout.
const PARTIE_INCONNUE = '';

function sectionsDesRecherches(archive) {
  const toutes = Object.entries(archive.positions).flatMap(([cle, { recherches }]) => recherches.map((recherche) => ({ cle, recherche })));
  const parPartie = new Map();
  for (const entree of toutes) {
    const id = entree.recherche.idPartie ?? PARTIE_INCONNUE;
    if (!parPartie.has(id)) parPartie.set(id, []);
    parPartie.get(id).push(entree);
  }
  const debut = (entrees) => Math.min(...entrees.map(({ recherche }) => recherche.date));
  return [...parPartie.entries()]
    .sort(([, a], [, b]) => debut(a) - debut(b))
    .map(([idPartie, entrees]) => {
      entrees.sort((a, b) => a.recherche.coupsJoues - b.recherche.coupsJoues || a.recherche.date - b.recherche.date);
      const profilDuCamp = {};
      const recherches = entrees.map(({ cle, recherche }) => {
        const profil = JSON.stringify([recherche.machine, recherche.poids ?? null]);
        const profilChange = profilDuCamp[recherche.camp] !== profil;
        profilDuCamp[recherche.camp] = profil;
        return { cle, recherche, profilChange };
      });
      return { idPartie, recherches };
    });
}

// Combien de positions `apres` (un ajout de `cle` a `avant`, ajouterRecherche)
// a oubliees faute de place (saab, 2026-10-03 : « une alerte si c'est plein ...
// demander si on veut exporter ») : a savoir avant de l'ecrire.
function positionsOubliees(avant, apres, cle) {
  const attendues = Object.keys(avant.positions).length + (cle in avant.positions ? 0 : 1);
  return attendues - Object.keys(apres.positions).length;
}
