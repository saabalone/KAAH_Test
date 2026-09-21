// Le numero de la version de KAAH_Test que fait tourner cet appareil (v1, v2...) : ce que
// chaque testeur doit citer dans son rapport. UNE SEULE source : l'Aide l'affiche
// (interface/aide.js) et le service worker en fait le nom de son cache
// (service-worker.js), donc l'augmenter ici a chaque publication suffit — sans cela les
// appareils deja installes garderaient l'ancienne version (cache-first). Les changements
// de chaque version sont dans VERSIONS_TEST.md.
//
// Pas d'import ni d'export (voir moteur/plateau.js).
const VERSION_KAAH_TEST = 2;
