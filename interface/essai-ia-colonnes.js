// Les COLONNES des termes de l'evaluation (interface/essai-ia.js, et les panneaux, la
// comparaison, le graphique des groupes qui les reprennent) : leurs en-tetes courts, une
// valeur ecrite (« +12 », « · », « Gagne »), une ligne de tableau. Extrait
// d'interface/essai-ia.js (regle des 200 lignes).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : VALEUR_VICTOIRE_IA
// (moteur/ia-evaluation.js) vient d'un fichier charge avant celui-ci.

const COLONNES_ESSAI_IA = {
  gain: 'Gain',
  // « sc. Gain » (saab, 2026-10-04) : une colonne retrecie se distingue encore de Gain.
  gainScore: 'sc. Gain',
  perte: 'Perte',
  perteScore: 'sc. Perte',
  centre: 'Centre',
  etendueCentre: 'Étend.',
  etendueCases: 'Étend. c.',
  cohesion: 'Cohés.',
  compacite: 'Compac.',
  cases: 'Cases',
  bordSoi: 'Bord m.',
  bordAdverse: 'Bord a.',
  sumito: 'Sumito',
  sumito32: 'Sum. 3/2',
  sumito31: 'Sum. 3/1',
  sumito21: 'Sum. 2/1',
  sumitoVide: 'Sum. vide',
  menaceEjection: 'Menace',
  fourchette: 'Fourch.',
  piege: 'Piège',
};

function texteValeurEssai(valeur) {
  if (Math.abs(valeur) >= VALEUR_VICTOIRE_IA / 2) return valeur > 0 ? 'Gagne' : 'Perd';
  const arrondi = Math.round(valeur);
  return arrondi > 0 ? `+${arrondi}` : arrondi === 0 ? '·' : String(arrondi);
}

function ligneDeTableau(cellules, balise = 'td') {
  const tr = document.createElement('tr');
  for (const contenu of cellules) {
    const cellule = document.createElement(balise);
    cellule.textContent = contenu;
    tr.appendChild(cellule);
  }
  return tr;
}
