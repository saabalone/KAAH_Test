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
// Pas d'import ni d'export (voir moteur/plateau.js).

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
  if (enregistrement.installing || enregistrement.waiting) return 'installation en cours, gardez internet quelques secondes.';
  const cachePret = await window.caches.has(`kaah-${NOM_VERSION_KAAH_TEST}`);
  if (navigator.serviceWorker.controller && cachePret) return 'prêt ✓ (KAAH marche sans internet sur cet appareil).';
  return 'installé, actif à la prochaine ouverture de KAAH.';
}

// `elements` : { bouton, dialogue, version, horsLigne, fermer } — `fermer` est une
// LISTE de boutons (en haut et en bas de la boite).
function demarrerAide(elements) {
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
          elements.version.textContent = `Version : ${versionAffichee} (cache installé : ${nomCache} — fermez KAAH, rouvrez-le avec internet)`;
        }
      })
      .catch(() => {});
  }

  elements.bouton.addEventListener('click', () => {
    afficherVersion();
    afficherHorsLigne();
    elements.dialogue.showModal();
  });
  for (const bouton of elements.fermer) bouton.addEventListener('click', () => elements.dialogue.close());
}
