// Traductions entre l'arbre KAAH (moteur/arbre.js) et le format de fichier
// de sauvegarde de KAAWA (Tree/Date/Event/Players/Winner/Eject/Term/Timer).
// PHASE DELICATE au meme titre que moteur/notation.js : verifie contre le
// vrai code source de KAAWA (kaa_engine_ClO_Co.py,
// save_game_sequence_to_file et la construction de `new_node`) et contre
// de vrais fichiers de partie (donnees/partie_kaawa_branches_temoin.json,
// copie telle quelle de game_my/Br_2609120343...json), pas devine.
//
// Champs de KAAWA volontairement OMIS DU FICHIER ici, decision documentee :
// `move_Arrows`, `expanded`. Ce sont des details d'affichage
// internes a KAAWA (replis de l'arbre pre-ouverts...) — verifie dans son
// code source que CHAQUE lecture de ces champs passe par
// `.get(cle, valeur_par_defaut)`, jamais un acces direct qui ferait
// planter le chargement d'un fichier qui ne les contient pas. Absents
// aussi de la liste des champs a verifier par PLAN.md (Phase 12) : Date,
// Event, Players, Winner, Eject, Term, Timer. Un fichier ecrit par KAAH se
// charge donc normalement dans KAAWA, juste sans replis pre-ouverts.
//
// `last_move_info` (la fleche du dernier coup, phase 19bis) suit la MEME
// philosophie que la position ou l'etat de la partie : jamais stockee telle
// quelle dans le fichier, RECALCULEE a chaque relecture par rejouerEnfants
// (moteur.informationFlecheDernierCoup, a partir du COUP rejoue, deja
// disponible a cet endroit) — jamais dupliquer une regle de jeu (CLAUDE.md).
// Un fichier ecrit par KAAH n'ecrit donc pas non plus ce champ.
//
// Le temps de chaque coup (phase 30, saab) : `clock_mode` (le mode de la
// pendule a ce coup, ecrit par KAAWA lui-meme), `time` (la duree du coup,
// arrondie au dixieme — KAAWA relit ce champ, sync_tree_to_legacy_lists, sans
// jamais l'ecrire) et `Timer.durations` (celles de la ligne reellement jouee,
// comme KAAWA). Sur un vrai fichier KAAWA, un noeud sans `clock_mode` a le mode
// que KAAWA lui donne (pendule sur l'origine, chrono sinon), et un noeud chrono
// sans `time` a pour duree le temps de celui qui a joue (KAAWA y ecrit la duree
// du coup).
//
// La fin de la partie (Term, Winner, Eject, titre) est la PREMIERE fin de la
// ligne reellement jouee (moteur/arbre.js, finDeLaPartie) : apres un temps
// ecoule, la suite prolonge cette ligne en chrono sans changer le resultat.
//
// Champ AJOUTE par KAAH, absent des vrais fichiers KAAWA : `NullesRefusees`
// (phase 17, les positions refusees par repetition — voir moteur/arbre.js,
// refuserNulle). Un vrai fichier KAAWA n'en a jamais, `donneesVersArbre`
// le lit donc avec `?? []` ; un fichier ecrit par KAAH et rouvert dans
// KAAWA verrait juste un champ racine de plus, jamais lu, sans consequence
// (meme principe que les champs KAAWA volontairement omis ci-dessus, dans
// l'autre sens).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lirePosition,
// ecrirePosition, creerArbre, remplacerNoeud, jouerDansArbre,
// marquerStatutFin, marquerPendulesSnapshot, marquerCommentaire, marquerReflexionIA,
// couleurAdverse (moteur/regles.js),
// marquerFlecheDernierCoup, noeudA, cheminsEgaux,
// lireCoupNacre, ecrireCoupNacreSansAmbiguite, coupsDesignesPar
// (moteur/notation.js et moteur/arbre.js),
// appliquerCoup, couleursDuPlateau (moteur/partie.js) et
// informationFlecheDernierCoup (moteur/fleche-dernier-coup.js) viennent
// tous des fichiers charges avant celui-ci dans index.html.

