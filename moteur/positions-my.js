// Creer une variante ou un puzzle a soi, range dans « My » (phase 23bis). Reprend
// la boite « Ajouter/Modifier Position » de KAAWA (kaa_app_ClO_Co.py :
// handle_creator_click, confirm_save_popup, process_final_save ;
// kaa_utils_ClO_Co.py : json_dump_compact_list), verifiee contre les vrais
// fichiers My de saab (tests/positions-my.test.js). Pur, sans DOM ni stockage :
// ranger les entrees est l'affaire de interface/positions-my.js.
//
// Les entrees produites ici sont celles de KAAWA, champ par champ et dans le meme
// ordre : un fichier My exporte par KAAH s'ouvre dans KAAWA, et reciproquement.
// Seul ecart, decide avec saab (PLAN.md, phase 23bis) : la solution d'un puzzle
// est ecrite EN CLAIR (sol_starts) plutot que chiffree (sol) — la « nouvelle
// convention » du moteur de KAAWA, qui dechiffre de toute facon `sol` et le
// reecrit en clair au premier usage du puzzle.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lirePosition, ecrirePosition,
// SEPARATEUR_DES_CAMPS (moteur/notation.js), couleursDuPlateau,
// EJECTIONS_POUR_GAGNER (moteur/partie.js), erreurDePosition, BILLES_MAX_PAR_CAMP
// (moteur/variantes.js), lireNomPuzzle (moteur/puzzles.js), TYPES_DE_VARIANTE
// (moteur/classement.js) viennent de fichiers charges avant celui-ci.

// La « couleur en cours » de l'editeur apres avoir vide une case (KAAWA : 'empty').
const COULEUR_VIDE = 'vide';
// Le curseur d'ejections de KAAWA va de 0 a 5 : a 6, la partie serait deja gagnee.
const EJECTIONS_MAX_AU_DEPART = EJECTIONS_POUR_GAGNER - 1;
const PREFIXE_CREATEUR = '©';

// Ecrit un booleen comme Python l'ecrit dans les fichiers de KAAWA (str(True)).
function texteBooleen(valeur) {
  return valeur ? 'True' : 'False';
}

// --- L'editeur de position -----------------------------------------------------
// Une saisie : { couleurs: { a1: 'noir', ... }, couleurEnCours, ejectionsNoires,
// ejectionsBlanches }.

function saisieDepuisPosition(texte) {
  const etat = lirePosition(texte);
  return {
    couleurs: couleursDuPlateau(etat.plateau),
    couleurEnCours: 'noir',
    ejectionsNoires: etat.billesEjecteesNoires,
    ejectionsBlanches: etat.billesEjecteesBlanches,
  };
}

function positionDeLaSaisie(saisie) {
  const plateau = Object.fromEntries(Object.entries(saisie.couleurs).map(([notation, couleur]) => [notation, { couleur }]));
  return ecrirePosition({
    plateau,
    billesEjecteesNoires: saisie.ejectionsNoires,
    billesEjecteesBlanches: saisie.ejectionsBlanches,
  });
}

// Le clic sur une case, exactement comme KAAWA (handle_creator_click) : une
// noire devient blanche, une blanche disparait, une case vide recoit la couleur
// en cours — et ce que le clic vient de faire devient la couleur en cours. On
// enchaine ainsi toutes les noires, puis toutes les blanches, sans rien choisir.
function basculerCase(saisie, notation) {
  const couleurs = { ...saisie.couleurs };
  let couleurEnCours = saisie.couleurEnCours;
  if (couleurs[notation] === 'noir') {
    couleurs[notation] = 'blanc';
    couleurEnCours = 'blanc';
  } else if (couleurs[notation] === 'blanc') {
    delete couleurs[notation];
    couleurEnCours = COULEUR_VIDE;
  } else if (couleurEnCours === COULEUR_VIDE) {
    couleurs[notation] = 'noir';
    couleurEnCours = 'noir';
  } else {
    couleurs[notation] = couleurEnCours;
  }
  return { ...saisie, couleurs, couleurEnCours };
}

