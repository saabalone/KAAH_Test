// L'evaluation de chaque camp, dans son cadre a cote du compte d'ejections
// (rendu/evaluation.js ; saab, 2026-09-30) : la phase de la partie (Ouv./Mil./
// Fin) puis la valeur de la position pour ce camp.
//   - une MACHINE montre la sienne : celle de son dernier coup sur le chemin
//     regarde (moteur/arbre.js, marquerReflexionIA), ou celle qu'elle est en
//     train de calculer ;
//   - un HUMAIN voit « Évaluation » en grise : un toucher la montre (le jugement
//     de la position par le profil Normal, sans chercher plus loin), un autre la
//     cache — CET appareil retient le choix de chaque camp.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : evaluerPosition,
// STYLES_IA, phaseDeLaPartie, ABREVIATIONS_PHASES (moteur/ia-evaluation.js),
// libelleEvaluation (moteur/ia.js), etatCourant (moteur/arbre.js),
// afficherEvaluation (rendu/evaluation.js) viennent de fichiers charges avant.

const CLE_EVALUATIONS_VISIBLES = 'kaah-evaluations-visibles';
const INVITATION_EVALUATION = 'Évaluation';

function lireEvaluationsVisibles() {
  try {
    return { noir: false, blanc: false, ...JSON.parse(window.localStorage.getItem(CLE_EVALUATIONS_VISIBLES) ?? '{}') };
  } catch {
    return { noir: false, blanc: false };
  }
}

function texteDeLaReflexion(reflexion) {
  if (reflexion.source === 'livre') return 'Livre';
  return Number.isFinite(reflexion.evaluation) ? libelleEvaluation(reflexion.evaluation) : '—';
}

// Renvoie { actualiser(arbre), definirMachines(machines), definirEnCours(enCours) }
// — `enCours` : { camp, profondeur, evaluation } pendant qu'une machine cherche,
// ou null.
function demarrerEvaluations(svg) {
  let visibles = lireEvaluationsVisibles();
  let machines = { noir: null, blanc: null };
  let arbre = null;
  let enCours = null;

  // La derniere reflexion de `camp` sur le chemin regarde, ou null.
  function derniereReflexion(camp) {
    let trouvee = null;
    let parent = arbre.racine;
    for (const index of arbre.chemin) {
      const noeud = parent.enfants[index];
      if (noeud.reflexionIA && parent.etat.joueurAuTrait === camp) trouvee = noeud.reflexionIA;
      parent = noeud;
    }
    return trouvee;
  }

  function valeurPourUnHumain(etat, camp) {
    if (etat.vainqueur) return etat.vainqueur === camp ? 'Gagné' : 'Perdu';
    return libelleEvaluation(evaluerPosition(etat, camp, STYLES_IA.normal));
  }

  function afficher() {
    if (!arbre) return;
    const etat = etatCourant(arbre);
    const phase = ABREVIATIONS_PHASES[phaseDeLaPartie(etat, arbre.chemin.length)];
    for (const camp of ['noir', 'blanc']) {
      if (machines[camp]) {
        const valeur =
          enCours?.camp === camp && enCours.profondeur ? libelleEvaluation(enCours.evaluation) : texteDeLaReflexion(derniereReflexion(camp) ?? {});
        afficherEvaluation(svg, camp, `${phase} ${valeur}`, false);
      } else if (visibles[camp]) {
        afficherEvaluation(svg, camp, `${phase} ${valeurPourUnHumain(etat, camp)}`, false);
      } else {
        afficherEvaluation(svg, camp, INVITATION_EVALUATION, true);
      }
    }
  }

  svg.addEventListener('click', (evenement) => {
    const cadre = evenement.target.closest('.cadre-evaluation');
    if (!cadre || machines[cadre.dataset.camp]) return;
    visibles = { ...visibles, [cadre.dataset.camp]: !visibles[cadre.dataset.camp] };
    try {
      window.localStorage.setItem(CLE_EVALUATIONS_VISIBLES, JSON.stringify(visibles));
    } catch {
      // Le choix vaut au moins jusqu'au prochain rechargement.
    }
    afficher();
  });

  return {
    actualiser: (nouvelArbre) => {
      arbre = nouvelArbre;
      afficher();
    },
    definirMachines: (nouvelles) => {
      machines = nouvelles;
      afficher();
    },
    definirEnCours: (nouveau) => {
      enCours = nouveau;
      afficher();
    },
  };
}
