// Le rangement des parties par correspondance (phase 24) : une partie de « Mes
// parties » comme une autre, marquee des trois champs de KAAWA (corr_mode,
// corr_black_name, corr_white_name — voir moteur.arbreVersDonnees) ; sa date de
// creation (Date) est l'identifiant commun aux deux joueurs. La couleur jouee sur
// CET appareil est retenue a part, comme settings_corr.json dans KAAWA. Et ce
// qu'il faut dire au joueur apres le rechargement qui suit un code recu.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : arbreVersDonnees
// (moteur/sauvegarde.js), STATUT_EN_COURS (moteur/correspondance.js) et
// listerPartiesEnregistrees (interface/sauvegarde.js) viennent de fichiers
// charges avant celui-ci.

const CLE_COULEURS_CORRESPONDANCE = 'kaah-correspondance-couleurs';
const CLE_ANNONCE_CORRESPONDANCE = 'kaah-correspondance-annonce';
const EVENEMENT_CORRESPONDANCE = 'Corr';
// Pas de temps en correspondance : chrono fige, comme KAAWA.
const REGLAGES_PENDULES_CORRESPONDANCE = { mode: 'chrono', modeChoisi: 'chrono', tempsInitial: 0, bonusParCoup: 0, bonusParEjection: 0, delai: 0 };

function lireCouleursCorrespondance() {
  try {
    return JSON.parse(window.localStorage.getItem(CLE_COULEURS_CORRESPONDANCE) ?? '{}');
  } catch {
    return {};
  }
}

function memoriserCouleurLocale(idPartie, couleur) {
  try {
    window.localStorage.setItem(CLE_COULEURS_CORRESPONDANCE, JSON.stringify({ ...lireCouleursCorrespondance(), [idPartie]: couleur }));
  } catch {
    // Tant pis : elle sera redemandee au prochain chargement.
  }
}

// La correspondance d'une partie enregistree, ou null si ce n'en est pas une.
// `couleurLocale` vaut null si cet appareil ne la connait pas (fichier importe).
function correspondanceDesDonnees(donnees) {
  if (!donnees?.corr_mode) return null;
  return {
    idPartie: donnees.Date,
    couleurLocale: lireCouleursCorrespondance()[donnees.Date] ?? null,
    nomNoir: donnees.corr_black_name ?? '',
    nomBlanc: donnees.corr_white_name ?? '',
    evenement: donnees.Event ?? EVENEMENT_CORRESPONDANCE,
    nomPosition: donnees.VariantName ?? '',
  };
}

function donneesDeCorrespondance(arbre, correspondance) {
  return arbreVersDonnees(arbre, {
    date: correspondance.idPartie,
    event: correspondance.evenement,
    variantName: correspondance.nomPosition,
    joueurs: { noir: correspondance.nomNoir, blanc: correspondance.nomBlanc },
    reglagesPendules: REGLAGES_PENDULES_CORRESPONDANCE,
    finDePartie: null,
    plateauRetourne: false,
    pendulesActuelles: { tempsNoir: 0, tempsBlanc: 0 },
    correspondance,
  });
}

// Les parties par correspondance pas encore terminees (statut KAAWA "_",
// moteur/correspondance.js) parmi celles enregistrees — le nombre affiche dans
// l'enveloppe du bouton Correspondance (interface/correspondance.js).
function compterCorrespondancesEnCours() {
  return listerPartiesEnregistrees().filter((entree) => entree.donnees?.corr_mode && entree.donnees.Term === STATUT_EN_COURS).length;
}

function nomDeLAdversaire(correspondance) {
  return correspondance.couleurLocale === 'blanc' ? correspondance.nomNoir : correspondance.nomBlanc;
}

function annoncerApresChargement(annonce) {
  try {
    window.sessionStorage.setItem(CLE_ANNONCE_CORRESPONDANCE, JSON.stringify(annonce));
  } catch {
    // Le message seul serait perdu, jamais la partie.
  }
}

function prendreAnnonceCorrespondance() {
  try {
    const texte = window.sessionStorage.getItem(CLE_ANNONCE_CORRESPONDANCE);
    window.sessionStorage.removeItem(CLE_ANNONCE_CORRESPONDANCE);
    return texte ? JSON.parse(texte) : null;
  } catch {
    return null;
  }
}

// Ce qu'il faut dire au receveur une fois la partie rechargee.
function annonceDeReception(code, resultat, correspondance, estNouvelle) {
  const nom = nomDeLAdversaire(correspondance);
  if (resultat.propositionDeNulle) return { type: 'proposition', nom };
  const messages = {
    D: `${nom} accepte la nulle : partie terminée.`,
    R: `${nom} abandonne : vous gagnez.`,
    T: `${nom} a perdu au temps : partie terminée.`,
    N: `Coup reçu de ${nom} : 6 billes éjectées, partie terminée.`,
  };
  if (messages[code.statut]) return { type: 'message', message: messages[code.statut] };
  if (resultat.coupRecu) return { type: 'message', message: `Coup reçu de ${nom} : à vous de jouer.` };
  if (estNouvelle) return { type: 'message', message: `Partie reçue de ${nom} : à vous de jouer le premier coup.` };
  return { type: 'message', message: `${nom} refuse la nulle : à vous de jouer.` };
}
