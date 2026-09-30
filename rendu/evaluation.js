// Le cadre de l'evaluation de chaque camp (saab, 2026-09-30 : « coller
// l'evaluation centree sur les scores eject ; la hauteur du cadre ne doit pas
// depasser celle de la bande creee par les btn Nom, sinon ca va reduire le
// plateau »). Colle au bloc Abandon / compte / Nulle, du cote exterieur (au-dessus
// en haut, au-dessous en bas), dans la bande des noms (rendu/ejections.js,
// agrandirViewBoxPourNoms) : il ne l'agrandit jamais. Ce fichier ne fait que
// dessiner ; le texte (« Ouv. +120 », ou « Évaluation » en grise tant qu'un
// humain ne l'a pas demandee) vient de interface/evaluations.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG
// (rendu/plateau-svg.js), RAYON_PISTE, HAUTEUR_BANDE (rendu/ejections.js),
// COTE_BOUTON_FIN_PISTE, DEMI_LARGEUR_COMPTE, ECART_BOUTON_FIN_PISTE
// (rendu/boutons-fin-piste.js) viennent de fichiers charges avant celui-ci, ou
// seulement appeles au demarrage reel.

const JEU_CADRE_EVALUATION = RAYON_PISTE * 0.2;

// `compte` : le centre du compte d'ejections du camp (voir
// disposerPisteTriangle) ; `limites` : celles du plateau, avant la bande des noms.
function dessinerCadreEvaluation(svg, camp, compte, enHaut, limites) {
  const largeur = (DEMI_LARGEUR_COMPTE + ECART_BOUTON_FIN_PISTE + COTE_BOUTON_FIN_PISTE) * 2;
  const bordDuBloc = enHaut ? compte.y - COTE_BOUTON_FIN_PISTE / 2 - JEU_CADRE_EVALUATION : compte.y + COTE_BOUTON_FIN_PISTE / 2 + JEU_CADRE_EVALUATION;
  const bordDeLaBande = enHaut ? limites.yMin - HAUTEUR_BANDE : limites.yMax + HAUTEUR_BANDE;
  const hauteur = Math.min(HAUTEUR_BANDE, Math.abs(bordDuBloc - bordDeLaBande)) - JEU_CADRE_EVALUATION;
  const y = enHaut ? bordDuBloc - hauteur : bordDuBloc;
  const groupe = creerElementSVG('g', {
    id: `evaluation-${camp}`,
    class: `cadre-evaluation cadre-evaluation-${camp}${enHaut ? ' cadre-evaluation-en-haut' : ''}`,
    role: 'button',
  });
  groupe.dataset.camp = camp;
  const texte = creerElementSVG('text', {
    class: 'cadre-evaluation-texte',
    x: compte.x,
    y: y + hauteur / 2,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
  });
  // En face-a-face, celui du haut se lit depuis le haut (styles.css) : il tourne
  // autour de son propre centre.
  texte.style.transformOrigin = `${compte.x}px ${y + hauteur / 2}px`;
  groupe.append(creerElementSVG('rect', { class: 'cadre-evaluation-fond', x: compte.x - largeur / 2, y, width: largeur, height: hauteur, rx: RAYON_PISTE * 0.4 }), texte);
  svg.appendChild(groupe);
}

// `vide` : le texte n'est qu'une invitation (« Évaluation », en grise).
function afficherEvaluation(svg, camp, texte, vide) {
  const groupe = svg.querySelector(`#evaluation-${camp}`);
  if (!groupe) return;
  ecrireSiChange(groupe.querySelector('.cadre-evaluation-texte'), texte);
  groupe.classList.toggle('evaluation-vide', vide);
}
