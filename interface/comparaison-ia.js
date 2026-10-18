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
// COLONNES_ESSAI_IA (interface/essai-ia.js), profilsIADansLOrdre (moteur/profils-ia.js),
// suffixeDeVersionIA (moteur/ia.js), numeroDesAjoutsDe, infobulleDuProfilIA (interface/profils-ia.js), groupeDuReglage (moteur/ia-groupes.js),
// colorerSelonLeGroupe, groupesQuiCommencent (interface/groupes-ia.js),
// ABREVIATIONS_STYLES_COMPARAISON_IA, ABREVIATIONS_COLONNES_COMPARAISON_IA, celluleComparaison,
// classeDeColonneComparaisonIA, creerLesColonnesDeLaComparaison (interface/comparaison-ia-colonnes.js)
// viennent de fichiers charges avant celui-ci, ou ne servent qu'une fois la page chargee.
//
// Saab, 2026-10-16 : « figer la colonne Profil IA, qu'on puisse faire défiler les autres
// colonnes » (styles.css, comparaison-fige) ; « mettre aussi dans l'infobulle le nom
// complet du profil avec ses suffixes » ; les profils dans l'ordre Agr/Nor/Def
// (profilsIADansLOrdre) ; les reglages dans l'ordre et la couleur de leur groupe, sous une
// ligne qui nomme les groupes.

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

// `elements` : { bouton, dialogue, tableau, fermer } ; `choisir(nom)` : le
// profil touche, dans Reglages.
function demarrerComparaisonIA(elements, choisir) {
  const { tableau } = elements;
  const { titreDeColonne, appliquerLargeurs, ajusterLargeurDuTableau, figerLesColonnesDuProfil } = creerLesColonnesDeLaComparaison(tableau);
  let casesPliees = false;
  const cellule = celluleComparaison;
  const classeDeColonne = classeDeColonneComparaisonIA;

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

  function remplir() {
    const colonnes = { ...LIBELLES_REGLAGES_IA, ...COLONNES_ESSAI_IA, ...ABREVIATIONS_COLONNES_COMPARAISON_IA };
    const coches = lireCochesComparaisonIA();
    // Avec leur Pn, pour l'ordre (une famille reste ensemble, moteur/profils-ia.js).
    const tousLesProfils = listerProfilsIA().map((profil) => ({ ...profil, numeroDesAjouts: numeroDesAjoutsDe(profil.poids) }));
    const profils = profilsIADansLOrdre(tousLesProfils.filter((profil) => coches.has(profil.nom))).concat(profilsIADansLOrdre(tousLesProfils.filter((profil) => !coches.has(profil.nom))));
    const entete = document.createElement('tr');
    const titreDescription = titreDeColonne('description', "▸ Ce qu'il cherche", 'comparaison-titre-pliable');
    titreDescription.title = 'Toucher pour déplier ou replier les descriptions';
    titreDescription.addEventListener('click', () => basculerDescriptions(titreDescription));
    tableau.classList.add('descriptions-pliees');
    tableau.classList.toggle('cases-pliees', casesPliees);
    const titresReglages = CLES_REGLAGES_IA.map((cle) => {
      const titre = colorerSelonLeGroupe(titreDeColonne(cle, colonnes[cle], classeDeColonne(cle)), groupeDuReglage(cle));
      titre.title = groupeDuReglage(cle) ? `${LIBELLES_REGLAGES_IA[cle]} (${groupeDuReglage(cle).libelle})` : LIBELLES_REGLAGES_IA[cle];
      return titre;
    });
    // La ligne des groupes, au-dessus : le nom de chacun sur sa premiere colonne.
    const groupes = document.createElement('tr');
    groupes.className = 'comparaison-groupes';
    const debuts = groupesQuiCommencent(CLES_REGLAGES_IA, groupeDuReglage);
    groupes.append(
      cellule('th', '', 'comparaison-coche'),
      cellule('th', '', 'comparaison-profil'),
      cellule('th', ''),
      cellule('th', ''),
      ...CLES_REGLAGES_IA.map((cle, rang) => colorerSelonLeGroupe(cellule('th', debuts[rang]?.libelle ?? '', classeDeColonne(cle)), debuts[rang]))
    );
    const titreCentre = titresReglages[CLES_REGLAGES_IA.indexOf('centre')];
    titreCentre.firstChild.textContent = titreDuCentre();
    titreCentre.classList.add('comparaison-titre-pliable');
    titreCentre.title = 'Toucher pour montrer ou cacher les cases d4 à a2 de la version 3 (e5 et a1 restent)';
    titreCentre.addEventListener('click', () => basculerCases(titreCentre));
    const titreCoche = cellule('th', '✓', 'comparaison-coche');
    titreCoche.title = 'Cochez les profils à comparer : ils remontent en tête';
    entete.append(titreCoche, titreDeColonne('profil', 'Profil IA', 'comparaison-profil'), titreDeColonne('date', 'Date'), titreDescription, ...titresReglages);
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
      const caseCoche = cellule('td', '', 'comparaison-coche');
      caseCoche.append(coche);
      const nom = cellule('td', libelleProfilIA(profils[rang]), 'comparaison-profil');
      marquerSiProfilParDefaut(nom, profils[rang].nom);
      nom.title = `${infobulleDuProfilIA(profils[rang])}\n\nToucher : le choisir dans Réglages`;
      tr.append(
        caseCoche,
        nom,
        cellule('td', libelleDateHistoriqueIA(ligne.date)),
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
      poserCouleurIA(nom, couleurLaPlusForte(Object.values(ligne.reglages).map((reglage) => reglage.couleur)));
      tr.title = 'Toucher pour choisir ce profil dans Réglages';
      tr.addEventListener('click', () => {
        elements.dialogue.close();
        choisir(ligne.nom);
      });
      return tr;
    });
    tableau.replaceChildren(groupes, entete, ...lignes);
    appliquerLargeurs();
    figerLesColonnesDuProfil();
  }

  elements.bouton.addEventListener('click', () => {
    elements.dialogue.showModal();
    remplir(); // ouverte d'abord : les largeurs a figer se mesurent
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
}
