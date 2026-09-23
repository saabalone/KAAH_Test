// Stockage des reglages (phase 22, corrigee) : plusieurs PROFILS nommes,
// comme les fichiers `settings_N.json` de KAAWA et son menu "Setting ▾" (X
// vert = actif, X rouge = supprimer, KAA_aide.txt chapitre 2). Separe de
// interface/reglages.js (qui ne fait qu'ouvrir la boite et reagir aux
// boutons) pour une seule raison : la regle des 200 lignes.
//
// « Défaut » n'est PAS un profil enregistre : c'est REGLAGES_PAR_DEFAUT
// (moteur/reglages.js) lui-meme, toujours disponible, jamais modifie —
// l'ecart de secours qui manquait avant cette correction (saab : "je ne
// peux plus retrouver les reglages d'origine"). Un profil enregistre, lui,
// garde exactement ce qu'on a Sauve : Annuler y revient, Defaut revient au
// PROGRAMME, jamais l'un a la place de l'autre (saab, "attention, on ne
// revient pas au fichier par defaut").
//
// Pas d'import ni d'export (voir moteur/plateau.js) : REGLAGES_PAR_DEFAUT,
// fusionnerReglages (moteur/reglages.js) et formaterDateKAAWA
// (interface/sauvegarde.js) viennent de fichiers charges avant celui-ci
// dans index.html.

const CLE_PROFILS_REGLAGES = 'kaah-reglages-profils';
const NOM_PROFIL_DEFAUT = 'Défaut';

function lireStockageProfils() {
  try {
    const brut = JSON.parse(window.localStorage.getItem(CLE_PROFILS_REGLAGES) ?? '{}');
    return { actif: brut.actif ?? NOM_PROFIL_DEFAUT, profils: brut.profils ?? {} };
  } catch {
    return { actif: NOM_PROFIL_DEFAUT, profils: {} };
  }
}

function ecrireStockageProfils(stockage) {
  try {
    window.localStorage.setItem(CLE_PROFILS_REGLAGES, JSON.stringify(stockage));
  } catch {
    // Tant que la page reste ouverte, le changement vaut quand meme.
  }
}

// « Défaut » d'abord (toujours en tete, comme dans KAAWA), puis les profils
// enregistres dans leur ordre de creation.
function listerNomsProfils() {
  return [NOM_PROFIL_DEFAUT, ...Object.keys(lireStockageProfils().profils)];
}

function lireNomProfilActif() {
  const { actif, profils } = lireStockageProfils();
  // Un profil peut avoir ete supprime ailleurs (autre onglet) : retombe sur
  // Defaut plutot que de pointer vers rien.
  return actif === NOM_PROFIL_DEFAUT || actif in profils ? actif : NOM_PROFIL_DEFAUT;
}

// Les reglages REELLEMENT actifs en ce moment : ceux du profil actif,
// fusionnes sur les defauts (un profil enregistre avant l'ajout d'une
// nouvelle cle, ex. hole_color, retrouve quand meme sa valeur par defaut —
// meme garantie que fusionnerReglages).
function lireReglagesActifs() {
  const nom = lireNomProfilActif();
  if (nom === NOM_PROFIL_DEFAUT) return REGLAGES_PAR_DEFAUT;
  return fusionnerReglages(lireStockageProfils().profils[nom]);
}

// Ecrase le profil ACTIF avec `reglages` — jamais « Défaut » (toujours
// REGLAGES_PAR_DEFAUT, immuable) : appeler ceci sur Defaut cree plutot un
// nouveau profil, exactement comme KAAWA (Sauver sur Defaut equivaut a
// Sous...). Renvoie le nom reellement utilise.
function sauverProfilActif(reglages) {
  const nom = lireNomProfilActif();
  if (nom === NOM_PROFIL_DEFAUT) return creerProfil(nomProfilParDefaut(), reglages);
  const stockage = lireStockageProfils();
  stockage.profils[nom] = reglages;
  ecrireStockageProfils(stockage);
  return nom;
}

// Le nom qu'un reglage retouche sur Défaut prend TOUT SEUL (saab, correctif
// "en direct") : `set_kaah_<date du jour>`, jamais "Mes réglages (n)" — la
// meme date tant qu'on retouche le MEME jour (creerProfil ecrase alors ce
// meme profil, exactement comme on ne change jamais la date d'un fichier
// deja enregistre) ; un jour different redonne naturellement un nom
// different, donc un NOUVEAU profil, jamais le meme fichier reetiquete. Un
// nom fixe et distinct reste toujours possible via "Sauver..." (saab :
// "si on fait Sauver..., on pourra changer ce titre").
function nomProfilParDefaut() {
  return `set_kaah_${formaterDateKAAWA(new Date())}`;
}

// Cree (ou ecrase) le profil `nom` avec `reglages`, le rend actif, et
// renvoie ce meme nom.
function creerProfil(nom, reglages) {
  const stockage = lireStockageProfils();
  stockage.profils[nom] = reglages;
  stockage.actif = nom;
  ecrireStockageProfils(stockage);
  return nom;
}

function definirProfilActif(nom) {
  const stockage = lireStockageProfils();
  stockage.actif = nom === NOM_PROFIL_DEFAUT || nom in stockage.profils ? nom : NOM_PROFIL_DEFAUT;
  ecrireStockageProfils(stockage);
}

// Jamais « Défaut » (rien a supprimer, voir l'en-tete). Si c'etait le profil
// actif, on retombe sur Defaut.
function supprimerProfil(nom) {
  if (nom === NOM_PROFIL_DEFAUT) return;
  const stockage = lireStockageProfils();
  delete stockage.profils[nom];
  if (stockage.actif === nom) stockage.actif = NOM_PROFIL_DEFAUT;
  ecrireStockageProfils(stockage);
}
