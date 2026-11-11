// Le solveur de saab dans un worker (phase 28, PLAN.md) : un fil d'execution a
// part, pour que le plateau, les pendules et les clics ne se figent JAMAIS
// pendant un calcul (15 s pour un puzzle a 6 tours, davantage sur un
// telephone). Le calcul est le C++ d'origine compile en WebAssembly
// (solveur/kaa-solveur.js, fonction codeDuSolveurKaa) ; ce fichier ne fait que
// le transporter jusqu'au worker et en rapporter les reponses.
//
// Le worker est cree a partir d'un Blob (le texte de codeDuSolveurKaa), jamais
// d'une adresse de fichier : un Worker('...js') ordinaire est refuse par le
// navigateur quand KAAH est ouvert en double-clic (file://).
//
// Cree seulement a la premiere demande (une partie ordinaire n'en a jamais
// besoin : 128 Mo de memoire reserves pour la table de transposition), puis
// garde pour les suivantes — sa table reste chaude, ce qui rend la
// verification de fin quasi immediate apres une verification anticipee
// (solveur/kaah-solveur.cpp).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : codeDuSolveurKaa vient
// de solveur/kaa-solveur.js, charge avant celui-ci.

// Les limites de l'exe (verify_mode_seq, KAA_Solver_ClO_Co.cpp) : 120 s pour
// la recherche de depart, 60 s par coup ensuite.
const LIMITE_RECHERCHE_DEPART_S = 120;
const LIMITE_PAR_COUP_S = 60;
// Quand il joue la machine d'un PZL en ceinture (index.html, coupDuSolveur) : au-dela, KAI++ joue, pour que le joueur
// n'attende jamais longtemps son coup.
const LIMITE_DU_SOLVEUR_EN_CEINTURE_S = 30;

const CODE_DU_WORKER_SOLVEUR = `
  const solveur = (${codeDuSolveurKaa.toString()})();
  self.onmessage = (evenement) => {
    const { numero, commande, position, noirGagne, toursMaximum, coups, limiteDepart, limiteParCoup } = evenement.data;
    const debut = Date.now();
    let reponse;
    try {
      reponse = commande === 'sequence'
        ? solveur.sequence(position, noirGagne ? 1 : 0, toursMaximum, coups.join(' '), limiteParCoup)
        : solveur.verifier(position, noirGagne ? 1 : 0, toursMaximum, coups.join(' '), limiteDepart, limiteParCoup);
    } catch (erreur) {
      reponse = 'ERREUR ' + erreur;
    }
    self.postMessage({ numero, reponse, duree: (Date.now() - debut) / 1000 });
  };
`;

// Renvoie { verifier, sequence, arreter }. verifier({ position, noirGagne, toursMaximum, coups })
// -> Promise<{ reponse, duree }> : `reponse` est le texte de kaah_verifier
// (moteur/solveur.js, lireReponseSolveur), `duree` en secondes. Les demandes
// passent une par une, dans l'ordre (un worker ne fait qu'une chose a la fois).
// Si le worker ne peut pas demarrer (navigateur trop ancien, memoire
// refusee), chaque demande repond "ERREUR SOLVEUR_INDISPONIBLE" plutot que de
// faire planter quoi que ce soit.
// `limites` (le banc d'essais, pour remonter plus loin dans une partie) : d'autres
// limites de temps que celles de l'exe, en secondes.
function creerSolveur({ limiteDepart = LIMITE_RECHERCHE_DEPART_S, limiteParCoup = LIMITE_PAR_COUP_S } = {}) {
  let worker = null;
  let arrete = false;
  let prochainNumero = 1;
  const enAttente = new Map();

  function toutAbandonner(message) {
    for (const resoudre of enAttente.values()) resoudre({ reponse: `ERREUR ${message}`, duree: 0 });
    enAttente.clear();
  }

  function obtenirWorker() {
    if (worker) return worker;
    const url = URL.createObjectURL(new Blob([CODE_DU_WORKER_SOLVEUR], { type: 'text/javascript' }));
    worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = (evenement) => {
      const { numero, reponse, duree } = evenement.data;
      enAttente.get(numero)?.({ reponse, duree });
      enAttente.delete(numero);
    };
    worker.onerror = (evenement) => {
      evenement.preventDefault();
      worker.terminate();
      worker = null;
      toutAbandonner('SOLVEUR_INDISPONIBLE');
    };
    return worker;
  }

  function demander(commande, { position, noirGagne, toursMaximum, coups }) {
    if (arrete) return Promise.resolve({ reponse: 'ERREUR ARRETE', duree: 0 });
    return new Promise((resoudre) => {
      const numero = prochainNumero++;
      enAttente.set(numero, resoudre);
      try {
        obtenirWorker().postMessage({
          numero,
          commande,
          position,
          noirGagne,
          toursMaximum,
          coups,
          limiteDepart,
          limiteParCoup,
        });
      } catch {
        toutAbandonner('SOLVEUR_INDISPONIBLE');
      }
    });
  }
  const verifier = (demande) => demander('verifier', demande);
  // La sequence d'une solution apres `coups` (kaah_sequence, moteur/solveur.js : lireSequenceDuSolveur), dans la
  // limite par coup ; meme worker, donc meme table, que les verifications.
  const sequence = (demande) => demander('sequence', demande);

  // Le bouton Arreter du Solveur (interface/solveur-position.js) : un calcul ne s'interrompt pas de l'exterieur, le
  // worker est donc arrete net (sa table avec lui), et CE solveur ne repond plus que "ERREUR ARRETE"
  // (moteur/solveur.js, lireReponseSolveur : verdict 'erreur') — sinon la suite d'une recherche arretee
  // relancerait un worker a sa question suivante. Une nouvelle recherche cree un nouveau solveur.
  function arreter() {
    arrete = true;
    worker?.terminate();
    worker = null;
    toutAbandonner('ARRETE');
  }

  return { verifier, sequence, arreter };
}
