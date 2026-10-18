// Le TABLEAU DES NOMS des profils IA (saab, 2026-10-18 : « fais un tableau des profils IA
// de leur nouveau nom/ancien, car dans la récapitulation je m'y perds ») : chaque profil
// de cet appareil, dans l'ordre de Profils IA compares, avec son nom actuel, celui d'avant
// les noms du 2026-10-16 (« Normal v5el_v2 (P7) », celui des anciens fichiers LabAl) et
// ses ajouts en clair. Exporter : le meme tableau en fichier, que l'outil du recapitulatif
// des essais (essais/outils-recapitulatif) lit pour y montrer les noms actuels.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : listerProfilsIADansLOrdre,
// libelleProfilIA, infobulleDuProfilIA (interface/noms-profils-ia.js), estProfilIAIntegre
// (interface/profils-ia.js), suffixeDeVersionIA
// (moteur/ia.js), telechargerTexte (interface/fichiers.js), formaterDateKAAWA (interface/sauvegarde.js)
// viennent de fichiers charges avant ; tout ne sert qu'au clic.

const NOMS_COURTS_DES_STYLES_IA = { agressif: 'Agr', normal: 'Nor', defensif: 'Def' };
const echapperNomIA = (texte) => String(texte).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

// Une ligne par profil : { nouveau, ancien, ajouts }.
const lignesDesNomsIA = () =>
  listerProfilsIADansLOrdre().map((profil) => ({
    nouveau: libelleProfilIA(profil),
    // Un profil integre n'a pas d'ancien nom retenu : son nom d'origine (« Normal v4el »).
    ancien: profil.ancienNom ?? (estProfilIAIntegre(profil.nom) ? profil.nom : ''),
    ajouts: `${NOMS_COURTS_DES_STYLES_IA[profil.style] ?? 'Nor'} ${suffixeDeVersionIA(profil)}`,
    infobulle: infobulleDuProfilIA(profil),
    parDefaut: profil.nom === nomDuProfilIAParDefaut(),
  }));

// `elements` : { bouton, dialogue, tableau, exporter, fermer }.
function demarrerTableauDesNomsIA(elements) {
  function afficher() {
    const lignes = lignesDesNomsIA().map(
      ({ nouveau, ancien, ajouts, infobulle, parDefaut }) =>
        `<tr title="${echapperNomIA(infobulle)}"><td class="nom-actuel-ia${parDefaut ? ' profil-ia-par-defaut' : ''}">${echapperNomIA(nouveau)}</td><td>${ancien && ancien !== nouveau ? echapperNomIA(ancien) : '—'}</td><td class="note-reglages">${echapperNomIA(ajouts)}</td></tr>`
    );
    elements.tableau.innerHTML = `<tr><th>Nom actuel</th><th>Ancien nom</th><th>Style, version et ajouts</th></tr>${lignes.join('')}`;
  }
  elements.bouton.addEventListener('click', () => {
    afficher();
    elements.dialogue.showModal();
  });
  elements.exporter.addEventListener('click', () => {
    const lignes = lignesDesNomsIA().map(({ nouveau, ancien, ajouts }) => ({ nouveau, ancien, ajouts }));
    telechargerTexte(JSON.stringify(lignes, null, 1), `KAA_noms_profils_ia_${formaterDateKAAWA(new Date())}.json`, 'application/json');
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
}
