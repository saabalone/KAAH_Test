// Les sons (phase 21) : les six de KAAWA (dossier sons/, copies telles quelles),
// chacun activable un par un, plus un interrupteur general. Quand jouer chaque
// son est decide ailleurs, aux endroits ou l'evenement a lieu :
//   - move, eject, game_over : interface/saisie.js ;
//   - occ_change, occ_draw : interface/occurrences.js (regle : moteur/nulle.js,
//     sonOccurrence) ;
//   - time_alert : interface/pendules.js.
// Ce fichier ne fait que les JOUER, et retenir ce qui est active.
//
// Un <audio> par son, pas WebAudio : WebAudio demanderait de LIRE les fichiers
// (fetch), ce que le navigateur refuse pour une page ouverte par double-clic
// (file://) — CLAUDE.md exige que l'appli marche ainsi.
//
// iPHONE / SAFARI : un son ne peut sortir qu'apres un contact de l'utilisateur
// avec l'ecran, et chaque element <audio> doit avoir ete lance une fois DANS ce
// contact pour pouvoir l'etre ensuite par le programme. Au premier contact
// (clic ou toucher), on lance donc chaque son sans le faire entendre (coupe, puis
// arrete) ; un son demande pendant ce court deblocage attend qu'il soit fini.
//
// Reglages retenus dans localStorage sous les MEMES cles que KAAWA
// (`sound.enabled`, `sound.move`...) : la phase 22 (reglages, fichiers
// settings_*.json de KAAWA) les retrouvera telles quelles.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const CLE_STOCKAGE_SONS = 'kaah-reglages-sons';

// Ordre = ordre d'affichage. Le premier est l'interrupteur general (KAAWA :
// "Son global").
const REGLAGES_SONS = [
  { cle: 'sound.enabled', libelle: 'Son global' },
  { cle: 'sound.move', libelle: 'Coup', fichier: 'move' },
  { cle: 'sound.eject', libelle: 'Éjection', fichier: 'eject' },
  { cle: 'sound.game_over', libelle: 'Fin de partie', fichier: 'game_over' },
  { cle: 'sound.occ_change', libelle: 'Occ change', fichier: 'occ_change' },
  { cle: 'sound.occ_draw', libelle: 'Occ draw', fichier: 'occ_draw' },
  { cle: 'sound.time_alert', libelle: 'Alerte temps', fichier: 'time_alert' },
];

// Tout est actif par defaut, comme dans KAAWA.
function lireReglagesSons() {
  const reglages = Object.fromEntries(REGLAGES_SONS.map(({ cle }) => [cle, true]));
  try {
    const enregistres = JSON.parse(window.localStorage.getItem(CLE_STOCKAGE_SONS) ?? '{}');
    for (const cle of Object.keys(reglages)) if (typeof enregistres[cle] === 'boolean') reglages[cle] = enregistres[cle];
  } catch {
    // stockage indisponible ou illisible : les valeurs par defaut
  }
  return reglages;
}

function demarrerSons(dossier = './sons/') {
  const reglages = lireReglagesSons();
  const elements = {};
  for (const { fichier } of REGLAGES_SONS) {
    if (!fichier) continue;
    const audio = new Audio(`${dossier}${fichier}.wav`);
    audio.preload = 'auto';
    elements[fichier] = audio;
  }

  // Le deblocage du premier contact (voir l'en-tete du fichier).
  let deblocage = null;
  function debloquer() {
    if (deblocage) return;
    for (const evenement of ['click', 'touchend', 'keydown']) document.removeEventListener(evenement, debloquer, true);
    deblocage = Promise.all(
      Object.values(elements).map((audio) => {
        audio.muted = true;
        return audio
          .play()
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
          })
          .catch(() => {})
          .finally(() => {
            audio.muted = false;
          });
      })
    ).then(() => {
      deblocage = null;
    });
  }
  for (const evenement of ['click', 'touchend', 'keydown']) document.addEventListener(evenement, debloquer, true);

  // `nom` : 'move', 'eject', 'game_over', 'occ_change', 'occ_draw' ou
  // 'time_alert'. Sans effet si le son (ou le son global) est desactive.
  function jouer(nom) {
    if (!reglages['sound.enabled'] || !reglages[`sound.${nom}`]) return;
    const audio = elements[nom];
    if (!audio) return;
    const lancer = () => {
      audio.currentTime = 0; // recommence si deja en cours (KAAWA : stop puis play)
      audio.play().catch(() => {}); // refuse tant qu'aucun contact n'a eu lieu : tant pis
    };
    if (deblocage) deblocage.then(lancer);
    else lancer();
  }

  function regler(cle, actif) {
    reglages[cle] = actif;
    try {
      window.localStorage.setItem(CLE_STOCKAGE_SONS, JSON.stringify(reglages));
    } catch {
      // Tant que la page reste ouverte, le reglage vaut quand meme.
    }
  }

  return { jouer, regler, lire: (cle) => reglages[cle] };
}
