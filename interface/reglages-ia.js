// La rubrique « Machine (profils IA) » de Reglages (phase 32, saab : « les
// parametres de l'IA, avec ajout et choix de fichier, comme profil, IA/date,
// qu'on pourra utiliser pour J1 ou J2 »). Un profil = un style de base (le nom
// de la machine : KAI2_Nor_5s) et les poids de l'evaluation
// (moteur/ia-evaluation.js). Le choix du profil de CHAQUE machine se fait au
// debut de la partie (interface/choix-joueurs.js).
//
// Saab, 2026-09-30 : une retouche reste un BROUILLON, en orange, jusqu'a
// Valider, qui en fait une nouvelle version du profil (moteur/
// historique-profil-ia.js) — vert : change a la derniere validation, jaune :
// a une plus ancienne ; la boite Historique IA (interface/historique-ia.js)
// montre toutes les versions et permet d'y revenir. Les profils integres ne
// changent jamais : valider une retouche de l'un d'eux cree un profil
// IA_<date>, dont l'historique part de lui. Abandonner oublie le brouillon.
// L'essai (interface/essai-ia.js) montre, sans rien enregistrer, ce que les
// poids affiches font jouer sur la position du plateau.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_POIDS_IA
// (moteur/ia-evaluation.js), CLES_POIDS_IA_V2 (moteur/ia-evaluation-v2.js),
// NOMS_STYLES_IA (moteur/ia.js), lireProfilIA (moteur/profils-ia.js),
// demarrerHistoriqueIA, validerVersionIA, choisirVersionIA,
// couleursDesReglagesIA, memesReglagesIA (moteur/historique-profil-ia.js),
// listerProfilsIA, trouverProfilIA, estProfilIAIntegre, enregistrerProfilIA,
// supprimerProfilIA, nomNouveauProfilIA (interface/profils-ia.js),
// afficherHistoriqueIA (interface/historique-ia.js), nomDisponible
// (moteur/corbeille.js), formaterDateKAAWA (interface/sauvegarde.js),
// telechargerPartie, demarrerImportation (interface/fichiers.js) viennent de
// fichiers charges avant celui-ci.

const CLASSES_COULEURS_REGLAGES_IA = { modifie: 'reglage-modifie', dernier: 'reglage-valide-dernier', ancien: 'reglage-valide-ancien' };

