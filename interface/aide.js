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
// Pas d'import ni d'export (voir moteur/plateau.js).

// `elements` : { bouton, dialogue, version, fermer } — `fermer` est une LISTE de
// boutons (en haut et en bas de la boite).
function demarrerAide(elements) {
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
    elements.dialogue.showModal();
  });
  for (const bouton of elements.fermer) bouton.addEventListener('click', () => elements.dialogue.close());
}
