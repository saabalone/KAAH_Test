// Exporter les recherches de KAI++ gardees (bouton Exporter du tableau
// Recherche par 1er coup), saab 2026-10-05 : « simples, legers et coherents et
// par parties, il suffit de faire la vraie copie de ce qu'il affiche dans la
// colonne laterale en gardant les couleurs, avec au changement de camp une
// ligne affichant le profil ». Une page HTML : par partie (son titre de Mes
// parties), chaque recherche dans l'ordre des coups, son tableau tel que la
// colonne le montre (interface/recherche-ia-lignes.js, memes couleurs), et le
// profil de la machine seulement quand il apparait ou change
// (moteur/archive-recherches.js, sectionsDesRecherches). Elle s'ouvre dans le
// navigateur, s'imprime, et Excel l'ouvre aussi (couleurs comprises).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : sectionsDesRecherches,
// donneesDesRecherchesExportees, ecrireRecherchesDansLaPage,
// lireRecherchesExportees (moteur/archive-recherches.js), importerDansLArchive,
// gardeLesRecherches (interface/stockage-recherches.js), lirePosition (moteur/notation.js),
// numeroDeTour (moteur/arbre.js), nomDeFichierKAAWA (moteur/nom-partie.js),
// CLES_REGLAGES_IA, LIBELLES_REGLAGES_IA, texteReglageIA
// (moteur/historique-profil-ia.js), tableauDeLaRecherche
// (interface/recherche-ia-lignes.js), COLONNES_ESSAI_IA (interface/essai-ia.js),
// listerPartiesEnregistrees, formaterDateKAAWA (interface/sauvegarde.js),
// telechargerTexte (interface/fichiers.js) viennent de fichiers charges avant
// celui-ci.

const FORMAT_DATE_EXPORT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const MARQUES_CAMPS_EXPORT = { noir: '●', blanc: '○' };
const LIBELLES_GENRE_EXPORT = { jeu: '', hypothese: ' (aurait joué)', suggestion: ' (suggestion)' };

// Les couleurs de la colonne laterale (styles.css : .reflexion-ia, .recherche-ia-*).
const STYLE_EXPORT_RECHERCHES = `
body { background: #1e1e1e; color: #e4e4e4; font: 13px sans-serif; margin: 12px; }
h1 { font-size: 18px; }
h2 { font-size: 15px; color: #e4e4e4; border-top: 1px solid #5a5a5a; padding-top: 8px; margin-top: 18px; }
h3 { font-size: 13px; color: #9a9a9a; font-weight: normal; margin: 10px 0 2px; }
.profil { color: #e0832a; margin: 2px 0; }
.profil .reglage { color: #9a9a9a; }
table { border-collapse: collapse; }
th, td { padding: 1px 4px; text-align: left; white-space: nowrap; vertical-align: top; }
th { color: #9a9a9a; font-weight: normal; }
.recherche-ia-profondeur td { padding-top: 4px; color: #e0832a; font-weight: bold; white-space: normal; }
.recherche-ia-choisi .recherche-ia-coup { color: #3fcf7a; font-weight: bold; }
.essai-position-actuelle td { color: #9a9a9a; font-style: italic; }
`;

// Ce qui ne sert qu'a l'ecran : les infobulles, les classes des clics.
const ATTRIBUTS_INUTILES_EXPORT = / title="[^"]*"/g;
const CLASSES_INUTILES_EXPORT = / ?(sequence-prevue-cliquable|sequence-prevue)/g;

const echapperHtml = (texte) => String(texte).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Le profil de la machine, une fois : son nom, sa version, son temps, chacun de
// ses reglages.
function ligneDuProfil(recherche) {
  const poids = recherche.poids ?? {};
  const reglages = CLES_REGLAGES_IA.filter((cle) => cle in poids).map(
    (cle) => `${echapperHtml(COLONNES_ESSAI_IA[cle] ?? LIBELLES_REGLAGES_IA[cle])} <span class="reglage">${echapperHtml(texteReglageIA(cle, poids[cle]))}</span>`
  );
  const entete = [`${MARQUES_CAMPS_EXPORT[recherche.camp] ?? ''} ${echapperHtml(recherche.machine)}`];
  if (recherche.version) entete.push(`IA version ${recherche.version}`);
  if (Number.isFinite(recherche.reflexionMax)) entete.push(`${String(recherche.reflexionMax).replace('.', ',')} s max`);
  return `<p class="profil">${[...entete, ...reglages].join(' · ')}</p>`;
}

