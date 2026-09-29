// Les profils IA de l'utilisateur (phase 32), ranges sur CET appareil a cote
// des trois profils integres (moteur/profils-ia.js). Meme philosophie que les
// profils de reglages (interface/reglages-profils.js) : un stockage
// indisponible ne fait jamais planter, il laisse seulement les profils integres.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : PROFILS_IA_INTEGRES,
// lireProfilIA (moteur/profils-ia.js), formaterDateKAAWA (interface/
// sauvegarde.js), nomDisponible (moteur/corbeille.js) viennent de fichiers
// charges avant celui-ci.

const CLE_PROFILS_IA = 'kaah-profils-ia';

function lireProfilsIAPerso() {
  try {
    const bruts = JSON.parse(window.localStorage.getItem(CLE_PROFILS_IA) ?? '[]');
    return Array.isArray(bruts) ? bruts.map(lireProfilIA).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function ecrireProfilsIAPerso(profils) {
  try {
    window.localStorage.setItem(CLE_PROFILS_IA, JSON.stringify(profils));
    return true;
  } catch {
    return false;
  }
}

// Les integres d'abord (toujours la), puis ceux de l'utilisateur.
function listerProfilsIA() {
  return [...PROFILS_IA_INTEGRES, ...lireProfilsIAPerso()];
}

function trouverProfilIA(nom) {
  return listerProfilsIA().find((profil) => profil.nom === nom) ?? null;
}

function estProfilIAIntegre(nom) {
  return PROFILS_IA_INTEGRES.some((profil) => profil.nom === nom);
}

// Enregistre (ou remplace) un profil de l'utilisateur ; jamais un integre.
function enregistrerProfilIA(profil) {
  if (estProfilIAIntegre(profil.nom)) return false;
  const autres = lireProfilsIAPerso().filter((existant) => existant.nom !== profil.nom);
  return ecrireProfilsIAPerso([...autres, profil]);
}

function supprimerProfilIA(nom) {
  return ecrireProfilsIAPerso(lireProfilsIAPerso().filter((profil) => profil.nom !== nom));
}

// Le nom d'un nouveau profil (saab : « IA/date »), jamais celui d'un profil
// deja la.
function nomNouveauProfilIA() {
  return nomDisponible(`IA_${formaterDateKAAWA(new Date())}`, listerProfilsIA().map((profil) => profil.nom));
}
