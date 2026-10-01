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
// depuis son cote (classe `dialogue-retourne`, styles.css) — c'est lui qui
// ecrit son nom.
//
// Seuls lettres, chiffres et "_" (saab ; la regle : moteur/nom-partie.js,
// nomJoueurAutorise), corriges PENDANT la frappe pour que le joueur voie tout de
// suite ce qui sera garde — voir brancherSaisieNomJoueur, aussi utilisee par
// la boite Correspondance (interface/correspondance.js).
//
// La machine (saab, 2026-09-30 et 2026-10-01) : tant que la boite est ouverte,
// la machine et le temps sont suspendus (sinon elle avait deja joue avant qu'on
// touche Arret). Pour le camp d'une machine, la boite montre son choix (KAI ou
// KAI++, niveau, profil IA, reflexion — interface/choix-joueurs.js) et ses
// poids en colonne, a changer pour la suite ; un humain a un bouton IA qui
// ouvre ce meme choix (« pour ne pas afficher tout inutilement si on veut
// rester en humain »).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : afficherNomJoueur
// (rendu/ligne-joueur.js), NOM_CAMP (rendu/ejections.js), nomJoueurAutorise
// (moteur/nom-partie.js), PREFIXES_MOTEURS_IA, nomDeLaMachine, lireMachine
// (moteur/ia.js), memesReglagesIA, LIBELLES_REGLAGES_IA
// (moteur/historique-profil-ia.js), trouverProfilIA (interface/profils-ia.js),
// brancherChoixMachine, machineDuChoix, lireDerniersJoueurs, livreParDefaut,
// ROLE_HUMAIN (interface/choix-joueurs.js) viennent de fichiers charges avant celui-ci,
// ou ne servent qu'une fois la page chargee.

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

