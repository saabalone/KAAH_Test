// Saisie du nom d'un joueur : un clic sur le cadre de son nom ouvre une petite
// boite avec un champ, dont le texte grise (le "placeholder") dit
// "Nom du Joueur (Noir)" ou "(Blanc)" — la couleur de SES billes (saab). Un nom
// vide redonne le nom par defaut plutot qu'un joueur sans nom.
//
// Le nom vit dans `joueurs` (index.html : { noir, blanc }), ecrit tel quel dans
// la sauvegarde (Players, moteur/sauvegarde.js) : changer un nom demande donc
// une sauvegarde, `surChangement`. La ligne du joueur, elle, se met a jour par
// rendu/ligne-joueur.js.
//
// En face-a-face, la boite de Blanc est retournee de 180 degres : il la lit
// depuis son cote (classe `dialogue-retourne`, styles.css).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : afficherNomJoueur
// (rendu/ligne-joueur.js) et NOM_CAMP (rendu/ejections.js) viennent de
// fichiers charges avant celui-ci dans index.html.

// `elements` : { dialogue, champ, valider, fermer }. `nomsParDefaut` :
// { noir, blanc }.
function demarrerNomsJoueurs(svg, elements, joueurs, nomsParDefaut, surChangement) {
  let campEnCours = null;

  svg.addEventListener('click', (evenement) => {
    const cadre = evenement.target.closest('.nom-fond');
    if (!cadre) return;
    campEnCours = cadre.closest('.nom-joueur').dataset.camp;
    elements.champ.value = joueurs[campEnCours];
    elements.champ.placeholder = `Nom du Joueur (${NOM_CAMP[campEnCours]})`;
    elements.dialogue.classList.toggle('dialogue-retourne', campEnCours === 'blanc' && document.body.classList.contains('face-a-face'));
    elements.dialogue.showModal();
    elements.champ.select();
  });

  function valider() {
    const nom = elements.champ.value.trim() || nomsParDefaut[campEnCours];
    elements.dialogue.close();
    if (nom === joueurs[campEnCours]) return;
    joueurs[campEnCours] = nom;
    afficherNomJoueur(svg, campEnCours, nom);
    surChangement();
  }

  elements.valider.addEventListener('click', valider);
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
  // Entree valide, comme dans n'importe quel champ ; Echap ferme sans rien
  // changer (comportement natif d'un <dialog>).
  elements.champ.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Enter') valider();
  });
}
