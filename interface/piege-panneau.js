// Le PIEGE d'une bille pour son panneau (interface/infos-case.js) : KAI++
// (solveur/kai-plus.cpp, kaiplus_piege) le cherche dans son propre worker — la
// machine qui joue n'attend jamais —, et les reponses restent gardees par
// position, trait et case. Une nouvelle demande interrompt la precedente.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ecrirePosition
// (moteur/notation.js), lireReponsePiege (moteur/sortie-bille.js), creerKaiPlus
// (interface/kai-plus.js) viennent de fichiers charges avant celui-ci.

// 4 coups de la bille au plus, et une limite de positions (environ 2 secondes)
// — au-dela, « trop long ».
const COUPS_MAX_PIEGE = 4;
const POSITIONS_MAX_PIEGE = 400000;

// `surReponse()` : une reponse vient d'arriver. Renvoie piegeDe(etat, notation,
// detail) : la reponse gardee, { etat: 'calcul' } en attendant, null hors de
// la zone ejectable.
function creerCalculDuPiege(surReponse) {
  const kaiPiege = creerKaiPlus();
  const pieges = new Map();
  let enCours = null;

  return function piegeDe(etat, notation, detail) {
    if (detail.sortie === null) return null;
    const cle = `${ecrirePosition(etat)} ${etat.joueurAuTrait} ${notation}`;
    if (pieges.has(cle)) return pieges.get(cle);
    if (enCours !== cle) {
      if (enCours) kaiPiege.interrompre();
      enCours = cle;
      kaiPiege
        .chercher({ type: 'piege', position: ecrirePosition(etat), joueurNoir: etat.joueurAuTrait === 'noir', notation, coupsMax: COUPS_MAX_PIEGE, limite: POSITIONS_MAX_PIEGE }, () => {})
        .then((texte) => {
          if (enCours !== cle) return; // interrompu par une autre demande
          enCours = null;
          pieges.set(cle, lireReponsePiege(texte) ?? { etat: 'erreur' });
          surReponse();
        });
    }
    return { etat: 'calcul' };
  };
}
