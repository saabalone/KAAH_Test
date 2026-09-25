// Le panneau ▶/▼ de « Mes parties » : un champ a cocher et remplir par element
// du titre des parties (demande de saab : "selectionner plus precisement ce
// qu'on veut"). Ce fichier ne fait que construire les champs et lire leur
// etat ; la comparaison est moteur/filtre-parties.js (partieCorrespond), et
// interface/mes-parties.js n'affiche — donc ne selectionne avec « Tout » — que
// les parties qui correspondent.
//
// Construit UNE fois dans le panneau (vide dans index.html), jamais par
// innerHTML sur du texte saisi.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : FILTRE_VIDE vient de
// moteur/filtre-parties.js, charge avant celui-ci.

// Dans l'ordre du titre "Br_2608172039, Amical, Marguerite Belge,
// Player_1-Player_2, -0-0tr2 Player_2, R".
const CHAMPS_DU_FILTRE_PARTIES = [
  { champ: 'date', libelle: 'Date', exemple: '260925, <2609, >260801' },
  { champ: 'evenement', libelle: 'Événement', exemple: 'Amical, Corr' },
  { champ: 'variante', libelle: 'Variante', exemple: 'Marguerite, PZL' },
  { champ: 'joueurs', libelle: 'Joueurs', exemple: 'saab, j1, saab-ami' },
  { champ: 'score', libelle: 'Score', exemple: '5-6' },
  { champ: 'tours', libelle: 'Tours', exemple: '12, <5, >20' },
  { champ: 'vainqueur', libelle: 'Vainqueur', exemple: 'saab, (en cours)' },
  { champ: 'statut', libelle: 'Statut', exemple: 'N,T (N R D T M _)' },
];

// Renvoie { valeur() (le filtre, au format de FILTRE_VIDE), estActif(),
// reinitialiser() }. `surChangement` : appele a chaque frappe ou case cochee.
function demarrerFiltreParties(panneau, surChangement) {
  const cases = {};
  const saisies = {};

  const ligneBranches = document.createElement('div');
  ligneBranches.className = 'filtre-parties-branches';
  for (const [valeur, libelle] of [['toutes', 'Toutes'], ['avec', 'Avec branches (Br_)'], ['sans', 'Sans branches']]) {
    const etiquette = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'filtre-branches-parties';
    radio.value = valeur;
    radio.checked = valeur === 'toutes';
    radio.addEventListener('change', surChangement);
    etiquette.append(radio, ` ${libelle}`);
    ligneBranches.appendChild(etiquette);
  }
  panneau.appendChild(ligneBranches);

  for (const { champ, libelle, exemple } of CHAMPS_DU_FILTRE_PARTIES) {
    const ligne = document.createElement('label');
    ligne.className = 'filtre-parties-ligne';
    const coche = document.createElement('input');
    coche.type = 'checkbox';
    const nom = document.createElement('span');
    nom.textContent = libelle;
    const saisie = document.createElement('input');
    saisie.type = 'text'; // jamais 'number' : "<5" doit pouvoir s'ecrire
    saisie.placeholder = exemple;
    // Remplir un champ le coche tout seul ; le decocher garde son texte.
    saisie.addEventListener('input', () => {
      coche.checked = saisie.value.trim() !== '';
      surChangement();
    });
    coche.addEventListener('change', surChangement);
    ligne.append(coche, nom, saisie);
    panneau.appendChild(ligne);
    cases[champ] = coche;
    saisies[champ] = saisie;
  }

  // Le mode d'emploi en une ligne (saab : "indiquer qu'on peut mettre ces signes").
  const aide = document.createElement('p');
  aide.className = 'filtre-parties-aide';
  aide.textContent =
    'Plusieurs choix : séparés par une virgule. Date et Tours : < avant, > après, rien ou = exact. ' +
    'Joueurs : « A-B » dans un sens ou l’autre, « j1 » pour Joueur 1. Score : 5-6 ou 6-5.';
  panneau.appendChild(aide);

  const effacer = document.createElement('button');
  effacer.type = 'button';
  effacer.className = 'bouton-dialogue';
  effacer.textContent = 'Effacer le filtre';
  effacer.addEventListener('click', () => {
    reinitialiser();
    surChangement();
  });
  panneau.appendChild(effacer);

  function valeur() {
    const branches = panneau.querySelector('input[name="filtre-branches-parties"]:checked').value;
    const filtre = { ...FILTRE_VIDE, branches };
    for (const { champ } of CHAMPS_DU_FILTRE_PARTIES) {
      filtre[champ] = { actif: cases[champ].checked, valeur: saisies[champ].value };
    }
    return filtre;
  }

  function estActif() {
    const filtre = valeur();
    return (
      filtre.branches !== 'toutes' ||
      CHAMPS_DU_FILTRE_PARTIES.some(({ champ }) => filtre[champ].actif && filtre[champ].valeur.trim() !== '')
    );
  }

  function reinitialiser() {
    panneau.querySelector('input[value="toutes"]').checked = true;
    for (const { champ } of CHAMPS_DU_FILTRE_PARTIES) {
      cases[champ].checked = false;
      saisies[champ].value = '';
    }
  }

  return { valeur, estActif, reinitialiser };
}
