// La boite « My » (phase 23bis) : creer une variante ou un puzzle a soi, ou copier
// celui qu'on regarde (« Modifier », qui copie toujours, comme KAAWA — decide avec
// saab). Reprend « Ajouter/Modifier Position » de KAAWA ; les noms, handicaps et
// champs de l'entree sont calcules par moteur/positions-my.js, jamais ici.
//
// Au lieu du resume que KAAWA montre dans une seconde boite avant d'enregistrer,
// le nom final et la position enregistree s'affichent EN DIRECT sous le
// formulaire : on ne valide jamais a l'aveugle, sans boite de plus.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : entreeVarianteMy,
// entreePuzzleMy, erreurDeSaisie, erreurDePuzzle, positionDeLaSaisie
// (moteur/positions-my.js),
// TYPES_DE_VARIANTE (moteur/classement.js), formaterDateKAAWA
// (interface/sauvegarde.js), demarrerEditeurPosition (interface/editeur-position.js)
// viennent de fichiers charges avant celui-ci.

const POSITION_VIDE = '0_0';
// Les choix d'un puzzle neuf : ceux que KAAWA preselectionne (PZL, Easy, Noir, Noir).
const CHOIX_PUZZLE_PAR_DEFAUT = { typeDePuzzle: 'PZL', niveau: 'E', premierJoueur: 'noir', gagnant: 'noir' };

