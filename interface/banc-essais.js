// La boite du BANC D'ESSAIS, « LabAlone » (le nom trouve par saab, 2026-10-08) (saab, 2026-10-08 : « une petite appli, en une
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
// resumeDuBanc (moteur/banc-essais.js), nomDuFichierDuBanc (moteur/banc-noms.js),
// creerKaiPlus (interface/kai-plus.js),
// creerChoixDuBanc, nomDeMachineDuBanc (interface/banc-essais-choix.js), jouerUnePartieDuBanc
// (interface/banc-essais-partie.js), creerSuiviDuBanc (interface/banc-essais-
// suivi.js), contenuDuBanc, pageDuBanc (interface/banc-essais-page.js),
// telechargerTexte (interface/fichiers.js), brancherLaRecolteDuBanc (interface/
// banc-essais-puzzles.js), formaterDateKAAWA (interface/
// sauvegarde.js), resumeDesPuzzles,
// entreeDuPuzzleRecolte (moteur/banc-puzzles.js), jouerUnPuzzleDuBanc,
// puzzleDeLaPartie, verifierParLeSolveur (interface/banc-essais-puzzles.js),
// creerSolveur (interface/solveur.js), contenuDesPuzzles
// (interface/banc-essais-page-puzzles.js),
// brancherOutilsDuBanc (interface/banc-essais-outils.js), brancherRevueDesFichiers
// (interface/banc-essais-revoir.js), donneesDuBancEnHtml (moteur/banc-fichiers.js),
// brancherValidationDuProfil (interface/banc-essais-reglage.js), brancherLeRegardDesParties
// (interface/banc-essais-regarder.js) viennent de fichiers charges avant celui-ci.


