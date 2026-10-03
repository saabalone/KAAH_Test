// Saisie utilisateur : traduit les clics en appels au moteur.
// Aucune regle du jeu ici — tout est delegue a regles.js, partie.js et
// arbre.js. Ce fichier ne fait qu'orchestrer leurs appels.
//
// Premier clic sur une bille a moi : on demande a regles.js tous les coups
// possibles depuis cette bille, et on met en evidence, pour chacun, la
// case ou atterrit CHAQUE bille du groupe (sauf celles qui restent a
// l'interieur du groupe lui-meme — ex. la bille du milieu d'une poussee,
// qui avance dans la case laissee libre par sa voisine : inutile de la
// marquer, un clic dessus reselectionnerait cette bille plutot que jouer
// le coup). Verifie contre KAAWA lui-meme (saab, en jeu reel) : toutes les
// cases vides autour d'un groupe s'allument, quelle que soit l'extremite
// cliquee en premier.
//
// Second clic sur une case : on cherche, parmi ces memes coups, celui dont
// une bille atterrit exactement sur la case cliquee. Si plusieurs coups
// partagent visuellement la meme case d'arrivee (deux groupes de tailles
// differentes glissant vers la meme rangee, par exemple), le plus petit
// groupe gagne — meme principe que l'ambiguite de la notation Nacre (voir
// CLAUDE.md, "le plus petit groupe gagne"). Cela ne prive jamais l'autre
// coup de sa case : elle est simplement partagee, l'autre groupe reste
// jouable via une autre case de sa propre liste.
//
// Naviguer dans l'arbre (boutons |<<, <<, >>, >>|, ou un clic dans la
// barre laterale Sequence) reaffiche le plateau via rendu.synchroniserBilles
// — un saut direct au nouvel etat, pas une animation coup par coup. Jouer
// un nouveau coup depuis un noeud passe cree une branche au lieu d'ecraser
// le futur (voir moteur/arbre.js, phase 11) ; rejouer un coup deja explore
// navigue vers la branche existante.
//
// "Coup suivant" et "Dernier coup" arretent la navigation automatique des
// qu'ils rencontrent un embranchement (plusieurs enfants) pour demander a
// l'utilisateur LEQUEL suivre (interface/embranchement.js), au lieu de
// choisir silencieusement le premier comme avant (signale par saab, comme
// KAAWA — action_next_move et action_end_to_Nacre). "Dernier coup"
// continue ensuite automatiquement depuis la branche choisie, jusqu'au
// prochain embranchement ou la fin. Ce meme popup permet aussi de
// "Remonter" une branche (moteur.remonterNoeud) : l'echanger avec sa
// precedente pour reordonner les variantes, JAMAIS au point de deloger
// l'origine de sa premiere place — bouton "Remonter" du popup "Controle de
// Branche" de KAAWA, verifie contre son vrai code source.
//
// « Annuler », contrairement aux quatre autres boutons de navigation, est
// DESTRUCTIF, comme dans KAAWA (action_annule_move) : il supprime le
// noeud courant, pas seulement y naviguer. Meme securite que KAAWA : la
// ligne REELLEMENT jouee ne peut perdre que son tout dernier coup (droit
// a l'erreur), jamais un coup plus ancien deja depasse ; une branche
// d'exploration, elle, se supprime toujours (voir
// moteur.peutSupprimerNoeud). Chaque coup de la barre laterale Sequence a
// aussi son propre bouton de suppression, soumis a la meme regle — et,
// dans les deux cas, une confirmation est demandee avant d'agir (effacer
// toute une branche d'un clic malheureux serait sinon trop facile).
//
// Les pendules (moteur/pendules.js, interface/pendules.js) forment un etat
// a part, mais PAS totalement independant de l'arbre : voir plus bas
// comment naviguer dans le passe fige leur affichage, comme dans KAAWA.
// Une partie peut se terminer de deux facons independantes : le plateau (6
// billes ejectees, etat.vainqueur) ou le temps (perteAuTemps).
//
// Comme dans KAAWA, une DEFAITE AU TEMPS n'empeche pas de continuer a
// jouer : les coups suivants prolongent la ligne reellement jouee, en
// chrono, sans jamais changer le resultat de la partie, qui reste ce T
// (moteur/arbre.js, finDeLaPartie — saab, 2026-09-30). `perteAuTemps` retient
// aussi A QUEL NOEUD la defaite a eu lieu (`{ camp, chemin }`) : le
// message "temps ecoule" ne s'affiche qu'en revenant exactement sur ce
// noeud, pas pour toujours des qu'on a joue plus loin en analyse.
//
// Une VICTOIRE PAR EJECTIONS (6 billes), elle, reste bloquante SUR CE
// NOEUD PRECIS (saab l'a demande explicitement) : la position est
// definitive, il n'y a plus de coup a y jouer. Chaque noeud de fin de
// partie est marque d'un code (moteur.marquerStatutFin) : "N" (normal, 6
// ejections), "T" (temps ecoule) ou "D" (nulle acceptee, phase 17), repris
// par rendu/arbre-ligne.js dans la sequence — memes lettres que le
// `term_status` de KAAWA. Une nulle acceptee bloque aussi le jeu EN AVANT
// sur ce noeud, exactement comme une victoire par ejections (voir
// `sansSuite` plus bas) ; un echec de puzzle (phase 16) n'a lui aucune
// lettre dediee, voir moteur.marquerStatutFin.
//
// Comme KAAWA, naviguer dans l'historique fige les pendules a la valeur
// QU'ELLES AVAIENT a ce moment-la (moteur.marquerPendulesSnapshot pose cet
// instantane sur chaque noeud au moment ou il est cree). La pendule de la
// partie ne tourne qu'au bout de la ligne reellement jouee, tant que la
// partie n'est pas finie ; toute autre position jouable (branche, suite
// jouee apres un T) est en chrono (phase 30, interface/pendules.js) —
// `synchroniserPendulesAvecEtat` choisit a chaque navigation ET a chaque
// coup joue.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : coupsDepuis,
// appliquerCoup, couleursDuPlateau, caseDansLaDirection, depuisNotation,
// ecrireCoupNacreSansAmbiguite, lireCoupNacre, ecrirePosition, lirePosition, creerArbre, jouerDansArbre,
// reculerDansArbre, avancerDansArbre, avancerVersEnfant,
// avancerJusquauProchainChoix, allerALaRacine, allerAuNoeud, supprimerBranche,
// peutSupprimerNoeud, peutRemonterNoeud, remonterNoeud, marquerStatutFin, marquerPendulesSnapshot,
// marquerCommentaire, marquerReflexionIA, etatCourant, noeudCourant, poserBille,
// mettreEnEvidence, synchroniserBilles, animerDeplacements,
// actualiserPistesEjection, actualiserTrait, actualiserCoordonneesBilles,
// actualiserCoordonneesDestinations, actualiserBillesSelectionnables
// (rendu/coordonnees-jeu.js),
// informationFlecheDernierCoup (moteur/fleche-dernier-coup.js),
// marquerFlecheDernierCoup (moteur/arbre.js),
// actualiserFlecheDernierCoup (rendu/fleche-dernier-coup.js),
// mettreEnEvidenceSelection (rendu/selection.js), demarrerPendules,
// demarrerAffichageSequence, forcerReaffichagePlateau,
// demarrerAffichageCommentaires, demarrerAffichageOccurrences,
// optionsDeFinDisponibles (moteur/arbre.js), repetitionAProposer (interface/nulle.js), refuserNulle (moteur/arbre.js),
// demarrerAbandonNulle (interface/abandon-nulle.js),
// estStatutDefinitif, finDeLaPartie (moteur/arbre.js), couleurAdverse (moteur/regles.js),
// perdantsDeLaSequence, tempsCumules (moteur/bilan-sequence.js),
// actualiserBillesDesPerdants (rendu/plateau-svg.js),
// creerHistoriqueNavigation, enregistrerSaut, reculerHistorique, avancerHistorique,
// origineHistorique, cheminActuelHistorique (moteur/historique-navigation.js),
// signalerCampAuTrait (interface/face-a-face.js), sonOccurrence (moteur/nulle.js),
// demarrerLectureSequence (interface/lecture-sequence.js),
// afficherPause et masquerPause viennent tous des
// fichiers charges avant celui-ci dans index.html (demarrerAffichageOccurrences
// utilise lui-meme actualiserCompteurOccurrences, rendu/ejections.js, pour
// le compteur affiche sur le plateau).

