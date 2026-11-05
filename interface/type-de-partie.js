// Le TYPE de la partie (saab, 2026-10-30 : « Je ne trouve plus où on choisit le type de partie Amicale ou autre » ;
// « mettre le choix du type directement dans Nouvelle partie, et donc pouvoir nommer aussi comme on veut » ; « Oui
// tu peux ajouter le type dans Pendule et dans Variantes/PZL si besoin ») : l'evenement du titre
// (moteur/nom-partie.js), un texte libre comme dans KAAWA, Amical et Test d'un toucher — une ligne de la boite du
// mode de pendule, montree seulement par ceux qui la demandent (Nouvelle partie, Variantes, PZL, Pendule) ; une autre,
// la meme, dans Creer une partie (interface/creation-partie.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// Ce qu'une nouvelle partie repropose : le type de la partie en cours (une serie de Test reste en Test), sauf celui
// d'une partie qui ne commence jamais par cette boite — la Correspondance, une partie revue du banc (LabAl…).
function typeDePartieAReproposer(evenement) {
  const texte = evenementDeLaPartie(evenement);
  return texte === EVENEMENT_CORRESPONDANCE || texte.startsWith(PREFIXE_LABALONE) ? EVENEMENT_AMICAL : texte;
}

// `elements` : { ligne, champ, rapides (les boutons Amical et Test, leur data-type), chrono (facultatif : le bouton
// Chrono de la meme boite) }. Renvoie { proposer(texte), proposerPourUneNouvellePartie(evenement), lire(),
// garderPourLaPositionChoisie(type) } — `lire` cache la ligne et rend le type tape, nettoye.
function demarrerTypeDePartie(elements) {
  // Le type tape avant d'aller choisir une autre position (Variante…, PZL… de la Nouvelle partie) : il revient.
  let enAttente = null;

  function marquerLeTypeRapide() {
    const type = evenementDeLaPartie(elements.champ.value);
    for (const bouton of elements.rapides) bouton.classList.toggle('bouton-actif', bouton.dataset.type === type);
  }
  // Saab, 2026-11-03 : « dans la boite Nouvelle partie, qd on met Test il faut passer en Chrono » — une partie
  // recopiee a la main ne doit jamais perdre au temps. Seulement quand on CHOISIT Test : a l'ouverture, une pendule
  // remise a la main reste.
  function passerEnChronoPourUnTest() {
    if (elements.chrono && evenementDeLaPartie(elements.champ.value) === EVENEMENT_TEST) elements.chrono.click();
  }
  for (const bouton of elements.rapides) {
    bouton.addEventListener('click', () => {
      elements.champ.value = bouton.dataset.type;
      marquerLeTypeRapide();
      passerEnChronoPourUnTest();
    });
  }
  elements.champ.addEventListener('input', () => {
    marquerLeTypeRapide();
    passerEnChronoPourUnTest();
  });

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
