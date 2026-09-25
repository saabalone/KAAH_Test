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
// Seuls lettres, chiffres et "_" (saab ; la regle : moteur/nom-partie.js,
// nomJoueurAutorise), corriges PENDANT la frappe pour que le joueur voie tout de
// suite ce qui sera garde — voir brancherSaisieNomJoueur, aussi utilisee par
// la boite Correspondance (interface/correspondance.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : afficherNomJoueur
// (rendu/ligne-joueur.js), NOM_CAMP (rendu/ejections.js) et nomJoueurAutorise
// (moteur/nom-partie.js) viennent de fichiers charges avant celui-ci dans
// index.html.

// Corrige le champ a chaque frappe. Un espace tape devient "_" tout de suite
// (sinon la regle, qui retire les espaces des bords, l'avalerait avant qu'on
// ait pu taper la suite du nom). Jamais PENDANT une composition du clavier
// (Android : chaque mot tape en est une) — changer le texte a ce moment-la
// le duplique ; on corrige a la fin de la composition.
function brancherSaisieNomJoueur(champ) {
  const corriger = (texte) => nomJoueurAutorise(texte.replace(/\s/g, '_'));
  function appliquer() {
    const propre = corriger(champ.value);
    if (propre === champ.value) return;
    const curseur = corriger(champ.value.slice(0, champ.selectionStart ?? champ.value.length)).length;
    champ.value = propre;
    champ.setSelectionRange(curseur, curseur);
  }
  champ.addEventListener('input', (evenement) => {
    if (!evenement.isComposing) appliquer();
  });
  champ.addEventListener('compositionend', appliquer);
}

// `elements` : { dialogue, champ, valider, fermer }. `nomsParDefaut` :
// { noir, blanc }.
function demarrerNomsJoueurs(svg, elements, joueurs, nomsParDefaut, surChangement) {
  let campEnCours = null;
  brancherSaisieNomJoueur(elements.champ);

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
    const nom = nomJoueurAutorise(elements.champ.value) || nomsParDefaut[campEnCours];
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