// ---------------------------------------------------------------------
// Arbre KAAH -> donnees KAAWA
// ---------------------------------------------------------------------

function nomDuJoueur(camp, joueurs) {
  return camp === 'noir' ? joueurs.noir : joueurs.blanc;
}

// Le nom du vainqueur pour CE noeud precis, ou "None" si la partie n'y
// est pas terminee.
// `noeud.vainqueurConnu` (pose par donneesVersArbre, voir plus bas)
// l'emporte sur tout le reste : un noeud importe avec un statut que KAAH
// ne sait pas produire lui-meme ("M", echec d'un puzzle, phase 16) n'a aucun
// moyen de RE-deriver son vainqueur depuis l'etat ou depuis une defaite
// au temps suivie en direct : le nom lu dans le fichier est alors la
// SEULE source de verite, a restituer tel quel plutot qu'a deviner.
// (L'abandon "R" se re-derive, lui, depuis le joueur au trait : voir plus bas.)
// Sinon (un noeud que KAAH a lui-meme fait naitre), deux cas : une
// victoire par ejections se lit directement sur l'etat (etat.vainqueur) ;
// une defaite au temps n'y laisse aucune trace (ce n'est pas une regle du
// moteur, voir interface/saisie.js), d'ou `finDePartie` : le seul
// renseignement que l'interface doit fournir en plus de l'arbre lui-meme.
function ecrireVainqueur(noeud, chemin, finDePartie, joueurs) {
  if (noeud.vainqueurConnu !== undefined) return noeud.vainqueurConnu;
  if (noeud.etat.vainqueur) return nomDuJoueur(noeud.etat.vainqueur, joueurs);
  // Abandon (statut "R") ou temps ecoule ("T") : perd celui qui a le trait sur
  // ce noeud (KAAWA, action_resign ; sa pendule tournait), l'autre camp gagne.
  if (noeud.statutFin === 'R' || noeud.statutFin === 'T') return nomDuJoueur(couleurAdverse(noeud.etat.joueurAuTrait), joueurs);
  if (finDePartie && cheminsEgaux(finDePartie.chemin, chemin)) {
    const gagnant = finDePartie.camp === 'noir' ? 'blanc' : 'noir';
    return nomDuJoueur(gagnant, joueurs);
  }
  return 'None';
}

// La duree d'un coup telle que KAAWA l'ecrit : arrondie au dixieme de seconde.
const DIXIEMES_PAR_SECONDE = 10;
function dureeArrondie(secondes) {
  return Math.round(secondes * DIXIEMES_PAR_SECONDE) / DIXIEMES_PAR_SECONDE;
}

