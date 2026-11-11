// Les noms deja donnes (saab, 2026-10-08 : « une fois le nom enregistre, une
// liste des noms apparaitra pour ne pas avoir a le reecrire ») : sous le champ
// d'un nom (la boite du nom, interface/noms-joueurs.js ; l'Entrainement), une
// colonne a droite, une ligne par nom avec son etoile de favori (verte, comme
// les Variantes) ; repliee sur le premier nom, elle se deplie quand on touche le
// champ (saab, 2026-10-09) ; toucher un nom le met dans le champ.
// L'ordre (moteur/noms-connus.js) : le plus utilise, puis les favoris, puis les
// autres, « comme pour les favoris des Variantes ».
//
// Retenus ici (`kaah-noms-connus` : { utilisations, favoris, masques }) : chaque
// nom valide compte une utilisation ; les parties de l'historique des joueurs
// (phase 35) comptent aussi. Jamais un nom par defaut, une date (le nom d'un
// Entrainement laisse sans nom, index.html) ni celui d'une machine.
// La ✕ d'un nom le masque (saab, 2026-11-06 : « comment supprimer un nom de la
// liste des joueurs ? ») : ses parties, son historique et ses ceintures restent,
// et le valider de nouveau le fait revenir.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ordreDesNomsConnus
// (moteur/noms-connus.js), estUnNomParDefaut (moteur/filtre-parties.js),
// estUneMachine, joueursDeLHistorique (moteur/historique-joueurs.js),
// resumesDeLHistorique (interface/historique-joueurs.js) viennent de fichiers
// charges avant celui-ci.

const CLE_NOMS_CONNUS = 'kaah-noms-connus';
const NOMBRE_MAX_NOMS_CONNUS = 12;

// La date yymmjjhhmm de KAAWA (interface/sauvegarde.js, formaterDateKAAWA) : le nom d'un Entrainement laisse sans nom.
const NOM_DATE = /^\d{10}$/;
const estUnNomDate = (nom) => NOM_DATE.test(nom);
const nomAProposer = (nom) => typeof nom === 'string' && nom !== '' && !estUnNomParDefaut(nom) && !estUnNomDate(nom) && !estUneMachine(nom);

// { utilisations: { nom: n }, favoris: [nom], masques: [nom] } ; l'ancienne liste de
// noms (avant les favoris) compte une utilisation par nom.
function lireNomsRetenus() {
  try {
    const brut = JSON.parse(window.localStorage.getItem(CLE_NOMS_CONNUS) ?? 'null');
    if (Array.isArray(brut)) return { utilisations: Object.fromEntries(brut.filter(nomAProposer).map((nom) => [nom, 1])), favoris: [], masques: [] };
    if (brut && typeof brut.utilisations === 'object') return { utilisations: brut.utilisations, favoris: Array.isArray(brut.favoris) ? brut.favoris : [], masques: Array.isArray(brut.masques) ? brut.masques : [] };
  } catch {
    // illisible : on repart de rien
  }
  return { utilisations: {}, favoris: [], masques: [] };
}

function ecrireNomsRetenus(retenus) {
  try {
    window.localStorage.setItem(CLE_NOMS_CONNUS, JSON.stringify(retenus));
  } catch {
    // stockage indisponible : la liste ne retient pas ce changement
  }
}

// Un nom valide : une utilisation de plus (et il revient s'il etait masque).
function retenirNomConnu(nom) {
  if (!nomAProposer(nom)) return;
  const retenus = lireNomsRetenus();
  retenus.utilisations[nom] = (retenus.utilisations[nom] ?? 0) + 1;
  retenus.masques = retenus.masques.filter((autre) => autre !== nom);
  ecrireNomsRetenus(retenus);
}

function masquerNomConnu(nom) {
  const retenus = lireNomsRetenus();
  delete retenus.utilisations[nom];
  retenus.favoris = retenus.favoris.filter((autre) => autre !== nom);
  retenus.masques = [...new Set([...retenus.masques, nom])];
  ecrireNomsRetenus(retenus);
}

function basculerNomFavori(nom) {
  const retenus = lireNomsRetenus();
  retenus.favoris = retenus.favoris.includes(nom) ? retenus.favoris.filter((autre) => autre !== nom) : [...retenus.favoris, nom];
  ecrireNomsRetenus(retenus);
}

function nomsConnus() {
  const { utilisations, favoris, masques } = lireNomsRetenus();
  const toutes = Object.fromEntries(Object.entries(utilisations).filter(([nom]) => nomAProposer(nom)));
  for (const joueur of joueursDeLHistorique(resumesDeLHistorique())) {
    if (nomAProposer(joueur.nom)) toutes[joueur.nom] = (toutes[joueur.nom] ?? 0) + joueur.parties;
  }
  for (const nom of masques) delete toutes[nom];
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
  // Redessinee, la liste reste depliee si elle l'etait.
  const redessiner = () => {
    const deplie = !conteneur.classList.contains('liste-repliee');
    afficherNomsConnus(conteneur, champ);
    conteneur.classList.toggle('liste-repliee', !deplie);
  };
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
        redessiner();
      });
      const texte = document.createElement('span');
      texte.className = 'ligne-liste-texte';
      texte.textContent = nom;
      // La ✕, en deux touchers (saab : « avec confirmation ») : le premier demande « Retirer ? » en rouge, le second
      // masque le nom ; toucher la ligne entre les deux renonce.
      const retirer = document.createElement('button');
      retirer.type = 'button';
      retirer.className = 'bouton-retirer-nom';
      retirer.textContent = '✕';
      retirer.title = 'Retirer ce nom de la liste : ses parties, son historique et ses ceintures restent ; il revient si on le valide de nouveau';
      retirer.addEventListener('click', (evenement) => {
        evenement.stopPropagation(); // ne choisit pas le nom
        if (!ligne.classList.contains('nom-a-retirer')) {
          ligne.classList.add('nom-a-retirer');
          retirer.textContent = 'Retirer ?';
          return;
        }
        masquerNomConnu(nom);
        redessiner();
      });
      ligne.append(etoile, texte, retirer);
      ligne.addEventListener('click', () => {
        if (ligne.classList.contains('nom-a-retirer')) {
          ligne.classList.remove('nom-a-retirer');
          retirer.textContent = '✕';
          return;
        }
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
