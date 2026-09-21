// Fleche du dernier coup (phase 19bis, partie 3/3) — en realite un
// chevron, PAS une ligne origine->destination (contrairement a
// rendu/conseils.js et rendu/menaces.js, qui en tracent une) : pose
// directement SUR chaque bille ciblee (moteur.informationFlecheDernierCoup),
// dans le sens du deplacement. Trois apparences, comme KAAWA
// (kaa_board_widget_ClO_Co.py, boucle `for i in range(count)`) :
//   - 1 chevron : coup simple, en ligne ou lateral ;
//   - 2 chevrons, empiles le long de la direction : une poussee (sumito) ;
//   - 2 chevrons ROUGES : une poussee qui ejecte — TOUJOURS, meme sans le
//     bouton "»" de KAAWA (verifie dans son code : ce bouton ne commande
//     en realite qu'une AUTRE option, `show_red_ejection`, jamais le
//     chevron lui-meme — signale par saab).
//
// Des <polyline> EN PLUS, enfants de la bille visee (comme
// rendu/coordonnees-jeu.js, .coordonnee-bille) : jamais de x/y a leur
// donner, ils heritent du meme transform que leur bille. Detruits et
// reconstruits a CHAQUE affichage (contrairement a la bille elle-meme,
// CLAUDE.md n'interdit que de reconstruire LE PLATEAU par innerHTML) : rien
// n'anime ici, une bille n'a jamais plus d'une fleche a la fois.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : positionEcran,
// creerElementSVG, RAYON_BILLE (rendu/plateau-svg.js) viennent de fichiers
// charges avant celui-ci dans index.html.

// Distance du centre de la bille a la pointe du chevron, et longueur de
// chacun de ses deux bras — proportionnels au rayon REEL d'une bille
// (rendu/plateau-svg.js, RAYON_BILLE), jamais a celui d'une case : le
// chevron doit rester a la bonne taille meme si RAYON_BILLE change.
const DISTANCE_POINTE_CHEVRON = RAYON_BILLE * 0.75;
const LONGUEUR_BRAS_CHEVRON = RAYON_BILLE * 0.35;
// Ecart angulaire de chaque bras par rapport a la pointe (120 degres, en
// radians) : les deux bras s'ecartent vers l'arriere, la pointe reste seule
// a l'avant — la forme d'un chevron ">" pointant dans le sens du coup.
const ANGLE_BRAS_CHEVRON = (2 * Math.PI) / 3;
// Decalage entre les deux chevrons d'une poussee, le long de la meme
// direction — meme proportion que KAAWA (`shift = i * (size * 0.8)`).
const DECALAGE_DEUXIEME_CHEVRON = LONGUEUR_BRAS_CHEVRON * 0.8;

// Construit le <polyline> d'UN chevron, pointe dans la direction `angle`
// (en radians, repere ecran), decale de `decalage` en arriere de la bille
// le long de cette meme direction (0 pour le premier/unique chevron).
// Centre sur (0, 0) : c'est a l'appelant de l'ajouter comme ENFANT de la
// bille visee, qui porte deja le bon centre via son propre transform.
function creerCheveron(angle, decalage, classesSupplementaires) {
  const pointe = {
    x: (DISTANCE_POINTE_CHEVRON - decalage) * Math.cos(angle),
    y: (DISTANCE_POINTE_CHEVRON - decalage) * Math.sin(angle),
  };
  const bras = (decalageAngle) => ({
    x: pointe.x + LONGUEUR_BRAS_CHEVRON * Math.cos(angle + decalageAngle),
    y: pointe.y + LONGUEUR_BRAS_CHEVRON * Math.sin(angle + decalageAngle),
  });
  const p1 = bras(ANGLE_BRAS_CHEVRON);
  const p3 = bras(-ANGLE_BRAS_CHEVRON);
  return creerElementSVG('polyline', {
    points: `${p1.x},${p1.y} ${pointe.x},${pointe.y} ${p3.x},${p3.y}`,
    class: `fleche-dernier-coup${classesSupplementaires}`,
  });
}

// Efface toute fleche precedente, puis en pose une neuve sur chaque bille
// de `info.cibles` — `info` est `noeudCourant(arbre).flecheDernierCoup`
// (moteur/arbre.js, marquerFlecheDernierCoup), `null`/`undefined` a la
// racine (aucun coup n'y a mene, voir moteur/fleche-dernier-coup.js) : rien
// n'est alors dessine. A appeler apres CHAQUE coup et CHAQUE navigation —
// voir interface/saisie.js.
function actualiserFlecheDernierCoup(svg, info) {
  for (const fleche of svg.querySelectorAll('.fleche-dernier-coup')) fleche.remove();
  if (!info) return;

  const avant = positionEcran(info.direction.q, info.direction.r);
  const angle = Math.atan2(avant.y, avant.x);
  const classesSupplementaires = info.ejection ? ' fleche-dernier-coup-ejection' : '';
  for (const notation of info.cibles) {
    const bille = svg.querySelector(`.bille[data-notation="${notation}"]`);
    if (!bille) continue; // garde defensive : ne devrait pas arriver, le plateau est deja synchronise sur ce noeud
    for (let i = 0; i < info.nombreChevrons; i++) {
      bille.appendChild(creerCheveron(angle, i * DECALAGE_DEUXIEME_CHEVRON, classesSupplementaires));
    }
  }
}
