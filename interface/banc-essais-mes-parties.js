// Le Banc d'essais : CHERCHER DES PZL DANS MES PARTIES (saab, 2026-10-11 : « pour que je
// puisse, comme tu l'as fait, chercher les solutions de PZL sur des parties et choisir
// à combien je remonte depuis le dernier coup » ; « dans les PZL machine, je ne mets que
// des PZL à sol unique sur le 1er coup »). Chaque partie de Mes parties gagnee aux billes
// est remontee depuis sa fin par le solveur de KAAWA (moteur/banc-puzzles.js,
// recolteDeLaPartie), le puzzle trouve recoit son nombre de solutions et son debut de
// solution (interface/banc-essais-puzzles.js, entreeCompletee). Version de travail seulement.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : listerPartiesEnregistrees
// (interface/sauvegarde.js), donneesVersArbre (moteur/sauvegarde.js), partieARecolter,
// entreeDuPuzzleRecolte (moteur/banc-puzzles.js), nomDeFichierKAAWA (moteur/nom-partie.js),
// puzzleDeLaPartie, entreeCompletee (interface/banc-essais-puzzles.js), recolteHtml
// (interface/banc-essais-page-puzzles.js), listerEntreesMy, ecrireEntreesMy
// (interface/positions-my.js), MARQUEUR_SANS_NOMBRE (moteur/banc-puzzles.js), lireNomPuzzle
// (moteur/puzzles.js), lireReponseSolveur (moteur/solveur.js), echapperBanc
// (interface/banc-essais-page.js), SUFFIXE_REVERSIBLE (moteur/banc-puzzles.js) viennent
// de fichiers charges avant celui-ci.

const CREATEUR_DES_PZL_DE_MES_PARTIES = 'KAI++ (Mes parties)';
const SOLUTION_UNIQUE = '1';
// Les choix de depart (ceux d'index.html), quand un champ est vide ou faux.
const CHOIX_DE_MES_PARTIES = { toursMaxi: 5, toursMini: 3, nombre: 20, minutes: 2 };
const SECONDES_PAR_MINUTE_DU_BANC = 60;

// Les parties de Mes parties a remonter : les `nombre` dernieres gagnees aux billes (0 :
// toutes), chacune { etats, fin, titre, date, numero } ; un fichier illisible est saute.
function partiesEnregistreesARecolter(nombre) {
  const gagnees = [];
  for (const { donnees } of listerPartiesEnregistrees()) {
    try {
      const partie = partieARecolter(donneesVersArbre(donnees));
      if (partie) gagnees.push({ ...partie, titre: nomDeFichierKAAWA(donnees), date: donnees.Date });
    } catch {
      // une partie abimee ne doit pas arreter la recherche
    }
  }
  return (nombre > 0 ? gagnees.slice(-nombre) : gagnees).map((partie, rang) => ({ ...partie, numero: rang + 1 }));
}

// La serie du banc (interface/banc-essais.js, lancer) : une tache par partie.
// `choix` : { toursMini, toursMaxi, nombre, limiteS, unique } ; `solveur` : interface/solveur.js ;
// `recolte` : { entrees } ou ranger les puzzles ; `estArretee()`.
function serieDesPartiesEnregistrees(choix, solveur, recolte, estArretee) {
  const taches = partiesEnregistreesARecolter(choix.nombre);
  let faites = 0;
  let ecartes = 0;
  const jouer = async (partie, _kai, suivi) => {
    const fabriquer = (etat, tours) => entreeDuPuzzleRecolte({ etat, gagnant: partie.fin, tours, numero: partie.numero, date: partie.date, createur: CREATEUR_DES_PZL_DE_MES_PARTIES });
    const trouve = await puzzleDeLaPartie(partie, solveur, choix, suivi, fabriquer);
    faites++;
    if (!trouve || estArretee() || recolte.entrees.some((deja) => deja.entree.pos === trouve.entree.pos)) return;
    // Saab : seulement les PZL a solution unique au premier coup (sauf case decochee), et,
    // si on le demande, seulement les reversibles.
    if (choix.unique && trouve.entree['move1 sol '] !== SOLUTION_UNIQUE) ecartes++;
    else if (choix.reversibles && !trouve.entree.PZL_name.endsWith(SUFFIXE_REVERSIBLE)) ecartes++;
    else recolte.entrees.push({ ...trouve, numero: partie.numero });
  };
  const rendu = () => `<p class="note-reglages">${taches.length} parties de Mes parties gagnées aux billes, remontées jusqu'à ${choix.toursMaxi} tours avant la fin.${choix.unique ? ' Seulement les PZL à solution unique au premier coup.' : ''}${choix.reversibles ? ' Seulement les réversibles (rév : un écart du gagnant, et le perdant gagne).' : ''}${choix.unique || choix.reversibles ? ` ${ecartes} écartés.` : ''}</p>${recolteHtml(recolte.entrees, choix)}`;
  return { taches, jouer, rendu, fait: () => faites, unite: 'parties', libelle: (partie) => `Partie ${partie.numero}/${taches.length} — ${partie.titre}` };
}

