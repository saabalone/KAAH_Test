// Ou vivent les positions « My » (phase 23bis) : dans le stockage du navigateur,
// une cle pour les variantes, une pour les puzzles — chacune un tableau
// d'entrees AU FORMAT DE KAAWA (moteur/positions-my.js), jamais melangees aux
// listes officielles (donnees/, fichiers statiques jamais modifies). Meme
// philosophie que « Mes parties » (interface/sauvegarde.js) : un stockage
// indisponible ne fait jamais planter, il prive seulement des My.
//
// Et comment elles en sortent : l'export telecharge exactement le fichier que
// KAAWA ecrirait (KAA_variants_my.json, KAA_PZL_my.json), pour qu'elles ne
// restent jamais prisonnieres d'un seul navigateur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : fichierPositionsMy,
// fusionnerEntreesMy (moteur/positions-my.js), lireVariantes
// (moteur/variantes.js), lirePuzzles (moteur/puzzles.js) viennent de
// fichiers charges avant celui-ci.

// `genre` : 'variantes' ou 'puzzles'. `champNom` (phase 26, import) : le
// champ de l'entree KAAWA qui porte son nom, pour fusionnerEntreesMy.
// `lire` : la fonction qui verifie qu'une liste d'entrees est bien lisible
// (leve une erreur sinon) — importerEntreesMy s'en sert pour ne jamais
// enregistrer un fichier casse.
const RANGEMENT_POSITIONS_MY = {
  variantes: { cle: 'kaah-variantes-my', fichier: 'KAA_variants_my.json', champNom: 'variant_name', lire: lireVariantes },
  puzzles: { cle: 'kaah-puzzles-my', fichier: 'KAA_PZL_my.json', champNom: 'PZL_name', lire: lirePuzzles },
};

function listerEntreesMy(genre) {
  try {
    const texte = window.localStorage.getItem(RANGEMENT_POSITIONS_MY[genre].cle);
    return texte ? JSON.parse(texte) : [];
  } catch {
    return [];
  }
}

function ecrireEntreesMy(genre, entrees) {
  try {
    window.localStorage.setItem(RANGEMENT_POSITIONS_MY[genre].cle, JSON.stringify(entrees));
    return true;
  } catch {
    return false;
  }
}

// Ajoute toujours, ne remplace jamais : « Modifier » cree une copie, comme KAAWA
// (decide avec saab). Renvoie false si le navigateur a refuse d'enregistrer.
function ajouterEntreeMy(genre, entree) {
  return ecrireEntreesMy(genre, [...listerEntreesMy(genre), entree]);
}

// Phase 26 (corbeille) : retire UNE entree, celle dont le contenu correspond
// exactement (aucun champ ne sert d'identifiant dans le format de KAAWA).
// L'appelant (envoyerALaCorbeille, interface/corbeille.js) en garde une copie
// intacte avant cet appel — rien n'est jamais perdu, seulement deplace.
function retirerEntreeMy(genre, entree) {
  const texteCible = JSON.stringify(entree);
  const entrees = listerEntreesMy(genre);
  const index = entrees.findIndex((candidate) => JSON.stringify(candidate) === texteCible);
  if (index === -1) return false;
  entrees.splice(index, 1);
  return ecrireEntreesMy(genre, entrees);
}

// Phase 26 (import) : fusionne un fichier My importe avec les entrees deja
// enregistrees (fusionnerEntreesMy, moteur/positions-my.js) et enregistre le
// resultat. Leve une erreur (message de `lire`, explicite) SANS RIEN
// ENREGISTRER si le resultat fusionne ne serait pas lisible — jamais casser
// les My deja la pour un fichier importe invalide. Renvoie la liste des
// renommages faits (a annoncer), ou `null` si l'ecriture a echoue.
function importerEntreesMy(genre, importees) {
  const rangement = RANGEMENT_POSITIONS_MY[genre];
  const { fusionnees, renommees } = fusionnerEntreesMy(listerEntreesMy(genre), importees, rangement.champNom);
  rangement.lire({ content: fusionnees }, true);
  return ecrireEntreesMy(genre, fusionnees) ? renommees : null;
}

// Meme mecanique que telechargerPartie (interface/fichiers.js).
function telechargerPositionsMy(genre) {
  const texte = fichierPositionsMy(listerEntreesMy(genre));
  const url = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = RANGEMENT_POSITIONS_MY[genre].fichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
