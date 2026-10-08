// Le tableau comparatif des profils IA (saab, 2026-10-03 : « avec en colonnes
// la date (si elle existe), le profil IA, sa description, et tous les reglages
// avec leur code couleur ») : une boite ouverte depuis Reglages, rubrique
// Machine (bouton Comparer). Les lignes : moteur/couleurs-profil-ia.js,
// lignesComparaisonIA ; les couleurs : interface/couleurs-ia.js. Les valeurs
// validees seulement (une retouche en orange pas encore validee n'y est pas).
// Toucher une ligne choisit ce profil dans Reglages.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_REGLAGES_IA,
// LIBELLES_REGLAGES_IA, libelleDateHistoriqueIA (moteur/historique-profil-ia.js),
// CLES_CASES_IA_V3 (moteur/ia-evaluation-v3.js), CLES_OPTIONS_IA (moteur/ia-ajouts.js), lignesComparaisonIA,
// couleurLaPlusForte (moteur/couleurs-profil-ia.js), listerProfilsIA, libelleProfilIA
// (interface/profils-ia.js), poserCouleurIA (interface/couleurs-ia.js),
// COLONNES_ESSAI_IA (interface/essai-ia.js) viennent de fichiers charges avant
// celui-ci, ou ne servent qu'une fois la page chargee.

// Saab, 2026-10-03 : « Style, abreger par Agr/Nor/Déf ».
const ABREVIATIONS_STYLES_COMPARAISON_IA = { agressif: 'Agr', normal: 'Nor', defensif: 'Déf' };
// Les cases de la version 3 qu'on peut replier (saab : « plie on aura e5 et a1 »).
const CASES_TOUJOURS_VISIBLES_IA = ['caseE5', 'caseA1'];
const CASES_REPLIABLES_IA = CLES_CASES_IA_V3.filter((cle) => !CASES_TOUJOURS_VISIBLES_IA.includes(cle));
// Des en-tetes courts (saab, 2026-10-07 : « les colonnes doivent etre ajustees
// sur la valeur, pas sur l'en-tete : mettre des abreviations, et l'infobulle du
// nom complet ») ; le nom complet : LIBELLES_REGLAGES_IA.
const ABREVIATIONS_COLONNES_COMPARAISON_IA = {
  version: 'V.',
  livre: 'Liv.',
  elagage: 'Él.',
  style: 'Sty.',
  gain: 'Gain',
  gainScore: 'sc.G',
  perte: 'Perte',
  perteScore: 'sc.P',
  centre: 'Ctr',
  etendueCentre: 'ec',
  etendueCases: 'ea',
  etendueReference: 'da',
  etendueProfondeur: 'ep',
  elagageReponse: 'er',
  elagageSuite: 'es',
  elagageFin: 'ef',
  cohesion: 'Coh.',
  compacite: 'Cmp.',
  bordSoi: 'B.m',
  bordAdverse: 'B.a',
  sumito: 'Sum.',
  sumito32: '3/2',
  sumito31: '3/1',
  sumito21: '2/1',
  sumitoVide: 'sv',
  menaceEjection: 'Men.',
  fourchette: 'Fch.',
  piege: 'Pièg.',
};
// Les profils coches remontent en tete (saab, 2026-10-08 : « des fichiers
// eloignes ne sont pas bien comparables : soit les faire remonter, soit coche
// de ceux qu'on veut ») ; CET appareil retient les coches.
const CLE_COCHES_COMPARAISON_IA = 'kaah-comparaison-ia-coches';

function lireCochesComparaisonIA() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(CLE_COCHES_COMPARAISON_IA) ?? '[]'));
  } catch {
    return new Set();
  }
}

function retenirCochesComparaisonIA(coches) {
  try {
    window.localStorage.setItem(CLE_COCHES_COMPARAISON_IA, JSON.stringify([...coches]));
  } catch {
    // Tant pis : decoches a la prochaine ouverture.
  }
}

// Une colonne retrecie a la main reste lisible.
const LARGEUR_MIN_COLONNE_PX = 24;

