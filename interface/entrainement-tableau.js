// Le HTML du TABLEAU DES REGLAGES de l'Entrainement (interface/entrainement-reglages.js,
// qui le fait vivre) : les regles generales (la coche et la valeur, puis le libelle),
// puis les grades — une ligne par grade et une colonne par reglage, ou TRANSPOSE
// (saab, 2026-10-11 : « ajouter un btn Transposer ... les colonnes seront ajustées sur
// le mot le plus long, et donc en dernière ligne les Dan ») : une colonne par grade,
// une ligne par reglage. Chaque case : la coche et la valeur en un groupe entoure de la
// couleur de la ceinture, un point par Dan dessous.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : GROUPES_REGLES_ENTRAINEMENT,
// REGLE_ENTRAINEMENT, texteRegleEntrainement (moteur/entrainement-profil.js), CEINTURES
// (moteur/entrainement.js), lireListeDeJeux (moteur/entrainement-lecture.js), nomDeLaCeinture, classesDeLaCeinture
// (interface/entrainement-ceintures.js), brancherClicMajuscule (interface/clic-majuscule.js)
// viennent de fichiers charges avant celui-ci.

const SECONDES_PAR_MINUTE_AFFICHEE = 60;
// Titres courts des reglages d'un grade, dans leur ordre (moteur/entrainement-profil.js),
// sur 2 lignes s'il le faut ; le libelle entier s'affiche au survol.
// L'ordre et les noms de saab (2026-10-14) : la machine, la serie, les variantes puis leur
// pendule, les PZL puis leur pendule, le reste.
const COLONNES_DES_GRADES = {
  niveau: 'IA<br>Niv.', iaSansLimite: 'IA<br>∞', ia: 'IA<br>Tps mn', iaElagage: 'IA<br>Élag.', iaReflexion: 'IA<br>Réfl. s',
  victoires: 'Vict.', jeux: 'Jeux',
  variantes: 'Variantes', handicap: 'Var.<br>Handi.', variantesProposees: 'Var.<br>tirées', mode: 'Var.<br>Pendule', temps: 'Var.<br>mn',
  bonus: 'Var.<br>+ coup', bonusEjection: 'Var.<br>+ éj.', delai: 'Var.<br>Délai',
  pzl: 'PZL', pzlProposes: 'PZL<br>tirés', pzlMode: 'PZL<br>pendule', pzlTemps: 'PZL<br>min', pzlBonus: 'PZL<br>+ coup', pzlBonusEjection: 'PZL<br>+ éj.', pzlDelai: 'PZL<br>délai',
  reinitialiserTout: 'Tout<br>à zéro', annuler: 'Annuler',
};
// Un groupe sur deux sur fond gris, pour les reperer : la machine, les variantes et leur
// pendule, le reste — la serie (Vict., Jeux) et les PZL gardent le fond du tableau.
const REGLAGES_SUR_FOND_GRIS = ['niveau', 'iaSansLimite', 'ia', 'iaElagage', 'iaReflexion', 'variantes', 'handicap', 'variantesProposees', 'mode', 'temps', 'bonus', 'bonusEjection', 'delai', 'reinitialiserTout', 'annuler'];
const classeDeFond = (suffixe) => (REGLAGES_SUR_FOND_GRIS.includes(suffixe) ? 'fond-gris' : '');
// Les nombres de jeux (et de victoires, de billes de handicap) tiennent sur « 99 ».
const REGLAGES_SUR_DEUX_CHIFFRES = ['victoires', 'jeux', 'handicap', 'variantesProposees', 'pzlProposes'];
// Les reglages qui ne valent que dans un mode de pendule (saab : « ligne Délai inactive
// si colonne Bonus active ») : { suffixe: [le reglage du mode, le mode ou il vaut] }.
const MODE_DES_REGLAGES_DE_PENDULE = {
  bonus: ['mode', 'bonus'], bonusEjection: ['mode', 'bonus'], delai: ['mode', 'delai'],
  pzlBonus: ['pzlMode', 'bonus'], pzlBonusEjection: ['pzlMode', 'bonus'], pzlDelai: ['pzlMode', 'delai'],
};
const SUFFIXE_DE_REGLE = /^c\d+/;
// Les tirés et leur liste : les imposés sont toujours proposés, le tirage ne fait que
// compléter parmi les jeux non imposés (moteur/entrainement-propositions.js).
const LISTE_DES_TIRES = { variantesProposees: 'variantes', pzlProposes: 'pzl' };
// Le tirage sans effet (saab, 2026-10-17 : « si elles sont toutes imposées, elles ne
// seront pas tirées ») : tous les jeux de la liste imposés, ou déjà autant d'imposés.
function tirageSansEffet(regles, grade, suffixe) {
  const liste = LISTE_DES_TIRES[suffixe];
  const nombre = regles[`c${grade}${suffixe}`];
  if (!liste || !Number.isFinite(nombre)) return false;
  const { candidats, imposes } = lireListeDeJeux(regles[`c${grade}${liste}`] ?? '');
  return imposes.length >= nombre || candidats.every((nom) => imposes.includes(nom));
}
// Les pointilles du bas d'un Dan (saab : « pour les Dan Noire 1 pointillé par Dan, pour
// les Dan Blanche-Rouge et Rouge 1 pointillé par grade ») : le Dan, moins ceux d'avant.
const DANS_AVANT_LE_MOTIF = { noire: 0, 'blanche-rouge': 5, rouge: 8 };
const echapperTableau = (texte) => String(texte).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

