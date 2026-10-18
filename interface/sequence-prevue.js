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
// (rendu/ejections-apercu.js), ecrirePosition (moteur/notation.js), rendreDeplacable, reinitialiserPosition
// (interface/deplacable.js) viennent de fichiers charges avant celui-ci.

// `elements` : { dialogue, titre, apercu (<svg>), coups (la ligne des coups),
// debut, precedent, suivant, fin, fermer, groupes } ; `montrerDansLesGroupes(etat, textes,
// titre, ouvrir)` : la meme sequence dans les 4 groupes (saab, 2026-10-16 : « généraliser
// le clic sur les tableaux de réflexion ou autre pour voir 4 groupes partout ») — tout de
// suite si leur panneau est ouvert, au bouton « 4 groupes » sinon ; `suivreDansLesGroupes
// (rang)` : le coup montre, que leur curseur suit. Renvoie { montrer(etat, textes, titre),
// suivre(etat, textes, rang), prolonger(etat, textes, titre), actualiserBoutonGraphique() }.
//
// Saab, 2026-10-16 : « le mini plateau de la séquence doit rester pour voir les coups en
// même temps que 4 groupes, car là au clic il disparaît » — une fenetre qui ne bloque rien
// (show, jamais showModal : un clic dehors ne la ferme plus), deplacable par son titre.
// `graphique` : { ouvert(), fermer() } — son bouton bascule (saab, 2026-10-18 : « le btn
// Graphique a l'air inactif ») : orange quand le Graphique est ouvert (un clic le ferme),
// vert sinon (un clic l'ouvre sur la sequence), comme le bouton Barres.
function demarrerSequencePrevue(elements, montrerDansLesGroupes = () => {}, suivreDansLesGroupes = () => {}, graphique = { ouvert: () => false, fermer: () => {} }) {
  let etats = [];
  let textes = [];
  let titreMontre = '';
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
    // Le coup montre reste dans la partie visible des coups (une longue partie defile).
    const actuel = elements.coups.querySelector('.coup-sequence-prevue-actuel');
    if (actuel) {
      const { offsetTop: haut, offsetHeight: hauteur } = actuel;
      if (haut < elements.coups.scrollTop) elements.coups.scrollTop = haut;
      else if (haut + hauteur > elements.coups.scrollTop + elements.coups.clientHeight) elements.coups.scrollTop = haut + hauteur - elements.coups.clientHeight;
    }
    actualiserBoutonGraphique();
    elements.debut.disabled = elements.precedent.disabled = rang === 0;
    elements.suivant.disabled = elements.fin.disabled = rang === etats.length - 1;
  }

  // `prevenir` : faux quand le coup vient des 4 groupes (ils le savent deja).
  function aller(nouveauRang, prevenir = true) {
    rang = Math.max(0, Math.min(etats.length - 1, nouveauRang));
    dessiner();
    if (prevenir) suivreDansLesGroupes(rang);
  }
  rendreDeplacable(elements.dialogue, elements.titre);

  elements.debut.addEventListener('click', () => aller(0));
  elements.precedent.addEventListener('click', () => aller(rang - 1));
  elements.suivant.addEventListener('click', () => aller(rang + 1));
  elements.fin.addEventListener('click', () => aller(etats.length - 1));
  elements.fermer.addEventListener('click', () => elements.dialogue.close());

  // Ouvre sur la position de depart ; un clic sur le petit plateau avance
  // d'un coup, comme la fleche.
  elements.apercu.addEventListener('click', () => aller(rang + 1));

  // `aLaFin` : ouvrir sur le dernier coup (une partie qui se joue), pas sur le depart.
  function montrer(etat, nouveauxTextes, titre, { aLaFin = false } = {}) {
    textes = nouveauxTextes;
    etats = etatsDeLaSequence(etat, textes);
    titreMontre = titre;
    elements.titre.textContent = titre;
    montrerDansLesGroupes(etat, textes, titre, false);
    aller(aLaFin ? etats.length - 1 : 0);
    if (!elements.dialogue.open) {
      reinitialiserPosition(elements.dialogue);
      elements.dialogue.show();
    }
  }
  // Le petit plateau reste : les deux se regardent ensemble.
  function actualiserBoutonGraphique() {
    if (!elements.groupes) return;
    const ouvert = graphique.ouvert();
    elements.groupes.classList.toggle('bouton-allume', ouvert);
    elements.groupes.classList.toggle('bouton-a-faire', !ouvert);
    elements.groupes.title = ouvert ? 'Ferme le Graphique' : 'Montre cette séquence dans le Graphique (au-dessus de la Séquence), en pointillé au bout de la partie';
  }
  elements.groupes?.addEventListener('click', () => {
    if (graphique.ouvert()) graphique.fermer();
    else {
      montrerDansLesGroupes(etats[0], textes, titreMontre, true);
      suivreDansLesGroupes(rang);
    }
    actualiserBoutonGraphique();
  });

  // Saab, 2026-10-17 : « les clics sur les courbes ne font pas suivre le mini plateau, le
  // contraire fonctionne » — les 4 groupes le font aller au coup `rang` de leur sequence,
  // si c'est bien celle qu'il montre (meme depart, memes coups).
  function suivre(etat, autresTextes, nouveauRang) {
    if (!elements.dialogue.open || etats.length === 0 || ecrirePosition(etats[0]) !== ecrirePosition(etat) || autresTextes.join(' ') !== textes.join(' ')) return;
    aller(nouveauRang, false);
  }

  // Une partie qui se joue (saab, 2026-10-18 : « sur un essai en cours, la suivre en direct
  // tant qu'on est dessus ») : ses coups s'allongent ; le petit plateau reste ou il est, ou
  // suit le dernier coup s'il y etait. Ferme, ou une autre sequence : rien. Renvoie le coup montre.
  function prolonger(etat, nouveauxTextes, titre) {
    if (!elements.dialogue.open || etats.length === 0 || ecrirePosition(etats[0]) !== ecrirePosition(etat)) return null;
    const auBout = rang === etats.length - 1;
    textes = nouveauxTextes;
    etats = etatsDeLaSequence(etat, textes);
    titreMontre = titre;
    elements.titre.textContent = titre;
    aller(auBout ? etats.length - 1 : rang, false);
    return rang;
  }

  return { montrer, suivre, prolonger, actualiserBoutonGraphique };
}
