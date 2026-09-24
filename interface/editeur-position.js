// L'editeur de position de la boite « My » (phase 23bis) : un plateau propre a la
// boite (decide avec saab : sur telephone la boite est plein ecran, le grand
// plateau serait cache), ou chaque clic suit le cycle de KAAWA
// (moteur/positions-my.js, basculerCase) ; le texte de la position, synchronise
// dans les deux sens ; et les billes deja ejectees, de 0 a 5 comme le curseur de
// KAAWA. Toute la logique est dans le moteur : ce fichier ne fait qu'afficher.
//
// Le plateau de la boite est redessine en entier a chaque clic : c'est un <svg>
// independant du plateau principal, comme l'apercu des Variantes (voir
// interface/variantes.js) — l'interdiction de CLAUDE.md ne vise que LE plateau.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : dessinerPlateau, poserBille
// (rendu/plateau-svg.js), dessinerEjectionsApercu (rendu/ejections-apercu.js),
// depuisNotation (moteur/plateau.js), saisieDepuisPosition, positionDeLaSaisie,
// basculerCase, EJECTIONS_MAX_AU_DEPART (moteur/positions-my.js) viennent de
// fichiers charges avant celui-ci.

// `elements` : { plateau (<svg>), position (champ texte), ejectionsNoires,
// ejectionsBlanches (curseurs), valeurEjectionsNoires, valeurEjectionsBlanches,
// prochaineCouleur }. `surChangement()` : appelee apres chaque modification.
// Renvoie { definir(texte), saisie(), texteLisible() }.
function demarrerEditeurPosition(elements, surChangement) {
  let saisie = saisieDepuisPosition('0_0');
  let texteLisible = true;

  for (const curseur of [elements.ejectionsNoires, elements.ejectionsBlanches]) {
    curseur.min = '0';
    curseur.max = String(EJECTIONS_MAX_AU_DEPART);
    curseur.step = '1';
  }

  // `depuisLeTexte` : ne pas reecrire le champ qu'on est justement en train de
  // taper (le curseur de saisie sauterait a la fin a chaque touche).
  function afficher(depuisLeTexte = false) {
    elements.plateau.innerHTML = '';
    dessinerPlateau(elements.plateau);
    for (const [notation, couleur] of Object.entries(saisie.couleurs)) {
      const { q, r } = depuisNotation(notation);
      poserBille(elements.plateau, { id: `editeur-${notation}`, q, r, couleur });
    }
    dessinerEjectionsApercu(elements.plateau, saisie.ejectionsNoires, saisie.ejectionsBlanches);

    if (!depuisLeTexte) elements.position.value = positionDeLaSaisie(saisie);
    elements.position.classList.toggle('champ-invalide', !texteLisible);
    elements.ejectionsNoires.value = String(saisie.ejectionsNoires);
    elements.ejectionsBlanches.value = String(saisie.ejectionsBlanches);
    elements.valeurEjectionsNoires.textContent = String(saisie.ejectionsNoires);
    elements.valeurEjectionsBlanches.textContent = String(saisie.ejectionsBlanches);
    // Le cycle de KAAWA ne se voit pas : on dit ce que fera le prochain clic
    // sur une case vide (apres avoir vide une case, c'est de nouveau Noir).
    elements.prochaineCouleur.textContent = `Case vide → bille ${saisie.couleurEnCours === 'blanc' ? 'blanche' : 'noire'}`;
  }

  function changer(nouvelleSaisie, depuisLeTexte = false) {
    saisie = nouvelleSaisie;
    afficher(depuisLeTexte);
    surChangement();
  }

  // Demande de saab : regler les ejections d'un clic sur les pions du coin
  // (rendu/ejections-apercu.js), comme on les compte — toucher le 4e remplit
  // jusqu'a 4 ; retoucher le dernier rempli l'enleve (pour revenir a 0). Jamais
  // au-dela du maximum du curseur. Les curseurs restent : sur telephone, ces
  // pions sont trop petits pour etre surs au doigt.
  function ejectionsApresClic(actuelles, rang) {
    const voulues = rang === actuelles ? rang - 1 : rang;
    return Math.min(voulues, EJECTIONS_MAX_AU_DEPART);
  }

  // Les cases ET les billes portent leur case (data-notation, rendu/plateau-svg.js).
  elements.plateau.addEventListener('click', (evenement) => {
    const pion = evenement.target.closest('[data-ejection-rang]');
    if (pion) {
      const rang = Number(pion.dataset.ejectionRang);
      if (pion.dataset.ejectionCouleur === 'noir') {
        changer({ ...saisie, ejectionsNoires: ejectionsApresClic(saisie.ejectionsNoires, rang) });
      } else {
        changer({ ...saisie, ejectionsBlanches: ejectionsApresClic(saisie.ejectionsBlanches, rang) });
      }
      return;
    }
    const notation = evenement.target.closest('[data-notation]')?.dataset.notation;
    if (!notation) return;
    texteLisible = true;
    changer(basculerCase(saisie, notation));
  });

  // Un texte illisible ne remplace pas la saisie : il est signale, et la boite
  // refuse d'enregistrer tant qu'il le reste (texteLisible).
  elements.position.addEventListener('input', () => {
    try {
      const lue = saisieDepuisPosition(elements.position.value.trim().toLowerCase());
      texteLisible = true;
      changer({ ...lue, couleurEnCours: saisie.couleurEnCours }, true);
    } catch {
      texteLisible = false;
      afficher(true);
      surChangement();
    }
  });

  elements.ejectionsNoires.addEventListener('input', () =>
    changer({ ...saisie, ejectionsNoires: Number(elements.ejectionsNoires.value) })
  );
  elements.ejectionsBlanches.addEventListener('input', () =>
    changer({ ...saisie, ejectionsBlanches: Number(elements.ejectionsBlanches.value) })
  );

  return {
    definir(texte) {
      saisie = saisieDepuisPosition(texte);
      texteLisible = true;
      afficher();
    },
    saisie: () => saisie,
    texteLisible: () => texteLisible,
  };
}
