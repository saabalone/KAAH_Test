// La PHASE de jeu d'une machine qui a l'ajout Ct, le centre tenu (saab, 2026-10-23 : « si il
// changeait de réglages en début et milieu, ce serait peut être une solution pour être plutôt
// défensif pour le début, et ensuite une fois qu'il contrôle le centre devenir plus agressif » ;
// « Il tient le centre », « Deux profils entiers », « lance Copie »). Au moment de chercher, la
// machine compte ses billes au centre (e5 et ses 6 voisines) : moins de Ct, le DEBUT — elle joue
// son profil ; Ct ou plus, le MILIEU — elle joue le profil du milieu, copie dans le sien
// (moteur/ia.js, lireProfilDuMilieu). Elle redevient « debut » si elle perd le centre. Toute la
// recherche d'un coup se fait avec un seul profil : une evaluation qui changerait de profil
// d'une position a l'autre pousserait la machine a franchir (ou eviter) le seuil pour lui-meme.
// Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : couleurAdverse (regles.js), estEnBloc (ia-groupe-principal.js),
// EJECTIONS_FIN_DE_PARTIE (ia-evaluation.js), EJECTIONS_POUR_GAGNER (partie.js), CASES_VOISINES_IA (ia-evaluation-v2.js),
// couleursDuPlateau (partie.js), lireProfilDuMilieu (ia.js) viennent de fichiers charges avant
// celui-ci.

const CASES_DU_CENTRE_IA = ['e5', ...CASES_VOISINES_IA.e5.filter((voisine) => voisine !== null)];

function billesAuCentre(etat, camp) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return CASES_DU_CENTRE_IA.filter((notation) => couleurs[notation] === camp).length;
}

// Les PHASES AU SCORE, l'ajout Ph (saab, 2026-11-04 : « un réglage unique pour toute la parties est impossible, il faut des phases
// Ouv/Mil/Fin » ; « Pour l'ouverture on peux regarder les 2 possibilités, soit tant qu'aucune bille n'est sortie et soit la 1ère
// bille sortie » ; « Fin dépend de la différence de score, si on a de l'avance on peut sacrifier des billes tant que l'adversaire ne
// peut pas arriver à 6 ») : Ph billes sorties, deux camps ensemble, finissent l'ouverture ; la fin, quand un camp a perdu 4 billes
// (EJECTIONS_FIN_DE_PARTIE, comme la phase affichee), selon que le camp qui joue mene ou non. Plus tot pour celui qui mene de 3
// billes en bonne position (saab, 2026-11-04 : « On pourrait en plus déclencher la fin si on a 3 billes d'avance et si on a une bonne
// position »), c'est-a-dire groupe face a un camp coupe : a 2 billes d'ecart, il gagne ainsi 71 % au banc et 67 % contre AbaPro.
const BILLES_D_AVANCE_POUR_LA_FIN = 3;

function enBonnePosition(etat, camp) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return estEnBloc(couleurs, camp) && !estEnBloc(couleurs, couleurAdverse(camp));
}

// L'ajout Fa, la FIN EN AVANCE SELON L'AVANCE (saab, 2026-11-11 : « ok ») : avec Fa, le camp qui joue prend le profil de fin en avance
// (celui qui sacrifie) des qu'il mene de Fa billes, quelle que soit la position, et jamais en dessous. Aux essais 69 a 73, le meneur
// qui sacrifie (perte 150) perd 8 parties, toutes en sacrifiant encore quand son avance tombe a 1, puis 0.
function phaseAuScore(etat, billesPourLeMilieu, avancePourLaFinEnAvance = 0) {
  const { billesEjecteesNoires: noires, billesEjecteesBlanches: blanches, joueurAuTrait: camp } = etat;
  const [miennes, siennes] = camp === 'noir' ? [noires, blanches] : [blanches, noires];
  const unCampAPerduSesBillesDeFin = Math.max(noires, blanches) >= EJECTIONS_FIN_DE_PARTIE;
  if (avancePourLaFinEnAvance > 0) {
    if (siennes - miennes >= avancePourLaFinEnAvance) return 'fin-en-avance';
    if (unCampAPerduSesBillesDeFin) return 'fin';
  } else {
    if (unCampAPerduSesBillesDeFin) return miennes < siennes ? 'fin-en-avance' : 'fin';
    if (siennes - miennes >= BILLES_D_AVANCE_POUR_LA_FIN && enBonnePosition(etat, camp)) return 'fin-en-avance';
  }
  return noires + blanches >= billesPourLeMilieu ? 'milieu' : 'ouverture';
}

