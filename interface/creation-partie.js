// La boite « Créer une partie » (phase 23) : un titre, une position de
// depart, une suite de coups collee (Nacre ou AbaPro, branches separees par
// `|`), comme « Créer Game (Nacre/AP) » de KAAWA. Toute la lecture est dans
// moteur/creation-partie.js : ce fichier n'orchestre que la boite.
//
// Notation : Auto (par defaut : la detection de KAAWA, puis l'autre notation si
// la suite ne se rejoue pas — voir construirePartieDepuisSequence), ou imposee.
// La notation retenue s'affiche pendant la saisie, pour ne jamais valider a
// l'aveugle.
//
// Non repris de KAAWA (decision documentee, PLAN.md phase 23) : le champ « Vérif
// PZL » (coller titre + position + suite d'un bloc), le choix de position dans
// une liste (charger d'abord une variante par sa boite : sa position arrive ici
// pre-remplie) et les permutations (phase 27).
//
// Les noms des deux camps (saab, 2026-11-03 : « il faut ouvrir chaque boite de nom pour les remplir, pourquoi ne pas
// mettre aussi ces champs dans créer ? ») : vides, Joueur_1 et Joueur_2 ; sous chacun, les noms deja donnes. Et
// le type (saab : « Mets aussi le type si on a besoin c'est pratique ») : la ligne de la Nouvelle partie.
// Sous le titre, le debut du nom de la partie tel que ces champs l'ecrivent deja (saab : « sinon on risque d'écrire
// en doublon ») ; dans le titre vide, le nom pris par defaut, comme Joueur_1 dans un nom vide.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lirePosition
// (moteur/notation.js), detecterNotation, construirePartieDepuisSequence
// (moteur/creation-partie.js), nomJoueurAutorise (moteur/nom-partie.js), NOMS_PAR_DEFAUT
// (moteur/revanche.js), demarrerTypeDePartie (interface/type-de-partie.js), formaterDateKAAWA
// (interface/sauvegarde.js) viennent de fichiers charges avant celui-ci ; afficherNomsConnus, retenirNomConnu
// (interface/noms-connus.js) ne servent qu'a l'ouverture et a la validation.

// Le message d'erreur, en toutes lettres, d'un resultat de
// construirePartieDepuisSequence. La branche n'est citee que s'il y en a
// plusieurs : "coup 3" suffit a retrouver le coup dans une suite simple.
function messageErreurCreation(erreur, plusieursBranches) {
  if (erreur.raison === 'aucun-coup') return 'Aucun coup reconnu dans la suite.';
  const ou = `${plusieursBranches ? `Branche ${erreur.branche}, coup` : 'Coup'} ${erreur.rang} (${erreur.texte})`;
  if (erreur.raison === 'partie-terminee') return `${ou} : la partie est déjà terminée (6 billes éjectées).`;
  return `${ou} : coup impossible dans cette position.`;
}

// `elements` : { dialogue, titre, apercuNom, nomNoir, nomBlanc, nomsConnusNoir, nomsConnusBlanc, type (la ligne
// Type : { ligne, champ, rapides }), position, sequence, notationAuto, notationNacre, notationAbaPro,
// notationReconnue, erreur, annuler, valider }.
// `rappels` : { creerLaPartie(arbre, titre, joueurs, evenement) (l'enregistre et l'affiche, voir index.html ;
// `joueurs` : { noir, blanc }), titreParDefaut(texteDePosition) (le titre d'un champ vide, la position telle que
// saisie), typeAProposer() }. Renvoie { ouvrir(texteDePosition) } : la boite
// s'ouvre depuis Mes parties, Variantes et Puzzles (demande de saab : une icone de moins
// dans la colonne), pre-remplie avec la position de la ligne choisie.
function demarrerCreationPartie(elements, rappels) {
  let notationForcee = null; // null = Auto
  const typeDePartie = demarrerTypeDePartie(elements.type);

  // Un espace devient « _ », comme dans la boite du nom (interface/noms-joueurs.js) ; vide : le nom par defaut.
  function joueursDesChamps() {
    const nomDe = (champ, camp) => nomJoueurAutorise(champ.value.trim().replace(/\s/g, '_')) || NOMS_PAR_DEFAUT[camp];
    return { noir: nomDe(elements.nomNoir, 'noir'), blanc: nomDe(elements.nomBlanc, 'blanc') };
  }

  const titreDesChamps = () => elements.titre.value.trim() || rappels.titreParDefaut(elements.position.value.trim());

  // Le debut du nom (moteur/nom-partie.js, nomDeFichierKAAWA) : la suite — score, tours, vainqueur — vient des coups.
  function afficherLeNomDeLaPartie() {
    elements.titre.placeholder = rappels.titreParDefaut(elements.position.value.trim());
    const joueurs = joueursDesChamps();
    const evenement = evenementDeLaPartie(elements.type.champ.value);
    elements.apercuNom.textContent = `Nom : ${formaterDateKAAWA(new Date())}, ${evenement}, ${titreDesChamps()}, ${joueurs.noir}-${joueurs.blanc}, …`;
  }
  // Tout ce qui change un champ : la saisie, un nom connu ou Amical/Test touches (leur clic remonte jusqu'ici).
  elements.dialogue.addEventListener('input', afficherLeNomDeLaPartie);
  elements.dialogue.addEventListener('click', afficherLeNomDeLaPartie);

  const boutonsNotation = [
    [elements.notationAuto, null],
    [elements.notationNacre, 'nacre'],
    [elements.notationAbaPro, 'abapro'],
  ];

  // La notation que la construction retiendra VRAIMENT : en Auto, elle peut
  // differer de la premiere devinette (voir construirePartieDepuisSequence, qui
  // essaie l'autre notation si la suite ne se rejoue pas). Sans position
  // lisible, on ne peut rien rejouer : la devinette seule.
  function notationRetenue(texte) {
    try {
      const resultat = construirePartieDepuisSequence(lirePosition(elements.position.value.trim()), texte, notationForcee);
      return resultat.erreur ? resultat.erreur.notation : resultat.notation;
    } catch {
      return detecterNotation(texte, notationForcee);
    }
  }

  function afficherNotation() {
    for (const [bouton, notation] of boutonsNotation) bouton.classList.toggle('bouton-actif', notation === notationForcee);
    const texte = elements.sequence.value;
    const detectee = notationRetenue(texte);
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
  elements.position.addEventListener('input', () => {
    afficherNotation();
    afficherErreur(null);
  });

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
    const joueurs = joueursDesChamps();
    retenirNomConnu(joueurs.noir);
    retenirNomConnu(joueurs.blanc);
    const titre = titreDesChamps();
    const evenement = typeDePartie.lire();
    elements.dialogue.close();
    rappels.creerLaPartie(resultat.arbre, titre, joueurs, evenement);
  });

  function ouvrir(texteDePosition) {
    elements.titre.value = '';
    elements.nomNoir.value = '';
    elements.nomBlanc.value = '';
    afficherNomsConnus(elements.nomsConnusNoir, elements.nomNoir);
    afficherNomsConnus(elements.nomsConnusBlanc, elements.nomBlanc);
    typeDePartie.proposer(rappels.typeAProposer());
    elements.position.value = texteDePosition;
    elements.sequence.value = '';
    notationForcee = null;
    afficherNotation();
    afficherErreur(null);
    afficherLeNomDeLaPartie();
    elements.dialogue.showModal();
    elements.sequence.focus();
  }

  return { ouvrir };
}
