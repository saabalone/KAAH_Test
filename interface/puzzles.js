// Dialogue "Puzzles" (phase 16) : parcourir les puzzles de KAAWA
// (donnees/kaa-puzzles.js, copie mecanique de KAA_PZL_kaa.json), avec un
// apercu au premier clic sur une ligne et un chargement au second — exactement
// le meme geste que les Variantes (interface/variantes.js), que saab connait
// deja.
//
// DELIBEREMENT UN FICHIER A PART, et non un "selecteur generique" partage
// avec les Variantes (CLAUDE.md : pas d'abstraction prematuree, "du code un
// peu repetitif et evident vaut mieux que du code astucieux et indirect").
// Les deux listes se ressemblent aujourd'hui mais ne disent pas la meme
// chose : un puzzle porte un objectif ("Noir gagne en 3 tours") et l'etat de
// sa solution, une variante un createur. La suite du PLAN les eloignera
// encore (phase 28, le solveur ; les puzzles resolus a marquer).
//
// Permutation aleatoire (phase 16bis, interface/puzzles-permutations.js) :
// l'apercu et le chargement montrent tous deux l'orientation CHOISIE pour ce
// puzzle (choisirPermutationPourPuzzle), jamais forcement celle ecrite dans
// donnees/kaa-puzzles.js — ce fichier-ci n'a pas besoin d'en savoir plus.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : dessinerPlateau,
// poserBille (rendu/plateau-svg.js), dessinerEjectionsApercu
// (rendu/ejections-apercu.js), depuisNotation (moteur/plateau.js),
// lirePosition (moteur/notation.js), choisirPermutationPourPuzzle,
// reinitialiserChoixPermutations (interface/puzzles-permutations.js)
// viennent tous de fichiers charges avant celui-ci dans index.html.

const CLE_FAVORIS_PUZZLES = 'kaah-puzzles-favoris';

function listerPuzzlesFavoris() {
  try {
    const texte = window.localStorage.getItem(CLE_FAVORIS_PUZZLES);
    return texte ? JSON.parse(texte) : [];
  } catch {
    return [];
  }
}

function basculerPuzzleFavori(nom) {
  const favoris = listerPuzzlesFavoris();
  const index = favoris.indexOf(nom);
  if (index === -1) favoris.push(nom);
  else favoris.splice(index, 1);
  try {
    window.localStorage.setItem(CLE_FAVORIS_PUZZLES, JSON.stringify(favoris));
  } catch {
    // Tant pis : jamais de plantage pour un favori qui n'a pas pu
    // s'enregistrer (meme philosophie qu'interface/sauvegarde.js).
  }
}

// "Noir gagne en 3 tours" plutot que "xtr3x1" : le marqueur de KAAWA est
// une convention de nom de fichier, pas une phrase pour un joueur.
function decrireObjectif(puzzle) {
  const camp = puzzle.campGagnant === 'noir' ? 'Noir' : 'Blanc';
  const tours = puzzle.toursMaximum === 1 ? '1 tour' : `${puzzle.toursMaximum} tours`;
  return `${camp} gagne en ${tours}`;
}

