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
// (moteur/nom-partie.js), PREFIXES_MOTEURS_IA, nomDeLaMachine, lireMachine, ELAGAGE_PAR_DEFAUT_IA
// (moteur/ia.js), memesReglagesIA, CLES_REGLAGES_IA, LIBELLES_REGLAGES_IA
// (moteur/historique-profil-ia.js), couleursDeLaMachineIA
// (moteur/couleurs-profil-ia.js), colonnesDesPhases (moteur/ia-phase.js), trouverProfilIA, retenirProfilIAMontre (interface/profils-ia.js),
// poserCouleurIA (interface/couleurs-ia.js), nomColoreDeLaMachine (interface/nom-machine-couleurs.js), groupeDuReglage
// (moteur/ia-groupes.js), groupesQuiCommencent, colorerSelonLeGroupe, ligneDeTitreDeGroupe
// (interface/groupes-ia.js),
// brancherChoixMachine, machineDuChoix, lireDerniersJoueurs, livreDuProfil, profilDuChoix,
// valeurDuProfilDeLaMachine (interface/liste-profils-choix.js),
// ROLE_HUMAIN, reflexionDuChoix (interface/choix-joueurs.js), afficherNomsConnus, retenirNomConnu
// (interface/noms-connus.js) viennent de fichiers charges avant celui-ci,
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

// `elements` : { dialogue, titre, champ, nomsConnus (interface/noms-connus.js),
// messageNom (le nom est obligatoire), notePartieFinie, valider (vert quand il attend), fermer (rouge s'il laisse sans nom), marcheMachine, boutonIA, suggestion,
// choixIA (le choix d'un camp, interface/choix-joueurs.js), descriptionMachine,
// poidsMachine (<table>) }. `nomsParDefaut` : { noir, blanc }. Renvoie
// { definirCommandeMachines, ouvrir, nommer } : la partie branche dans le premier celle des machines
// (interface/ia.js : machineDe, estEnMarche, basculer, suspendre,
// definirMachine). Marche/Arret n'apparait que pour le camp d'une machine
// (saab : « se servir du btn Nom pour la relancer ... ou l'arreter »).
// `machinePermise()` : faux pendant un puzzle dans la version publiee (saab,
// 2026-10-08 : « interdire de se servir de l'IA pour les PZL ») — les boutons IA
// et Suggestion sont alors grises, et les toucher le dit.
const MESSAGE_MACHINE_PUZZLE = "Pas de machine dans les puzzles : à vous de trouver la solution !";

// Ce que la boite propose pour un humain : le dernier choix de Nouvelle partie, mais l'elagage par defaut (saab, 2026-11-04 :
// « Dans la boite des noms pour IA mettre Elagage 10 par défaut car là il est à 20 » — un 20 tape un jour restait retenu). Null :
// c'est deja celui du profil, en marron.
function choixProposeDansLaBoite(camp) {
  const dernier = lireDerniersJoueurs()[camp];
  const elagage = profilDuChoix(dernier.profil)?.elagage === ELAGAGE_PAR_DEFAUT_IA ? null : ELAGAGE_PAR_DEFAUT_IA;
  return { ...dernier, livre: livreDuProfil(dernier.profil), elagage };
}

// Le seuil de ses phases, que ni Pn ni _v ne disent (saab, 2026-11-05 : « comment savoir que le profile est en ph1 ou 2 ... pas d'indication
// claire » ; moteur/ia-phase.js, phaseAuScore).
function texteDuSeuilDesPhases({ poids }) {
  if (!('phasesAuScore' in poids)) return '';
  const billes = poids.phasesAuScore;
  return ` Phases au score : milieu dès ${billes} ${billes > 1 ? 'billes sorties' : 'bille sortie'}.`;
}

