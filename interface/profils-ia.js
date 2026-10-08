// Les profils IA de l'utilisateur (phase 32), ranges sur CET appareil a cote
// des trois profils integres (moteur/profils-ia.js). Meme philosophie que les
// profils de reglages (interface/reglages-profils.js) : un stockage
// indisponible ne fait jamais planter, il laisse seulement les profils integres.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : PROFILS_IA_INTEGRES,
// PROFILS_IA_DE_TRAVAIL, lireProfilIA (moteur/profils-ia.js),
// SUFFIXE_VERSION_KAAH_TEST (version.js), formaterDateKAAWA (interface/
// sauvegarde.js), nomDisponible (moteur/corbeille.js), nomDuProfilALaVersion
// (moteur/historique-profil-ia.js) viennent de fichiers
// charges avant celui-ci.

const CLE_PROFILS_IA = 'kaah-profils-ia';
// L'indice d'un nouveau profil (saab, 2026-10-01 : « indexer chaque profil
// IA », repris dans le nom de ses machines, KAI2_Nor_5s_P3) : d'apres les
// profils restants (moteur/profils-ia.js, prochainIndiceProfilIA) — sans profil,
// on repart a P1 (saab, 2026-10-03). L'ancien compteur, jamais remis a zero, est
// oublie.
const CLE_ANCIEN_DERNIER_INDICE_IA = 'kaah-dernier-indice-ia';
try {
  window.localStorage.removeItem(CLE_ANCIEN_DERNIER_INDICE_IA);
} catch {
  // Rien a oublier.
}

// Les profils de l'utilisateur ; ceux d'avant les indices en recoivent un.
function lireProfilsIAPerso() {
  try {
    const bruts = JSON.parse(window.localStorage.getItem(CLE_PROFILS_IA) ?? '[]');
    const profils = Array.isArray(bruts) ? bruts.map(lireProfilIA).filter(Boolean) : [];
    if (profils.every((profil) => profil.indice)) return profils;
    for (const profil of profils) profil.indice ??= prochainIndiceProfilIA(profils);
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

// Les profils de base : les integres, plus, dans une version de travail
// seulement, les meilleurs de saab (moteur/profils-ia.js, PROFILS_IA_DE_TRAVAIL :
// des ajouts pas encore publies).
const profilsIADeBase = () => [...PROFILS_IA_INTEGRES, ...(SUFFIXE_VERSION_KAAH_TEST !== '' ? PROFILS_IA_DE_TRAVAIL : [])];

// Ceux de base d'abord (toujours la), puis ceux de l'utilisateur. Un profil de
// travail du meme nom qu'un profil importe (Normal v5el_v4, importe avant d'etre
// de base) s'efface devant lui : jamais deux profils du meme nom.
function listerProfilsIA() {
  const perso = lireProfilsIAPerso();
  return [...profilsIADeBase().filter((profil) => PROFILS_IA_INTEGRES.includes(profil) || !perso.some((sien) => sien.nom === profil.nom)), ...perso];
}

function trouverProfilIA(nom) {
  return listerProfilsIA().find((profil) => profil.nom === nom) ?? null;
}

function estProfilIAIntegre(nom) {
  return listerProfilsIA().some((profil) => profil.nom === nom && profilsIADeBase().includes(profil));
}

// Enregistre (ou remplace) un profil de l'utilisateur ; jamais un integre.
// Un profil sans indice (nouveau, importe) en recoit un.
function enregistrerProfilIA(profil) {
  if (estProfilIAIntegre(profil.nom)) return false;
  const perso = lireProfilsIAPerso();
  const autres = perso.filter((existant) => existant.nom !== profil.nom);
  return ecrireProfilsIAPerso([...autres, { ...profil, indice: profil.indice ?? prochainIndiceProfilIA(perso) }]);
}

// Le nom d'un profil dans une liste, avec son indice : « IA_2610011200 (P3) ».
// Pas deux fois quand le nom le porte deja (Normal_v2_(P4), moteur/historique-
// profil-ia.js, nomDuProfilALaVersion).
function libelleProfilIA(profil) {
  if (!profil.indice || profil.nom.endsWith(`_(P${profil.indice})`)) return profil.nom;
  return `${profil.nom} (P${profil.indice})`;
}
// Enregistre `profil` sous le nom de sa version courante (moteur/historique-
// profil-ia.js, nomDuProfilALaVersion : Normal_v2, ou Normal_v2_(P4) si ce nom
// est pris) a la place de `ancienNom` — meme profil, meme indice, meme historique. Renvoie le nom donne (jamais celui d'un autre).
function enregistrerSousLeNomDeSaVersion(ancienNom, profil) {
  const autres = lireProfilsIAPerso().filter((existant) => existant.nom !== ancienNom);
  const nomsPris = [...profilsIADeBase(), ...autres].map((existant) => existant.nom);
  const indice = profil.indice ?? prochainIndiceProfilIA(autres);
  const nom = nomDisponible(nomDuProfilALaVersion(profil.nom, profil.courante, indice, nomsPris), nomsPris);
  ecrireProfilsIAPerso([...autres, { ...profil, nom, indice }]);
  return nom;
}

function supprimerProfilIA(nom) {
  return ecrireProfilsIAPerso(lireProfilsIAPerso().filter((profil) => profil.nom !== nom));
}

// Le nom d'un nouveau profil (saab : « IA/date »), jamais celui d'un profil
// deja la.
function nomNouveauProfilIA() {
  return nomDisponible(`IA_${formaterDateKAAWA(new Date())}`, listerProfilsIA().map((profil) => profil.nom));
}

// Le profil que montre la rubrique Machine de Reglages (saab, 2026-10-07 :
// « faire le focus sur le profil IA du joueur qui demande, mais aussi garder le
// dernier profil utilise si je ne passe pas par Joueur ») : le dernier choisi
// dans Reglages, ou celui de la machine regardee dans la boite d'un joueur
// (interface/noms-joueurs.js). Retenu sur cet appareil.
const CLE_PROFIL_IA_MONTRE = 'kaah-profil-ia-montre';

function lireProfilIAMontre() {
  try {
    return window.localStorage.getItem(CLE_PROFIL_IA_MONTRE);
  } catch {
    return null;
  }
}

function retenirProfilIAMontre(nom) {
  try {
    window.localStorage.setItem(CLE_PROFIL_IA_MONTRE, nom);
  } catch {
    // Tant pis : Reglages montrera le dernier profil de cette ouverture.
  }
}
