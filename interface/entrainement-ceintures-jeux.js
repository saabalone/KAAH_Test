// Les tableaux CEINTURES × VARIANTES et CEINTURES × PZL du tableau des reglages (saab,
// 2026-10-10 : « faire un tableau des Ceinture/Variante, [que] je puisse cocher/imposer
// (même principe d'actuellement par variante) au lieu d'ouvrir chaque ceinture pour
// cocher ; on pourra aussi l'afficher dans _Test mais inactif » ; 2026-10-11 : « le même
// tableau pour les PZL/Mini »). Une ligne par jeu, ranges par type (les huit de KAAWA,
// ou les categories de PZL : Mini ou non, et leurs tours), une colonne par ceinture ;
// dans chaque case, la coche (propose) et le 📌 (impose) de la liste de cette ceinture
// (interface/entrainement-listes.js : les memes listes, vues toutes ensemble). La ligne
// d'un type porte, par ceinture, son nombre impose ; la premiere ligne, les jeux que la
// liste impose dans la serie. Un jeu de plusieurs types apparait dans chacun (ses cases
// suivent). Le HTML et l'image d'un jeu : interface/entrainement-ceintures-jeux-tableau.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CEINTURES, TYPES_DE_PUZZLE,
// typesDuJeu, ceintureDuPuzzle, puzzlesDuGrade, puzzlesProposables, prereglageDesPuzzles,
// estPuzzleDouteux
// (moteur/entrainement.js), KAA_PZL_SOLUTIONS (donnees/kaa-puzzles-solutions.js),
// TYPES_DE_VARIANTE (moteur/classement.js), lireListeDeJeux, ecrireListeDeJeux,
// placesImposees (moteur/entrainement-lecture.js), reglagesDeLEntrainement
// (interface/profils-entrainement.js), SANS_TYPE, detailDuPuzzleDeListe
// (interface/entrainement-listes.js), htmlDuTableauCeinturesJeux, montrerOuCacherLImageDuJeu, bornerLesNombresImposes,
// filtrerLesJeuxDesCeintures (interface/entrainement-ceintures-jeux-tableau.js),
// creerColonnesDesCeintures, brancherClicMajusculeDesCeintures
// (interface/entrainement-ceintures-jeux-colonnes.js) viennent de fichiers charges avant.

const TITRES_DES_CEINTURES_JEUX = { variantes: 'Ceintures × Variantes', pzl: 'Ceintures × PZL' };