// Pourquoi la saisie ne peut pas etre enregistree, ou null. KAAWA exige une
// position dans chaque camp ; on y ajoute les limites que KAAH verifie a la
// lecture de toute position (erreurDePosition), pour ne jamais enregistrer une
// entree que la liste refuserait ensuite.
function erreurDeSaisie(saisie) {
  const couleurs = Object.values(saisie.couleurs);
  if (!couleurs.includes('noir')) return 'aucune bille noire';
  if (!couleurs.includes('blanc')) return 'aucune bille blanche';
  if (saisie.ejectionsNoires > EJECTIONS_MAX_AU_DEPART) return `${saisie.ejectionsNoires} billes noires déjà éjectées : la partie serait finie`;
  if (saisie.ejectionsBlanches > EJECTIONS_MAX_AU_DEPART) return `${saisie.ejectionsBlanches} billes blanches déjà éjectées : la partie serait finie`;
  return erreurDePosition(positionDeLaSaisie(saisie));
}

// Le nombre de tours est le seul champ obligatoire d'un puzzle dans KAAWA : sans
// lui, pas de marqueur xtrN dans le nom, donc pas de puzzle (moteur/puzzles.js).
function erreurDePuzzle({ toursMaximum }) {
  const tours = Number(toursMaximum);
  return Number.isInteger(tours) && tours >= 1 ? null : 'nombre de tours manquant';
}

// --- Les entrees de KAAWA --------------------------------------------------------

function createurEnregistre(createur) {
  return createur.trim() ? `${PREFIXE_CREATEUR}${createur}` : '';
}

// Handicaps de KAAWA (process_final_save) : « score » si une bille est deja
// ejectee ; « billes » si posees + ejectees ne font pas 14 dans un camp — une
// variante a handicap garde ses 14 billes posees, elle compte donc aussi comme
// « handi billes » (vrai nom de saab : `_5_Marguerite Belge -5-5 _5(14_14)`).
// Le nom decrit ces handicaps : `_<ej. N>_<nom> _<ej. B>`, puis `(<N posees>_<B posees>)`.
// `source` : l'original quand on « Modifie » (jamais touche, voir PLAN.md) ;
// equilibre et handicaps restent vrais s'ils l'etaient.
function entreeVarianteMy({ nomSaisi, createur, date, position, types, source }) {
  const etat = lirePosition(position);
  const couleurs = Object.values(couleursDuPlateau(etat.plateau));
  const noiresPosees = couleurs.filter((couleur) => couleur === 'noir').length;
  const blanchesPosees = couleurs.length - noiresPosees;
  const handiScore = etat.billesEjecteesNoires !== 0 || etat.billesEjecteesBlanches !== 0;
  const handiBilles =
    noiresPosees + etat.billesEjecteesNoires !== BILLES_MAX_PAR_CAMP ||
    blanchesPosees + etat.billesEjecteesBlanches !== BILLES_MAX_PAR_CAMP;

  let nom = nomSaisi || date;
  if (handiScore) nom = `_${etat.billesEjecteesNoires}_${nom} _${etat.billesEjecteesBlanches}`;
  if (handiBilles) nom += `(${noiresPosees}_${blanchesPosees})`;

  return {
    variant_name: nom,
    date,
    pos: position,
    creator: createurEnregistre(createur),
    equilibre: texteBooleen(source?.equilibre === 'True'),
    handi_score: texteBooleen(handiScore || source?.handi_score === 'True'),
    handi_bille: texteBooleen(handiBilles || source?.handi_bille === 'True'),
    Type: Object.fromEntries(TYPES_DE_VARIANTE.map(({ cle }) => [cle, texteBooleen(types.includes(cle))])),
    admin: false,
  };
}

// KAAWA fait toujours commencer Noir : un puzzle ou Blanc commence est donc
// enregistre camps inverses (billes ET ejections, chacune en tete de sa moitie).
function inverserLesCamps(position) {
  return position.split(SEPARATEUR_DES_CAMPS).reverse().join(SEPARATEUR_DES_CAMPS);
}

