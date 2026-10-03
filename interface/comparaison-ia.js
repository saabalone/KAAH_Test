// Le tableau comparatif des profils IA (saab, 2026-10-03 : « avec en colonnes
// la date (si elle existe), le profil IA, sa description, et tous les reglages
// avec leur code couleur ») : une boite ouverte depuis Reglages, rubrique
// Machine (bouton Comparer). Les lignes : moteur/couleurs-profil-ia.js,
// lignesComparaisonIA ; les couleurs : interface/couleurs-ia.js. Les valeurs
// validees seulement (une retouche en orange pas encore validee n'y est pas).
// Toucher une ligne choisit ce profil dans Reglages.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_REGLAGES_IA,
// libelleDateHistoriqueIA (moteur/historique-profil-ia.js), lignesComparaisonIA,
// couleurLaPlusForte (moteur/couleurs-profil-ia.js), listerProfilsIA, libelleProfilIA
// (interface/profils-ia.js), poserCouleurIA (interface/couleurs-ia.js),
// COLONNES_ESSAI_IA (interface/essai-ia.js) viennent de fichiers charges avant
// celui-ci, ou ne servent qu'une fois la page chargee.

// `elements` : { bouton, dialogue, tableau, fermer } ; `choisir(nom)` : le
// profil touche, dans Reglages.
function demarrerComparaisonIA(elements, choisir) {
  const cellule = (balise, texte, classe) => {
    const element = document.createElement(balise);
    element.textContent = texte;
    if (classe) element.className = classe;
    return element;
  };

  // « Ce qu'il cherche », plie par defaut (saab, 2026-10-03 : « pour voir
  // qu'une ligne par colonne, afin de mieux pouvoir comparer ») : une ligne
  // coupee, le texte entier au survol ; toucher son titre le deplie ou le replie.
  function basculerDescriptions(titre) {
    const pliees = elements.tableau.classList.toggle('descriptions-pliees');
    titre.textContent = `${pliees ? '▸' : '▾'} Ce qu'il cherche`;
  }

  function remplir() {
    const colonnes = { version: 'Version', elagage: 'Élag.', style: 'Style', ...COLONNES_ESSAI_IA };
    const profils = listerProfilsIA();
    const entete = document.createElement('tr');
    const titreDescription = cellule('th', "▸ Ce qu'il cherche", 'comparaison-titre-pliable');
    titreDescription.title = 'Toucher pour déplier ou replier les descriptions';
    titreDescription.addEventListener('click', () => basculerDescriptions(titreDescription));
    elements.tableau.classList.add('descriptions-pliees');
    entete.append(cellule('th', 'Date'), cellule('th', 'Profil IA', 'comparaison-profil'), titreDescription, ...CLES_REGLAGES_IA.map((cle) => cellule('th', colonnes[cle])));
    const lignes = lignesComparaisonIA(profils).map((ligne, rang) => {
      const tr = document.createElement('tr');
      const description = cellule('td', ligne.description, 'comparaison-description');
      description.title = ligne.description;
      tr.append(
        cellule('td', libelleDateHistoriqueIA(ligne.date)),
        cellule('td', libelleProfilIA(profils[rang]), 'comparaison-profil'),
        description,
        ...CLES_REGLAGES_IA.map((cle) => {
          const td = cellule('td', ligne.reglages[cle].texte);
          poserCouleurIA(td, ligne.reglages[cle].couleur);
          return td;
        })
      );
      // Le nom prend la plus forte de ses couleurs, comme partout (de la valeur au fichier).
      poserCouleurIA(tr.children[1], couleurLaPlusForte(Object.values(ligne.reglages).map((reglage) => reglage.couleur)));
      tr.title = 'Toucher pour choisir ce profil dans Réglages';
      tr.addEventListener('click', () => {
        elements.dialogue.close();
        choisir(ligne.nom);
      });
      return tr;
    });
    elements.tableau.replaceChildren(entete, ...lignes);
  }

  elements.bouton.addEventListener('click', () => {
    remplir();
    elements.dialogue.showModal();
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
}
