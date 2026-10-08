// Les petits champs du banc d'essais (interface/banc-essais-choix.js) : le
// NIVEAU et la REFLEXION de chaque profil, lus depuis ce qu'on y tape, avec leurs
// fleches ▲ ▼ (saab, 2026-10-08 : « les -/+ prennent trop de place, on garde
// que les fleches ») — le niveau de 1 en 1, la reflexion de palier en palier.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : palierVoisin
// (interface/choix-joueurs.js) vient d'un fichier charge avant celui-ci.

const NIVEAU_MAX_BANC = 8;
const NIVEAU_PAR_DEFAUT_BANC = 5;
const TEMPS_MIN_BANC = 0.5;
const TEMPS_PAR_DEFAUT_BANC = 30;

const niveauDuBanc = (texte, defaut) => {
  const niveau = Number(texte);
  return texte !== '' && Number.isInteger(niveau) && niveau >= 1 && niveau <= NIVEAU_MAX_BANC ? niveau : defaut;
};
const tempsDuBanc = (texte, defaut) => {
  const temps = Number(String(texte).replace(',', '.'));
  return texte !== '' && temps >= TEMPS_MIN_BANC ? temps : defaut;
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
    element.addEventListener('click', () => {
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
const tempsVoisin = (temps, sens) => palierVoisin(Number.isFinite(temps) ? temps : TEMPS_PAR_DEFAUT_BANC, sens);
