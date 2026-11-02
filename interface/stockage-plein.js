// Le STOCKAGE PLEIN (saab, 2026-10-31 : « si on a exporté tout automatiquement, les fichiers devrait être vide sinon ça
// ne sert à rien ... il faut garder la partie en cours qu'on puisse la continuer sans avoir à la recharger ... c'est
// donc juste les fichiers des parties et réflexion qui sont encombrant » ; « Et pour la corbeille aussi il faut pouvoir
// la récupérer ») : son contenu vient d'etre telecharge (interface/sauvegarde-complete.js,
// exporterToutAvecLaPartieEnCours) ; cette boite propose de vider ce qui encombre — Mes parties sauf la partie en cours,
// les recherches gardees, la Corbeille (moteur/sauvegarde-complete.js, videDuStockagePlein) — et la partie continue,
// sans recharger ; le reste (reglages, profils, Entrainement, historique des joueurs) ne bouge pas. Tout se reprend par
// Importer (interface/import-parties.js). Un geste (Vider), pas un vidage tout seul : si le navigateur a bloque ou
// refuse le telechargement, rien n'est perdu.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : videDuStockagePlein (moteur/sauvegarde-complete.js),
// lireToutLeStockage, OU_TROUVER_LES_FICHIERS_EXPORTES (interface/sauvegarde-complete.js), CLE_MES_PARTIES,
// obtenirIdPartieActive (interface/sauvegarde.js), CLE_ARCHIVE_RECHERCHES (interface/stockage-recherches.js),
// CLE_CORBEILLE, actualiserBoutonsCorbeille (interface/corbeille.js) viennent d'autres fichiers du jeu, appeles
// seulement a l'usage.

// `elements` : { dialogue, texte, vider, plusTard } ; `apresLeVidage()` : la partie en cours se reenregistre, la jauge
// suit. Renvoie { proposer({ fichier, place }) }.
function demarrerStockagePlein(elements, apresLeVidage) {
  const zonesAVider = () => [CLE_ARCHIVE_RECHERCHES, CLE_CORBEILLE];
  elements.plusTard.addEventListener('click', () => elements.dialogue.close());
  elements.vider.addEventListener('click', () => {
    const { ecrire, retirer } = videDuStockagePlein(lireToutLeStockage(), CLE_MES_PARTIES, obtenirIdPartieActive(), zonesAVider());
    try {
      // Retirer d'abord : la place se libere avant d'ecrire Mes parties (plus petit qu'avant de toute facon).
      for (const cle of retirer) window.localStorage.removeItem(cle);
      for (const [cle, texte] of Object.entries(ecrire)) window.localStorage.setItem(cle, texte);
    } catch {
      // Le stockage refuse encore : le titre de la partie le redira.
    }
    actualiserBoutonsCorbeille();
    elements.dialogue.close();
    apresLeVidage();
  });

  function proposer({ fichier, place }) {
    const { partiesRetirees } = videDuStockagePlein(lireToutLeStockage(), CLE_MES_PARTIES, obtenirIdPartieActive(), zonesAVider());
    elements.texte.textContent = [
      `Cette partie ne s'enregistrait plus : le stockage du navigateur est plein (${place}).`,
      `KAAH vient de télécharger ce qu'il contient, cette partie comprise, dans ${fichier} — ${OU_TROUVER_LES_FICHIERS_EXPORTES}`,
      `Vider fait la place : Mes parties (${partiesRetirees} partie${partiesRetirees > 1 ? 's' : ''}, sauf celle-ci), les recherches gardées et la Corbeille. Vos réglages, profils, l'Entraînement et l'historique des joueurs restent ; la partie continue, sans rien recharger.`,
      `Tout se reprend par Importer (colonne de gauche) : choisissez ce fichier, cochez les parties et ce que vous voulez de sa Corbeille.`,
      `Pas maintenant : rien n'est vidé, et la partie ne s'enregistre plus tant qu'il n'y a pas de place.`,
      `Pour ne plus rien télécharger tout seul : Réglages > Sauvegarde complète, décochez « Stockage plein : télécharger tout seul ce qu'il contient ».`,
    ].join('\n\n');
    elements.dialogue.showModal();
  }

  return { proposer };
}
