// Dessiner une AIRE sur le plateau (saab, 2026-10-04 : « une ligne blanche,
// qui passe en orange quand elle est fermee ... donc le clic sur le plateau
// doit etre inactif pour ne pas selectionner des billes » ; puis « dessiner
// l'aire avec clic appuye, et donc le trait suit le centre des cases que je
// survole »). Bouton Aire, puis on appuie sur une case et on glisse : le trait
// passe par le centre de chaque case survolee ; relacher ferme le contour (3
// cases au moins). Pendant ce temps, les clics du plateau ne vont plus a la
// saisie (ecouteurs en phase de capture, qui les arretent). Les poids :
// moteur/aire-ia.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ESPACE_NOM_SVG
// (rendu/plateau-svg.js), casesEntre (moteur/aire-ia.js) viennent de fichiers
// charges avant celui-ci.

const POINTS_MIN_AIRE = 3;

// `surFermee(cases)` : le contour ferme. Renvoie { commencer(), dessinerContour(cases),
// effacer(), enCours() }.
function demarrerAirePlateau(svg, surFermee) {
  let armee = false; // bouton Aire touche, en attente de l'appui
  let cases = null; // le contour pendant le glissement
  let avalerLeClic = false; // le clic qui suit le relacher
  let trace = null;

  const cercleDe = (notation) => svg.querySelector(`.cases [data-notation="${notation}"]`);
  const centreDe = (notation) => `${cercleDe(notation).getAttribute('cx')},${cercleDe(notation).getAttribute('cy')}`;
  const caseEn = (x, y) => {
    const notation = document.elementFromPoint(x, y)?.closest?.('[data-notation]')?.dataset.notation;
    return notation && cercleDe(notation) ? notation : null;
  };

  function effacer() {
    trace?.remove();
    trace = null;
    cases = null;
    armee = false;
    svg.classList.remove('dessin-aire');
  }

  function commencer() {
    effacer();
    armee = true;
    svg.classList.add('dessin-aire');
  }

  // La case survolee, et celles que la souris a sautees depuis la derniere
  // (moteur/aire-ia.js, casesEntre). Revenue sur la premiere : le lien qui
  // fermera le contour se dessine deja (saab : « il manque le lien de la
  // derniere case »).
  function ajouter(notation) {
    if (!notation || notation === cases.at(-1)) return;
    const chemin = cases.length === 0 ? [notation] : casesEntre(cases.at(-1), notation);
    for (const suivante of chemin) if (!cases.includes(suivante)) cases.push(suivante);
    const fermeture = cases.length >= POINTS_MIN_AIRE && notation === cases[0] ? [cases[0]] : [];
    trace.setAttribute('points', [...cases, ...fermeture].map(centreDe).join(' '));
  }

  const arreter = (evenement) => {
    evenement.stopImmediatePropagation();
    evenement.preventDefault();
  };

  svg.addEventListener(
    'pointerdown',
    (evenement) => {
      if (!armee) return;
      arreter(evenement);
      armee = false;
      cases = [];
      trace = document.createElementNS(ESPACE_NOM_SVG, 'polyline');
      trace.setAttribute('class', 'trace-aire');
      svg.append(trace);
      svg.setPointerCapture(evenement.pointerId);
      ajouter(caseEn(evenement.clientX, evenement.clientY));
    },
    true
  );
  svg.addEventListener('pointermove', (evenement) => {
    if (cases !== null) ajouter(caseEn(evenement.clientX, evenement.clientY));
  });
  svg.addEventListener(
    'pointerup',
    (evenement) => {
      if (cases === null) return;
      arreter(evenement);
      // Le clic qui suit le relacher n'est pas pour la saisie ; s'il ne vient
      // pas, le suivant compte de nouveau.
      avalerLeClic = true;
      setTimeout(() => (avalerLeClic = false));
      svg.classList.remove('dessin-aire');
      if (cases.length < POINTS_MIN_AIRE) return effacer();
      const contour = cases;
      const ferme = document.createElementNS(ESPACE_NOM_SVG, 'polygon');
      ferme.setAttribute('class', 'trace-aire trace-aire-fermee');
      ferme.setAttribute('points', contour.map(centreDe).join(' '));
      trace.replaceWith(ferme);
      trace = ferme;
      cases = null;
      surFermee(contour);
    },
    true
  );
  svg.addEventListener(
    'click',
    (evenement) => {
      if (!armee && cases === null && !avalerLeClic) return;
      avalerLeClic = false;
      arreter(evenement);
    },
    true
  );

  // Un contour deja fait (le tour du plateau, bouton Plateau), dessine ferme.
  function dessinerContour(contour) {
    effacer();
    trace = document.createElementNS(ESPACE_NOM_SVG, 'polygon');
    trace.setAttribute('class', 'trace-aire trace-aire-fermee');
    trace.setAttribute('points', contour.map(centreDe).join(' '));
    svg.append(trace);
  }

  return { commencer, dessinerContour, effacer, enCours: () => armee || cases !== null };
}
