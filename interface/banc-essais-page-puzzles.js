// Les tableaux de l'etape 2 du banc d'essais (saab, 2026-10-08), dans la boite et
// dans la page exportee : les PUZZLES joues (reglages complets d'abord, puis le
// resume par essai et par nombre de tours, puis chaque puzzle, essai par essai)
// et les puzzles RECOLTES dans les parties.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : echapperBanc, nombreBanc,
// largeurCommune, enteteBanc, reglagesCompletsDuBanc
// (interface/banc-essais-page.js) viennent de fichiers charges avant celui-ci.

// Le verdict du solveur, quand on l'a demande : [signe, classe, debut de l'infobulle].
const SIGNES_DES_VERDICTS = {
  valide: ['✓', 'banc-essai', 'Bravo (solveur) : '],
  invalide: ['≈', 'banc-moins-sur', "Gagné, mais pas la solution (solveur) : "],
  indetermine: ['?', 'banc-moins-sur', 'Gagné, trop long à vérifier (solveur) : '],
  erreur: ['?', 'banc-moins-sur', 'Gagné, le solveur a échoué : '],
};

const toursDuResume = (resume) => [...new Set(resume.flatMap((r) => Object.keys(r.parTours).map(Number)))].sort((a, b) => a - b);

function resumeDesPuzzlesHtml(essais, resume) {
  const tours = toursDuResume(resume);
  const titres = ['Résolus', ...tours.map((t) => `${t} tour${t > 1 ? 's' : ''}`), "Temps de l'essai par puzzle"];
  const valeurs = resume.map((r) => [`${r.resolus} / ${r.joues}`, ...tours.map((t) => (r.parTours[t] ? `${r.parTours[t].resolus} / ${r.parTours[t].joues}` : '—')), `${nombreBanc(r.secondes)} s`]);
  const largeur = largeurCommune(titres, valeurs.flat());
  const meilleur = Math.max(...resume.map((r) => r.resolus));
  const lignes = essais.map((essai, rang) => {
    const [resolus, ...autres] = valeurs[rang];
    const classe = resume[rang].joues > 0 && resume[rang].resolus === meilleur ? 'banc-mieux' : '';
    return `<tr class="${classe}"><td>${rang + 1}. ${echapperBanc(essai.nom)}</td><td><b>${resolus}</b></td>${autres.map((valeur) => `<td>${valeur}</td>`).join('')}</tr>`;
  });
  return `<table class="banc-tableau"><tr><th>Essai</th>${titres.map((titre) => enteteBanc(titre, largeur)).join('')}</tr>${lignes.join('')}</table>`;
}

// Chaque puzzle joue : une ligne, une colonne par essai (✓ resolu, ✗ non ; avec
// le solveur, ≈ gagne mais pas la solution, ? trop long a verifier ; ses coups
// en infobulle).
function grilleDesPuzzlesHtml(essais, resultats) {
  // Par nom (Mini_PZL_E_0001, 0002...), pas dans l'ordre ou ils finissent.
  const noms = [...new Set(resultats.map((resultat) => resultat.puzzle.nom))].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  const titres = essais.map((essai, rang) => `${rang + 1}. ${essai.nom}`);
  const largeur = largeurCommune(titres, ['✓']);
  const lignes = noms.map((nom) => {
    const siens = resultats.filter((resultat) => resultat.puzzle.nom === nom);
    const { puzzle } = siens[0];
    const cellules = essais.map((_, essai) => {
      const resultat = siens.find((autre) => autre.essai === essai);
      if (!resultat) return '<td></td>';
      const [signe, classe, pourquoi] = SIGNES_DES_VERDICTS[resultat.verdict] ?? (resultat.resolu ? ['✓', 'banc-essai', ''] : ['✗', 'banc-rate', '']);
      return `<td class="${classe}" title="${echapperBanc(`${pourquoi}${resultat.coups.join(' ')}`)}">${signe}</td>`;
    });
    return `<tr><td>${echapperBanc(nom)}</td><td>${puzzle.toursMaximum}</td><td>${puzzle.campGagnant === 'noir' ? 'Noir' : 'Blanc'}</td>${cellules.join('')}</tr>`;
  });
  return `<table class="banc-tableau"><tr><th>Puzzle</th><th>Tours</th><th>Gagnant</th>${titres.map((titre) => enteteBanc(titre, largeur)).join('')}</tr>${lignes.join('')}</table>`;
}

// Le contenu en mode puzzles : { reference (la defense), essais, resultats, resume, parametres }.
function contenuDesPuzzles({ reference, essais, resultats, resume, parametres }) {
  const { toursMin, toursMax, nombreDePuzzles, defenseComplete, solveur } = parametres;
  const defense = defenseComplete ? "jusqu'à la fin du puzzle" : "jusqu'à 6 demi-coups";
  const resolu = solveur ? 'gagné dans les tours du puzzle ET vérifié par le solveur (« Bravo »)' : 'gagné dans les tours du puzzle';
  return `<p class="note-reglages">${nombreDePuzzles} puzzles de ${toursMin} à ${toursMax} tours. Chaque profil attaque avec son niveau et sa réflexion ; la référence défend, sans élagage, ${defense}. Résolu : ${resolu}.</p>
<h3>Les réglages complets (la référence défend ; en orange : ce qui diffère d'elle)</h3>${reglagesCompletsDuBanc(reference, essais)}
<h3>Résumé</h3>${resumeDesPuzzlesHtml(essais, resume)}
<h3>Les puzzles</h3><p class="note-reglages">✓ résolu, ✗ non${solveur ? ' ; ≈ gagné mais pas la solution, ? trop long à vérifier' : ''} ; les coups joués en infobulle.</p>${grilleDesPuzzlesHtml(essais, resultats)}`;
}

// Les puzzles recoltes dans les parties : [{ entree (KAAWA), numero, tours }].
function recolteHtml(recoltes, toursMini) {
  const auMoins = `au moins ${toursMini} tour${toursMini > 1 ? 's' : ''}`;
  if (recoltes.length === 0) return `<h3>Puzzles récoltés</h3><p class="note-reglages">Aucun pour l'instant (${auMoins}).</p>`;
  const lignes = recoltes.map(({ entree, numero, tours }) => `<tr><td>${echapperBanc(entree.PZL_name)}</td><td>${tours}</td><td>${entree.winner}</td><td>${numero}</td><td class="banc-coups">${echapperBanc(entree.pos)}</td></tr>`);
  return `<h3>Puzzles récoltés (${recoltes.length}, ${auMoins})</h3><p class="note-reglages">« Exporter les puzzles » les télécharge au format de KAAWA ; « Ajouter à My » les range avec vos puzzles.</p>
<table class="banc-tableau"><tr><th>Nom</th><th>Tours</th><th>Gagnant</th><th>Partie n°</th><th>Position</th></tr>${lignes.join('')}</table>`;
}
