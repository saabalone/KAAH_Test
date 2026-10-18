// Les noms deja donnes (saab, 2026-10-08 : « une fois le nom enregistre, une
// liste des noms apparaitra pour ne pas avoir a le reecrire ») : sous le champ
// d'un nom (la boite du nom, interface/noms-joueurs.js ; l'Entrainement), une
// colonne a droite, une ligne par nom avec son etoile de favori (verte, comme
// les Variantes) ; repliee sur le premier nom, elle se deplie quand on touche le
// champ (saab, 2026-10-09) ; toucher un nom le met dans le champ.
// L'ordre (moteur/noms-connus.js) : le plus utilise, puis les favoris, puis les
// autres, « comme pour les favoris des Variantes ».
//
// Retenus ici (`kaah-noms-connus` : { utilisations, favoris }) : chaque nom
// valide compte une utilisation ; les parties de l'historique des joueurs
// (phase 35) comptent aussi. Jamais un nom par defaut ni celui d'une machine.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ordreDesNomsConnus
// (moteur/noms-connus.js), estUnNomParDefaut (moteur/filtre-parties.js),
// estUneMachine, joueursDeLHistorique (moteur/historique-joueurs.js),
// resumesDeLHistorique (interface/historique-joueurs.js) viennent de fichiers
// charges avant celui-ci.

const CLE_NOMS_CONNUS = 'kaah-noms-connus';
const NOMBRE_MAX_NOMS_CONNUS = 12;

const nomAProposer = (nom) => typeof nom === 'string' && nom !== '' && !estUnNomParDefaut(nom) && !estUneMachine(nom);

// { utilisations: { nom: n }, favoris: [nom] } ; l'ancienne liste de noms (avant
// les favoris) compte une utilisation par nom.
function lireNomsRetenus() {
  try {
    const brut = JSON.parse(window.localStorage.getItem(CLE_NOMS_CONNUS) ?? 'null');
    if (Array.isArray(brut)) return { utilisations: Object.fromEntries(brut.filter(nomAProposer).map((nom) => [nom, 1])), favoris: [] };
    if (brut && typeof brut.utilisations === 'object') return { utilisations: brut.utilisations, favoris: Array.isArray(brut.favoris) ? brut.favoris : [] };
  } catch {
    // illisible : on repart de rien
  }
  return { utilisations: {}, favoris: [] };
}

function ecrireNomsRetenus(retenus) {
  try {
    window.localStorage.setItem(CLE_NOMS_CONNUS, JSON.stringify(retenus));
  } catch {
    // stockage indisponible : la liste ne retient pas ce changement
  }
}

// Un nom valide : une utilisation de plus.
function retenirNomConnu(nom) {
  if (!nomAProposer(nom)) return;
  const retenus = lireNomsRetenus();
  retenus.utilisations[nom] = (retenus.utilisations[nom] ?? 0) + 1;
  ecrireNomsRetenus(retenus);
}

function basculerNomFavori(nom) {
  const retenus = lireNomsRetenus();
  retenus.favoris = retenus.favoris.includes(nom) ? retenus.favoris.filter((autre) => autre !== nom) : [...retenus.favoris, nom];
  ecrireNomsRetenus(retenus);
}

function nomsConnus() {
  const { utilisations, favoris } = lireNomsRetenus();
  const toutes = { ...utilisations };
  for (const joueur of joueursDeLHistorique(resumesDeLHistorique())) {
    if (nomAProposer(joueur.nom)) toutes[joueur.nom] = (toutes[joueur.nom] ?? 0) + joueur.parties;
  }
  return { noms: ordreDesNomsConnus(toutes, favoris).slice(0, NOMBRE_MAX_NOMS_CONNUS), favoris };
}

// La colonne des noms connus dans `conteneur` (cachee s'il n'y en a aucun) : une
// ligne par nom (.ligne-liste, comme les Variantes : l'etoile verte d'un favori),
// repliee sur la premiere (le plus utilise : un toucher et c'est lui) ; toucher
// le champ la deplie, choisir un nom la replie. Elle defile si elle est longue.
function afficherNomsConnus(conteneur, champ) {
  const { noms, favoris } = nomsConnus();
  conteneur.hidden = noms.length === 0;
  conteneur.classList.add('liste-noms-connus', 'liste-repliee');
  conteneur.replaceChildren(
    ...noms.map((nom) => {
      const ligne = document.createElement('div');
      ligne.className = 'ligne-liste ligne-nom-connu';
      const etoile = document.createElement('button');
      etoile.type = 'button';
      const favori = favoris.includes(nom);
      etoile.className = favori ? 'bouton-favori bouton-favori-actif' : 'bouton-favori';
      etoile.textContent = favori ? '★' : '☆';
      etoile.title = favori ? 'Retirer des favoris' : 'Ajouter aux favoris';
      etoile.addEventListener('click', (evenement) => {
        evenement.stopPropagation(); // ne choisit pas le nom
        basculerNomFavori(nom);
        const deplie = !conteneur.classList.contains('liste-repliee');
        afficherNomsConnus(conteneur, champ);
        conteneur.classList.toggle('liste-repliee', !deplie);
      });
      const texte = document.createElement('span');
      texte.className = 'ligne-liste-texte';
      texte.textContent = nom;
      ligne.append(etoile, texte);
      ligne.addEventListener('click', () => {
        champ.value = nom;
        champ.dispatchEvent(new Event('input'));
        conteneur.classList.add('liste-repliee');
      });
      return ligne;
    })
  );
  if (champ.dataset.nomsConnusBranches) return;
  champ.dataset.nomsConnusBranches = 'oui';
  // Au toucher seulement : une boite qui s'ouvre donne le focus au champ, et la liste
  // doit alors rester repliee sur le nom (saab, 2026-10-09).
  champ.addEventListener('click', () => conteneur.classList.remove('liste-repliee'));
}

// Le PROPRIETAIRE de l'appareil (saab, 2026-10-09 : « la couleur de la ceinture dans
// l'icone changera avec la couleur du 1er Nom (qui normalement est le propriétaire
// de l'appareil) ou alors ajouter une coche pour le nom du propriétaire ») : le nom
// coche « C'est moi » dans la boite Entrainement, sinon le premier nom connu.
const CLE_PROPRIETAIRE = 'kaah-proprietaire';

function proprietaireCoche() {
  try {
    return window.localStorage.getItem(CLE_PROPRIETAIRE);
  } catch {
    return null;
  }
}

function proprietaireDeLAppareil() {
  return proprietaireCoche() ?? nomsConnus().noms[0] ?? null;
}

// `nom` : le proprietaire, ou null pour revenir au premier nom connu.
function definirProprietaire(nom) {
  try {
    if (nom) window.localStorage.setItem(CLE_PROPRIETAIRE, nom);
    else window.localStorage.removeItem(CLE_PROPRIETAIRE);
  } catch {
    // le choix ne survivra pas au rechargement
  }
}
