// Le SURVOL d'une case du plateau, sur ordinateur (saab, 2026-10-04 : « que ca
// affiche des valeurs, comme celles dans KAAWA ») : sa notation, ses
// coordonnees axiales, ce qui l'occupe — le tooltip de KAAWA, ses trois champs,
// au-dessus a droite de la souris. Les champs montres : bouton ⚙ du panneau
// d'une bille (interface/infos-case.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : COORDONNEES_DES_CASES_IA
// (moteur/ia-evaluation-v3.js), NOM_CAMP (rendu/ejections.js) viennent de
// fichiers charges avant celui-ci.

const ECART_AU_CURSEUR_PX = 14;
const CHAMPS_SURVOL_CASE = { notation: 'Notation', axiales: 'Coordonnées axiales (q,r)', occupant: 'Bille (Noir, Blanc, vide)' };

// `obtenirEtat()` : la position affichee ; `champMontre(cle)` : vrai si ce champ
// se montre ; `enPause()` : vrai pendant le dessin d'une aire.
function demarrerSurvolCase(svg, obtenirEtat, champMontre, enPause) {
  const infobulle = document.createElement('div');
  infobulle.className = 'infobulle-case';
  infobulle.hidden = true;
  document.body.append(infobulle);

  function texteDuSurvol(notation) {
    const { q, r } = COORDONNEES_DES_CASES_IA[notation];
    const occupant = obtenirEtat()?.plateau[notation]?.couleur;
    const morceaux = { notation, axiales: `(${q},${r})`, occupant: occupant ? NOM_CAMP[occupant] : 'vide' };
    return Object.keys(CHAMPS_SURVOL_CASE).filter(champMontre).map((cle) => morceaux[cle]).join(' ');
  }

  svg.addEventListener('pointermove', (evenement) => {
    if (evenement.pointerType !== 'mouse' || enPause()) return;
    const notation = evenement.target.closest?.('[data-notation]')?.dataset.notation;
    const texte = notation && COORDONNEES_DES_CASES_IA[notation] ? texteDuSurvol(notation) : '';
    infobulle.hidden = texte === '';
    if (texte === '') return;
    infobulle.textContent = texte;
    infobulle.style.left = `${Math.max(0, Math.min(evenement.clientX + ECART_AU_CURSEUR_PX, window.innerWidth - infobulle.offsetWidth))}px`;
    infobulle.style.top = `${Math.max(0, evenement.clientY - ECART_AU_CURSEUR_PX - infobulle.offsetHeight)}px`;
  });
  svg.addEventListener('pointerleave', () => (infobulle.hidden = true));

  return { cacher: () => (infobulle.hidden = true) };
}
