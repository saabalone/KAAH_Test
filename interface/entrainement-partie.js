// Un jeu de l'ENTRAINEMENT ou des CEINTURES (phase 36) : le lancer contre la machine,
// puis noter son resultat — en mode Ceinture, dans le parcours du joueur
// (moteur/entrainement-serie.js) ; en mode Entrainement (saab, 2026-10-10 : « on
// choisit la ceinture qu'on veut »), seulement dans l'historique.
//
// Les parcours (`kaah-entrainement`) : { joueur: { variantes, pzl } } — saab :
// « on peut avoir 2 ceintures, une en partie, une en pzl ».
// Le jeu en cours (`kaah-entrainement-en-cours`) : pose au lancement, il
// reconnait SA partie apres le rechargement (meme date de debut, meme position) ;
// le resultat se note une seule fois, puis il s'efface. Rien n'est ajoute au
// fichier de la partie : il reste celui de KAAWA.
//
// Les machines : l'IA par defaut (machineDesCeintures) ; en Variantes au niveau de la
// ceinture ; en PZL SANS elagage (la meilleure defense, ou la meilleure attaque quand
// le joueur defend), assez profond pour voir la fin du puzzle.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : parcoursNeuf, parcoursAJour,
// apresUnResultat, tirerPropositions (moteur/entrainement-serie.js),
// pendulesDeLaCeinture, pendulesDuPuzzle, positionAvecHandicap (moteur/entrainement-reglages.js),
// campDuSens, attaqueDansLePuzzle (moteur/entrainement.js),
// reglesDeSerieDuGrade (moteur/entrainement-lecture.js), reglagesDeLEntrainement
// (interface/profils-entrainement.js),
// toutesLesPermutations (moteur/permutations.js), definirPositionDepartSuivante,
// oublierPartieActive (interface/sauvegarde.js), machineDuProfil (moteur/profils-ia.js),
// nomDuProfilIAParDefaut (interface/profils-ia.js), profilDuChoix
// (interface/liste-profils-choix.js) viennent de fichiers charges avant celui-ci.

const CLE_PARCOURS_ENTRAINEMENT = 'kaah-entrainement';
const CLE_ENTRAINEMENT_EN_COURS = 'kaah-entrainement-en-cours';
// Les jeux proposes en mode Ceinture, tires une fois par ceinture (sinon, rater ferait
// changer les propositions) : { joueur: { 'sorte|ceinture': [noms] } }.
const CLE_PROPOSITIONS_CEINTURE = 'kaah-entrainement-propositions';
const PARCOURS_ENTRAINEMENT = ['variantes', 'pzl'];
// La machine des ceintures : l'IA par defaut (saab, 2026-10-18 : « l'IA par défaut sera
// toujours celle utilisée pour les ceintures ») — son style, sa version et ses poids ; le
// niveau, l'elagage et la reflexion viennent de la ceinture (ou des options des PZL). Le
// livre : en Variantes, pas en PZL.
function machineDesCeintures({ niveau, reflexionMax, elagage, livre }) {
  return { ...machineDuProfil(profilDuChoix(nomDuProfilIAParDefaut()), { niveau, reflexionMax, moteur: 'kai++', livre }), elagage };
}
const NIVEAU_MAX_DES_PUZZLES = 8; // NIVEAU_MAX_IA (moteur/ia-recherche.js)
const ELAGAGE_DES_PUZZLES_AVEC_ELAGAGE = 10; // la case « sans elagage » decochee

function lireStockageEntrainement(cle, defaut) {
  try {
    return JSON.parse(window.localStorage.getItem(cle) ?? 'null') ?? defaut;
  } catch {
    return defaut;
  }
}
function ecrireStockageEntrainement(cle, valeur) {
  try {
    if (valeur === null) window.localStorage.removeItem(cle);
    else window.localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // stockage indisponible : l'entrainement ne retient rien, le jeu continue
  }
}

// Le supplement de temps de la machine de `camp` pour `joueur` (saab : « si IA
// perd au tps, ajouter 1mn sur sa partie suivante de même couleur ») : pris une
// fois, par la partie suivante de cette couleur.
function prendreSupplementDeLaMachine(joueur, camp) {
  const tous = lireStockageEntrainement(CLE_PARCOURS_ENTRAINEMENT, {});
  const supplement = tous[joueur]?.supplementsIA?.[camp] ?? 0;
  if (supplement) {
    tous[joueur] = { ...tous[joueur], supplementsIA: { ...tous[joueur].supplementsIA, [camp]: 0 } };
    ecrireStockageEntrainement(CLE_PARCOURS_ENTRAINEMENT, tous);
  }
  return supplement;
}
function ajouterSupplementDeLaMachine(joueur, camp, secondes) {
  const tous = lireStockageEntrainement(CLE_PARCOURS_ENTRAINEMENT, {});
  tous[joueur] = { ...tous[joueur], supplementsIA: { ...tous[joueur]?.supplementsIA, [camp]: secondes } };
  ecrireStockageEntrainement(CLE_PARCOURS_ENTRAINEMENT, tous);
}

