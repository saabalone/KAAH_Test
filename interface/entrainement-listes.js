// La boite d'une LISTE de jeux du tableau des reglages (saab, 2026-10-10 : les jeux
// proposes d'un grade, « Standard/mBelg/Alien, avec mBelg imposée » ; pour les PZL,
// « d'abord il faut que je vérifie s'ils sont tous bons » ; puis « séparer PZL et
// Mini-PZL ... imposer n dans les types ... donc les classer par type dans la liste avec
// un btn imposés sur le type »). Les jeux par type (les huit de KAAWA pour les variantes,
// les categories de PZL : Mini ou non, et leurs tours), chacun avec sa case (propose) et son 📌 (impose) ; chaque type a son
// nombre impose. Une variante de plusieurs types apparait dans chacun (ses cases
// suivent). En PZL, ceux du grade d'abord, les autres sur demande.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CEINTURES, puzzlesDuGrade,
// typesDuJeu, TYPES_DE_PUZZLE, solutionsDuPuzzle, puzzlesProposablesDuGrade,
// estPuzzleDouteux (moteur/entrainement.js), KAA_PZL_SOLUTIONS (donnees/kaa-puzzles-solutions.js),
// reglagesDeLEntrainement (interface/profils-entrainement.js), TYPES_DE_VARIANTE
// (moteur/classement.js), lireListeDeJeux, ecrireListeDeJeux
// (moteur/entrainement-lecture.js), brancherClicMajuscule (interface/clic-majuscule.js)
// viennent de fichiers charges avant celui-ci.

const LIBELLES_DES_LISTES = { variantes: 'Variantes proposées', pzl: 'PZL proposés' };
const SANS_TYPE = { cle: '', libelle: 'Sans type' };

// « 3 tours, Noir gagne, solution unique — ⚠ douteux » : ce qu'une liste dit d'un PZL
// (aussi dans le tableau Ceintures × PZL, interface/entrainement-ceintures-jeux.js).
function detailDuPuzzleDeListe(puzzle) {
  const solutions = solutionsDuPuzzle(puzzle, KAA_PZL_SOLUTIONS);
  // Un PZL douteux (moteur/entrainement.js) : decoche au depart, a cocher si on y tient.
  const douteux = estPuzzleDouteux(puzzle) ? ' — ⚠ douteux' : '';
  return `${puzzle.toursMaximum} tours, ${puzzle.campGagnant === 'noir' ? 'Noir' : 'Blanc'} gagne, ${solutions === null ? 'solutions : ?' : solutions === 1 ? 'solution unique' : `${solutions} solutions`}${douteux}`;
}