// `elements` : { rubrique, select, nouveau, supprimer, exporter, importer,
// style, version, valider, abandonner, historique, note, essai } — `essai` :
// interface/essai-ia.js. Les champs des poids sont trouves par leur id,
// `poids-ia-<cle>` ; ceux de la version 2 (sumitos, phase 33) ne se montrent
// qu'avec elle.
function demarrerReglagesIA(elements) {
  const CLES_POIDS = [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2];
  let nomActuel = NOMS_STYLES_IA.normal;
  let brouillon = null; // les valeurs retouchees pas encore validees, ou null
  const champPoids = (cle) => document.getElementById(`poids-ia-${cle}`);
  const ligneDe = (cle) => (cle === 'version' ? elements.version : cle === 'style' ? elements.style : champPoids(cle)).closest('label');

  const profilActuel = () => trouverProfilIA(nomActuel);

  function afficherValeurs(valeurs) {
    elements.style.value = valeurs.style;
    elements.version.value = String(valeurs.version);
    for (const cle of CLES_POIDS) {
      ligneDe(cle).hidden = !(cle in valeurs.poids);
      if (cle in valeurs.poids) champPoids(cle).value = valeurs.poids[cle];
    }
  }

  function marquerCouleurs() {
    const couleurs = couleursDesReglagesIA(profilActuel(), brouillon);
    for (const [cle, couleur] of Object.entries(couleurs)) {
      for (const [nom, classe] of Object.entries(CLASSES_COULEURS_REGLAGES_IA)) ligneDe(cle).classList.toggle(classe, couleur === nom);
    }
    elements.rubrique.classList.toggle('rubrique-modifiee', brouillon !== null);
    elements.valider.disabled = elements.abandonner.disabled = brouillon === null;
  }

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
    const profil = profilActuel();
    afficherValeurs(brouillon ?? profil);
    marquerCouleurs();
    afficherHistoriqueIA(elements.historique, profil, revenirALaVersion);
    elements.essai.actualiser(brouillon ?? profil);
    elements.note.textContent = estProfilIAIntegre(nomActuel)
      ? `Profil intégré (IA version ${profil.version}) : valider une retouche crée un nouveau profil.`
      : `IA version ${profil.version}.`;
  }

  // Un brouillon en cours n'est jamais perdu sans le dire.
  function brouillonAbandonne() {
    if (brouillon === null) return true;
    if (!window.confirm('Abandonner les retouches pas encore validées (en orange) ?')) return false;
    brouillon = null;
    return true;
  }

  function choisir(nom) {
    nomActuel = nom;
    brouillon = null;
    remplir();
  }

  elements.select.addEventListener('change', () => {
    if (brouillonAbandonne()) choisir(elements.select.value);
    else elements.select.value = nomActuel;
  });

  // Une retouche (style, version ou poids) : le brouillon, relu comme un
  // profil (lireProfilIA) — changer de version garde les poids communs, ceux
  // qui manquent prennent la valeur du style.
  function retoucher() {
    const valeurs = lireProfilIA({
      nom: nomActuel,
      style: elements.style.value,
      version: Number(elements.version.value),
      poids: Object.fromEntries(CLES_POIDS.filter((cle) => !ligneDe(cle).hidden).map((cle) => [cle, Number(champPoids(cle).value)])),
    });
    brouillon = memesReglagesIA(valeurs, profilActuel()) ? null : valeurs;
    afficherValeurs(brouillon ?? profilActuel());
    marquerCouleurs();
    elements.essai.actualiser(brouillon ?? profilActuel());
  }
  elements.style.addEventListener('change', retoucher);
  elements.version.addEventListener('change', retoucher);
  for (const cle of CLES_POIDS) {
    const champ = champPoids(cle);
    champ.addEventListener('change', retoucher);
    // Les boutons - et + (saab, 2026-09-30), comme ceux des tailles d'Affichage.
    for (const bouton of champ.parentElement.querySelectorAll('[data-pas]')) {
      bouton.addEventListener('click', () => {
        if (Number(bouton.dataset.pas) > 0) champ.stepUp();
        else champ.stepDown();
        champ.dispatchEvent(new Event('change'));
      });
    }
  }

  elements.valider.addEventListener('click', () => {
    if (brouillon === null) return;
    const date = formaterDateKAAWA(new Date());
    let profil = profilActuel();
    if (estProfilIAIntegre(profil.nom)) profil = demarrerHistoriqueIA({ ...profil, nom: nomNouveauProfilIA() }, date, `depuis ${profil.nom}`);
    profil = validerVersionIA(profil, brouillon, date);
    enregistrerProfilIA(profil);
    choisir(profil.nom);
  });

  elements.abandonner.addEventListener('click', () => choisir(nomActuel));

  function revenirALaVersion(numero) {
    const profil = profilActuel();
    if (numero === profil.courante && brouillon === null) return;
    if (!brouillonAbandonne()) return;
    enregistrerProfilIA(choisirVersionIA(profil, numero));
    choisir(nomActuel);
  }

  elements.nouveau.addEventListener('click', () => {
    if (!brouillonAbandonne()) return;
    const profil = demarrerHistoriqueIA({ ...profilActuel(), nom: nomNouveauProfilIA() }, formaterDateKAAWA(new Date()), `copie de ${nomActuel}`);
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

  // Le profil valide, historique compris (jamais le brouillon).
  elements.exporter.addEventListener('click', () => telechargerPartie(profilActuel(), nomActuel));

  // Un nom deja pris est renomme, jamais ecrase (meme regle que les positions
  // « My », moteur/corbeille.js, nomDisponible).
  elements.importer.addEventListener('click', () => {
    if (!brouillonAbandonne()) return;
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
  // `choisirProfil` : la case « Essai sur position » (index.html) montre le
  // profil de la machine au trait — sans jamais perdre un brouillon en silence.
  return {
    remplir,
    choisirProfil: (nom) => {
      if (nom !== nomActuel && trouverProfilIA(nom) && brouillonAbandonne()) choisir(nom);
    },
  };
}
