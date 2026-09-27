// Les rubriques repliables de Reglages (saab, 2026-09-27) : un <details>
// natif par rubrique (comme l'Aide), et CET appareil retient lesquelles sont
// ouvertes — on retrouve la boite comme on l'a laissee. Fermees au tout
// premier affichage : la liste des rubriques tient alors sur un ecran.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const CLE_RUBRIQUES_REGLAGES_OUVERTES = 'kaah-reglages-rubriques-ouvertes';

function lireRubriquesOuvertes() {
  try {
    const noms = JSON.parse(window.localStorage.getItem(CLE_RUBRIQUES_REGLAGES_OUVERTES) ?? '[]');
    return new Set(Array.isArray(noms) ? noms : []);
  } catch {
    return new Set();
  }
}

function demarrerRubriquesReglages(dialogue) {
  const rubriques = [...dialogue.querySelectorAll('details.rubrique-reglages')];
  const ouvertes = lireRubriquesOuvertes();
  for (const rubrique of rubriques) {
    rubrique.open = ouvertes.has(rubrique.dataset.rubrique);
    rubrique.addEventListener('toggle', () => {
      const noms = rubriques.filter((r) => r.open).map((r) => r.dataset.rubrique);
      try {
        window.localStorage.setItem(CLE_RUBRIQUES_REGLAGES_OUVERTES, JSON.stringify(noms));
      } catch {
        // Tant que la page reste ouverte, les rubriques restent comme elles sont.
      }
    });
  }
}
