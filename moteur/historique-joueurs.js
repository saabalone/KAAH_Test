// L'HISTORIQUE DES JOUEURS (phase 35 ; saab, 2026-10-08 : « un genre
// d'historique pour chaque joueur (aussi pour les KAI), avec nb parties G/N/P,
// parties record en coups, en ecart score, et les memes en pire, etc... »).
// Pur : interface/historique-joueurs.js range les resumes (un registre a part de
// « Mes parties », pour que supprimer une partie n'efface pas son historique) et
// les affiche.
//
// Un joueur est un NOM, humain ou machine (le nom d'une machine porte son
// niveau et son profil : KAI++5_Nor_30s_v5el10). Un nom par defaut (Joueur_1,
// Player_2...) n'est pas suivi (saab : « penser a obliger un nom »). Les puzzles
// ont leur propre bilan : leurs G/N/P ne se melangent pas a ceux des parties.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : elementsDuTitre,
// CODES_DU_VAINQUEUR (moteur/nom-partie.js), cheminPartieDuFichier (moteur/sauvegarde.js), estUnNomParDefaut
// (moteur/filtre-parties.js), lireNomPuzzle (moteur/puzzles.js) viennent de
// fichiers charges avant celui-ci.

// Le nom d'une machine commence par son moteur puis son niveau (moteur/ia.js,
// nomDeLaMachine : KAI8_..., KAI++5_...).
const DEBUT_NOM_DE_MACHINE = /^KAI(\+\+)?\d/;

function estUneMachine(nom) {
  return DEBUT_NOM_DE_MACHINE.test(nom);
}

const VAINQUEURS_PAR_CODE = { [CODES_DU_VAINQUEUR.noir]: 'noir', [CODES_DU_VAINQUEUR.blanc]: 'blanc', [CODES_DU_VAINQUEUR.nulle]: 'nulle' };

// Le resume d'une partie de « Mes parties » (`donnees` : le format de KAAWA), ou
// null si elle n'est pas finie ou si son vainqueur n'est pas sur.
function resumeDeLaPartie(id, donnees) {
  const titre = elementsDuTitre(donnees);
  const vainqueur = VAINQUEURS_PAR_CODE[titre.vainqueur];
  if (!vainqueur) return null;
  return {
    id,
    date: titre.date,
    variante: titre.variante,
    puzzle: lireNomPuzzle(titre.variante) !== null,
    noir: titre.joueurNoir,
    blanc: titre.joueurBlanc,
    vainqueur,
    ejecteesNoires: donnees.Eject.P1,
    ejecteesBlanches: donnees.Eject.P2,
    tours: titre.tours,
    demiCoups: cheminPartieDuFichier(donnees.Tree).length,
    statut: titre.statut,
  };
}

// Le resultat d'une partie pour `nom` : 'gagnees', 'nulles' ou 'perdues', et
// l'ecart du score de son point de vue (ses ejections moins celles qu'il a subies).
function resultatPour(resume, nom) {
  const camp = resume.noir === nom ? 'noir' : 'blanc';
  const ecart = camp === 'noir' ? resume.ejecteesBlanches - resume.ejecteesNoires : resume.ejecteesNoires - resume.ejecteesBlanches;
  const resultat = resume.vainqueur === 'nulle' ? 'nulles' : resume.vainqueur === camp ? 'gagnees' : 'perdues';
  return { camp, adversaire: camp === 'noir' ? resume.blanc : resume.noir, resultat, ecart };
}

// Saab, 2026-10-08 : « une partie non jouée par un joueur ne compte pas ». Noir
// joue le 1er demi-coup, Blanc le 2e ; un ancien resume, sans demiCoups, compte.
function aJoueUnCoup(camp, demiCoups) {
  if (demiCoups === undefined) return true;
  return demiCoups >= (camp === 'noir' ? 1 : 2);
}
const campDe = (resume, nom) => (resume.noir === nom ? 'noir' : 'blanc');

const compteVide = () => ({ parties: 0, gagnees: 0, nulles: 0, perdues: 0 });
function compter(compte, resultat) {
  compte.parties++;
  compte[resultat]++;
}

// Dans l'ordre ou elles ont ete jouees : la date de KAAWA (AAMMJJHHMM) se trie
// comme un texte.
const parDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

