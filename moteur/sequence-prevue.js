// La sequence prevue par la machine (saab, 2026-09-30) : rejouee position par
// position pour la montrer sur un petit plateau (interface/sequence-prevue.js),
// et sa reflexion ecrite en commentaire du coup (« comme on est en test »).
// Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lireCoupNacre
// (notation.js), couleursDuPlateau, appliquerCoup (partie.js),
// libelleEvaluation (ia.js), ABREVIATIONS_PHASES (ia-evaluation.js), rechercheEcourtee (ia-recherche.js) viennent
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
  } else {
    const ecourtee = niveau && rechercheEcourtee({ source, profondeur, evaluation }, niveau);
    morceaux.push(ecourtee ? `prof. ${profondeur}/${niveau} (temps)` : `prof. ${profondeur}`, `${noeuds} positions`);
    if (Number.isFinite(evaluation)) morceaux.push(`éval. ${phase ? `${ABREVIATIONS_PHASES[phase]} ` : ''}${libelleEvaluation(evaluation)}`);
  }
  if (sequence?.length) morceaux.push(`séquence ${sequence.join(' ')}`);
  return `${nomMachine} : ${morceaux.join(', ')}`;
}
