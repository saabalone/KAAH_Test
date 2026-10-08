// Les CHOIX du banc d'essais (interface/banc-essais.js lance et affiche) : les
// profils a essayer, chacun avec son niveau et sa reflexion (saab, 2026-10-08 :
// « choisir des niveaux et tps de reflexion differents pour chaque fichier » ;
// au depart ceux par defaut, en bas, avec des fleches : le niveau de 1 en 1, la
// reflexion de palier en palier), la reference (de meme), les poids a faire
// varier, les parties — et leur TOTAL, recalcule a chaque changement (saab :
// « l'essai se fait tjs sur 80 parties » : c'etait 2 essais × 20 ouvertures ×
// revanche, mais rien ne le disait).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lireMachine (moteur/ia.js),
// CLES_REGLAGES_IA, LIBELLES_REGLAGES_IA (moteur/historique-profil-ia.js),
// CLES_OPTIONS_IA (moteur/ia-ajouts.js), CLES_CASES_IA_V3 (moteur/ia-evaluation-
// v3.js), CLE_CASES_BANC, REGLAGES_DE_RECHERCHE_BANC, variantesDuBanc,
// lireValeursDuBanc (moteur/banc-essais.js), listerProfilsIA, libelleProfilIA
// (interface/profils-ia.js), niveauDuBanc, tempsDuBanc, niveauVoisin,
// tempsVoisin, reglageDeRecherche, NIVEAU_PAR_DEFAUT_BANC, TEMPS_PAR_DEFAUT_BANC
// (interface/banc-essais-champs.js) viennent de fichiers charges avant celui-ci.

const REFERENCE_PROPOSEE_BANC = 'Normal v4el';
const COEURS_LAISSES_AU_RESTE = 1;
const LIBELLE_CASES_BANC = 'Cases (e5 à a1) ×';
const LIBELLES_RECHERCHE_CHOIX_BANC = { niveau: 'Niveau', temps: 'Réflexion max (s)' };

