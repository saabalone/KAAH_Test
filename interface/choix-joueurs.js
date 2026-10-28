// La rubrique « Joueurs » de la boite du debut de partie (phases 29 et 32,
// choix de saab : dans la boite du mode de pendule, qui s'ouvre deja a chaque
// nouvelle partie) : Noir et Blanc sont chacun Humain ou KAI++ (la machine en C++,
// saab 2026-09-30) — machine contre machine possible, pour comparer deux reglages —, et
// chaque machine a son niveau, son profil IA (Reglages, interface/profils-ia.js), son
// temps de reflexion maximum (decimales permises : 1,2 s) et son elagage.
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
// REFLEXION_SANS_LIMITE_S (moteur/ia.js), brancherConseilDeTemps (interface/conseil-temps-ia.js),
// palierVoisin, reflexionProposee (interface/reflexion-machine.js),
// machineDuProfil (moteur/profils-ia.js), listerProfilsIA, trouverProfilIA
// libelleProfilIA (interface/profils-ia.js), colorerListeProfilsIA (interface/couleurs-ia.js),
// lireReglagesActifs (interface/reglages-profils.js), remplirListeProfils,
// profilDuChoix, styleDuChoix (interface/liste-profils-choix.js)
// viennent de fichiers charges avant celui-ci.

const CLE_DERNIERS_JOUEURS = 'kaah-derniers-joueurs';
const CAMPS_JOUEURS = ['noir', 'blanc'];

// Le choix d'un camp : { role ('humain' ou 'kai++' ; saab, 2026-10-22 : « supprime btn KAI »),
// niveau, profil (son nom, ou une ancienne version : interface/liste-profils-choix.js),
// filtreStyle (le style montre dans la liste, '' : tous), reflexionMax (null : celle
// proposee pour son niveau, interface/reflexion-machine.js), livre (le livre d'ouvertures,
// saab 2026-10-01), elagage (null : celui du profil ; saab, 2026-10-22 : « forcer l'El dans
// la boite IA Joueur ... simple de tester les profils contre AP ») }. KAI, la machine en
// JavaScript, ne se choisit plus (figee, bien plus lente) : elle joue encore les parties
// d'avant qui l'avaient.
const ROLE_HUMAIN = 'humain';
// Une machine proposee la premiere fois (saab, 2026-10-07 : « mettre KAI++3_Nor
// v1 par defaut pour les IA Joueur, puis le dernier utilise ») : KAI++, Normal ; ensuite, le
// dernier choix retenu (lireDerniersJoueurs). Le niveau 1 (saab, 2026-10-22 : « pour ceux qui ne
// règlent rien et qui ne savent pas jouer, ils ne gagneront jamais si c'est plus »).
const MOTEUR_PROPOSE_IA = 'kai++';
const NIVEAU_PROPOSE_IA = 1;

const CHOIX_JOUEUR_PAR_DEFAUT = {
  role: ROLE_HUMAIN,
  moteur: MOTEUR_PROPOSE_IA, // le dernier moteur choisi, meme redevenu humain
  niveau: NIVEAU_PROPOSE_IA,
  profil: nomDuProfilIAParDefaut(), // interface/profils-ia.js
  reflexionMax: null,
  livre: MACHINE_PAR_DEFAUT.livre,
  elagage: null,
};

// L'elagage d'un choix : le force, sinon celui de son profil.
const elagageDuChoix = (choix) => choix.elagage ?? profilDuChoix(choix.profil)?.elagage ?? 0;
// Sa reflexion : la choisie, sinon celle proposee pour son niveau (interface/reflexion-machine.js).
const reflexionProposeeDuChoix = (choix) => reflexionProposee(choix.niveau, elagageDuChoix(choix) > 0);
const reflexionDuChoix = (choix) => choix.reflexionMax ?? reflexionProposeeDuChoix(choix);
// Une reflexion egale a celle proposee redevient « proposee » (null) : elle suivra le niveau.
const reflexionChoisie = (choix, secondes) => (secondes === reflexionProposeeDuChoix(choix) ? null : secondes);
// Le seul moteur qui se choisit encore (un choix retenu avec KAI, ou d'avant KAI++).
const roleChoisi = (role) => (role === ROLE_HUMAIN || role === undefined ? ROLE_HUMAIN : MOTEUR_PROPOSE_IA);

// Le livre d'ouvertures propose par defaut : celui de Reglages (rubrique
// Machine).
function livreParDefaut() {
  return lireReglagesActifs().kaah.ia_book;
}

// Celui d'une machine qui prend le profil `nom` (saab, 2026-10-03 : le livre
// fait partie du profil IA) : seulement si le profil s'en sert et que Reglages
// le permet ; la case reste a cocher ou decocher ensuite.
function livreDuProfil(nom) {
  return livreParDefaut() && (profilDuChoix(nom)?.livre ?? true);
}

