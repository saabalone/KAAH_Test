// La recherche de KAI++ par premier coup (saab, 2026-10-02 : « sur quel 1er
// coup l'IA a fait ces recherches aux differents niveaux (ou combien si > 10
// et lesquels 10) et les meilleures sequences trouvees sur chacun ... pour
// voir si elle va chercher trop de coups pour rien ») : un tableau sous
// Reflexion IA, sur ordinateur seulement (styles.css : il faut de la place).
// Pour chaque profondeur finie, la plus profonde en haut : combien de premiers
// coups, combien de positions ; puis les 10 meilleurs premiers coups — leur
// valeur (« ≤ » : ecarte par l'elagage, il vaut au plus cela), les positions
// examinees sous lui et leur part, sa sequence ; et ce qu'ont coute les autres.
// La derniere recherche reste affichee apres le coup.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : libelleEvaluation
// (moteur/ia.js), numeroDeTour (moteur/arbre.js) viennent de fichiers charges
// avant celui-ci.

const POURCENT_RECHERCHE_IA = 100;
const FORMAT_DES_NOMBRES = new Intl.NumberFormat('fr-FR');

function partEnPourcent(partie, total) {
  return total > 0 ? `${Math.round((partie / total) * POURCENT_RECHERCHE_IA)} %` : '';
}

// `boite` : le <details> du tableau. Renvoie { afficher(enCours) } — `enCours`
// : la ligne en cours de Reflexion IA (interface/ia.js), dont `details` (KAI++).
function demarrerRechercheIA(boite) {
  const corps = boite.querySelector('tbody');
  const note = boite.querySelector('.note-recherche-ia');
  let detailsAffiches = null;

  function cellule(texte, classe) {
    const td = document.createElement('td');
    td.textContent = texte;
    if (classe) td.className = classe;
    return td;
  }

  function lignesDeLaProfondeur({ profondeur, coups, noeuds, lignes }) {
    const sousLesMeilleurs = lignes.reduce((total, ligne) => total + ligne.noeuds, 0);
    const autres = coups - lignes.length;
    const entete = document.createElement('tr');
    entete.className = 'recherche-ia-profondeur';
    const resume = cellule(
      `Prof. ${profondeur} : ${coups} premiers coups, ${FORMAT_DES_NOMBRES.format(noeuds)} positions` +
        (autres > 0 ? ` — les ${autres} autres : ${FORMAT_DES_NOMBRES.format(noeuds - sousLesMeilleurs)} (${partEnPourcent(noeuds - sousLesMeilleurs, noeuds)})` : '')
    );
    resume.colSpan = 5;
    entete.append(resume);
    const rangees = lignes.map(({ valeur, exacte, noeuds: sous, sequence }, rang) => {
      const tr = document.createElement('tr');
      tr.append(
        cellule(String(rang + 1)),
        cellule(sequence[0] ?? '', 'recherche-ia-coup'),
        cellule(`${exacte ? '' : '≤ '}${libelleEvaluation(valeur)}`),
        cellule(`${FORMAT_DES_NOMBRES.format(sous)} (${partEnPourcent(sous, noeuds)})`),
        cellule(sequence.slice(1).join(' '), 'sequence-prevue')
      );
      if (rang === 0) tr.classList.add('recherche-ia-choisi');
      return tr;
    });
    return [entete, ...rangees];
  }

  function afficher(enCours) {
    const details = enCours?.details;
    if (!details || details === detailsAffiches) return;
    detailsAffiches = details;
    note.textContent = `${numeroDeTour(enCours.coupsJoues)} ${enCours.camp === 'noir' ? '●' : '○'} — 10 meilleurs premiers coups par profondeur ; « ≤ » : écarté par l'élagage, vaut au plus cela.`;
    corps.replaceChildren(...[...details].reverse().flatMap(lignesDeLaProfondeur));
  }

  return { afficher };
}
