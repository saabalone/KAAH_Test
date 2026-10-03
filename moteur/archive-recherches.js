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
  const plusAnciennes = Object.keys(positions)
    .filter((autre) => autre !== cle)
    .sort((a, b) => positions[a].rang - positions[b].rang);
  let resultat = { positions, rang };
  while (plusAnciennes.length > 0 && JSON.stringify(resultat).length > tailleMax) {
    delete positions[plusAnciennes.shift()];
    resultat = { positions, rang };
  }
  return resultat;
}

function recherchesDeLaPosition(archive, cle) {
  return archive.positions[cle]?.recherches ?? [];
}

// L'archive en tableau (saab, 2026-10-03 : « le btn Exporter pour voir les
// fichiers ») : l'en-tete, puis une ligne par premier coup de chaque
// profondeur de chaque recherche, les plus anciennes positions d'abord ; ce
// qui vaut pour toute la recherche (machine, reglages) ou toute la profondeur
// est repete sur chaque ligne, pour trier et filtrer dans un tableur.
const COLONNES_DES_RECHERCHES = [
  'Partie', 'Date', 'Coup', 'Camp', 'Machine', 'Genre', 'Temps max (s)', 'Poids', 'Position',
  'Profondeur', 'Premiers coups', 'Positions (prof.)', 'Durée prof. (ms)', 'Finie à (ms)',
  'Rang', '1er coup', 'Éval.', 'Exacte', 'Temps (ms)', 'Sous lui (ms)', 'Positions', 'Suite prévue',
];

const deuxChiffres = (nombre) => String(nombre).padStart(2, '0');

function texteDeLaDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())} ${deuxChiffres(d.getHours())}:${deuxChiffres(d.getMinutes())}`;
}

const texteDesPoids = (poids) => (poids ? Object.entries(poids).map(([cle, valeur]) => `${cle} ${valeur}`).join(', ') : '');

function tableauDesRecherches(archive) {
  const cles = Object.keys(archive.positions).sort((a, b) => archive.positions[a].rang - archive.positions[b].rang);
  const lignes = [];
  for (const cle of cles) {
    for (const recherche of [...archive.positions[cle].recherches].reverse()) {
      const communes = [recherche.idPartie ?? '', texteDeLaDate(recherche.date), recherche.coupsJoues, recherche.camp, recherche.machine, recherche.genre ?? '', recherche.reflexionMax ?? '', texteDesPoids(recherche.poids), cle];
      for (const { profondeur, coups, noeuds, ms, fin, lignes: meilleurs } of recherche.details) {
        meilleurs.forEach(({ valeur, exacte, noeuds: sous, ms: duree, fin: trouve, sequence }, rang) => {
          lignes.push([...communes, profondeur, coups, noeuds, ms ?? '', fin ?? '', rang + 1, sequence[0] ?? '', valeur, exacte ? 'oui' : 'non', trouve ?? '', duree ?? '', sous, sequence.slice(1).join(' ')]);
        });
      }
    }
  }
  return [COLONNES_DES_RECHERCHES, ...lignes];
}

// Un tableau en texte CSV pour un tableur en francais (Excel, LibreOffice) :
// point-virgule entre les colonnes, virgule decimale, guillemets autour d'un
// texte qui contient un point-virgule, un guillemet ou un retour a la ligne.
const SEPARATEUR_CSV = ';';
const FIN_DE_LIGNE_CSV = '\r\n';

function celluleCsv(valeur) {
  if (typeof valeur === 'number') return String(valeur).replace('.', ',');
  const texte = String(valeur);
  return /[;"\r\n]/.test(texte) ? `"${texte.replaceAll('"', '""')}"` : texte;
}

function ecrireCsv(lignes) {
  return lignes.map((ligne) => ligne.map(celluleCsv).join(SEPARATEUR_CSV) + FIN_DE_LIGNE_CSV).join('');
}

// Combien de positions `apres` (un ajout de `cle` a `avant`, ajouterRecherche)
// a oubliees faute de place (saab, 2026-10-03 : « une alerte si c'est plein ...
// demander si on veut exporter ») : a savoir avant de l'ecrire.
function positionsOubliees(avant, apres, cle) {
  const attendues = Object.keys(avant.positions).length + (cle in avant.positions ? 0 : 1);
  return attendues - Object.keys(apres.positions).length;
}