// Un profil retenu qui etait l'IA par defaut suit l'IA par defaut quand elle change (saab,
// 2026-10-22 : « au chargement elles ne sont pas par défaut dans les champs des boites, il faut
// aller les chercher ») ; un choix retenu avant ce reglage aussi, une fois. Un autre profil reste.
function profilQuiSuitLeDefaut(retenu) {
  if (!retenu || (retenu.profilParDefaut !== undefined && retenu.profil !== retenu.profilParDefaut)) return {};
  return { profil: nomDuProfilIAParDefaut(), filtreStyle: undefined };
}

function lireDerniersJoueurs() {
  try {
    const brut = JSON.parse(window.localStorage.getItem(CLE_DERNIERS_JOUEURS) ?? 'null');
    // Un choix retenu avant KAI++ disait seulement { machine: vrai|faux }.
    const role = (retenu) => roleChoisi(retenu?.role ?? (retenu?.machine ? MOTEUR_PROPOSE_IA : ROLE_HUMAIN));
    return Object.fromEntries(CAMPS_JOUEURS.map((camp) => [camp, { ...CHOIX_JOUEUR_PAR_DEFAUT, ...brut?.[camp], role: role(brut?.[camp]), moteur: MOTEUR_PROPOSE_IA, ...profilQuiSuitLeDefaut(brut?.[camp]) }]));
  } catch {
    return { noir: { ...CHOIX_JOUEUR_PAR_DEFAUT }, blanc: { ...CHOIX_JOUEUR_PAR_DEFAUT } };
  }
}

function retenirDerniersJoueurs(choix) {
  try {
    // Avec l'IA par defaut du moment (profilQuiSuitLeDefaut).
    const retenus = Object.fromEntries(Object.entries(choix).map(([camp, siens]) => [camp, { ...siens, profilParDefaut: nomDuProfilIAParDefaut() }]));
    window.localStorage.setItem(CLE_DERNIERS_JOUEURS, JSON.stringify(retenus));
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

  // La liste des profils, filtree par style, avec les anciennes versions
  // (interface/liste-profils-choix.js) ; un profil supprime ou cache par le
  // filtre : le premier de la liste.
  const listeStyles = element.querySelector('.choix-style-ia');
  let profilGardeEnJeu = null;
  function remplirProfils() {
    listeStyles.value = choix.filtreStyle;
    choix.profil = remplirListeProfils(element.querySelector('.choix-profil-ia'), { voulue: choix.profil, filtreStyle: choix.filtreStyle, profilGarde: profilGardeEnJeu });
  }

  function afficher() {
    const { role, niveau } = choix;
    for (const bouton of element.querySelectorAll('[data-role]')) bouton.classList.toggle('bouton-actif', bouton.dataset.role === role);
    element.querySelector('.reglages-machine').hidden = role === ROLE_HUMAIN;
    // Le nom (saab, 2026-10-27) : pour un humain seulement ; une machine a le sien.
    const champNom = element.querySelector('.choix-nom-joueur');
    if (champNom) champNom.hidden = role !== ROLE_HUMAIN;
    for (const bouton of element.querySelectorAll('[data-niveau]')) {
      bouton.classList.toggle('bouton-actif', Number(bouton.dataset.niveau) === niveau);
    }
    // Sans limite : le champ vide, « ∞ ». A leur valeur par defaut, en marron (saab,
    // 2026-10-22 : « (b) en marron ») : la reflexion proposee pour son niveau (elle le
    // suit), l'elagage de son profil.
    const reflexion = reflexionDuChoix(choix);
    champReflexion.value = reflexion === REFLEXION_SANS_LIMITE_S ? '' : reflexion;
    champReflexion.classList.toggle('valeur-par-defaut', choix.reflexionMax === null);
    element.querySelector('.choix-livre').checked = choix.livre;
    const champElagage = element.querySelector('.choix-elagage');
    champElagage.value = choix.elagage ?? '';
    const duProfil = profilDuChoix(choix.profil)?.elagage ?? 0;
    // Dans le champ vide : celui du profil.
    champElagage.placeholder = duProfil ? String(duProfil) : 'sans';
    champElagage.classList.toggle('valeur-par-defaut', choix.elagage === null);
    // Ce que cherche le profil choisi (saab, 2026-10-03, moteur/profils-ia.js).
    element.querySelector('.description-choix-profil').textContent = profilDuChoix(choix.profil)?.description ?? '';
    afficherConseil(reflexion);
  }
  // − et + autour du temps de reflexion (saab, 2026-10-07 : sur telephone, le
  // champ n'a pas les petits triangles du PC) : de palier en palier.
  const champReflexion = element.querySelector('.choix-reflexion-max');
  const boutonPalier = (texte, titre, sens) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bouton-palier-reflexion';
    bouton.textContent = texte;
    bouton.title = titre;
    bouton.addEventListener('click', (evenement) => {
      evenement.preventDefault();
      changer({ reflexionMax: reflexionChoisie(choix, palierVoisin(Number(champReflexion.value), sens)) });
    });
    return bouton;
  };
  champReflexion.before(boutonPalier('−', 'Moins de temps de réflexion', -1));
  champReflexion.after(boutonPalier('+', 'Plus de temps de réflexion (après 300 s : sans limite, ∞)', 1));
  champReflexion.placeholder = '∞';
  // Une frappe : marron tant que c'est la reflexion proposee (vide : ∞, Number('') = 0).
  champReflexion.addEventListener('input', () => {
    champReflexion.classList.toggle('valeur-par-defaut', Number(champReflexion.value) === reflexionProposeeDuChoix(choix));
  });
  // Le temps qu'il faut a ce niveau (interface/conseil-temps-ia.js).
  const afficherConseil = brancherConseilDeTemps(champReflexion, () => ({ ...choix, elague: elagageDuChoix(choix) > 0 }));

  const changer = (retouche) => {
    choix = { ...choix, ...retouche };
    if (choix.role !== ROLE_HUMAIN) choix.moteur = choix.role;
    afficher();
    surChangement?.();
  };
  for (const bouton of element.querySelectorAll('[data-role]')) bouton.addEventListener('click', () => changer({ role: bouton.dataset.role }));
  for (const bouton of element.querySelectorAll('[data-niveau]')) {
    bouton.addEventListener('click', () => changer({ niveau: Number(bouton.dataset.niveau) }));
  }
  element.querySelector('.choix-profil-ia').addEventListener('change', (evenement) => {
    colorerListeProfilsIA(evenement.target);
    changer({ profil: evenement.target.value, livre: livreDuProfil(evenement.target.value) });
  });
  element.querySelector('.choix-livre').addEventListener('change', (evenement) => changer({ livre: evenement.target.checked }));
  // Vide : celui du profil ; garde d'un profil a l'autre (pour les comparer au meme El).
  element.querySelector('.choix-elagage').addEventListener('change', (evenement) => {
    const valeur = evenement.target.value.trim();
    changer({ elagage: valeur === '' ? null : Math.max(0, Math.round(Number(valeur)) || 0) });
  });
  listeStyles.addEventListener('change', () => {
    const avant = choix.profil;
    choix.filtreStyle = listeStyles.value;
    remplirProfils();
    changer(choix.profil === avant ? {} : { livre: livreDuProfil(choix.profil) });
  });

  return {
    definir: (nouveau, profilGarde) => {
      choix = { ...CHOIX_JOUEUR_PAR_DEFAUT, ...nouveau };
      choix.role = roleChoisi(choix.role);
      choix.filtreStyle ??= styleDuChoix(choix.profil);
      profilGardeEnJeu = profilGarde ?? null;
      remplirProfils();
      choix.reflexionMax = choix.reflexionMax === null ? null : reflexionChoisie(choix, choix.reflexionMax);
      afficher();
    },
    // Le choix tel qu'affiche, temps de reflexion relu dans son champ.
    lire: () => {
      choix = { ...choix, reflexionMax: reflexionChoisie(choix, Number(champReflexion.value)) };
      return { ...choix };
    },
  };
}

