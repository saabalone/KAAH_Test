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
// Le dernier indice donne a un profil (saab, 2026-10-01 : « indexer chaque
// profil IA », repris dans le nom de ses machines, KAI2_Nor_5s_P3) : jamais
// redonne, meme apres une suppression, pour que deux profils ne se confondent
// jamais d'une partie a l'autre.
const CLE_DERNIER_INDICE_IA = 'kaah-dernier-indice-ia';

function nouvelIndiceProfilIA(profils) {
  let dernier = Math.max(0, ...profils.map((profil) => profil.indice ?? 0));
  try {
    dernier = Math.max(dernier, Number(window.localStorage.getItem(CLE_DERNIER_INDICE_IA)) || 0);
    window.localStorage.setItem(CLE_DERNIER_INDICE_IA, String(dernier + 1));
  } catch {
    // Sans stockage, le plus grand indice connu suffit.
  }
  return dernier + 1;
}

// Les profils de l'utilisateur ; ceux d'avant les indices en recoivent un.
function lireProfilsIAPerso() {
  try {
    const bruts = JSON.parse(window.localStorage.getItem(CLE_PROFILS_IA) ?? '[]');
    const profils = Array.isArray(bruts) ? bruts.map(lireProfilIA).filter(Boolean) : [];
    if (profils.every((profil) => profil.indice)) return profils;
    for (const profil of profils) profil.indice ??= nouvelIndiceProfilIA(profils);
    ecrireProfilsIAPerso(profils);
    return profils;
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
// Un profil sans indice (nouveau, importe) en recoit un.
function enregistrerProfilIA(profil) {
  if (estProfilIAIntegre(profil.nom)) return false;
  const perso = lireProfilsIAPerso();
  const autres = perso.filter((existant) => existant.nom !== profil.nom);
  return ecrireProfilsIAPerso([...autres, { ...profil, indice: profil.indice ?? nouvelIndiceProfilIA(perso) }]);
}

// Le nom d'un profil dans une liste, avec son indice : « IA_2610011200 (P3) ».
function libelleProfilIA(profil) {
  return profil.indice ? `${profil.nom} (P${profil.indice})` : profil.nom;
}

function supprimerProfilIA(nom) {
  return ecrireProfilsIAPerso(lireProfilsIAPerso().filter((profil) => profil.nom !== nom));
}

// Le nom d'un nouveau profil (saab : « IA/date »), jamais celui d'un profil
// deja la.
function nomNouveauProfilIA() {
  return nomDisponible(`IA_${formaterDateKAAWA(new Date())}`, listerProfilsIA().map((profil) => profil.nom));
}
