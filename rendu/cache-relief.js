// Fige le DECOR du plateau (fond, relief entre les cases, trous) en une seule
// image, dessinee une fois — pour un telephone lent (saab : "pourquoi redessiner
// ce qui ne change pas ?").
//
// Le decor ne change jamais en cours de partie, mais il pese ~1 000 des ~1 300
// elements du dessin, dont des filtres a flou (l'ombre du fond, celle des
// cylindres, l'ombre interieure des 61 trous). Comme tout est dans UN seul <svg>,
// le navigateur peut recalculer ces filtres des qu'un texte change dans un coin
// (une pendule, un nom...) ou qu'une bille glisse. Une image, elle, se recopie
// sans rien recalculer.
//
// Principe : on copie le decor dans un <svg> autonome, en y ecrivant le style
// CALCULE de chaque element (la feuille de style de la page ne s'y applique
// pas), on le dessine dans un <canvas> a la taille reelle de l'ecran, puis on
// pose ce bitmap a la place du decor. Les elements d'origine restent dans la
// page, seulement masques : ils servent a refaire l'image si la taille change
// (rotation de l'ecran, face-a-face...). Le bitmap est a la resolution de l'ecran
// (jamais plus de 3 pixels par pixel CSS) : un zoom du navigateur ne le rend
// pas plus net tant qu'il n'est pas redessine (voir `figerLeDecor`).
//
// Aucun changement visuel voulu. Si quoi que ce soit echoue (navigateur qui ne
// sait pas dessiner ce <svg> dans un <canvas>, image vide...), le decor vectoriel
// d'origine reste affiche tel quel.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG et
// ESPACE_NOM_SVG (rendu/plateau-svg.js) viennent d'un fichier charge avant
// celui-ci dans index.html.

const SELECTEURS_DECOR = ['.fond-plateau', '.relief-cylindres', '.trous-centraux'];
// Les seules proprietes de style qui changent l'aspect de ces formes.
const PROPRIETES_DECOR = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linejoin',
  'stroke-linecap',
  'opacity',
  'filter',
];
const ECHELLE_MAXIMALE = 3;
// Variation d'echelle (en fraction) a partir de laquelle on redessine l'image.
const SEUIL_REDESSIN = 0.03;

// `url("http://.../index.html#degrade")` (ce que certains navigateurs rendent
// pour un style calcule) devient `url(#degrade)`, seule forme valable dans un
// <svg> autonome.
function versReferenceLocale(valeur) {
  return valeur.replace(/url\(["']?[^"')]*#([^"')]+)["']?\)/g, 'url(#$1)');
}

// Ecrit dans `copie` le style calcule de `original`, puis fait de meme pour
// leurs enfants, deux a deux.
function copierStyleCalcule(original, copie) {
  const style = getComputedStyle(original);
  for (const nom of PROPRIETES_DECOR) {
    const valeur = style.getPropertyValue(nom);
    if (valeur && !(nom === 'filter' && valeur === 'none')) copie.setAttribute(nom, versReferenceLocale(valeur));
  }
  for (let i = 0; i < original.children.length; i++) copierStyleCalcule(original.children[i], copie.children[i]);
}

// Le <svg> autonome : les definitions (degrades, filtres) et le decor, avec son
// style ecrit en clair.
function construireSvgDecor(svg, decor, largeurPixels, hauteurPixels) {
  const racine = creerElementSVG('svg', {
    viewBox: svg.getAttribute('viewBox'),
    width: largeurPixels,
    height: hauteurPixels,
  });
  racine.appendChild(svg.querySelector('defs').cloneNode(true));
  for (const element of decor) {
    const copie = element.cloneNode(true);
    // L'original est masque une fois l'image posee (`display="none"`) : la copie,
    // elle, doit se dessiner.
    copie.removeAttribute('display');
    copierStyleCalcule(element, copie);
    racine.appendChild(copie);
  }
  return new XMLSerializer().serializeToString(racine);
}

// Dessine le decor dans un canvas, puis appelle `surImage(url)` avec le bitmap.
// Ne fait rien (et n'appelle rien) en cas d'echec.
function dessinerDecorEnBitmap(texteSvg, largeurPixels, hauteurPixels, surImage) {
  const adresseSvg = URL.createObjectURL(new Blob([texteSvg], { type: 'image/svg+xml;charset=utf-8' }));
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(adresseSvg);
    try {
      const toile = document.createElement('canvas');
      toile.width = largeurPixels;
      toile.height = hauteurPixels;
      const contexte = toile.getContext('2d');
      contexte.drawImage(image, 0, 0, largeurPixels, hauteurPixels);
      // Un dessin vide (le navigateur n'a pas su rendre ce <svg>), ou un canvas
      // que le navigateur refuse de relire : on garde le vectoriel.
      if (contexte.getImageData(largeurPixels >> 1, hauteurPixels >> 1, 1, 1).data[3] === 0) return;
      toile.toBlob((blob) => blob && surImage(URL.createObjectURL(blob)));
    } catch {
      // le decor vectoriel d'origine reste affiche
    }
  };
  image.onerror = () => URL.revokeObjectURL(adresseSvg);
  image.src = adresseSvg;
}

