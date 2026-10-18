// Les profils IA de l'utilisateur (phase 32), ranges sur CET appareil a cote
// des trois profils integres (moteur/profils-ia.js). Meme philosophie que les
// profils de reglages (interface/reglages-profils.js) : un stockage
// indisponible ne fait jamais planter, il laisse seulement les profils integres.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : PROFILS_IA_INTEGRES,
// PROFILS_IA_DE_TRAVAIL, lireProfilIA (moteur/profils-ia.js),
// SUFFIXE_VERSION_KAAH_TEST (version.js), formaterDateKAAWA (interface/
// sauvegarde.js), nomDisponible (moteur/corbeille.js), nomAfficheDuProfilIA
// (moteur/noms-ia.js) viennent de fichiers charges avant celui-ci ; numeroDesAjoutsDe,
// numeroDePoidsDansSaFamille, libelleAncienProfilIA (interface/noms-profils-ia.js) ne servent
// qu'une fois la page chargee.
//
// Les NOMS (saab, 2026-10-16, moteur/noms-ia.js) : un profil se montre sous son nom
// « Normal v5ElP2_v3 », calcule de ses reglages — les Pn viennent du registre de cet
// appareil (son jeu d'ajouts), le _v de son numero de poids (garde dans le profil). Son
// nom enregistre ne change pas (les parties et les fichiers y renvoient) : un profil
// d'avant ces noms le garde en infobulle (« ancien nom »).

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

// Les profils de l'utilisateur ; ceux d'avant les indices en recoivent un, ceux d'avant
// les noms (2026-10-16) leur numero de poids — dans l'ordre de leur indice, apres les
// profils de base — et gardent leur ancien nom pour l'infobulle.
function lireProfilsIAPerso() {
  try {
    const bruts = JSON.parse(window.localStorage.getItem(CLE_PROFILS_IA) ?? '[]');
    const profils = Array.isArray(bruts) ? bruts.map(lireProfilIA).filter(Boolean) : [];
    if (profils.every((profil) => profil.indice && profil.numeroDePoids)) return profils;
    for (const profil of profils) profil.indice ??= prochainIndiceProfilIA(profils);
    const ranges = [...profilsIADeBase()];
    for (const profil of [...profils].sort((a, b) => a.indice - b.indice)) {
      if (!profil.numeroDePoids) {
        profil.numeroDePoids = numeroDePoidsDansSaFamille(profil, ranges);
        profil.ancienNom ??= libelleAncienProfilIA(profil);
      }
      ranges.push(profil);
    }
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
// Publiee (KAAH_Test), seule l'IA par defaut s'ajoute aux profils integres (saab, 2026-10-18 :
// « quand on publiera, on mettra la meilleure IA par défaut ») ; les autres profils de travail
// restent dans la version de travail.
const profilsIADeBase = () => [...PROFILS_IA_INTEGRES, ...PROFILS_IA_DE_TRAVAIL.filter((profil) => SUFFIXE_VERSION_KAAH_TEST !== '' || profil.nom === NOM_PROFIL_IA_PAR_DEFAUT_DE_TRAVAIL)];
// L'IA proposee par defaut (un joueur machine, Conseils, le Graphique, les ceintures) : le
// meilleur profil de saab (moteur/profils-ia.js), sinon Normal.
const nomDuProfilIAParDefaut = () => (profilsIADeBase().some((profil) => profil.nom === NOM_PROFIL_IA_PAR_DEFAUT_DE_TRAVAIL) ? NOM_PROFIL_IA_PAR_DEFAUT_DE_TRAVAIL : MACHINE_PAR_DEFAUT.profil);

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
// Un profil sans indice (nouveau, importe) en recoit un, et son numero de poids.
function enregistrerProfilIA(profil) {
  if (estProfilIAIntegre(profil.nom)) return false;
  const perso = lireProfilsIAPerso();
  const autres = perso.filter((existant) => existant.nom !== profil.nom);
  const numeroDePoids = profil.numeroDePoids ?? numeroDePoidsDansSaFamille(profil, [...profilsIADeBase(), ...autres]);
  return ecrireProfilsIAPerso([...autres, { ...profil, indice: profil.indice ?? prochainIndiceProfilIA(perso), numeroDePoids }]);
}

// Enregistre `profil` (une retouche validee) sous son nom (moteur/noms-ia.js) a la place
// de `ancienNom` — meme profil, meme indice, meme historique : un nouveau jeu de poids de
// sa famille (saab : « Pn aux changements de suffixe et vm aux poids »). Renvoie le nom
// donne (jamais celui d'un autre).
function enregistrerSousLeNomDeSaVersion(ancienNom, profil) {
  const autres = lireProfilsIAPerso().filter((existant) => existant.nom !== ancienNom);
  const nomsPris = [...profilsIADeBase(), ...autres].map((existant) => existant.nom);
  const indice = profil.indice ?? prochainIndiceProfilIA(autres);
  const avant = trouverProfilIA(ancienNom);
  const dejaLa = [...profilsIADeBase(), ...autres, ...(avant && !estProfilIAIntegre(ancienNom) ? [avant] : [])];
  const numeroDePoids = numeroDePoidsDansSaFamille(profil, dejaLa);
  const nom = nomDisponible(nomAfficheDuProfilIA(profil, numeroDesAjoutsDe(profil.poids), numeroDePoids), nomsPris);
  ecrireProfilsIAPerso([...autres, { ...profil, nom, indice, numeroDePoids }]);
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

// Valider une retouche (`valeurs` : { version, livre, elagage, style, poids }) d'un profil
// IA : une nouvelle version, sous le nom de sa version (Normal_v3) ; un profil integre ne
// change jamais, sa retouche en devient un nouveau (« depuis Normal »). Reglages > Profil
// IA, et le Banc d'essais (interface/banc-essais-reglage.js). Renvoie le nom donne.
function validerUneRetoucheDuProfilIA(profil, valeurs, date) {
  const base = estProfilIAIntegre(profil.nom) ? demarrerHistoriqueIA({ ...profil }, date, `depuis ${profil.nom}`) : profil;
  return enregistrerSousLeNomDeSaVersion(base.nom, validerVersionIA(base, valeurs, date));
}

// Une retouche du Banc d'essais qui n'a pas gagne (saab, 2026-10-18 : « on ne va pas changer
// en pire ») : gardee a cote, en nouveau profil de la meme famille, son nom suivi de son
// `issue` (« = » a egalite, « - » perdue) ; le profil d'origine ne change pas. Renvoie son nom.
function garderUneRetoucheACote(profil, valeurs, date, issue, note) {
  const autres = lireProfilsIAPerso();
  const { historique, courante, indice, numeroDePoids, ancienNom, nom: nomDOrigine, ...reste } = profil;
  const nouveau = { ...demarrerHistoriqueIA({ ...reste, ...valeurs, nom: nomDOrigine }, date, note), indice: prochainIndiceProfilIA(autres), issueDuBanc: issue };
  const numero = numeroDePoidsDansSaFamille(nouveau, [...profilsIADeBase(), ...autres]);
  const nom = nomDisponible(`${nomAfficheDuProfilIA(nouveau, numeroDesAjoutsDe(nouveau.poids), numero)}${issue}`, [...profilsIADeBase(), ...autres].map((existant) => existant.nom));
  ecrireProfilsIAPerso([...autres, { ...nouveau, nom, numeroDePoids: numero }]);
  return nom;
}
