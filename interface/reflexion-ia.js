// Ce que la machine pense (phase 32, saab) : le tableau repliable (« temps de
// reflexion / profondeur / coups / evaluation / sequence prevue »), deplie par
// defaut, en tete de la colonne des tableaux — jamais au-dessus du plateau, qu'il
// retrecissait en paysage (interface/disposition.js). Son evaluation, elle, est
// a cote du compte d'ejections (interface/evaluations.js). Tout vient de
// l'arbre (moteur/arbre.js, marquerReflexionIA : chaque coup de la machine y
// garde sa reflexion, fichier compris) : naviguer ou rejouer une partie montre
// la reflexion d'alors. Plus une ligne « en cours » pendant qu'elle cherche.
//
// Saab, 2026-09-30 : la sequence prevue tient sur 2 lignes (la boite ne
// s'elargit jamais, le plateau ne bouge pas) et un clic dessus la montre sur un
// petit plateau (interface/sequence-prevue.js) ; la case « en commentaire »
// (cochee par defaut, retenue sur cet appareil) fait ecrire chaque ligne dans
// le commentaire du coup (interface/ia.js). Sur une position deja jouee, la
// ligne du haut dit ce que la machine AURAIT joue (« → a1b2 ») : la toucher
// joue ce coup.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : numeroDeTour (moteur/
// arbre.js), libelleEvaluation (moteur/ia.js), rechercheEcourtee (moteur/ia-recherche.js), ABREVIATIONS_PHASES
// (moteur/ia-evaluation.js), ajusterHauteursColonne, demarrerHauteursColonne
// (interface/hauteurs-colonne.js), demarrerRechercheIA (interface/recherche-ia.js),
// doublerBoutonsPlateau (interface/disposition.js), activerRedimensionnementLargeur
// (interface/sequence.js) viennent de fichiers charges
// avant celui-ci.

const DECIMALES_DUREE_REFLEXION = 1;
const CLE_REFLEXION_EN_COMMENTAIRE = 'kaah-reflexion-en-commentaire';

function texteEvaluation(reflexion) {
  if (reflexion.source === 'livre') return 'Livre';
  return Number.isFinite(reflexion.evaluation) ? libelleEvaluation(reflexion.evaluation) : '';
}

// Les coups de la sequence en deux lignes, la premiere un peu plus longue.
function sequenceSurDeuxLignes(sequence) {
  const moitie = Math.ceil(sequence.length / 2);
  const lignes = [sequence.slice(0, moitie), sequence.slice(moitie)].filter((ligne) => ligne.length > 0);
  return lignes.flatMap((ligne, rang) => (rang === 0 ? [ligne.join(' ')] : [document.createElement('br'), ligne.join(' ')]));
}

