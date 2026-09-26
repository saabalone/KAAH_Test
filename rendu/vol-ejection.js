// Le vol d'une bille ejectee jusqu'a sa case de piste (saab : "par le chemin le
// plus court a leur place ... en reduisant leur taille progressivement") : une
// fois sortie du plateau (rendu/animation.js), elle rejoint le BORD du plateau
// (l'hexagone du cadre, rendu/cadre-plateau.js), le longe dans le sens le plus
// court, puis le quitte pour sa case, en retrecissant de sa taille de bille a
// celle de la case. Le bord et non la corde (saab : "contourner les blocs
// d'ejection est perturbant"). La case, elle, ne se remplit qu'a son arrivee
// (classe `piste-en-attente`, styles.css) — sinon la bille volerait vers une
// case deja pleine.
//
// Purement visuel, aucune regle du jeu. La bille en vol perd son identifiant et
// sa classe `.bille` au decollage : pour le reste de KAAH (rendu/plateau-svg.js,
// synchroniserBilles), elle n'existe deja plus — revenir en arriere pendant le
// vol recree la vraie bille a sa case, sans jamais toucher a celle qui vole.
// Le vol se joue par l'API d'animation du navigateur (`animate`) sur la meme
// propriete `transform` que les glissements : aucun element recree.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : calculerCadrePlateau
// (rendu/cadre-plateau.js) vient d'un fichier charge avant celui-ci.

// Un point du bord tous les PAS_ECHANTILLON_BORD (unites du dessin) : assez fin
// pour un mouvement regulier, assez gros pour que le vol reste leger.
const PAS_ECHANTILLON_BORD = 2;
// Vitesse du vol, bornee : un vol court reste visible, un tour de plateau ne
// s'eternise pas (ralentie a la demande de saab).
const MS_PAR_UNITE_DE_VOL = 7;
const DUREE_VOL_MINIMUM_MS = 500;
const DUREE_VOL_MAXIMUM_MS = 2200;

// Le bord du plateau en une boucle fermee de points : les 6 cotes de
// l'hexagone du cadre, dans l'ordre de ses sommets.
function boucleDuBord() {
  const sommets = calculerCadrePlateau().exterieur;
  return sommets.flatMap((sommet, i) => {
    const suivant = sommets[(i + 1) % sommets.length];
    const nombre = Math.max(1, Math.ceil(Math.hypot(suivant.x - sommet.x, suivant.y - sommet.y) / PAS_ECHANTILLON_BORD));
    return Array.from({ length: nombre }, (_, k) => ({
      x: sommet.x + ((suivant.x - sommet.x) * k) / nombre,
      y: sommet.y + ((suivant.y - sommet.y) * k) / nombre,
    }));
  });
}

function indiceLePlusProche(points, cible) {
  let meilleur = 0;
  points.forEach((point, i) => {
    if (Math.hypot(point.x - cible.x, point.y - cible.y) < Math.hypot(points[meilleur].x - cible.x, points[meilleur].y - cible.y)) meilleur = i;
  });
  return meilleur;
}

// Le trajet de `depart` a `arrivee` : jusqu'au bord du plateau, le long du bord
// dans le sens le plus court, puis jusqu'a `arrivee`.
function trajetParLeBord(depart, arrivee) {
  const boucle = boucleDuBord();
  const debut = indiceLePlusProche(boucle, depart);
  const fin = indiceLePlusProche(boucle, arrivee);
  const avant = (fin - debut + boucle.length) % boucle.length;
  const sens = avant <= boucle.length - avant ? 1 : -1;
  const pas = sens === 1 ? avant : boucle.length - avant;
  const surLeBord = Array.from({ length: pas + 1 }, (_, k) => boucle[(debut + sens * k + boucle.length) % boucle.length]);
  return [depart, ...surLeBord, arrivee];
}

// La prochaine case de la piste de `couleur` : la premiere ni remplie ni deja
// reservee par un vol en cours (le compte n'est mis a jour qu'apres le lancement
// de l'animation du coup, voir interface/saisie.js). null au-dela de la derniere.
function prochaineCaseDePiste(svg, couleur) {
  for (let i = 0; ; i++) {
    const caseDePiste = svg.querySelector(`#piste-${couleur}-${i}`);
    if (!caseDePiste) return null;
    if (!caseDePiste.classList.contains('piste-remplie') && !caseDePiste.classList.contains('piste-en-attente')) return caseDePiste;
  }
}

// A appeler au moment ou la bille, deja sortie du plateau en `depart`, prend
// son vol. `caseDePiste` : reservee par reserverCaseDePiste avant que le compte
// ne change.
function faireVolerBille(bille, depart, caseDePiste) {
  bille.removeAttribute('id');
  bille.classList.remove('bille');
  bille.classList.add('bille-en-vol');
  const finir = () => {
    bille.remove();
    caseDePiste?.classList.remove('piste-en-attente');
  };
  const sansAnimation = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!caseDePiste || sansAnimation || typeof bille.animate !== 'function') return finir();

  const arrivee = { x: Number(caseDePiste.getAttribute('cx')), y: Number(caseDePiste.getAttribute('cy')) };
  const echelleFinale = Number(caseDePiste.getAttribute('r')) / Number(bille.querySelector('circle').getAttribute('r'));
  const points = trajetParLeBord(depart, arrivee);
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const total = distances.at(-1) || 1;
  const images = points.map((point, i) => {
    const avancement = distances[i] / total;
    const echelle = 1 + (echelleFinale - 1) * avancement;
    return { offset: avancement, transform: `translate(${point.x}px, ${point.y}px) scale(${echelle})` };
  });
  const duree = Math.min(DUREE_VOL_MAXIMUM_MS, Math.max(DUREE_VOL_MINIMUM_MS, total * MS_PAR_UNITE_DE_VOL));
  bille.animate(images, { duration: duree, easing: 'ease-in-out', fill: 'forwards' }).finished.then(finir, finir);
}

// Reserve la case ou la bille de `couleur` va se poser : elle restera vide
// jusqu'a l'arrivee du vol, meme une fois le compte mis a jour.
function reserverCaseDePiste(svg, couleur) {
  const caseDePiste = prochaineCaseDePiste(svg, couleur);
  caseDePiste?.classList.add('piste-en-attente');
  return caseDePiste;
}
