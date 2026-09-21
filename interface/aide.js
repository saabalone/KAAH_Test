// L'aide simplifiee (phase 26, partielle) : une boite avec des rubriques
// repliables, ecrite en dur dans index.html — juste ce qui sert a tester KAAH
// aujourd'hui (jouer, les boutons, l'installation, les problemes connus, quoi
// envoyer pour signaler un bug). Le bloc-notes NP et l'aide complete de KAAWA
// (KAA_aide.txt) restent a faire, phase 26.
//
// Ce fichier n'a qu'un travail : afficher, dans la boite, la VERSION de KAAH
// que fait tourner cet appareil, pour que chaque rapport de test dise laquelle.
// La version est le nom du cache du service worker (service-worker.js,
// NOM_CACHE, par exemple "kaah-v83"), lu tel quel plutot que recopie ici — une seule
// source (CLAUDE.md). Sans service worker (fichier ouvert par double-clic), il
// n'y en a pas : on le dit.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// `elements` : { bouton, dialogue, version, fermer } — `fermer` est une LISTE de
// boutons (en haut et en bas de la boite).
function demarrerAide(elements) {
  function afficherVersion() {
    elements.version.textContent = 'Version : recherche...';
    const chercher = 'caches' in window ? window.caches.keys() : Promise.resolve([]);
    chercher
      .then((noms) => {
        const nom = noms.find((n) => n.startsWith('kaah-'));
        elements.version.textContent = nom
          ? `Version : ${nom.replace('kaah-', '')}`
          : 'Version : inconnue (KAAH est ouvert sans installation)';
      })
      .catch(() => {
        elements.version.textContent = 'Version : inconnue';
      });
  }

  elements.bouton.addEventListener('click', () => {
    afficherVersion();
    elements.dialogue.showModal();
  });
  for (const bouton of elements.fermer) bouton.addEventListener('click', () => elements.dialogue.close());
}