// `elements` : { bouton, dialogue, tableau, fermer } ; `choisir(nom)` : le
// profil touche, dans Reglages.
function demarrerComparaisonIA(elements, choisir) {
  const { tableau } = elements;
  // Les largeurs choisies a la main, par colonne, gardees d'une ouverture a l'autre.
  const largeurs = new Map();
  let casesPliees = false;

  const cellule = (balise, texte, classe) => {
    const element = document.createElement(balise);
    element.textContent = texte;
    if (classe) element.className = classe;
    return element;
  };

  // « Ce qu'il cherche », plie par defaut (saab, 2026-10-03 : « pour voir
  // qu'une ligne par colonne, afin de mieux pouvoir comparer ») : une ligne
  // coupee, le texte entier au survol ; toucher son titre le deplie ou le replie.
  function basculerDescriptions(titre) {
    const pliees = tableau.classList.toggle('descriptions-pliees');
    titre.firstChild.textContent = `${pliees ? '▸' : '▾'} Ce qu'il cherche`;
    ajusterLargeurDuTableau();
  }

  // Les cases d4 a a2 (version 3), repliees ou non en touchant le titre Centre.
  function titreDuCentre() {
    return `${casesPliees ? '▸' : '▾'} ${ABREVIATIONS_COLONNES_COMPARAISON_IA.centre}`;
  }
  function basculerCases(titre) {
    casesPliees = !casesPliees;
    tableau.classList.toggle('cases-pliees', casesPliees);
    titre.firstChild.textContent = titreDuCentre();
    ajusterLargeurDuTableau();
  }

  // Varier la largeur des colonnes (saab, 2026-10-03) : tirer le bord droit
  // d'un titre. La premiere fois, toutes les largeurs sont figees telles
  // qu'affichees (largeurs fixes : le texte trop long est coupé).
  const titres = () => [...tableau.querySelectorAll('th[data-colonne]')];
  const estVisible = (titre) => getComputedStyle(titre).display !== 'none';

  function ajusterLargeurDuTableau() {
    if (!tableau.classList.contains('largeurs-fixees')) return;
    const total = titres()
      .filter(estVisible)
      .reduce((somme, titre) => somme + (largeurs.get(titre.dataset.colonne) ?? titre.getBoundingClientRect().width), 0);
    tableau.style.width = `${total}px`;
  }

  function appliquerLargeurs() {
    if (largeurs.size === 0) return;
    for (const titre of titres()) {
      const largeur = largeurs.get(titre.dataset.colonne);
      if (largeur) titre.style.width = `${largeur}px`;
    }
    tableau.classList.add('largeurs-fixees');
    ajusterLargeurDuTableau();
  }

  // Les colonnes repliees comprises : depliees un instant, pour les mesurer.
  function figerLargeurs() {
    const plis = ['cases-pliees'].filter((pli) => tableau.classList.contains(pli));
    tableau.classList.remove(...plis);
    for (const titre of titres()) if (!largeurs.has(titre.dataset.colonne)) largeurs.set(titre.dataset.colonne, titre.getBoundingClientRect().width);
    tableau.classList.add(...plis);
    appliquerLargeurs();
  }

  function poignee(titre) {
    const element = cellule('span', '', 'poignee-colonne');
    element.title = 'Tirer pour élargir ou rétrécir la colonne';
    element.addEventListener('click', (evenement) => evenement.stopPropagation());
    element.addEventListener('pointerdown', (evenement) => {
      evenement.preventDefault();
      evenement.stopPropagation();
      figerLargeurs();
      const depart = evenement.clientX;
      const largeurDeDepart = largeurs.get(titre.dataset.colonne);
      element.setPointerCapture(evenement.pointerId);
      const suivre = (deplacement) => {
        largeurs.set(titre.dataset.colonne, Math.max(LARGEUR_MIN_COLONNE_PX, largeurDeDepart + deplacement.clientX - depart));
        appliquerLargeurs();
      };
      element.addEventListener('pointermove', suivre);
      element.addEventListener('pointerup', () => element.removeEventListener('pointermove', suivre), { once: true });
    });
    return element;
  }

  function titreDeColonne(colonne, texte, classe) {
    const titre = cellule('th', texte, classe);
    titre.dataset.colonne = colonne;
    titre.append(poignee(titre));
    return titre;
  }

  // Les ajouts (sv, ec, ea, da) : caches hors d'une version de travail (styles.css, poids-ajout).
  const classeDeColonne = (cle) => (CASES_REPLIABLES_IA.includes(cle) ? 'colonne-case-repliable' : CLES_OPTIONS_IA.includes(cle) ? 'poids-ajout' : '');

  function remplir() {
    const colonnes = { ...LIBELLES_REGLAGES_IA, ...COLONNES_ESSAI_IA, ...ABREVIATIONS_COLONNES_COMPARAISON_IA };
    const coches = lireCochesComparaisonIA();
    const tousLesProfils = listerProfilsIA();
    const profils = [...tousLesProfils.filter((profil) => coches.has(profil.nom)), ...tousLesProfils.filter((profil) => !coches.has(profil.nom))];
    const entete = document.createElement('tr');
    const titreDescription = titreDeColonne('description', "▸ Ce qu'il cherche", 'comparaison-titre-pliable');
    titreDescription.title = 'Toucher pour déplier ou replier les descriptions';
    titreDescription.addEventListener('click', () => basculerDescriptions(titreDescription));
    tableau.classList.add('descriptions-pliees');
    tableau.classList.toggle('cases-pliees', casesPliees);
    const titresReglages = CLES_REGLAGES_IA.map((cle) => {
      const titre = titreDeColonne(cle, colonnes[cle], classeDeColonne(cle));
      titre.title = LIBELLES_REGLAGES_IA[cle];
      return titre;
    });
    const titreCentre = titresReglages[CLES_REGLAGES_IA.indexOf('centre')];
    titreCentre.firstChild.textContent = titreDuCentre();
    titreCentre.classList.add('comparaison-titre-pliable');
    titreCentre.title = 'Toucher pour montrer ou cacher les cases d4 à a2 de la version 3 (e5 et a1 restent)';
    titreCentre.addEventListener('click', () => basculerCases(titreCentre));
    const titreCoche = cellule('th', '✓');
    titreCoche.title = 'Cochez les profils à comparer : ils remontent en tête';
    entete.append(titreCoche, titreDeColonne('date', 'Date'), titreDeColonne('profil', 'Profil IA', 'comparaison-profil'), titreDescription, ...titresReglages);
    const lignes = lignesComparaisonIA(profils).map((ligne, rang) => {
      const tr = document.createElement('tr');
      const description = cellule('td', ligne.description, 'comparaison-description');
      description.title = ligne.description;
      const coche = document.createElement('input');
      coche.type = 'checkbox';
      coche.checked = coches.has(ligne.nom);
      coche.title = 'Comparer ce profil : il remonte en tête';
      coche.addEventListener('click', (evenement) => evenement.stopPropagation());
      coche.addEventListener('change', () => {
        if (coche.checked) coches.add(ligne.nom);
        else coches.delete(ligne.nom);
        retenirCochesComparaisonIA(coches);
        remplir();
      });
      const caseCoche = cellule('td', '');
      caseCoche.append(coche);
      tr.append(
        caseCoche,
        cellule('td', libelleDateHistoriqueIA(ligne.date)),
        cellule('td', libelleProfilIA(profils[rang]), 'comparaison-profil'),
        description,
        ...CLES_REGLAGES_IA.map((cle) => {
          const texte = cle === 'style' ? ABREVIATIONS_STYLES_COMPARAISON_IA[profils[rang].style] : ligne.reglages[cle].texte;
          const td = cellule('td', texte, classeDeColonne(cle));
          poserCouleurIA(td, ligne.reglages[cle].couleur);
          return td;
        })
      );
      // Le nom prend la plus forte de ses couleurs, comme partout (de la valeur au fichier).
      if (coche.checked) tr.classList.add('profil-coche-comparaison');
      poserCouleurIA(tr.children[2], couleurLaPlusForte(Object.values(ligne.reglages).map((reglage) => reglage.couleur)));
      tr.title = 'Toucher pour choisir ce profil dans Réglages';
      tr.addEventListener('click', () => {
        elements.dialogue.close();
        choisir(ligne.nom);
      });
      return tr;
    });
    tableau.replaceChildren(entete, ...lignes);
    appliquerLargeurs();
  }

  elements.bouton.addEventListener('click', () => {
    remplir();
    elements.dialogue.showModal();
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
}
