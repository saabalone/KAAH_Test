// Contour de la case dont la bille est actuellement selectionnee (premier
// clic d'un coup) — comme KAAWA (kaa_board_widget_ClO_Co.py, la boucle sur
// `selected_marbles` : un hexagone `BG_COLOR`, la meme couleur cuivree/
// orange que le fond de son interface, autour de la case). KAAWA dessine un
// hexagone (ses cases EN SONT) ; KAAH dessine des cases rondes (rendu/
// plateau-svg.js) — un anneau rond fait donc ici le meme office, jamais
// une forme copiee a l'identique la ou elle ne collerait pas au reste du
// plateau.
//
// Signale par saab : cette selection n'avait encore AUCUN contour dans
// KAAH — seules les cases de DESTINATION (mettreEnEvidence,
// rendu/plateau-svg.js) et leurs coordonnees (rendu/coordonnees-jeu.js)
// etaient jusqu'ici mises en evidence.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : aucune dependance
// vers un autre fichier de rendu.

// `notation` : la case selectionnee, ou `null` pour tout effacer (aucune
// selection en cours) — au plus UNE case a la fois, jamais plusieurs.
function mettreEnEvidenceSelection(svg, notation) {
  for (const caseElement of svg.querySelectorAll('.case')) {
    caseElement.classList.toggle('case-selectionnee', caseElement.dataset.notation === notation);
  }
}
