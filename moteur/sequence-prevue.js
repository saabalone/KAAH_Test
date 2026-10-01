// La sequence prevue par la machine (saab, 2026-09-30) : rejouee position par
// position pour la montrer sur un petit plateau (interface/sequence-prevue.js),
// et sa reflexion ecrite en commentaire du coup (« comme on est en test »).
// Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lireCoupNacre
// (notation.js), couleursDuPlateau, appliquerCoup (partie.js),
// libelleEvaluation (ia.js), ABREVIATIONS_PHASES, VALEUR_VICTOIRE_IA (ia-evaluation.js), rechercheEcourtee (ia-recherche.js), ecrirePosition (notation.js) viennent
// de fichiers charges avant celui-ci.

const DECIMALES_DUREE_COMMENTAIRE = 1;

// `etat`, puis la position apres chaque coup de `textes` (Nacre, chacun ecrit
// sur sa position). S'arrete au premier coup qui ne se relit pas.
function etatsDeLaSequence(etat, textes) {
  const etats = [etat];
  for (const texte of textes) {
    const courant = etats.at(-1);
    const coup = lireCoupNacre(couleursDuPlateau(courant.plateau), courant.joueurAuTrait, texte);
    if (!coup) break;
    etats.push(appliquerCoup(courant, coup).etat);
  }
  return etats;
}

// Une ligne du tableau de reflexion (interface/reflexion-ia.js), en texte :
// « KAI3_Nor_5s : 1.2 s, prof. 4, 12345 positions, éval. Mil. +35, séquence
// a1b2 i9h8 ».
// Une recherche arretee par le temps avant la profondeur de son niveau le dit :
// « prof. 3/5 (temps) » (moteur/ia-recherche.js, rechercheEcourtee).
function commentaireDeReflexion(nomMachine, { source, profondeur, evaluation, noeuds, duree, sequence, phase, niveau }) {
  const morceaux = [`${duree.toFixed(DECIMALES_DUREE_COMMENTAIRE)} s`];
  if (source === 'livre') {
    morceaux.push('livre');
  } else if (source === 'solution') {
    morceaux.push('fin déjà vue');
    morceaux.push(`éval. ${phase ? `${ABREVIATIONS_PHASES[phase]} ` : ''}${libelleEvaluation(evaluation)}`);
  } else {
    const ecourtee = niveau && rechercheEcourtee({ source, profondeur, evaluation }, niveau);
    morceaux.push(ecourtee ? `prof. ${profondeur}/${niveau} (temps)` : `prof. ${profondeur}`, `${noeuds} positions`);
    if (Number.isFinite(evaluation)) morceaux.push(`éval. ${phase ? `${ABREVIATIONS_PHASES[phase]} ` : ''}${libelleEvaluation(evaluation)}`);
  }
  if (sequence?.length) morceaux.push(`séquence ${sequence.join(' ')}`);
  return `${nomMachine} : ${morceaux.join(', ')}`;
}

// Une position et son trait, en texte : ce qui identifie une position deja vue
// dans une fin de partie (solutionsDeLaSequence).
function cleDeSolution(etat) {
  return `${ecrirePosition(etat)}|${etat.joueurAuTrait}`;
}

// Fin de partie vue jusqu'au bout (saab, 2026-10-01 : « comme il affiche
// Gagne/Perd en n, ce n'est plus la peine de faire tourner l'IA, il suffit de
// jouer les solutions ») : pour chaque position de la sequence prevue ou la
// machine rejouera (un coup sur deux, a partir du suivant), son coup, la suite
// de la sequence, et l'evaluation qui s'y rapproche de la fin. Rien si la
// sequence ne mene pas a une fin de partie (VALEUR_VICTOIRE_IA). Si l'adversaire
// ne joue pas la reponse prevue, la position ne correspond plus : la machine
// cherche de nouveau.
function solutionsDeLaSequence(etat, sequence, evaluation) {
  if (!Number.isFinite(evaluation) || Math.abs(evaluation) <= VALEUR_VICTOIRE_IA / 2) return [];
  const etats = etatsDeLaSequence(etat, sequence);
  const signe = Math.sign(evaluation);
  const distance = VALEUR_VICTOIRE_IA - Math.abs(evaluation);
  const solutions = [];
  for (let rang = 2; rang < Math.min(etats.length, sequence.length); rang += 2) {
    solutions.push({
      cle: cleDeSolution(etats[rang]),
      coup: sequence[rang],
      sequence: sequence.slice(rang),
      evaluation: signe * (VALEUR_VICTOIRE_IA - (distance - rang)),
    });
  }
  return solutions;
}
