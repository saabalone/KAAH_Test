// Les boutons de fichier de la rubrique Machine de Reglages (sortis
// d'interface/reglages-ia.js, trop long) : Nouveau (une copie du profil
// affiche), Supprimer, Exporter, Importer.
//
// Exporter ecrit le nom de son auteur dans le fichier (saab, 2026-10-03 : « si
// j'exporte a un testeur un profil IA Normal_v2_(P4) alors qu'il a deja fait
// son Normal_v2_(P4) ... on pourrait lui ajouter un suffixe de l'expediteur »,
// puis 2026-10-06 : un prefixe, saab_Normal_v2_(P4)) ; Importer le met devant
// le nom (moteur/profils-ia.js, nomDuProfilImporte).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : NOMS_STYLES_IA
// (moteur/ia.js), lireProfilIA, nomDuProfilImporte (moteur/profils-ia.js),
// demarrerHistoriqueIA (moteur/historique-profil-ia.js), listerProfilsIA,
// estProfilIAIntegre, enregistrerProfilIA, supprimerProfilIA,
// nomNouveauProfilIA (interface/profils-ia.js), formaterDateKAAWA
// (interface/sauvegarde.js), telechargerPartie, demarrerImportation
// (interface/fichiers.js) viennent de fichiers charges avant celui-ci.

// Le nom de l'auteur des profils exportes depuis cet appareil.
const CLE_NOM_AUTEUR_IA = 'kaah-nom-auteur-ia';

function lireNomAuteurIA() {
  try {
    return window.localStorage.getItem(CLE_NOM_AUTEUR_IA) ?? '';
  } catch {
    return '';
  }
}

function retenirNomAuteurIA(nom) {
  try {
    window.localStorage.setItem(CLE_NOM_AUTEUR_IA, nom);
  } catch {
    // Il sera seulement redemande vide la prochaine fois.
  }
}

// `elements` : { nouveau, supprimer, exporter, importer } ; `rubrique` :
// { profilActuel(), nomActuel(), brouillonAbandonne() (faux si l'on garde une
// retouche en cours), choisir(nom) } (interface/reglages-ia.js).
function brancherFichiersProfilsIA(elements, { profilActuel, nomActuel, brouillonAbandonne, choisir }) {
  elements.nouveau.addEventListener('click', () => {
    if (!brouillonAbandonne()) return;
    // Une copie est un autre profil : un nouvel indice (enregistrerProfilIA).
    const { indice, ...copie } = profilActuel();
    const profil = demarrerHistoriqueIA({ ...copie, nom: nomNouveauProfilIA() }, formaterDateKAAWA(new Date()), `copie de ${nomActuel()}`);
    enregistrerProfilIA(profil);
    choisir(profil.nom);
  });

  elements.supprimer.addEventListener('click', () => {
    if (estProfilIAIntegre(nomActuel())) {
      window.alert('Les profils intégrés (Agressif, Normal, Défensif, et leurs « v2 ») ne sont pas supprimables.');
      return;
    }
    if (!window.confirm(`Supprimer le profil IA « ${nomActuel()} » ?`)) return;
    supprimerProfilIA(nomActuel());
    choisir(NOMS_STYLES_IA.normal);
  });

  // Le profil valide, historique compris (jamais le brouillon), avec le nom de
  // son auteur : demande a chaque export, propose d'apres le dernier.
  elements.exporter.addEventListener('click', () => {
    const auteur = window.prompt("Votre nom : chez celui qui importera ce profil, il se mettra devant son nom (saab_Normal_v2), pour regrouper vos profils.", lireNomAuteurIA());
    if (auteur === null) return;
    retenirNomAuteurIA(auteur.trim());
    telechargerPartie({ ...profilActuel(), auteur: auteur.trim() }, nomActuel());
  });

  // Le nom de l'auteur devant (sauf le sien) ; un nom deja pris est numerote,
  // jamais ecrase.
  elements.importer.addEventListener('click', () => {
    if (!brouillonAbandonne()) return;
    const refuser = () => window.alert("Ce fichier n'est pas un profil IA lisible.");
    demarrerImportation((donnees) => {
      const profil = lireProfilIA(donnees);
      if (!profil) return refuser();
      profil.nom = nomDuProfilImporte(profil.nom, profil.auteur, listerProfilsIA().map((existant) => existant.nom), lireNomAuteurIA());
      delete profil.indice; // celui d'un autre appareil : il en recoit un d'ici
      enregistrerProfilIA(profil);
      choisir(profil.nom);
    }, refuser);
  });
}