// `elements` : { bouton, dialogue, liste, apercu, fermer}. `apercu` est un
// <svg> vide, dedie a l'apercu : les billes ejectees
// (rendu/ejections-apercu.js) s'y dessinent aussi, en 2 colonnes dans son
// coin bas-gauche, comme KAAWA. `puzzles` : le tableau renvoye par
// moteur.lirePuzzles. `surChargement(puzzle)` est appele quand
// l'utilisateur confirme (voir index.html, qui sait demarrer une partie
// neuve sur cette position). `surPrevisualisation(puzzle ou null)` : comme dans
// interface/variantes.js.
function demarrerSelectionPuzzles(elements, puzzles, surChargement, surPrevisualisation) {
  let previsualise = null;
  // Rangee de classement (phase 20ter) : seulement les categories non vides.
  const filtre = creerBarreFiltres(
    elements.filtres,
    categoriesNonVides(CATEGORIES_PUZZLES, (cle) => filtrerPuzzles(puzzles, cle)),
    'kaah-filtre-puzzles',
    () => {
      previsualiser(null);
      rafraichir();
    }
  );

  elements.bouton.addEventListener('click', () => {
    previsualiser(null);
    // Nouvelle visite de la boite : un nouveau tirage a chaque fois, plutot
    // que de proposer indefiniment la meme orientation deja vue.
    reinitialiserChoixPermutations();
    rafraichir();
    elements.dialogue.showModal();
  });

  // La position CHOISIE pour ce puzzle (l'orientation tiree au hasard, ou
  // celle du fichier si l'interrupteur est desactive) : celle que l'apercu
  // dessine, et celle que le chargement doit reellement utiliser — jamais
  // deux choix differents pour le meme puzzle (interface/puzzles-permutations.js).
  function puzzleAJouer(puzzle) {
    return { ...puzzle, texteBrut: choisirPermutationPourPuzzle(puzzle).texteBrut };
  }

  function previsualiser(puzzle) {
    previsualise = puzzle;
    if (puzzle) afficherApercu(puzzle);
    else elements.apercu.innerHTML = '';
    surPrevisualisation(puzzle);
  }

  elements.fermer.addEventListener('click', () => elements.dialogue.close());

  // Cliquer l'APERCU vaut confirmation, comme dans les Variantes (idee de
  // saab) : c'est ce qu'on regarde au moment de decider.
  elements.apercu.addEventListener('click', () => {
    if (!previsualise) return;
    surChargement(puzzleAJouer(previsualise));
    elements.dialogue.close();
  });

  function rafraichir() {
    elements.liste.innerHTML = '';
    const favoris = listerPuzzlesFavoris();
    // Les favoris d'abord, puis l'ordre du fichier — qui n'est PAS
    // alphabetique comme pour les variantes, et c'est voulu : les puzzles y
    // sont ranges du plus facile au plus difficile (Mini_PZL_E, puis Pzl_M,
    // puis PZL_H), un ordre qu'un tri alphabetique detruirait.
    const triees = [...filtrerPuzzles(puzzles, filtre.cle())].sort((premier, second) => {
      const favoriPremier = favoris.includes(premier.nom);
      const favoriSecond = favoris.includes(second.nom);
      if (favoriPremier !== favoriSecond) return favoriPremier ? -1 : 1;
      return 0;
    });
    for (const puzzle of triees) {
      elements.liste.appendChild(creerLigne(puzzle, favoris.includes(puzzle.nom)));
    }
    garderLaLigneChoisieEnVue();
  }

  // Meme raison et meme methode que dans interface/variantes.js : la liste
  // est reconstruite a chaque clic, et la ligne qu'on vient de choisir doit
  // rester sous les yeux pour pouvoir la confirmer. Defilement calcule a la
  // main sur la liste, jamais `scrollIntoView`.
  function garderLaLigneChoisieEnVue() {
    const ligne = elements.liste.querySelector('.ligne-variante-previsualisee');
    if (!ligne) return;
    const cadreListe = elements.liste.getBoundingClientRect();
    const cadreLigne = ligne.getBoundingClientRect();
    if (cadreLigne.top < cadreListe.top) {
      elements.liste.scrollTop -= cadreListe.top - cadreLigne.top;
    } else if (cadreLigne.bottom > cadreListe.bottom) {
      elements.liste.scrollTop += cadreLigne.bottom - cadreListe.bottom;
    }
  }

  function creerLigne(puzzle, estFavori) {
    const ligne = document.createElement('div');
    ligne.className = puzzle === previsualise ? 'ligne-liste ligne-variante-previsualisee' : 'ligne-liste';

    const boutonFavori = document.createElement('button');
    boutonFavori.type = 'button';
    boutonFavori.className = estFavori ? 'bouton-favori bouton-favori-actif' : 'bouton-favori';
    boutonFavori.textContent = estFavori ? '★' : '☆';
    boutonFavori.title = estFavori ? 'Retirer des favoris' : 'Ajouter aux favoris';
    boutonFavori.addEventListener('click', (evenement) => {
      evenement.stopPropagation(); // ne doit pas aussi previsualiser/charger la ligne
      basculerPuzzleFavori(puzzle.nom);
      rafraichir();
    });
    ligne.appendChild(boutonFavori);

    const texte = document.createElement('span');
    texte.className = 'ligne-liste-texte';
    // Le nom brut contient le marqueur "(-5-5)xtr2x", illisible : on n'en
    // garde que ce qui precede la virgule, et l'objectif s'ecrit en clair
    // dans sa propre colonne.
    // "(my) " : le prefixe de KAAWA pour les puzzles crees soi-meme.
    texte.textContent = `${puzzle.my ? '(my) ' : ''}${puzzle.nom.split(',')[0]}`;
    texte.title = puzzle.nom; // le nom complet reste consultable au survol
    ligne.appendChild(texte);

    const objectif = document.createElement('span');
    objectif.className = 'objectif-puzzle';
    objectif.textContent = decrireObjectif(puzzle);
    ligne.appendChild(objectif);

    ligne.addEventListener('click', () => {
      if (previsualise === puzzle) {
        surChargement(puzzleAJouer(puzzle));
        elements.dialogue.close();
        return;
      }
      previsualiser(puzzle);
      rafraichir(); // remet en evidence la ligne previsualisee
    });

    return ligne;
  }

  // Dessine la position CHOISIE du puzzle (voir puzzleAJouer plus haut) dans
  // le <svg> d'apercu, independant du plateau principal — identifiants
  // prefixes pour ne jamais entrer en collision avec ceux des vraies billes
  // en jeu.
  function afficherApercu(puzzle) {
    const position = lirePosition(choisirPermutationPourPuzzle(puzzle).texteBrut);
    elements.apercu.innerHTML = '';
    dessinerPlateau(elements.apercu);
    for (const [notation, bille] of Object.entries(position.plateau)) {
      const { q, r } = depuisNotation(notation);
      poserBille(elements.apercu, { id: `apercu-puzzle-${bille.id}`, q, r, couleur: bille.couleur });
    }
    // Utile surtout ici : une position a handicap (CLAUDE.md) demarre deja
    // avec un compteur a 3, 4 ou 5 — sans ces colonnes, l'apercu d'un tel
    // puzzle semblait commencer a zero.
    dessinerEjectionsApercu(elements.apercu, position.billesEjecteesNoires, position.billesEjecteesBlanches);
  }
}

