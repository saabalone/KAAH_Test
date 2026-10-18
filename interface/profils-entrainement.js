// Les PROFILS d'Entrainement (phase 36 ; saab, 2026-10-08 : « comme les profils
// IA avec histo ») : le profil integre « Entraînement de saab » (jamais modifie :
// valider une retouche cree un nouveau profil, « Entraînement de saab_v2 ») et
// ceux de cet appareil (`kaah-profils-entrainement`), chacun avec ses versions
// (moteur/historique-reglages.js). Le profil ACTIF est celui que l'Entrainement joue.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : NOM_PROFIL_ENTRAINEMENT_INTEGRE,
// REGLES_ENTRAINEMENT_PAR_DEFAUT, valeursProfilEntrainement,
// reglagesDuProfilEntrainement, DESCRIPTION_PROFIL_ENTRAINEMENT
// (moteur/entrainement-profil.js), KAA_ENTRAINEMENT_SAAB (donnees/kaa-entrainement.js),
// lireHistorique (moteur/historique-reglages.js), compacterVersionsEntrainement,
// deployerVersionsEntrainement (moteur/entrainement-versions.js), nomDisponible
// (moteur/corbeille.js), envoyerALaCorbeille (interface/corbeille.js, a l'usage),
// nomDeLaVersionIA (moteur/historique-profil-ia.js : le nom d'une version, _v2)
// viennent de fichiers charges avant celui-ci.

const CLE_PROFILS_ENTRAINEMENT = 'kaah-profils-entrainement';
const CLE_PROFIL_ENTRAINEMENT_ACTIF = 'kaah-profil-entrainement-actif';
// Ses regles : celles que saab a exportees pour KAAH_Test (donnees/kaa-entrainement.js,
// generer-profil-entrainement.js), sinon les valeurs de depart du code.
const PROFIL_ENTRAINEMENT_INTEGRE = Object.freeze({
  nom: NOM_PROFIL_ENTRAINEMENT_INTEGRE,
  regles: KAA_ENTRAINEMENT_SAAB ? valeursProfilEntrainement(KAA_ENTRAINEMENT_SAAB).regles : REGLES_ENTRAINEMENT_PAR_DEFAUT,
});

// Un profil relu, ou null sans nom ; un historique abime est oublie.
function lireProfilEntrainement(brut) {
  if (!brut || typeof brut.nom !== 'string' || brut.nom.trim() === '') return null;
  return { nom: brut.nom.trim(), ...valeursProfilEntrainement(brut), ...(lireHistorique(DESCRIPTION_PROFIL_ENTRAINEMENT, brut) ?? {}) };
}

function lireProfilsEntrainementPerso() {
  try {
    const bruts = JSON.parse(window.localStorage.getItem(CLE_PROFILS_ENTRAINEMENT) ?? '[]');
    if (!Array.isArray(bruts)) return [];
    // Les versions sont rangees au plus court (moteur/entrainement-versions.js).
    return bruts.map((brut) => lireProfilEntrainement(Array.isArray(brut?.historique) ? { ...brut, historique: deployerVersionsEntrainement(brut.historique) } : brut)).filter(Boolean);
  } catch {
    return [];
  }
}

// Renvoie si l'ecriture a reussi : stockage plein (ou absent), rien n'est ecrit, et
// l'appelant le dit (saab, 2026-10-15 : un echec ne doit jamais perdre un profil —
// interface/entrainement-reglages-fichiers.js).
function ecrireProfilsEntrainementPerso(profils) {
  const ranges = profils.map((profil) => (profil.historique ? { ...profil, historique: compacterVersionsEntrainement(profil.historique) } : profil));
  try {
    window.localStorage.setItem(CLE_PROFILS_ENTRAINEMENT, JSON.stringify(ranges));
    return true;
  } catch {
    return false;
  }
}

function listerProfilsEntrainement() {
  return [PROFIL_ENTRAINEMENT_INTEGRE, ...lireProfilsEntrainementPerso()];
}