// Les joueurs suivis : [{ nom, parties, gagnees, nulles, perdues, machine }], les
// plus joues d'abord (puzzles et parties contre soi-meme non comptes).
function joueursDeLHistorique(resumes) {
  const joueurs = new Map();
  for (const resume of resumes) {
    if (resume.puzzle || resume.noir === resume.blanc) continue;
    for (const nom of [resume.noir, resume.blanc]) {
      if (estUnNomParDefaut(nom) || !aJoueUnCoup(campDe(resume, nom), resume.demiCoups)) continue;
      if (!joueurs.has(nom)) joueurs.set(nom, { nom, ...compteVide(), machine: estUneMachine(nom) });
      compter(joueurs.get(nom), resultatPour(resume, nom).resultat);
    }
  }
  return [...joueurs.values()].sort((a, b) => b.parties - a.parties || a.nom.localeCompare(b.nom));
}

// Les records : chacun { id, valeur, resume } — a egalite, la premiere partie
// jouee le garde ; null si aucune partie ne s'y prete.
const RECORDS = [
  { cle: 'victoireLaPlusCourte', resultat: 'gagnees', valeur: (r) => r.tours, meilleure: (a, b) => a < b },
  { cle: 'victoireLaPlusLongue', resultat: 'gagnees', valeur: (r) => r.tours, meilleure: (a, b) => a > b },
  { cle: 'victoireLaPlusLarge', resultat: 'gagnees', valeur: (r, ecart) => ecart, meilleure: (a, b) => a > b },
  { cle: 'defaiteLaPlusCourte', resultat: 'perdues', valeur: (r) => r.tours, meilleure: (a, b) => a < b },
  { cle: 'defaiteLaPlusLongue', resultat: 'perdues', valeur: (r) => r.tours, meilleure: (a, b) => a > b },
  { cle: 'defaiteLaPlusLourde', resultat: 'perdues', valeur: (r, ecart) => -ecart, meilleure: (a, b) => a > b }, // l'ecart subi, positif
];

// Le compte par nom (adversaires, variantes), les plus joues d'abord.
function comptesParNom(parties, nomDe) {
  const comptes = new Map();
  for (const partie of parties) {
    const nom = nomDe(partie);
    if (!comptes.has(nom)) comptes.set(nom, { nom, ...compteVide() });
    compter(comptes.get(nom), partie.resultat);
  }
  return [...comptes.values()].sort((a, b) => b.parties - a.parties);
}

// Tout ce qu'on sait de `nom` — voir le test de moteur/historique-joueurs.
function bilanDuJoueur(resumes, nom) {
  const siennes = resumes.filter((resume) => (resume.noir === nom || resume.blanc === nom) && aJoueUnCoup(campDe(resume, nom), resume.demiCoups)).sort(parDate);
  const contreSoiMeme = siennes.filter((resume) => resume.noir === resume.blanc).length;
  const avecResultat = siennes.filter((resume) => resume.noir !== resume.blanc).map((resume) => ({ resume, ...resultatPour(resume, nom) }));
  const parties = avecResultat.filter((partie) => !partie.resume.puzzle);
  const puzzles = avecResultat.filter((partie) => partie.resume.puzzle);

  const bilan = { nom, machine: estUneMachine(nom), ...compteVide(), contreSoiMeme, parCamp: { noir: compteVide(), blanc: compteVide() } };
  for (const partie of parties) {
    compter(bilan, partie.resultat);
    compter(bilan.parCamp[partie.camp], partie.resultat);
  }

  bilan.records = {};
  for (const record of RECORDS) {
    let trouve = null;
    for (const partie of parties.filter((p) => p.resultat === record.resultat)) {
      const valeur = record.valeur(partie.resume, partie.ecart);
      if (!trouve || record.meilleure(valeur, trouve.valeur)) trouve = { id: partie.resume.id, valeur, resume: partie.resume };
    }
    bilan.records[record.cle] = trouve;
  }

  // Les series : la derniere suite de memes resultats, et la plus longue suite de victoires.
  const derniere = parties.at(-1);
  let longueur = 0;
  for (let i = parties.length - 1; i >= 0 && parties[i].resultat === derniere.resultat; i--) longueur++;
  bilan.serieEnCours = derniere ? { sorte: { gagnees: 'victoires', nulles: 'nulles', perdues: 'defaites' }[derniere.resultat], longueur } : null;
  bilan.meilleureSerie = 0;
  let suite = 0;
  for (const partie of parties) {
    suite = partie.resultat === 'gagnees' ? suite + 1 : 0;
    bilan.meilleureSerie = Math.max(bilan.meilleureSerie, suite);
  }

  bilan.adversaires = comptesParNom(parties, (partie) => partie.adversaire);
  bilan.variantes = comptesParNom(parties, (partie) => partie.resume.variante);
  bilan.puzzles = compteVide();
  for (const partie of puzzles) compter(bilan.puzzles, partie.resultat);
  return bilan;
}
