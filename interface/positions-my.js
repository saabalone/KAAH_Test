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
// Pas d'import ni d'export (voir moteur/plateau.js) : fichierPositionsMy
// (moteur/positions-my.js) vient d'un fichier charge avant celui-ci.

// `genre` : 'variantes' ou 'puzzles'.
const RANGEMENT_POSITIONS_MY = {
  variantes: { cle: 'kaah-variantes-my', fichier: 'KAA_variants_my.json' },
  puzzles: { cle: 'kaah-puzzles-my', fichier: 'KAA_PZL_my.json' },
};

function listerEntreesMy(genre) {
  try {
    const texte = window.localStorage.getItem(RANGEMENT_POSITIONS_MY[genre].cle);
    return texte ? JSON.parse(texte) : [];
  } catch {
    return [];
  }
}

// Ajoute toujours, ne remplace jamais : « Modifier » cree une copie, comme KAAWA
// (decide avec saab). Renvoie false si le navigateur a refuse d'enregistrer.
function ajouterEntreeMy(genre, entree) {
  try {
    window.localStorage.setItem(RANGEMENT_POSITIONS_MY[genre].cle, JSON.stringify([...listerEntreesMy(genre), entree]));
    return true;
  } catch {
    return false;
  }
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
