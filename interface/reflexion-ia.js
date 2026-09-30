// Ce que la machine pense (phase 32, saab) : le tableau repliable (« temps de
// reflexion / profondeur / coups / evaluation / sequence prevue »), deplie par
// defaut, en tete de la colonne des tableaux — jamais au-dessus du plateau, qu'il
// retrecissait en paysage (interface/disposition.js). Son evaluation, elle, est
// a cote du compte d'ejections (interface/evaluations.js). Tout vient de
// l'arbre (moteur/arbre.js, marquerReflexionIA : chaque coup de la machine y
// garde sa reflexion, fichier compris) : naviguer ou rejouer une partie montre
// la reflexion d'alors. Plus une ligne « en cours » pendant qu'elle cherche.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : numeroDeTour (moteur/
// arbre.js), libelleEvaluation (moteur/ia.js), ABREVIATIONS_PHASES
// (moteur/ia-evaluation.js) viennent de fichiers charges avant celui-ci.

const DECIMALES_DUREE_REFLEXION = 1;

function texteEvaluation(reflexion) {
  if (reflexion.source === 'livre') return 'Livre';
  return Number.isFinite(reflexion.evaluation) ? libelleEvaluation(reflexion.evaluation) : '';
}

// `details` : #reflexion-ia (montre seulement contre la machine). Renvoie
// { actualiser(arbre), afficherEnCours(enCours | null) } — `enCours` : { camp,
// coupsJoues, duree, profondeur, noeuds, evaluation, sequence (textes) }.
function demarrerReflexionIA(details) {
  details.hidden = false;
  const corps = details.querySelector('tbody');
  let lignesDuChemin = [];
  let enCours = null;

  function cellule(texte) {
    const td = document.createElement('td');
    td.textContent = texte;
    return td;
  }

  function ligne({ camp, coupsJoues, coup, duree, profondeur, source, noeuds, evaluation, sequence, phase }, classe) {
    const tr = document.createElement('tr');
    if (classe) tr.className = classe;
    const marque = camp === 'noir' ? '●' : '○';
    tr.append(
      cellule(`${numeroDeTour(coupsJoues)} ${marque} ${coup ?? '…'}`),
      cellule(`${duree.toFixed(DECIMALES_DUREE_REFLEXION)} s`),
      cellule(source === 'livre' ? 'livre' : String(profondeur ?? '')),
      cellule(String(noeuds ?? '')),
      cellule(`${phase ? `${ABREVIATIONS_PHASES[phase]} ` : ''}${texteEvaluation({ source, evaluation })}`),
      cellule((sequence ?? []).join(' '))
    );
    return tr;
  }

  // La plus recente en haut : on la voit sans faire defiler.
  function afficherTableau() {
    const lignes = lignesDuChemin.map((l) => ligne(l)).reverse();
    if (enCours) lignes.unshift(ligne(enCours, 'reflexion-en-cours'));
    corps.replaceChildren(...lignes);
  }

  // Les coups de la machine sur le chemin regarde.
  function actualiser(arbre) {
    lignesDuChemin = [];
    let parent = arbre.racine;
    arbre.chemin.forEach((index, rang) => {
      const noeud = parent.enfants[index];
      if (noeud.reflexionIA) lignesDuChemin.push({ camp: parent.etat.joueurAuTrait, coupsJoues: rang + 1, coup: noeud.coup, ...noeud.reflexionIA });
      parent = noeud;
    });
    afficherTableau();
  }

  function afficherEnCours(nouveau) {
    enCours = nouveau;
    afficherTableau();
  }

  return { actualiser, afficherEnCours };
}
