// La rubrique « Machine (profils IA) » de Reglages (phase 32, saab : « les
// parametres de l'IA, avec ajout et choix de fichier, comme profil, IA/date,
// qu'on pourra utiliser pour J1 ou J2 »). Un profil = un style de base (le nom
// de la machine : KAI2_Nor_5s) et les poids de l'evaluation
// (moteur/ia-evaluation.js). Les trois profils integres ne changent jamais :
// retoucher l'un d'eux cree un nouveau profil IA_<date>, comme « Défaut » dans
// les profils de reglages. Le choix du profil de CHAQUE machine se fait au
// debut de la partie (interface/choix-joueurs.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_POIDS_IA
// (moteur/ia-evaluation.js), CLES_POIDS_IA_V2 (moteur/ia-evaluation-v2.js), NOMS_STYLES_IA (moteur/ia.js), lireProfilIA
// (moteur/profils-ia.js), listerProfilsIA, trouverProfilIA, estProfilIAIntegre,
// enregistrerProfilIA, supprimerProfilIA, nomNouveauProfilIA
// (interface/profils-ia.js), nomDisponible (moteur/corbeille.js),
// telechargerPartie, demarrerImportation (interface/fichiers.js) viennent de
// fichiers charges avant celui-ci.

// `elements` : { select, nouveau, supprimer, exporter, importer, style, version,
// note } ; les champs des poids sont trouves par leur id, `poids-ia-<cle>` ;
// ceux de la version 2 (sumitos, phase 33) ne se montrent qu'avec elle.
function demarrerReglagesIA(elements) {
  let nomActuel = NOMS_STYLES_IA.normal;
  const champPoids = (cle) => document.getElementById(`poids-ia-${cle}`);

  function remplir() {
    const profils = listerProfilsIA();
    if (!profils.some((profil) => profil.nom === nomActuel)) nomActuel = NOMS_STYLES_IA.normal;
    elements.select.replaceChildren(
      ...profils.map((profil) => {
        const option = document.createElement('option');
        option.value = profil.nom;
        option.textContent = profil.nom;
        return option;
      })
    );
    elements.select.value = nomActuel;
    const profil = trouverProfilIA(nomActuel);
    elements.style.value = profil.style;
    elements.version.value = String(profil.version);
    for (const cle of [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2]) {
      const champ = champPoids(cle);
      champ.closest('label').hidden = !(cle in profil.poids);
      if (cle in profil.poids) champ.value = profil.poids[cle];
    }
    elements.note.textContent = estProfilIAIntegre(nomActuel)
      ? `Profil intégré (IA version ${profil.version}) : le retoucher crée un nouveau profil.`
      : `IA version ${profil.version}.`;
  }

  function choisir(nom) {
    nomActuel = nom;
    remplir();
  }

  elements.select.addEventListener('change', () => choisir(elements.select.value));

  // Une retouche (style ou poids) : enregistree tout de suite, dans un nouveau
  // profil si l'on partait d'un integre.
  // Changer de version garde les poids communs ; ceux qui manquent prennent
  // la valeur du style (moteur/ia.js, lireMachine).
  function retoucher() {
    const profil = lireProfilIA({
      ...trouverProfilIA(nomActuel),
      style: elements.style.value,
      version: Number(elements.version.value),
      poids: Object.fromEntries(
        [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2].filter((cle) => !champPoids(cle).closest('label').hidden).map((cle) => [cle, Number(champPoids(cle).value)])
      ),
    });
    if (estProfilIAIntegre(profil.nom)) profil.nom = nomNouveauProfilIA();
    enregistrerProfilIA(profil);
    choisir(profil.nom);
  }
  elements.style.addEventListener('change', retoucher);
  elements.version.addEventListener('change', retoucher);
  for (const cle of [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2]) champPoids(cle).addEventListener('change', retoucher);

  elements.nouveau.addEventListener('click', () => {
    const profil = { ...trouverProfilIA(nomActuel), nom: nomNouveauProfilIA() };
    enregistrerProfilIA(profil);
    choisir(profil.nom);
  });

  elements.supprimer.addEventListener('click', () => {
    if (estProfilIAIntegre(nomActuel)) {
      window.alert('Les profils intégrés (Agressif, Normal, Défensif, et leurs « v2 ») ne sont pas supprimables.');
      return;
    }
    if (!window.confirm(`Supprimer le profil IA « ${nomActuel} » ?`)) return;
    supprimerProfilIA(nomActuel);
    choisir(NOMS_STYLES_IA.normal);
  });

  elements.exporter.addEventListener('click', () => telechargerPartie(trouverProfilIA(nomActuel), nomActuel));

  // Un nom deja pris est renomme, jamais ecrase (meme regle que les positions
  // « My », moteur/corbeille.js, nomDisponible).
  elements.importer.addEventListener('click', () => {
    const refuser = () => window.alert("Ce fichier n'est pas un profil IA lisible.");
    demarrerImportation((donnees) => {
      const profil = lireProfilIA(donnees);
      if (!profil) return refuser();
      profil.nom = nomDisponible(profil.nom, listerProfilsIA().map((existant) => existant.nom));
      enregistrerProfilIA(profil);
      choisir(profil.nom);
    }, refuser);
  });

  remplir();
  return { remplir };
}