// Le parcours de `joueur` dans `sorte` ('variantes' ou 'pzl').
// Un parcours enregistre avant le 2026-10-10 recoit les champs qui lui manquent (saab :
// la boite ne s'ouvrait plus avec ses parcours d'essai).
function parcoursDuJoueur(joueur, sorte) {
  // Un parcours d'avant le 2026-10-22 encore a la blanche donnee repart sans ceinture (parcoursAJour).
  return parcoursAJour({ ...parcoursNeuf(), ...lireStockageEntrainement(CLE_PARCOURS_ENTRAINEMENT, {})[joueur]?.[sorte] });
}
function enregistrerParcours(joueur, sorte, parcours) {
  const tous = lireStockageEntrainement(CLE_PARCOURS_ENTRAINEMENT, {});
  tous[joueur] = { ...tous[joueur], [sorte]: parcours };
  ecrireStockageEntrainement(CLE_PARCOURS_ENTRAINEMENT, tous);
}

// Les jeux proposes a `joueur` pour `ceinture` en mode Ceinture : ceux deja tires
// s'ils sont toujours parmi les `candidats` (et les imposes toujours la), sinon un
// nouveau tirage ; `obligations` : { imposes, quotas, typesDe } (moteur/entrainement-serie.js, tirerPropositions).
function propositionsDeLaCeinture(joueur, sorte, ceinture, candidats, obligations, nombre) {
  const imposes = obligations.imposes ?? [];
  const tous = lireStockageEntrainement(CLE_PROPOSITIONS_CEINTURE, {});
  const cle = `${sorte}|${ceinture}`;
  const deja = tous[joueur]?.[cle];
  const valables = deja && deja.every((nom) => candidats.includes(nom)) && imposes.every((nom) => !candidats.includes(nom) || deja.includes(nom));
  if (valables) return deja;
  const tires = tirerPropositions(candidats, obligations, nombre);
  tous[joueur] = { ...tous[joueur], [cle]: tires };
  ecrireStockageEntrainement(CLE_PROPOSITIONS_CEINTURE, tous);
  return tires;
}

const campOppose = (camp) => (camp === 'noir' ? 'blanc' : 'noir');

// Lance un jeu : `jeu` = { joueur, sorte, ceinture, sens, mode } et la variante ou le
// puzzle (`position` : moteur.lireVariantes / lirePuzzles). Le PZL est pris dans
// une des 12 permutations (« chaque fois une permut différente »), jamais
// celle de son dernier passage. `recharger` : demarrerRechargement (index.html).
function lancerJeuDEntrainement({ joueur, sorte, ceinture, sens, mode = 'ceinture' }, position, recharger) {
  const reglages = reglagesDeLEntrainement();
  let texteBrut = position.texteBrut;
  let campDuJoueur;
  let machine;
  let reglagesPendules; // en PZL : ceux par defaut de la partie
  // Noir a l'aller, Blanc a la revanche, en partie comme en PZL (moteur/entrainement.js, campDuSens).
  campDuJoueur = campDuSens(sens);
  if (sorte === 'variantes') {
    const grade = reglages.ceintures[ceinture];
    machine = machineDesCeintures({ niveau: grade.niveau, reflexionMax: grade.ia.reflexion, elagage: grade.ia.elagage, livre: true });
    reglagesPendules = pendulesDeLaCeinture(reglages, ceinture, campDuJoueur, prendreSupplementDeLaMachine(joueur, campOppose(campDuJoueur)));
    // Les ceintures rouges : le joueur part avec des billes deja ejectees.
    texteBrut = positionAvecHandicap(texteBrut, campDuJoueur, grade.handicap);
  } else {
    // Une autre orientation a chaque fois (case « pzlPermutation »), sinon celle du fichier.
    if (reglages.options.pzlPermutation) {
      const permutations = toutesLesPermutations(position.texteBrut);
      const derniere = lireStockageEntrainement(CLE_ENTRAINEMENT_EN_COURS, null)?.permutation;
      const possibles = permutations.filter((permutation) => permutation.index !== derniere);
      texteBrut = possibles[Math.floor(Math.random() * possibles.length)].normale;
    }
    // On attaque si son camp est celui qui gagne, sinon on defend (saab, 2026-10-17).
    const attaque = attaqueDansLePuzzle(sens, position.campGagnant);
    // A partir du 4e Dan : un temps pour tout le puzzle (null : les pendules ordinaires).
    reglagesPendules = pendulesDuPuzzle(reglages, ceinture, campDuJoueur) ?? undefined;
    // Assez profond pour son premier coup (moteur/entrainement.js) ; ensuite, chaque
    // coup ne cherche que les tours qui restent (index.html, aideDuPuzzle). Noir joue
    // toujours le premier : en defense d'un PZL ou Noir gagne, elle repond a son coup.
    const attaquantDejaJoue = attaque && position.campGagnant === 'noir' ? 1 : 0;
    const plis = plisUtilesDuPuzzle(position.toursMaximum, attaquantDejaJoue, !attaque);
    machine = machineDesCeintures({
      niveau: Math.max(1, Math.min(NIVEAU_MAX_DES_PUZZLES, plis)),
      reflexionMax: reglages.options.reflexionPzl,
      elagage: reglages.options.pzlSansElagage ? 0 : ELAGAGE_DES_PUZZLES_AVEC_ELAGAGE,
      livre: false,
    });
  }
  ecrireStockageEntrainement(CLE_ENTRAINEMENT_EN_COURS, {
    joueur,
    mode,
    sorte,
    ceinture,
    sens,
    nom: position.nom,
    campDuJoueur,
    annuler: reglages.ceintures[ceinture].annuler,
    permutation: sorte === 'pzl' ? toutesLesPermutations(position.texteBrut).find((p) => p.normale === texteBrut)?.index : null,
    date: null, // la date de debut, posee au chargement (marquerDebutDEntrainement)
  });
  oublierPartieActive();
  definirPositionDepartSuivante(texteBrut, position.nom, {
    joueurs: { [campDuJoueur]: joueur, [campOppose(campDuJoueur)]: '' },
    machines: { [campDuJoueur]: null, [campOppose(campDuJoueur)]: machine },
    // La machine toujours en haut, le joueur en bas (saab, 2026-10-14) : avec les Blancs,
    // le plateau se retourne, comme a une Revanche (moteur/revanche.js).
    plateauRetourne: campDuJoueur === 'blanc',
    ...(reglagesPendules ? { reglagesPendules } : {}),
  });
  recharger();
}