const trouverProfilEntrainement = (nom) => listerProfilsEntrainement().find((profil) => profil.nom === nom) ?? null;
const estProfilEntrainementIntegre = (nom) => nom === NOM_PROFIL_ENTRAINEMENT_INTEGRE;

function profilEntrainementActif() {
  try {
    return trouverProfilEntrainement(window.localStorage.getItem(CLE_PROFIL_ENTRAINEMENT_ACTIF)) ?? PROFIL_ENTRAINEMENT_INTEGRE;
  } catch {
    return PROFIL_ENTRAINEMENT_INTEGRE;
  }
}

function choisirProfilEntrainementActif(nom) {
  try {
    window.localStorage.setItem(CLE_PROFIL_ENTRAINEMENT_ACTIF, nom);
  } catch {
    // le choix ne survivra pas au rechargement
  }
}

// Ce que le jeu lit du profil actif (moteur/entrainement-profil.js).
function reglagesDeLEntrainement() {
  return reglagesDuProfilEntrainement(profilEntrainementActif());
}

// Range `profil` sous le nom de sa version courante (« _v3 »), a la place de
// `ancienNom` ; un nom deja pris recoit « (2) ». Renvoie le nom, ou null si le
// navigateur a refuse de l'ecrire (rien n'a change).
function enregistrerProfilEntrainement(ancienNom, profil) {
  const autres = lireProfilsEntrainementPerso().filter((existant) => existant.nom !== ancienNom);
  const pris = [NOM_PROFIL_ENTRAINEMENT_INTEGRE, ...autres.map((existant) => existant.nom)];
  const voulu = nomDeLaVersionIA(profil.nom, profil.courante ?? 1);
  let nom = voulu;
  for (let rang = 2; pris.includes(nom); rang++) nom = `${voulu} (${rang})`;
  return ecrireProfilsEntrainementPerso([...autres, { ...profil, nom }]) ? nom : null;
}

// Un profil de plus (importe d'un fichier), sous son nom, ou « nom (2) » s'il est pris.
// Renvoie le nom, ou null (stockage plein).
function ajouterProfilEntrainement(brut) {
  const profil = lireProfilEntrainement(brut);
  if (!profil) return null;
  const nom = nomDisponible(profil.nom, listerProfilsEntrainement().map((existant) => existant.nom));
  return ecrireProfilsEntrainementPerso([...lireProfilsEntrainementPerso(), { ...profil, nom }]) ? nom : null;
}

// Supprimer un profil l'envoie a la corbeille (saab, 2026-10-14 : « ajouter une corbeille
// pour supprimer les profils » ; interface/corbeille.js), avec toutes ses versions.
const GENRE_CORBEILLE_PROFILS_ENTRAINEMENT = 'profils-entrainement';
function supprimerProfilEntrainement(nom) {
  const profils = lireProfilsEntrainementPerso();
  const supprime = profils.find((profil) => profil.nom === nom);
  // La corbeille d'abord : si elle ne peut pas le garder, il reste ou il est.
  if (supprime && !envoyerALaCorbeille(GENRE_CORBEILLE_PROFILS_ENTRAINEMENT, { ...supprime, historique: supprime.historique ? compacterVersionsEntrainement(supprime.historique) : undefined })) return false;
  return ecrireProfilsEntrainementPerso(profils.filter((profil) => profil.nom !== nom));
}

// Un profil qui revient de la corbeille : sous son nom, ou « nom (2) » s'il est repris.
function restaurerProfilEntrainement(brut) {
  const profil = lireProfilEntrainement(Array.isArray(brut?.historique) ? { ...brut, historique: deployerVersionsEntrainement(brut.historique) } : brut);
  if (!profil) return false;
  const pris = listerProfilsEntrainement().map((existant) => existant.nom);
  return ecrireProfilsEntrainementPerso([...lireProfilsEntrainementPerso(), { ...profil, nom: nomDisponible(profil.nom, pris) }]);
}
