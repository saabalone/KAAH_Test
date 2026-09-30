// La boite « Essai sur la position du plateau » de Reglages, rubrique Machine
// (saab, 2026-09-30 : « connaitre les poids calcules, afin de savoir ce qu'on
// doit modifier ... juste voir l'essai puis le valider si besoin »). Avec les
// poids AFFICHES — retouches en orange comprises, rien n'est enregistre — :
//   - la valeur d'une bille sur chacune des 9 cases distinctes ;
//   - les coups de la position du plateau, classes comme le niveau 2 les
//     classe, avec ce que chacun change a chaque terme de l'evaluation. Pour
//     faire passer un meilleur coup devant, on voit quel terme le penalise.
// Recalcule a chaque retouche, tant que la boite est ouverte.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : essaiDesCoups,
// valeursDesCases (moteur/essai-ia.js), CLES_POIDS_IA (moteur/ia-evaluation.js),
// CLES_POIDS_IA_V2 (moteur/ia-evaluation-v2.js), VALEUR_VICTOIRE_IA
// (moteur/ia-evaluation.js), LIBELLES_REGLAGES_IA (moteur/historique-profil-ia.js),
// numeroDeTour (moteur/arbre.js), NOM_CAMP (rendu/ejections.js) viennent de
// fichiers charges avant celui-ci.

const COLONNES_ESSAI_IA = {
  gain: 'Gain',
  perte: 'Perte',
  centre: 'Centre',
  cohesion: 'Cohés.',
  bordSoi: 'Bord s.',
  bordAdverse: 'Bord a.',
  sumito: 'Sumito',
  menaceEjection: 'Menace',
  fourchette: 'Fourch.',
};

function texteValeurEssai(valeur) {
  if (Math.abs(valeur) >= VALEUR_VICTOIRE_IA / 2) return valeur > 0 ? 'Gagne' : 'Perd';
  const arrondi = Math.round(valeur);
  return arrondi > 0 ? `+${arrondi}` : arrondi === 0 ? '·' : String(arrondi);
}

function ligneDeTableau(cellules, balise = 'td') {
  const tr = document.createElement('tr');
  for (const contenu of cellules) {
    const cellule = document.createElement(balise);
    cellule.textContent = contenu;
    tr.appendChild(cellule);
  }
  return tr;
}

// `elements` : { boite (<details>), position (<p>), cases (<table>), coups
// (<table>) } ; `obtenirEtat()` : la position du plateau et son nombre de
// coups joues, { etat, coupsJoues }, ou null. Renvoie { actualiser(valeurs) }
// — `valeurs` : { version, poids } (le brouillon ou le profil).
function demarrerEssaiIA(elements, obtenirEtat) {
  let derniereValeurs = null;

  function afficherCases(poids) {
    const cases = valeursDesCases(poids);
    elements.cases.replaceChildren(
      ligneDeTableau(['Case', ...cases.map((c) => c.notation)], 'th'),
      ligneDeTableau(['Les siennes', ...cases.map((c) => texteValeurEssai(c.miennes))]),
      ligneDeTableau(['Adverses', ...cases.map((c) => texteValeurEssai(c.adverses))]),
      ligneDeTableau(['Voisines', ...cases.map((c) => String(c.voisines))])
    );
  }

  function afficherCoups({ version, poids }) {
    const position = obtenirEtat();
    if (!position || position.etat.vainqueur) {
      elements.position.textContent = 'Pas de coup à essayer sur la position du plateau.';
      elements.coups.replaceChildren();
      return;
    }
    const { etat, coupsJoues } = position;
    const cles = version >= 2 ? [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2] : CLES_POIDS_IA;
    const essai = essaiDesCoups(etat, poids, version);
    elements.position.textContent = `${NOM_CAMP[etat.joueurAuTrait]} joue (tour ${numeroDeTour(coupsJoues + 1)}). En haut, le coup du niveau 2 ; « Niv. 2 » : après la meilleure réponse ; les termes : ce que le coup change.`;
    const entete = ligneDeTableau(['Coup', 'Niv. 2', 'Niv. 1', ...cles.map((cle) => COLONNES_ESSAI_IA[cle])], 'th');
    cles.forEach((cle, rang) => (entete.children[rang + 3].title = LIBELLES_REGLAGES_IA[cle]));
    const actuelle = ligneDeTableau(['Position', '', '', ...cles.map((cle) => texteValeurEssai(essai.detail[cle] ?? 0))]);
    actuelle.className = 'essai-position-actuelle';
    actuelle.title = 'Les termes de la position actuelle ; en dessous, ce que chaque coup y ajoute';
    const lignes = essai.coups.map((ligne, rang) => {
      const tr = ligneDeTableau([ligne.texte, texteValeurEssai(ligne.deuxCoups), texteValeurEssai(ligne.unCoup), ...cles.map((cle) => texteValeurEssai(ligne.ecarts[cle] ?? 0))]);
      if (rang === 0) tr.className = 'essai-coup-choisi';
      return tr;
    });
    elements.coups.replaceChildren(entete, actuelle, ...lignes);
  }

  function actualiser(valeurs) {
    derniereValeurs = valeurs;
    if (!elements.boite.open) return;
    afficherCases(valeurs.poids);
    afficherCoups(valeurs);
  }

  elements.boite.addEventListener('toggle', () => {
    if (derniereValeurs) actualiser(derniereValeurs);
  });

  return { actualiser };
}