function noeudVersDonnees(noeud, chemin, metadonnees) {
  const estRacine = chemin.length === 0;
  const donnees = {
    nacre: estRacine ? 'START' : noeud.coup,
    index: chemin.length,
    children: noeud.enfants.map((enfant, index) => noeudVersDonnees(enfant, [...chemin, index], metadonnees)),
    // La racine est toujours is_origin (elle represente la position de
    // depart, jamais un coup joue) — verifie sur un vrai fichier KAAWA,
    // dont la racine porte toujours "is_origin":true elle aussi.
    is_origin: estRacine ? true : Boolean(noeud.estOrigine),
    pos: ecrirePosition(noeud.etat),
    eject_b: noeud.etat.billesEjecteesNoires,
    eject_w: noeud.etat.billesEjecteesBlanches,
    // Phase 18 : un commentaire libre par coup (moteur.marquerCommentaire).
    // KAAWA ecrit toujours ce champ, meme vide — jamais absent.
    comment: noeud.commentaire ?? '',
    date: '',
  };

  if (estRacine) {
    // KAAWA appelle ce champ "clock" seulement sur la racine (le temps de
    // depart), jamais "p1_time"/"p2_time" comme sur les autres noeuds.
    donnees.clock = noeud.pendulesSnapshot
      ? [noeud.pendulesSnapshot.tempsNoir, noeud.pendulesSnapshot.tempsBlanc]
      : [metadonnees.reglagesPendules.tempsInitial, metadonnees.reglagesPendules.tempsInitial];
  } else if (noeud.pendulesSnapshot) {
    donnees.p1_time = noeud.pendulesSnapshot.tempsNoir;
    donnees.p2_time = noeud.pendulesSnapshot.tempsBlanc;
    if (noeud.pendulesSnapshot.mode) donnees.clock_mode = noeud.pendulesSnapshot.mode;
    if (typeof noeud.pendulesSnapshot.dureeDernierCoup === 'number') donnees.time = dureeArrondie(noeud.pendulesSnapshot.dureeDernierCoup);
  }

  // Phase 32 : ce que la machine a pense de ce coup (champ propre a KAAH).
  if (noeud.reflexionIA) donnees.ia = noeud.reflexionIA;

  if (noeud.statutFin) {
    donnees.term_status = noeud.statutFin;
    donnees.winner = ecrireVainqueur(noeud, chemin, metadonnees.finDePartie, metadonnees.joueurs);
  }

  return donnees;
}

// Construit l'objet JS a ecrire tel quel en JSON (voir interface/, qui
// s'occupe seul de JSON.stringify et du telechargement — ce fichier ne
// touche jamais au DOM ni aux fichiers).
// `metadonnees` : { date, event, variantName, joueurs: { noir, blanc },
// reglagesPendules (voir moteur.creerPendules), finDePartie: null |
// { chemin, camp } (le camp qui a perdu au temps, voir l'en-tete du
// fichier), pendulesActuelles (l'instantane en direct, pour Chrono) }.
function arbreVersDonnees(arbre, metadonnees) {
  const cheminResultat = finDeLaPartie(arbre) ?? arbre.cheminOrigine;
  const origine = noeudA(arbre, cheminResultat);
  const statutOrigine = origine.statutFin ?? '_';
  const durees = [];
  let noeudOrigine = arbre.racine;
  for (const index of arbre.cheminOrigine) {
    noeudOrigine = noeudOrigine.enfants[index];
    durees.push(dureeArrondie(noeudOrigine.pendulesSnapshot?.dureeDernierCoup ?? 0));
  }
  const pendulesActuelles = metadonnees.pendulesActuelles ?? { tempsNoir: 0, tempsBlanc: 0 };

  return {
    Date: metadonnees.date,
    Event: metadonnees.event,
    VariantName: metadonnees.variantName,
    Players: { P1_black: metadonnees.joueurs.noir, P2_white: metadonnees.joueurs.blanc },
    History: [ecrirePosition(arbre.racine.etat)],
    Tree: noeudVersDonnees(arbre.racine, [], metadonnees),
    Winner: statutOrigine === '_' ? 'None' : ecrireVainqueur(origine, cheminResultat, metadonnees.finDePartie, metadonnees.joueurs),
    Eject: { P1: origine.etat.billesEjecteesNoires, P2: origine.etat.billesEjecteesBlanches },
    Term: statutOrigine,
    Timer: {
      mode: metadonnees.reglagesPendules.mode,
      // Jamais relu par le chargeur de KAAWA (verifie : seul Timer.settings
      // l'est) ; la duree de chaque coup de la ligne reellement jouee, comme
      // KAAWA l'ecrit (phase 30).
      durations: durees,
      settings: {
        p1_initial: metadonnees.reglagesPendules.tempsInitial,
        p2_initial: metadonnees.reglagesPendules.tempsInitial,
        p1_bonus: metadonnees.reglagesPendules.bonusParCoup ?? 0,
        p2_bonus: metadonnees.reglagesPendules.bonusParCoup ?? 0,
        p1_bonus_eject: metadonnees.reglagesPendules.bonusParEjection ?? 0,
        p2_bonus_eject: metadonnees.reglagesPendules.bonusParEjection ?? 0,
      },
    },
    Chrono: { total_p1_remaining: pendulesActuelles.tempsNoir, total_p2_remaining: pendulesActuelles.tempsBlanc },
    NullesRefusees: arbre.nullesRefusees,
    // Champ propre a KAAH (comme NullesRefusees, KAAWA l'ignore) : la Revanche en
    // face-a-face retourne le plateau de 180 degres (moteur/revanche.js).
    PlateauRetourne: metadonnees.plateauRetourne ?? false,
    // Partie de correspondance (phase 24, moteur/correspondance.js) : les trois
    // champs que KAAWA ajoute lui-meme a ses fichiers (save_game_sequence_to_file),
    // pour qu'une telle partie se reconnaisse dans les deux applications.
    ...(metadonnees.correspondance
      ? {
          corr_mode: true,
          corr_black_name: metadonnees.correspondance.nomNoir,
          corr_white_name: metadonnees.correspondance.nomBlanc,
        }
      : {}),
    // Partie contre la machine (phases 29 et 32, moteur/ia.js) : champ propre a
    // KAAH (KAAWA l'ignore), tous les reglages de chaque machine { noir, blanc }
    // (saab : pour comparer ensuite), ecrit seulement dans ce cas — une partie
    // entre humains garde exactement le fichier d'avant. L'ancien champ
    // Adversaire (phase 29) se relit toujours (moteur/ia.js, lireMachines).
    ...(metadonnees.machines ? { Machines: metadonnees.machines } : {}),
    // Copie d'essai des poids IA (saab, 2026-10-01) : champ propre a KAAH, qui
    // donne le prefixe Es_ du titre (moteur/nom-partie.js).
    // Elle se rouvre sur la position regardee, pas au bout de la ligne jouee
    // comme KAAWA (saab : le coup essaye est souvent dans une branche, et la
    // copie semblait une autre partie).
    ...(metadonnees.essai ? { Essai: true, CheminRegarde: arbre.chemin } : {}),
    // Partie recue (saab, 2026-10-06) : champ propre a KAAH, le prefixe de son
    // expediteur, tout devant le titre (moteur/nom-partie.js).
    ...(metadonnees.prefixe ? { Prefixe: metadonnees.prefixe } : {}),
  };
}

