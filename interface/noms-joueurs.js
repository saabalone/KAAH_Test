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
// Contre la machine (saab, 2026-09-30) : tant que la boite est ouverte, la
// machine et le temps sont suspendus (sinon elle avait deja joue avant qu'on
// touche Arret) ; pour le camp d'une machine, la boite dit laquelle c'est et
// sur quel profil IA elle joue, et permet d'en changer pour la suite.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : afficherNomJoueur
// (rendu/ligne-joueur.js), NOM_CAMP (rendu/ejections.js), nomJoueurAutorise
// (moteur/nom-partie.js), PREFIXES_MOTEURS_IA (moteur/ia.js),
// memesReglagesIA (moteur/historique-profil-ia.js), listerProfilsIA,
// trouverProfilIA (interface/profils-ia.js) viennent de fichiers charges
// avant celui-ci dans index.html.

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

// `elements` : { dialogue, champ, valider, fermer, marcheMachine, machine
// (la zone de la machine), descriptionMachine, profilMachine (<select>) }.
// `nomsParDefaut` : { noir, blanc }. Renvoie { definirCommandeMachines } : une
// partie contre la machine (phase 32, interface/ia.js) y branche sa commande
// (estMachine, estEnMarche, machineDe, basculer, suspendre, changerProfil) — le
// bouton Marche/Arret et le profil n'apparaissent que pour le camp d'une
// machine (saab : « se servir du btn Nom pour la relancer ... ou l'arreter »).
function demarrerNomsJoueurs(svg, elements, joueurs, nomsParDefaut, surChangement) {
  let campEnCours = null;
  let commandeMachines = null;
  brancherSaisieNomJoueur(elements.champ);

  function afficherMarcheMachine() {
    const machine = commandeMachines?.estMachine(campEnCours) ?? false;
    elements.marcheMachine.hidden = !machine;
    elements.machine.hidden = !machine;
    if (!machine) return;
    afficherProfilMachine(commandeMachines.machineDe(campEnCours));
    const enMarche = commandeMachines.estEnMarche(campEnCours);
    elements.marcheMachine.textContent = enMarche ? 'Arrêt de la machine' : 'Marche de la machine';
    elements.marcheMachine.title = enMarche
      ? "Elle joue tout de suite son meilleur coup si c'est son tour, puis ne joue plus"
      : "Elle rejoue quand c'est son tour";
    elements.marcheMachine.classList.toggle('machine-arretee', !enMarche);
  }

  // Laquelle, et son profil IA (la liste de Reglages) ; le sien est garde
  // dans la liste meme s'il a ete supprime depuis.
  function afficherProfilMachine(machine) {
    const profil = trouverProfilIA(machine.profil);
    const retouche = profil && !memesReglagesIA(profil, machine) ? ' Le profil a été retouché depuis : elle garde les poids du début de partie.' : '';
    elements.descriptionMachine.textContent = `${PREFIXES_MOTEURS_IA[machine.moteur]}, niveau ${machine.niveau}, réflexion ${machine.reflexionMax} s, IA version ${machine.version}.${retouche}`;
    const noms = listerProfilsIA().map((existant) => existant.nom);
    if (!noms.includes(machine.profil)) noms.unshift(machine.profil);
    elements.profilMachine.replaceChildren(
      ...noms.map((nom) => {
        const option = document.createElement('option');
        option.value = nom;
        option.textContent = nom;
        return option;
      })
    );
    elements.profilMachine.value = machine.profil;
  }

  // La boite fermee (Valider, Fermer, Echap, Arret) : la machine et le temps
  // reprennent.
  elements.dialogue.addEventListener('close', () => commandeMachines?.suspendre(false));

  elements.marcheMachine.addEventListener('click', () => {
    commandeMachines?.basculer(campEnCours);
    elements.dialogue.close();
  });

  svg.addEventListener('click', (evenement) => {
    const cadre = evenement.target.closest('.nom-fond');
    if (!cadre) return;
    campEnCours = cadre.closest('.nom-joueur').dataset.camp;
    elements.champ.value = joueurs[campEnCours];
    elements.champ.placeholder = `Nom du Joueur (${NOM_CAMP[campEnCours]})`;
    elements.dialogue.classList.toggle('dialogue-retourne', campEnCours === 'blanc' && document.body.classList.contains('face-a-face'));
    afficherMarcheMachine();
    commandeMachines?.suspendre(true);
    elements.dialogue.showModal();
    elements.champ.select();
  });

  function valider() {
    let nom = nomJoueurAutorise(elements.champ.value) || nomsParDefaut[campEnCours];
    // Un autre profil : son nom automatique remplace l'ancien, sauf si on
    // avait donne un autre nom a la machine.
    const machine = commandeMachines?.machineDe(campEnCours);
    const noms = machine && elements.profilMachine.value !== machine.profil ? commandeMachines.changerProfil(campEnCours, elements.profilMachine.value) : null;
    if (noms && nom === noms.ancienNom) nom = noms.nouveauNom;
    elements.dialogue.close();
    if (nom === joueurs[campEnCours]) {
      if (noms) surChangement(); // le profil, lui, a change : a sauvegarder
      return;
    }
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

  return {
    definirCommandeMachines: (commande) => {
      commandeMachines = commande;
    },
  };
}
