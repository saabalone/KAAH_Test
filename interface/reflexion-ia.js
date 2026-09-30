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
// arbre.js), libelleEvaluation (moteur/ia.js), ABREVIATIONS_PHASES
// (moteur/ia-evaluation.js) viennent de fichiers charges avant celui-ci.

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
// afficherEnCours(enCours | null), enCommentaire() } — `enCours` : { etat, camp,
// coupsJoues, duree, profondeur, noeuds, evaluation, sequence (textes) }, plus,
// pour ce qu'elle aurait joue, { hypothese: true, coup, jouer() }.
function demarrerReflexionIA(details, sequencePrevue) {
  details.hidden = false;
  const corps = details.querySelector('tbody');
  const caseCommentaire = details.querySelector('.case-reflexion-commentaire');
  let lignesDuChemin = [];
  let enCours = null;

  try {
    caseCommentaire.checked = window.localStorage.getItem(CLE_REFLEXION_EN_COMMENTAIRE) !== 'non';
  } catch {
    caseCommentaire.checked = true;
  }
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

  function celluleCoup(texteCoup, jouer) {
    const td = cellule(texteCoup);
    if (jouer) {
      td.classList.add('coup-hypothese');
      td.title = "Ce qu'elle aurait joué ici : touchez pour le jouer (une nouvelle branche)";
      td.addEventListener('click', jouer);
    }
    return td;
  }

  function ligne({ etat, camp, coupsJoues, coup, duree, profondeur, source, noeuds, evaluation, sequence, phase, hypothese, jouer }, classe) {
    const tr = document.createElement('tr');
    if (classe) tr.className = classe;
    const marque = camp === 'noir' ? '●' : '○';
    const texteCoup = `${numeroDeTour(coupsJoues)} ${marque} ${hypothese && coup ? '→ ' : ''}${coup ?? '…'}`;
    tr.append(
      celluleCoup(texteCoup, hypothese ? jouer : null),
      cellule(`${duree.toFixed(DECIMALES_DUREE_REFLEXION)} s`),
      cellule(source === 'livre' ? 'livre' : String(profondeur ?? '')),
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
  }

  // Les coups de la machine sur le chemin regarde.
  function actualiser(arbre) {
    lignesDuChemin = [];
    let parent = arbre.racine;
    arbre.chemin.forEach((index, rang) => {
      const noeud = parent.enfants[index];
      if (noeud.reflexionIA) lignesDuChemin.push({ etat: parent.etat, camp: parent.etat.joueurAuTrait, coupsJoues: rang + 1, coup: noeud.coup, ...noeud.reflexionIA });
      parent = noeud;
    });
    afficherTableau();
  }

  function afficherEnCours(nouveau) {
    enCours = nouveau;
    afficherTableau();
  }

  return { actualiser, afficherEnCours, enCommentaire: () => caseCommentaire.checked };
}