// Le chemin `CheminRegarde` d'une partie d'essai, s'il mene bien a un noeud
// de l'arbre relu ; sinon null.
function cheminRegardeValide(arbre, chemin) {
  if (!Array.isArray(chemin)) return null;
  let noeud = arbre.racine;
  for (const index of chemin) {
    noeud = Number.isInteger(index) ? noeud.enfants[index] : undefined;
    if (!noeud) return null;
  }
  return chemin;
}

// ---------------------------------------------------------------------
// Donnees KAAWA -> arbre KAAH
// ---------------------------------------------------------------------

// Remplace `estOrigine` sur le noeud designe (l'origine vient du fichier
// lui-meme, `is_origin` : jouerDansArbre la deduirait autrement de l'ordre
// de rejeu, correct dans l'immense majorite des cas mais pas garanti si
// un fichier a ete modifie a la main).
function fixerOrigine(arbre, chemin, estOrigine) {
  const racine = remplacerNoeud(arbre.racine, chemin, (noeud) => ({ ...noeud, estOrigine }));
  return { ...arbre, racine };
}

// La ligne reellement jouee du fichier jusqu'a la FIN DE LA PARTIE (premier
// `term_status`), jamais au-dela : c'est elle que compte le titre (tours,
// moteur/nom-partie.js), meme quand la suite a ete jouee apres un temps ecoule.
function cheminPartieDuFichier(donneesRacine) {
  const chemin = [];
  let noeud = donneesRacine;
  for (;;) {
    if (noeud.term_status && noeud.term_status !== '_') return chemin;
    const index = (noeud.children ?? []).findIndex((enfant) => enfant.is_origin);
    if (index === -1) return chemin;
    chemin.push(index);
    noeud = noeud.children[index];
  }
}

