// La rubrique « Adversaire » de la boite du debut de partie (phase 29, choix de
// saab : dans la boite du mode de pendule, qui s'ouvre deja a chaque nouvelle
// partie) : Humain ou Machine, et pour la machine son niveau, son style, son
// camp et son temps de reflexion maximum (moteur/ia.js).
//
// CET appareil retient le dernier choix : la boite revient comme on l'a
// laissee (on rejoue souvent contre la meme machine).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ADVERSAIRE_PAR_DEFAUT,
// lireAdversaire (moteur/ia.js) viennent de fichiers charges avant celui-ci.

const CLE_DERNIER_ADVERSAIRE = 'kaah-dernier-adversaire';

// { machine: vrai|faux, reglage: { niveau, style, camp, reflexionMax } }.
function lireDernierAdversaire() {
  try {
    const brut = JSON.parse(window.localStorage.getItem(CLE_DERNIER_ADVERSAIRE) ?? 'null');
    return { machine: Boolean(brut?.machine), reglage: lireAdversaire(brut?.reglage) ?? ADVERSAIRE_PAR_DEFAUT };
  } catch {
    return { machine: false, reglage: ADVERSAIRE_PAR_DEFAUT };
  }
}

function retenirDernierAdversaire(choix) {
  try {
    window.localStorage.setItem(CLE_DERNIER_ADVERSAIRE, JSON.stringify(choix));
  } catch {
    // Tant pis : la boite reviendra simplement sur Humain.
  }
}

// `elements` : { section, humain, machine, reglagesMachine, reflexion } ; les
// boutons de niveau, style et camp sont trouves dans `reglagesMachine` par
// leurs attributs data-niveau / data-style / data-camp. Renvoie
// { preparer(visible), lire() } : preparer affiche (ou cache) la rubrique,
// pre-remplie avec le dernier choix ; lire rend le reglage de la machine, ou
// null pour un adversaire humain (et retient ce choix).
function demarrerChoixAdversaire(elements) {
  let machine = false;
  let reglage = ADVERSAIRE_PAR_DEFAUT;

  const boutons = (attribut) => [...elements.reglagesMachine.querySelectorAll(`[data-${attribut}]`)];

  function afficher() {
    elements.humain.classList.toggle('bouton-actif', !machine);
    elements.machine.classList.toggle('bouton-actif', machine);
    elements.reglagesMachine.hidden = !machine;
    for (const bouton of boutons('niveau')) bouton.classList.toggle('bouton-actif', Number(bouton.dataset.niveau) === reglage.niveau);
    for (const bouton of boutons('style')) bouton.classList.toggle('bouton-actif', bouton.dataset.style === reglage.style);
    for (const bouton of boutons('camp')) bouton.classList.toggle('bouton-actif', bouton.dataset.camp === reglage.camp);
    elements.reflexion.value = reglage.reflexionMax;
  }

  elements.humain.addEventListener('click', () => ((machine = false), afficher()));
  elements.machine.addEventListener('click', () => ((machine = true), afficher()));
  for (const bouton of boutons('niveau')) bouton.addEventListener('click', () => ((reglage = { ...reglage, niveau: Number(bouton.dataset.niveau) }), afficher()));
  for (const bouton of boutons('style')) bouton.addEventListener('click', () => ((reglage = { ...reglage, style: bouton.dataset.style }), afficher()));
  for (const bouton of boutons('camp')) bouton.addEventListener('click', () => ((reglage = { ...reglage, camp: bouton.dataset.camp }), afficher()));

  function preparer(visible) {
    elements.section.hidden = !visible;
    ({ machine, reglage } = lireDernierAdversaire());
    afficher();
  }

  function lire() {
    reglage = lireAdversaire({ ...reglage, reflexionMax: elements.reflexion.value });
    retenirDernierAdversaire({ machine, reglage });
    return machine ? reglage : null;
  }

  return { preparer, lire };
}
