// L'aide (phase 26 puis 27) : une boite avec des rubriques repliables, ecrite
// en dur dans index.html — ce qui sert a jouer et tester KAAH, complete
// phase apres phase (KAA_aide.txt de KAAWA, adapte, pas retraduit mot pour
// mot : KAAH n'a ni menus, ni fichiers, ni plugins). Le bloc-notes NP
// (phase 27) est un fichier a part, interface/notes-perso.js.
//
// Ce fichier n'a qu'un travail : afficher, dans la boite, la VERSION de KAAH
// que fait tourner cet appareil (« KAAH_Test_ph21_v1 »), pour que chaque rapport de test dise
// laquelle. Elle vient de version.js, donc elle s'affiche aussi quand KAAH est ouvert par
// double-clic. Si l'appareil a un cache installe d'une AUTRE version (service worker pas
// encore mis a jour), on le dit : la page affichee et le cache ne sont alors pas les memes.
//
// Second travail (saab, Opera : "rien n'indique que c'est installe") : dire, sous
// la version, si KAAH marche SANS internet sur cet appareil — ou pourquoi pas.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : aererLeTexte, colorerLesCouleurs
// (interface/aide-texte.js) viennent d'un fichier charge avant celui-ci.

// Le refus du navigateur a l'enregistrement du service worker (index.html), s'il
// y en a eu un : sa raison, affichee telle quelle.
let refusHorsLigne = null;

function retenirRefusHorsLigne(erreur) {
  refusHorsLigne = String(erreur?.message ?? erreur);
}

// Une phrase sur le mode hors ligne de CET appareil. `hors ligne` n'existe que
// par le service worker (service-worker.js) et son cache a la version affichee.
async function etatHorsLigne() {
  if (location.protocol === 'file:') return 'ouvert depuis un fichier, rien à installer (normal).';
  if (!('serviceWorker' in navigator)) return 'impossible dans ce navigateur. Utilisez Chrome.';
  const enregistrement = await navigator.serviceWorker.getRegistration();
  if (!enregistrement) {
    return refusHorsLigne
      ? `refusé par ce navigateur (${refusHorsLigne}). Utilisez Chrome.`
      : 'pas encore installé : rouvrez KAAH avec internet.';
  }
  if (enregistrement.installing) return 'installation en cours, gardez internet quelques secondes.';
  if (enregistrement.waiting) return 'prêt ✓ — une nouvelle version attend votre accord (proposée au lancement).';
  // Le cache de la version affichee, ou celui qui la sert encore pendant qu'une
  // nouvelle version attend d'etre chargee (interface/mise-a-jour.js).
  const cachePret = (await window.caches.keys()).some((nom) => nom.startsWith('kaah-'));
  if (navigator.serviceWorker.controller && cachePret) return 'prêt ✓ (KAAH marche sans internet sur cet appareil).';
  return 'installé, actif à la prochaine ouverture de KAAH.';
}

// L'Aide s'ouvre au lancement de KAAH (saab, 2026-10-01), jamais quand KAAH
// se recharge lui-meme (nouvelle partie, mode simple...) : index.html le
// signale juste avant (signalerRechargementVolontaire).
const CLE_RECHARGEMENT_VOLONTAIRE = 'kaah-rechargement-volontaire';

function signalerRechargementVolontaire() {
  try {
    window.sessionStorage.setItem(CLE_RECHARGEMENT_VOLONTAIRE, 'oui');
  } catch {
    // Tant pis : l'Aide s'ouvrira aussi apres ce rechargement.
  }
}

function lancementParLUtilisateur() {
  try {
    const volontaire = window.sessionStorage.getItem(CLE_RECHARGEMENT_VOLONTAIRE) === 'oui';
    window.sessionStorage.removeItem(CLE_RECHARGEMENT_VOLONTAIRE);
    return !volontaire;
  } catch {
    return true;
  }
}

// Les chapitres numerotes (« 1. Jouer un coup »), et chacun, a l'ouverture,
// remonte en haut de la boite en laissant voir quelques lignes au-dessus de
// lui (saab, 2026-10-01 : le dernier s'ouvrait hors de vue, tout en bas).
const LIGNES_AU_DESSUS_DU_CHAPITRE = 2;

