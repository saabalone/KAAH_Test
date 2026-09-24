// La boite « Créer une partie » (phase 23) : un titre, une position de
// depart, une suite de coups collee (Nacre ou AbaPro, branches separees par
// `|`), comme « Créer Game (Nacre/AP) » de KAAWA. Toute la lecture est dans
// moteur/creation-partie.js : ce fichier n'orchestre que la boite.
//
// Notation : Auto (detection de KAAWA, par defaut), ou imposee — AbaPro pour le
// cas ambigu residuel (une suite AbaPro NUMEROTEE est prise pour du Nacre),
// Nacre par symetrie. La notation reconnue s'affiche pendant la saisie, pour
// ne jamais valider a l'aveugle.
//
// Non repris de KAAWA (decision documentee, PLAN.md phase 23) : le champ « Vérif
// PZL » (coller titre + position + suite d'un bloc), le choix de position dans
// une liste (charger d'abord une variante par sa boite : sa position arrive ici
// pre-remplie) et les permutations (phase 27).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lirePosition
// (moteur/notation.js), detecterNotation, construirePartieDepuisSequence
// (moteur/creation-partie.js) viennent de fichiers charges avant celui-ci.

// Le message d'erreur, en toutes lettres, d'un resultat de
// construirePartieDepuisSequence. La branche n'est citee que s'il y en a
// plusieurs : "coup 3" suffit a retrouver le coup dans une suite simple.
function messageErreurCreation(erreur, plusieursBranches) {
  if (erreur.raison === 'aucun-coup') return 'Aucun coup reconnu dans la suite.';
  const ou = `${plusieursBranches ? `Branche ${erreur.branche}, coup` : 'Coup'} ${erreur.rang} (${erreur.texte})`;
  if (erreur.raison === 'partie-terminee') return `${ou} : la partie est déjà terminée (6 billes éjectées).`;
  return `${ou} : coup impossible dans cette position.`;
}

// `elements` : { bouton, dialogue, titre, position, sequence, notationAuto,
// notationNacre, notationAbaPro, notationReconnue, erreur, annuler, valider }.
// `rappels` : { positionDeDepart() (texte de la position a pre-remplir),
// creerLaPartie(arbre, titre, texteDePosition) (l'enregistre et l'affiche, voir
// index.html ; `texteDePosition` tel que saisi, pour le nom par defaut de KAAWA) }.
function demarrerCreationPartie(elements, rappels) {
  let notationForcee = null; // null = Auto

  const boutonsNotation = [
    [elements.notationAuto, null],
    [elements.notationNacre, 'nacre'],
    [elements.notationAbaPro, 'abapro'],
  ];

  function afficherNotation() {
    for (const [bouton, notation] of boutonsNotation) bouton.classList.toggle('bouton-actif', notation === notationForcee);
    const texte = elements.sequence.value;
    const detectee = detecterNotation(texte, notationForcee);
    const nom = { nacre: 'Nacre', abapro: 'AbaPro', inconnue: '—' }[detectee];
    elements.notationReconnue.textContent =
      texte.trim() === '' ? '' : notationForcee ? `Notation imposée : ${nom}` : `Notation reconnue : ${nom}`;
  }

  function afficherErreur(message) {
    elements.erreur.hidden = message === null;
    elements.erreur.textContent = message ?? '';
  }

  for (const [bouton, notation] of boutonsNotation) {
    bouton.addEventListener('click', () => {
      notationForcee = notation;
      afficherNotation();
    });
  }
  elements.sequence.addEventListener('input', () => {
    afficherNotation();
    afficherErreur(null);
  });
  elements.position.addEventListener('input', () => afficherErreur(null));

  elements.annuler.addEventListener('click', () => elements.dialogue.close());

  elements.valider.addEventListener('click', () => {
    let etatDepart;
    try {
      etatDepart = lirePosition(elements.position.value.trim());
    } catch {
      afficherErreur('Position de départ illisible (format : 0a12b123..._0a45b456...).');
      return;
    }
    const resultat = construirePartieDepuisSequence(etatDepart, elements.sequence.value, notationForcee);
    if (resultat.erreur) {
      afficherErreur(messageErreurCreation(resultat.erreur, elements.sequence.value.includes('|')));
      return;
    }
    elements.dialogue.close();
    rappels.creerLaPartie(resultat.arbre, elements.titre.value.trim(), elements.position.value.trim());
  });

  elements.bouton.addEventListener('click', () => {
    elements.titre.value = '';
    elements.position.value = rappels.positionDeDepart();
    elements.sequence.value = '';
    notationForcee = null;
    afficherNotation();
    afficherErreur(null);
    elements.dialogue.showModal();
    elements.sequence.focus();
  });
}