// `elements` : { toursMax, toursMin, nombre, minutes, unique, chercher, compterMy } ;
// `lancer(choix)` ; `compterMy(limiteS)`.
function brancherRechercheDansMesParties(elements, lancer, compterMy) {
  const entier = (champ, defaut) => (Number.isInteger(Number(champ.value)) && champ.value !== '' ? Math.max(Number(champ.min), Math.min(Number(champ.max), Number(champ.value))) : defaut);
  elements.chercher.addEventListener('click', () => {
    const toursMaxi = entier(elements.toursMax, CHOIX_DE_MES_PARTIES.toursMaxi);
    const choix = {
      toursMaxi,
      toursMini: Math.min(toursMaxi, entier(elements.toursMin, CHOIX_DE_MES_PARTIES.toursMini)),
      nombre: entier(elements.nombre, CHOIX_DE_MES_PARTIES.nombre),
      limiteS: entier(elements.minutes, CHOIX_DE_MES_PARTIES.minutes) * SECONDES_PAR_MINUTE_DU_BANC,
      unique: elements.unique.checked,
      reversibles: elements.reversibles?.checked ?? false,
    };
    if (partiesEnregistreesARecolter(choix.nombre).length === 0) return window.alert('Aucune partie gagnée aux billes dans Mes parties.');
    lancer(choix);
  });
  elements.compterMy.addEventListener('click', () => compterMy(entier(elements.minutes, CHOIX_DE_MES_PARTIES.minutes) * SECONDES_PAR_MINUTE_DU_BANC));
}

// COMPTER LES SOLUTIONS DES PZL MY (saab, 2026-10-11 : « un bouton qui compte les solutions
// de tes PZL My existants ») : chaque puzzle My dont le nom n'a pas son nombre (« xtr6x »)
// est juge par le solveur — la victoire forcee dans ses tours, puis chaque premier coup de
// Noir (interface/banc-essais-puzzles.js, entreeCompletee) — et renomme (xtr6x1, xtr5y1 :
// toujours les solutions de Noir, qui commence), avec « move1 sol » et son debut de solution.
// Un puzzle que le solveur ne juge pas a temps, ou sans victoire forcee, reste comme il est.
function serieDesPuzzlesMyACompter(solveur, estArretee) {
  const taches = listerEntreesMy('puzzles').filter((entree) => MARQUEUR_SANS_NOMBRE.test(entree.PZL_name) && lireNomPuzzle(entree.PZL_name));
  const resultats = [];
  const jouer = async (entree, _kai, suivi) => {
    const { toursMaximum, campGagnant } = lireNomPuzzle(entree.PZL_name);
    suivi({ etape: 'victoire forcée ? (solveur)…' });
    const depart = lireReponseSolveur((await solveur.verifier({ position: entree.pos, noirGagne: campGagnant === 'noir', toursMaximum, coups: [] })).reponse).verdict;
    const complete = depart === 'valide' ? await entreeCompletee(entree, toursMaximum, solveur, suivi) : entree;
    if (estArretee()) return;
    const autres = listerEntreesMy('puzzles');
    const renomme = complete !== entree && !autres.some((autre) => autre.PZL_name === complete.PZL_name);
    if (renomme) ecrireEntreesMy('puzzles', autres.map((autre) => (autre.PZL_name === entree.PZL_name ? complete : autre)));
    const etat = renomme ? 'compté' : depart === 'invalide' ? 'pas de victoire forcée dans ces tours' : depart !== 'valide' || complete === entree ? 'pas jugé à temps' : 'nom déjà pris';
    resultats.push({ avant: entree.PZL_name, apres: renomme ? complete : entree, etat });
  };
  const rendu = () => {
    const lignes = resultats.map(({ avant, apres, etat }) => `<tr><td>${echapperBanc(avant)}</td><td>${echapperBanc(apres.PZL_name)}</td><td>${echapperBanc(apres['move1 sol '] || '?')}</td><td class="banc-coups">${echapperBanc(apres.sol_starts ?? '')}</td><td>${etat}</td></tr>`);
    return `<p class="note-reglages">${taches.length} PZL My sans nombre de solutions. Le nombre est celui des solutions de Noir au premier coup (il commence toujours) : ses coups gagnants s'il gagne (x), ses meilleures défenses si Blanc gagne (y). Début de solution au format de KAAWA : quand Blanc gagne, « 1.réponse de Blanc/coup de Noir ».</p>
<table class="banc-tableau"><tr><th>PZL</th><th>Nouveau nom</th><th>Nb sol.</th><th>Début de solution</th><th></th></tr>${lignes.join('')}</table>`;
  };
  return { taches, jouer, rendu, fait: () => resultats.length, unite: 'PZL', libelle: (entree, numero) => `PZL ${numero}/${taches.length} — ${entree.PZL_name}` };
}
