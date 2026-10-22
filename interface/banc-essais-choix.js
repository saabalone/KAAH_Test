// Les CHOIX du banc d'essais (interface/banc-essais.js lance et affiche) : les
// profils a essayer, chacun avec son niveau et sa reflexion (saab, 2026-10-08 :
// « choisir des niveaux et tps de reflexion differents pour chaque fichier » ;
// au depart ceux par defaut, en bas, avec des fleches : le niveau de 1 en 1, la
// reflexion de palier en palier), la reference (de meme), les poids a faire
// varier, les parties — et leur TOTAL, recalcule a chaque changement (saab :
// « l'essai se fait tjs sur 80 parties » : c'etait 2 essais × 20 ouvertures ×
// revanche, mais rien ne le disait). Et l'etape 2 : PARTIES (avec ou sans
// recolte de puzzles, ses tours mini) ou PUZZLES (de KAAWA, My, tours mini et maxi).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lireMachine, nomDeLaMachine (moteur/ia.js),
// CLES_REGLAGES_IA, LIBELLES_REGLAGES_IA (moteur/historique-profil-ia.js),
// CLES_OPTIONS_IA (moteur/ia-ajouts.js), CLES_CASES_IA_V3 (moteur/ia-evaluation-
// v3.js), CLE_CASES_BANC, REGLAGES_DE_RECHERCHE_BANC, variantesDuBanc,
// lireValeursDuBanc (moteur/banc-essais.js), listerProfilsIA, libelleProfilIA,
// infobulleDuProfilIA, numeroDesAjoutsDe (interface/profils-ia.js), niveauDuBanc, tempsDuBanc, niveauVoisin,
// tempsVoisin, reglageDeRecherche, NIVEAU_PAR_DEFAUT_BANC, TEMPS_PAR_DEFAUT_BANC
// (interface/banc-essais-champs.js), puzzlesDuBanc (moteur/banc-puzzles.js),
// lirePuzzlesDuBanc (interface/banc-essais-puzzles.js), creerChoixDesJeuxDuBanc
// (interface/banc-essais-jeux.js), creerReglageDeLEssai (interface/banc-essais-reglage.js),
// dessinerLesProfilsDuBanc, afficherLesOriginesDuBanc (interface/banc-essais-profils.js)
// viennent de fichiers charges avant celui-ci.

const REFERENCE_PROPOSEE_BANC = 'Normal v4el';
const COEURS_LAISSES_AU_RESTE = 1;
// Les tours de la recolte : TOURS_MAXI_RECOLTE_PROPOSES, TOURS_MAXI_RECOLTE_LIMITE (moteur/banc-puzzles.js).
const TOURS_MIN_RECOLTE_BANC = 3; // au-dessous, des puzzles de 1 ou 2 tours seulement
const entierEntre = (texte, min, max, defaut) => Math.min(max, Math.max(min, Math.round(Number(texte)) || defaut));

// La variante des parties tant qu'on n'en choisit pas d'autre : celle du banc d'avant.
const VARIANTE_PAR_DEFAUT_BANC = 'Marguerite Belge';

