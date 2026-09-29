// Le nombre d'entrees d'une boite et leur volume, dans son titre (phase 31,
// saab, 2026-09-30) : « Mes parties (11, 10k) ». Ce que la boite MONTRE (un
// filtre ou un classement en cache une partie) ; le libelle vient de
// moteur/compte-volume.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : libelleNombreEtVolume,
// volumeEnOctets (moteur/compte-volume.js) viennent d'un fichier charge avant.

// `titre` : le <h2> de la boite ; son texte d'origine est retenu au premier
// appel, pour que les appels suivants remplacent le compte au lieu de s'ajouter.
function afficherCompteDansTitre(titre, entrees) {
  titre.dataset.titreDeBase ??= titre.textContent;
  titre.textContent = `${titre.dataset.titreDeBase} ${libelleNombreEtVolume(entrees.length, volumeEnOctets(entrees))}`;
}
