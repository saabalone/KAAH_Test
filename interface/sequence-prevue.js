// La sequence prevue par la machine sur un petit plateau (saab, 2026-09-30 :
// « par clic sur une sequence prevue, sur un plateau, taille comme celui des
// variantes/PZL, avec boutons de navigation et bouton Fermer »). Un clic sur la
// colonne « Séquence prévue » du tableau de reflexion (interface/reflexion-ia.js)
// l'ouvre sur la position d'ou la machine a cherche.
//
// Le petit plateau est redessine a chaque pas, comme l'apercu des Variantes
// (interface/variantes.js) : ce n'est pas le plateau du jeu, dont les billes
// ne sont jamais reconstruites (CLAUDE.md).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : etatsDeLaSequence
// (moteur/sequence-prevue.js), depuisNotation (moteur/plateau.js),
// dessinerPlateau, poserBille (rendu/plateau-svg.js), dessinerEjectionsApercu
// (rendu/ejections-apercu.js) viennent de fichiers charges avant celui-ci.

// `elements` : { dialogue, titre, apercu (<svg>), coups (la ligne des coups),
// debut, precedent, suivant, fin, fermer }. Renvoie { montrer(etat, textes,
// titre) }.
function demarrerSequencePrevue(elements) {
  let etats = [];
  let textes = [];
  let rang = 0;

  function dessiner() {
    const etat = etats[rang];
    elements.apercu.innerHTML = '';
    dessinerPlateau(elements.apercu);
    for (const [notation, bille] of Object.entries(etat.plateau)) {
      const { q, r } = depuisNotation(notation);
      poserBille(elements.apercu, { id: `sequence-prevue-${bille.id}`, q, r, couleur: bille.couleur });
    }
    dessinerEjectionsApercu(elements.apercu, etat.billesEjecteesNoires, etat.billesEjecteesBlanches);
    // Les coups rejoues (etats.length - 1 : un coup illisible arrete la
    // sequence), celui qui mene a la position montree en evidence.
    elements.coups.replaceChildren(
      ...textes.slice(0, etats.length - 1).map((texte, index) => {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'coup-sequence-prevue';
        bouton.classList.toggle('coup-sequence-prevue-actuel', index + 1 === rang);
        bouton.textContent = texte;
        bouton.addEventListener('click', () => aller(index + 1));
        return bouton;
      })
    );
    elements.debut.disabled = elements.precedent.disabled = rang === 0;
    elements.suivant.disabled = elements.fin.disabled = rang === etats.length - 1;
  }

  function aller(nouveauRang) {
    rang = Math.max(0, Math.min(etats.length - 1, nouveauRang));
    dessiner();
  }

  elements.debut.addEventListener('click', () => aller(0));
  elements.precedent.addEventListener('click', () => aller(rang - 1));
  elements.suivant.addEventListener('click', () => aller(rang + 1));
  elements.fin.addEventListener('click', () => aller(etats.length - 1));
  elements.fermer.addEventListener('click', () => elements.dialogue.close());

  // Ouvre sur la position de depart ; un clic sur le petit plateau avance
  // d'un coup, comme la fleche.
  elements.apercu.addEventListener('click', () => aller(rang + 1));

  function montrer(etat, nouveauxTextes, titre) {
    textes = nouveauxTextes;
    etats = etatsDeLaSequence(etat, textes);
    elements.titre.textContent = titre;
    aller(0);
    if (!elements.dialogue.open) elements.dialogue.showModal();
  }

  return { montrer };
}