// `elements` : { dialogue, titre, recherche, corps, prereglage, valider, fermer, image
// ({ cadre, svg, nom }) } ; `variantes`, `puzzles` : ce qui existe. Renvoie ouvrir(sorte,
// listes, jeuxParSerie, lectureSeule) — `listes` : par grade, sa liste (« nom|!impose|
// #type=n », ou undefined : ce que le grade propose de lui-meme) ; `jeuxParSerie` : par
// grade — : une promesse des listes changees (par grade, la nouvelle liste, ou undefined
// si elle n'a pas bouge), ou null si on ferme.
function demarrerCeinturesJeux(elements, variantes, puzzles) {
  let terminer = null;
  let sorte = 'variantes';
  let jeux = []; // { nom, types, detail, douteux, proposable, position, grades (qui le proposent d'eux-memes) }
  let initiales = []; // par grade, la liste ecrite telle qu'affichee a l'ouverture
  let jeuxParSerie = [];
  let rangeesDe = new Map(); // nom -> ses lignes (une par type)
  const grades = CEINTURES.map((_, grade) => grade);
  // La case d'une ligne pour `grade` : la colonne d'apres celle du nom.
  const caseDe = (rangee, grade, quoi) => rangee.cells[grade + 1].querySelector(`[data-${quoi}]`);
  const typesDe = (nom) => jeux.find((jeu) => jeu.nom === nom)?.types ?? [];
  const pzlUniquesSeulement = () => reglagesDeLEntrainement().options.pzlSolutionUnique;

  // Les jeux de `sorte` ; les PZL dans l'ordre de leur ceinture (les cases « de leur
  // grade » dessinent une diagonale), avec les grades ou ils sont proposes d'eux-memes.
  function jeuxDe(nouvelleSorte) {
    if (nouvelleSorte === 'variantes') return variantes.map((variante) => ({ nom: variante.nom, types: typesDuJeu('variantes', variante), detail: '', proposable: true, position: variante.position, grades }));
    const parGrade = grades.map((grade) => puzzlesDuGrade(puzzles, grade).map((puzzle) => puzzle.nom));
    const proposables = puzzlesProposables(puzzles, pzlUniquesSeulement(), KAA_PZL_SOLUTIONS);
    return [...puzzles]
      .sort((a, b) => ceintureDuPuzzle(a) - ceintureDuPuzzle(b))
      .map((puzzle) => ({ nom: puzzle.nom, types: typesDuJeu('pzl', puzzle), detail: detailDuPuzzleDeListe(puzzle), douteux: estPuzzleDouteux(puzzle), proposable: proposables.includes(puzzle), position: puzzle.position, grades: grades.filter((grade) => parGrade[grade].includes(puzzle.nom)) }));
  }

  // Ce qu'un grade propose de lui-meme (sa liste decochee) : toutes les variantes, ou ses
  // PZL (a solution unique si la regle le veut, jamais les douteux).
  const proposesParDefaut = (grade) => jeux.filter((jeu) => jeu.proposable && jeu.grades.includes(grade)).map((jeu) => jeu.nom);

  // La liste de `grade` telle que le tableau la montre.
  function listeDe(grade) {
    const premieres = jeux.map((jeu) => [jeu.nom, rangeesDe.get(jeu.nom)[0]]);
    const candidats = premieres.filter(([, rangee]) => caseDe(rangee, grade, 'inclus').checked).map(([nom]) => nom);
    const imposes = premieres.filter(([, rangee]) => caseDe(rangee, grade, 'impose').checked).map(([nom]) => nom);
    const quotas = {};
    for (const champ of elements.corps.querySelectorAll(`[data-quota][data-grade="${grade}"]`)) if (Number(champ.value) > 0) quotas[champ.dataset.quota] = Math.round(Number(champ.value));
    return { candidats, imposes, quotas };
  }
  // Les cases d'un meme jeu (dans plusieurs types) se suivent ; imposer un jeu le
  // propose, ne plus le proposer ne l'impose plus.
  function poser(nom, grade, quoi, oui) {
    for (const rangee of rangeesDe.get(nom)) {
      caseDe(rangee, grade, quoi).checked = oui;
      if (quoi === 'impose' && oui) caseDe(rangee, grade, 'inclus').checked = true;
      if (quoi === 'inclus' && !oui) caseDe(rangee, grade, 'impose').checked = false;
    }
  }
  function poserLaListe(grade, liste) {
    for (const jeu of jeux) {
      poser(jeu.nom, grade, 'inclus', liste.candidats.includes(jeu.nom));
      poser(jeu.nom, grade, 'impose', liste.imposes.includes(jeu.nom));
    }
    for (const champ of elements.corps.querySelectorAll(`[data-quota][data-grade="${grade}"]`)) champ.value = liste.quotas[champ.dataset.quota] ?? 0;
  }
  const rangeesDuType = (type) => [...elements.corps.querySelectorAll(`tr[data-type="${type}"]`)];

  // Apres chaque retouche : un nombre impose ne depasse jamais les jeux coches de son
  // type ; la premiere ligne dit les jeux imposes dans la serie de chaque ceinture — en
  // orange s'il y en a plus que la serie n'a de jeux (elle s'allonge alors d'autant :
  // moteur/entrainement-lecture.js, reglesDeSerieDuGrade) ; Valider passe au vert des
  // qu'une liste a change.
  function verifier() {
    bornerLesNombresImposes(elements.corps, (type, grade) => rangeesDuType(type).filter((rangee) => caseDe(rangee, grade, 'inclus').checked).length);
    for (const grade of grades) {
      const imposes = placesImposees(listeDe(grade), typesDe);
      const cellule = elements.corps.querySelector(`[data-imposes-du-grade="${grade}"]`);
      cellule.textContent = `${imposes}/${Math.max(imposes, jeuxParSerie[grade])}`;
      cellule.classList.toggle('trop-d-imposes', imposes > jeuxParSerie[grade]);
    }
    const change = initiales.some((initiale, grade) => ecrireListeDeJeux(listeDe(grade)) !== initiale);
    elements.valider.classList.toggle('bouton-a-faire', change);
    // Fermer oublierait ces changements : rouge (saab, 2026-10-15).
    elements.fermer.classList.toggle('bouton-danger', change);
  }

  const filtrer = () => filtrerLesJeuxDesCeintures(elements.corps, elements.recherche.value);

  // L'image du jeu touche (interface/entrainement-ceintures-jeux-tableau.js).
  const montrer = (nom) => montrerOuCacherLImageDuJeu(elements.image, jeux.find((autre) => autre.nom === nom));

  function fermer(resultat) {
    elements.dialogue.close();
    terminer?.(resultat);
    terminer = null;
  }

  function ouvrir(nouvelleSorte, listes, nouveauxJeuxParSerie, lectureSeule) {
    sorte = nouvelleSorte;
    jeux = jeuxDe(sorte);
    jeuxParSerie = nouveauxJeuxParSerie;
    initiales = [];
    const lues = listes.map((valeur, grade) => (valeur === undefined ? { candidats: proposesParDefaut(grade), imposes: [], quotas: {} } : lireListeDeJeux(valeur)));
    elements.titre.textContent = TITRES_DES_CEINTURES_JEUX[sorte];
    elements.recherche.value = '';
    elements.image.cadre.hidden = true;
    elements.corps.innerHTML = htmlDuTableauCeinturesJeux(sorte === 'variantes' ? 'Variante' : 'PZL', sorte === 'variantes' ? [...TYPES_DE_VARIANTE, SANS_TYPE] : TYPES_DE_PUZZLE, jeux, lues);
    rangeesDe = new Map(jeux.map((jeu) => [jeu.nom, []]));
    for (const rangee of elements.corps.querySelectorAll('tr[data-nom]')) rangeesDe.get(rangee.dataset.nom).push(rangee);
    verifier();
    initiales = grades.map((grade) => ecrireListeDeJeux(listeDe(grade)));
    for (const element of elements.corps.querySelectorAll('input, button')) element.disabled = lectureSeule;
    elements.valider.hidden = lectureSeule;
    elements.prereglage.hidden = lectureSeule || sorte !== 'pzl';
    // Pour les joueurs, seulement ce qui dit quoi faire (styles.css, .lecture-seule).
    elements.dialogue.classList.toggle('lecture-seule', lectureSeule);
    colonnes.remettre();
    elements.dialogue.showModal();
    // La ligne « Imposés / série » se fige juste sous l'en-tete (styles.css) : sa hauteur
    // ne se mesure qu'une fois la boite ouverte.
    elements.corps.style.setProperty('--hauteur-entete-ceintures', `${elements.corps.querySelector('tr').getBoundingClientRect().height}px`);
    return new Promise((resoudre) => {
      terminer = resoudre;
    });
  }

  // Tout cocher, ou tout decocher si tout l'est deja : `cases` = [[nom, grade], ...].
  function basculer(cases) {
    const toutes = cases.every(([nom, grade]) => caseDe(rangeesDe.get(nom)[0], grade, 'inclus').checked);
    for (const [nom, grade] of cases) poser(nom, grade, 'inclus', !toutes);
    verifier();
  }
  // Le prereglage des PZL par categorie (moteur/entrainement.js, prereglageDesPuzzles),
  // copier et coller une colonne (interface/entrainement-ceintures-jeux-colonnes.js).
  const colonnes = creerColonnesDesCeintures({ corps: elements.corps, grades, listeDe, poserLaListe, verifier, boutonPrereglage: elements.prereglage });
  function preregler() {
    const proposables = jeux.filter((jeu) => jeu.proposable).map((jeu) => puzzles.find((puzzle) => puzzle.nom === jeu.nom));
    colonnes.preregler((grade) => prereglageDesPuzzles(proposables, grade));
  }
  // Maj + clic (interface/entrainement-ceintures-jeux-colonnes.js).
  brancherClicMajusculeDesCeintures(elements.corps, grades, caseDe, poser, verifier);
  // Un nombre impose au-dela des jeux coches de son type (saab : « ça n'a pas pris ») :
  // les jeux proposables du type se cochent pour cette ceinture, plutot que de le
  // ramener sans rien dire a ce qui est coche.
  function imposerDansLeType(champ) {
    const grade = Number(champ.dataset.grade);
    const duType = rangeesDuType(champ.dataset.quota);
    if (Number(champ.value) <= duType.filter((rangee) => caseDe(rangee, grade, 'inclus').checked).length) return;
    for (const rangee of duType) if (jeux.find((jeu) => jeu.nom === rangee.dataset.nom).proposable) poser(rangee.dataset.nom, grade, 'inclus', true);
  }

  elements.corps.addEventListener('change', (evenement) => {
    const rangee = evenement.target.closest('tr[data-nom]');
    if (rangee) poser(rangee.dataset.nom, evenement.target.closest('td').cellIndex - 1, evenement.target.matches('[data-impose]') ? 'impose' : 'inclus', evenement.target.checked);
    else if (evenement.target.matches('[data-quota]')) imposerDansLeType(evenement.target);
    verifier();
  });
  elements.corps.addEventListener('click', (evenement) => {
    const colonne = evenement.target.closest('[data-cocher-grade]');
    const duType = evenement.target.closest('[data-cocher-type]');
    const ligne = evenement.target.closest('[data-cocher-jeu]');
    const nom = evenement.target.closest('[data-montrer-jeu]');
    const copie = evenement.target.closest('[data-copier-grade]');
    const collage = evenement.target.closest('[data-coller-grade]');
    if (copie) return colonnes.copier(Number(copie.dataset.copierGrade));
    if (collage) return colonnes.coller(Number(collage.dataset.collerGrade), evenement.shiftKey);
    const affiches = (selecteur) => [...elements.corps.querySelectorAll(`${selecteur}:not([hidden])`)].map((rangee) => rangee.dataset.nom);
    if (colonne) {
      // Sous une ceinture : ses jeux affiches (en PZL, ceux de son grade seulement).
      const grade = Number(colonne.dataset.cocherGrade);
      const noms = affiches('tr[data-nom]');
      basculer(jeux.filter((jeu) => noms.includes(jeu.nom) && jeu.grades.includes(grade)).map((jeu) => [jeu.nom, grade]));
    } else if (duType) basculer(affiches(`tr[data-type="${duType.dataset.cocherType}"]`).map((autre) => [autre, Number(duType.dataset.grade)]));
    else if (ligne) basculer(grades.map((grade) => [ligne.closest('tr').dataset.nom, grade]));
    else if (nom) montrer(nom.closest('tr').dataset.nom);
  });
  elements.image.cadre.addEventListener('click', () => (elements.image.cadre.hidden = true));
  elements.recherche.addEventListener('input', filtrer);
  elements.prereglage.addEventListener('click', preregler);
  elements.valider.addEventListener('click', () => {
    const nouvelles = grades.map((grade) => ecrireListeDeJeux(listeDe(grade)));
    fermer(nouvelles.map((nouvelle, grade) => (nouvelle === initiales[grade] ? undefined : nouvelle)));
  });
  elements.fermer.addEventListener('click', () => fermer(null));
  elements.dialogue.addEventListener('cancel', () => fermer(null));
  return ouvrir;
}
