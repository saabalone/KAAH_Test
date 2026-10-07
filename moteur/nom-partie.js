// Le "nom" d'une partie (deja convertie au format KAAWA, voir
// moteur/sauvegarde.js), EXACTEMENT comme le nom de fichier que KAAWA
// lui-meme lui donnerait (kaa_engine_ClO_Co.py, save_game_sequence_to_
// file) — saab a demande explicitement de reprendre cette convention
// telle quelle plutot que d'en inventer une autre, ce que le premier
// essai de cette phase avait fait a tort.
//
// Verifie caractere pres contre un vrai fichier KAAWA
// (donnees/partie_kaawa_Br_2608172039_temoin.json, voir
// tests/sauvegarde.test.js) : le nom reel de ce fichier est
// "Br_2608172039, Amical, Marguerite Belge, Player_1-Player_2, -0-0tr2
// Player_2, R", prefixe "Br_" et tout — KAAH y ecrit seulement le vainqueur
// en une lettre ("... -0-0tr2 y, R", voir codeDuVainqueur). Ce titre n'est
// qu'affiche : il ne nomme aucun fichier exporte.
//
// Separe de moteur/sauvegarde.js (deja au-dela des ~200 lignes de
// CLAUDE.md) : ce fichier ne fait QUE deriver un texte d'affichage a
// partir de donnees deja construites, jamais l'inverse.
//
// Pas d'import ni d'export (voir moteur/plateau.js) :
// cheminPartieDuFichier vient de moteur/sauvegarde.js, charge avant
// celui-ci dans index.html.

// Vrai si l'arbre contient la moindre branche (un noeud ailleurs que sur
// la ligne reellement jouee) — n'importe ou, pas seulement au premier
// niveau. KAAWA en deduit son prefixe "Br_" (voir nomDeFichierKAAWA).
function possedeUneBranche(noeudDonnees) {
  return (noeudDonnees.children ?? []).some((enfant) => enfant.is_origin === false || possedeUneBranche(enfant));
}

// Meme nettoyage que KAAWA sur un nom de joueur avant de l'inserer dans
// le nom de la partie (kaa_engine_ClO_Co.py, `get_clean` :
// `re.sub(r'\(.*?\)\s*', '', str(n)).strip().replace(' ', '_')`) : retire
// tout texte entre parentheses, puis remplace les espaces par des
// underscores.
function nomJoueurNettoye(nom) {
  return String(nom).replace(/\([^)]*\)\s*/g, '').trim().replace(/ /g, '_');
}

// Ce qu'un joueur a le droit de taper comme nom (saab : lettres A-Z a-z,
// chiffres 0-9 et "_", rien d'autre) : le nom finit dans le titre de la
// partie, ou "-" separe les deux joueurs et "," les elements (voir plus bas).
// Plutot que refuser, on corrige : un espace (ou plusieurs) devient un seul
// "_", une lettre accentuee perd son accent, tout autre signe disparait — sauf
// « + » (saab, 2026-09-30 : la machine en C++ s'appelle KAI++), qui ne decoupe
// pas le titre.
function nomJoueurAutorise(saisie) {
  return String(saisie)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_+]/g, '');
}

// Les elements du titre "Br_2608172039, Amical, Marguerite Belge,
// Player_1-Player_2, -0-0tr2 Player_2, R", dans cet ordre, lus dans les
// donnees — ce que nomDeFichierKAAWA assemble, et ce que les filtres de Mes
// parties comparent (moteur/filtre-parties.js), sans jamais decouper le texte
// (un nom de puzzle contient lui-meme des virgules). Toutes les informations
// sont deja dans `donnees` (les champs de haut niveau ecrits par
// moteur.arbreVersDonnees) : pas besoin de rejouer la partie, seulement de
// suivre `is_origin` jusqu'a la fin de la partie (moteur.cheminPartieDuFichier,
// phase 30 : jamais la suite jouee apres un temps ecoule) pour connaitre sa
// profondeur — le numero de tour de KAAWA
// (`display_turn = (history_index+1)//2`). Vainqueur : voir codeDuVainqueur.

