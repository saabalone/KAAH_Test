// Les petits champs du banc d'essais (interface/banc-essais-choix.js) : le
// NIVEAU et la REFLEXION de chaque profil, lus depuis ce qu'on y tape, avec leurs
// fleches ▲ ▼ (saab, 2026-10-08 : « les -/+ prennent trop de place, on garde
// que les fleches ») — le niveau et la reflexion de 1 en 1, un appui prolonge va vite
// (2026-10-14 : « pourquoi les tps Réfl. sont bloqués à 60 s, il faudrait que le niveau
// soit toujours atteint si on veut ... mettre tout au pas -/+ 1 ») : la reflexion n'a
// plus de plafond, et 0 veut dire sans limite (le niveau est toujours atteint).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_REGLAGES_IA, LIBELLES_REGLAGES_IA
// (moteur/historique-profil-ia.js), CLES_OPTIONS_IA (moteur/ia-ajouts.js), CLES_CASES_IA_V3
// (moteur/ia-evaluation-v3.js), GROUPES_DE_L_EVALUATION_IA (moteur/ia-groupes.js),
// CLE_CASES_BANC, PREFIXE_GROUPE_BANC, REGLAGES_DE_RECHERCHE_BANC (moteur/banc-essais.js), brancherAppuiProlonge
// (interface/appui-prolonge.js) vient d'un fichier charge avant celui-ci.

const NIVEAU_MAX_BANC = 8;
const TEMPS_MIN_BANC = 0.5;
// La reflexion « sans limite » : le niveau est toujours atteint.
const TEMPS_SANS_LIMITE_BANC = 0;
// Par defaut, le niveau le plus haut sans limite de temps (saab, 2026-10-18 : « dans LabAl
// mettre les niveaux à 8 et Réfl à 0 par défaut »).
const NIVEAU_PAR_DEFAUT_BANC = NIVEAU_MAX_BANC;
const TEMPS_PAR_DEFAUT_BANC = TEMPS_SANS_LIMITE_BANC;

const niveauDuBanc = (texte, defaut) => {
  const niveau = Number(texte);
  return texte !== '' && Number.isInteger(niveau) && niveau >= 1 && niveau <= NIVEAU_MAX_BANC ? niveau : defaut;
};
const tempsDuBanc = (texte, defaut) => {
  const temps = Number(String(texte).replace(',', '.'));
  return texte !== '' && (temps >= TEMPS_MIN_BANC || temps === TEMPS_SANS_LIMITE_BANC) ? temps : defaut;
};

// Un reglage de recherche (niveau ou reflexion) avec ses fleches ▲ ▼ (et celles du clavier) : `valeur` (celle du
// profil, ou celle par defaut tant qu'on n'y a pas touche), `voisin(valeur,
// sens)` (la valeur d'un cran au-dessus, sens 1, ou au-dessous, -1),
// `surChange(texte)`.
function reglageDeRecherche(valeur, voisin, surChange, titre) {
  const bloc = document.createElement('span');
  bloc.className = 'banc-reglage-recherche';
  const champ = document.createElement('input');
  champ.type = 'text';
  champ.inputMode = 'decimal';
  champ.className = 'banc-champ-recherche';
  champ.value = String(valeur).replace('.', ',');
  champ.title = titre;
  champ.addEventListener('input', () => surChange(champ.value.trim()));
  const bouton = (texte, sens) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'banc-fleche';
    element.textContent = texte;
    element.title = `${titre} : ${sens > 0 ? 'un cran de plus' : 'un cran de moins'}`;
    brancherAppuiProlonge(element, () => {
      champ.value = String(voisin(Number(champ.value.replace(',', '.')), sens)).replace('.', ',');
      surChange(champ.value);
      champ.dispatchEvent(new Event('input', { bubbles: true })); // le total et le reste suivent
    });
    return element;
  };
  // Deux petites fleches empilees (saab : « les -/+ prennent trop de place, on
  // garde que les fleches »).
  const moins = bouton('▼', -1);
  const plus = bouton('▲', 1);
  const fleches = document.createElement('span');
  fleches.className = 'banc-fleches';
  fleches.append(plus, moins);
  // Les fleches du clavier aussi (saab : « et/ou des fleches »).
  champ.addEventListener('keydown', (evenement) => {
    if (evenement.key !== 'ArrowUp' && evenement.key !== 'ArrowDown') return;
    evenement.preventDefault();
    (evenement.key === 'ArrowUp' ? plus : moins).click();
  });
  bloc.append(champ, fleches);
  return bloc;
}

const niveauVoisin = (niveau, sens) => Math.min(NIVEAU_MAX_BANC, Math.max(1, (Number.isInteger(niveau) ? niveau : NIVEAU_PAR_DEFAUT_BANC) + sens));
// Une seconde de plus ou de moins ; en dessous d'une seconde : sans limite (0).
const tempsVoisin = (temps, sens) => Math.max(TEMPS_SANS_LIMITE_BANC, Math.round(Number.isFinite(temps) ? temps : TEMPS_PAR_DEFAUT_BANC) + sens);

// Les choix de « Faire varier » (extrait d'interface/banc-essais-choix.js, regle des 200
// lignes) : le niveau et la reflexion, puis chaque poids dans l'ordre des groupes — les 4
// groupes avant le Gain, les 9 cases ensemble avant e5 — dans chacun des `selects`.
const LIBELLE_CASES_BANC = 'Cases (e5 à a1) ×';
const LIBELLES_RECHERCHE_CHOIX_BANC = { niveau: 'Niveau', temps: 'Réflexion max (s)' };
function remplirLesChoixDesVariations(selects) {
  // Les ajouts (sv, ec...) seulement dans une version de travail (saab,
  // 2026-10-08 : le banc se publie, les suffixes pas encore).
  const avecLesAjouts = document.body.classList.contains('version-de-travail');
  const poids = CLES_REGLAGES_IA.filter((cle) => !['version', 'livre', 'style'].includes(cle) && (avecLesAjouts || !CLES_OPTIONS_IA.includes(cle)));
  const options = () => [
    ...REGLAGES_DE_RECHERCHE_BANC.map((cle) => new Option(LIBELLES_RECHERCHE_CHOIX_BANC[cle], cle)),
    ...poids.flatMap((cle) => [
      ...(cle === CLES_CASES_IA_V3[0] ? [new Option(LIBELLE_CASES_BANC, CLE_CASES_BANC)] : []),
      // Les 4 groupes de l'evaluation (moteur/ia-groupes.js), avant le Gain.
      ...(cle === 'gain' ? GROUPES_DE_L_EVALUATION_IA.map((groupe) => new Option(`${groupe.libelle} × (groupe)`, `${PREFIXE_GROUPE_BANC}${groupe.cle}`)) : []),
      new Option(LIBELLES_REGLAGES_IA[cle] ?? cle, cle),
    ]),
  ];
  for (const select of selects) {
    const choisie = select.value; // garder le choix quand on rouvre la boite
    select.replaceChildren(new Option('—', ''), ...options());
    select.value = choisie;
    if (select.selectedIndex < 0) select.value = '';
  }
}
