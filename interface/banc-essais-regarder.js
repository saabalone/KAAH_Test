// REGARDER UNE PARTIE du Banc d'essais (saab, 2026-10-18 : « voir au clic, sur un mini
// plateau, une partie en cours ou terminée — passer en orange le profil quand on la
// regarde, puis en violet si regardée —, et le graphique, interconnecté comme d'hab ») :
// une ligne du tableau des parties, ou une partie en cours (sa ligne dans le suivi),
// touchee : la boite se ferme (la serie continue, comme avec Fermer), la partie s'ouvre
// sur le petit plateau et dans le Graphique (interface/sequence-prevue.js,
// interface/graphique-groupes.js, qui se suivent). Une partie en cours se suit en direct,
// coup apres coup, jusqu'a sa fin.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// `elements` : { dialogue, resultats, enCours, petitPlateau (sa boite) } ; `parties` :
// { finie(numero), enCours(machine) } -> { numero, position, coups, titre } ;
// `montrerUnePartie(position, coups, titre, { enDirect, aLaFin })` (enDirect : la meme
// partie, plus longue — le petit plateau ne revient pas au debut ; aLaFin : ouvrir sur son
// dernier coup). Renvoie { marquer() (apres chaque tableau),
// oublierTout() (une nouvelle serie) }.
function brancherLeRegardDesParties(elements, parties, montrerUnePartie) {
  let regardee = null; // le numero de la partie sur le petit plateau
  let suivie = null; // { machine, coups } : la partie regardee pendant qu'elle se joue
  const vues = new Set();

  // La partie suivie a de nouveaux coups (ou vient de finir) : le petit plateau les montre.
  function suivreEnDirect() {
    if (!suivie || regardee === null) return;
    const enCours = parties.enCours(suivie.machine);
    const partie = enCours?.numero === regardee ? enCours : parties.finie(regardee);
    if (!partie) return;
    if (partie !== enCours) suivie = null; // finie : ses derniers coups, puis plus rien a suivre
    else if (partie.coups.length === suivie.coups) return;
    else suivie.coups = partie.coups.length;
    montrerUnePartie(partie.position, partie.coups, partie.titre, { enDirect: true });
  }

  // Orange : celle qu'on regarde ; violet : celles deja regardees (styles.css).
  function marquer() {
    suivreEnDirect();
    for (const ligne of [...elements.resultats.querySelectorAll('[data-partie-banc]'), ...elements.enCours.querySelectorAll('[data-partie-banc]')]) {
      const numero = Number(ligne.dataset.partieBanc);
      ligne.classList.toggle('banc-regardee', numero === regardee);
      ligne.classList.toggle('banc-vue', numero !== regardee && vues.has(numero));
    }
  }

  function regarder(partie, machine = null) {
    if (!partie || partie.coups.length === 0) return;
    suivie = machine === null ? null : { machine, coups: partie.coups.length };
    if (regardee !== null) vues.add(regardee);
    regardee = partie.numero;
    vues.add(partie.numero);
    marquer();
    elements.dialogue.close();
    // En cours : sur son dernier coup, pour la suivre.
    montrerUnePartie(partie.position, partie.coups, partie.titre, { aLaFin: machine !== null });
  }

  elements.resultats.addEventListener('click', (evenement) => {
    const ligne = evenement.target.closest('tr[data-partie-banc]');
    if (ligne) regarder(parties.finie(Number(ligne.dataset.partieBanc)));
  });
  elements.enCours.addEventListener('click', (evenement) => {
    const ligne = evenement.target.closest('[data-machine-banc]');
    if (ligne) regarder(parties.enCours(Number(ligne.dataset.machineBanc)), Number(ligne.dataset.machineBanc));
  });
  // Le petit plateau ferme : plus de partie regardee, elle passe en violet, et on revient a
  // la boite (saab, 2026-10-18 : « quand je ferme le mini plateau, je suis sur le grand
  // plateau au lieu d'être sur la boîte Essai »).
  elements.petitPlateau.addEventListener('close', () => {
    if (regardee === null) return;
    regardee = null;
    suivie = null;
    marquer();
    if (!elements.dialogue.open) elements.dialogue.showModal();
  });

  return {
    marquer,
    oublierTout() {
      regardee = null;
      suivie = null;
      vues.clear();
    },
  };
}