// `texte(cle, valeur)` : ce que dit une liste de jeux (texteRegleEntrainement, avec les
// types des jeux que l'interface connait).
function champDeRegle(regle, valeur, texte, horsMode = false) {
  const actif = valeur !== undefined && !horsMode;
  if (regle.sorte === 'case') return '';
  // Bonus / Délai : un clic passe a l'autre (saab, 2026-10-17 : « un clic suffirait pour basculer »).
  if (regle.sorte === 'mode') return `<button class="bouton-mode-reglage" type="button" data-valeur="${regle.cle}" data-basculer-mode value="${valeur}" title="Un clic passe à l'autre mode">${valeur === 'bonus' ? 'Bonus' : 'Délai'}</button>`;
  if (regle.sorte === 'liste') {
    return `<input type="hidden" data-valeur="${regle.cle}" value="${echapperTableau(valeur ?? '')}" /><button class="bouton-liste-reglage" type="button" data-liste="${regle.cle}">${actif ? texte(regle.cle, valeur) : 'Tous'}</button>`;
  }
  const affichee = valeur !== undefined ? valeur : regle.proposee; // hors mode : sa valeur reste, inactive
  const nombre = regle.sorte === 'minutes' ? affichee / SECONDES_PAR_MINUTE_AFFICHEE : affichee;
  return `<input class="nombre-reglage" type="number" min="0" step="${regle.sorte === 'minutes' ? 0.5 : 1}" data-valeur="${regle.cle}" value="${nombre}" ${actif ? '' : 'disabled'} />`;
}

// Saab, 2026-10-10 : « mettre la ✓ à gauche de sa valeur, et faire un groupe ✓ +
// valeur (comme les groupes d'icônes) avec le trait entourant le groupe de la
// couleur de la ceinture ».
// `horsMode` : un reglage de l'autre mode de pendule — inactif (il garde sa valeur).
function groupeDeRegle(regle, valeur, points = '', texte = texteRegleEntrainement, horsMode = false) {
  const coche = regle.cochable ? `<input type="checkbox" class="coche-poids" data-coche="${regle.cle}" ${valeur !== undefined ? 'checked' : ''} ${horsMode ? 'disabled' : ''} />` : '';
  return `<span class="groupe-regle">${coche}${champDeRegle(regle, valeur, texte, horsMode)}${points}</span>`;
}

// Ce qu'un reglage veut dire, en plus de son libelle (saab, 2026-10-17 : « si je mets IA
// inf, est-ce que IA Réfl. s = 30 arrêtera l'IA ? Mettre l'explication dans l'infobulle »).
const EXPLICATIONS_DES_REGLAGES_DE_GRADE = {
  iaSansLimite: ' : sa pendule ne tombe jamais. Elle réfléchit quand même au plus « IA Réfl. s » par coup, puis joue le meilleur coup trouvé',
  iaReflexion: ' : passé ce temps, la machine joue le meilleur coup trouvé, même avec « IA ∞ » (∞ ne concerne que sa pendule)',
};
const libelleExplique = (cle, suffixe) => `${REGLE_ENTRAINEMENT[cle].libelle}${EXPLICATIONS_DES_REGLAGES_DE_GRADE[suffixe] ?? ''}`;

