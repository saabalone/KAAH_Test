// Fleches des coups suggeres par la base Next Move (moteur/next-move.js,
// interface/next-move.js). Rendu seul : ce fichier ne sait rien des
// victoires/defaites/nulles elles-memes, juste dessiner un segment entre
// deux cases, avec une pointe, dans la classe CSS donnee par l'appelant —
// voir CLAUDE.md, "rendu/ dessine, ne decide rien".
//
// Repris de KAAWA (kaa_board_widget_ClO_Co.py, draw_arrow) : une fleche
// plus epaisse marque le record de victoires ou de defaites parmi les
// suggestions affichees (voir interface/next-move.js, qui decide quelles
// classes passer).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : depuisNotation vient
// de moteur/plateau.js, positionEcran et creerElementSVG de
// rendu/plateau-svg.js — tous charges avant celui-ci dans index.html.

// Une pointe par classe de couleur : un <marker> SVG ne peut pas reprendre
// automatiquement la couleur de la ligne qui le pointe sur tous les
// navigateurs (`context-stroke` n'est pas fiable partout, notamment sur
// Safari/iOS, la cible de reference de KAAH) — plus simple et plus sur de
// preparer une pointe par classe, avec sa propre couleur fixee dans
// styles.css.
const CLASSES_FLECHE_CONSEIL = ['victoire', 'defaite', 'nulle', 'egalite'];

function assurerMarqueursFlechesConseils(svg) {
  if (svg.querySelector('#marqueurs-fleches-conseils')) return;

  const defs = creerElementSVG('defs', { id: 'marqueurs-fleches-conseils' });
  for (const classe of CLASSES_FLECHE_CONSEIL) {
    const marqueur = creerElementSVG('marker', {
      id: `pointe-fleche-conseil-${classe}`,
      viewBox: '0 0 10 10',
      refX: 8,
      refY: 5,
      // Malentendu corrige (saab avait ecrit "en fait elles sont" au lieu
      // de "elles devraient" — comprendre l'inverse de ce qui etait
      // demande) : la pointe ne doit PAS deborder du trait, juste
      // prolonger la ligne en une simple pointe. `markerHeight: 2` (pas
      // plus) : un marker SVG se met a l'echelle du stroke-width par
      // defaut (markerUnits="strokeWidth") — a 2, le triangle fait a
      // peine 2x la largeur du trait, un fuseau discret plutot qu'un
      // vrai chevron.
      markerWidth: 4,
      markerHeight: 2,
      orient: 'auto-start-reverse',
    });
    marqueur.appendChild(
      creerElementSVG('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: `fleche-conseil-pointe fleche-conseil-pointe-${classe}` })
    );
    defs.appendChild(marqueur);
  }
  svg.appendChild(defs);
}

// `fleches` : tableau de { coup, classe, dominante, translucide }.
// `classe` doit etre l'une de CLASSES_FLECHE_CONSEIL ci-dessus ;
// `dominante` (facultatif) epaissit le trait ; `translucide` (facultatif,
// voir interface/next-move.js) attenue la fleche quand "Tout afficher"
// montre toutes les suggestions a la fois — sauf celle qu'on vient de
// choisir, qui reste opaque par-dessus (saab : "pour prochainement voir
// les coord des cases" a travers les autres). Remplace entierement les
// fleches deja affichees — appeler avec un tableau vide efface simplement
// tout (meme principe que rendu.mettreEnEvidence pour les cases possibles).
function dessinerFlechesConseils(svg, fleches) {
  effacerFlechesConseils(svg);
  if (fleches.length === 0) return;
  assurerMarqueursFlechesConseils(svg);

  const groupe = creerElementSVG('g', { id: 'fleches-conseils' });
  for (const { coup, classe, dominante, translucide } of fleches) {
    const depart = depuisNotation(coup.slice(0, 2));
    const arrivee = depuisNotation(coup.slice(2));
    if (!depart || !arrivee) continue; // coup illisible : on l'ignore plutot que de planter tout l'affichage

    const p1 = positionEcran(depart.q, depart.r);
    const p2 = positionEcran(arrivee.q, arrivee.r);
    const classes = ['fleche-conseil', `fleche-conseil-${classe}`];
    if (dominante) classes.push('fleche-conseil-dominante');
    if (translucide) classes.push('fleche-conseil-translucide');

    groupe.appendChild(
      creerElementSVG('line', {
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        class: classes.join(' '),
        'marker-end': `url(#pointe-fleche-conseil-${classe})`,
      })
    );
  }
  svg.appendChild(groupe);
}

function effacerFlechesConseils(svg) {
  svg.querySelector('#fleches-conseils')?.remove();
}