// `elements` : les champs de la boite (index.html, #dialogue-banc-essais) ;
// `obtenirBase()` : le livre d'ouvertures charge (la base de coups) ; `obtenirJeux()` :
// { variantes, puzzles } (les ceintures des IA) ; `ouvrirUnePartie(partie)` : revoir une
// partie d'un fichier exporte (interface/banc-essais-revoir.js) ; `montrerUnePartie(position,
// coups, titre)` : une partie de la serie sur le petit plateau et dans le Graphique.
function demarrerBancEssais(elements, obtenirBase, obtenirJeux, ouvrirUnePartie, montrerUnePartie) {
  const choix = creerChoixDuBanc(elements, obtenirJeux);
  // La retouche de l essai validee toute seule en fin de serie (interface/banc-essais-reglage.js).
  const validerLaRetouche = brancherValidationDuProfil(elements.validationAuto, choix.reglage);
  let enCours = null; // { arret, pause, reprendre, machines }
  let dernier = null; // le tableau du dernier banc (html), pour l'exporter
  let nomDuDernier = null; // nomDuDernier(date) : le nom de son fichier (sans « .html »)
  let donneesDuDernier = null; // donneesDuDernier() : ses parties, pour les revoir
  let exporte = false; // le dernier banc a ete exporte
  let recolte = { entrees: [], date: '', ajoutee: false }; // les puzzles recoltes
  let serieAffichee = null; // la serie du tableau, pour en regarder une partie
  let suiviActif = null; // les parties en cours (interface/banc-essais-suivi.js)
  const regard = brancherLeRegardDesParties(elements, {
    finie: (numero) => serieAffichee?.partieARegarder?.(numero),
    enCours: (machine) => suiviActif?.enCours(machine),
  }, montrerUnePartie);

  const viderLaRecolte = () => (recolte = { entrees: [], date: formaterDateKAAWA(new Date()), ajoutee: false });

  function afficher(html, fait, total, unite) {
    dernier = html;
    elements.progres.textContent = `${fait} / ${total} ${unite}${enCours?.arret ? ' (arrêté)' : enCours?.pause ? ' (en pause)' : fait === total ? ' — fini' : ''}`;
    // Un tableau de resultats, reconstruit a chaque partie (jamais le plateau).
    elements.resultats.innerHTML = html;
    regard.marquer();
    rendreCachable();
    elements.dialogue.classList.toggle('banc-a-recolte', recolte.entrees.length > 0);
    elements.ajouterRecolte.disabled = recolte.ajoutee;
  }

  // Les couleurs des boutons (saab, 2026-10-08) : Lancer en vert quand il attend
  // qu'on le touche ; en orange ce qui est actif (la serie qui tourne, la pause,
  // l'arret demande). Une serie finie (2026-10-14 : « quand le test est fini passer
  // Exporter en vert et griser Lancer ; garder Exporter en orange quand il a été
  // exporté, sinon on ne sait pas si on l'a fait ») : Exporter vert et Lancer gris
  // tant qu'elle n'est pas exportee, puis Exporter orange et Lancer de nouveau vert.
  function boutonsPendant(lance) {
    const resteAExporter = !lance && dernier !== null && !exporte;
    elements.lancer.classList.toggle('bouton-attend', !lance && !resteAExporter);
    elements.lancer.classList.toggle('bouton-grise', resteAExporter);
    elements.lancer.classList.toggle('bouton-actif', lance);
    elements.exporter.classList.toggle('bouton-a-faire', resteAExporter);
    elements.exporter.classList.toggle('deja-exporte', dernier !== null && exporte);
    elements.pause.disabled = !lance;
    elements.pause.textContent = 'Pause';
    elements.pause.classList.remove('bouton-actif');
    elements.arreter.disabled = !lance;
    elements.arreter.classList.remove('bouton-actif');
    elements.exporter.disabled = dernier === null;
    rendreCachable();
  }

  // Cacher les resultats se peut des qu'il y a quelque chose a cacher : le tableau d'une
  // serie (meme en cours : saab, 2026-10-15, il cachait Regler l'essai) ou un fichier revu.
  const rendreCachable = () => (elements.cacherResultats.disabled = elements.resultats.innerHTML === '');

  // Cacher les resultats (saab, 2026-10-08 : « si on veut faire une nouvelle
  // recherche, la fenetre du haut est trop petite ») : les choix reprennent toute
  // la hauteur ; le tableau reste (Exporter) et revient au prochain Lancer.
  function cacherLesResultats(cacher) {
    elements.dialogue.classList.toggle('banc-resultats-caches', cacher);
    elements.cacherResultats.textContent = cacher ? 'Montrer les résultats' : 'Cacher les résultats';
  }

  // La serie choisie dans la boite (des profils contre la reference), ou null.
  function serieDesChoix() {
    const essais = choix.essais();
    if (essais.length === 0) return window.alert('Cochez au moins un profil à essayer.') ?? null;
    const parametres = choix.parametres();
    if (parametres.mode === 'parties' && parametres.variantes.length === 0) return window.alert('Cochez au moins une variante (Les parties).') ?? null;
    const banc = { base: obtenirBase, controle: () => enCours, viderLaRecolte };
    return parametres.mode === 'puzzles' ? serieDePuzzlesDuBanc(essais, choix.reference(), parametres, banc, choix.puzzles()) : serieDePartiesDuBanc(essais, choix.reference(), parametres, banc);
  }

  // `serieDonnee`, `machines` : une serie deja prete et son nombre de machines (Mes parties).
  async function lancer(serieDonnee = null, machines = null) {
    if (enCours) return; // deja lancee : le bouton orange le dit
    // Lancer est gris : les resultats affiches ne sont pas exportes, une serie les remplace.
    if (dernier !== null && !exporte && !window.confirm('Les résultats affichés ne sont pas exportés : une nouvelle série les remplacera.\n\nOK : lancer quand même.\nAnnuler : revenir (Exporter est en vert).')) return;
    const serie = serieDonnee ?? serieDesChoix();
    if (!serie) return;
    const { taches, jouer, rendu, fait, unite, libelle } = serie;
    [nomDuDernier, donneesDuDernier, exporte] = [serie.nomDuFichier ?? null, serie.donnees ?? null, false];
    serieAffichee = serie;
    regard.oublierTout();
    // Une serie longue (les ceintures des IA) redessine son tableau apres chaque jeu.
    serie.surProgres = () => afficher(rendu(), fait(), taches.length, unite);
    const nombre = machines ?? Math.max(1, Number(elements.paralleles.value) || 1);
    enCours = { arret: false, pause: false, reprendre: null, machines: Array.from({ length: nombre }, () => creerKaiPlus()) };
    boutonsPendant(true);
    cacherLesResultats(false);
    afficher(rendu(), 0, taches.length, unite);
    const suivi = creerSuiviDuBanc(elements.enCours, () => enCours?.pause, () => regard.marquer());
    suiviActif = suivi;
    let prochaine = 0;
    const machine = async (kai, rang) => {
      while (prochaine < taches.length && !enCours.arret) {
        const tache = taches[prochaine++];
        suivi.commencer(rang, libelle(tache, prochaine), serie.partieARegarder && tache.numero !== undefined ? { numero: tache.numero, position: tache.position ?? POSITION_DEPART_BANC, essaiNoir: !tache.referenceNoir, nomDuProfil: serie.nomDeLEssai?.(tache) } : {});
        await jouer(tache, kai, suivi.suivi(rang));
        suivi.finir(rang);
        afficher(rendu(), fait(), taches.length, unite);
      }
    };
    await Promise.all(enCours.machines.map(machine));
    const arretee = enCours.arret;
    suivi.arreter();
    suiviActif = null;
    for (const kai of enCours.machines) kai.interrompre();
    afficher(rendu(), fait(), taches.length, unite);
    enCours = null;
    boutonsPendant(false);
    validerLaRetouche(serie, arretee);
  }

  elements.cacherResultats.addEventListener('click', () => cacherLesResultats(!elements.dialogue.classList.contains('banc-resultats-caches')));
  elements.lancer.addEventListener('click', () => lancer());
  // Revoir les parties d'un fichier exporte (interface/banc-essais-revoir.js).
  const montrerLeFichierRevu = brancherRevueDesFichiers(elements, () => Boolean(enCours), ouvrirUnePartie, () => {
    cacherLesResultats(false);
    rendreCachable();
  });
  // Les outils de la version de travail (interface/banc-essais-outils.js).
  brancherOutilsDuBanc(elements, {
    lancer,
    essais: () => choix.essais(),
    jeux: obtenirJeux,
    controle: () => enCours,
    viderLaRecolte,
  });
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
  // Le fichier porte un nom qui dit l'essai (moteur/banc-noms.js) ; Exporter reste orange.
  elements.exporter.addEventListener('click', () => {
    if (!dernier) return;
    exporte = true;
    boutonsPendant(Boolean(enCours));
    // Apres l'affichage de l'orange : la page se fabrique d'un bloc et figerait l'ecran avant.
    requestAnimationFrame(() =>
      setTimeout(() => {
        const date = formaterDateKAAWA(new Date());
        const nom = nomDuDernier?.(date) ?? `LabAl_${date}`;
        const donnees = donneesDuDernier ? donneesDuBancEnHtml(donneesDuDernier()) : '';
        telechargerTexte(pageDuBanc(dernier, `LabAlone, banc d'essais du ${new Date().toLocaleString('fr-FR')} — ${nom}`, donnees), `${nom}.html`, 'text/html');
      })
    );
  });
  // La recolte : exportee ou ajoutee a My (interface/banc-essais-puzzles.js).
  brancherLaRecolteDuBanc(elements, () => recolte);
  const ouvrir = () => {
    choix.remplir();
    // Par-dessus tout, comme les autres boites (show() la laissait sous le panneau de droite).
    // Fermee, elle laisse les parties continuer : on la rouvre pour voir ou elles en sont.
    if (!elements.dialogue.open) elements.dialogue.showModal();
    // Sans resultats a montrer : le fichier qu'on revoyait (avant de charger une partie).
    if (dernier === null && montrerLeFichierRevu()) rendreCachable();
  };
  for (const bouton of elements.boutons) bouton.addEventListener('click', ouvrir);
  boutonsPendant(false);
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
}
