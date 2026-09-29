// La rubrique « Joueurs » de la boite du debut de partie (phases 29 et 32,
// choix de saab : dans la boite du mode de pendule, qui s'ouvre deja a chaque
// nouvelle partie) : Noir et Blanc sont chacun Humain ou Machine — machine
// contre machine possible, pour comparer deux reglages (saab) —, et chaque
// machine a son niveau, son profil IA (Reglages, interface/profils-ia.js) et
// son temps de reflexion maximum (decimales permises : 1,2 s).
//
// CET appareil retient le dernier choix : la boite revient comme on l'a
// laissee (on rejoue souvent contre la meme machine).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : MACHINE_PAR_DEFAUT,
// NOMS_STYLES_IA (moteur/ia.js), machineDuProfil (moteur/profils-ia.js),
// listerProfilsIA, trouverProfilIA (interface/profils-ia.js) viennent de
// fichiers charges avant celui-ci.

const CLE_DERNIERS_JOUEURS = 'kaah-derniers-joueurs';
const CAMPS_JOUEURS = ['noir', 'blanc'];

// Le choix d'un camp : { machine: vrai|faux, niveau, profil (son nom), reflexionMax }.
const CHOIX_JOUEUR_PAR_DEFAUT = {
  machine: false,
  niveau: MACHINE_PAR_DEFAUT.niveau,
  profil: MACHINE_PAR_DEFAUT.profil,
  reflexionMax: MACHINE_PAR_DEFAUT.reflexionMax,
};

function lireDerniersJoueurs() {
  try {
    const brut = JSON.parse(window.localStorage.getItem(CLE_DERNIERS_JOUEURS) ?? 'null');
    return Object.fromEntries(CAMPS_JOUEURS.map((camp) => [camp, { ...CHOIX_JOUEUR_PAR_DEFAUT, ...brut?.[camp] }]));
  } catch {
    return { noir: { ...CHOIX_JOUEUR_PAR_DEFAUT }, blanc: { ...CHOIX_JOUEUR_PAR_DEFAUT } };
  }
}

function retenirDerniersJoueurs(choix) {
  try {
    window.localStorage.setItem(CLE_DERNIERS_JOUEURS, JSON.stringify(choix));
  } catch {
    // Tant pis : la boite reviendra simplement sur deux humains.
  }
}

// `section` : la rubrique (#section-adversaire) ; un bloc `.choix-joueur` par
// camp (data-camp), ou tout se trouve par ses attributs data-role / data-niveau
// et ses classes. Renvoie { preparer(visible), lire() } : preparer affiche (ou
// cache) la rubrique, pre-remplie avec le dernier choix ; lire rend les
// machines { noir, blanc } (moteur/ia.js), ou null entre humains — et retient
// ce choix.
function demarrerChoixJoueurs(section) {
  let choix = lireDerniersJoueurs();
  const bloc = (camp) => section.querySelector(`.choix-joueur[data-camp="${camp}"]`);

  function remplirProfils(camp) {
    const liste = bloc(camp).querySelector('.choix-profil-ia');
    liste.replaceChildren(
      ...listerProfilsIA().map((profil) => {
        const option = document.createElement('option');
        option.value = profil.nom;
        option.textContent = profil.nom;
        return option;
      })
    );
    // Un profil supprime depuis : retour au profil du style normal.
    if (!trouverProfilIA(choix[camp].profil)) choix[camp].profil = NOMS_STYLES_IA.normal;
    liste.value = choix[camp].profil;
  }

  function afficher(camp) {
    const element = bloc(camp);
    const { machine, niveau, reflexionMax } = choix[camp];
    element.querySelector('[data-role="humain"]').classList.toggle('bouton-actif', !machine);
    element.querySelector('[data-role="machine"]').classList.toggle('bouton-actif', machine);
    element.querySelector('.reglages-machine').hidden = !machine;
    for (const bouton of element.querySelectorAll('[data-niveau]')) {
      bouton.classList.toggle('bouton-actif', Number(bouton.dataset.niveau) === niveau);
    }
    element.querySelector('.choix-reflexion-max').value = reflexionMax;
  }

  for (const camp of CAMPS_JOUEURS) {
    const element = bloc(camp);
    const changer = (retouche) => {
      choix[camp] = { ...choix[camp], ...retouche };
      afficher(camp);
    };
    element.querySelector('[data-role="humain"]').addEventListener('click', () => changer({ machine: false }));
    element.querySelector('[data-role="machine"]').addEventListener('click', () => changer({ machine: true }));
    for (const bouton of element.querySelectorAll('[data-niveau]')) {
      bouton.addEventListener('click', () => changer({ niveau: Number(bouton.dataset.niveau) }));
    }
    element.querySelector('.choix-profil-ia').addEventListener('change', (evenement) => changer({ profil: evenement.target.value }));
  }

  function preparer(visible) {
    section.hidden = !visible;
    choix = lireDerniersJoueurs();
    for (const camp of CAMPS_JOUEURS) {
      remplirProfils(camp);
      afficher(camp);
    }
  }

  // Le reglage complet de la machine d'un camp (moteur/profils-ia.js) : tout le
  // profil part avec la partie, meme s'il est modifie ou supprime ensuite.
  function machineDuCamp(camp) {
    const reflexionMax = Number(bloc(camp).querySelector('.choix-reflexion-max').value);
    choix[camp] = { ...choix[camp], reflexionMax };
    if (!choix[camp].machine) return null;
    const profil = trouverProfilIA(choix[camp].profil) ?? trouverProfilIA(NOMS_STYLES_IA.normal);
    const machine = machineDuProfil(profil, { niveau: choix[camp].niveau, reflexionMax });
    choix[camp].reflexionMax = machine.reflexionMax; // ramene dans ses bornes
    return machine;
  }

  function lire() {
    const machines = { noir: machineDuCamp('noir'), blanc: machineDuCamp('blanc') };
    retenirDerniersJoueurs(choix);
    return machines.noir || machines.blanc ? machines : null;
  }

  return { preparer, lire };
}