// `elements` : { dialogue, titre, champ, valider, fermer, marcheMachine, boutonIA, suggestion,
// choixIA (le choix d'un camp, interface/choix-joueurs.js), descriptionMachine,
// poidsMachine (<table>) }. `nomsParDefaut` : { noir, blanc }. Renvoie
// { definirCommandeMachines } : la partie y branche celle des machines
// (interface/ia.js : machineDe, estEnMarche, basculer, suspendre,
// definirMachine). Marche/Arret n'apparait que pour le camp d'une machine
// (saab : « se servir du btn Nom pour la relancer ... ou l'arreter »).
function demarrerNomsJoueurs(svg, elements, joueurs, nomsParDefaut, surChangement) {
  let campEnCours = null;
  let commandeMachines = null;
  brancherSaisieNomJoueur(elements.champ);
  const choixIA = brancherChoixMachine(elements.choixIA, () => afficherMachineChoisie());

  const machineEnJeu = () => commandeMachines?.machineDe(campEnCours) ?? null;

  // La machine que donnerait le choix affiche : celle en jeu (avec ses poids du
  // debut de partie) tant qu'on garde son profil, sinon celle du profil choisi.
  function machineChoisie() {
    const choix = choixIA.lire();
    const enJeu = machineEnJeu();
    if (choix.role === ROLE_HUMAIN) return null;
    if (enJeu && choix.profil === enJeu.profil) return lireMachine({ ...enJeu, moteur: choix.role, niveau: choix.niveau, reflexionMax: choix.reflexionMax, livre: choix.livre });
    return machineDuChoix(choix);
  }

  // Le nom automatique suit le choix dans le champ, tout de suite (saab,
  // 2026-10-02 : « les reglages sont seulement dans le nom, donc on valide
  // apres ») — tant que le nom n'a pas ete tape a la main : un humain, ou une
  // machine qui portait son nom automatique, au moment d'ouvrir la boite.
  let nomSuitLeChoix = false;
  let nomPropose = null;

  function proposerLeNom(machine) {
    if (!nomSuitLeChoix || elements.champ.value !== nomPropose) return;
    nomPropose = machine ? nomDeLaMachine(machine) : machineEnJeu() ? nomsParDefaut[campEnCours] : joueurs[campEnCours];
    elements.champ.value = nomPropose;
  }

  // Laquelle, et ses poids en colonne (saab, 2026-10-01 : « ce sera plus clair »).
  function afficherMachineChoisie() {
    const machine = machineChoisie();
    proposerLeNom(machine);
    if (!machine) {
      elements.descriptionMachine.textContent = '';
      elements.poidsMachine.replaceChildren();
      return;
    }
    const profil = trouverProfilIA(machine.profil);
    const retouche = profil && !memesReglagesIA(profil, machine) ? ' Le profil a été retouché depuis : elle garde les poids du début de partie.' : '';
    elements.descriptionMachine.textContent = `${nomDeLaMachine(machine)} : ${PREFIXES_MOTEURS_IA[machine.moteur]}, IA version ${machine.version}, ${machine.livre ? "avec" : "sans"} livre d'ouvertures.${retouche}`;
    elements.poidsMachine.replaceChildren(
      ...Object.entries(machine.poids).map(([cle, valeur]) => {
        const tr = document.createElement('tr');
        const libelle = document.createElement('td');
        const nombre = document.createElement('td');
        libelle.textContent = LIBELLES_REGLAGES_IA[cle];
        nombre.textContent = valeur;
        tr.append(libelle, nombre);
        return tr;
      })
    );
  }

  function afficherMachine() {
    const machine = machineEnJeu();
    elements.marcheMachine.hidden = !machine;
    elements.boutonIA.hidden = Boolean(machine) || !commandeMachines;
    elements.suggestion.hidden = Boolean(machine) || !commandeMachines;
    elements.choixIA.hidden = !machine;
    choixIA.definir(
      machine
        ? { role: machine.moteur, niveau: machine.niveau, profil: machine.profil, reflexionMax: machine.reflexionMax, livre: machine.livre }
        : { ...lireDerniersJoueurs()[campEnCours], role: ROLE_HUMAIN, livre: livreParDefaut() },
      machine?.profil
    );
    afficherMachineChoisie();
    if (!machine) return;
    const enMarche = commandeMachines.estEnMarche(campEnCours);
    elements.marcheMachine.textContent = enMarche ? 'Arrêt de la machine' : 'Marche de la machine';
    elements.marcheMachine.title = enMarche
      ? "Elle joue tout de suite son meilleur coup si c'est son tour, puis ne joue plus"
      : "Elle rejoue quand c'est son tour";
    elements.marcheMachine.classList.toggle('machine-arretee', !enMarche);
  }

  // Une suggestion pour la position du plateau, par la machine du choix
  // affiche (KAI si l'on n'en a pas choisi) : le joueur ne change pas.
  elements.suggestion.addEventListener('click', () => {
    const choix = elements.choixIA.hidden ? { ...lireDerniersJoueurs()[campEnCours], livre: livreParDefaut() } : choixIA.lire();
    commandeMachines.suggerer(machineDuChoix({ ...choix, role: choix.role === ROLE_HUMAIN ? 'kai' : choix.role }));
    elements.dialogue.close();
  });

  // Un humain : le bouton IA ouvre le choix, sur KAI.
  elements.boutonIA.addEventListener('click', () => {
    elements.boutonIA.hidden = true;
    elements.choixIA.hidden = false;
    elements.choixIA.querySelector('[data-role="kai"]').click();
  });

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
    elements.titre.textContent = `Joueur ${NOM_CAMP[campEnCours]}`;
    elements.dialogue.classList.toggle('dialogue-retourne', campEnCours === 'blanc' && document.body.classList.contains('face-a-face'));
    const enJeu = machineEnJeu();
    nomSuitLeChoix = !enJeu || joueurs[campEnCours] === nomDeLaMachine(enJeu);
    nomPropose = joueurs[campEnCours];
    afficherMachine();
    commandeMachines?.suspendre(true);
    elements.dialogue.showModal();
    elements.champ.select();
  });

  // Une autre machine (ou une machine a la place d'un humain, ou l'inverse) :
  // son nom automatique remplace l'ancien si l'on n'a pas touche au nom, et
  // si l'ancien n'etait pas un nom donne a la main a une machine.
  function valider() {
    const avant = machineEnJeu();
    const apres = commandeMachines ? machineChoisie() : avant;
    const machineChangee = JSON.stringify(apres) !== JSON.stringify(avant);
    let nom = nomJoueurAutorise(elements.champ.value) || nomsParDefaut[campEnCours];
    if (machineChangee) {
      const nomGarde = nom !== joueurs[campEnCours] || (avant && joueurs[campEnCours] !== nomDeLaMachine(avant));
      if (!nomGarde) nom = apres ? nomDeLaMachine(apres) : nomsParDefaut[campEnCours];
      commandeMachines.definirMachine(campEnCours, apres);
    }
    elements.dialogue.close();
    const nomChange = nom !== joueurs[campEnCours];
    if (nomChange) {
      joueurs[campEnCours] = nom;
      afficherNomJoueur(svg, campEnCours, nom);
    }
    if (machineChangee || nomChange) surChangement();
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