// Le dernier jeu lance (la boite rouvre son mode et sa sorte), ou null.
function dernierJeuDEntrainement() {
  return lireStockageEntrainement(CLE_ENTRAINEMENT_EN_COURS, null);
}

// Au chargement d'une partie NEUVE lancee par l'Entrainement : retient sa date de
// debut, qui la reconnaitra ensuite.
function marquerDebutDEntrainement(positionChoisie, dateDebut) {
  const enCours = lireStockageEntrainement(CLE_ENTRAINEMENT_EN_COURS, null);
  if (!enCours || enCours.date !== null || positionChoisie?.nom !== enCours.nom) return;
  ecrireStockageEntrainement(CLE_ENTRAINEMENT_EN_COURS, { ...enCours, date: dateDebut });
}

// Le jeu d'entrainement de la partie affichee, ou null.
function entrainementDeLaPartie(dateDebut, variantName) {
  const enCours = lireStockageEntrainement(CLE_ENTRAINEMENT_EN_COURS, null);
  return enCours && enCours.date === dateDebut && enCours.nom === variantName ? enCours : null;
}

// Le jeu en cours est fini sans compter (une partie non jouee).
function oublierJeuDEntrainement(enCours) {
  ecrireStockageEntrainement(CLE_ENTRAINEMENT_EN_COURS, { ...enCours, date: 'fini' });
}

// Note `reussi` (vrai ou faux) pour le jeu en cours, une seule fois : renvoie
// { evenement, parcours, avant, regles } (moteur/entrainement-serie.js, apresUnResultat) ;
// en mode Entrainement, l'evenement est 'reussi' ou 'rate', sans parcours.
// `typesDe(nom)` : les types d'un jeu (pour les quotas par type) ; `proposablesDe(grade)` : les jeux
// que l'appareil peut proposer (un impose absent est ignore, moteur/entrainement-lecture.js).
// `resultat` : vrai (reussi), faux, ou RESULTAT_NULLE (moteur/entrainement-serie.js).
function noterResultatDEntrainement(enCours, resultat, typesDe, proposablesDe = null) {
  ecrireStockageEntrainement(CLE_ENTRAINEMENT_EN_COURS, { ...enCours, date: 'fini' });
  // Un nouveau PZL gagne est valide (interface/entrainement-nouveaux.js).
  if (resultat === true) validerUnNouveauPzl(enCours.joueur, enCours.sorte, enCours.nom);
  if (enCours.mode === 'entrainement') return { evenement: resultat === true ? 'reussi' : 'rate', parcours: null, avant: null, regles: null };
  const avant = parcoursDuJoueur(enCours.joueur, enCours.sorte);
  const regles = reglesDeSerieDuGrade(reglagesDeLEntrainement(), avant.cible ?? enCours.ceinture, enCours.sorte, typesDe, proposablesDe);
  // Le dernier jeu joue avant celui-ci a son grade ou plus haut (les deux modes) : une
  // pause trop longue fait reconfirmer le grade (interface/entrainement-historique.js).
  const derniere = historiqueDEntrainement(enCours.joueur).find((ligne) => ligne.sorte === enCours.sorte && ligne.ceinture >= avant.ceinture);
  const contexte = { date: Date.now(), derniereActivite: derniere?.date ?? null };
  const { parcours, evenement } = apresUnResultat(avant, enCours.ceinture, enCours.nom, enCours.sens, resultat, regles, contexte);
  enregistrerParcours(enCours.joueur, enCours.sorte, parcours);
  return { evenement, parcours, avant, regles };
}

