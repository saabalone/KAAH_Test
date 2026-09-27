// Les trous PLATS du mode simple, a taille reglable (saab, 2026-09-27 :
// "la taille des trous en Mode simple, max la valeur actuelle").
//
// Jusqu'ici, en mode simple, le trou visible ETAIT la case elle-meme (le
// cercle `.case` rempli) : le retrecir aurait retreci d'autant la zone a
// toucher du doigt — une case d'arrivee serait devenue difficile a viser sur
// telephone. Meme partage des roles qu'en relief (rendu/relief-plateau.js) :
// la case reste un grand cercle TRANSPARENT qui recoit les touchers
// (`.case-relief`, styles.css), et un trou visuel a part, dessine dessous,
// porte la couleur et suit le reglage. 61 cercles de plus seulement : le mode
// simple reste leger.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG
// (rendu/plateau-svg.js) vient d'un fichier charge avant celui-ci.

// A appeler une seule fois, a la construction du plateau en mode simple
// (dessinerReliefPlateau). Chaque trou prend la taille de sa case : c'est le
// maximum, fixerTailleTrousSimples ne fait ensuite que le reduire.
function dessinerTrousSimples(svg) {
  const groupeCases = svg.querySelector('.cases');
  const groupe = creerElementSVG('g', { class: 'trous-simples' });
  for (const caseElement of groupeCases.querySelectorAll('.case')) {
    groupe.appendChild(
      creerElementSVG('circle', {
        cx: caseElement.getAttribute('cx'),
        cy: caseElement.getAttribute('cy'),
        r: caseElement.getAttribute('r'),
        class: 'trou-simple',
      })
    );
    caseElement.classList.add('case-relief');
  }
  svg.insertBefore(groupe, groupeCases);
}

// `facteur` : 1 = la taille de la case (l'aspect d'avant), moins = plus petit.
// Sans effet hors mode simple (aucun trou plat).
function fixerTailleTrousSimples(svg, facteur) {
  const rayonCase = Number(svg.querySelector('.case')?.getAttribute('r'));
  for (const trou of svg.querySelectorAll('.trou-simple')) trou.setAttribute('r', rayonCase * facteur);
}