// Le chemin qui suit `is_origin` a chaque etage, depuis la racine —
// PAS force au premier enfant : rien ne garantit qu'un fichier range
// toujours l'origine en premiere position (voir fixerOrigine).
function cheminOrigineDuFichier(donneesRacine) {
  const chemin = [];
  let noeud = donneesRacine;
  for (;;) {
    const index = (noeud.children ?? []).findIndex((enfant) => enfant.is_origin);
    if (index === -1) return chemin;
    chemin.push(index);
    noeud = noeud.children[index];
  }
}

// Un texte Nacre peut designer deux coups (le plus petit groupe gagne, voir
// moteur/notation.js) : KAAWA, et KAAH avant ecrireCoupNacreSansAmbiguite,
// ecrivent ainsi "d3c1" un glissement a 3 billes que la relecture donne a 2.
// KAAWA ne relit jamais ce texte : il reprend la position `pos` enregistree
// avec le coup. C'est donc elle qui tranche ici entre les coups possibles —
// sans jamais remplacer le rejeu par le moteur.
function lireCoupDuFichier(etatParent, texte, positionEnregistree) {
  const plateau = couleursDuPlateau(etatParent.plateau);
  const coup = lireCoupNacre(plateau, etatParent.joueurAuTrait, texte);
  if (!coup || typeof positionEnregistree !== 'string') return coup;

  const donneLaPosition = (candidat) => ecrirePosition(appliquerCoup(etatParent, candidat).etat) === positionEnregistree;
  if (donneLaPosition(coup)) return coup;
  return coupsDesignesPar(plateau, etatParent.joueurAuTrait, texte).find(donneLaPosition) ?? coup;
}

// Rejoue recursivement les enfants de `donneesNoeud` (donnees KAAWA)
// depuis `chemin` (deja positionne sur son parent dans `arbre`) : chaque
// coup passe par le moteur (lireCoupNacre + appliquerCoup), exactement
// comme le ferait un vrai joueur — jamais de position ou de compteur
// d'ejection lus directement dans le fichier, pour ne jamais dupliquer de
// regle de jeu (voir CLAUDE.md).
function rejouerEnfants(arbre, chemin, enfantsDonnees) {
  for (const enfantDonnees of enfantsDonnees) {
    arbre = { ...arbre, chemin };
    const etatParent = etatCourant(arbre);
    const coup = lireCoupDuFichier(etatParent, enfantDonnees.nacre, enfantDonnees.pos);
    if (!coup) throw new Error(`Coup illisible dans le fichier : "${enfantDonnees.nacre}"`);

    const resultat = appliquerCoup(etatParent, coup);
    const texte = ecrireCoupNacreSansAmbiguite(couleursDuPlateau(etatParent.plateau), etatParent.joueurAuTrait, coup);
    arbre = jouerDansArbre(arbre, texte, resultat.etat);
    const cheminEnfant = arbre.chemin;

    arbre = fixerOrigine(arbre, cheminEnfant, Boolean(enfantDonnees.is_origin));
    // Phase 19bis : jamais lue dans le fichier, voir l'en-tete du fichier.
    arbre = marquerFlecheDernierCoup(arbre, cheminEnfant, informationFlecheDernierCoup(coup));

    if (typeof enfantDonnees.p1_time === 'number') {
      // Voir l'en-tete du fichier pour un vrai fichier KAAWA (sans clock_mode ni time).
      const mode = enfantDonnees.clock_mode ?? (enfantDonnees.is_origin ? 'pendule' : 'chrono');
      const tempsDuJoueur = etatParent.joueurAuTrait === 'noir' ? enfantDonnees.p1_time : enfantDonnees.p2_time;
      arbre = marquerPendulesSnapshot(arbre, cheminEnfant, {
        tempsNoir: enfantDonnees.p1_time,
        tempsBlanc: enfantDonnees.p2_time,
        mode,
        dureeDernierCoup: typeof enfantDonnees.time === 'number' ? enfantDonnees.time : mode === 'chrono' ? tempsDuJoueur : 0,
      });
    }

    // Phase 18 : un commentaire non vide seulement — jamais ecraser un
    // noeud par une chaine vide qui ne veut rien dire de plus que son
    // absence (meme discipline que term_status juste en dessous).
    if (enfantDonnees.comment) {
      arbre = marquerCommentaire(arbre, cheminEnfant, enfantDonnees.comment);
    }
    if (enfantDonnees.ia && typeof enfantDonnees.ia === 'object') {
      arbre = marquerReflexionIA(arbre, cheminEnfant, enfantDonnees.ia);
    }

    if (enfantDonnees.term_status) {
      arbre = marquerStatutFin(arbre, cheminEnfant, enfantDonnees.term_status);
      // Voir ecrireVainqueur : conserve le nom tel quel, pour un statut
      // ("R", abandon...) que KAAH ne sait pas re-deriver lui-meme.
      arbre = {
        ...arbre,
        racine: remplacerNoeud(arbre.racine, cheminEnfant, (n) => ({ ...n, vainqueurConnu: enfantDonnees.winner ?? 'None' })),
      };
    }

    arbre = rejouerEnfants(arbre, cheminEnfant, enfantDonnees.children ?? []);
  }
  return arbre;
}

