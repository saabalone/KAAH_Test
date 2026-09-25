// La corbeille (phase 26, PLAN.md) : stockage navigateur et dialogue
// "Corbeille". Un seul stockage pour les trois genres, comme KAA_trash.json est
// deja un seul fichier partage entre variantes et puzzles dans KAAWA
// (kaa_menus_ClO_Co.py — KAAH y ajoute les parties, que KAAWA deplace
// seulement d'un dossier a un autre) ; mais chaque boite (Mes parties,
// Variantes, Puzzles) a son bouton et ne montre que SON genre. Pur
// stockage + affichage, aucune regle du jeu : moteur/corbeille.js decide
// quoi faire d'une liste, celui-ci sait seulement ou la ranger dans le
// navigateur et comment l'afficher.
//
// Une entree restauree retourne exactement d'ou elle vient : My
// (retirerEntreeMy/ajouterEntreeMy, interface/positions-my.js) ou Mes
// parties (listerPartiesEnregistrees/ecrirePartiesEnregistrees, interface/
// sauvegarde.js).
//
// Meme philosophie que le reste du stockage local (interface/sauvegarde.js) :
// un stockage indisponible ne fait jamais planter, il prive seulement de
// corbeille.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : mettreALaCorbeille,
// restaurerPlusieurs, viderLeGenre (moteur/corbeille.js),
// ajouterEntreeMy (interface/positions-my.js), listerPartiesEnregistrees,
// ecrirePartiesEnregistrees (interface/sauvegarde.js), nomDeFichierKAAWA
// (moteur/nom-partie.js) viennent de fichiers charges avant celui-ci.

const CLE_CORBEILLE = 'kaah-corbeille';

function listerCorbeille() {
  try {
    const texte = window.localStorage.getItem(CLE_CORBEILLE);
    return texte ? JSON.parse(texte) : [];
  } catch {
    return [];
  }
}

function ecrireCorbeille(corbeille) {
  try {
    window.localStorage.setItem(CLE_CORBEILLE, JSON.stringify(corbeille));
    return true;
  } catch {
    return false;
  }
}

// Envoie `donnees` (une entree My intacte, ou { id, donnees } pour une
// partie) a la corbeille. `genre` : 'variantes', 'puzzles' ou 'parties'.
function envoyerALaCorbeille(genre, donnees) {
  return ecrireCorbeille(mettreALaCorbeille(listerCorbeille(), genre, donnees));
}

// Remet une entree restauree dans SA liste d'origine, selon son genre.
function remettreEnPlace(entree) {
  return entree.genre === 'parties'
    ? ecrirePartiesEnregistrees([...listerPartiesEnregistrees(), entree.donnees])
    : ajouterEntreeMy(entree.genre, entree.donnees);
}

// Restaure les entrees de rangs `rangs` (dans la corbeille ENTIERE) : chacune
// retourne dans sa liste d'origine, puis la corbeille est reecrite sans elles.
// Une entree dont la remise echoue (stockage plein) reste dans la corbeille,
// jamais perdue entre les deux. Renvoie le nombre d'entrees restaurees.
function restaurerEntreesCorbeille(rangs) {
  const avant = listerCorbeille();
  const { entrees } = restaurerPlusieurs(avant, rangs);
  const remises = new Set(entrees.filter(remettreEnPlace));
  ecrireCorbeille(avant.filter((entree) => !remises.has(entree)));
  return remises.size;
}

function viderLeGenreStocke(genre) {
  return ecrireCorbeille(viderLeGenre(listerCorbeille(), genre));
}

// --- Dialogue "Corbeille" -------------------------------------------------------

const TITRE_CORBEILLE = { variantes: 'Corbeille — Variantes My', puzzles: 'Corbeille — Puzzles My', parties: 'Corbeille — Mes parties' };

// Le nom affiche d'une entree, quel que soit son genre. Protege par
// try/catch comme les autres listes (interface/mes-parties.js, nomAffiche) :
// une entree corrompue affiche un repli plutot que de faire planter toute la
// liste pour une seule entree en cause.
function nomAfficheCorbeille({ genre, donnees }) {
  try {
    if (genre === 'variantes') return donnees.variant_name;
    if (genre === 'puzzles') return donnees.PZL_name;
    return nomDeFichierKAAWA(donnees.donnees);
  } catch {
    return '(illisible)';
  }
}

