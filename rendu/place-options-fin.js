// La place du cadre « Gagné/Perdu Options » en fin de partie (saab,
// 2026-10-01 : a cote du nom, il recouvrait l'evaluation « Fin Gagne... ») :
// sous la pendule du joueur du haut, au-dessus de celle du joueur du bas,
// pendules debout ou couchees. Sorti de rendu/ligne-joueur.js, qui l'utilise.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : RAYON_PISTE,
// HAUTEUR_BANDE (rendu/ejections.js) viennent de fichiers charges avant.

// Ecart entre la pendule (et son cumul) et le cadre « Gagné/Perdu Options ».
const ECART_OPTIONS_PENDULE = RAYON_PISTE * 0.5;

// La boite, dans le dessin du plateau, de ce qui entoure la pendule d'un camp
// (elle et son temps cumule), qu'elle soit debout ou couchee — mesuree sur ce
// qui est affiche. null tant que rien n'est affiche.
function boiteDeLaPendule(svg, camp) {
  const ecran = svg.getScreenCTM();
  if (!ecran) return null;
  const inverse = ecran.inverse();
  const coins = [svg.querySelector(`#bouton-pendule-${camp}`), svg.querySelector(`#cumul-pendule-${camp}`)]
    .filter(Boolean)
    .flatMap((element) => {
      const r = element.getBoundingClientRect();
      return [new DOMPoint(r.left, r.top), new DOMPoint(r.right, r.bottom)].map((point) => point.matrixTransform(inverse));
    });
  if (coins.length === 0) return null;
  return {
    gauche: Math.min(...coins.map((p) => p.x)),
    droite: Math.max(...coins.map((p) => p.x)),
    haut: Math.min(...coins.map((p) => p.y)),
    bas: Math.max(...coins.map((p) => p.y)),
  };
}

// Ou poser le cadre « Gagné/Perdu Options » d'un camp : sous sa pendule s'il
// est en haut, au-dessus s'il est en bas, aligne a droite — dans les
// coordonnees de SA ligne, retournee de 180 degres autour de (0, y) en
// face-a-face pour le joueur du haut (voir l'en-tete). null si la pendule n'est
// pas mesurable : le cadre reste alors a cote du nom.
function placeSousLaPendule(groupe, largeur) {
  const boite = boiteDeLaPendule(groupe.ownerSVGElement, groupe.dataset.camp);
  if (!boite) return null;
  const enHaut = groupe.classList.contains('nom-joueur-en-haut');
  const x = boite.droite - largeur;
  const y = enHaut ? boite.bas + ECART_OPTIONS_PENDULE : boite.haut - ECART_OPTIONS_PENDULE - HAUTEUR_BANDE;
  if (!(enHaut && document.body.classList.contains('face-a-face'))) return { x, y };
  const yLigne = Number(groupe.dataset.y);
  return { x: -x - largeur, y: 2 * yLigne - y - HAUTEUR_BANDE };
}
