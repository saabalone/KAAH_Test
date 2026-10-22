// Une partie du BANC D'ESSAIS (interface/banc-essais.js) : depuis la Marguerite
// belge, la reference (avec ou sans le livre, moteur/banc-essais.js) contre
// l'essai, chaque coup cherche par KAI++ jusqu'a la fin de la partie.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lirePosition,
// ecrirePosition (moteur/notation.js), appliquerCoup (moteur/partie.js),
// poidsEnTexte, lireReponseKaiPlus, coupsDesPositions, textesDeLaSequence
// (moteur/ia.js), hasardDuBanc, coupDeLaReferenceAuLivre, dansLeLivre,
// finDeLaPartieDuBanc (moteur/banc-essais.js), coupDuLivre (moteur/ia.js) viennent de
// fichiers charges avant celui-ci.

const POSITION_DEPART_BANC = '0a12b123c23g78h789i89_0a45b456c56g45h456i56'; // la Marguerite belge
const GRAINE_MAX_BANC = 1e9;
const MILLISECONDES_PAR_SECONDE_BANC = 1000;
// La reflexion d'un profil du banc, pour KAI++ : ses secondes, ou sans limite
// (TEMPS_SANS_LIMITE_BANC, interface/banc-essais-champs.js ; RECHERCHE_SANS_LIMITE_MS,
// interface/banc-essais-puzzles.js).
const dureeDeReflexionDuBancMs = (temps) => (temps === TEMPS_SANS_LIMITE_BANC ? RECHERCHE_SANS_LIMITE_MS : temps * MILLISECONDES_PAR_SECONDE_BANC);
const scoreDuBanc = (etat) => `-${etat.billesEjecteesNoires}-${etat.billesEjecteesBlanches}`;

// Une partie : la reference contre l'essai, jouee par KAI++ (`kai`,
// interface/kai-plus.js), chacun a son niveau et sa reflexion (`reglage.niveau`,
// `reglage.temps` en secondes). `base` : le livre d'ouvertures charge ; `controle` :
// { arret, pause, reprendre } (la boite : Pause, Arreter) ; `suivi` (saab,
// 2026-10-08 : « il faudrait voir qu'il cherche, sinon on croit que c'est
// bloque ») recoit a chaque coup cherche { coup, camp ('référence' | 'essai'),
// debut (ms), score (« -2-3 », saab 2026-10-14 : « ajouter le score en cours ») },
// puis a chaque profondeur finie { profondeur, evaluation }.
// Renvoie la partie (`tache` et { fin, etats (chaque position, la derniere
// comprise), coups, livre, occurrences (l'Occ de chaque coup, moteur/banc-essais.js),
// tours, score, secondesEssai }) ou null si elle a ete arretee.
async function jouerUnePartieDuBanc(tache, reference, essai, parametres, kai, base, controle, suivi = () => {}) {
  const livre = base?.size > 0 ? base : null;
  const hasard = hasardDuBanc(tache.graine);
  // `tache.position` : une autre position de depart (les variantes des ceintures des IA).
  let etat = { ...lirePosition(tache.position ?? POSITION_DEPART_BANC), joueurAuTrait: 'noir' };
  const historique = [ecrirePosition(etat)];
  const etats = [etat]; // pour la recolte des puzzles (interface/banc-essais-puzzles.js)
  const coups = [];
  const dansLivre = [];
  let coupsDeLaReference = 0;
  let secondesEssai = 0;
  let fin = null;
  while (!fin) {
    if (controle.arret) return null;
    if (controle.pause) await new Promise((resoudre) => (controle.reprendre = resoudre));
    const reglage = (etat.joueurAuTrait === 'noir') === tache.referenceNoir ? reference : essai;
    // L'essai aussi dans le livre (saab, 2026-10-19 : « la recherche avec le livre pour les 2,
    // ce sera plus juste ») : ses coups du livre, jamais les coups au hasard de la reference.
    let coup = reglage === reference ? coupDeLaReferenceAuLivre(livre, etat, hasard, coupsDeLaReference, parametres.hasard, parametres.livre) : parametres.livreEssai ? coupDuLivre(livre, etat, hasard)?.coup ?? null : null;
    if (reglage === reference) coupsDeLaReference++;
    if (!coup) {
      const debut = performance.now();
      suivi({ coup: coups.length + 1, camp: reglage === reference ? 'référence' : 'essai', debut, score: scoreDuBanc(etat), profondeur: null, evaluation: null });
      const texte = await kai.chercher({
        position: ecrirePosition(etat),
        joueurNoir: etat.joueurAuTrait === 'noir',
        profondeur: reglage.niveau,
        poids: poidsEnTexte(reglage.poids),
        version: reglage.version,
        graine: Math.floor(hasard() * GRAINE_MAX_BANC),
        dureeMs: dureeDeReflexionDuBancMs(reglage.temps),
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
    suivi({ coupsJoues: [...coups] }); // pour la regarder en cours (interface/banc-essais-regarder.js)
    etat = appliquerCoup(etat, coup).etat;
    historique.push(ecrirePosition(etat));
    etats.push(etat);
    fin = finDeLaPartieDuBanc(etat, historique, coups.length);
  }
  return { ...tache, fin, etats, coups, livre: dansLivre, occurrences: occurrencesDesCoups(historique), tours: Math.ceil(coups.length / 2), score: scoreDuBanc(etat), secondesEssai };
}
