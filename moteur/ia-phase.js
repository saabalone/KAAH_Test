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
// Pas d'import ni d'export (voir moteur/plateau.js) : CASES_VOISINES_IA (ia-evaluation-v2.js),
// couleursDuPlateau (partie.js), lireProfilDuMilieu (ia.js) viennent de fichiers charges avant
// celui-ci.

const CASES_DU_CENTRE_IA = ['e5', ...CASES_VOISINES_IA.e5.filter((voisine) => voisine !== null)];

function billesAuCentre(etat, camp) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return CASES_DU_CENTRE_IA.filter((notation) => couleurs[notation] === camp).length;
}

// 'debut' ou 'milieu' pour le camp au trait de `etat` ; null sans l'ajout Ct (ou sans profil du
// milieu). `reglage` : une machine (moteur/ia.js) ou un reglage du banc — { poids, milieu }.
function phaseDuReglage(reglage, etat) {
  if (!reglage.milieu || !('centreTenu' in reglage.poids)) return null;
  return billesAuCentre(etat, etat.joueurAuTrait) >= reglage.poids.centreTenu ? 'milieu' : 'debut';
}

// Le reglage qui cherche le coup : au milieu, la version, l'elagage, le style et les poids du
// profil du milieu — le niveau, la reflexion, le livre et le nom restent ceux de la machine.
function reglageDeLaPhase(reglage, etat) {
  if (phaseDuReglage(reglage, etat) !== 'milieu') return reglage;
  const { version, elagage, style, poids } = reglage.milieu;
  return { ...reglage, version, elagage, style, poids };
}

// La copie d'un profil IA (moteur/profils-ia.js) pour en faire le profil du milieu d'un autre.
const copieDuProfilDuMilieu = (profil) => lireProfilDuMilieu({ ...profil, profil: profil.nom });
