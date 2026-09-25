// Le "nom" d'une partie (deja convertie au format KAAWA, voir
// moteur/sauvegarde.js), EXACTEMENT comme le nom de fichier que KAAWA
// lui-meme lui donnerait (kaa_engine_ClO_Co.py, save_game_sequence_to_
// file) — saab a demande explicitement de reprendre cette convention
// telle quelle plutot que d'en inventer une autre, ce que le premier
// essai de cette phase avait fait a tort.
//
// Verifie caractere pres contre un vrai fichier KAAWA
// (donnees/partie_kaawa_Br_2608172039_temoin.json, voir
// tests/sauvegarde.test.js) : le nom attendu est exactement
// "Br_2608172039, Amical, Marguerite Belge, Player_1-Player_2, -0-0tr2
// Player_2, R" — le nom reel de ce fichier, prefixe "Br_" et tout.
//
// Separe de moteur/sauvegarde.js (deja au-dela des ~200 lignes de
// CLAUDE.md) : ce fichier ne fait QUE deriver un texte d'affichage a
// partir de donnees deja construites, jamais l'inverse.
//
// Pas d'import ni d'export (voir moteur/plateau.js) :
// cheminOrigineDuFichier vient de moteur/sauvegarde.js, charge avant
// celui-ci dans index.html.

// Vrai si l'arbre contient la moindre branche (un noeud ailleurs que sur
// la ligne reellement jouee) — n'importe ou, pas seulement au premier
// niveau. KAAWA en deduit son prefixe "Br_" (voir nomDeFichierKAAWA).
function possedeUneBranche(noeudDonnees) {
  return (noeudDonnees.children ?? []).some((enfant) => enfant.is_origin === false || possedeUneBranche(enfant));
}

// Meme nettoyage que KAAWA sur un nom de joueur avant de l'inserer dans
// le nom de la partie (kaa_engine_ClO_Co.py, `get_clean` :
// `re.sub(r'\(.*?\)\s*', '', str(n)).strip().replace(' ', '_')`) : retire
// tout texte entre parentheses, puis remplace les espaces par des
// underscores.
function nomJoueurNettoye(nom) {
  return String(nom).replace(/\([^)]*\)\s*/g, '').trim().replace(/ /g, '_');
}

// Les elements du titre "Br_2608172039, Amical, Marguerite Belge,
// Player_1-Player_2, -0-0tr2 Player_2, R", dans cet ordre, lus dans les
// donnees — ce que nomDeFichierKAAWA assemble, et ce que les filtres de Mes
// parties comparent (moteur/filtre-parties.js), sans jamais decouper le texte
// (un nom de puzzle contient lui-meme des virgules). Toutes les informations
// sont deja dans `donnees` (les champs de haut niveau ecrits par
// moteur.arbreVersDonnees) : pas besoin de rejouer la partie, seulement de
// suivre `is_origin` jusqu'au bout (moteur.cheminOrigineDuFichier) pour
// connaitre sa profondeur — le numero de tour de KAAWA
// (`display_turn = (history_index+1)//2`). Vainqueur : KAAWA ecrit
// "(en cours)" tant que ce n'est pas un vrai nom (litteralement "None"
// sinon) — meme si un statut de fin existe deja (une nulle sans vainqueur
// designe, par exemple).
function elementsDuTitre(donnees) {
  const profondeurOrigine = cheminOrigineDuFichier(donnees.Tree).length;
  return {
    branches: possedeUneBranche(donnees.Tree),
    date: String(donnees.Date),
    evenement: String(donnees.Event),
    variante: String(donnees.VariantName),
    joueurs: `${nomJoueurNettoye(donnees.Players.P1_black)}-${nomJoueurNettoye(donnees.Players.P2_white)}`,
    score: `-${donnees.Eject.P1}-${donnees.Eject.P2}`,
    tours: Math.max(1, Math.floor((profondeurOrigine + 1) / 2)),
    vainqueur: donnees.Winner && donnees.Winner !== 'None' ? String(donnees.Winner) : '(en cours)',
    statut: String(donnees.Term),
  };
}

// Le nom complet d'une partie — voir l'en-tete du fichier.
function nomDeFichierKAAWA(donnees) {
  const e = elementsDuTitre(donnees);
  const base = `${e.date}, ${e.evenement}, ${e.variante}, ${e.joueurs}, ${e.score}tr${e.tours} ${e.vainqueur}, ${e.statut}`;
  return e.branches ? `Br_${base}` : base;
}
