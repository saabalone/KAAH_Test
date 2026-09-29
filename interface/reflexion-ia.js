// Ce que la machine pense (phase 32, saab) : le tableau repliable sous le titre
// de la partie (« temps de reflexion / profondeur / coups / evaluation /
// sequence prevue ») et son evaluation sur le nom de son camp. Tout vient de
// l'arbre (moteur/arbre.js, marquerReflexionIA : chaque coup de la machine y
// garde sa reflexion, fichier compris) : naviguer ou rejouer une partie montre
// la reflexion d'alors. Plus une ligne « en cours » pendant qu'elle cherche.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : numeroDeTour (moteur/
// arbre.js), libelleEvaluation (moteur/ia.js), afficherMachineSurNom
// (rendu/ligne-joueur.js) viennent de fichiers charges avant celui-ci.

const CAMPS_REFLEXION = ['noir', 'blanc'];
const DECIMALES_DUREE_REFLEXION = 1;

function texteEvaluation(reflexion) {
  if (reflexion.source === 'livre') return 'Livre';
  return Number.isFinite(reflexion.evaluation) ? libelleEvaluation(reflexion.evaluation) : '';
}

// `details` : #reflexion-ia (montre seulement contre la machine). `machines` :
// { noir, blanc } (moteur/ia.js). Renvoie { actualiser(arbre, enMarche),
// afficherEnCours(enCours | null) } — `enMarche` : { noir, blanc } ;
// `enCours` : { camp, coupsJoues, duree, profondeur, noeuds, evaluation,
// sequence (textes) }.
function demarrerReflexionIA(details, svg, machines) {
  details.hidden = false;
  const corps = details.querySelector('tbody');
  let lignesDuChemin = [];
  let enCours = null;
  let dernieresEvaluations = { noir: '', blanc: '' };
  let etatsMarche = { noir: true, blanc: true };

  function cellule(texte) {
    const td = document.createElement('td');
    td.textContent = texte;
    return td;
  }

  function ligne({ camp, coupsJoues, coup, duree, profondeur, source, noeuds, evaluation, sequence }, classe) {
    const tr = document.createElement('tr');
    if (classe) tr.className = classe;
    const marque = camp === 'noir' ? '●' : '○';
    tr.append(
      cellule(`${numeroDeTour(coupsJoues)} ${marque} ${coup ?? '…'}`),
      cellule(`${duree.toFixed(DECIMALES_DUREE_REFLEXION)} s`),
      cellule(source === 'livre' ? 'livre' : String(profondeur ?? '')),
      cellule(String(noeuds ?? '')),
      cellule(texteEvaluation({ source, evaluation })),
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

  function afficherNoms() {
    for (const camp of CAMPS_REFLEXION) {
      const evaluation = enCours?.camp === camp && enCours.profondeur ? texteEvaluation(enCours) : dernieresEvaluations[camp];
      afficherMachineSurNom(svg, camp, { machine: Boolean(machines[camp]), evaluation, enMarche: etatsMarche[camp] });
    }
  }

  // Les coups de la machine sur le chemin regarde, et sa derniere evaluation
  // pour chaque camp.
  function actualiser(arbre, enMarche) {
    etatsMarche = enMarche;
    lignesDuChemin = [];
    dernieresEvaluations = { noir: '', blanc: '' };
    let parent = arbre.racine;
    arbre.chemin.forEach((index, rang) => {
      const noeud = parent.enfants[index];
      const camp = parent.etat.joueurAuTrait;
      if (noeud.reflexionIA) {
        lignesDuChemin.push({ camp, coupsJoues: rang + 1, coup: noeud.coup, ...noeud.reflexionIA });
        dernieresEvaluations[camp] = texteEvaluation(noeud.reflexionIA);
      }
      parent = noeud;
    });
    afficherTableau();
    afficherNoms();
  }

  function afficherEnCours(nouveau) {
    enCours = nouveau;
    afficherTableau();
    afficherNoms();
  }

  return { actualiser, afficherEnCours };
}
