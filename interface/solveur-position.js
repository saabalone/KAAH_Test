// Le panneau SOLVEUR (saab, 2026-11-06 : « je ne sais pas lancer le solver sur une position, il manque un btn, non ? » ;
// « On ne met ce btn que dans version travail pour le moment et dans la barre d'outils » ; « met le btn au dessus du
// btn Test » ; « pour le moment le solver ne sera que sur PC » ; « il faudrait mettre dans la colonne de droite le
// tableau de recherche du solveur ») : un panneau de la colonne de droite, comme Conseils, jamais une boite qui
// recouvre le plateau. Sur la position affichee : le gain force le plus court pour le camp choisi, tour par tour, les
// solutions et leurs sequences au fil de la recherche (interface/solveur-position-recherche.js, le tableau dans
// interface/solveur-position-tableau.js), puis « Créer le PZL My », la boite My deja remplie — ce que saab faisait a
// la main avec le solveur de ULA. Ou bien Perd : les coups du camp au trait qui perdent (interface/solveur-position-
// perd.js). Ce fichier n'orchestre que le panneau.
//
// Le haut du panneau (la position, le camp qui doit gagner) suit le plateau : c'est ce que cherchera le prochain
// Chercher. Les resultats, eux, restent jusqu'a la recherche suivante, avec la position cherchee (saab, 2026-11-06 :
// « pendant que ça joue j'ai mis le solveur mais il n'affiche aucun coups » — le coup suivant de la partie les
// effacait). Un worker a soi, cree a chaque recherche avec le temps maxi choisi (interface/solveur.js) ; Arreter le
// coupe net.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerSolveur (interface/solveur.js), brancheCompacte,
// fusionnerBranchesSolution (moteur/solveur.js), niveauDuPuzzle (moteur/banc-puzzles.js), sequenceNumerotee,
// minutesConseilleesDuSolveur (moteur/solveur-position.js), rechercherAvecLeSolveur, NOM_DU_CAMP_DU_SOLVEUR, MILLISECONDES_PAR_SECONDE_DU_SOLVEUR
// (interface/solveur-position-recherche.js),
// rechercherLesCoupsQuiPerdent, lignesDuBilanDesPertes (interface/solveur-position-perd.js), lignesDuTableauDuSolveur
// (interface/solveur-position-tableau.js), ecrirePosition (moteur/notation.js) viennent d'autres fichiers, appeles
// seulement a l'usage.

const TOURS_MAX_DU_SOLVEUR = 5; // si le champ est vide ou faux
const SECONDES_PAR_MINUTE_DU_SOLVEUR = 60;
const texteDeLaPosition = (etat) => `${ecrirePosition(etat)} — ${NOM_DU_CAMP_DU_SOLVEUR[etat.joueurAuTrait]} au trait`;

