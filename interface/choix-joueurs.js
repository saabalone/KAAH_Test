// La rubrique « Joueurs » de la boite du debut de partie (phases 29 et 32,
// choix de saab : dans la boite du mode de pendule, qui s'ouvre deja a chaque
// nouvelle partie) : Noir et Blanc sont chacun Humain, KAI (la machine en
// JavaScript) ou KAI++ (la meme en C++, saab 2026-09-30) — machine contre
// machine possible, pour comparer deux reglages ou deux moteurs —, et chaque
// machine a son niveau, son profil IA (Reglages, interface/profils-ia.js) et
// son temps de reflexion maximum (decimales permises : 1,2 s).
//
// CET appareil retient le dernier choix : la boite revient comme on l'a
// laissee (on rejoue souvent contre la meme machine).
//
// Le choix d'UN camp (brancherChoixMachine) sert aussi a la boite du nom, en
// cours de partie (saab, 2026-10-01 : interface/noms-joueurs.js). Niveaux 1 a
// NIVEAU_MAX_IA : le niveau n regarde n coups d'avance (moteur/ia-recherche.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : MACHINE_PAR_DEFAUT,
// NOMS_STYLES_IA (moteur/ia.js), NIVEAU_MAX_IA (moteur/ia-recherche.js),
// machineDuProfil (moteur/profils-ia.js), listerProfilsIA, trouverProfilIA
// (interface/profils-ia.js) viennent de fichiers charges avant celui-ci.

const CLE_DERNIERS_JOUEURS = 'kaah-derniers-joueurs';
const CAMPS_JOUEURS = ['noir', 'blanc'];

// Le choix d'un camp : { role ('humain', 'kai' ou 'kai++'), niveau, profil (son
// nom), reflexionMax }.
const ROLE_HUMAIN = 'humain';
const CHOIX_JOUEUR_PAR_DEFAUT = {
  role: ROLE_HUMAIN,
  niveau: MACHINE_PAR_DEFAUT.niveau,
  profil: MACHINE_PAR_DEFAUT.profil,
  reflexionMax: MACHINE_PAR_DEFAUT.reflexionMax,
};

