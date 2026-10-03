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
// Normal_v2, dont l'historique part de lui. Le nom d'un profil suit sa version
// courante (saab, 2026-10-02 et 03) : Normal_v3, et son indice si ce nom est
// deja pris (Normal_v2_(P4)). Abandonner oublie le brouillon.
// L'essai (interface/essai-ia.js) montre, sans rien enregistrer, ce que les
// poids affiches font jouer sur la position du plateau.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_POIDS_IA
// (moteur/ia-evaluation.js), CLES_POIDS_IA_V2 (moteur/ia-evaluation-v2.js),
// NOMS_STYLES_IA (moteur/ia.js), lireProfilIA (moteur/profils-ia.js),
// demarrerHistoriqueIA, validerVersionIA, choisirVersionIA, memesReglagesIA
// (moteur/historique-profil-ia.js), couleursDesReglagesIA, couleurLaPlusForte,
// couleurDuProfilIA (moteur/couleurs-profil-ia.js), listerProfilsIA,
// trouverProfilIA, estProfilIAIntegre, enregistrerProfilIA,
// enregistrerSousLeNomDeSaVersion (interface/profils-ia.js), poserCouleurIA,
// colorerListeProfilsIA (interface/couleurs-ia.js), afficherHistoriqueIA
// (interface/historique-ia.js), formaterDateKAAWA (interface/sauvegarde.js),
// brancherFichiersProfilsIA (interface/fichiers-profils-ia.js) viennent de
// fichiers charges avant celui-ci.

// La version « 2el » (saab, 2026-10-02 et 03) : la 2, avec un elagage
// (moteur/ia-recherche.js, meilleursCoupsIA) — SUFFIXE_ELAGAGE_IA et le nombre
// propose d'abord, ELAGAGE_PAR_DEFAUT_IA : moteur/ia.js.

// Le titre de la rubrique en vert ou en jaune (l'orange : interface/reglages-champs.js).
const CLASSES_RUBRIQUE_IA = { dernier: 'rubrique-valide-dernier', ancien: 'rubrique-valide-ancien' };

