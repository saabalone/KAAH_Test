// La corbeille (phase 26, PLAN.md) : stockage navigateur et dialogue
// "Corbeille", ouvert depuis Mes parties/Variantes/Puzzles (un seul
// dialogue partage, comme KAA_trash.json est deja un seul fichier partage
// entre variantes et puzzles dans KAAWA, kaa_menus_ClO_Co.py — KAAH y ajoute
// les parties, que KAAWA deplace seulement d'un dossier a un autre). Pur
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
// restaurerDepuisCorbeille, viderLaCorbeille (moteur/corbeille.js),
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

// Restaure l'entree de rang `index` : la remet dans SA liste d'origine
// (selon son genre), puis la retire de la corbeille. Renvoie false si l'une
// des deux ecritures a echoue — l'entree reste alors dans la corbeille,
// jamais perdue entre les deux.
function restaurerEntreeCorbeille(index) {
  const { corbeille, entree } = restaurerDepuisCorbeille(listerCorbeille(), index);
  const remise =
    entree.genre === 'parties'
      ? ecrirePartiesEnregistrees([...listerPartiesEnregistrees(), entree.donnees])
      : ajouterEntreeMy(entree.genre, entree.donnees);
  return remise && ecrireCorbeille(corbeille);
}

function viderLaCorbeilleStockee() {
  return ecrireCorbeille(viderLaCorbeille());
}

// --- Dialogue "Corbeille" -------------------------------------------------------

const NOM_GENRE_CORBEILLE = { variantes: 'Variante', puzzles: 'Puzzle', parties: 'Partie' };

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

// `elements` : { boutons (un par dialogue qui ouvre la corbeille : Mes
// parties, Variantes, Puzzles), dialogue, liste, vider, fermer }.
// `rappels` : { demanderConfirmation (interface/confirmation.js),
// demarrerRechargement (index.html) } — une restauration recharge la page,
// meme principe que toute autre modification de My/Mes parties (voir
// interface/positions-my.js, formulairePositionMy).
function demarrerCorbeille(elements, rappels) {
  for (const bouton of elements.boutons) {
    bouton.addEventListener('click', () => {
      rafraichir();
      elements.dialogue.showModal();
    });
  }
  elements.fermer.addEventListener('click', () => elements.dialogue.close());

  elements.vider.addEventListener('click', () => {
    rappels.demanderConfirmation(
      'Vider la corbeille ? Cette action est irréversible.',
      () => {
        viderLaCorbeilleStockee();
        rafraichir();
      },
      'Vider'
    );
  });

  function rafraichir() {
    const corbeille = listerCorbeille();
    elements.liste.innerHTML = '';
    elements.vider.disabled = corbeille.length === 0;
    if (corbeille.length === 0) {
      const vide = document.createElement('p');
      vide.textContent = 'La corbeille est vide.';
      elements.liste.appendChild(vide);
      return;
    }
    corbeille.forEach((entree, index) => elements.liste.appendChild(creerLigne(entree, index)));
  }

  function creerLigne(entree, index) {
    const ligne = document.createElement('div');
    ligne.className = 'ligne-liste';

    const texte = document.createElement('span');
    texte.className = 'ligne-liste-texte';
    texte.textContent = `${NOM_GENRE_CORBEILLE[entree.genre]} : ${nomAfficheCorbeille(entree)}`;
    ligne.appendChild(texte);

    const restaurer = document.createElement('button');
    restaurer.type = 'button';
    restaurer.className = 'bouton-dialogue';
    restaurer.textContent = 'Restaurer';
    restaurer.addEventListener('click', () => {
      restaurerEntreeCorbeille(index);
      elements.dialogue.close();
      rappels.demarrerRechargement();
    });
    ligne.appendChild(restaurer);

    return ligne;
  }
}
