// Ce que fait le banc d'essais en ce moment (saab, 2026-10-08 : « qd c'est lance
// il faudrait voir qu'il cherche, sinon on croit que c'est bloque ») : une ligne
// par partie en cours — laquelle, quel coup, qui cherche, la derniere profondeur
// finie et son evaluation, et depuis combien de secondes —, plus le temps
// ecoule depuis Lancer. Les secondes avancent toutes seules (une fois par
// seconde) : on voit que ca tourne meme quand un coup est long.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : libelleEvaluation
// (moteur/ia.js), MILLISECONDES_PAR_SECONDE_BANC (interface/banc-essais-partie.js)
// viennent de fichiers charges avant celui-ci.

const RAFRAICHISSEMENT_SUIVI_BANC_MS = 1000;
const SECONDES_PAR_MINUTE_BANC = 60;

const dureeDuBanc = (millisecondes) => {
  const secondes = Math.floor(millisecondes / MILLISECONDES_PAR_SECONDE_BANC);
  const minutes = Math.floor(secondes / SECONDES_PAR_MINUTE_BANC);
  return minutes > 0 ? `${minutes} min ${String(secondes % SECONDES_PAR_MINUTE_BANC).padStart(2, '0')} s` : `${secondes} s`;
};

// `element` : la zone ou ecrire ; `estEnPause()`. Renvoie { commencer(machine,
// libelle) — « Partie 3/40 — 1. Normal v5el en Noir, ouverture 2 », ou un puzzle —,
// suivi(machine) -> la fonction a passer a jouerUnePartieDuBanc (ou a un puzzle,
// ou a la recolte : { etape }), finir(machine), arreter() }.
function creerSuiviDuBanc(element, estEnPause) {
  const lancement = performance.now();
  const parties = new Map(); // machine -> { libelle, etape, coup, camp, debut, profondeur, evaluation }

  function ligne({ libelle, etape, coup, camp, debut, profondeur, evaluation }) {
    if (etape) return `${libelle} : ${etape}`;
    if (!coup) return `${libelle} : le livre…`;
    const profondeurFinie = profondeur ? `profondeur ${profondeur} finie (${libelleEvaluation(evaluation)})` : 'cherche…';
    return `${libelle} : tour ${Math.ceil(coup / 2)}, ${camp} : ${profondeurFinie}, ${dureeDuBanc(performance.now() - debut)}`;
  }

  function afficher() {
    const titre = document.createElement('div');
    titre.textContent = `En cours depuis ${dureeDuBanc(performance.now() - lancement)}${estEnPause() ? ' — en pause' : ''}`;
    const lignes = [...parties.values()].map((partie) => {
      const div = document.createElement('div');
      div.textContent = ligne(partie);
      return div;
    });
    element.replaceChildren(titre, ...lignes);
  }

  const minuterie = setInterval(afficher, RAFRAICHISSEMENT_SUIVI_BANC_MS);
  afficher();
  return {
    commencer(machine, libelle) {
      parties.set(machine, { libelle, coup: null });
      afficher();
    },
    suivi: (machine) => (nouveau) => {
      Object.assign(parties.get(machine), nouveau);
      afficher();
    },
    finir(machine) {
      parties.delete(machine);
      afficher();
    },
    arreter() {
      clearInterval(minuterie);
      element.replaceChildren();
    },
  };
}