// Le bandeau qui suit un puzzle EN COURS de partie : l'objectif, puis le
// verdict des que la partie bascule. `element` est masque tant qu'aucun
// puzzle n'est charge — une partie ordinaire ne doit rien voir de tout ca.
// `etat` vient de moteur.etatDuPuzzle ; `verdict` (phase 28, interface/
// verification-puzzle.js) : celui du solveur pour une victoire au bon tour,
// ou null. `etiquette` (facultative) : les reglages PZL a usage unique encore
// en attente (KAAWA : "[offset:2, seuil:1s]").
function afficherEtatPuzzle(element, puzzle, etat, verdict = null, etiquette = '') {
  if (!puzzle) {
    element.hidden = true;
    return;
  }
  element.hidden = false;
  const ton = tonDuPuzzle(etat, verdict);
  // `bandeau-puzzle-final` : une fin de puzzle doit SE VOIR (saab : "pas assez
  // visible, le faire clignoter") — gros, fond de couleur, clignotant (styles.css).
  element.className = `bandeau-puzzle bandeau-puzzle-${ton}${etat.resultat === 'en cours' ? '' : ' bandeau-puzzle-final'}`;
  const suffixe = etiquette ? ` ${etiquette}` : '';
  element.textContent = `${decrireObjectif(puzzle)} — ${phraseDeResultat(puzzle, etat, verdict)}${suffixe}`;
}

// La couleur d'une fin de puzzle, partagee par ce bandeau et le cadre de fin
// sur le plateau (index.html) : 'solution' (vert, Bravo), 'refus' (rouge, tout
// "ce n'est pas la solution" — demande de saab), 'incertain' (orange :
// verification en cours, peut-etre, solveur indisponible), 'en-cours' (partie
// pas finie).
function tonDuPuzzle(etat, verdict) {
  if (etat.resultat === 'en cours') return 'en-cours';
  if (etat.resultat === 'perdu' || etat.tropTot) return 'refus';
  if (verdict?.verdict === 'valide') return 'solution';
  if (verdict?.verdict === 'invalide') return 'refus';
  return 'incertain';
}

// LE RANG DU COUP FAUTIF N'EST JAMAIS DIT, ni pendant, ni apres. Le dire
// pendant la partie soufflait la reponse (il suffisait d'essayer les coups
// un par un jusqu'a ce que le reproche disparaisse) — mais le dire A LA FIN
// revient exactement au meme : on relance le puzzle en sachant que c'est le
// coup 1 qu'il faut changer (signale par saab, "ca revient au meme que le
// dire sur le coup 1 !"). Le bandeau se contente donc de dire ou en est la
// partie — et, phase 28, le verdict du solveur une fois le puzzle gagne, SANS
// le coup fautif qu'il connait pourtant (moteur/solveur.js, lireReponseSolveur).
//
// Les textes de fin sont ceux de KAAWA, mot pour mot (demande de saab ;
// kaa_board_widget_ClO_Co.py, show_end_options et _apply_sol_result), accents
// en plus.
function phraseDeResultat(puzzle, etat, verdict) {
  if (etat.resultat === 'resolu') {
    if (etat.tropTot) return "Trop rapide, ce n'est pas la solution! L'adversaire a mal joué!";
    return phraseDuVerdict(verdict);
  }
  if (etat.resultat === 'perdu') return "Ce n'est pas la solution! Nombre de tours dépassé sans atteindre l'objectif.";
  return `tour ${etat.tour}/${puzzle.toursMaximum}`;
}

const DEMANDE_D_ENVOI = 'Copie-colle le nom du PZL et la séquence et envoie-les sur mon WhatsApp.';

// Une verification qui a pris plus que le seuil pzl.save_threshold_sec le dit
// (KAAWA : popup "Vérification lente") — la prochaine fois, le cache repondra.
function phraseDuVerdict(verdict) {
  if (!verdict || verdict.verdict === 'en cours') return 'Gagné — vérification par le solveur…';
  if (verdict.verdict === 'valide') {
    return verdict.lente ? `Bravo! C'est la solution! (vérifié en ${Math.round(verdict.duree)} s, mis en cache)` : "Bravo! C'est la solution!";
  }
  if (verdict.verdict === 'invalide') return "Ce n'est pas la solution!";
  if (verdict.verdict === 'indetermine') return `C'est peut-être la solution! Mais ça demande vérification. ${DEMANDE_D_ENVOI}`;
  if (verdict.raison === 'SOLVEUR_INDISPONIBLE') {
    return `Vérification impossible (solveur introuvable sur cet appareil). ${DEMANDE_D_ENVOI}`;
  }
  return `Erreur du solveur pendant la vérif. ${DEMANDE_D_ENVOI}`;
}