// La phase pour le camp au trait de `etat` : avec Ph, celle du score ; avec Ct, 'debut' ou 'milieu' ; null sans l'un ni l'autre (ou,
// pour Ct, sans profil du milieu). `reglage` : une machine (moteur/ia.js) ou un reglage du banc — { poids, milieu, fin, finEnAvance }.
function phaseDuReglage(reglage, etat) {
  if ('phasesAuScore' in reglage.poids) return phaseAuScore(etat, reglage.poids.phasesAuScore, reglage.poids.avancePourLaFinEnAvance);
  if (!reglage.milieu || !('centreTenu' in reglage.poids)) return null;
  return billesAuCentre(etat, etat.joueurAuTrait) >= reglage.poids.centreTenu ? 'milieu' : 'debut';
}

// La copie que joue une phase : sans copie pour elle, celle de la phase d'avant ; rien : le profil de la machine.
function copieDeLaPhase(reglage, phase) {
  if (phase === 'fin-en-avance') return reglage.finEnAvance ?? reglage.fin ?? reglage.milieu;
  if (phase === 'fin') return reglage.fin ?? reglage.milieu;
  return phase === 'milieu' ? reglage.milieu : undefined;
}

// L'ajout Ms, la MORT SUBITE (saab, 2026-11-06, a « à 5-5 au niveau 8, chercher sans élagage mais au niveau 6 ? » : « Oui, bonne
// idée ») : quand les deux camps ont perdu toutes leurs billes sauf une ejection (la prochaine gagne), la machine cherche au plus au
// niveau Ms, sans elagage. En mort subite, la machine marron (niveau 6, plus d'elagage des 5 billes sorties) a battu KAI++8 elague
// 6 fois sur 6 ; KAI++8 sans elagage y mettait de 32 s a plus de 3 min par coup. Comme Ph, il vit dans le profil, jamais dans une copie.
const enMortSubite = ({ billesEjecteesNoires, billesEjecteesBlanches }) => Math.min(billesEjecteesNoires, billesEjecteesBlanches) >= EJECTIONS_POUR_GAGNER - 1;

// Le reglage qui cherche le coup : la version, l'elagage, le style et les poids de la copie de sa
// phase — le niveau, la reflexion, le livre et le nom restent ceux de la machine (sauf Ms, plus haut).
function reglageDeLaPhase(reglage, etat) {
  const copie = copieDeLaPhase(reglage, phaseDuReglage(reglage, etat));
  const joue = copie ? { ...reglage, version: copie.version, elagage: copie.elagage, style: copie.style, poids: copie.poids } : reglage;
  if (!('niveauMortSubite' in reglage.poids) || !enMortSubite(etat)) return joue;
  return { ...joue, niveau: Math.min(joue.niveau, reglage.poids.niveauMortSubite), elagage: 0 };
}

// Les COLONNES d'un reglage, une par phase, avec les poids qu'elle joue vraiment (saab, 2026-11-04 : « le profil n'a qu'une colonne il en
// faudrait autant que de phase, non ? ») : Ph, ses quatre ; Ct avec son profil du milieu, ses deux ; sinon une, sans titre.
const MARQUES_DES_PHASES_AU_SCORE = { ouverture: 'Ouv', milieu: 'Mil', fin: 'Fin', 'fin-en-avance': 'Fin+' };

function colonnesDesPhases(reglage) {
  const { poids } = reglage;
  if ('phasesAuScore' in poids) return Object.entries(MARQUES_DES_PHASES_AU_SCORE).map(([phase, titre]) => ({ titre, poids: copieDeLaPhase(reglage, phase)?.poids ?? poids }));
  if (reglage.milieu && 'centreTenu' in poids) return [{ titre: 'Début', poids }, { titre: 'Milieu', poids: reglage.milieu.poids }];
  return [{ titre: '', poids }];
}

// La copie d'un profil IA (moteur/profils-ia.js) pour en faire le profil du milieu d'un autre.
const copieDuProfilDuMilieu = (profil) => lireProfilDuMilieu({ ...profil, profil: profil.nom });
