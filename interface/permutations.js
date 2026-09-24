// Le popup « Permutations » (phase 25) : l'ancien plugin Permut de KAAWA
// (plugins/permut_plugin/__init__.py, PermutPopup) devenu une boîte normale.
// Deux colonnes de 12 lignes — « Permut » (les deux camps dans leur ordre
// d'origine) et « Camp_Permut » (les deux camps échangés) — pour une position
// tapée ou collée ; la ligne qui correspond à la position CANONIQUE (posRef,
// phase 14) est mise en évidence. Cliquer une valeur l'affiche sur le VRAI
// plateau (interface/saisie.js, demarrerApercuPermutation) le temps de la
// regarder, avec un bouton Copier et un bouton Retour — jamais un second
// plateau miniature à part, exactement comme KAAWA masque son popup pour
// montrer le vrai plateau derrière.
//
// « Copier tout » copie le tableau entier en texte, comme KAAWA
// (PermutPopup._copy_all). L'indice affiché (0-5 puis 10-15, 100-105 puis
// 110-115) n'est qu'un texte : la clé qui compte pour tout le reste de KAAH
// reste l'index 0-11 de moteur/permutations.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : toutesLesPermutations,
// indiceAffichePermutation, positionCanonique (moteur/permutations.js),
// lirePosition (moteur/notation.js) viennent de fichiers chargés avant
// celui-ci dans index.html.

// `elements` : { dialogue, position, tableau, posRef, copierTout, fermer,
// apercu : { dialogue, texte, copier, retour } }.
// `rappels` : { demarrerApercu(texteDePosition), terminerApercu() } — voir
// interface/saisie.js.
function demarrerPermutations(elements, rappels) {
  let enApercu = false;

  function texteLigne(indiceAffiche, valeur) {
    return `${indiceAffiche} : ${valeur}`;
  }

  function afficherErreur(message) {
    elements.tableau.innerHTML = '';
    elements.posRef.textContent = '';
    const ligne = document.createElement('p');
    ligne.className = 'erreur-creation';
    ligne.textContent = message;
    elements.tableau.appendChild(ligne);
  }

  function creerCellule(indiceAffiche, valeur, estPosRef) {
    const cellule = document.createElement('button');
    cellule.type = 'button';
    cellule.className = estPosRef ? 'cellule-permutation cellule-permutation-posref' : 'cellule-permutation';
    cellule.textContent = texteLigne(indiceAffiche, valeur);
    cellule.addEventListener('click', () => ouvrirApercu(texteLigne(indiceAffiche, valeur), valeur));
    return cellule;
  }

  function rafraichir() {
    const texte = elements.position.value.trim();
    let etat;
    try {
      etat = lirePosition(texte);
    } catch {
      afficherErreur('Position illisible (format : 0a12b123..._0a45b456...).');
      return;
    }

    const permutations = toutesLesPermutations(texte);
    const { positionReference, codePermutation } = positionCanonique(texte);

    elements.tableau.innerHTML = '';
    const entete = document.createElement('div');
    entete.className = 'ligne-permutation ligne-permutation-entete';
    entete.innerHTML = '<span>Permut</span><span>Camp_Permut</span>';
    elements.tableau.appendChild(entete);

    for (const { index, normale, camp } of permutations) {
      const indiceNormal = indiceAffichePermutation(index);
      const indiceCamp = 100 + indiceNormal;
      const ligne = document.createElement('div');
      ligne.className = 'ligne-permutation';
      ligne.appendChild(creerCellule(indiceNormal, normale, normale === positionReference));
      ligne.appendChild(creerCellule(indiceCamp, camp, camp === positionReference));
      elements.tableau.appendChild(ligne);
    }

    elements.posRef.textContent = `PosRef = ${positionReference}    code_permut_Ref_Orig = ${codePermutation}`;
  }

  function ouvrirApercu(etiquette, valeur) {
    enApercu = true;
    elements.dialogue.close();
    rappels.demarrerApercu(valeur);
    elements.apercu.texte.textContent = etiquette;
    elements.apercu.copier.textContent = 'Copier';
    elements.apercu.dialogue.show(); // non modal : le plateau derriere reste visible
  }

  // Ferme l'apercu et rouvre le popup principal. Le bouton Retour l'appelle
  // DIRECTEMENT (jamais seulement via l'evenement 'close' du <dialog>, qui ne
  // se declenche pas dans tous les navigateurs pour un dialogue non modal —
  // mesure ici meme) ; `enApercu` protege contre un double appel si 'close'
  // se declenche quand meme (Echap, sur un navigateur qui le fait).
  function fermerApercu() {
    if (!enApercu) return;
    enApercu = false;
    if (elements.apercu.dialogue.open) elements.apercu.dialogue.close();
    rappels.terminerApercu();
    elements.dialogue.showModal();
  }

  elements.apercu.dialogue.addEventListener('close', fermerApercu);
  elements.apercu.retour.addEventListener('click', fermerApercu);
  elements.apercu.copier.addEventListener('click', () => {
    const valeur = elements.apercu.texte.textContent.split(' : ').slice(1).join(' : ');
    navigator.clipboard?.writeText(valeur).then(() => {
      elements.apercu.copier.textContent = 'Copié !';
    });
  });

  elements.position.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Enter') rafraichir();
  });
  elements.position.addEventListener('change', rafraichir);
  elements.copierTout.addEventListener('click', () => {
    const lignes = [`posOrig = ${elements.position.value.trim()}`, ''];
    for (const enfant of elements.tableau.children) {
      if (!enfant.classList.contains('ligne-permutation') || enfant.classList.contains('ligne-permutation-entete')) continue;
      const [normal, camp] = enfant.children;
      lignes.push(`${normal.textContent}    ${camp.textContent}`);
    }
    lignes.push('', elements.posRef.textContent);
    navigator.clipboard?.writeText(lignes.join('\n')).then(() => {
      elements.copierTout.textContent = 'Copié !';
      setTimeout(() => (elements.copierTout.textContent = 'Copier tout'), 1200);
    });
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());

  // `ouvrir(texteDePosition)` : depuis la position copiable (clic = copie ET
  // ouvre, comme KAAWA, voir interface/position-copiable.js) ou tout autre
  // appelant qui connaît déjà une position à montrer.
  function ouvrir(texteDePosition) {
    elements.position.value = texteDePosition;
    rafraichir();
    elements.dialogue.showModal();
  }

  return { ouvrir };
}
