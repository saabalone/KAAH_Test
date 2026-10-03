// Les lignes du tableau Recherche par 1er coup (interface/recherche-ia.js, qui
// choisit QUELLE recherche montrer) : pour chaque profondeur finie, la plus
// profonde en haut, combien de premiers coups, de positions et de temps ; puis
// les 10 meilleurs premiers coups — leur valeur (« ≤ » : ecarte par l'elagage,
// il vaut au plus cela), quand sa sequence a ete trouvee depuis le debut de la
// reflexion (saab, 2026-10-03 : « combien il passe pour trouver la sequence »),
// le temps et les positions passes sous lui, ce que sa sequence entiere change
// a chaque poids (saab, 2026-10-02 : « les colonnes Temps et Gain, Perte,
// Centre, Cohes. etc. comme dans Essai, qui donneront une meilleure vision de
// ce qui varie »), sa suite. Chaque titre de colonne dit son reglage entre
// parentheses : le temps max, la valeur de chaque poids.
//
// Toucher un premier coup ou sa suite montre la sequence sur un petit plateau
// (comme dans Reflexion IA) ; le coup joue depuis cette position est encadre.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : libelleEvaluation
// (moteur/ia.js), CLES_POIDS_IA (moteur/ia-evaluation.js), CLES_POIDS_IA_V2
// (moteur/ia-evaluation-v2.js), LIBELLES_REGLAGES_IA (moteur/historique-profil-ia.js),
// detailDeLEvaluation, ecartsDeLaSequence (moteur/essai-ia.js),
// COLONNES_ESSAI_IA, texteValeurEssai (interface/essai-ia.js) viennent de
// fichiers charges avant celui-ci, ou ne servent qu'une fois la page chargee.

const POURCENT_RECHERCHE_IA = 100;
const MILLISECONDES_PAR_SECONDE_RECHERCHE = 1000;
const DECIMALES_TEMPS_RECHERCHE = 1;
const FORMAT_DES_NOMBRES = new Intl.NumberFormat('fr-FR');
// #, 1er coup, Eval., Temps, Sous lui, Positions ... Suite prevue : les colonnes autour des poids.
const COLONNES_FIXES_RECHERCHE = 7;

function partEnPourcent(partie, total) {
  return total > 0 ? `${Math.round((partie / total) * POURCENT_RECHERCHE_IA)} %` : '';
}

// Une recherche gardee avant cette colonne n'a pas de temps.
function texteDuTempsRecherche(ms) {
  if (!Number.isFinite(ms)) return '';
  return ms < MILLISECONDES_PAR_SECONDE_RECHERCHE ? `${ms} ms` : `${(ms / MILLISECONDES_PAR_SECONDE_RECHERCHE).toFixed(DECIMALES_TEMPS_RECHERCHE)} s`;
}

// Les poids de la machine qui a cherche ; aucun pour une recherche gardee
// avant ces colonnes.
function clesDesPoidsRecherche({ poids, version }) {
  if (!poids) return [];
  return version >= 2 ? [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2] : CLES_POIDS_IA;
}

function celluleRecherche(texte, classe, balise = 'td') {
  const cellule = document.createElement(balise);
  cellule.textContent = texte;
  if (classe) cellule.className = classe;
  return cellule;
}

// Le reglage d'une colonne, entre parentheses ; rien s'il est inconnu (une
// recherche gardee avant).
const entreParentheses = (valeur) => (valeur === undefined ? '' : ` (${valeur})`);
const texteDuTempsMax = (secondes) => (Number.isFinite(secondes) ? `${String(secondes).replace('.', ',')} s` : undefined);

function enteteDeLaRecherche(cles, { poids, reflexionMax }) {
  const tr = document.createElement('tr');
  const temps = celluleRecherche(`Temps${entreParentheses(texteDuTempsMax(reflexionMax))}`, '', 'th');
  temps.title = 'Quand cette séquence a été trouvée, depuis le début de la réflexion (entre parenthèses : son temps max)';
  const sousLui = celluleRecherche('Sous lui', '', 'th');
  sousLui.title = 'Le temps passé à chercher sous ce premier coup, à cette profondeur';
  tr.append(
    ...['#', '1er coup', 'Éval.'].map((texte) => celluleRecherche(texte, '', 'th')),
    temps,
    sousLui,
    celluleRecherche('Positions', '', 'th'),
    ...cles.map((cle) => {
      const th = celluleRecherche(`${COLONNES_ESSAI_IA[cle]}${entreParentheses(poids[cle])}`, '', 'th');
      th.title = `${LIBELLES_REGLAGES_IA[cle]} (poids ${poids[cle]}) : ce que la séquence entière change`;
      return th;
    }),
    celluleRecherche('Suite prévue', '', 'th')
  );
  return tr;
}