// `partieFinie()` : la boite le dit, car une partie finie garde son titre et sa machine (saab, 2026-11-04 : « il n'y a
// rien [...] qui alerte de ce changement » ; moteur/revanche.js, identiteAEcrire).
function demarrerNomsJoueurs(svg, elements, joueurs, nomsParDefaut, surChangement, machinePermise = () => true, partieFinie = () => false) {
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
    if (enJeu && choix.profil === valeurDuProfilDeLaMachine(enJeu)) {
      const elagage = choix.elagage ?? retrouverProfilDeLaMachine(enJeu)?.elagage ?? enJeu.elagage;
      const machine = lireMachine({ ...enJeu, moteur: choix.role, niveau: choix.niveau, reflexionMax: reflexionDuChoix(choix), livre: choix.livre, elagage });
      return choix.elagage === null || choix.elagage === undefined ? machine : avecLElagageForce(machine, choix.elagage);
    }
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
    const profil = retrouverProfilDeLaMachine(machine);
    // Reglages s'ouvrira sur ce profil (saab, 2026-10-07 : « faire le focus sur
    // le profil IA du joueur qui demande » ; interface/reglages-ia.js).
    if (profil) retenirProfilIAMontre(profil.nom);
    // Un elagage force ou un livre decoche (la boite les dit deja) ne sont pas une retouche du profil. Une ancienne version
    // choisie (versionHistorique) non plus : ses poids sont ceux qu'on a demandes, pas ceux du debut de partie (saab, 2026-11-04).
    const retouche = profil && !machine.versionHistorique && !memesReglagesIA(profil, { ...machine, elagage: profil.elagage, livre: profil.livre });
    // Les couleurs de ses poids (saab, 2026-10-02 : de la valeur jusqu'a son fichier) ; son nom
    // en morceaux colores (interface/nom-machine-couleurs.js).
    const couleurs = couleursDeLaMachineIA(machine, profil);
    elements.descriptionMachine.replaceChildren(
      ...nomColoreDeLaMachine(machine),
      ` : ${PREFIXES_MOTEURS_IA[machine.moteur]}, IA version ${machine.version}, ${machine.livre ? "avec" : "sans"} livre d'ouvertures.${texteDuSeuilDesPhases(machine)}`,
      ...(retouche ? [Object.assign(document.createElement('span'), { className: 'legende-modifie', textContent: ` Le profil est passé à ${libelleAvecSaVersion(profil)} : elle garde les poids du début de partie. Choisissez-le dans la liste pour qu'elle le joue.` })] : [])
    );
    // Dans l'ordre de Reglages, profil IA (saab, 2026-10-07), groupe apres groupe, chacun sous son
    // titre et dans sa couleur (saab, 2026-10-21 : « mettre aussi les couleurs des groupes dans IA
    // joueur » ; interface/groupes-ia.js) ; la ligne garde la couleur de sa validation.
    // Une colonne par phase (saab, 2026-11-04 : « il en faudrait autant que de phase » ; moteur/ia-phase.js, colonnesDesPhases).
    const colonnes = colonnesDesPhases(machine);
    const cles = CLES_REGLAGES_IA.filter((cle) => colonnes.some((colonne) => cle in colonne.poids));
    const debuts = groupesQuiCommencent(cles, groupeDuReglage);
    const entete = document.createElement('tr');
    entete.append(document.createElement('th'), ...colonnes.map(({ titre }) => Object.assign(document.createElement('th'), { textContent: titre })));
    elements.poidsMachine.replaceChildren(
      ...(colonnes.length > 1 ? [entete] : []),
      ...cles.flatMap((cle, rang) => {
        const tr = document.createElement('tr');
        const libelle = colorerSelonLeGroupe(document.createElement('td'), groupeDuReglage(cle));
        libelle.textContent = LIBELLES_REGLAGES_IA[cle];
        const nombres = colonnes.map((colonne) => {
          const nombre = Object.assign(document.createElement('td'), { textContent: colonne.poids[cle] ?? '—' });
          nombre.classList.toggle('poids-comme-l-ouverture', colonnes.length > 1 && colonne.poids[cle] === colonnes[0].poids[cle]);
          return nombre;
        });
        tr.append(libelle, ...nombres);
        poserCouleurIA(tr, couleurs[cle]);
        return debuts[rang] ? [ligneDeTitreDeGroupe(debuts[rang], colonnes.length + 1), tr] : [tr];
      })
    );
  }

  function afficherMachine() {
    const machine = machineEnJeu();
    elements.marcheMachine.hidden = !machine;
    elements.boutonIA.hidden = Boolean(machine) || !commandeMachines;
    elements.suggestion.hidden = Boolean(machine) || !commandeMachines;
    for (const bouton of [elements.boutonIA, elements.suggestion]) {
      bouton.classList.toggle('bouton-interdit', !machinePermise());
      bouton.title = machinePermise() ? bouton.title.replace(` — ${MESSAGE_MACHINE_PUZZLE}`, '') : `${bouton.title.replace(` — ${MESSAGE_MACHINE_PUZZLE}`, '')} — ${MESSAGE_MACHINE_PUZZLE}`;
    }
    elements.choixIA.hidden = !machine;
    // Son elagage s'affiche force s'il n'est pas celui de son profil.
    const profilDuJeu = machine ? retrouverProfilDeLaMachine(machine) : null;
    const elagageDuProfil = profilDuJeu?.elagage ?? 0;
    choixIA.definir(
      machine
        ? { role: machine.moteur, niveau: machine.niveau, profil: valeurDuProfilDeLaMachine(machine), reflexionMax: machine.reflexionMax, livre: machine.livre, elagage: machine.elagage === elagageDuProfil ? null : machine.elagage }
        : { ...choixProposeDansLaBoite(campEnCours), role: ROLE_HUMAIN },
      profilDuJeu ? profilDuJeu.nom : machine?.profil
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
  // affiche (sinon le dernier moteur choisi, KAI++ au debut) : le joueur ne change pas.
  elements.suggestion.addEventListener('click', () => {
    if (!machinePermise()) return window.alert(MESSAGE_MACHINE_PUZZLE);
    const choix = elements.choixIA.hidden ? choixProposeDansLaBoite(campEnCours) : choixIA.lire();
    commandeMachines.suggerer(machineDuChoix({ ...choix, role: choix.role === ROLE_HUMAIN ? choix.moteur : choix.role }));
    elements.dialogue.close();
  });

  // Un humain : le bouton IA ouvre le choix, sur le dernier moteur choisi
  // (KAI++ au debut, saab 2026-10-07).
  elements.boutonIA.addEventListener('click', () => {
    if (!machinePermise()) return window.alert(MESSAGE_MACHINE_PUZZLE);
    elements.boutonIA.hidden = true;
    elements.choixIA.hidden = false;
    elements.choixIA.querySelector(`[data-role="${choixIA.lire().moteur}"]`).click();
  });

  // La boite fermee (Valider, Fermer, Echap, Arret) : la machine et le temps
  // reprennent.
  elements.dialogue.addEventListener('close', () => commandeMachines?.suspendre(false));

  elements.marcheMachine.addEventListener('click', () => {
    commandeMachines?.basculer(campEnCours);
    elements.dialogue.close();
  });

  // Ouvre la boite du nom de `camp` (un clic sur son cadre, ou la page quand il
  // manque un nom : interface/nom-obligatoire.js).
  function ouvrir(camp) {
    campEnCours = camp;
    elements.messageNom.hidden = true;
    elements.notePartieFinie.hidden = !partieFinie();
    elements.champ.value = joueurs[campEnCours];
    elements.champ.placeholder = `Nom du Joueur (${NOM_CAMP[campEnCours]})`;
    elements.titre.textContent = `Joueur ${NOM_CAMP[campEnCours]}`;
    elements.dialogue.classList.toggle('dialogue-retourne', campEnCours === 'blanc' && document.body.classList.contains('face-a-face'));
    const enJeu = machineEnJeu();
    nomSuitLeChoix = !enJeu || estLeNomDeLaMachine(joueurs[campEnCours], enJeu);
    nomPropose = joueurs[campEnCours];
    afficherMachine();
    afficherNomsConnus(elements.nomsConnus, elements.champ);
    commandeMachines?.suspendre(true);
    elements.dialogue.showModal();
    elements.champ.select();
    actualiserLesBoutons();
  }
  // Les couleurs de la boite (saab, 2026-10-19 : « Valider doit passer en vert dès que j'ai mis
  // un nom, et Fermer en rouge, car si on n'a pas mis de nom et qu'on ferme, on sera obligé de
  // revenir ») : Valider vert des qu'il y a un nom ou qu'une machine joue (2026-10-27 : Joueur_1 permis,
  // Fermer n'est plus rouge — rien n'oblige plus a revenir).
  function actualiserLesBoutons() {
    const machine = commandeMachines ? machineChoisie() : machineEnJeu();
    const nom = nomJoueurAutorise(elements.champ.value);
    elements.valider.classList.toggle('bouton-a-faire', Boolean(machine) || Boolean(nom));
  }
  elements.champ.addEventListener('input', actualiserLesBoutons);
  // Un nom connu touche (interface/noms-connus.js), Humain / IA, un niveau : apres leur effet.
  for (const evenement of ['click', 'change']) elements.dialogue.addEventListener(evenement, () => setTimeout(actualiserLesBoutons));

  svg.addEventListener('click', (evenement) => {
    const cadre = evenement.target.closest('.nom-fond');
    if (cadre) ouvrir(cadre.closest('.nom-joueur').dataset.camp);
  });

  // Une autre machine (ou une machine a la place d'un humain, ou l'inverse) :
  // son nom automatique remplace l'ancien si l'on n'a pas touche au nom, et
  // si l'ancien n'etait pas un nom donne a la main a une machine.
  function valider() {
    const avant = machineEnJeu();
    const apres = commandeMachines ? machineChoisie() : avant;
    const machineChangee = JSON.stringify(apres) !== JSON.stringify(avant);
    // Joueur_1 et Joueur_2 permis (saab, 2026-10-27 : « retirer l'interdiction des noms Joueur 1 et
    // Joueur 2 ») : les noms se demandent a la fin de la partie (index.html, demanderLesNomsALaFin).
    let nom = nomJoueurAutorise(elements.champ.value) || nomsParDefaut[campEnCours];
    if (machineChangee) {
      const nomGarde = nom !== joueurs[campEnCours] || (avant && !estLeNomDeLaMachine(joueurs[campEnCours], avant));
      if (!nomGarde) nom = apres ? nomDeLaMachine(apres) : nomsParDefaut[campEnCours];
      commandeMachines.definirMachine(campEnCours, apres);
    }
    elements.dialogue.close();
    const nomChange = nommer(campEnCours, nom);
    if (machineChangee || nomChange) surChangement();
  }

  // Donne `nom` (deja corrige) a `camp`, et le retient parmi les noms connus ; vrai s'il a change. Aussi pour
  // les noms de fin de partie (interface/noms-fin-de-partie.js), qui sauvegardent ensuite une seule fois.
  function nommer(camp, nom) {
    retenirNomConnu(nom);
    if (nom === joueurs[camp]) return false;
    joueurs[camp] = nom;
    afficherNomJoueur(svg, camp, nom);
    return true;
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
    ouvrir,
    nommer,
  };
}