// La case d'un reglage de `grade` (data-du-grade : sa couleur remonte au nom du grade).
function celluleDuGrade(cle, grade, valeurs, texte) {
  const ceinture = CEINTURES[grade];
  const points = ceinture.dan ? `<span class="points-dan">${'<i></i>'.repeat(ceinture.dan - DANS_AVANT_LE_MOTIF[ceinture.motif])}</span>` : '';
  const suffixe = cle.replace(SUFFIXE_DE_REGLE, '');
  const [regleDuMode, mode] = MODE_DES_REGLAGES_DE_PENDULE[suffixe] ?? [];
  const sansEffet = tirageSansEffet(valeurs.regles, grade, suffixe);
  const horsMode = regleDuMode !== undefined && valeurs.regles[`c${grade}${regleDuMode}`] !== mode;
  const pourquoi = sansEffet ? ' — sans effet : les imposés remplissent déjà les propositions (rien à tirer)' : horsMode ? ' — inactif : la pendule est dans l’autre mode' : '';
  const titre = `${ceinture.nom} — ${libelleExplique(cle, suffixe)}${pourquoi}`;
  return `<td class="cellule-regle grade-${ceinture.motif ?? 'kyu'} ${classeDeFond(suffixe)}${horsMode || sansEffet ? ' hors-mode' : ''}${REGLAGES_SUR_DEUX_CHIFFRES.includes(suffixe) ? ' reglage-court' : ''}" style="--couleur-grade:${ceinture.couleur}" data-ligne="${cle}" data-du-grade="${grade}" title="${echapperTableau(titre)}">${groupeDeRegle(REGLE_ENTRAINEMENT[cle], valeurs.regles[cle], points, texte, horsMode)}</td>`;
}

const titreDeColonne = (suffixe, titre) => `class="${classeDeFond(suffixe)}" title="${echapperTableau(libelleExplique(`c0${suffixe}`, suffixe))}">${titre}`;

// Une ligne par grade, une colonne par reglage.
function gradesEnLignes(grades, valeurs, texte) {
  const entete = `<tr><th class="nom-grade">Grade</th>${Object.entries(COLONNES_DES_GRADES).map(([suffixe, titre]) => `<th ${titreDeColonne(suffixe, titre)}</th>`).join('')}</tr>`;
  const lignes = grades.map(({ ceinture: grade, regles }) => `<tr><td class="nom-grade" data-nom-grade="${grade}">${nomDeLaCeinture(CEINTURES[grade])}</td>${regles.map(([cle]) => celluleDuGrade(cle, grade, valeurs, texte)).join('')}</tr>`);
  return `<table class="tableau-historique tableau-regles-grades">${entete}${lignes.join('')}</table>`;
}

// Transpose : une colonne par grade (le nom, le Dan, et la pastille en derniere
// ligne : la colonne n'est pas plus large que son mot le plus long), une ligne par reglage.
function gradesEnColonnes(grades, valeurs, texte) {
  const entetes = grades.map(({ ceinture: grade }) => {
    const ceinture = CEINTURES[grade];
    const [couleur, dan] = ceinture.nom.replace(' et ', '<br>et ').split(', ');
    // Le nom (et le Dan) au-dessus, la couleur en derniere ligne (saab, 2026-10-11 :
    // « pour avoir les couleurs alignées sur la dernière ligne »).
    return `<th class="grade-en-colonne" data-nom-grade="${grade}">${couleur}${dan ? `<br><span class="dan-ceinture">${dan}</span>` : ''}<br><span class="${classesDeLaCeinture(ceinture)}" style="background:${ceinture.couleur}"></span></th>`;
  });
  const lignes = Object.entries(COLONNES_DES_GRADES).map(
    ([suffixe, titre]) => `<tr><td ${titreDeColonne(suffixe, titre.replace('<br>', ' ')).replace('class="', 'class="nom-grade ')}</td>${grades.map(({ ceinture: grade }) => celluleDuGrade(`c${grade}${suffixe}`, grade, valeurs, texte)).join('')}</tr>`
  );
  return `<table class="tableau-historique tableau-regles-grades tableau-regles-transpose"><tr><th class="nom-grade">Réglage</th>${entetes.join('')}</tr>${lignes.join('')}</table>`;
}

