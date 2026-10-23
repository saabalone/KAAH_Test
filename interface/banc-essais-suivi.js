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
// libelle, partie) — « Partie 3/40 — 1. Normal v5el en Noir, ouverture 2 », ou un puzzle ;
// `partie` : { numero, position, essaiNoir, nomDuProfil } d'une partie, qu'on peut alors regarder (touchee, sa
// ligne porte data-machine-banc) —, enCours(machine) : { numero, position, coups, titre },
// suivi(machine) -> la fonction a passer a jouerUnePartieDuBanc (ou a un puzzle,
// ou a la recolte : { etape }), finir(machine), arreter() }.
// `apresAffichage()` : apres chaque mise a jour (les lignes regardees, en couleur).
function creerSuiviDuBanc(element, estEnPause, apresAffichage = () => {}) {
  const lancement = performance.now();
  const parties = new Map(); // machine -> { libelle, etape, coup, camp, debut, score, profondeur, evaluation }

  // La ligne en trois morceaux : avant le camp qui cherche, le camp (« essai » ou
  // « référence », vert si son evaluation est positive, rouge si negative : saab,
  // 2026-10-18), apres.
  function ligne({ libelle, etape, coup, camp, debut, score, profondeur, evaluation }) {
    if (etape) return { avant: `${libelle} : ${etape}`, camp: '', apres: '', signe: 0 };
    if (!coup) return { avant: `${libelle} : le livre…`, camp: '', apres: '', signe: 0 };
    const profondeurFinie = profondeur ? `profondeur ${profondeur} finie (${libelleEvaluation(evaluation)})` : 'cherche…';
    return { avant: `${libelle} : tour ${Math.ceil(coup / 2)}${score ? ` (${score})` : ''}, `, camp, apres: ` : ${profondeurFinie}, ${dureeDuBanc(performance.now() - debut)}`, signe: profondeur ? Math.sign(evaluation) : 0 };
  }

  // Les lignes restent les memes elements, mises a jour sur place (saab, 2026-10-18 : « le
  // clic ne prend pas toujours » — refaites chaque seconde, un clic tombait entre deux).
  const titre = document.createElement('div');
  const lignes = new Map(); // machine -> { div, avant, nom, apres, camp, fin }
  element.replaceChildren(titre);

  function ligneDe(machine) {
    if (!lignes.has(machine)) {
      const div = document.createElement('div');
      const [avant, nom, apres, camp, fin] = Array.from({ length: 5 }, () => document.createElement('span'));
      nom.className = 'banc-nom-en-cours';
      div.append(avant, nom, apres, camp, fin);
      element.append(div);
      lignes.set(machine, { div, avant, nom, apres, camp, fin });
    }
    return lignes.get(machine);
  }

  function afficher() {
    titre.textContent = `En cours depuis ${dureeDuBanc(performance.now() - lancement)}${estEnPause() ? ' — en pause' : ''}`;
    for (const [machine, { div }] of lignes) {
      if (parties.has(machine)) continue;
      div.remove();
      lignes.delete(machine);
    }
    for (const [machine, partie] of parties) {
      const { div, avant, nom, apres, camp, fin } = ligneDe(machine);
      const morceaux = ligne(partie);
      const texte = morceaux.avant;
      camp.textContent = morceaux.camp;
      camp.className = morceaux.signe > 0 ? 'banc-eval-positive' : morceaux.signe < 0 ? 'banc-eval-negative' : '';
      fin.textContent = morceaux.apres;
      // Le nom du profil a part : seul lui passe en orange ou en violet (regardee, vue).
      const place = partie.nomDuProfil ? texte.indexOf(partie.nomDuProfil) : -1;
      avant.textContent = place < 0 ? texte : texte.slice(0, place);
      nom.textContent = place < 0 ? '' : partie.nomDuProfil;
      apres.textContent = place < 0 ? '' : texte.slice(place + partie.nomDuProfil.length);
      if (partie.numero === undefined) continue;
      div.dataset.machineBanc = machine;
      div.dataset.partieBanc = partie.numero;
      // Comme le tableau des parties : l'essai en Blanc en blanc, en Noir en gris.
      div.className = `banc-ligne-en-cours ${partie.essaiNoir ? 'banc-essai-noir' : 'banc-essai-blanc'}`;
      div.title = 'Toucher : la suivre sur le petit plateau, et dans le Graphique';
    }
    apresAffichage();
  }

  const minuterie = setInterval(afficher, RAFRAICHISSEMENT_SUIVI_BANC_MS);
  afficher();
  return {
    commencer(machine, libelle, partie = {}) {
      parties.set(machine, { libelle, coup: null, coupsJoues: [], ...partie });
      afficher();
    },
    enCours(machine) {
      const partie = parties.get(machine);
      if (!partie) return partie;
      const { nomDuProfil: essai, nomAdverse: adverse } = partie;
      const joueurs = essai && adverse ? (partie.essaiNoir ? { noir: essai, blanc: adverse } : { noir: adverse, blanc: essai }) : null;
      // Sans le libelle (deja dans le titre) : « tour 3 (-0-0), essai : profondeur 6 finie (-27), 1 s ».
      const { avant, camp, apres } = ligne(partie);
      const reflexion = `${avant.replace(`${partie.libelle} : `, '')}${camp}${apres}`;
      return { numero: partie.numero, position: partie.position, coups: partie.coupsJoues, titre: `${partie.titreDeLaPartie ?? partie.libelle} (en cours)`, joueurs, reflexion: reflexion.charAt(0).toUpperCase() + reflexion.slice(1) };
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