function cheminEgal(a, b) {
  return a.length === b.length && a.every((valeur, index) => valeur === b[index]);
}

// Met en place une partie interactive sur `svg`, a partir de `etatInitial`
// (voir moteur/notation.lirePosition).
// Ni le tour, ni le camp au trait, ni le resultat de fin de partie n'ont
// leur propre element HTML : tout s'affiche DANS le plateau lui-meme (voir
// rendu/ejections.js, actualiserTrait/actualiserPistesEjection), en
// prefixe du nom du camp concerne ("Tour 3 : (Noir) Joueur 1", "Gagne :
// (Blanc) Joueur 2"...) — KAAWA montre deja tout ca dans sa propre fenetre
// de plateau, jamais dans un bandeau a part qui lui volerait de la
// hauteur (signale par saab, phases 11 et 12).
// `elementsNavigation` sont les boutons de navigation dans l'arbre :
// { debut, precedent, suivant, fin, annuler, lecture } — Annuler a part, en
// grand, depuis la phase 31 (interface/disposition.js), et Lecture/Pause
// (interface/lecture-sequence.js).
// `demanderConfirmation(message, surConfirmation)` (interface/confirmation.js) :
// remplace window.confirm avant Annuler ou supprimer une branche —
// `surConfirmation` n'est appele que si l'utilisateur confirme vraiment.
// `demanderChoixBranche(enfants, surChoix)` (interface/embranchement.js) :
// ouvre le popup de choix quand "Coup suivant"/"Dernier coup" arrive sur un
// noeud a plusieurs enfants, comme KAAWA (action_next_move,
// action_end_to_Nacre) — jamais de choix silencieux du premier enfant dans
// ce cas. `surChoix` n'est appele qu'avec l'index vraiment choisi, jamais
// si l'utilisateur annule.
// `elementsPendules` affiche le temps de chaque camp : { noir, blanc } —
// ce sont maintenant des <text> SVG (rendu/ejections.js, dessinerPendule),
// mais interface/pendules.js n'a besoin de rien savoir de plus : il ne
// fait que leur ecrire du texte et basculer une classe CSS, comme avant.
// `elementsArbre` est la barre laterale Sequence : { conteneur, entete,
// panneau, bouton, poigneeHauteur, poigneeLargeur } — `conteneur` recoit
// l'arbre dessine, `entete` affiche la position de depart (equivalent du
// "[ POS. START ]" de KAAWA), `panneau` est repliee par defaut sur
// telephone (attribut `hidden`). `bouton` (le SIEN, "#bouton-sequence",
// desormais dans la colonne de gauche — voir index.html) et
// `elementsCommentaires.bouton` bascule chacun CE MEME `panneau` sur son
// propre mode (phase 18, voir `basculerPanneauArbre` plus bas) — ni l'un
// ni l'autre module ne gere plus lui-meme `panneau.hidden`.
// `reglagesPendules` : voir moteur.creerPendules. `pendulesReprises`
// (facultatif, correctif de disposition) : { tempsNoir, tempsBlanc } —
// reprend les DEUX COMPTEURS EN DIRECT exactement ou ils en etaient
// (voir interface/pendules.js, demarrerPendules) plutot que de repartir a
// `reglagesPendules.tempsInitial` a chaque rechargement ; la partie
// recommence quand meme toujours EN PAUSE MANUELLE (jamais un decompte
// qui repart tout seul).
// `arbreDepart` (facultatif, phase 12) : reprend une partie deja
// commencee (sauvegarde automatique ou fichier importe, voir
// interface/sauvegarde.js) au lieu d'une position neuve.
// `surChangement` (facultatif) : rappelle avec (arbre, perteAuTemps)
// apres chaque coup, navigation ou defaite au temps — c'est ainsi que la
// sauvegarde automatique se declenche, sans que ce fichier ait besoin de
// rien savoir du navigateur (voir interface/sauvegarde.js).
// `elementsCommentaires` (phase 18) : { bouton, conteneur, barre,
// barreRecherche, boutonReplierTout, boutonCopier } pour le CONTENU du
// panneau Commentaires — voir interface/commentaires.js. PARTAGE le meme
// panneau physique que `elementsArbre` (phase 18, saab a demande de
// reprendre le principe de KAAWA plutot que deux panneaux empiles) : voir
// `basculerPanneauArbre` plus bas, qui gere `elementsArbre.panneau` pour
// les deux a la fois.
// `elementsOccurrences` (phase 18, suite) : { bouton, panneau, entete,
// liste } — voir interface/occurrences.js, un panneau A PART (pas
// partage).
// `jouerSon(nom)` (facultatif, phase 21, interface/sons.js) : joue le son
// `nom` — 'move', 'eject', 'game_over', 'occ_change', 'occ_draw' ou
// 'time_alert'. Ce fichier decide QUAND (aux endroits ou l'evenement a lieu),
// jamais si le son est active : c'est le travail de interface/sons.js.
// Renvoie { obtenirArbre() } pour l'export (voir interface/sauvegarde.js).
function demarrerPartie(
  svg,
  etatInitial,
  elementsNavigation,
  demanderConfirmation,
  demanderChoixBranche,
  elementsPendules,
  reglagesPendules,
  pendulesReprises,
  elementsArbre,
  elementsCommentaires,
  elementsOccurrences,
  elementsHistoriqueNavigation,
  arbreDepart,
  surChangement,
  jouerSon
) {
  let arbre = arbreDepart ?? creerArbre(etatInitial);
  // Historique de NAVIGATION (phase 11bis) : ou l'on est ALLE en cliquant des
  // coups ailleurs dans l'arbre — jamais persiste (comme dans KAAWA, remis a
  // zero a chaque nouvelle session), voir moteur/historique-navigation.js.
  let historiqueNavigation = creerHistoriqueNavigation();
  let selection = null;
  let coupsPossibles = [];
  let perteAuTemps = null; // { camp, chemin } | null — voir l'en-tete du fichier

  // Une position peut etre SANS SUITE sans que le moteur le sache : un
  // puzzle dont le nombre de tours est depasse, par exemple — le plateau,
  // lui, reste parfaitement jouable au sens des regles d'Abalone (saab :
  // "quand c'est perdu on ne peut plus jouer en avant, on peut seulement
  // revenir en arriere pour faire d'autres branches d'essais"). C'est donc
  // a l'appelant de le dire, et jamais au moteur : une regle de puzzle n'a
  // rien a faire dans les regles du jeu (CLAUDE.md, separation moteur /
  // interface). Le predicat est relu A CHAQUE CLIC et non retenu : reculer
  // dans l'arbre suffit alors a rouvrir le jeu, sans rien avoir a annuler.
  let sansSuite = () => false;
  // Correspondance (phase 24) : aucune pendule a lancer, on joue quand son tour
  // vient, parfois des jours plus tard — les pendules restent figees, comme dans
  // KAAWA (qui les arrete en mode correspondance). Voir jeuSuspendu.
  let pauseIgnoree = false;
  // Correspondance (phase 24) : un coup envoye a l'adversaire ne se reprend plus
  // (les deux parties divergeraient) — ni Annuler, ni suppression dans la Sequence.
  let suppressionsInterdites = false;
  // Apercu d'une permutation (phase 25, interface/permutations.js) : le plateau
  // affiche momentanement une AUTRE position (celle d'une ligne du popup
  // Permutations, ou du camp inverse), sans toucher a `arbre` — jamais un coup
  // ni une navigation, juste un remplacement visuel. Bloque tout clic de jeu
  // pendant ce temps (voir jeuSuspendu) : sans ca, cliquer une bille du plateau
  // affiche tenterait de jouer un coup sur une position que l'arbre ne connait
  // pas. terminerApercuPermutation() reaffiche l'etat REEL, exactement comme
  // apres une navigation (memes fonctions que `naviguer`, sans transformer `arbre`).
  let apercuPermutationActif = false;
  // Declare ICI, avant tout affichage : le premier actualiserAffichagePartie de
  // l'initialisation le lit deja.

  const pendules = demarrerPendules(reglagesPendules, elementsPendules, (camp) => {
    jouerSon?.('game_over');
    perteAuTemps = { camp, chemin: arbre.chemin };
    arbre = marquerStatutFin(arbre, arbre.chemin, 'T');
    arbre = marquerPendulesSnapshot(arbre, arbre.chemin, pendules.etatActuel());
    synchroniserPendulesAvecEtat();
    actualiserAffichagePartie();
    sequence.actualiser(arbre);
    commentaires.actualiser(arbre);
    occurrences.actualiser(arbre);
    notifierChangement();
  }, pendulesReprises, () => jouerSon?.('time_alert'));

  // Instantane de depart (avant le tout premier coup) : sans lui, revenir
  // au debut apres avoir joue afficherait un instantane manquant plutot
  // que les vrais reglages de depart (voir marquerPendulesSnapshot). Une
  // partie reprise en a deja un (voir moteur.donneesVersArbre) : ne pas
  // l'ecraser par un instantane a plein temps.
  if (!arbre.racine.pendulesSnapshot) {
    arbre = marquerPendulesSnapshot(arbre, [], pendules.penduleDeLaPartie());
  }

  // Calcule une seule fois : la position de depart ne change jamais en
  // cours de partie (contrairement a `etatCourant(arbre)`). KAAWA affiche
  // le nom de la variante s'il existe ; KAAH n'a pas encore de variantes
  // nommees (phase 13), donc c'est la position compressee elle-meme qui
  // sert d'en-tete pour l'instant. `arbre.racine.etat`, pas `etatInitial` :
  // une partie reprise part d'une autre position que celle par defaut.
  const texteEnTete = ecrirePosition(arbre.racine.etat);

  const sequence = demarrerAffichageSequence(elementsArbre, texteEnTete, {
    surClicNoeud: sauterVersNoeud,
    surClicSupprimer: (chemin) => {
      if (suppressionsInterdites) return;
      demanderConfirmation('Supprimer ce coup et tout ce qui en dépend ? Cette action est irréversible.', () =>
        naviguer((a) => supprimerBranche(a, chemin))
      );
    },
  });

  // Phase 18 : meme mecanique de clic-pour-naviguer que la Sequence
  // juste au-dessus. Modifier un commentaire n'affecte ni le plateau ni
  // les pendules : `notifierChangement()` suffit pour la sauvegarde. Mais
  // `commentaires.actualiser(arbre)` reste necessaire (bug trouve en
  // testant la recherche) : sans lui, le module Commentaires garde son
  // PROPRE arbre d'avant l'edition — recherche et "Tout replier" auraient
  // alors ignore le commentaire tout juste tape, jusqu'au prochain coup ou
  // navigation qui l'aurait rafraichi par ailleurs.
  const commentaires = demarrerAffichageCommentaires(elementsCommentaires, {
    surClicNoeud: sauterVersNoeud,
    surCommentaireModifie: (chemin, texte) => {
      arbre = marquerCommentaire(arbre, chemin, texte);
      commentaires.actualiser(arbre);
      notifierChangement();
    },
  });

  // Panneau "Occurrences" (phase 18, suite) : a part, jamais partage.
  // `svg` (phase 18, correctif) : le compteur Occ/Ref/Br_Occ/Br_Ref sur le
  // plateau lui-meme, toujours a jour meme panneau ferme — voir
  // interface/occurrences.js.
  // Son d'Occ (phase 21) : le PREMIER compte vu sert seulement de point de
  // depart, silencieux (ouvrir une partie reprise ne doit pas sonner) ; ensuite
  // la regle est celle de moteur/nulle.js, sonOccurrence.
  let occurrencesAffichees = null;
  const occurrences = demarrerAffichageOccurrences(svg, elementsOccurrences, {
    surClicNoeud: sauterVersNoeud,
    surOccurrences: (occ) => {
      const son = occurrencesAffichees === null ? null : sonOccurrence(occurrencesAffichees, occ);
      occurrencesAffichees = occ;
      if (son) jouerSon?.(son);
    },
  });

  // Abandon / nulle depuis les boutons de chaque joueur (interface/abandon-nulle.js) :
  // la fin de partie est marquee sur le noeud courant, comme une nulle par
  // repetition acceptee (interface/nulle.js) — plus jamais de coup ensuite.
  // Aussi appelee quand une nulle par repetition est acceptee (jouerCoup).
  function terminerPartie(statut) {
    jouerSon?.('game_over');
    arbre = marquerStatutFin(arbre, arbre.chemin, statut);
    arbre = marquerPendulesSnapshot(arbre, arbre.chemin, pendules.etatActuel());
    deselectionner();
    synchroniserPendulesAvecEtat();
    actualiserAffichagePartie();
    actualiserBoutonsNavigation();
    sequence.actualiser(arbre);
    commentaires.actualiser(arbre);
    occurrences.actualiser(arbre);
    notifierChangement();
  }

  // Qui decide de ce que fait un bouton Abandon/Nulle : par defaut, il termine la
  // partie. Une partie de correspondance (phase 24, index.html) en fait une
  // proposition a envoyer pour la nulle — voir definirFinDemandee plus bas.
  let finDemandee = (statut, terminer) => terminer(statut);
  const abandonNulle = demarrerAbandonNulle(svg, {
    peutTerminer: () => estPointVivant() && !sansSuite(),
    terminer: (statut) => finDemandee(statut, terminerPartie),
  });

  // UN SEUL PANNEAU PHYSIQUE pour Sequence et Commentaires (phase 18,
  // demande explicite de saab : "tu fusionnes en un seul panneau comme
  // KAAWA") — `elementsArbre.panneau` sert aux deux modes, jamais montres
  // en meme temps. Un clic sur le bouton DEJA actif referme le panneau ;
  // un clic sur l'AUTRE bouton, panneau ouvert ou pas, bascule dessus.
  //
  // CORRIGE (saab : les icones de cette colonne doivent passer en orange
  // quand actives, comme Conseils/Menaces) : `.bouton-actif` sur CELUI des
  // deux boutons dont le mode est actuellement affiche, jamais les deux a
  // la fois (un seul panneau physique, un seul mode visible) — et sur
  // aucun des deux une fois le panneau referme.
  // Une Option (Revanche, Same) qu'on peut encore refaire (index.html, saab
  // 2026-10-02) : le cadre du tour dit alors « Options », comme en fin de partie.
  let optionARefaire = () => false;
  let modePanneauArbre = 'sequence';

  // Les deux boutons suivent l'etat REEL du panneau (visible ou non, quel
  // mode), jamais un etat memorise a part : sur ordinateur et telephone couche
  // le panneau s'affiche de lui-meme au demarrage (interface/disposition.js) et
  // son bouton doit alors etre orange des le depart (saab). Un observateur
  // couvre aussi ce changement-la, qui ne passe pas par un clic.
  function synchroniserBoutonsPanneauArbre() {
    const ouvert = !elementsArbre.panneau.hidden;
    elementsArbre.bouton.classList.toggle('bouton-actif', ouvert && modePanneauArbre === 'sequence');
    elementsCommentaires.bouton.classList.toggle('bouton-actif', ouvert && modePanneauArbre === 'commentaires');
  }
  new MutationObserver(synchroniserBoutonsPanneauArbre).observe(elementsArbre.panneau, {
    attributes: true,
    attributeFilter: ['hidden'],
  });
  synchroniserBoutonsPanneauArbre();

  function basculerPanneauArbre(mode) {
    if (!elementsArbre.panneau.hidden && modePanneauArbre === mode) {
      elementsArbre.panneau.hidden = true;
    } else {
      elementsArbre.panneau.hidden = false;
      modePanneauArbre = mode;
      elementsArbre.conteneur.hidden = mode !== 'sequence';
      elementsCommentaires.conteneur.hidden = mode !== 'commentaires';
      elementsCommentaires.barre.hidden = mode !== 'commentaires';
      elementsArbre.barreCopie.hidden = mode !== 'sequence';
      synchroniserBoutonsPanneauArbre();
      if (mode === 'sequence') sequence.actualiser(arbre);
      else commentaires.actualiser(arbre);
    }
    forcerReaffichagePlateau(); // voir interface/sequence.js : bug de re-affichage sur telephone
  }
  elementsArbre.bouton.addEventListener('click', () => basculerPanneauArbre('sequence'));
  elementsCommentaires.bouton.addEventListener('click', () => basculerPanneauArbre('commentaires'));

  // Le plateau (etatCourant, pas forcement la racine) : une partie reprise
  // peut redemarrer au milieu de son arbre (voir moteur.donneesVersArbre,
  // qui saute au bout de l'origine comme le fait KAAWA lui-meme).
  for (const [notation, bille] of Object.entries(etatCourant(arbre).plateau)) {
    const { q, r } = depuisNotation(notation);
    poserBille(svg, { id: bille.id, q, r, couleur: bille.couleur });
  }
  synchroniserPendulesAvecEtat();
  actualiserAffichagePartie();
  actualiserBoutonsNavigation();
  sequence.actualiser(arbre);
  commentaires.actualiser(arbre);
  occurrences.actualiser(arbre);

  // Les pendules demarrent en pause (voir interface/pendules.js, le
  // decompte n'avance pas et gererClic refuse tout coup) mais le grand
  // bouton rond, LUI, ne s'affiche PAS tout de suite (saab : "le bouton
  // pause ne doit pas masquer le plateau au debut... c'est assez logique
  // que les 2 joueurs puissent voir un peu la partie avant de commencer") —
  // seulement quand la pause est declenchee explicitement EN COURS de
  // partie (voir basculerPause plus bas). Le plateau reste donc visible,
  // mais bel et bien inerte, jusqu'au premier clic sur une pendule.

  function notifierChangement() {
    // `perteAuTemps` aussi : c'est le seul endroit ou ce renseignement
    // existe encore (voir moteur.arbreVersDonnees, parametre
    // `finDePartie`) — une defaite au temps ne laisse aucune trace dans
    // `etat` lui-meme.
    surChangement?.(arbre, perteAuTemps);
  }

  svg.addEventListener('click', (evenement) => {
    // Pause manuelle (correctif demande par saab) : une pendule ou le
    // grand bouton rond qui masque le plateau pendant la pause (voir
    // basculerPause plus bas) — jamais une case ou une bille, ces trois-la
    // n'ont pas de data-notation.
    if (evenement.target.closest('.bouton-pendule, #pause-plateau')) {
      basculerPause();
      return;
    }
    // Garde explicite, pas seulement visuelle : le grand bouton rond
    // masque bien le plateau a l'oeil, mais un clic PROGRAMME (script
    // externe, accessibilite) pourrait sinon atteindre une bille sans
    // passer par lui. Aucun coup ne doit rester jouable pendant la pause.
    if (jeuSuspendu()) return;
    const element = evenement.target.closest('[data-notation]');
    if (element) gererClic(element.dataset.notation);
    // Un clic dans le vide (hors case, hors bille) n'a rien a faire ici,
    // mais interface/next-move.js l'ecoute de son cote pour effacer ses
    // fleches — chacun s'occupe de ce qu'il a dessine.
  });

  // Bascule la pause manuelle et affiche/masque le grand bouton rond en
  // consequence (rendu/pendule.js) — appelable en cliquant une pendule OU
  // ce meme bouton rond, comme demande par saab. Une bascule REFUSEE
  // (partie terminee, ou navigation dans l'historique — voir
  // interface/pendules.js) ne doit rien changer a l'affichage : ni montrer
  // ni masquer quoi que ce soit.
  // Le jeu est-il suspendu, c'est-a-dire aucun coup acceptable ? SEULEMENT
  // pendant une pause volontaire sur le point VIVANT de la partie : le grand
  // bouton rond masque alors le plateau, et aucun coup ne doit pouvoir se
  // glisser derriere.
  //
  // La pause manuelle ne suffit PAS a elle seule (regression trouvee en
  // testant les puzzles) : elle demarre a `true` (une partie ne decompte
  // qu'au premier clic sur une pendule) et ne peut etre levee que par un
  // clic sur une pendule... lui-meme refuse pendant un apercu. Une partie
  // TERMINEE etant en apercu des son chargement, elle devenait donc
  // totalement inerte — impossible de revenir en arriere pour analyser, ni
  // d'essayer une variante, alors que c'est justement ce que KAAH promet
  // apres une fin de partie. Pendant un apercu, on joue donc librement :
  // c'est de l'analyse, le vrai decompte reste fige de son cote et ne
  // reprendra qu'au retour sur le point vivant.
  function jeuSuspendu() {
    return apercuPermutationActif || (!pauseIgnoree && pendules.estEnPauseManuelle());
  }

  // Pauses prises depuis l'ouverture de la partie, affichees sur le grand
  // bouton rond (rendu/pendule.js). Le premier clic, qui DEMARRE la partie,
  // leve la pause de depart : il ne compte pas.
  let nombreDePauses = 0;
  // Contre une machine (interface/ia.js), le plateau reste visible en pause
  // (saab, 2026-10-02 : « sinon on ne voit plus pour etudier ») : les pendules
  // vertes suffisent a la signaler.
  let pauseSansRideau = () => false;
  function basculerPause() {
    if (!pendules.basculerPauseManuelle()) return;
    if (pendules.estEnPauseManuelle() && !pauseSansRideau()) afficherPause(svg, ++nombreDePauses);
    else masquerPause(svg);
  }

  elementsNavigation.debut.addEventListener('click', () => naviguer(allerALaRacine));
  elementsNavigation.precedent.addEventListener('click', () => naviguer(reculerDansArbre));
  // "Coup suivant" : un embranchement (plusieurs enfants) demande TOUJOURS
  // a l'utilisateur de choisir (signale par saab, comme KAAWA -
  // action_next_move) — un seul pas, pas de suite automatique.
  elementsNavigation.suivant.addEventListener('click', () => {
    const enfants = noeudCourant(arbre).enfants;
    if (enfants.length > 1) {
      ouvrirChoixBranche(arbre.chemin, (index) => naviguer((a) => avancerVersEnfant(a, index)));
      return;
    }
    naviguer(avancerDansArbre);
  });
  // "Dernier coup" : avance sans rien demander tant que le chemin est sans
  // ambiguite, s'arrete au premier embranchement pour demander, puis
  // continue automatiquement depuis la branche choisie (KAAWA,
  // action_end_to_Nacre : "avance a la fin, s'arrete a chaque bifurcation
  // avec popup, puis continue").
  elementsNavigation.fin.addEventListener('click', avancerJusquauBoutEnDemandant);
  function avancerJusquauBoutEnDemandant() {
    naviguer(avancerJusquauProchainChoix);
    const enfants = noeudCourant(arbre).enfants;
    if (enfants.length > 1) {
      ouvrirChoixBranche(arbre.chemin, (index) => {
        naviguer((a) => avancerVersEnfant(a, index));
        avancerJusquauBoutEnDemandant();
      });
    }
  }

  // Lecture de la sequence (phase 31, saab) : « Coup suivant » repete, qui
  // s'arrete a un embranchement pour demander la branche, puis reprend.
  const lecture = demarrerLectureSequence(elementsNavigation.lecture, {
    peutAvancer: () => noeudCourant(arbre).enfants.length > 0,
    avancer: () => {
      if (noeudCourant(arbre).enfants.length > 1) {
        ouvrirChoixBranche(arbre.chemin, (index) => {
          naviguer((a) => avancerVersEnfant(a, index));
          lecture.lancer(false);
        });
        return 'choix';
      }
      naviguer(avancerDansArbre);
      return 'avance';
    },
    cheminActuel: () => arbre.chemin.join('.'),
  });

  // Construit et affiche la liste des enfants du noeud designe par
  // `cheminNoeud` (celui qui a plusieurs enfants), avec pour chacun son
  // propre `peutRemonter` (moteur.peutRemonterNoeud). `surChoixConfirme`
  // distingue le comportement de "Coup suivant" (un seul pas) de "Dernier
  // coup" (qui continue apres) — voir les deux appelants ci-dessus.
  // "Remonter" (moteur.remonterNoeud), lui, NE FERME PAS le panneau : on
  // rappelle cette meme fonction pour le rafraichir avec le nouvel ordre,
  // afin de pouvoir remonter plusieurs fois de suite avant de choisir —
  // exactement les deux actions ("Remonter"/"Valider") du popup "Controle
  // de Branche" de KAAWA.
  function ouvrirChoixBranche(cheminNoeud, surChoixConfirme) {
    const enfants = noeudA(arbre, cheminNoeud).enfants;
    const branches = enfants.map((enfant, index) => ({
      coup: enfant.coup,
      estOrigine: enfant.estOrigine,
      peutRemonter: peutRemonterNoeud(arbre, [...cheminNoeud, index]),
    }));
    demanderChoixBranche(branches, surChoixConfirme, (index) => {
      naviguer((a) => remonterNoeud(a, [...cheminNoeud, index]));
      ouvrirChoixBranche(cheminNoeud, surChoixConfirme);
    });
  }
  // Contre la machine (phase 29), Annuler retire AUSSI le coup du joueur
  // quand le dernier coup etait celui de la machine : sinon, la main revenant a
  // la machine, elle rejouerait aussitot — et le joueur ne pourrait jamais
  // reprendre son propre coup. `annulationEnDouble(arbre)` (voir
  // definirAnnulationEnDouble plus bas) dit, APRES la premiere suppression, s'il
  // faut en faire une seconde ; toujours faux entre humains.
  let annulationEnDouble = () => false;
  // Entre deux machines (phase 32, interface/ia.js), la nulle par repetition
  // est acceptee sans poser la question (saab) ; entre humains, jamais.
  let nulleAutomatique = () => false;
  elementsNavigation.annuler.addEventListener('click', () => {
    if (suppressionsInterdites || !peutSupprimerNoeud(arbre, arbre.chemin)) return;
    demanderConfirmation('Annuler le dernier coup ? Cette action est irréversible.', () =>
      naviguer((a) => {
        const apres = supprimerBranche(a, a.chemin);
        const encore = annulationEnDouble(apres) && peutSupprimerNoeud(apres, apres.chemin);
        return encore ? supprimerBranche(apres, apres.chemin) : apres;
      })
    );
  });
  // Le bouton Annuler de chaque joueur, sur sa ligne (rendu/ligne-joueur.js,
  // saab 2026-10-02) : le meme geste que le bouton Annuler, garde cache.
  svg.addEventListener('click', (evenement) => {
    if (evenement.target.closest('.bouton-annuler-joueur')) elementsNavigation.annuler.click();
  });

  function gererClic(notation) {
    const etat = etatCourant(arbre);
    // 6 billes ejectees, ou une nulle acceptee (phase 17) : cette position
    // precise est definitive, aucun coup n'y est plus possible (voir
    // l'en-tete du fichier). Une defaite au temps, elle, reste jouable : ce
    // n'est pas verifie ici.
    if (etat.vainqueur || estStatutDefinitif(noeudCourant(arbre).statutFin)) return;
    if (sansSuite()) return;

    if (selection === null) {
      if (estAMoi(etat, notation)) selectionner(notation);
      return;
    }

    if (notation === selection) {
      deselectionner();
      return;
    }

    if (estAMoi(etat, notation)) {
      selectionner(notation); // on change d'avis : on selectionne cette bille-la
      return;
    }

    // Le plus petit groupe gagne en cas de case partagee entre deux coups.
    const coup = [...coupsPossibles]
      .sort((a, b) => a.billes.length - b.billes.length)
      .find((c) => c.billes.some((bille) => caseDansLaDirection(bille, c.direction) === notation));
    if (coup) jouerCoup(coup);
    // Sinon, ce n'etait pas une destination valide : on ne fait rien, la
    // selection reste active pour un nouvel essai.
  }

  function estAMoi(etat, notation) {
    return etat.plateau[notation]?.couleur === etat.joueurAuTrait;
  }

  function selectionner(notation) {
    const etat = etatCourant(arbre);
    selection = notation;
    coupsPossibles = coupsDepuis(couleursDuPlateau(etat.plateau), etat.joueurAuTrait, notation);

    const destinations = coupsPossibles.flatMap((coup) =>
      coup.billes
        .map((bille) => caseDansLaDirection(bille, coup.direction))
        .filter((caseArrivee) => !coup.billes.includes(caseArrivee))
    );
    mettreEnEvidence(svg, destinations);
    // Coordonnees en vert sur ces memes destinations (phase 19bis) —
    // jamais une deuxieme regle de "quelles cases sont possibles", voir
    // rendu/coordonnees-jeu.js.
    actualiserCoordonneesDestinations(svg, destinations, etat.joueurAuTrait);
    // Contour orange sur la case de depart elle-meme, comme KAAWA (signale
    // par saab) — voir rendu/selection.js.
    mettreEnEvidenceSelection(svg, notation);
    // TOUS les ronds verts de selectionnabilite s'effacent des qu'une
    // selection est active (saab : "sinon ca n'a aucun sens") — seules les
    // cases de DESTINATION (ci-dessus) comptent alors ; ils reviennent tous
    // ensemble a la deselection, voir plus bas.
    actualiserBillesSelectionnables(svg, null);
  }

  function deselectionner() {
    selection = null;
    coupsPossibles = [];
    mettreEnEvidence(svg, []);
    actualiserCoordonneesDestinations(svg, [], null);
    mettreEnEvidenceSelection(svg, null);
    // Toutes les billes selectionnables retrouvent leur rond vert (voir
    // selectionner ci-dessus) — meme camp qu'avant, aucun coup n'a encore
    // ete joue ici (voir les appelants : jouerCoup/naviguer relancent de
    // toute facon actualiserAffichagePartie juste apres, avec le nouveau
    // camp au trait).
    actualiserBillesSelectionnables(svg, etatCourant(arbre).joueurAuTrait);
  }

  // `reflexionIA` (facultatif, phase 32) : ce que la machine a pense de ce
  // coup, pose sur son noeud (moteur/arbre.js, marquerReflexionIA) ;
  // `commentaire` (facultatif, saab 2026-09-30) : la meme chose en texte, en
  // commentaire du coup.
  function jouerCoup(coup, reflexionIA, commentaire) {
    const etatAvant = etatCourant(arbre);
    const joueurQuiJoue = etatAvant.joueurAuTrait;
    const resultat = appliquerCoup(etatAvant, coup);
    const arbreAvant = arbre;
    // Jamais ecrireCoupNacre seul : son texte peut designer un autre coup,
    // que jouerDansArbre confondrait avec celui-ci (voir moteur/notation.js).
    const texte = ecrireCoupNacreSansAmbiguite(couleursDuPlateau(etatAvant.plateau), joueurQuiJoue, coup);
    arbre = jouerDansArbre(arbre, texte, resultat.etat);
    // Phase 19bis : quelles billes recoivent la fleche, calcule une seule
    // fois ici (moteur.informationFlecheDernierCoup) a partir du MEME coup
    // structure que celui qui vient d'etre joue — jamais une deuxieme regle
    // de "qui a bouge" (voir aussi moteur/sauvegarde.js, qui refait ce
    // meme calcul au rechargement d'un fichier plutot que de le stocker).
    arbre = marquerFlecheDernierCoup(arbre, arbre.chemin, informationFlecheDernierCoup(coup));
    // La racine n'est reconstruite que si un noeud a vraiment ete cree
    // (voir moteur.jouerDansArbre) : rejouer un coup deja explore garde la
    // meme racine et ne doit donc pas ecraser sa date d'origine.
    if (arbre.racine !== arbreAvant.racine) sequence.enregistrerDate(arbre.chemin);
    animerDeplacements(svg, resultat.deplacements);
    const ejection = resultat.deplacements.some((d) => d.ejectee);
    // KAAWA : le son d'ejection REMPLACE celui du coup, jamais les deux.
    jouerSon?.(ejection ? 'eject' : 'move');
    pendules.surCoupJoue(joueurQuiJoue, ejection);
    if (resultat.etat.vainqueur) {
      // 6 billes ejectees : position definitive (voir l'en-tete du
      // fichier) ; le gel des pendules vient de synchroniserPendulesAvecEtat
      // plus bas, comme pour toute navigation.
      arbre = marquerStatutFin(arbre, arbre.chemin, 'N');
      jouerSon?.('game_over');
    }
    // L'instantane du coup qu'on vient de jouer, pour qu'y revenir plus
    // tard affiche ce temps-la plutot que le direct (voir l'en-tete du
    // fichier). Meme garde que pour la date juste au-dessus : rejouer un
    // coup deja explore ne doit pas ecraser son instantane d'origine.
    if (arbre.racine !== arbreAvant.racine) arbre = marquerPendulesSnapshot(arbre, arbre.chemin, pendules.etatActuel());
    if (reflexionIA && arbre.racine !== arbreAvant.racine) arbre = marquerReflexionIA(arbre, arbre.chemin, reflexionIA);
    if (commentaire && arbre.racine !== arbreAvant.racine) arbre = marquerCommentaire(arbre, arbre.chemin, commentaire);
    // Nulle par repetition (phase 17) : APRES un coup REEL seulement, jamais en
    // navigant (voir interface/nulle.js). La position est retenue comme refusee
    // tout de suite ; la question n'est posee qu'une fois l'affichage a jour.
    const repetition = repetitionAProposer(arbre);
    if (repetition) arbre = refuserNulle(arbre, repetition.position);
    deselectionner();
    actualiserAffichagePartie();
    actualiserBoutonsNavigation();
    synchroniserPendulesAvecEtat();
    sequence.actualiser(arbre);
    commentaires.actualiser(arbre);
    occurrences.actualiser(arbre);
    notifierChangement();
    if (repetition && nulleAutomatique()) {
      terminerPartie('D');
    } else if (repetition) {
      demanderConfirmation(
        `Position répétée ${repetition.occurrences} fois : déclarer la partie nulle ?`,
        () => terminerPartie('D'),
        'Accepter'
      );
    }
  }

  // Applique `transformation` a `arbre` (reculer, avancer, aller a un
  // noeud quelconque, ou meme supprimer un noeud — la suppression n'est
  // qu'une transformation de plus), puis reaffiche le plateau pour
  // correspondre au nouvel etat : un saut direct, pas une animation coup
  // par coup (voir rendu.synchroniserBilles : on peut sauter de plusieurs
  // coups a la fois, ex. |<< depuis la fin d'une longue partie, ou une
  // suppression qui fait reculer jusqu'au parent). N'applique aucune
  // securite de suppression elle-meme : l'appelant doit avoir deja
  // verifie moteur.peutSupprimerNoeud (les boutons grises/absents du
  // rendu le garantissent normalement).
  function naviguer(transformation) {
    deselectionner();
    arbre = transformation(arbre);
    synchroniserBilles(svg, etatCourant(arbre).plateau);
    synchroniserPendulesAvecEtat();
    actualiserAffichagePartie();
    actualiserBoutonsNavigation();
    sequence.actualiser(arbre);
    commentaires.actualiser(arbre);
    occurrences.actualiser(arbre);
    notifierChangement();
  }

  // Historique de NAVIGATION (phase 11bis) : appele par CHAQUE clic sur un
  // coup ailleurs dans l'arbre (Sequence, Commentaires, Occurrences, et le
  // clic sur "Depart" qui saute a la racine) — jamais par Precedent/Suivant/
  // Debut/Fin/Annuler, sequentiels et etrangers a cet historique (voir
  // moteur/historique-navigation.js).
  function sauterVersNoeud(chemin) {
    historiqueNavigation = enregistrerSaut(historiqueNavigation, arbre.chemin, chemin);
    naviguer((a) => allerAuNoeud(a, chemin));
    actualiserBoutonsHistoriqueNavigation();
  }

  // Un chemin de l'historique peut ne plus exister (la branche a ete
  // supprimee par "Annuler" depuis qu'elle a ete visitee) : on verifie avant
  // d'y sauter plutot que de laisser noeudA planter sur un index absent.
  function cheminExisteEncore(chemin) {
    let noeud = arbre.racine;
    for (const index of chemin) {
      noeud = noeud.enfants[index];
      if (!noeud) return false;
    }
    return true;
  }

  // Rejoue un deplacement dans l'historique (retour, avance ou origine) SANS
  // l'y enregistrer a nouveau — exactement `jump_to_node(target, record=False)`
  // dans KAAWA. Une branche disparue depuis remet simplement l'historique a
  // zero plutot que de planter : ce n'est qu'une commodite de navigation,
  // jamais une donnee de la partie a preserver a tout prix.
  function rejouerHistoriqueNavigation(deplacement) {
    const nouveau = deplacement(historiqueNavigation);
    if (nouveau === historiqueNavigation) return; // deja a la limite, rien a faire
    const chemin = cheminActuelHistorique(nouveau);
    if (!cheminExisteEncore(chemin)) {
      historiqueNavigation = creerHistoriqueNavigation();
    } else {
      historiqueNavigation = nouveau;
      naviguer((a) => allerAuNoeud(a, chemin));
    }
    actualiserBoutonsHistoriqueNavigation();
  }

  // Grise ce qui n'a nulle part ou aller : jamais seulement au survol
  // (CLAUDE.md), un telephone n'a pas de curseur.
  function actualiserBoutonsHistoriqueNavigation() {
    elementsHistoriqueNavigation.origine.disabled = historiqueNavigation.index <= 0;
    elementsHistoriqueNavigation.retour.disabled = historiqueNavigation.index <= 0;
    elementsHistoriqueNavigation.avance.disabled = historiqueNavigation.index >= historiqueNavigation.pile.length - 1;
  }

  elementsHistoriqueNavigation.origine.addEventListener('click', () => rejouerHistoriqueNavigation(origineHistorique));
  elementsHistoriqueNavigation.retour.addEventListener('click', () => rejouerHistoriqueNavigation(reculerHistorique));
  elementsHistoriqueNavigation.avance.addEventListener('click', () => rejouerHistoriqueNavigation(avancerHistorique));

  // Le noeud courant est-il le point VIVANT de la partie (une feuille qui
  // n'est ni gagnee par ejections ni perdue au temps) ? Si oui, le direct
  // reprend (ou continue) ; sinon (on parcourt l'historique, ou ce noeud
  // est definitif), la pendule affiche l'instantane fige de CE noeud —
  // voir l'en-tete du fichier.
  function estPointVivant() {
    const noeud = noeudCourant(arbre);
    return noeud.enfants.length === 0 && !noeud.etat.vainqueur && !noeud.statutFin;
  }

  // Une position ou l'on peut encore jouer : une feuille, ni gagnee, ni
  // close par une nulle ou un abandon — un temps ecoule (T) laisse jouer la
  // suite, en chrono.
  function estFeuilleJouable() {
    const noeud = noeudCourant(arbre);
    return noeud.enfants.length === 0 && !noeud.etat.vainqueur && !estStatutDefinitif(noeud.statutFin);
  }

  // Quelle horloge suivre ici (interface/pendules.js) : la pendule de la
  // partie au bout de la ligne reellement jouee tant que la partie n'est pas
  // finie, le chrono d'analyse sur toute autre position jouable, sinon
  // l'instantane du noeud.
  function synchroniserPendulesAvecEtat() {
    const noeud = noeudCourant(arbre);
    const auBoutDeLaPartie = cheminEgal(arbre.chemin, arbre.cheminOrigine) && finDeLaPartie(arbre) === null;
    const horloge = !estFeuilleJouable() ? null : auBoutDeLaPartie ? 'partie' : 'analyse';
    pendules.suivre(horloge, {
      instantane: noeud.pendulesSnapshot,
      cle: arbre.chemin.join('.'),
      joueurAuTrait: noeud.etat.joueurAuTrait,
      cumul: tempsCumules(arbre),
    });
  }

  // Met a jour le nom de chaque camp (tour/trait/resultat, voir
  // rendu.actualiserTrait) et les pistes d'ejection — tout ce que
  // #statut affichait avant d'etre retire (signale par saab, phase 12).
  function actualiserAffichagePartie() {
    const etat = etatCourant(arbre);
    // "Gagne :" ne s'affiche qu'en revenant exactement au noeud ou une
    // defaite au temps a eu lieu (voir l'en-tete du fichier) : plus loin
    // en analyse, seul etat.vainqueur (recalcule pour CE noeud) compte.
    // Une nulle acceptee (phase 17, 'D') n'a pas ce probleme : elle bloque
    // le jeu en avant sur son propre noeud (voir sansSuite plus bas), il
    // n'existe donc jamais de noeud "plus loin" ou elle pourrait s'afficher
    // a tort.
    const perteIci = perteAuTemps && cheminEgal(perteAuTemps.chemin, arbre.chemin);
    const gagnant = perteIci
      ? (perteAuTemps.camp === 'noir' ? 'blanc' : 'noir')
      : noeudCourant(arbre).statutFin === 'D'
        ? 'nul' // valeur speciale : rendu.actualiserTrait sait l'afficher aux DEUX camps a la fois
        : noeudCourant(arbre).statutFin === 'R'
          ? couleurAdverse(etat.joueurAuTrait) // abandon : celui qui a le trait renonce (moteur/sauvegarde.js)
          : etat.vainqueur;
    // Aucun camp n'est plus "au trait" une fois la partie terminee, d'une
    // facon ou d'une autre.
    const joueurAuTrait = gagnant ? null : etat.joueurAuTrait;
    // Abandon et nulle possibles seulement sur un point vivant qu'on peut encore
    // jouer, jamais dans l'analyse d'une partie finie ni sur une position
    // sans suite (puzzle perdu).
    abandonNulle.reinitialiser();
    signalerCampAuTrait(etat.joueurAuTrait);
    actualiserTrait(svg, joueurAuTrait, numeroDeTour(arbre.chemin.length), gagnant, estPointVivant() && !sansSuite(), optionsDeFinDisponibles(arbre) || optionARefaire());
    actualiserPistesEjection(svg, etat.billesEjecteesNoires, etat.billesEjecteesBlanches);
    // Coordonnees sur les billes du camp au trait (phase 19bis) : `null`
    // une fois la partie terminee, `.bille-null` ne correspond alors a
    // rien — voir rendu/coordonnees-jeu.js. Le reglage board.show_ball_coords
    // (phase 22) ne les construit pas differemment : il bascule une classe
    // CSS sur `svg` (interface/reglages.js), pour s'appliquer EN DIRECT sans
    // reconstruire quoi que ce soit ici.
    actualiserCoordonneesBilles(svg, joueurAuTrait);
    // Rond vert sur les billes selectionnables (saab, "logique du vert") :
    // toujours appele APRES actualiserCoordonneesBilles, jamais avant (voir
    // rendu/coordonnees-jeu.js) ; aucune selection n'est active a cet endroit
    // (deselectionner() a deja ete appele par tous les appelants de cette
    // fonction), d'ou le `null`.
    actualiserBillesSelectionnables(svg, joueurAuTrait);
    // Fleche du coup qui a mene A CE noeud precis (phase 19bis) — jamais
    // celle du dernier noeud de la branche : lue sur le noeud COURANT,
    // suit donc fidelement toute navigation dans l'historique. `undefined`
    // sur la racine (aucun coup n'y a mene) : rien n'est alors dessine.
    actualiserFlecheDernierCoup(svg, noeudCourant(arbre).flecheDernierCoup);
    // Phase 30 (saab) : les billes des perdants de la sequence regardee prennent
    // la taille d'un trou (moteur/bilan-sequence.js, rendu/plateau-svg.js).
    actualiserBillesDesPerdants(svg, perdantsDeLaSequence(arbre));
  }

  // Grise les boutons qui ne peuvent rien faire (deja au tout debut ou a
  // la toute fin), pour que ce soit visible sans avoir a cliquer pour le
  // decouvrir.
  function actualiserBoutonsNavigation() {
    const auDebut = arbre.chemin.length === 0;
    const alaFin = noeudCourant(arbre).enfants.length === 0;
    elementsNavigation.debut.disabled = auDebut;
    elementsNavigation.precedent.disabled = auDebut;
    // Annuler est destructif (voir plus haut) : grise aussi sur un coup
    // d'origine deja depasse, que la securite de moteur.peutSupprimerNoeud
    // interdirait de toute facon de supprimer.
    elementsNavigation.annuler.disabled = suppressionsInterdites || !peutSupprimerNoeud(arbre, arbre.chemin);
    for (const bouton of svg.querySelectorAll('.bouton-annuler-joueur')) bouton.classList.toggle('bouton-annuler-inactif', elementsNavigation.annuler.disabled);
    elementsNavigation.suivant.disabled = alaFin;
    elementsNavigation.fin.disabled = alaFin;
    elementsNavigation.lecture.disabled = alaFin;
  }

  // Joue un coup ecrit en notation Nacre (ex. "a1d4") plutot que par des
  // clics — utilise par le panneau Conseils (phase 15, interface/next-
  // move.js) pour appliquer un coup suggere. Repasse par exactement le
  // meme jouerCoup que la saisie normale (une regle du jeu n'est jamais
  // ecrite a deux endroits) : lireCoupNacre traduit le texte en groupe de
  // billes reel, a partir du plateau ACTUEL (jamais de la position
  // canonique de la base — voir moteur/next-move.js, qui a deja fait ce
  // travail de retraduction).
  function jouerCoupTexte(texteNacre, reflexionIA, commentaire) {
    const etat = etatCourant(arbre);
    if (etat.vainqueur || estStatutDefinitif(noeudCourant(arbre).statutFin)) return; // meme garde que gererClic : position definitive
    // Meme garde de pause que le clic sur le plateau, plus haut : trouve en
    // verifiant les correctifs de cette serie — le plateau refusait bien
    // tout coup pendant la pause (et avant le premier clic sur une pendule,
    // ou la partie est encore inerte), mais le panneau Conseils, lui, en
    // jouait encore un. Une pause qui masque le plateau doit masquer TOUS
    // les chemins vers un coup, pas seulement celui qu'on voit.
    if (jeuSuspendu()) return;
    if (sansSuite()) return; // meme garde que gererClic, voir plus bas
    const coup = lireCoupNacre(couleursDuPlateau(etat.plateau), etat.joueurAuTrait, texteNacre);
    if (coup) jouerCoup(coup, reflexionIA, commentaire);
  }

  return {
    obtenirArbre: () => arbre,
    definirPositionSansSuite: (predicat) => {
      sansSuite = predicat;
      actualiserAffichagePartie(); // abandon et nulle n'ont pas de sens sur une position sans suite
    },
    // Voir marquerStatutFin/notifierChangement plus haut : une defaite au
    // temps ne laisse aucune trace dans `etat`, c'est le seul endroit ou
    // ce renseignement existe (utile a l'export, voir index.html).
    obtenirPerteAuTemps: () => perteAuTemps,
    // Le compteur EN DIRECT de chaque camp, pour que index.html puisse le
    // sauvegarder a chaque coup (et juste avant que la page se cache,
    // voir index.html) — c'est ce que `pendulesReprises` ci-dessus relit
    // au prochain demarrage.
    obtenirPendulesActuelles: () => pendules.penduleDeLaPartie(),
    // Change de mode de pendule EN COURS DE PARTIE (phase 22bis, bouton
    // dedie de la colonne de gauche) : voir interface/pendules.js,
    // changerMode. Renvoie si le changement A EU LIEU (refuse pendant un
    // apercu ou une partie finie), pour que l'appelant sache s'il doit
    // fermer son popup ou avertir que ce n'etait pas le bon moment.
    changerModePendule: (nouveauxReglages) => {
      const applique = pendules.changerMode(nouveauxReglages);
      if (applique) notifierChangement();
      return applique;
    },
    jouerCoupTexte,
    // Aller a un coup, comme un clic dans la Sequence (Reflexion IA, interface/reflexion-ia.js).
    sauterVersNoeud,
    // Adversaire artificiel (phase 29, interface/ia.js) : un coup peut-il etre
    // joue LA, maintenant ? Une feuille jouable (jamais en parcourant
    // l'historique) — y compris une branche, ou la suite d'une partie perdue
    // au temps (phase 30, saab) —, ni en pause, ni sans suite : les memes
    // gardes que jouerCoupTexte, pour que la machine ne reflechisse pas pour rien.
    peutJouerUnCoup: () => estFeuilleJouable() && !jeuSuspendu() && !sansSuite(),
    // Une position deja jouee (des coups en partent), pas finie : la machine
    // peut y dire ce qu'elle aurait joue (interface/ia.js, saab 2026-09-30).
    peutEnvisagerUnCoup: () => {
      const noeud = noeudCourant(arbre);
      return noeud.enfants.length > 0 && !noeud.etat.vainqueur && !estStatutDefinitif(noeud.statutFin) && !jeuSuspendu() && !sansSuite();
    },
    // Le temps arrete sans afficher de pause (boite du nom ouverte contre la
    // machine, interface/ia.js).
    suspendreLeTemps: (oui) => pendules.suspendre(oui),
    // Une ligne de plus au commentaire d'un coup (une suggestion de la machine,
    // interface/ia.js).
    ajouterAuCommentaire: (chemin, ligne) => {
      const existant = noeudA(arbre, chemin).commentaire;
      arbre = marquerCommentaire(arbre, chemin, existant ? `${existant}\n${ligne}` : ligne);
      commentaires.actualiser(arbre);
      notifierChangement();
    },
    definirAnnulationEnDouble: (predicat) => {
      annulationEnDouble = predicat;
    },
    definirPauseSansRideau: (predicat) => {
      pauseSansRideau = predicat;
    },
    definirNulleAutomatique: (predicat) => {
      nulleAutomatique = predicat;
    },
    definirOptionARefaire: (predicat) => {
      optionARefaire = predicat;
      actualiserAffichagePartie();
    },
    // Correspondance (phase 24, index.html) : voir jeuSuspendu, finDemandee et
    // terminerPartie plus haut.
    ignorerLaPause: () => {
      pauseIgnoree = true;
    },
    definirFinDemandee: (rappel) => {
      finDemandee = rappel;
    },
    interdireLesSuppressions: () => {
      suppressionsInterdites = true;
      actualiserBoutonsNavigation();
    },
    // Correspondance (phase 24) et Permutations (phase 25, interface/permutations.js) :
    // afficher momentanement une position quelconque, texte compressee
    // (moteur/notation.lirePosition), puis revenir a la partie reelle.
    demarrerApercuPermutation: (texteDePosition) => {
      const etat = lirePosition(texteDePosition);
      deselectionner();
      apercuPermutationActif = true;
      synchroniserBilles(svg, etat.plateau);
      actualiserPistesEjection(svg, etat.billesEjecteesNoires, etat.billesEjecteesBlanches);
      actualiserCoordonneesBilles(svg, null);
      actualiserBillesSelectionnables(svg, null);
      actualiserFlecheDernierCoup(svg, undefined);
    },
    terminerApercuPermutation: () => {
      apercuPermutationActif = false;
      synchroniserBilles(svg, etatCourant(arbre).plateau);
      actualiserAffichagePartie();
    },
    terminer: terminerPartie,
  };
}