// `elements` : { bouton (l'icone), panneau, position, boutonsGagnant (data-gagnant), perd, toursMax, minutes, toutes (la case
// « Chercher toutes les solutions »), etat, resultat, liste, chercher, arreter, creerPzl, fermer }. `rappels` : {
// etatActuel(), creerPuzzleMy(formulaire) (la boite My, deja remplie), montrerSequence(etat, coups, titre) (le petit
// plateau, interface/sequence-prevue.js) }. Renvoie { actualiser } — a appeler apres chaque coup ou navigation.
function demarrerSolveurPosition(elements, rappels) {
  let etat = null; // la position du prochain Chercher : celle du plateau
  let gagnant = 'noir';
  let perd = false; // Perd (interface/solveur-position-perd.js) : les coups du camp au trait qui perdent
  let solveur = null;
  let enCours = false;
  let cherche = null; // { etat, gagnant } de la derniere recherche
  let recherche = null; // son resultat (interface/solveur-position-recherche.js), quand un gain est prouve

  const entier = (champ, defaut) => {
    const valeur = Number(champ.value);
    return Number.isInteger(valeur) && champ.value !== '' ? Math.max(Number(champ.min), Math.min(Number(champ.max), valeur)) : defaut;
  };
  const dire = (texte) => (elements.etat.textContent = texte);
  const montrerLaSequence = ({ coup, coups }) => rappels.montrerSequence(cherche.etat, coups, `Solveur : ${coup.toUpperCase()}, ${recherche.nomDuGagnant} doit gagner`);
  const afficherTableau = () => elements.liste.replaceChildren(...(recherche?.lignes ? lignesDuTableauDuSolveur(recherche, montrerLaSequence) : []));

  function afficherChoix() {
    for (const bouton of elements.boutonsGagnant) bouton.classList.toggle('bouton-actif', !perd && bouton.dataset.gagnant === gagnant);
    elements.perd.classList.toggle('bouton-actif', perd);
    elements.chercher.hidden = enCours;
    elements.arreter.hidden = !enCours;
    elements.creerPzl.disabled = enCours || !recherche?.fini || recherche.perd || !recherche.lignes.some(({ verdict }) => verdict === 'valide');
    for (const champ of [elements.toursMax, elements.minutes, elements.toutes]) champ.disabled = enCours;
    elements.position.textContent = etat ? texteDeLaPosition(etat) : '';
  }

  const ajouterUneLigne = (texte) => {
    const ligne = document.createElement('p');
    ligne.className = 'ligne-resultat-solveur';
    ligne.textContent = texte;
    elements.resultat.append(ligne);
  };

  for (const bouton of elements.boutonsGagnant) {
    bouton.addEventListener('click', () => {
      gagnant = bouton.dataset.gagnant;
      perd = false;
      afficherChoix();
    });
  }
  // Le temps max suit les tours maxi (moteur/solveur-position.js, minutesConseilleesDuSolveur), puis se change a la main.
  elements.toursMax.addEventListener('input', () => (elements.minutes.value = minutesConseilleesDuSolveur(entier(elements.toursMax, TOURS_MAX_DU_SOLVEUR))));
  elements.perd.addEventListener('click', () => {
    perd = true;
    afficherChoix();
  });

  // Le bilan, comme le « Sol: 32 (32 solution(s) + 17 sous-opt.) » du solveur de KAAWA.
  function bilan() {
    const { tours, nomDuGagnant, gagnantAuTrait, toutes, toutesJugees, lignes } = recherche;
    const solutions = lignes.filter(({ verdict }) => verdict === 'valide');
    const nomDuPerdant = NOM_DU_CAMP_DU_SOLVEUR[cherche.etat.joueurAuTrait];
    const quoi = gagnantAuTrait ? 'solutions au 1er coup' : `meilleures défenses de ${nomDuPerdant} au 1er coup`;
    let compte;
    if (!toutes) compte = `${gagnantAuTrait ? '1re solution trouvée' : `1re meilleure défense de ${nomDuPerdant} trouvée`} (cochez « Chercher toutes les solutions » pour les compter)`;
    else if (!toutesJugees) compte = `${quoi} : pas tous jugés à temps`;
    else compte = `${quoi} : ${solutions.length}${gagnantAuTrait ? '' : ` (${lignes.length - solutions.length} perdent plus vite)`}`;
    ajouterUneLigne(`${nomDuGagnant} gagne en ${tours} tour${tours > 1 ? 's' : ''} ; ${compte}.`);
    const sequence = solutions.find(({ coups }) => coups)?.coups;
    ajouterUneLigne(`Séquence : ${sequence ? sequenceNumerotee(sequence) : 'pas trouvée à temps'}`);
  }

  async function chercher() {
    // La position et le camp de CETTE recherche : le plateau peut bouger pendant qu'elle tourne.
    cherche = { etat, gagnant, perd };
    recherche = null;
    afficherTableau();
    elements.resultat.replaceChildren();
    const quoi = perd ? 'ses coups qui perdent' : `${NOM_DU_CAMP_DU_SOLVEUR[cherche.gagnant]} doit gagner`;
    ajouterUneLigne(`Cherché : ${texteDeLaPosition(cherche.etat)}, ${quoi}.`);
    if (cherche.etat.vainqueur) return ajouterUneLigne('La partie est déjà finie sur cette position.');
    const toursMax = entier(elements.toursMax, TOURS_MAX_DU_SOLVEUR);
    const limiteS = entier(elements.minutes, minutesConseilleesDuSolveur(toursMax)) * SECONDES_PAR_MINUTE_DU_SOLVEUR;
    solveur?.arreter();
    const celuiCi = creerSolveur({ limiteDepart: limiteS, limiteParCoup: limiteS });
    solveur = celuiCi;
    const arrete = () => solveur !== celuiCi;
    enCours = true;
    afficherChoix();
    const debut = performance.now();
    const fini = () => finir(`Fini en ${Math.round((performance.now() - debut) / MILLISECONDES_PAR_SECONDE_DU_SOLVEUR)} s.`);
    const rappelsDeLaRecherche = {
      dire: (texte) => !arrete() && dire(texte),
      ajouterUneLigne: (texte) => !arrete() && ajouterUneLigne(texte),
      montrerLeTableau: (laRecherche) => {
        if (arrete()) return;
        recherche = laRecherche;
        afficherTableau();
      },
      arrete,
    };
    if (cherche.perd) {
      const lesPertes = await rechercherLesCoupsQuiPerdent(cherche, { toursMax }, celuiCi, rappelsDeLaRecherche);
      if (arrete()) return;
      for (const ligne of lignesDuBilanDesPertes(lesPertes)) ajouterUneLigne(ligne);
      return fini();
    }
    const resultat = await rechercherAvecLeSolveur(cherche, { toursMax, toutes: elements.toutes.checked }, celuiCi, rappelsDeLaRecherche);
    if (arrete()) return;
    const { victoire } = resultat;
    if (victoire.tours === null) {
      const pourquoi = {
        invalide: `Pas de gain forcé pour ${NOM_DU_CAMP_DU_SOLVEUR[cherche.gagnant]} en ${toursMax} tours ou moins : le tableau ne se remplit que sur un gain forcé.`,
        indetermine: `Pas jugé à temps à ${victoire.essayes} tours (limite ${limiteS / SECONDES_PAR_MINUTE_DU_SOLVEUR} min par recherche) : rien n'est prouvé.`,
      }[victoire.verdict] ?? 'Le solveur n’a pas pu juger cette position.';
      ajouterUneLigne(pourquoi);
    } else bilan();
    fini();
  }

  function finir(texte) {
    enCours = false;
    dire(texte);
    afficherChoix();
  }

  elements.chercher.addEventListener('click', () => chercher());
  elements.arreter.addEventListener('click', () => {
    solveur?.arreter();
    solveur = null;
    finir('Arrêté.');
  });

  // La boite My deja remplie, dans le sens de la position cherchee : c'est elle qui inverse les camps a
  // l'enregistrement si Blanc commence (moteur/positions-my.js, entreePuzzleMy). Le nombre de solutions seulement si
  // toutes ont ete jugees (sinon « xtr4y », sans nombre, comme KAAWA) ; les debuts de solution : la sequence de chaque
  // solution, au format de KAAWA.
  elements.creerPzl.addEventListener('click', () => {
    const { tours, campGagnant, toutes, toutesJugees, lignes } = recherche;
    const solutions = lignes.filter(({ verdict }) => verdict === 'valide');
    const decalageDuGagnant = campGagnant === 'noir' ? 0 : 1;
    rappels.creerPuzzleMy({
      titre: 'Nouveau puzzle (My), trouvé par le solveur',
      nomSaisi: '',
      createur: '',
      position: ecrirePosition(cherche.etat),
      premierJoueur: cherche.etat.joueurAuTrait,
      gagnant: cherche.gagnant,
      typeDePuzzle: 'PZL',
      niveau: niveauDuPuzzle(tours),
      toursMaximum: String(tours),
      solutionsAuPremierCoup: toutes && toutesJugees ? String(solutions.length) : '',
      debutsDeSolution: fusionnerBranchesSolution('', solutions.map(({ coup, coups }) => brancheCompacte(coups ?? [coup], decalageDuGagnant))),
    });
  });

  function montrer(ouvert) {
    elements.panneau.hidden = !ouvert;
    elements.bouton.classList.toggle('bouton-actif', ouvert);
    if (ouvert) actualiser();
  }
  elements.bouton.addEventListener('click', () => montrer(elements.panneau.hidden));
  elements.fermer.addEventListener('click', () => montrer(false));

  // La position du plateau a change : le haut du panneau la reprend (le camp au trait doit gagner, au depart) ; les
  // resultats de la derniere recherche restent.
  function actualiser() {
    if (elements.panneau.hidden) return;
    const actuel = rappels.etatActuel();
    if (!etat || ecrirePosition(actuel) !== ecrirePosition(etat) || actuel.joueurAuTrait !== etat.joueurAuTrait) {
      etat = actuel;
      gagnant = etat.joueurAuTrait;
    }
    afficherChoix();
  }

  return { actualiser };
}