// Tout le tableau, pour les `valeurs` ({ regles }) ; `enColonnes` : les grades en
// colonnes (le sens de depart), sinon en lignes ;
// `texte(cle, valeur)` : ce que dit une liste de jeux.
function htmlDuTableauDesReglages(valeurs, enColonnes, texte) {
  const generaux = GROUPES_REGLES_ENTRAINEMENT.filter((groupe) => groupe.ceinture === undefined);
  const grades = GROUPES_REGLES_ENTRAINEMENT.filter((groupe) => groupe.ceinture !== undefined);
  // « ✓ 1 Victoires par jeu » plutot que « Victoires par jeu ✓ 1 » (saab : trop d'espace).
  const lignesGenerales = generaux.map(
    (groupe) => `<tr class="titre-groupe-regles"><th colspan="2">${echapperTableau(groupe.titre)}</th></tr>${groupe.regles
      .map(([cle]) => `<tr data-ligne="${cle}"><td class="cellule-regle">${groupeDeRegle(REGLE_ENTRAINEMENT[cle], valeurs.regles[cle])}</td><td class="libelle-regle">${echapperTableau(REGLE_ENTRAINEMENT[cle].libelle)}</td></tr>`)
      .join('')}`
  );
  return `<table class="tableau-historique tableau-regles-generales">${lignesGenerales.join('')}</table>
<div class="defilement-horizontal">${enColonnes ? gradesEnColonnes(grades, valeurs, texte) : gradesEnLignes(grades, valeurs, texte)}</div>`;
}

// Maj + clic sur une coche (interface/clic-majuscule.js ; saab, 2026-10-15) : les grades
// d'un meme reglage, ou les reglages d'un meme grade ; `retoucher()` relit le tableau.
function brancherClicMajusculeDesReglages(conteneur, retoucher) {
  const suffixeDe = (cle) => cle.replace(SUFFIXE_DE_REGLE, '');
  const gradeDe = (cle) => /^c(\d+)/.exec(cle)?.[1];
  brancherClicMajuscule(
    conteneur,
    (coche) => {
      const cle = coche.dataset.coche;
      if (!cle || gradeDe(cle) === undefined) return [];
      const toutes = [...conteneur.querySelectorAll('.tableau-regles-grades [data-coche]')];
      const ligne = toutes.filter((autre) => suffixeDe(autre.dataset.coche) === suffixeDe(cle)).sort((a, b) => gradeDe(a.dataset.coche) - gradeDe(b.dataset.coche));
      return [ligne, toutes.filter((autre) => gradeDe(autre.dataset.coche) === gradeDe(cle))];
    },
    (cases, etat) => {
      for (const coche of cases) coche.checked = etat;
      retoucher();
    },
    (coche) => coche.dataset.coche
  );
}

// La barre du tableau, figee en haut (saab, 2026-10-11 : « figer les btn Valider/Abandonner »)
// : le profil, Valider (vert : une retouche attend), Abandonner, Transposer, les tableaux
// Ceintures ×, Importer et Exporter (pas dans KAAH_Test). `options` : les <option> des profils.
function htmlDeLaBarreDesReglages({ options, brouillon, exporte, lectureSeule }) {
  return `<div class="barre-reglages-entrainement"><label title="Le profil que jouent l’Entraînement et les Ceintures">Profil <select data-profil>${options.join('')}</select></label>${lectureSeule ? '' : `<button class="bouton-dialogue${brouillon ? ' bouton-a-faire' : ''}" type="button" data-valider ${brouillon ? '' : 'disabled'} title="Enregistre les retouches en orange comme une nouvelle version du profil (sur le profil intégré : un nouveau profil)">Valider</button><button class="bouton-dialogue" type="button" data-abandonner ${brouillon ? '' : 'disabled'} title="Oublie les retouches en orange : le tableau revient au profil validé">Abandonner</button>`}<button class="bouton-dialogue" type="button" data-transposer title="Les grades en lignes et les réglages en colonnes, ou l’inverse">Transposer</button><button class="bouton-dialogue" type="button" data-ceintures-jeux="variantes" title="Toutes les variantes et toutes les ceintures en un tableau : cocher une variante proposée, 📌 l’imposer, sans ouvrir la liste de chaque ceinture">Ceintures × Variantes</button><button class="bouton-dialogue" type="button" data-ceintures-jeux="pzl" title="Tous les PZL et Mini-PZL et toutes les ceintures en un tableau : cocher un PZL proposé, 📌 l’imposer, sans ouvrir la liste de chaque ceinture">Ceintures × PZL</button>${lectureSeule ? '' : `<button class="bouton-dialogue" type="button" data-importer title="Ajoute un profil depuis son fichier : une copie de secours (KAA_entrainement_secours_…json) ou un export pour KAAH_Test">Importer un profil</button><button class="bouton-dialogue${exporte ? ' deja-exporte' : ''}" type="button" data-exporter title="Enregistre ce profil validé dans le fichier KAA_entrainement_saab.json : il deviendra le profil de KAAH_Test à la prochaine publication (node publier-kaah.js). Orange : déjà exporté.">Exporter pour KAAH_Test</button>`}</div>`;
}
