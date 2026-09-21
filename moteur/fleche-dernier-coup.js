// Quelles billes recoivent la fleche du dernier coup, et dans quelle
// direction (phase 19bis, partie 3/3) — jamais QUAND ni COMMENT la
// dessiner : voir rendu/fleche-dernier-coup.js (l'affichage) et
// moteur/arbre.js (l'attache au bon noeud, pour suivre la navigation dans
// l'historique).
//
// Reproduit KAAWA (kaa_engine_ClO_Co.py, `move_data_for_arrow` ; puis
// kaa_board_widget_ClO_Co.py, la construction de `targets`/`count`) :
//   - un coup EN LIGNE (la direction du coup est l'axe du groupe) ne marque
//     que la bille de TETE — celle qui etait deja la plus avancee dans le
//     sens du deplacement, `coup.billes[coup.billes.length - 1]` : un
//     groupe s'etend toujours DEPUIS la bille cliquee en premier
//     (moteur/regles.js, groupesDepuis), et coupEnLigne ne fait jamais
//     avancer un groupe que dans le sens de cette extension — jamais tout
//     le groupe ;
//   - un coup LATERAL, ou une bille seule (qui n'a pas d'axe a comparer),
//     marque CHAQUE bille du groupe, chacune la sienne, un seul chevron
//     chacune ;
//   - les billes ADVERSES poussees (coup.billesPoussees) ne recoivent
//     jamais leur PROPRE fleche : verifie dans KAAWA, `move_data['group']`
//     ne contient que le groupe qui joue, jamais le groupe pousse — une
//     poussee (sumito) se signale plutot par un DEUXIEME chevron sur la
//     bille de tete elle-meme (`nombreChevrons`, KAAWA :
//     `count = 2 if (is_sumito and not is_sidestep) else 1` — toujours
//     "not is_sidestep" ici, un coup lateral ne pousse jamais personne,
//     moteur/regles.js, coupLateral) ;
//   - `ejection` : vrai si la DERNIERE bille adverse poussee (la plus
//     eloignee du groupe) sort du plateau — KAAWA colore alors ces
//     chevrons en rouge, TOUJOURS (signale par saab : le bouton "»" de
//     KAAWA, qui semblait commander ça, n'y est en realite pour rien).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : axeDuGroupe,
// directionsEgales, directionOpposee (moteur/regles.js), caseDansLaDirection
// (moteur/plateau.js) viennent de fichiers charges avant celui-ci dans
// index.html.
function informationFlecheDernierCoup(coup) {
  const axe = axeDuGroupe(coup.billes);
  const enLigne =
    axe !== null && (directionsEgales(coup.direction, axe) || directionsEgales(coup.direction, directionOpposee(axe)));

  const billesCiblees = enLigne ? [coup.billes[coup.billes.length - 1]] : coup.billes;
  const dernierePoussee = coup.billesPoussees[coup.billesPoussees.length - 1];

  return {
    cibles: billesCiblees.map((bille) => caseDansLaDirection(bille, coup.direction)),
    direction: coup.direction,
    nombreChevrons: coup.billesPoussees.length > 0 ? 2 : 1,
    ejection: dernierePoussee !== undefined && caseDansLaDirection(dernierePoussee, coup.direction) === null,
  };
}
