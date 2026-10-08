// Une partie du BANC D'ESSAIS (interface/banc-essais.js) : depuis la Marguerite
// belge, la reference (avec ou sans le livre, moteur/banc-essais.js) contre
// l'essai, chaque coup cherche par KAI++ jusqu'a la fin de la partie.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lirePosition,
// ecrirePosition (moteur/notation.js), appliquerCoup (moteur/partie.js),
// poidsEnTexte, lireReponseKaiPlus, coupsDesPositions, textesDeLaSequence
// (moteur/ia.js), hasardDuBanc, coupDeLaReferenceAuLivre, dansLeLivre,
// finDeLaPartieDuBanc (moteur/banc-essais.js) viennent de fichiers charges avant
// celui-ci.

const POSITION_DEPART_BANC = '0a12b123c23g78h789i89_0a45b456c56g45h456i56'; // la Marguerite belge
const GRAINE_MAX_BANC = 1e9;
const MILLISECONDES_PAR_SECONDE_BANC = 1000;

// Une partie : la reference contre l'essai, jouee par KAI++ (`kai`,
// interface/kai-plus.js), chacun a son niveau et sa reflexion (`reglage.niveau`,
// `reglage.temps` en secondes). `base` : le livre d'ouvertures charge ; `controle` :
// { arret, pause, reprendre } (la boite : Pause, Arreter) ; `suivi` (saab,
// 2026-10-08 : « il faudrait voir qu'il cherche, sinon on croit que c'est
// bloque ») recoit a chaque coup cherche { coup, camp ('référence' | 'essai'),
// debut (ms) }, puis a chaque profondeur finie { profondeur, evaluation }.
// Renvoie la partie (`tache` et { fin, coups, livre, tours, score,
// secondesEssai }) ou null si elle a ete arretee.
async function jouerUnePartieDuBanc(tache, reference, essai, parametres, kai, base, controle, suivi = () => {}) {
  const livre = base?.size > 0 ? base : null;
  const hasard = hasardDuBanc(tache.graine);
  let etat = { ...lirePosition(POSITION_DEPART_BANC), joueurAuTrait: 'noir' };
  const historique = [ecrirePosition(etat)];
  const coups = [];
  const dansLivre = [];
  let coupsDeLaReference = 0;
  let secondesEssai = 0;
  let fin = null;
  while (!fin) {
    if (controle.arret) return null;
    if (controle.pause) await new Promise((resoudre) => (controle.reprendre = resoudre));
    const reglage = (etat.joueurAuTrait === 'noir') === tache.referenceNoir ? reference : essai;
    let coup = reglage === reference ? coupDeLaReferenceAuLivre(livre, etat, hasard, coupsDeLaReference, parametres.hasard, parametres.livre) : null;
    if (reglage === reference) coupsDeLaReference++;
    if (!coup) {
      const debut = performance.now();
      suivi({ coup: coups.length + 1, camp: reglage === reference ? 'référence' : 'essai', debut, profondeur: null, evaluation: null });
      const texte = await kai.chercher({
        position: ecrirePosition(etat),
        joueurNoir: etat.joueurAuTrait === 'noir',
        profondeur: reglage.niveau,
        poids: poidsEnTexte(reglage.poids),
        version: reglage.version,
        graine: Math.floor(hasard() * GRAINE_MAX_BANC),
        dureeMs: reglage.temps * MILLISECONDES_PAR_SECONDE_BANC,
        historique: historique.join('\n'),
        elagage: reglage.elagage,
      }, (progres) => {
        const reponse = lireReponseKaiPlus(progres);
        if (reponse) suivi({ profondeur: reponse.profondeur, evaluation: reponse.evaluation });
      });
      if (reglage === essai) secondesEssai += (performance.now() - debut) / MILLISECONDES_PAR_SECONDE_BANC;
      const reponse = lireReponseKaiPlus(texte);
      coup = reponse ? coupsDesPositions(etat, reponse.positions)[0] : null;
      if (!coup) return null; // interrompu
    }
    dansLivre.push(dansLeLivre(livre, etat, coup));
    coups.push(textesDeLaSequence(etat, [coup])[0]);
    etat = appliquerCoup(etat, coup).etat;
    historique.push(ecrirePosition(etat));
    fin = finDeLaPartieDuBanc(etat, historique, coups.length);
  }
  return { ...tache, fin, coups, livre: dansLivre, tours: Math.ceil(coups.length / 2), score: `-${etat.billesEjecteesNoires}-${etat.billesEjecteesBlanches}`, secondesEssai };
}