// `elements` : { rubrique, select, nouveau, supprimer, exporter, importer,
// style, version, elagage, description, valider, abandonner, historique, note,
// essai } — `essai` :
// interface/essai-ia.js. Les champs des poids sont trouves par leur id,
// `poids-ia-<cle>` ; ceux de la version 2 (sumitos, phase 33) ne se montrent
// qu'avec elle.
function demarrerReglagesIA(elements) {
  const CLES_POIDS = [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2];
  let nomActuel = NOMS_STYLES_IA.normal;
  let brouillon = null; // les valeurs retouchees pas encore validees, ou null
  // Le brouillon d'avant chaque retouche : Annuler, en pied de Reglages
  // (interface/reglages.js), y revient (saab, 2026-10-02 : « je ne peux plus
  // revenir a l'original »). `surRetouche` : previent Reglages, qui range ces
  // retouches dans l'ordre avec les siennes.
  let retouchesPrecedentes = [];
  let surRetouche = () => {};
  const champPoids = (cle) => document.getElementById(`poids-ia-${cle}`);
  const champDe = (cle) => ({ version: elements.version, style: elements.style, elagage: elements.elagage })[cle] ?? champPoids(cle);
  const ligneDe = (cle) => champDe(cle).closest('label');

  const profilActuel = () => trouverProfilIA(nomActuel);

  function afficherValeurs(valeurs) {
    elements.style.value = valeurs.style;
    // L'elagage se choisit avec la version (« 2el ») ; son nombre, seulement alors.
    elements.version.value = `${valeurs.version}${valeurs.elagage > 0 ? SUFFIXE_ELAGAGE_IA : ''}`;
    ligneDe('elagage').hidden = !(valeurs.elagage > 0);
    elements.elagage.value = valeurs.elagage;
    for (const cle of CLES_POIDS) {
      ligneDe(cle).hidden = !(cle in valeurs.poids);
      if (cle in valeurs.poids) champPoids(cle).value = valeurs.poids[cle];
    }
  }

  // Chaque reglage (sa ligne et son chiffre), puis, de la valeur jusqu'a son
  // fichier (saab, 2026-10-02) : le nom du profil, la liste des profils,
  // l'Historique et le titre de la rubrique prennent la plus forte.
  function marquerCouleurs() {
    const couleurs = couleursDesReglagesIA(profilActuel(), brouillon);
    for (const [cle, couleur] of Object.entries(couleurs)) poserCouleurIA(ligneDe(cle), couleur);
    const duProfil = couleurLaPlusForte(Object.values(couleurs));
    poserCouleurIA(elements.select.closest('label'), duProfil);
    colorerListeProfilsIA(elements.select, (nom) => (nom === nomActuel ? duProfil : couleurDuProfilIA(trouverProfilIA(nom))));
    poserCouleurIA(elements.historique.closest('details').querySelector('summary'), duProfil);
    // Orange aussi pour la case Livre si elle differe de Défaut
    // (interface/reglages-champs.js) : la rubrique les reunit.
    elements.rubrique.classList.toggle('rubrique-modifiee', elements.rubrique.querySelector('.reglage-modifie') !== null);
    for (const [nom, classe] of Object.entries(CLASSES_RUBRIQUE_IA)) elements.rubrique.classList.toggle(classe, duProfil === nom);
    elements.valider.disabled = elements.abandonner.disabled = brouillon === null;
  }

  function remplir() {
    const profils = listerProfilsIA();
    if (!profils.some((profil) => profil.nom === nomActuel)) nomActuel = NOMS_STYLES_IA.normal;
    elements.select.replaceChildren(
      ...profils.map((profil) => {
        const option = document.createElement('option');
        option.value = profil.nom;
        option.textContent = libelleProfilIA(profil);
        return option;
      })
    );
    elements.select.value = nomActuel;
    const profil = profilActuel();
    afficherValeurs(brouillon ?? profil);
    marquerCouleurs();
    afficherHistoriqueIA(elements.historique, profil, revenirALaVersion);
    elements.essai.actualiser(brouillon ?? profil);
    // Ce qu'il cherche (saab, 2026-10-03) : celui d'un profil integre ne change pas.
    elements.description.value = profil.description ?? '';
    elements.description.disabled = estProfilIAIntegre(nomActuel);
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
    retouchesPrecedentes = [];
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
    const choix = elements.version.value;
    const elague = choix.endsWith(SUFFIXE_ELAGAGE_IA);
    const valeurs = lireProfilIA({
      nom: nomActuel,
      style: elements.style.value,
      version: Number.parseInt(choix, 10),
      elagage: !elague ? 0 : ligneDe('elagage').hidden ? ELAGAGE_PAR_DEFAUT_IA : Math.max(1, Math.round(Number(elements.elagage.value)) || ELAGAGE_PAR_DEFAUT_IA),
      poids: Object.fromEntries(CLES_POIDS.filter((cle) => !ligneDe(cle).hidden).map((cle) => [cle, Number(champPoids(cle).value)])),
    });
    retouchesPrecedentes.push(brouillon);
    surRetouche();
    brouillon = memesReglagesIA(valeurs, profilActuel()) ? null : valeurs;
    afficherValeurs(brouillon ?? profilActuel());
    marquerCouleurs();
    elements.essai.actualiser(brouillon ?? profilActuel());
  }
  elements.style.addEventListener('change', retoucher);
  elements.version.addEventListener('change', retoucher);
  for (const champ of [...CLES_POIDS.map(champPoids), elements.elagage]) {
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
    // Un profil integre ne change jamais : sa retouche validee en devient un nouveau,
    // qui garde son nom de base (saab, 2026-10-03 : « Normal devient Normal_v2 »).
    if (estProfilIAIntegre(profil.nom)) profil = demarrerHistoriqueIA({ ...profil }, date, `depuis ${profil.nom}`);
    const ancienNom = profil.nom;
    profil = validerVersionIA(profil, brouillon, date);
    // Le nom suit la version (saab, 2026-10-02 et 03) : Normal_v3.
    choisir(enregistrerSousLeNomDeSaVersion(ancienNom, profil));
  });

  elements.abandonner.addEventListener('click', () => choisir(nomActuel));

  // La description s'enregistre tout de suite, hors de l'historique des
  // versions (elle ne change pas le jeu de la machine).
  elements.description.addEventListener('change', () => {
    const profil = profilActuel();
    if (!profil || estProfilIAIntegre(profil.nom)) return;
    enregistrerProfilIA({ ...profil, description: elements.description.value.trim() });
  });

  function revenirALaVersion(numero) {
    const profil = profilActuel();
    if (numero === profil.courante && brouillon === null) return;
    if (!brouillonAbandonne()) return;
    choisir(enregistrerSousLeNomDeSaVersion(profil.nom, choisirVersionIA(profil, numero)));
  }

  // Nouveau, Supprimer, Exporter, Importer : interface/fichiers-profils-ia.js.
  brancherFichiersProfilsIA(elements, { profilActuel, nomActuel: () => nomActuel, brouillonAbandonne, choisir });

  remplir();
  // `choisirProfil` : la case « Essai sur position » (index.html) montre le
  // profil de la machine au trait — sans jamais perdre un brouillon en silence.
  // `annulerRetouche()` : revient au brouillon d'avant la derniere retouche ;
  // faux s'il n'y en a plus (le profil a change depuis).
  return {
    remplir,
    choisirProfil: (nom) => {
      if (nom !== nomActuel && trouverProfilIA(nom) && brouillonAbandonne()) choisir(nom);
    },
    brancherRetouche: (action) => {
      surRetouche = action;
    },
    annulerRetouche: () => {
      if (retouchesPrecedentes.length === 0) return false;
      brouillon = retouchesPrecedentes.pop();
      remplir();
      return true;
    },
  };
}
