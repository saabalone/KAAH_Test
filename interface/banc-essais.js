// La boite du BANC D'ESSAIS (saab, 2026-10-08 : « une petite appli, en une
// option pour ordi, qui permet de programmer ce qu'on veut, comme tu fais, sans
// faire de code ») : les choix (interface/banc-essais-choix.js) lances sur
// plusieurs coeurs a la fois (un KAI++ par coeur, interface/kai-plus.js) ; le
// tableau se remplit au fil des parties (interface/banc-essais-page.js) et
// s'exporte en page. Ordinateur seulement (styles.css, banc-ordinateur). La
// regle des parties : moteur/banc-essais.js. L'etape 2 (saab, 2026-10-08) : les
// PUZZLES, et la RECOLTE de puzzles dans les parties (moteur/banc-puzzles.js,
// interface/banc-essais-puzzles.js), exportee ou ajoutee a My.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : partiesDuBanc,
// resumeDuBanc (moteur/banc-essais.js), creerKaiPlus (interface/kai-plus.js),
// creerChoixDuBanc (interface/banc-essais-choix.js), jouerUnePartieDuBanc
// (interface/banc-essais-partie.js), creerSuiviDuBanc (interface/banc-essais-
// suivi.js), contenuDuBanc, pageDuBanc (interface/banc-essais-page.js),
// telechargerTexte (interface/fichiers.js), formaterDateKAAWA (interface/
// sauvegarde.js), ecrirePosition (moteur/notation.js), resumeDesPuzzles,
// entreeDuPuzzleRecolte (moteur/banc-puzzles.js), jouerUnPuzzleDuBanc,
// recolterLaPartie, verifierParLeSolveur (interface/banc-essais-puzzles.js),
// creerSolveur (interface/solveur.js), contenuDesPuzzles
// (interface/banc-essais-page-puzzles.js), fichierPositionsMy
// (moteur/positions-my.js), importerEntreesMy (interface/positions-my.js)
// viennent de fichiers charges avant celui-ci.

const DUREE_BOUTON_ALLUME_BANC_MS = 1000;
const CREATEUR_DES_RECOLTES = "KAI++ (banc d'essais)";

