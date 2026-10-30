// Le TYPE de la partie (saab, 2026-10-30 : « Je ne trouve plus où on choisit le type de partie Amicale ou autre » ;
// « mettre le choix du type directement dans Nouvelle partie, et donc pouvoir nommer aussi comme on veut » ; « Oui
// tu peux ajouter le type dans Pendule et dans Variantes/PZL si besoin ») : l'evenement du titre
// (moteur/nom-partie.js), un texte libre comme dans KAAWA, Amical et Test d'un toucher — une ligne de la boite du
// mode de pendule, montree seulement par ceux qui la demandent (Nouvelle partie, Variantes, PZL, Pendule).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// Ce qu'une nouvelle partie repropose : le type de la partie en cours (une serie de Test reste en Test), sauf celui
// d'une partie qui ne commence jamais par cette boite — la Correspondance, une partie revue du banc (LabAl…).
function typeDePartieAReproposer(evenement) {
  const texte = evenementDeLaPartie(evenement);
  return texte === EVENEMENT_CORRESPONDANCE || texte.startsWith(PREFIXE_LABALONE) ? EVENEMENT_AMICAL : texte;
}

// `elements` : { ligne, champ, rapides (les boutons Amical et Test, leur data-type) }. Renvoie { proposer(texte),
// proposerPourUneNouvellePartie(evenement), lire(), garderPourLaPositionChoisie(type) } — `lire` cache la ligne et
// rend le type tape, nettoye.
function demarrerTypeDePartie(elements) {
  // Le type tape avant d'aller choisir une autre position (Variante…, PZL… de la Nouvelle partie) : il revient.
  let enAttente = null;

  function marquerLeTypeRapide() {
    const type = evenementDeLaPartie(elements.champ.value);
    for (const bouton of elements.rapides) bouton.classList.toggle('bouton-actif', bouton.dataset.type === type);
  }
  for (const bouton of elements.rapides) {
    bouton.addEventListener('click', () => {
      elements.champ.value = bouton.dataset.type;
      marquerLeTypeRapide();
    });
  }
  elements.champ.addEventListener('input', marquerLeTypeRapide);

  function proposer(texte) {
    elements.champ.value = texte;
    marquerLeTypeRapide();
    elements.ligne.hidden = false;
  }

  return {
    proposer,
    proposerPourUneNouvellePartie: (evenement) => {
      proposer(enAttente ?? typeDePartieAReproposer(evenement));
      enAttente = null;
    },
    lire: () => {
      elements.ligne.hidden = true;
      return evenementDeLaPartie(elements.champ.value);
    },
    garderPourLaPositionChoisie: (type) => {
      enAttente = type;
    },
  };
}