// `elements` : les champs de la boite (index.html, #dialogue-banc-essais).
function creerChoixDuBanc(elements) {
  const coches = new Set();
  const recherches = new Map(); // nom du profil -> { niveau, temps } (textes tapes)
  const rechercheDeLaReference = {}; // { niveau, temps } (textes tapes)

  // Les deux reglages d'un profil (`tapes` : ce qu'on y a mis), chacun avec − et +.
  const reglagesDuProfil = (tapes, retenir, nom) => {
    const { niveau, temps } = parDefaut();
    return [
      reglageDeRecherche(niveauDuBanc(tapes.niveau ?? '', niveau), niveauVoisin, retenir('niveau'), `Niveau de ${nom}`),
      reglageDeRecherche(tempsDuBanc(tapes.temps ?? '', temps), tempsVoisin, retenir('temps'), `Réflexion max de ${nom}, en secondes`),
    ];
  };

  const parDefaut = () => ({
    niveau: niveauDuBanc(elements.niveau.value, NIVEAU_PAR_DEFAUT_BANC),
    temps: tempsDuBanc(elements.temps.value, TEMPS_PAR_DEFAUT_BANC),
  });

  const profilDuBanc = (profil, tapes = {}) => ({
    nom: libelleProfilIA(profil),
    version: profil.version,
    elagage: profil.elagage ?? 0,
    niveau: niveauDuBanc(tapes.niveau ?? '', parDefaut().niveau),
    temps: tempsDuBanc(String(tapes.temps ?? '').replace(',', '.'), parDefaut().temps),
    poids: lireMachine({ version: profil.version, style: profil.style, elagage: profil.elagage, poids: profil.poids }).poids,
  });

  const variations = () =>
    [[elements.cle1, elements.valeurs1], [elements.cle2, elements.valeurs2]]
      .filter(([cle, valeurs]) => cle.value && lireValeursDuBanc(valeurs.value).length > 0)
      .map(([cle, valeurs]) => ({ cle: cle.value, valeurs: lireValeursDuBanc(valeurs.value) }));

  const parametres = () => ({
    ouvertures: Math.max(1, Number(elements.ouvertures.value) || 1),
    revanche: elements.revanche.checked,
    livre: elements.livre.checked,
    hasard: Math.max(0, Number(elements.hasard.value) || 0),
  });

  // La valeur d'origine du parametre choisi dans « Faire varier », pour chaque
  // profil coche (saab, 2026-10-08 : « mets aussi la valeur d'origine qd on
  // choisit un parametre d'un fichier »).
  function afficherOrigines() {
    const profils = listerProfilsIA().filter((profil) => coches.has(profil.nom)).map((profil) => profilDuBanc(profil, recherches.get(profil.nom)));
    const valeurDe = (profil, cle) => {
      if (cle === CLE_CASES_BANC) return '×1';
      const valeur = cle in profil && cle !== 'poids' ? profil[cle] : profil.poids[cle];
      return valeur === undefined ? 'sans' : String(valeur).replace('.', ',');
    };
    for (const [select, origine] of [[elements.cle1, elements.origine1], [elements.cle2, elements.origine2]]) {
      origine.textContent = select.value && profils.length > 0 ? `Origine : ${profils.map((profil) => `${profil.nom} ${valeurDe(profil, select.value)}`).join(' · ')}` : '';
    }
  }

  function afficherTotal() {
    afficherOrigines();
    const { ouvertures, revanche } = parametres();
    const essais = coches.size * variations().reduce((nombre, { valeurs }) => nombre * valeurs.length, 1);
    const pluriel = (nombre, mot) => `${nombre} ${mot}${nombre > 1 ? 's' : ''}`;
    elements.total.textContent = `${pluriel(essais, 'essai')} × ${pluriel(ouvertures, 'ouverture')}${revanche ? ' × 2 (revanche)' : ''} = ${pluriel(essais * ouvertures * (revanche ? 2 : 1), 'partie')}`;
  }

  function remplirProfils() {
    const style = elements.style.value;
    elements.profils.replaceChildren(
      ...listerProfilsIA()
        .filter((profil) => !style || profil.style === style)
        .map((profil) => {
          const ligne = document.createElement('div');
          ligne.className = 'ligne-reglage banc-ligne-profil';
          const etiquette = document.createElement('label');
          const coche = document.createElement('input');
          coche.type = 'checkbox';
          coche.checked = coches.has(profil.nom);
          coche.addEventListener('change', () => {
            if (coche.checked) coches.add(profil.nom);
            else coches.delete(profil.nom);
            afficherTotal();
          });
          etiquette.append(coche, ` ${libelleProfilIA(profil)}`);
          const tapes = recherches.get(profil.nom) ?? {};
          const retenir = (cle) => (valeur) => recherches.set(profil.nom, { ...recherches.get(profil.nom), [cle]: valeur });
          ligne.append(etiquette, ...reglagesDuProfil(tapes, retenir, libelleProfilIA(profil)));
          return ligne;
        })
    );
  }

  function remplir() {
    // Les ajouts (sv, ec...) seulement dans une version de travail (saab,
    // 2026-10-08 : le banc se publie, les suffixes pas encore).
    const avecLesAjouts = document.body.classList.contains('version-de-travail');
    const poids = CLES_REGLAGES_IA.filter((cle) => !['version', 'livre', 'style'].includes(cle) && (avecLesAjouts || !CLES_OPTIONS_IA.includes(cle)));
    const options = () => [
      ...REGLAGES_DE_RECHERCHE_BANC.map((cle) => new Option(LIBELLES_RECHERCHE_CHOIX_BANC[cle], cle)),
      ...poids.flatMap((cle) => [
        ...(cle === CLES_CASES_IA_V3[0] ? [new Option(LIBELLE_CASES_BANC, CLE_CASES_BANC)] : []),
        new Option(LIBELLES_REGLAGES_IA[cle] ?? cle, cle),
      ]),
    ];
    for (const select of [elements.cle1, elements.cle2]) {
      const choisie = select.value; // garder le choix quand on rouvre la boite
      select.replaceChildren(new Option('—', ''), ...options());
      select.value = choisie;
      if (select.selectedIndex < 0) select.value = '';
    }
    const actuelle = elements.reference.value || REFERENCE_PROPOSEE_BANC;
    elements.reference.replaceChildren(...listerProfilsIA().map((profil) => new Option(libelleProfilIA(profil), profil.nom)));
    elements.reference.value = listerProfilsIA().some((profil) => profil.nom === actuelle) ? actuelle : listerProfilsIA()[0]?.nom;
    if (!elements.paralleles.value) elements.paralleles.value = Math.max(1, (navigator.hardwareConcurrency || 2) - COEURS_LAISSES_AU_RESTE);
    const retenir = (cle) => (valeur) => (rechercheDeLaReference[cle] = valeur);
    elements.rechercheReference.replaceChildren(...reglagesDuProfil(rechercheDeLaReference, retenir, 'la référence'));
    remplirProfils();
    afficherTotal();
  }

  elements.style.addEventListener('change', remplirProfils);
  // Le total suit chaque changement ; les valeurs par defaut, les champs vides.
  elements.dialogue.addEventListener('input', afficherTotal);
  elements.dialogue.addEventListener('change', afficherTotal);
  for (const champ of [elements.niveau, elements.temps]) champ.addEventListener('input', () => remplir());

  return {
    remplir,
    parametres,
    // Les essais : chaque profil coche, avec son niveau et sa reflexion, et ses variantes.
    essais: () => variantesDuBanc(listerProfilsIA().filter((profil) => coches.has(profil.nom)).map((profil) => profilDuBanc(profil, recherches.get(profil.nom))), variations()),
    // La reference, avec son niveau et sa reflexion ; « sans livre » dans son nom si besoin.
    reference: () => {
      const profil = profilDuBanc(listerProfilsIA().find((existant) => existant.nom === elements.reference.value), rechercheDeLaReference);
      return elements.livre.checked ? profil : { ...profil, nom: `${profil.nom} sans livre` };
    },
  };
}
