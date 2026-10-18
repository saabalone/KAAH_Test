// Les FICHIERS d'un profil d'Entrainement (extrait d'interface/entrainement-reglages.js,
// regle des 200 lignes) : l'export pour KAAH_Test, la copie de secours d'une retouche
// que le navigateur n'a pas pu enregistrer, et l'import d'un tel fichier. Saab,
// 2026-10-15 : « Valider le profil alors que j'avais rempli tous les tableaux ceinture,
// alerte "navigateur plein", clic OK et profil non validé et disparu !! » — le stockage
// du navigateur (environ 5 Mo pour tout KAAH) refuse d'ecrire quand il est plein : rien
// ne doit alors se perdre.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : NOM_PROFIL_ENTRAINEMENT_INTEGRE,
// valeursProfilEntrainement (moteur/entrainement-profil.js), ajouterProfilEntrainement
// (interface/profils-entrainement.js), telechargerTexte, choisirFichiersTexte
// (interface/fichiers.js), formaterDateKAAWA (interface/sauvegarde.js),
// occupationDuStockage (interface/sauvegarde-complete.js) viennent de fichiers charges
// avant celui-ci.


// Le fichier d'un profil : { nom, depuis, date, regles } (le format de
// KAA_entrainement_saab.json, generer-profil-entrainement.js).
const texteDuProfilEntrainement = (nom, depuis, regles) => `${JSON.stringify({ nom, depuis, date: formaterDateKAAWA(new Date()), regles }, null, 2)}\n`;

// Saab, 2026-10-10 : ses prereglages vivent dans son navigateur ; ce fichier les porte
// dans KAAH_Test (generer-profil-entrainement.js, publier-kaah.js).
function exporterProfilPourKAAHTest(profil) {
  telechargerTexte(texteDuProfilEntrainement(NOM_PROFIL_ENTRAINEMENT_INTEGRE, profil.nom, valeursProfilEntrainement(profil).regles), 'KAA_entrainement_saab.json', 'application/json');
}

// La copie de secours des retouches que le navigateur n'a pas pu garder.
function sauverLesRetouchesEnFichier(regles, nom) {
  const date = formaterDateKAAWA(new Date());
  telechargerTexte(texteDuProfilEntrainement(`${nom}_secours`, nom, regles), `KAA_entrainement_secours_${date}.json`, 'application/json');
}

function messageDuStockagePlein() {
  return `Le profil n’a PAS pu être enregistré : le stockage du navigateur est plein (ou indisponible).

Rien n’est perdu : vos retouches restent en orange dans le tableau, et une copie vient d’être téléchargée (KAA_entrainement_secours_…json), à reprendre avec « Importer un profil ».

Ce qui occupe le stockage : ${occupationDuStockage()}

Pour faire de la place : videz les corbeilles, supprimez des parties de Mes parties (exportées d’abord), puis touchez Valider de nouveau.`;
}

// Importer un profil depuis son fichier (une copie de secours, un export pour
// KAAH_Test) : il s'ajoute sous son nom d'origine (`depuis`), renomme s'il est pris.
// `surImporte(nom)`.
function importerUnProfilEntrainement(surImporte) {
  choisirFichiersTexte('.json,application/json', false, ([fichier]) => {
    let contenu;
    try {
      contenu = JSON.parse(fichier.texte);
    } catch {
      return window.alert(`${fichier.nom} n’est pas un fichier de profil (JSON illisible).`);
    }
    if (!contenu?.regles || typeof contenu.regles !== 'object') return window.alert(`${fichier.nom} n’est pas un fichier de profil d’Entraînement (pas de règles).`);
    const nom = ajouterProfilEntrainement({ nom: String(contenu.depuis ?? contenu.nom ?? 'Profil importé'), regles: contenu.regles });
    if (nom === null) return window.alert(messageDuStockagePlein());
    surImporte(nom);
  });
}