// `elements` : { dialogue, titre, recherche, autres (case : les PZL des autres grades),
// ligneAutres, corps, toutCocher, toutDecocher, valider, annuler } ; `variantes`,
// `puzzles` : ce qui existe. Renvoie ouvrirListe(cle, valeur, lectureSeule) : une
// promesse de la nouvelle liste (« nom|!impose|#type=n... »), ou null si on annule.
function demarrerListesEntrainement(elements, variantes, puzzles) {
  let terminer = null;
  let ordre = []; // les noms, dans l'ordre de la liste entiere
  const echapper = (texte) => String(texte).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

  function ligne(jeu, choisis, imposes, duGrade) {
    return `<div class="ligne-liste-jeu${duGrade.includes(jeu.nom) ? '' : ' hors-grade'}" data-nom="${echapper(jeu.nom)}"><label class="case-inclus" title="Proposé"><input type="checkbox" data-inclus ${choisis.includes(jeu.nom) ? 'checked' : ''} />${echapper(jeu.nom)}</label><label class="case-impose" title="Imposé : toujours proposé, à réussir dans la série"><input type="checkbox" data-impose ${imposes.includes(jeu.nom) ? 'checked' : ''} />📌</label>${jeu.detail ? `<span class="note-reglages">${echapper(jeu.detail)}</span>` : ''}</div>`;
  }

  // Une section par type (vide : cachee), son nombre impose en tete.
  function sections(sorte, jeux, { candidats, imposes, quotas }, duGrade) {
    const types = sorte === 'pzl' ? TYPES_DE_PUZZLE : [...TYPES_DE_VARIANTE, SANS_TYPE];
    return types
      .map((type) => {
        const siens = jeux.filter((jeu) => (type.cle === '' ? jeu.types.length === 0 : jeu.types.includes(type.cle)));
        if (siens.length === 0) return '';
        const quota = type.cle === '' ? '' : `<label class="quota-type" title="Combien de jeux de ce type sont imposés dans la série (jamais plus que ses jeux cochés ; un jeu 📌 de ce type en fait partie)">imposés <input class="nombre-reglage" type="number" min="0" step="1" data-quota="${type.cle}" value="${quotas[type.cle] ?? 0}" /></label>`;
        return `<div class="section-type-jeux"><div class="titre-type-jeux"><span>${echapper(type.libelle)} (${siens.filter((jeu) => duGrade.includes(jeu.nom)).length})</span><span class="actions-type-jeux"><button class="bouton-liste-reglage" type="button" data-cocher-type="oui" title="Cocher tous les jeux de ce type">✓ tous</button><button class="bouton-liste-reglage" type="button" data-cocher-type="non" title="Décocher tous les jeux de ce type">aucun</button>${quota}</span></div>${siens.map((jeu) => ligne(jeu, candidats, imposes, duGrade)).join('')}</div>`;
      })
      .join('');
  }

  function filtrer() {
    const texte = elements.recherche.value.trim().toLowerCase();
    const avecAutres = elements.autres.checked;
    for (const rangee of elements.corps.querySelectorAll('.ligne-liste-jeu')) {
      rangee.hidden = (!avecAutres && rangee.classList.contains('hors-grade') && !rangee.querySelector('[data-inclus]').checked) || (texte !== '' && !rangee.dataset.nom.toLowerCase().includes(texte));
    }
    // Un type dont rien ne se montre : cache aussi.
    for (const section of elements.corps.querySelectorAll('.section-type-jeux')) section.hidden = !section.querySelector('.ligne-liste-jeu:not([hidden])');
  }

  // Un nombre impose ne depasse jamais les jeux coches de son type (saab, 2026-10-11 :
  // « limiter les valeurs imposées au nb de variantes existantes »). `change` : le champ
  // qu'on vient de regler — au-dela des jeux coches, ceux du type qui sont affiches se
  // cochent, plutot que de ramener le nombre sans rien dire (2026-10-14 : « ça n'a pas pris »).
  function bornerLesQuotas(change = null) {
    for (const champ of elements.corps.querySelectorAll('[data-quota]')) {
      const section = champ.closest('.section-type-jeux');
      if (champ === change && Number(champ.value) > section.querySelectorAll('[data-inclus]:checked').length) {
        for (const rangee of section.querySelectorAll('.ligne-liste-jeu:not([hidden])')) poser(rangee.dataset.nom, 'inclus', true);
      }
      const coches = section.querySelectorAll('[data-inclus]:checked').length;
      champ.max = section.querySelectorAll('.ligne-liste-jeu').length;
      if (Number(champ.value) > coches) champ.value = coches;
    }
  }

  function lire() {
    const premiere = (nom) => elements.corps.querySelector(`.ligne-liste-jeu[data-nom="${CSS.escape(nom)}"]`);
    const candidats = ordre.filter((nom) => premiere(nom)?.querySelector('[data-inclus]').checked);
    const imposes = candidats.filter((nom) => premiere(nom).querySelector('[data-impose]').checked);
    const quotas = {};
    for (const champ of elements.corps.querySelectorAll('[data-quota]')) if (Number(champ.value) > 0) quotas[champ.dataset.quota] = Math.round(Number(champ.value));
    return ecrireListeDeJeux({ candidats, imposes, quotas });
  }

  function fermer(resultat) {
    elements.dialogue.close();
    terminer?.(resultat);
    terminer = null;
  }

  function ouvrirListe(cle, valeur, lectureSeule) {
    const grade = Number(/^c(\d+)/.exec(cle)[1]);
    const sorte = cle.endsWith('pzl') ? 'pzl' : 'variantes';
    const duGrade = (sorte === 'variantes' ? variantes : puzzlesDuGrade(puzzles, grade)).map((jeu) => jeu.nom);
    const sources = sorte === 'variantes' ? variantes : [...puzzlesDuGrade(puzzles, grade), ...puzzles.filter((puzzle) => !duGrade.includes(puzzle.nom))];
    const jeux = sources.map((jeu) => ({ nom: jeu.nom, types: typesDuJeu(sorte, jeu), detail: sorte === 'pzl' ? detailDuPuzzleDeListe(jeu) : '' }));
    ordre = jeux.map((jeu) => jeu.nom);
    // Decochee : ce que le grade propose de lui-meme (ses PZL a solution unique, si la
    // regle est cochee), rien d'impose.
    const proposes = sorte === 'variantes' ? duGrade : puzzlesProposablesDuGrade(puzzles, grade, reglagesDeLEntrainement().options.pzlSolutionUnique, KAA_PZL_SOLUTIONS).map((jeu) => jeu.nom);
    const liste = valeur === undefined ? { candidats: proposes, imposes: [], quotas: {} } : lireListeDeJeux(valeur);
    elements.titre.textContent = `${CEINTURES[grade].nom} — ${LIBELLES_DES_LISTES[sorte]}`;
    // (.ligne-reglage est en flex : `hidden` seul ne la cacherait pas.)
    elements.ligneAutres.style.display = sorte === 'pzl' ? '' : 'none';
    elements.autres.checked = false;
    elements.recherche.value = '';
    elements.corps.innerHTML = sections(sorte, jeux, liste, duGrade);
    bornerLesQuotas();
    for (const element of elements.corps.querySelectorAll('input, button')) element.disabled = lectureSeule;
    for (const bouton of [elements.toutCocher, elements.toutDecocher, elements.valider]) bouton.hidden = lectureSeule;
    elements.dialogue.classList.toggle('lecture-seule', lectureSeule); // styles.css, .lecture-seule
    filtrer();
    elements.dialogue.showModal();
    return new Promise((resoudre) => {
      terminer = resoudre;
    });
  }

  // Les cases d'un meme jeu (dans plusieurs types) se suivent ; imposer un jeu le
  // propose, ne plus le proposer ne l'impose plus.
  function poser(nom, quoi, oui) {
    for (const rangee of elements.corps.querySelectorAll(`.ligne-liste-jeu[data-nom="${CSS.escape(nom)}"]`)) {
      rangee.querySelector(`[data-${quoi}]`).checked = oui;
      if (quoi === 'impose' && oui) rangee.querySelector('[data-inclus]').checked = true;
      if (quoi === 'inclus' && !oui) rangee.querySelector('[data-impose]').checked = false;
    }
  }
  elements.corps.addEventListener('change', (evenement) => {
    const rangee = evenement.target.closest('.ligne-liste-jeu');
    if (rangee) poser(rangee.dataset.nom, evenement.target.matches('[data-impose]') ? 'impose' : 'inclus', evenement.target.checked);
    bornerLesQuotas(evenement.target.matches('[data-quota]') ? evenement.target : null);
  });
  // Saab, 2026-10-11 : « pouvoir cocher/décocher toutes les parties d'un type de variante ».
  elements.corps.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('[data-cocher-type]');
    if (!bouton) return;
    for (const rangee of bouton.closest('.section-type-jeux').querySelectorAll('.ligne-liste-jeu:not([hidden])')) poser(rangee.dataset.nom, 'inclus', bouton.dataset.cocherType === 'oui');
    bornerLesQuotas();
  });
  const cocherVisibles = (oui) => {
    for (const rangee of elements.corps.querySelectorAll('.ligne-liste-jeu:not([hidden])')) poser(rangee.dataset.nom, 'inclus', oui);
    bornerLesQuotas();
  };
  // Maj + clic : les cases de meme sorte (proposé ou 📌) entre la derniere touchee et celle-ci.
  brancherClicMajuscule(
    elements.corps,
    (caseTouchee) => [[...elements.corps.querySelectorAll(`.ligne-liste-jeu:not([hidden]) [data-${caseTouchee.matches('[data-impose]') ? 'impose' : 'inclus'}]`)]],
    (cases, etat) => {
      for (const autre of cases) poser(autre.closest('.ligne-liste-jeu').dataset.nom, autre.matches('[data-impose]') ? 'impose' : 'inclus', etat);
      bornerLesQuotas();
    }
  );
  elements.toutCocher.addEventListener('click', () => cocherVisibles(true));
  elements.toutDecocher.addEventListener('click', () => cocherVisibles(false));
  elements.recherche.addEventListener('input', filtrer);
  elements.autres.addEventListener('change', filtrer);
  elements.valider.addEventListener('click', () => fermer(lire()));
  elements.annuler.addEventListener('click', () => fermer(null));
  elements.dialogue.addEventListener('cancel', () => fermer(null));
  return ouvrirListe;
}