// UN dialogue, ouvert depuis chaque boite sur SON genre (demande de saab : la
// seule corbeille de Mes parties etait introuvable depuis Variantes et
// Puzzles). Cases a cocher + « Tout sélectionner » + « Restaurer la
// sélection », meme principe que la suppression de Mes parties
// (interface/mes-parties.js) ; la boite ne se ferme plus a chaque
// restauration (saab : "je dois faire la navette") — la page ne se recharge
// qu'une fois, a la FERMETURE, et seulement si quelque chose a ete restaure
// (les listes Variantes et Puzzles sont lues au demarrage).
//
// `elements` : { ouvertures ([{ bouton, genre }]), dialogue, titre, liste,
// caseTout, restaurer, vider, fermer }. `rappels` : { demanderConfirmation
// (interface/confirmation.js), demarrerRechargement (index.html) }.
function demarrerCorbeille(elements, rappels) {
  let genre = 'parties';
  let rangsCoches = new Set();
  let quelqueChoseRestaure = false;

  for (const { bouton, genre: genreDeLaBoite } of elements.ouvertures) {
    bouton.addEventListener('click', () => {
      genre = genreDeLaBoite;
      rangsCoches = new Set();
      elements.titre.textContent = TITRE_CORBEILLE[genre];
      rafraichir();
      elements.dialogue.showModal();
    });
  }

  // Rangs (dans la corbeille entiere) des entrees de CE genre.
  function rangsDuGenre() {
    return listerCorbeille()
      .map((entree, rang) => (entree.genre === genre ? rang : null))
      .filter((rang) => rang !== null);
  }

  // Appelee directement par Fermer, ET par l'evenement 'close' (Echap, clic a
  // l'exterieur) : 'close' ne se declenche pas toujours de facon fiable (vu
  // en phase 25, interface/permutations.js) ; le drapeau evite un double appel.
  function apresFermeture() {
    if (!quelqueChoseRestaure) return;
    quelqueChoseRestaure = false;
    rappels.demarrerRechargement();
  }
  elements.fermer.addEventListener('click', () => {
    elements.dialogue.close();
    apresFermeture();
  });
  elements.dialogue.addEventListener('close', apresFermeture);

  elements.caseTout.addEventListener('change', () => {
    rangsCoches = elements.caseTout.checked ? new Set(rangsDuGenre()) : new Set();
    rafraichir();
  });

  elements.restaurer.addEventListener('click', () => {
    if (rangsCoches.size === 0) return;
    if (restaurerEntreesCorbeille([...rangsCoches]) > 0) quelqueChoseRestaure = true;
    rangsCoches = new Set();
    rafraichir();
  });

  elements.vider.addEventListener('click', () => {
    rappels.demanderConfirmation(
      `Vider la corbeille (${TITRE_CORBEILLE[genre].split('— ')[1]}) ? Cette action est irréversible.`,
      () => {
        viderLeGenreStocke(genre);
        rangsCoches = new Set();
        rafraichir();
      },
      'Vider'
    );
  });

  function actualiserBarre(nombre) {
    const n = rangsCoches.size;
    elements.restaurer.disabled = n === 0;
    elements.restaurer.textContent = n === 0 ? 'Restaurer la sélection' : `Restaurer la sélection (${n})`;
    elements.vider.disabled = nombre === 0;
    elements.caseTout.disabled = nombre === 0;
    elements.caseTout.checked = nombre > 0 && n === nombre;
    elements.caseTout.indeterminate = n > 0 && n < nombre;
  }

  function rafraichir() {
    const corbeille = listerCorbeille();
    const rangs = rangsDuGenre();
    rangsCoches = new Set([...rangsCoches].filter((rang) => rangs.includes(rang)));
    elements.liste.innerHTML = '';
    actualiserBarre(rangs.length);
    if (rangs.length === 0) {
      const vide = document.createElement('p');
      vide.textContent = 'La corbeille est vide.';
      elements.liste.appendChild(vide);
      return;
    }
    // La plus recemment supprimee en premier, comme Mes parties.
    for (const rang of [...rangs].reverse()) elements.liste.appendChild(creerLigne(corbeille[rang], rang));
  }

  function creerLigne(entree, rang) {
    const ligne = document.createElement('label');
    ligne.className = 'ligne-liste';

    const coche = document.createElement('input');
    coche.type = 'checkbox';
    coche.className = 'case-partie';
    coche.checked = rangsCoches.has(rang);
    coche.addEventListener('change', () => {
      if (coche.checked) rangsCoches.add(rang);
      else rangsCoches.delete(rang);
      actualiserBarre(rangsDuGenre().length);
    });
    ligne.appendChild(coche);

    const texte = document.createElement('span');
    texte.className = 'ligne-liste-texte';
    texte.textContent = nomAfficheCorbeille(entree);
    ligne.appendChild(texte);
    return ligne;
  }
}