// Le vainqueur dans le titre en une lettre (saab, 2026-10-01 : le nom du
// joueur rendait le titre trop long) : x Noir, n Nulle, y Blanc. Seule
// difference avec le nom de fichier de KAAWA, qui ecrit le nom ; le fichier,
// lui, garde le nom dans Winner. Tant que la partie n'est pas finie,
// "(en cours)" comme KAAWA.
const CODES_DU_VAINQUEUR = Object.freeze({ noir: 'x', nulle: 'n', blanc: 'y' });
const STATUT_NULLE = 'D';
const PAS_DE_VAINQUEUR = 'None';

// Le camp se retrouve par le nom des joueurs. Deux joueurs du meme nom (deux
// machines identiques, saab 2026-10-05 : « il ne faut pas remettre le profil
// du gagnant ») : par le score — 6 billes d'un camp ejectees —, sinon, pour un
// abandon ou un temps ecoule, par le trait : perd celui qui a le trait au bout
// de la partie (Noir joue toujours en premier : la parite des coups joues).
// Rien ne le dit : « ? », jamais le nom.
const BILLES_EJECTEES_POUR_GAGNER = 6; // EJECTIONS_POUR_GAGNER (moteur/partie.js), meme avec handicap
const STATUTS_PERDUS_PAR_LE_TRAIT = ['R', 'T'];
const VAINQUEUR_INCONNU = '?';

function codeDuVainqueur(donnees, coupsJoues) {
  if (donnees.Term === STATUT_NULLE) return CODES_DU_VAINQUEUR.nulle;
  if (!donnees.Winner || donnees.Winner === PAS_DE_VAINQUEUR) return '(en cours)';
  const noir = donnees.Winner === donnees.Players.P1_black;
  const blanc = donnees.Winner === donnees.Players.P2_white;
  if (noir !== blanc) return noir ? CODES_DU_VAINQUEUR.noir : CODES_DU_VAINQUEUR.blanc;
  if (donnees.Eject?.P2 >= BILLES_EJECTEES_POUR_GAGNER) return CODES_DU_VAINQUEUR.noir;
  if (donnees.Eject?.P1 >= BILLES_EJECTEES_POUR_GAGNER) return CODES_DU_VAINQUEUR.blanc;
  if (STATUTS_PERDUS_PAR_LE_TRAIT.includes(donnees.Term)) return coupsJoues % 2 === 0 ? CODES_DU_VAINQUEUR.blanc : CODES_DU_VAINQUEUR.noir;
  return VAINQUEUR_INCONNU;
}

function elementsDuTitre(donnees) {
  const profondeurOrigine = cheminPartieDuFichier(donnees.Tree).length;
  const joueurNoir = nomJoueurNettoye(donnees.Players.P1_black);
  const joueurBlanc = nomJoueurNettoye(donnees.Players.P2_white);
  return {
    // Partie recue : le prefixe de son expediteur (saab, 2026-10-06), nettoye
    // comme un nom de joueur — jamais de « , » qui decouperait le titre.
    prefixe: typeof donnees.Prefixe === 'string' ? nomJoueurAutorise(donnees.Prefixe) : '',
    branches: possedeUneBranche(donnees.Tree),
    essai: donnees.Essai === true,
    date: String(donnees.Date),
    evenement: String(donnees.Event),
    variante: String(donnees.VariantName),
    joueurs: `${joueurNoir}-${joueurBlanc}`,
    joueurNoir,
    joueurBlanc,
    score: `-${donnees.Eject.P1}-${donnees.Eject.P2}`,
    tours: Math.max(1, Math.floor((profondeurOrigine + 1) / 2)),
    vainqueur: codeDuVainqueur(donnees, profondeurOrigine),
    // Pour le filtre de Mes parties : chercher aussi par le nom.
    nomDuVainqueur: donnees.Winner && donnees.Winner !== PAS_DE_VAINQUEUR ? String(donnees.Winner) : '',
    statut: String(donnees.Term),
  };
}

// Le nom complet d'une partie — voir l'en-tete du fichier.
function nomDeFichierKAAWA(donnees) {
  const e = elementsDuTitre(donnees);
  const base = `${e.date}, ${e.evenement}, ${e.variante}, ${e.joueurs}, ${e.score}tr${e.tours} ${e.vainqueur}, ${e.statut}`;
  // Le prefixe de l'expediteur tout devant (facile a trier, saab 2026-10-06),
  // puis Es_ (copie d'essai des poids IA, saab 2026-10-01), puis Br_.
  return `${e.prefixe ? `${e.prefixe}_` : ''}${e.essai ? 'Es_' : ''}${e.branches ? 'Br_' : ''}${base}`;
}