// A appeler UNE FOIS, en dernier (le viewBox doit etre definitif). Se
// redessine seul quand la taille du plateau change.
function figerLeDecor(svg) {
  const decor = SELECTEURS_DECOR.map((selecteur) => svg.querySelector(selecteur));
  if (decor.includes(null) || typeof ResizeObserver === 'undefined') return;

  let imageDecor = null;
  let echelleDessinee = 0;
  let enCours = false;

  function redessiner() {
    const { width, height } = svg.getBoundingClientRect();
    if (width === 0 || enCours) return;
    // Le dessin occupe la plus grande zone de PROPORTION DU viewBox qui tient dans
    // l'element (`preserveAspectRatio` par defaut, "meet") : c'est ELLE, et non la
    // boite de l'element, qui donne la taille du bitmap. Quand la fenetre est
    // etiree, l'element n'a plus la proportion du viewBox ; un bitmap a la taille
    // de l'element, etire ensuite sur le viewBox, aplatissait le decor sans
    // toucher aux billes (saab, en redimensionnant la fenetre sur PC).
    const [, , largeurVb, hauteurVb] = svg.getAttribute('viewBox').split(' ').map(Number);
    const echelle = Math.min(width / largeurVb, height / hauteurVb);
    if (imageDecor && Math.abs(echelle - echelleDessinee) / echelleDessinee < SEUIL_REDESSIN) return;
    enCours = true;
    const definition = Math.min(window.devicePixelRatio || 1, ECHELLE_MAXIMALE);
    const largeurPixels = Math.ceil(largeurVb * echelle * definition);
    const hauteurPixels = Math.ceil(hauteurVb * echelle * definition);
    try {
      dessinerDecorEnBitmap(construireSvgDecor(svg, decor, largeurPixels, hauteurPixels), largeurPixels, hauteurPixels, (adresse) => {
        poserImage(adresse);
        echelleDessinee = echelle;
        enCours = false;
      });
    } catch {
      enCours = false; // echec : le decor vectoriel reste affiche
    }
    // Aucun rappel possible en cas d'echec de chargement : on libere quand meme.
    setTimeout(() => (enCours = false), 5000);
  }

  function poserImage(adresse) {
    const [x, y, largeur, hauteur] = svg.getAttribute('viewBox').split(' ').map(Number);
    if (!imageDecor) {
      imageDecor = creerElementSVG('image', {
        x,
        y,
        width: largeur,
        height: hauteur,
        preserveAspectRatio: 'none',
        class: 'decor-fige',
        'pointer-events': 'none',
      });
      svg.insertBefore(imageDecor, decor[0]);
      for (const element of decor) element.setAttribute('display', 'none');
    } else {
      URL.revokeObjectURL(imageDecor.getAttribute('href'));
    }
    imageDecor.setAttribute('href', adresse);
  }

  new ResizeObserver(redessiner).observe(svg);
  redessiner();
}