// `details` : #reflexion-ia (montre seulement contre la machine) ;
// `sequencePrevue` : interface/sequence-prevue.js. Renvoie { actualiser(arbre),
// afficherEnCours(enCours | null), enCommentaire(), montrer(oui) } — `enCours` : { etat, camp,
// coupsJoues, duree, profondeur, noeuds, evaluation, sequence (textes) }, plus,
// pour ce qu'elle aurait joue, { hypothese: true, coup, jouer() }.
function demarrerReflexionIA(details, sequencePrevue) {
  const corps = details.querySelector('tbody');
  const caseCommentaire = details.querySelector('.case-reflexion-commentaire');
  const boutonRelancer = details.querySelector('.bouton-relancer-ia');
  // La recherche de KAI++ par premier coup (interface/recherche-ia.js).
  const recherche = demarrerRechercheIA(details.querySelector('.recherche-ia'), sequencePrevue);
  // La barre de navigation sous le tableau (saab, 2026-10-02 : « sinon je suis
  // oblige d'ouvrir Sequence pour avoir la barre ») : des doubles de celle du
  // plateau (interface/disposition.js).
  const actualiserNavigation = doublerBoutonsPlateau(details.querySelectorAll('.navigation-reflexion-ia [data-bouton-plateau]'));
  // Sa poignee de largeur, sur son bord gauche : la meme largeur de colonne que
  // la Sequence (interface/sequence.js).
  activerRedimensionnementLargeur(details, details.querySelector('.poignee-largeur-reflexion'));
  let relancer = () => {};
  // Auto ou pas a pas (saab, 2026-10-03 : « faire avancer les parties IA contre
  // IA au coup par coup ou auto ») : interface/ia.js decide, ces boutons le disent.
  const boutonPasAPas = details.querySelector('.bouton-pas-a-pas-ia');
  const boutonCoup = details.querySelector('.bouton-coup-ia');
  let pasAPas = false;
  let changerPasAPas = () => {};
  let jouerUnCoup = () => {};
  boutonPasAPas.addEventListener('click', (evenement) => {
    evenement.preventDefault();
    pasAPas = !pasAPas;
    boutonPasAPas.textContent = pasAPas ? 'Pas à pas' : 'Auto';
    boutonPasAPas.classList.toggle('bouton-actif', pasAPas);
    boutonCoup.hidden = !pasAPas;
    changerPasAPas(pasAPas);
  });
  boutonCoup.addEventListener('click', (evenement) => {
    evenement.preventDefault();
    jouerUnCoup();
  });
  let allerAuCoup = () => {}; // (chemin) : comme un clic dans la Sequence
  let lignesDuChemin = [];
  let enCours = null;

  try {
    caseCommentaire.checked = window.localStorage.getItem(CLE_REFLEXION_EN_COMMENTAIRE) !== 'non';
  } catch {
    caseCommentaire.checked = true;
  }
  // Dans le titre du tableau : le toucher ne doit pas le replier.
  boutonRelancer.addEventListener('click', (evenement) => {
    evenement.preventDefault();
    relancer();
  });

  caseCommentaire.addEventListener('change', () => {
    try {
      window.localStorage.setItem(CLE_REFLEXION_EN_COMMENTAIRE, caseCommentaire.checked ? 'oui' : 'non');
    } catch {
      // Stockage indisponible : le choix vaut pour cette page seulement.
    }
  });

  function cellule(texte) {
    const td = document.createElement('td');
    td.textContent = texte;
    return td;
  }

  // « 3/5 ⏱ » : son temps s'est ecoule avant la profondeur de son niveau (saab,
  // 2026-10-01 : « il faudra que ce soit indique pour le savoir et changer si
  // besoin »).
  function celluleProfondeur({ source, profondeur, evaluation, niveau }) {
    if (source === 'livre') return cellule('livre');
    if (source === 'solution') return cellule('fin vue');
    if (!niveau || !rechercheEcourtee({ source, profondeur, evaluation }, niveau)) return cellule(String(profondeur ?? ''));
    const td = cellule(`${profondeur}/${niveau} ⏱`);
    td.className = 'profondeur-ecourtee';
    td.title = `Temps de réflexion écoulé avant le niveau ${niveau} : profondeur ${profondeur} seulement`;
    return td;
  }

  function celluleSequence(etat, sequence, titre) {
    const td = document.createElement('td');
    td.className = 'sequence-prevue';
    td.append(...sequenceSurDeuxLignes(sequence ?? []));
    if (etat && sequence?.length) {
      td.classList.add('sequence-prevue-cliquable');
      td.title = 'Voir la séquence sur un plateau';
      td.addEventListener('click', () => sequencePrevue.montrer(etat, sequence, titre));
    }
    return td;
  }

  // Un coup joue : le toucher y va ; ce qu'elle aurait joue : le toucher le joue.
  function celluleCoup(texteCoup, jouer, chemin) {
    const td = cellule(texteCoup);
    if (jouer) {
      td.classList.add('coup-hypothese');
      td.title = "Ce qu'elle aurait joué ici : touchez pour le jouer (une nouvelle branche)";
      td.addEventListener('click', jouer);
    } else if (chemin) {
      td.classList.add('coup-reflexion-navigable');
      td.title = 'Aller à ce coup';
      td.addEventListener('click', () => allerAuCoup(chemin));
    }
    return td;
  }

  function ligne({ etat, camp, coupsJoues, coup, duree, profondeur, source, noeuds, evaluation, sequence, phase, niveau, hypothese, suggestion, jouer, chemin, actif }, classe) {
    const tr = document.createElement('tr');
    if (classe) tr.className = classe;
    // Le coup regarde sur le plateau, encadre (saab, 2026-10-02).
    if (actif) tr.classList.add('coup-actif');
    const marque = camp === 'noir' ? '●' : '○';
    const texteCoup = `${numeroDeTour(coupsJoues)} ${marque} ${suggestion ? 'Sugg. ' : ''}${hypothese && coup ? '→ ' : ''}${coup ?? '…'}`;
    tr.append(
      celluleCoup(texteCoup, hypothese ? jouer : null, chemin),
      cellule(`${duree.toFixed(DECIMALES_DUREE_REFLEXION)} s`),
      celluleProfondeur({ source, profondeur, evaluation, niveau }),
      cellule(String(noeuds ?? '')),
      cellule(`${phase ? `${ABREVIATIONS_PHASES[phase]} ` : ''}${texteEvaluation({ source, evaluation })}`),
      celluleSequence(etat, sequence, `Séquence prévue — ${texteCoup}`)
    );
    return tr;
  }

  // La plus recente en haut : on la voit sans faire defiler.
  function afficherTableau() {
    const lignes = lignesDuChemin.map((l) => ligne(l)).reverse();
    if (enCours) lignes.unshift(ligne(enCours, enCours.hypothese && enCours.coup ? 'reflexion-hypothese' : 'reflexion-en-cours'));
    corps.replaceChildren(...lignes);
    // Sur ordinateur, toute la hauteur libre (interface/hauteurs-colonne.js).
    ajusterHauteursColonne();
  }

  const reajuster = demarrerHauteursColonne();

  // Les coups de la machine sur le chemin regarde.
  function actualiser(arbre) {
    lignesDuChemin = [];
    let parent = arbre.racine;
    let precedent = null; // la position d'avant le dernier coup
    let dernier = null; // le texte du dernier coup
    arbre.chemin.forEach((index, rang) => {
      const noeud = parent.enfants[index];
      const actif = rang === arbre.chemin.length - 1;
      if (noeud.reflexionIA) lignesDuChemin.push({ etat: parent.etat, camp: parent.etat.joueurAuTrait, coupsJoues: rang + 1, coup: noeud.coup, chemin: arbre.chemin.slice(0, rang + 1), actif, ...noeud.reflexionIA });
      precedent = parent.etat;
      dernier = noeud.coup;
      parent = noeud;
    });
    afficherTableau();
    actualiserNavigation();
    // Ce que KAI++ a cherche pour ce coup, et ici ; les coups joues, encadres.
    recherche.montrerPosition(parent.etat, precedent, { dernier, suivant: parent.enfants[0]?.coup ?? null });
  }

  function afficherEnCours(nouveau) {
    enCours = nouveau;
    afficherTableau();
    recherche.afficher(nouveau);
  }

  return {
    actualiser,
    afficherEnCours,
    enCommentaire: () => caseCommentaire.checked,
    // Seulement s'il y a une machine a la table (interface/ia.js).
    montrer: (oui) => {
      if (details.hidden === !oui) return;
      details.hidden = !oui;
      reajuster();
    },
    // Toucher un coup du tableau y va (saab, 2026-10-02 : « pour naviguer facilement »).
    brancherNavigation: (action) => {
      allerAuCoup = action;
    },
    // Ce que fait le bouton « Relancer » (interface/ia.js).
    brancherRelance: (action) => {
      relancer = action;
    },
    // Auto / Pas a pas : `changer(oui)` au basculement, `jouer()` a « Coup IA ».
    brancherPasAPas: (changer, jouer) => {
      changerPasAPas = changer;
      jouerUnCoup = jouer;
    },
    // Une recherche de KAI++ finie, gardee pour la revoir (interface/recherche-ia.js).
    garderRecherche: (nouvelle) => recherche.garder(nouvelle),
  };
}