function preparerChapitres(corps) {
  const chapitres = [...corps.querySelectorAll(':scope > details')];
  chapitres.forEach((chapitre, rang) => {
    const titre = chapitre.querySelector('summary');
    titre.prepend(`${rang + 1}. `);
    chapitre.addEventListener('toggle', () => {
      // Ouvert par la recherche (interface/aide-recherche.js) : c'est elle qui
      // amene l'endroit trouve sous les yeux.
      if (!chapitre.open || chapitre.dataset.ouvertParRecherche) return;
      const ligne = parseFloat(getComputedStyle(corps).lineHeight) || titre.getBoundingClientRect().height;
      const ecart = titre.getBoundingClientRect().top - corps.getBoundingClientRect().top - LIGNES_AU_DESSUS_DU_CHAPITRE * ligne;
      // Les derniers chapitres n'ont pas assez de texte sous eux pour remonter :
      // un vide en bas le leur donne.
      corps.style.paddingBottom = '';
      const reste = corps.scrollHeight - corps.clientHeight - corps.scrollTop;
      if (ecart > reste) corps.style.paddingBottom = `${ecart - reste}px`;
      corps.scrollTo({ top: corps.scrollTop + ecart, behavior: 'smooth' });
    });
  });
}

// L'en-tete qui se replie (saab, 2026-10-10 : « au 1er clic ça se replie sur version,
// comme ça ça ne prendra pas de place pour lire les rubriques » ; 2026-10-11 : « il faut
// replier pour voir Hors ligne aussi, comme ça on sait si ça fonctionne ») : a chaque
// ouverture, toutes ses lignes (la version, le hors-ligne, ordinateur ou telephone, les
// modes) ; le premier clic dans la boite, ou qu'il soit, n'en laisse que les
// `lignesGardees` (la version et le hors-ligne) — les toucher ensuite montre les autres
// ou les replie. Renvoie deplier(), a appeler a chaque ouverture.
function preparerLEnteteQuiSeReplie(dialogue, lignesGardees) {
  const entete = lignesGardees[0].parentElement;
  let premierClic = true;
  dialogue.addEventListener(
    'click',
    (evenement) => {
      if (premierClic) entete.classList.add('aide-entete-repliee');
      else if (lignesGardees.includes(evenement.target)) entete.classList.toggle('aide-entete-repliee');
      premierClic = false;
    },
    // Avant le chapitre touche : il se place d'apres la hauteur de l'en-tete deja replie.
    true
  );
  return function deplier() {
    premierClic = true;
    entete.classList.remove('aide-entete-repliee');
  };
}

// `elements` : { bouton, dialogue, version, horsLigne, fermer, corps } —
// `fermer` est une LISTE de boutons (en haut et en bas de la boite).
function demarrerAide(elements) {
  aererLeTexte(elements.corps);
  colorerLesCouleurs(elements.corps);
  preparerChapitres(elements.corps);
  const deplierLEntete = preparerLEnteteQuiSeReplie(elements.dialogue, [elements.version, elements.horsLigne]);
  function afficherHorsLigne() {
    elements.horsLigne.textContent = 'Hors ligne : vérification...';
    etatHorsLigne()
      .then((phrase) => (elements.horsLigne.textContent = `Hors ligne : ${phrase}`))
      .catch(() => (elements.horsLigne.textContent = 'Hors ligne : état inconnu.'));
  }

  function afficherVersion() {
    elements.version.textContent = 'Version : recherche...';
    const versionAffichee = NOM_VERSION_KAAH_TEST;
    elements.version.textContent = `Version : ${versionAffichee}`;
    const chercher = 'caches' in window ? window.caches.keys() : Promise.resolve([]);
    chercher
      .then((noms) => {
        const nomCache = noms.find((n) => n.startsWith('kaah-'));
        if (nomCache && nomCache !== `kaah-${NOM_VERSION_KAAH_TEST}`) {
          elements.version.textContent = `Version : ${versionAffichee} (autre version en cache : ${nomCache.replace('kaah-', '')})`;
        }
      })
      .catch(() => {});
  }

  function ouvrir() {
    afficherVersion();
    afficherHorsLigne();
    if (!elements.dialogue.open) {
      deplierLEntete();
      elements.dialogue.showModal();
    }
  }

  elements.bouton.addEventListener('click', ouvrir);
  for (const bouton of elements.fermer) bouton.addEventListener('click', () => elements.dialogue.close());
  // Par-dessus les boites du demarrage (reprise de partie...), une fois la
  // page prete.
  if (lancementParLUtilisateur()) setTimeout(ouvrir, 0);
}