// `elements` : { dialogue, titre, editeur (voir demarrerEditeurPosition), nom,
// createur, sectionVariante, typesVariante, notesVariante, sectionPuzzle, tours,
// solutions, debuts, resume, erreur, annuler, enregistrer }. Les boutons de choix
// d'un puzzle portent data-choix / data-valeur (index.html).
// `rappels` : { confirmer(message, suite, mot), enregistrer(genre, entree) }.
// Renvoie { ouvrir(genre, formulaire) } — genre 'variantes' ou 'puzzles' ;
// formulaire null pour une position neuve (plateau vide, comme KAAWA).
function demarrerFormulairePositionMy(elements, rappels) {
  let genre = 'variantes';
  let source = null;
  let choix = { ...CHOIX_PUZZLE_PAR_DEFAUT };
  const editeur = demarrerEditeurPosition(elements.editeur, afficherResume);
  const boutonsDeChoix = [...elements.sectionPuzzle.querySelectorAll('[data-choix]')];

  // Une case a cocher par « Type » de variante, dans l'ordre de KAAWA.
  const casesTypes = new Map();
  for (const { cle, libelle } of TYPES_DE_VARIANTE) {
    const ligne = document.createElement('label');
    ligne.className = 'ligne-case-type';
    const caseACocher = document.createElement('input');
    caseACocher.type = 'checkbox';
    caseACocher.addEventListener('change', afficherResume);
    ligne.append(caseACocher, libelle);
    elements.typesVariante.appendChild(ligne);
    casesTypes.set(cle, caseACocher);
  }

  for (const bouton of boutonsDeChoix) {
    bouton.addEventListener('click', () => {
      choix = { ...choix, [bouton.dataset.choix]: bouton.dataset.valeur };
      afficherResume();
    });
  }
  for (const champ of [elements.nom, elements.createur, elements.tours, elements.solutions, elements.debuts]) {
    champ.addEventListener('input', afficherResume);
  }

  function entreeActuelle() {
    const commun = {
      nomSaisi: elements.nom.value.trim(),
      createur: elements.createur.value,
      date: formaterDateKAAWA(new Date()),
      position: positionDeLaSaisie(editeur.saisie()),
    };
    if (genre === 'variantes') {
      const types = [...casesTypes].filter(([, caseACocher]) => caseACocher.checked).map(([cle]) => cle);
      return entreeVarianteMy({ ...commun, types, source });
    }
    return entreePuzzleMy({
      ...commun,
      ...choix,
      toursMaximum: elements.tours.value.trim(),
      solutionsAuPremierCoup: elements.solutions.value.trim(),
      debutsDeSolution: elements.debuts.value.trim(),
    });
  }

  // Ce qui est refuse, ou null. Meme ordre que KAAWA : la position, puis les tours.
  function erreurActuelle() {
    if (!editeur.texteLisible()) return 'Position illisible (format : 0a12b123..._0a45b456...).';
    const erreurPosition = erreurDeSaisie(editeur.saisie());
    if (erreurPosition) return `Position incomplète : ${erreurPosition}.`;
    if (genre === 'puzzles') {
      const erreurTours = erreurDePuzzle({ toursMaximum: elements.tours.value.trim() });
      if (erreurTours) return `Puzzle incomplet : ${erreurTours}.`;
    }
    return null;
  }

  function afficherResume() {
    for (const bouton of boutonsDeChoix) {
      bouton.classList.toggle('bouton-actif', choix[bouton.dataset.choix] === bouton.dataset.valeur);
    }
    elements.erreur.hidden = true;
    if (!editeur.texteLisible() || erreurDeSaisie(editeur.saisie())) {
      elements.resume.textContent = 'Posez au moins une bille de chaque couleur.';
      return;
    }
    const entree = entreeActuelle();
    const nom = genre === 'variantes' ? entree.variant_name : entree.PZL_name;
    const lignes = [`Nom : ${nom}`, `Position : ${entree.pos}`];
    if (genre === 'variantes') {
      const marques = [
        entree.equilibre === 'True' && 'Équilibrée',
        entree.handi_score === 'True' && 'Handi score',
        entree.handi_bille === 'True' && 'Handi billes',
      ].filter(Boolean);
      if (marques.length > 0) lignes.push(marques.join(' · '));
    } else if (choix.premierJoueur === 'blanc') {
      lignes.push('Camps inversés à l’enregistrement : KAAWA fait toujours commencer Noir.');
    }
    elements.resume.textContent = lignes.join('\n');
  }

  function montrerErreur(message) {
    elements.erreur.textContent = message;
    elements.erreur.hidden = false;
  }

  elements.annuler.addEventListener('click', () => elements.dialogue.close());

  elements.enregistrer.addEventListener('click', () => {
    const erreur = erreurActuelle();
    if (erreur) {
      montrerErreur(erreur);
      return;
    }
    const enregistrer = () => rappels.enregistrer(genre, entreeActuelle());
    const saisie = editeur.saisie();
    // Garde-fou de KAAWA : un puzzle part presque toujours d'une fin de partie.
    if (genre === 'puzzles' && saisie.ejectionsNoires === 0 && saisie.ejectionsBlanches === 0) {
      rappels.confirmer('Aucune bille éjectée : est-ce bien la position de départ du puzzle ?', enregistrer, 'Oui');
    } else {
      enregistrer();
    }
  });

  function ouvrir(nouveauGenre, formulaire) {
    genre = nouveauGenre;
    source = formulaire?.source ?? null;
    const estPuzzle = genre === 'puzzles';
    elements.titre.textContent = formulaire
      ? `Modifier ${estPuzzle ? 'le puzzle' : 'la variante'} (copie dans My)`
      : estPuzzle ? 'Nouveau puzzle (My)' : 'Nouvelle variante (My)';
    elements.sectionVariante.hidden = estPuzzle;
    elements.sectionPuzzle.hidden = !estPuzzle;

    elements.nom.value = formulaire?.nomSaisi ?? '';
    elements.createur.value = formulaire?.createur ?? '';
    for (const [cle, caseACocher] of casesTypes) caseACocher.checked = formulaire?.types?.includes(cle) ?? false;
    choix = estPuzzle && formulaire
      ? { typeDePuzzle: formulaire.typeDePuzzle, niveau: formulaire.niveau, premierJoueur: formulaire.premierJoueur, gagnant: formulaire.gagnant }
      : { ...CHOIX_PUZZLE_PAR_DEFAUT };
    elements.tours.value = formulaire?.toursMaximum ?? '';
    elements.solutions.value = formulaire?.solutionsAuPremierCoup ?? '';
    elements.debuts.value = formulaire?.debutsDeSolution ?? '';

    editeur.definir(formulaire?.position ?? POSITION_VIDE);
    afficherResume();
    elements.dialogue.showModal();
  }

  return { ouvrir };
}