// Les termes de la position elle-meme ; les lignes disent ce que chaque
// sequence y ajoute (comme l'Essai).
function lignePositionRecherche({ etat, poids, version }, cles) {
  const detail = detailDeLEvaluation(etat, etat.joueurAuTrait, poids, version);
  const tr = document.createElement('tr');
  tr.className = 'essai-position-actuelle';
  tr.title = 'Les termes de la position ; en dessous, ce que la séquence de chaque premier coup y ajoute';
  tr.append(...['', 'Position', '', '', '', ''].map((texte) => celluleRecherche(texte)), ...cles.map((cle) => celluleRecherche(texteValeurEssai(detail[cle] ?? 0))), celluleRecherche(''));
  return tr;
}

// `contexte` : { etat (la position cherchee), poids, version, reflexionMax (s),
// coupActif (le texte du coup joue depuis elle, ou null) } ; `montrerSequence(sequence,
// titre)` : le petit plateau.
function lignesDUneProfondeur({ profondeur, coups, noeuds, ms, fin, lignes }, contexte, cles, montrerSequence) {
  const sousLesMeilleurs = lignes.reduce((total, ligne) => total + ligne.noeuds, 0);
  const autres = coups - lignes.length;
  const entete = document.createElement('tr');
  entete.className = 'recherche-ia-profondeur';
  const resume = celluleRecherche(
    `Prof. ${profondeur} : ${coups} premiers coups, ${FORMAT_DES_NOMBRES.format(noeuds)} positions${Number.isFinite(ms) ? `, ${texteDuTempsRecherche(ms)}` : ''}${Number.isFinite(fin) ? ` (finie à ${texteDuTempsRecherche(fin)})` : ''}` +
      (autres > 0 ? ` — les ${autres} autres : ${FORMAT_DES_NOMBRES.format(noeuds - sousLesMeilleurs)} (${partEnPourcent(noeuds - sousLesMeilleurs, noeuds)})` : '')
  );
  resume.colSpan = COLONNES_FIXES_RECHERCHE + cles.length;
  entete.append(resume);
  const rangees = lignes.map(({ valeur, exacte, noeuds: sous, ms: temps, fin: trouve, sequence }, rang) => {
    const ecarts = cles.length > 0 ? ecartsDeLaSequence(contexte.etat, sequence, contexte.poids, contexte.version) : {};
    const montrer = () => montrerSequence(sequence, `Prof. ${profondeur}, ${sequence[0]} — suite prévue`);
    const coup = celluleRecherche(sequence[0] ?? '', 'recherche-ia-coup sequence-prevue-cliquable');
    const suite = celluleRecherche(sequence.slice(1).join(' '), 'sequence-prevue sequence-prevue-cliquable');
    for (const cellule of [coup, suite]) {
      cellule.title = 'Voir la séquence sur un plateau';
      cellule.addEventListener('click', montrer);
    }
    const tr = document.createElement('tr');
    tr.append(
      celluleRecherche(String(rang + 1)),
      coup,
      celluleRecherche(`${exacte ? '' : '≤ '}${libelleEvaluation(valeur)}`),
      celluleRecherche(texteDuTempsRecherche(trouve)),
      celluleRecherche(texteDuTempsRecherche(temps)),
      celluleRecherche(`${FORMAT_DES_NOMBRES.format(sous)} (${partEnPourcent(sous, noeuds)})`),
      ...cles.map((cle) => celluleRecherche(texteValeurEssai(ecarts[cle] ?? 0))),
      suite
    );
    if (rang === 0) tr.classList.add('recherche-ia-choisi');
    if (contexte.coupActif && sequence[0] === contexte.coupActif) tr.classList.add('coup-actif');
    return tr;
  });
  return [entete, ...rangees];
}

// Tout le tableau d'une recherche : { entete, lignes }.
function tableauDeLaRecherche(details, contexte, montrerSequence) {
  const cles = clesDesPoidsRecherche(contexte);
  return {
    entete: enteteDeLaRecherche(cles, contexte),
    lignes: [
      ...(cles.length > 0 ? [lignePositionRecherche(contexte, cles)] : []),
      ...[...details].reverse().flatMap((detail) => lignesDUneProfondeur(detail, contexte, cles, montrerSequence)),
    ],
  };
}