// Nom de KAAWA : `<PZL|Mini_PZL>_<E|M|H>_<date>_(-<ej. N>-<ej. B>)xtr<tours><x|y><nb sol.>`,
// puis `_<nom saisi>`. `x` si le gagnant est celui qui commence (Noir, une fois
// les camps remis dans le sens de KAAWA) : c'est ce que moteur/puzzles.js relit.
function entreePuzzleMy(formulaire) {
  const position = formulaire.premierJoueur === 'blanc' ? inverserLesCamps(formulaire.position) : formulaire.position;
  const etat = lirePosition(position);
  const gagnantCommence = formulaire.gagnant === formulaire.premierJoueur;
  const categorie = `${formulaire.typeDePuzzle}_${formulaire.niveau}`;
  const description =
    `(-${etat.billesEjecteesNoires}-${etat.billesEjecteesBlanches})` +
    `xtr${formulaire.toursMaximum}${gagnantCommence ? 'x' : 'y'}${formulaire.solutionsAuPremierCoup}`;
  const suffixe = formulaire.nomSaisi ? `_${formulaire.nomSaisi}` : '';

  return {
    PZL_name: `${categorie}_${formulaire.date}_${description}${suffixe}`,
    date: formulaire.date,
    pos: position,
    creator: createurEnregistre(formulaire.createur),
    type: categorie,
    winner: gagnantCommence ? 'Noir' : 'Blanc',
    'nb tour': formulaire.toursMaximum,
    'move1 sol ': formulaire.solutionsAuPremierCoup,
    sol: '',
    sol_starts: formulaire.debutsDeSolution,
    admin: false,
  };
}

// --- « Modifier » : le formulaire pre-rempli depuis un original ------------------

function createurSaisi(entree) {
  return (entree.creator ?? '').replaceAll(PREFIXE_CREATEUR, '');
}

// Le nom est repris ENTIER, comme KAAWA : c'est a l'utilisateur de le retoucher,
// le nom final s'affiche avant d'enregistrer.
function formulaireVarianteDepuisEntree(entree) {
  return {
    nomSaisi: entree.variant_name,
    createur: createurSaisi(entree),
    position: entree.pos,
    types: Object.entries(entree.Type ?? {}).filter(([, valeur]) => valeur === 'True').map(([cle]) => cle),
    source: entree,
  };
}

// Ecart assume avec KAAWA, qui remet type, niveau et gagnant a leurs valeurs par
// defaut : ici ils sont relus. Tours et gagnant viennent du NOM (il fait
// autorite, voir moteur/puzzles.js) ; le type et le niveau, du champ `type`.
function formulairePuzzleDepuisEntree(entree) {
  const objectif = lireNomPuzzle(entree.PZL_name);
  const categorie = entree.type ?? '';
  const separation = categorie.lastIndexOf('_');
  return {
    nomSaisi: entree.PZL_name,
    createur: createurSaisi(entree),
    position: entree.pos,
    premierJoueur: 'noir',
    gagnant: objectif?.campGagnant ?? 'noir',
    typeDePuzzle: separation > 0 ? categorie.slice(0, separation) : 'PZL',
    niveau: separation > 0 ? categorie.slice(separation + 1) : 'E',
    toursMaximum: objectif ? String(objectif.toursMaximum) : entree['nb tour'] ?? '',
    solutionsAuPremierCoup: entree['move1 sol '] ?? '',
    debutsDeSolution: entree.sol_starts ?? '',
  };
}

// --- Export -------------------------------------------------------------------------

// JSON a la maniere de json.dumps de Python (separateurs ", " et ": ", caracteres
// accentues laisses tels quels) : le fichier exporte est alors celui de KAAWA,
// octet pour octet — une entree par ligne, comme json_dump_compact_list.
function enJsonCommePython(valeur) {
  if (valeur === null || typeof valeur !== 'object') return JSON.stringify(valeur);
  const champs = Object.entries(valeur).map(([cle, contenu]) => `${JSON.stringify(cle)}: ${enJsonCommePython(contenu)}`);
  return `{${champs.join(', ')}}`;
}

function fichierPositionsMy(entrees) {
  const lignes = entrees.map((entree) => `  ${enJsonCommePython(entree)}`);
  const corps = lignes.length > 0 ? `${lignes.join(',\n')}\n` : '';
  return `{"content": [\n${corps}]}\n`;
}