// La machine d'un choix (moteur/profils-ia.js) — tout le profil part avec la
// partie, meme s'il est modifie ou supprime ensuite —, ou null pour un humain.
function machineDuChoix(choix) {
  if (choix.role === ROLE_HUMAIN) return null;
  const profil = profilDuChoix(choix.profil) ?? trouverProfilIA(NOMS_STYLES_IA.normal);
  const machine = machineDuProfil(profil, { niveau: choix.niveau, reflexionMax: reflexionDuChoix(choix), moteur: choix.role, livre: choix.livre });
  return choix.elagage === null || choix.elagage === undefined ? machine : avecLElagageForce(machine, choix.elagage);
}

// Un elagage tape dans la boite remplace celui du profil, quel qu'il soit : celui du profil du
// milieu aussi (l'ajout Ct, moteur/ia-phase.js).
const avecLElagageForce = (machine, elagage) => ({ ...machine, elagage, ...(machine.milieu ? { milieu: { ...machine.milieu, elagage } } : {}) });

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
    for (const champ of section.querySelectorAll('.choix-nom-joueur')) champ.value = '';
    const choix = lireDerniersJoueurs();
    for (const camp of CAMPS_JOUEURS) blocs[camp].definir({ ...choix[camp], livre: livreDuProfil(choix[camp].profil) });
  }

  function lire() {
    const choix = Object.fromEntries(CAMPS_JOUEURS.map((camp) => [camp, blocs[camp].lire()]));
    const machines = { noir: machineDuChoix(choix.noir), blanc: machineDuChoix(choix.blanc) };
    // Le temps de reflexion choisi ramene dans ses bornes (lireMachine) ; celui propose le reste.
    for (const camp of CAMPS_JOUEURS) if (machines[camp] && choix[camp].reflexionMax !== null) choix[camp].reflexionMax = machines[camp].reflexionMax;
    retenirDerniersJoueurs(choix);
    return machines.noir || machines.blanc ? machines : null;
  }

  // Les noms tapes ({ noir, blanc } ; '' : aucun) : ceux des humains, corriges comme dans la boite du nom.
  const noms = () => Object.fromEntries(CAMPS_JOUEURS.map((camp) => [camp, nomJoueurAutorise(section.querySelector(`.choix-joueur[data-camp="${camp}"] .choix-nom-joueur`)?.value ?? '')]));

  return { preparer, lire, noms };
}