function lireDerniersJoueurs() {
  try {
    const brut = JSON.parse(window.localStorage.getItem(CLE_DERNIERS_JOUEURS) ?? 'null');
    // Un choix retenu avant KAI++ disait seulement { machine: vrai|faux }.
    const role = (retenu) => retenu?.role ?? (retenu?.machine ? 'kai' : ROLE_HUMAIN);
    return Object.fromEntries(CAMPS_JOUEURS.map((camp) => [camp, { ...CHOIX_JOUEUR_PAR_DEFAUT, ...brut?.[camp], role: role(brut?.[camp]) }]));
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

// Le choix d'UN camp, dans `element` : ses boutons [data-role], sa ligne
// .ligne-niveaux (remplie ici, un bouton par niveau), sa liste .choix-profil-ia,
// son champ .choix-reflexion-max et la zone .reglages-machine (cachee pour un
// humain). `surChangement()` : facultatif, a chaque retouche. Renvoie
// { definir(choix, profilGarde), lire() } — `profilGarde` : un profil a laisser
// dans la liste meme s'il n'existe plus (celui d'une machine deja en jeu).
function brancherChoixMachine(element, surChangement) {
  let choix = { ...CHOIX_JOUEUR_PAR_DEFAUT };
  const ligneNiveaux = element.querySelector('.ligne-niveaux');
  for (let niveau = 1; niveau <= NIVEAU_MAX_IA; niveau++) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bouton-filtre';
    bouton.dataset.niveau = niveau;
    bouton.textContent = niveau;
    bouton.title = `Regarde ${niveau} coup${niveau > 1 ? 's' : ''} d'avance (les siens et ceux de l'adversaire), si son temps de réflexion le permet`;
    ligneNiveaux.appendChild(bouton);
  }

  function remplirProfils(profilGarde) {
    const noms = listerProfilsIA().map((profil) => profil.nom);
    if (profilGarde && !noms.includes(profilGarde)) noms.unshift(profilGarde);
    element.querySelector('.choix-profil-ia').replaceChildren(
      ...noms.map((nom) => {
        const option = document.createElement('option');
        option.value = nom;
        option.textContent = nom;
        return option;
      })
    );
    // Un profil supprime depuis : retour au profil du style normal.
    if (!noms.includes(choix.profil)) choix.profil = NOMS_STYLES_IA.normal;
    element.querySelector('.choix-profil-ia').value = choix.profil;
  }

  function afficher() {
    const { role, niveau, reflexionMax } = choix;
    for (const bouton of element.querySelectorAll('[data-role]')) bouton.classList.toggle('bouton-actif', bouton.dataset.role === role);
    element.querySelector('.reglages-machine').hidden = role === ROLE_HUMAIN;
    for (const bouton of element.querySelectorAll('[data-niveau]')) {
      bouton.classList.toggle('bouton-actif', Number(bouton.dataset.niveau) === niveau);
    }
    element.querySelector('.choix-reflexion-max').value = reflexionMax;
  }

  const changer = (retouche) => {
    choix = { ...choix, ...retouche };
    afficher();
    surChangement?.();
  };
  for (const bouton of element.querySelectorAll('[data-role]')) bouton.addEventListener('click', () => changer({ role: bouton.dataset.role }));
  for (const bouton of element.querySelectorAll('[data-niveau]')) {
    bouton.addEventListener('click', () => changer({ niveau: Number(bouton.dataset.niveau) }));
  }
  element.querySelector('.choix-profil-ia').addEventListener('change', (evenement) => changer({ profil: evenement.target.value }));

  return {
    definir: (nouveau, profilGarde) => {
      choix = { ...CHOIX_JOUEUR_PAR_DEFAUT, ...nouveau };
      remplirProfils(profilGarde);
      afficher();
    },
    // Le choix tel qu'affiche, temps de reflexion relu dans son champ.
    lire: () => {
      choix = { ...choix, reflexionMax: Number(element.querySelector('.choix-reflexion-max').value) };
      return { ...choix };
    },
  };
}

// La machine d'un choix (moteur/profils-ia.js) — tout le profil part avec la
// partie, meme s'il est modifie ou supprime ensuite —, ou null pour un humain.
function machineDuChoix(choix) {
  if (choix.role === ROLE_HUMAIN) return null;
  const profil = trouverProfilIA(choix.profil) ?? trouverProfilIA(NOMS_STYLES_IA.normal);
  return machineDuProfil(profil, { niveau: choix.niveau, reflexionMax: choix.reflexionMax, moteur: choix.role });
}

// `section` : la rubrique (#section-adversaire), un bloc `.choix-joueur` par
// camp (data-camp). Renvoie { preparer(visible), lire() } : preparer affiche (ou
// cache) la rubrique, pre-remplie avec le dernier choix ; lire rend les
// machines { noir, blanc } (moteur/ia.js), ou null entre humains — et retient
// ce choix.
function demarrerChoixJoueurs(section) {
  const blocs = Object.fromEntries(
    CAMPS_JOUEURS.map((camp) => [camp, brancherChoixMachine(section.querySelector(`.choix-joueur[data-camp="${camp}"]`))])
  );

  function preparer(visible) {
    section.hidden = !visible;
    const choix = lireDerniersJoueurs();
    for (const camp of CAMPS_JOUEURS) blocs[camp].definir(choix[camp]);
  }

  function lire() {
    const choix = Object.fromEntries(CAMPS_JOUEURS.map((camp) => [camp, blocs[camp].lire()]));
    const machines = { noir: machineDuChoix(choix.noir), blanc: machineDuChoix(choix.blanc) };
    // Le temps de reflexion ramene dans ses bornes (lireMachine).
    for (const camp of CAMPS_JOUEURS) if (machines[camp]) choix[camp].reflexionMax = machines[camp].reflexionMax;
    retenirDerniersJoueurs(choix);
    return machines.noir || machines.blanc ? machines : null;
  }

  return { preparer, lire };
}