// Reconstruit un arbre KAAH complet a partir de `donnees` (l'objet lu
// depuis un fichier JSON, KAAWA comme KAAH). Lance une erreur explicite
// si un coup du fichier est illisible, plutot que de construire un arbre
// a moitie faux en silence.
function donneesVersArbre(donnees) {
  const etatDepart = lirePosition(donnees.Tree.pos);
  let arbre = creerArbre(etatDepart);

  // Phase 18 : le commentaire de la racine (le champ START, voir
  // kaa_engine_ClO_Co.py) n'est pas un ENFANT rejoue par rejouerEnfants
  // plus bas — a lire ici, a part, une seule fois.
  if (donnees.Tree.comment) {
    arbre = marquerCommentaire(arbre, [], donnees.Tree.comment);
  }

  if (typeof donnees.Tree.clock?.[0] === 'number') {
    arbre = marquerPendulesSnapshot(arbre, [], {
      tempsNoir: donnees.Tree.clock[0],
      tempsBlanc: donnees.Tree.clock[1],
      mode: 'pendule',
    });
  }

  // Un temps ecoule avant le premier coup : la fin de la partie est la racine.
  if (donnees.Tree.term_status && donnees.Tree.term_status !== '_') {
    arbre = marquerStatutFin(arbre, [], donnees.Tree.term_status);
  }

  arbre = rejouerEnfants(arbre, [], donnees.Tree.children ?? []);
  // KAAWA saute au bout de l'origine en chargeant un fichier
  // (_get_last_origin_node), pas a la racine : meme comportement ici — sauf
  // une partie d'essai, qui reprend la position regardee (arbreVersDonnees).
  const cheminOrigine = cheminOrigineDuFichier(donnees.Tree);
  arbre = {
    ...arbre,
    chemin: cheminRegardeValide(arbre, donnees.CheminRegarde) ?? cheminOrigine,
    cheminOrigine,
    // Absent d'un vrai fichier KAAWA (voir l'en-tete du fichier) : []
    // dans ce cas, jamais une erreur de chargement pour autant.
    nullesRefusees: Array.isArray(donnees.NullesRefusees) ? donnees.NullesRefusees : [],
  };
  return arbre;
}
