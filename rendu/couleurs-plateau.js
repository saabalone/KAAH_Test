// Recolore un plateau DEJA CONSTRUIT (fond, relief, trous, degrades) sans
// rien reconstruire — phase 22, correctif "les couleurs doivent s'appliquer
// en direct" (saab : une premiere version demandait un rechargement complet
// pour voir une couleur, meme le fond du plateau). Appelee depuis
// interface/reglages.js a chaque changement de couleur ; jamais a la
// construction (rendu/relief-plateau.js, dessinerReliefPlateau, s'en charge
// alors directement).
//
// Decoupe de rendu/relief-plateau.js (trop long, CLAUDE.md, la regle des
// 200 lignes) : ce fichier ne fait QUE recolorer, jamais construire — les
// constantes de niveau de gris et les arrets par defaut des degrades
// restent dans rendu/relief-plateau.js, qui charge avant celui-ci.
//
// N'agit QUE sur le decor vectoriel : c'est l'appelant (interface/
// reglages.js) qui doit ensuite forcer rendu/cache-relief.js a redessiner
// son bitmap, sinon le plateau reste fige a l'ancienne couleur (le bitmap
// ne se redessine sinon QUE si l'echelle a change).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG
// (rendu/plateau-svg.js), teinterNiveauGris, couleurVersHex,
// construireArretsBille (moteur/couleurs.js), REGLAGES_PAR_DEFAUT
// (moteur/reglages.js), actualiserCouleurReliefCylindres
// (rendu/relief-cylindres.js), actualiserCouleurCadrePlateau
// (rendu/cadre-plateau.js), NIVEAU_GRIS_FOND_TROU, NIVEAU_GRIS_PAROI_SOMBRE,
// NIVEAU_GRIS_PAROI_CLAIRE, ARRETS_BILLE_NOIRE_PAR_DEFAUT,
// ARRETS_BILLE_BLANCHE_PAR_DEFAUT (rendu/relief-plateau.js) viennent de
// fichiers charges avant celui-ci dans index.html.

// Recolore le fond des trous deja construits. Ne fait rien en mode simple
// (aucun trou construit).
function actualiserCouleurTrous(svg, hexTrou) {
  const couleurFond = teinterNiveauGris(hexTrou, NIVEAU_GRIS_FOND_TROU);
  for (const fond of svg.querySelectorAll('.case-fond-trou')) fond.setAttribute('fill', couleurFond);
}

// Remplace tous les <stop> d'un degrade deja construit (identifie par son
// id) par `arrets` : plus simple que d'essayer de reutiliser les anciens un
// par un, le nombre d'arrets differe deja entre les degrades par defaut et
// ceux d'une couleur choisie (construireArretsBille, moteur/couleurs.js).
function remplacerArretsDegrade(svg, id, arrets) {
  const degrade = svg.querySelector(`#${id}`);
  if (!degrade) return;
  degrade.replaceChildren(...arrets.map(([offset, couleur]) => creerElementSVG('stop', { offset: `${offset}%`, 'stop-color': couleur })));
}

// Recolore les degrades deja construits (paroi des trous, billes) sans les
// reconstruire. Ne fait rien en mode simple (aucun degrade construit).
function actualiserDegradesEtFiltres(svg, hexTrou, couleursBilles) {
  remplacerArretsDegrade(svg, 'degrade-paroi-trou', [
    [15, teinterNiveauGris(hexTrou, NIVEAU_GRIS_PAROI_SOMBRE)],
    [85, teinterNiveauGris(hexTrou, NIVEAU_GRIS_PAROI_CLAIRE)],
  ]);
  const hexNoirDefaut = couleurVersHex(REGLAGES_PAR_DEFAUT.colors.black);
  const hexBlancDefaut = couleurVersHex(REGLAGES_PAR_DEFAUT.colors.white);
  const hexNoir = couleursBilles?.black ?? hexNoirDefaut;
  const hexBlanc = couleursBilles?.white ?? hexBlancDefaut;
  remplacerArretsDegrade(svg, 'degrade-bille-noir', hexNoir === hexNoirDefaut ? ARRETS_BILLE_NOIRE_PAR_DEFAUT : construireArretsBille(hexNoir));
  remplacerArretsDegrade(svg, 'degrade-bille-blanc', hexBlanc === hexBlancDefaut ? ARRETS_BILLE_BLANCHE_PAR_DEFAUT : construireArretsBille(hexBlanc));
}

// Recolore TOUT le plateau deja construit : fond, relief, trous, degrades.
// Sans effet sur le relief/les trous/les degrades en mode simple (rien
// n'existe a recolorer) ; le fond, lui, se recolore dans tous les cas.
function actualiserCouleursPlateau(svg, hexFond, hexTrou, couleursBilles) {
  actualiserCouleurCadrePlateau(svg, hexFond);
  if (svg.classList.contains('mode-simple')) return;
  actualiserCouleurReliefCylindres(svg, hexFond);
  actualiserCouleurTrous(svg, hexTrou);
  actualiserDegradesEtFiltres(svg, hexTrou, couleursBilles);
}