// Le tableau d'une recherche, tel que la colonne le montre.
function tableauExporte(cle, recherche) {
  const [position, joueurAuTrait] = cle.split('|');
  const etat = { ...lirePosition(position), joueurAuTrait };
  const { entete, lignes } = tableauDeLaRecherche(recherche.details ?? [], { etat, poids: recherche.poids, version: recherche.version, reflexionMax: recherche.reflexionMax, coupActif: null }, () => {});
  // Leger : sans les infobulles ni les classes qui ne servent qu'a l'ecran.
  const html = `<table><thead>${entete.outerHTML}</thead><tbody>${lignes.map((ligne) => ligne.outerHTML).join('')}</tbody></table>`;
  return html.replace(ATTRIBUTS_INUTILES_EXPORT, '').replace(CLASSES_INUTILES_EXPORT, '').replaceAll(' class=""', '');
}

// Le titre de la partie dans Mes parties, ou null si elle n'y est pas.
function titreDansMesParties(idPartie, parties) {
  const partie = parties.find((entree) => entree.id === idPartie);
  return partie ? nomDeFichierKAAWA(partie.donnees) : null;
}

// La page porte aussi ses recherches en donnees, pour les reimporter (saab,
// 2026-10-06 ; moteur/archive-recherches.js) : chacune avec le titre de sa
// partie, qui servira aussi de titre chez celui qui l'importe.
function pageDesRecherches(archive) {
  const parties = listerPartiesEnregistrees();
  const donnees = donneesDesRecherchesExportees(archive, (idPartie) => titreDansMesParties(idPartie, parties));
  const titreDe = (idPartie, recherches) => recherches[0]?.recherche.titrePartie ?? titreDansMesParties(idPartie, parties) ?? `Partie ${idPartie || 'inconnue'}`;
  const morceaux = sectionsDesRecherches({ positions: Object.fromEntries(Object.entries(donnees.positions).map(([cle, recherches]) => [cle, { recherches }])) }).map(({ idPartie, recherches }) => {
    const blocs = recherches.map(({ cle, recherche, profilChange }) => {
      const titre = `${numeroDeTour(recherche.coupsJoues)} ${MARQUES_CAMPS_EXPORT[recherche.camp] ?? ''} ${recherche.machine}${LIBELLES_GENRE_EXPORT[recherche.genre] ?? ''} — ${FORMAT_DATE_EXPORT.format(recherche.date)}`;
      return `${profilChange ? ligneDuProfil(recherche) : ''}<h3>${echapperHtml(titre)}</h3>${tableauExporte(cle, recherche)}`;
    });
    return `<h2>${echapperHtml(titreDe(idPartie, recherches))}</h2>${blocs.join('')}`;
  });
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Recherches de KAI++</title><style>${STYLE_EXPORT_RECHERCHES}</style></head><body><h1>Recherches de KAI++</h1>${morceaux.join('')}${ecrireRecherchesDansLaPage(donnees)}</body></html>`;
}

function exporterLesRecherches(archive) {
  telechargerTexte(pageDesRecherches(archive), `recherches_kaah_${formaterDateKAAWA(new Date())}.html`, 'text/html');
}

// Reimporter une page exportee (saab, 2026-10-06 : « si j'exporte un fichier
// 1er coup, il faudrait que je puisse aussi l'importer si je veux revoir la
// partie ») : ses recherches rejoignent l'archive, rangees par position —
// naviguer dans la partie les montre, sans nom a chercher ni a retaper. Un
// message dit combien ; faux si ce n'est pas une page de recherches.
function importerPageDesRecherches(texte, nomFichier) {
  const importees = lireRecherchesExportees(texte);
  if (!importees) {
    window.alert(`« ${nomFichier} » n'est pas un fichier de recherches 1er coup exporté par KAAH.`);
    return false;
  }
  const ajoutees = importerDansLArchive(importees);
  const conseil = gardeLesRecherches() ? '' : ' Elles ne servent que le temps de cette ouverture : cochez « Garder » pour les garder sur cet appareil.';
  window.alert(`${ajoutees} recherche(s) importée(s) de « ${nomFichier} »${ajoutees === 0 ? ' (déjà toutes là)' : ''} : elles s'affichent en naviguant dans leur partie.${conseil}`);
  return true;
}