// `elements` : les champs de la boite (index.html, #dialogue-banc-essais) ;
// `obtenirJeux()` : { variantes, puzzles } (les variantes des parties).
function creerChoixDuBanc(elements, obtenirJeux) {
  const coches = new Set();
  const recherches = new Map(); // nom du profil -> { niveau, temps } (textes tapes)
  const rechercheDeLaReference = {}; // { niveau, temps } (textes tapes)

  // Les deux reglages d'un profil (`tapes` : ce qu'on y a mis), chacun avec − et +.
  const reglagesDuProfil = (tapes, retenir, nom) => {
    const { niveau, temps } = parDefaut();
    return [
      reglageDeRecherche(niveauDuBanc(tapes.niveau ?? '', niveau), niveauVoisin, retenir('niveau'), `Niveau de ${nom}`),
      reglageDeRecherche(tempsDuBanc(tapes.temps ?? '', temps), tempsVoisin, retenir('temps'), `Réflexion max de ${nom}, en secondes (0 : sans limite, le niveau est toujours atteint)`),
    ];
  };

  const parDefaut = () => ({
    niveau: niveauDuBanc(elements.niveau.value, NIVEAU_PAR_DEFAUT_BANC),
    temps: tempsDuBanc(elements.temps.value, TEMPS_PAR_DEFAUT_BANC),
  });

  const profilDuBanc = (profil, tapes = {}) => ({
    nom: libelleProfilIA(profil),
    profil: profil.nom, // son nom d'origine (Valider le profil, interface/banc-essais-reglage.js)
    style: profil.style,
    numeroDePoids: profil.numeroDePoids, // le _v de son nom (moteur/noms-ia.js)
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

  const mode = () => elements.modes.find((bouton) => bouton.checked)?.value ?? 'parties';
  // Regler l'essai (interface/banc-essais-reglage.js) : le premier profil coche.
  const reglage = creerReglageDeLEssai(elements.reglageEssai, () => afficherTotal());
  const premierCoche = () => listerProfilsIA().find((profil) => coches.has(profil.nom));
  function afficherLeReglage() {
    if (!elements.reglageEssaiRepli.open) return;
    const essai = premierCoche();
    reglage.afficher(profilDuBanc(listerProfilsIA().find((existant) => existant.nom === elements.reference.value), rechercheDeLaReference), essai ? profilDuBanc(essai, recherches.get(essai.nom)) : null);
  }
  // Les variantes des parties et les PZL des puzzles (interface/banc-essais-jeux.js).
  const choixVariantes = creerChoixDesJeuxDuBanc(elements.choixVariantes, 'Variantes', (nom) => nom === VARIANTE_PAR_DEFAUT_BANC, () => afficherTotal());
  const choixPuzzles = creerChoixDesJeuxDuBanc(elements.choixPuzzles, 'PZL', () => true, () => afficherTotal());
  let nomsDesPuzzles = '';
  const variantesChoisies = () => {
    const choisies = choixVariantes.choisis();
    return obtenirJeux().variantes.filter((variante) => choisies.includes(variante.nom)).map((variante) => ({ nom: variante.nom, position: variante.texteBrut }));
  };

  const parametres = () => ({
    mode: mode(),
    ouvertures: Math.max(1, Number(elements.ouvertures.value) || 1),
    revanche: elements.revanche.checked,
    livre: elements.livre.checked,
    livreEssai: elements.livreEssai.checked,
    hasard: Math.max(0, Number(elements.hasard.value) || 0),
    recolte: {
      active: elements.recolte.checked,
      toursMini: entierEntre(elements.recolteToursMin.value, 1, TOURS_MAXI_RECOLTE_LIMITE, 2),
      toursMaxi: entierEntre(elements.recolteToursMax.value, TOURS_MIN_RECOLTE_BANC, TOURS_MAXI_RECOLTE_LIMITE, TOURS_MAXI_RECOLTE_PROPOSES),
    },
    variantes: variantesChoisies(),
    toursMin: entierEntre(elements.puzzlesToursMin.value, 1, 99, 1),
    toursMax: entierEntre(elements.puzzlesToursMax.value, 1, 99, 99),
    defenseComplete: elements.defenseComplete.checked,
    solveur: elements.solveur.checked,
  });

  // Les puzzles a jouer en mode Puzzles : ceux de KAAWA et/ou les miens, entre les tours
  // mini et maxi (`filtre`) ; puis ceux qu'on a coches.
  const puzzlesDuFiltre = () => {
    const { toursMin, toursMax } = parametres();
    return puzzlesDuBanc(lirePuzzlesDuBanc({ kaawa: elements.puzzlesKaawa.checked, my: elements.puzzlesMy.checked }), { toursMin, toursMax });
  };
  const puzzles = () => {
    const choisis = choixPuzzles.choisis();
    return puzzlesDuFiltre().filter((puzzle) => choisis.includes(puzzle.nom));
  };

  // La valeur d'origine du parametre choisi dans « Faire varier », pour chaque
  // profil coche (saab, 2026-10-08 : « mets aussi la valeur d'origine qd on
  // choisit un parametre d'un fichier »).
  const afficherOrigines = () =>
    afficherLesOriginesDuBanc(elements, listerProfilsIA().filter((profil) => coches.has(profil.nom)).map((profil) => profilDuBanc(profil, recherches.get(profil.nom))));

  function afficherTotal() {
    afficherOrigines();
    const { ouvertures, revanche } = parametres();
    const essais = coches.size * variations().reduce((nombre, { valeurs }) => nombre * valeurs.length, 1);
    const pluriel = (nombre, mot) => `${nombre} ${mot}${nombre > 1 ? 's' : ''}`;
    elements.dialogue.classList.toggle('banc-en-puzzles', mode() === 'puzzles');
    if (mode() === 'puzzles') {
      // La liste suit le filtre (sans boucler : seulement quand ses noms changent).
      const noms = puzzlesDuFiltre().map((puzzle) => puzzle.nom);
      if (noms.join('|') !== nomsDesPuzzles) {
        nomsDesPuzzles = noms.join('|');
        return choixPuzzles.remplir(noms);
      }
      const nombre = puzzles().length;
      elements.total.textContent = `${pluriel(essais, 'essai')} × ${pluriel(nombre, 'puzzle')} = ${pluriel(essais * nombre, 'puzzle')} à jouer`;
      return;
    }
    const variantes = Math.max(1, choixVariantes.choisis().length);
    elements.total.textContent = `${pluriel(essais, 'essai')} × ${pluriel(variantes, 'variante')} × ${pluriel(ouvertures, 'ouverture')}${revanche ? ' × 2 (revanche)' : ''} = ${pluriel(essais * variantes * ouvertures * (revanche ? 2 : 1), 'partie')}`;
  }

  const remplirProfils = () =>
    dessinerLesProfilsDuBanc(elements, coches, recherches, reglagesDuProfil, () => {
      afficherLeReglage();
      afficherTotal();
    });

  function remplir() {
    // Les choix de « Faire varier » (interface/banc-essais-champs.js).
    remplirLesChoixDesVariations([elements.cle1, elements.cle2]);
    const actuelle = elements.reference.value || REFERENCE_PROPOSEE_BANC;
    elements.reference.replaceChildren(
      ...listerProfilsIADansLOrdre().map((profil) => {
        const option = new Option(libelleProfilIA(profil), profil.nom);
        option.title = infobulleDuProfilIA(profil);
        marquerSiProfilParDefaut(option, profil.nom);
        return option;
      })
    );
    elements.reference.value = listerProfilsIA().some((profil) => profil.nom === actuelle) ? actuelle : listerProfilsIA()[0]?.nom;
    suivreLeProfilParDefaut(elements.reference);
    colorerListeProfilsIA(elements.reference); // leurs couleurs, comme dans Reglages
    if (!elements.paralleles.value) elements.paralleles.value = Math.max(1, (navigator.hardwareConcurrency || 2) - COEURS_LAISSES_AU_RESTE);
    const retenir = (cle) => (valeur) => (rechercheDeLaReference[cle] = valeur);
    elements.rechercheReference.replaceChildren(...reglagesDuProfil(rechercheDeLaReference, retenir, 'la référence'));
    remplirProfils();
    if (choixVariantes.choisis().length === 0 && obtenirJeux) choixVariantes.remplir(obtenirJeux().variantes.map((variante) => variante.nom));
    afficherTotal();
  }

  elements.style.addEventListener('change', remplirProfils);
  elements.reglageEssaiRepli.addEventListener('toggle', afficherLeReglage);
  elements.reference.addEventListener('change', afficherLeReglage);
  // Le total suit chaque changement ; les valeurs par defaut, les champs vides.
  elements.dialogue.addEventListener('input', afficherTotal);
  elements.dialogue.addEventListener('change', afficherTotal);
  for (const champ of [elements.niveau, elements.temps]) champ.addEventListener('input', () => remplir());

  return {
    remplir,
    parametres,
    puzzles,
    // Les essais : chaque profil coche, avec son niveau et sa reflexion, et ses variantes.
    essais: () => variantesDuBanc(listerProfilsIA().filter((profil) => coches.has(profil.nom)).map((profil) => reglage.retoucher(profilDuBanc(profil, recherches.get(profil.nom)))), variations()),
    reglage,
    // La reference, avec son niveau et sa reflexion ; « sans livre » dans son nom si besoin.
    reference: () => {
      const profil = profilDuBanc(listerProfilsIA().find((existant) => existant.nom === elements.reference.value), rechercheDeLaReference);
      return elements.livre.checked ? profil : { ...profil, nom: `${profil.nom} sans livre` };
    },
  };
}
