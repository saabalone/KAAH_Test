// Un panneau flottant au-dessus du jeu (saab, 2026-10-04, panneaux d'une bille
// ou d'une aire : interface/infos-case.js) : un titre a tirer pour le deplacer,
// des boutons, un corps qui defile sur lui-meme. Il reste toujours entier dans
// la fenetre (saab : « la barre de scroll est hors fenetre »). Il se place a
// cote du plateau, centre sur la ligne e, ou contre un autre panneau (« coller
// ce 2eme panneau au 1er pour la comparaison »).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : celluleBille
// (interface/panneau-bille.js) vient d'un fichier charge avant celui-ci.

const ECART_PANNEAU_PX = 6;

// `boutons` : les boutons du titre, dans l'ordre ; `surDeplacement()` : a chaque
// pas du deplacement a la main.
function creerPanneauFlottant(boutons, surDeplacement = () => {}) {
  const element = document.createElement('div');
  element.className = 'panneau-bille';
  element.hidden = true;
  const titre = celluleBille('span', '');
  const entete = document.createElement('div');
  entete.className = 'entete-panneau-bille';
  entete.title = 'Tirer pour déplacer';
  entete.append(titre, ...boutons);
  const corps = document.createElement('div');
  corps.className = 'corps-panneau-bille';
  element.append(entete, corps);
  document.body.append(element);
  let deplaceALaMain = false;

  function poser(x, y) {
    element.style.left = `${Math.max(0, Math.min(x, window.innerWidth - element.offsetWidth))}px`;
    element.style.top = `${Math.max(0, Math.min(y, window.innerHeight - element.offsetHeight))}px`;
  }

  entete.addEventListener('pointerdown', (evenement) => {
    if (evenement.target.closest('button')) return;
    evenement.preventDefault();
    const decalX = evenement.clientX - element.offsetLeft;
    const decalY = evenement.clientY - element.offsetTop;
    const suivre = (deplacement) => {
      deplaceALaMain = true;
      poser(deplacement.clientX - decalX, deplacement.clientY - decalY);
      surDeplacement();
    };
    const lacher = () => {
      window.removeEventListener('pointermove', suivre);
      window.removeEventListener('pointerup', lacher);
    };
    window.addEventListener('pointermove', suivre);
    window.addEventListener('pointerup', lacher);
  });
  window.addEventListener('resize', () => {
    if (!element.hidden) poser(element.offsetLeft, element.offsetTop);
  });

  // Hors du plateau, centre sur la ligne e : a droite s'il y a la place, sinon
  // a gauche, sinon du cote le plus large — sauf s'il a ete deplace a la main.
  function placerAuBordDuPlateau(svg) {
    if (deplaceALaMain) return poser(element.offsetLeft, element.offsetTop);
    const e1 = svg.querySelector('.cases [data-notation="e1"]').getBoundingClientRect();
    const e9 = svg.querySelector('.cases [data-notation="e9"]').getBoundingClientRect();
    const [gauche, droite] = e1.left < e9.left ? [e1, e9] : [e9, e1];
    const largeur = element.offsetWidth;
    const placeADroite = window.innerWidth - droite.right - ECART_PANNEAU_PX;
    const placeAGauche = gauche.left - ECART_PANNEAU_PX;
    const aDroite = placeADroite >= largeur || (placeAGauche < largeur && placeADroite >= placeAGauche);
    poser(aDroite ? droite.right + ECART_PANNEAU_PX : gauche.left - ECART_PANNEAU_PX - largeur, (e1.top + e1.bottom) / 2 - element.offsetHeight / 2);
  }

  // Contre `autre` (un panneau flottant), a sa droite : s'il manque de la place,
  // `autre` se decale d'autant vers la gauche (plutot que de cacher le plateau).
  function collerA(autre) {
    let voisin = autre.element.getBoundingClientRect();
    const manque = voisin.right + ECART_PANNEAU_PX + element.offsetWidth - window.innerWidth;
    if (manque > 0) {
      autre.poser(voisin.left - manque, voisin.top);
      voisin = autre.element.getBoundingClientRect();
    }
    poser(voisin.right + ECART_PANNEAU_PX, voisin.top);
  }

  return { element, titre, corps, poser, placerAuBordDuPlateau, collerA, recadrer: () => poser(element.offsetLeft, element.offsetTop) };
}
