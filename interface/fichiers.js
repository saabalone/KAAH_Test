// Telecharger/importer un fichier de partie au format JSON de KAAWA
// (Phase 12) — separe de interface/sauvegarde.js (le stockage local du
// navigateur) : ce fichier-ci ne touche qu'a de vrais fichiers, sur le
// disque de l'utilisateur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ecrireReglagesJSON
// (moteur/reglages.js) et formaterDateKAAWA (interface/sauvegarde.js)
// viennent de fichiers charges avant celui-ci dans index.html.

// Propose au navigateur de telecharger `donnees` comme un fichier JSON —
// le mecanisme standard du web (Blob + lien invisible), pas une
// dependance externe.
function telechargerPartie(donnees, nomFichier) {
  const texte = JSON.stringify(donnees);
  const url = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier.endsWith('.json') ? nomFichier : `${nomFichier}.json`;
  // Attache puis detache le lien : certains navigateurs ne declenchent le
  // telechargement d'un lien QUE s'il fait partie du document au moment
  // du clic (constate avec la partie exportee par saab, qui ne se
  // rechargeait pas ensuite).
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  // Revoquer l'URL trop tot couperait le telechargement avant qu'il ait
  // fini de lire le Blob (le fichier telecharge se retrouverait vide ou
  // tronque) : un delai, meme court, laisse le temps au navigateur de le
  // demarrer pour de bon. C'est tres probablement ce qui a produit le
  // fichier illisible que saab a essaye de reimporter.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Meme mecanique que telechargerPartie ci-dessus, pour un fichier de
// reglages plutot qu'une partie (phase 22, interface/reglages.js) : format
// SPARSE de KAAWA (ecrireReglagesJSON, moteur/reglages.js), pas un simple
// JSON.stringify. Nom EXACT demande par saab : `settings_kaah_<date
// KAAWA>` (meme format de date que l'export d'une partie), plutot qu'un nom
// fixe qui forçait le navigateur a numeroter les telechargements
// (`settings_kaah (3).json`...).
function telechargerReglages(reglages) {
  const url = URL.createObjectURL(new Blob([ecrireReglagesJSON(reglages)], { type: 'application/json' }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = `settings_kaah_${formaterDateKAAWA(new Date())}.json`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Ouvre le selecteur de fichier natif du navigateur (une balise <input>
// creee et detachee a chaque appel : certains navigateurs — dont Safari,
// la cible de reference de CLAUDE.md — n'ouvrent le vrai selecteur que si
// l'element est attache au document au moment du clic) et appelle
// `surFichierChoisi(donnees)` avec le JSON lu, ou `surErreur(message)` si
// le fichier n'est pas un JSON valide.
function demarrerImportation(surFichierChoisi, surErreur) {
  const entree = document.createElement('input');
  entree.type = 'file';
  entree.accept = '.json,application/json';
  entree.style.display = 'none';
  entree.addEventListener('change', () => {
    const fichier = entree.files[0];
    entree.remove();
    if (!fichier) return;
    fichier
      .text()
      .then((texte) => surFichierChoisi(JSON.parse(texte)))
      .catch(() => surErreur(`"${fichier.name}" n'est pas un fichier de partie lisible.`));
  });
  document.body.appendChild(entree);
  entree.click();
}
