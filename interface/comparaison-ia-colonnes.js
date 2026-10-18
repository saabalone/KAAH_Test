// Les COLONNES du tableau des profils IA compares (interface/comparaison-ia.js) : leurs
// en-tetes courts, les cases qui se replient, la largeur de chacune tiree a la main, et
// la coche et le profil figes a gauche. Extrait d'interface/comparaison-ia.js (regle des
// 200 lignes).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_CASES_IA_V3
// (moteur/ia-evaluation-v3.js), CLES_OPTIONS_IA (moteur/ia-ajouts.js) viennent de fichiers
// charges avant celui-ci.

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
  etendueCentre: 'Ec',
  etendueCases: 'Ea',
  etendueReference: 'Da',
  etendueProfondeur: 'Ep',
  elagageReponse: 'Er',
  elagageSuite: 'Es',
  elagageFin: 'Ef',
  elagageFinNiveau: 'Fn',
  gainFibonacci: 'Gf',
  perteFibonacci: 'Pf',
  piegeProgressifAdverse: 'Ppa',
  piegeProgressifMien: 'Ppm',
  piegeGagnantAdverse: 'Pga',
  piegeGagnantMien: 'Pgm',
  cohesion: 'Coh.',
  compacite: 'Cmp.',
  bordSoi: 'B.m',
  bordAdverse: 'B.a',
  sumito: 'Sum.',
  sumito32: '3/2',
  sumito31: '3/1',
  sumito21: '2/1',
  sumitoVide: 'Sv',
  menaceEjection: 'Men.',
  fourchette: 'Fch.',
  piege: 'Pièg.',
};

// Une colonne retrecie a la main reste lisible.
const LARGEUR_MIN_COLONNE_PX = 24;

function celluleComparaison(balise, texte, classe) {
  const element = document.createElement(balise);
  element.textContent = texte;
  if (classe) element.className = classe;
  return element;
}

// Les ajouts (Sv, Ec, Ea, Da...) : caches hors d'une version de travail (styles.css, poids-ajout).
const classeDeColonneComparaisonIA = (cle) => (CASES_REPLIABLES_IA.includes(cle) ? 'colonne-case-repliable' : CLES_OPTIONS_IA.includes(cle) ? 'poids-ajout' : '');

// Les largeurs et les colonnes figees de `tableau` : { titreDeColonne(colonne, texte,
// classe), appliquerLargeurs(), ajusterLargeurDuTableau(), figerLesColonnesDuProfil() }.
function creerLesColonnesDeLaComparaison(tableau) {
  // Les largeurs choisies a la main, par colonne, gardees d'une ouverture a l'autre.
  const largeurs = new Map();
  const cellule = celluleComparaison;

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

  // La coche et le profil restent a gauche quand on defile (styles.css, position sticky) :
  // le profil juste apres la coche ; les titres juste sous la ligne des groupes.
  function figerLesColonnesDuProfil() {
    const largeurDeLaCoche = tableau.querySelector('th.comparaison-coche')?.getBoundingClientRect().width ?? 0;
    for (const profil of tableau.querySelectorAll('.comparaison-profil')) profil.style.left = `${largeurDeLaCoche}px`;
    const hauteurDesGroupes = tableau.querySelector('tr.comparaison-groupes')?.getBoundingClientRect().height ?? 0;
    for (const titre of tableau.querySelectorAll('tr:nth-child(2) th')) titre.style.top = `${hauteurDesGroupes}px`;
  }

  return { titreDeColonne, appliquerLargeurs, ajusterLargeurDuTableau, figerLesColonnesDuProfil };
}
