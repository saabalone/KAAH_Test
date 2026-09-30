// KAI++ dans un worker (phase 33bis) : le C++ compile en WebAssembly
// (solveur/kai-plus.js, fonction codeDeKaiPlus) calcule sur un fil a part — le
// plateau, les pendules et les clics ne se figent jamais. Meme mecanique que le
// solveur (interface/solveur.js) : worker cree a partir d'un Blob (un
// Worker('...js') est refuse en double-clic, file://), seulement a la premiere
// demande, puis garde.
//
// Chaque profondeur finie est annoncee (le tableau de reflexion, l'evaluation
// en direct) ; « Arret » (boite du nom) arrete le worker net : le coup joue est
// alors celui de la derniere profondeur annoncee, et un worker neuf prendra la
// demande suivante.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : codeDeKaiPlus vient de
// solveur/kai-plus.js, charge avant celui-ci.

const CODE_DU_WORKER_KAI_PLUS = `
  const kai = (${codeDeKaiPlus.toString()})();
  self.onmessage = (evenement) => {
    const d = evenement.data;
    kai.surProgres((texte) => self.postMessage({ numero: d.numero, type: 'progres', texte }));
    let texte;
    try {
      texte = kai.chercher(d.position, d.joueurNoir ? 1 : 0, d.profondeur, d.poids, d.version, d.graine, d.dureeMs, d.historique);
    } catch (erreur) {
      texte = 'ERREUR ' + erreur;
    }
    self.postMessage({ numero: d.numero, type: 'fin', texte });
  };
`;

// Renvoie { chercher(demande, surProgres) -> Promise<texte>, interrompre() }.
// `demande` : { position, joueurNoir, profondeur, poids (texte, moteur/ia.js,
// poidsEnTexte), version, graine, dureeMs, historique (positions, une par
// ligne) }. La reponse (texte) se lit avec lireReponseKaiPlus (moteur/ia.js) ;
// 'ERREUR ...' si le worker ne peut pas demarrer ou a ete interrompu.
function creerKaiPlus() {
  let worker = null;
  let enCours = null; // { numero, resoudre, surProgres }
  let prochainNumero = 1;

  function finir(texte) {
    const demande = enCours;
    enCours = null;
    demande?.resoudre(texte);
  }

  function obtenirWorker() {
    if (worker) return worker;
    const url = URL.createObjectURL(new Blob([CODE_DU_WORKER_KAI_PLUS], { type: 'text/javascript' }));
    worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = ({ data }) => {
      if (!enCours || data.numero !== enCours.numero) return;
      if (data.type === 'progres') enCours.surProgres(data.texte);
      else finir(data.texte);
    };
    worker.onerror = (evenement) => {
      evenement.preventDefault();
      interrompre();
    };
    return worker;
  }

  function chercher(demande, surProgres) {
    return new Promise((resoudre) => {
      enCours = { numero: prochainNumero++, resoudre, surProgres };
      try {
        obtenirWorker().postMessage({ ...demande, numero: enCours.numero });
      } catch {
        finir('ERREUR KAI++ indisponible');
      }
    });
  }

  function interrompre() {
    worker?.terminate();
    worker = null;
    finir('ERREUR interrompu');
  }

  return { chercher, interrompre };
}