// `elements` : les champs de la boite (index.html, #dialogue-banc-essais) ;
// `obtenirBase()` : le livre d'ouvertures charge (la base de coups).
function demarrerBancEssais(elements, obtenirBase) {
  const choix = creerChoixDuBanc(elements);
  let enCours = null; // { arret, pause, reprendre, machines }
  let dernier = null; // le tableau du dernier banc (html), pour l'exporter
  let recolte = { entrees: [], date: '', ajoutee: false }; // les puzzles recoltes

  function afficher(html, fait, total, unite) {
    dernier = html;
    elements.progres.textContent = `${fait} / ${total} ${unite}${enCours?.arret ? ' (arrêté)' : enCours?.pause ? ' (en pause)' : fait === total ? ' — fini' : ''}`;
    // Un tableau de resultats, reconstruit a chaque partie (jamais le plateau).
    elements.resultats.innerHTML = html;
    elements.dialogue.classList.toggle('banc-a-recolte', recolte.entrees.length > 0);
    elements.ajouterRecolte.disabled = recolte.ajoutee;
  }

  // Les couleurs des boutons (saab, 2026-10-08) : Lancer en vert quand il attend
  // qu'on le touche ; en orange ce qui est actif (la serie qui tourne, la pause,
  // l'arret demande, l'export juste touche).
  function boutonsPendant(lance) {
    elements.lancer.classList.toggle('bouton-attend', !lance);
    elements.lancer.classList.toggle('bouton-actif', lance);
    elements.pause.disabled = !lance;
    elements.pause.textContent = 'Pause';
    elements.pause.classList.remove('bouton-actif');
    elements.arreter.disabled = !lance;
    elements.arreter.classList.remove('bouton-actif');
    elements.exporter.disabled = dernier === null;
    elements.cacherResultats.disabled = dernier === null;
  }

  // Cacher les resultats (saab, 2026-10-08 : « si on veut faire une nouvelle
  // recherche, la fenetre du haut est trop petite ») : les choix reprennent toute
  // la hauteur ; le tableau reste (Exporter) et revient au prochain Lancer.
  function cacherLesResultats(cacher) {
    elements.dialogue.classList.toggle('banc-resultats-caches', cacher);
    elements.cacherResultats.textContent = cacher ? 'Montrer les résultats' : 'Cacher les résultats';
  }

  // Une serie de parties (et sa recolte de puzzles, si demandee).
  function serieDeParties(essais, reference, parametres) {
    const taches = partiesDuBanc(essais.length, parametres);
    const parties = [];
    const { active, toursMini } = parametres.recolte;
    recolte = { entrees: [], date: formaterDateKAAWA(new Date()), ajoutee: false };
    const jouer = async (tache, kai, suivi) => {
      const partie = await jouerUnePartieDuBanc(tache, reference, essais[tache.essai], parametres, kai, obtenirBase(), enCours, suivi);
      if (!partie) return;
      const trouve = active ? await recolterLaPartie(partie, reference, kai, toursMini, suivi) : null;
      // Arretee pendant la recolte : sa reponse n'est pas sure. Une position deja recoltee : une fois.
      if (trouve && !enCours.arret && !recolte.entrees.some((deja) => deja.position === ecrirePosition(trouve.etat))) {
        const entree = entreeDuPuzzleRecolte({ etat: trouve.etat, gagnant: partie.fin, tours: trouve.tours, numero: partie.numero, date: recolte.date, createur: CREATEUR_DES_RECOLTES });
        recolte.entrees.push({ entree, position: ecrirePosition(trouve.etat), numero: partie.numero, tours: trouve.tours });
      }
      delete partie.etats; // les positions ne servaient qu'a la recolte
      parties.push(partie);
    };
    const rendu = () => contenuDuBanc({ reference, essais, parties, resume: resumeDuBanc(parties, essais.length), parametres, recoltes: active ? recolte.entrees : null });
    const libelle = (tache) => `Partie ${tache.numero}/${taches.length} — ${tache.essai + 1}. ${essais[tache.essai].nom} en ${tache.referenceNoir ? 'Blanc' : 'Noir'}, ouverture ${tache.ouverture}`;
    return { taches, jouer, rendu, fait: () => parties.length, unite: 'parties', libelle };
  }

  // Une serie de puzzles : chaque essai attaque chaque puzzle, la reference defend.
  function serieDePuzzles(essais, reference, parametres) {
    const puzzles = choix.puzzles();
    if (puzzles.length === 0) {
      window.alert('Aucun puzzle entre ces tours : changez les tours mini et maxi, ou cochez KAAWA ou My.');
      return null;
    }
    const taches = essais.flatMap((_, essai) => puzzles.map((puzzle) => ({ essai, puzzle })));
    const resultats = [];
    // UN solveur pour tout le banc (il reserve 128 Mo) : les verifications passent une par une.
    const solveur = parametres.solveur ? creerSolveur() : null;
    const jouer = async (tache, kai, suivi) => {
      const resultat = await jouerUnPuzzleDuBanc(tache, essais[tache.essai], reference, kai, enCours, suivi, parametres.defenseComplete);
      if (!resultat) return;
      if (solveur && resultat.resolu) {
        suivi({ etape: 'vérification par le solveur…' });
        resultat.verdict = await verifierParLeSolveur(solveur, resultat);
        resultat.resolu = resultat.verdict === 'valide'; // ne compte que « Bravo »
      }
      resultats.push(resultat);
    };
    const rendu = () => contenuDesPuzzles({ reference, essais, resultats, resume: resumeDesPuzzles(resultats, essais.length), parametres: { ...parametres, nombreDePuzzles: puzzles.length } });
    const libelle = (tache, numero) => `Puzzle ${numero}/${taches.length} — ${tache.essai + 1}. ${essais[tache.essai].nom} : ${tache.puzzle.nom}`;
    return { taches, jouer, rendu, fait: () => resultats.length, unite: 'puzzles', libelle };
  }

  async function lancer() {
    if (enCours) return; // deja lancee : le bouton orange le dit
    const essais = choix.essais();
    if (essais.length === 0) return window.alert('Cochez au moins un profil à essayer.');
    const parametres = choix.parametres();
    const reference = choix.reference();
    const serie = parametres.mode === 'puzzles' ? serieDePuzzles(essais, reference, parametres) : serieDeParties(essais, reference, parametres);
    if (!serie) return;
    const { taches, jouer, rendu, fait, unite, libelle } = serie;
    const nombre = Math.max(1, Number(elements.paralleles.value) || 1);
    enCours = { arret: false, pause: false, reprendre: null, machines: Array.from({ length: nombre }, () => creerKaiPlus()) };
    boutonsPendant(true);
    cacherLesResultats(false);
    afficher(rendu(), 0, taches.length, unite);
    const suivi = creerSuiviDuBanc(elements.enCours, () => enCours?.pause);
    let prochaine = 0;
    const machine = async (kai, rang) => {
      while (prochaine < taches.length && !enCours.arret) {
        const tache = taches[prochaine++];
        suivi.commencer(rang, libelle(tache, prochaine));
        await jouer(tache, kai, suivi.suivi(rang));
        suivi.finir(rang);
        afficher(rendu(), fait(), taches.length, unite);
      }
    };
    await Promise.all(enCours.machines.map(machine));
    suivi.arreter();
    for (const kai of enCours.machines) kai.interrompre();
    afficher(rendu(), fait(), taches.length, unite);
    enCours = null;
    boutonsPendant(false);
  }

  elements.cacherResultats.addEventListener('click', () => cacherLesResultats(!elements.dialogue.classList.contains('banc-resultats-caches')));
  elements.lancer.addEventListener('click', lancer);
  elements.pause.addEventListener('click', () => {
    if (!enCours) return;
    enCours.pause = !enCours.pause;
    elements.pause.textContent = enCours.pause ? 'Reprendre' : 'Pause';
    elements.pause.classList.toggle('bouton-actif', enCours.pause);
    if (!enCours.pause) enCours.reprendre?.();
  });
  elements.arreter.addEventListener('click', () => {
    if (!enCours) return;
    enCours.arret = true;
    elements.arreter.classList.add('bouton-actif');
    enCours.reprendre?.();
    for (const kai of enCours.machines) kai.interrompre();
  });
  elements.exporter.addEventListener('click', () => {
    if (!dernier) return;
    elements.exporter.classList.add('bouton-actif');
    // Apres l'affichage de l'orange : la page se fabrique d'un bloc et figerait l'ecran avant.
    requestAnimationFrame(() =>
      setTimeout(() => {
        telechargerTexte(pageDuBanc(dernier, `Banc d'essais du ${new Date().toLocaleString('fr-FR')}`), `banc_essais_${formaterDateKAAWA(new Date())}.html`, 'text/html');
        setTimeout(() => elements.exporter.classList.remove('bouton-actif'), DUREE_BOUTON_ALLUME_BANC_MS);
      })
    );
  });
  // La recolte : au format de KAAWA (Puzzles > Importer la reprend), ou ajoutee a My.
  elements.exporterRecolte.addEventListener('click', () => {
    telechargerTexte(fichierPositionsMy(recolte.entrees.map(({ entree }) => entree)), `KAA_PZL_banc_${recolte.date}.json`, 'application/json');
  });
  elements.ajouterRecolte.addEventListener('click', () => {
    const renommees = importerEntreesMy('puzzles', recolte.entrees.map(({ entree }) => entree));
    if (renommees === null) return window.alert("Le navigateur a refusé d'enregistrer les puzzles (stockage plein ?).");
    recolte.ajoutee = true;
    elements.ajouterRecolte.disabled = true;
    const renommes = renommees.length ? ` (${renommees.length} renommés : nom déjà pris)` : '';
    window.alert(`${recolte.entrees.length} puzzles ajoutés à My${renommes}.`);
  });
  const ouvrir = () => {
    choix.remplir();
    // Par-dessus tout, comme les autres boites (show() la laissait sous le panneau de droite).
    // Fermee, elle laisse les parties continuer : on la rouvre pour voir ou elles en sont.
    if (!elements.dialogue.open) elements.dialogue.showModal();
  };
  for (const bouton of elements.boutons) bouton.addEventListener('click', ouvrir);
  boutonsPendant(false);
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
}
