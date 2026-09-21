// La version de KAAH_Test que fait tourner cet appareil : `KAAH_Test_ph21_v1` = la DERNIERE
// PHASE TERMINEE du PLAN (ici 21), puis un numero qui repart de 1 a chaque nouvelle phase
// terminee (ph21_v1, ph21_v2 si on republie sans avoir fini la phase suivante, puis
// ph22_v1...). C'est ce que chaque testeur doit citer dans son rapport. UNE SEULE source :
// l'Aide l'affiche (interface/aide.js) et le service worker en fait le nom de son cache
// (service-worker.js), donc la changer ici a chaque publication suffit — sans cela les
// appareils deja installes garderaient l'ancienne version (cache-first). Les changements de
// chaque version sont dans VERSIONS_TEST.md.
//
// Pas d'import ni d'export (voir moteur/plateau.js).
const PHASE_KAAH_TEST = 21;
const VERSION_KAAH_TEST = 1;
const NOM_VERSION_KAAH_TEST = `KAAH_Test_ph${PHASE_KAAH_TEST}_v${VERSION_KAAH_TEST}`;
