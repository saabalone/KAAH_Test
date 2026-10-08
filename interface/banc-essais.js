// La boite du BANC D'ESSAIS (saab, 2026-10-08 : « une petite appli, en une
// option pour ordi, qui permet de programmer ce qu'on veut, comme tu fais, sans
// faire de code ») : les choix (interface/banc-essais-choix.js) lances sur
// plusieurs coeurs a la fois (un KAI++ par coeur, interface/kai-plus.js) ; le
// tableau se remplit au fil des parties (interface/banc-essais-page.js) et
// s'exporte en page. Ordinateur seulement (styles.css, banc-ordinateur). La
// regle des parties : moteur/banc-essais.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : partiesDuBanc,
// resumeDuBanc (moteur/banc-essais.js), creerKaiPlus (interface/kai-plus.js),
// creerChoixDuBanc (interface/banc-essais-choix.js), jouerUnePartieDuBanc
// (interface/banc-essais-partie.js), creerSuiviDuBanc (interface/banc-essais-
// suivi.js), contenuDuBanc, pageDuBanc (interface/banc-essais-page.js),
// telechargerTexte (interface/fichiers.js), formaterDateKAAWA (interface/
// sauvegarde.js) viennent de fichiers charges avant celui-ci.

const DUREE_BOUTON_ALLUME_BANC_MS = 1000;

// `elements` : les champs de la boite (index.html, #dialogue-banc-essais) ;
// `obtenirBase()` : le livre d'ouvertures charge (la base de coups).
function demarrerBancEssais(elements, obtenirBase) {
  const choix = creerChoixDuBanc(elements);
  let enCours = null; // { arret, pause, reprendre, machines }
  let dernier = null; // le contenu du dernier banc, pour l'exporter

  function afficher(contenu, fait, total) {
    dernier = contenu;
    elements.progres.textContent = `${fait} / ${total} parties${enCours?.arret ? ' (arrêté)' : enCours?.pause ? ' (en pause)' : fait === total ? ' — fini' : ''}`;
    // Un tableau de resultats, reconstruit a chaque partie (jamais le plateau).
    elements.resultats.innerHTML = contenuDuBanc(contenu);
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

  async function lancer() {
    if (enCours) return; // deja lancee : le bouton orange le dit
    const essais = choix.essais();
    if (essais.length === 0) return window.alert('Cochez au moins un profil à essayer.');
    const parametres = choix.parametres();
    const reference = choix.reference();
    const taches = partiesDuBanc(essais.length, parametres);
    const parties = [];
    const contenu = () => ({ reference, essais, parties, resume: resumeDuBanc(parties, essais.length), parametres });
    const nombre = Math.max(1, Number(elements.paralleles.value) || 1);
    enCours = { arret: false, pause: false, reprendre: null, machines: Array.from({ length: nombre }, () => creerKaiPlus()) };
    boutonsPendant(true);
    cacherLesResultats(false);
    afficher(contenu(), 0, taches.length);
    const suivi = creerSuiviDuBanc(elements.enCours, essais, () => enCours?.pause);
    let prochaine = 0;
    const machine = async (kai, rang) => {
      while (prochaine < taches.length && !enCours.arret) {
        const tache = taches[prochaine++];
        suivi.commencer(rang, tache, prochaine, taches.length);
        const partie = await jouerUnePartieDuBanc(tache, reference, essais[tache.essai], parametres, kai, obtenirBase(), enCours, suivi.suivi(rang));
        suivi.finir(rang);
        if (partie) parties.push(partie);
        afficher(contenu(), parties.length, taches.length);
      }
    };
    await Promise.all(enCours.machines.map(machine));
    suivi.arreter();
    for (const kai of enCours.machines) kai.interrompre();
    afficher(contenu(), parties.length, taches.length);
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
