// Rend KAAH installable et utilisable hors ligne, en cache-first : on sert
// d'abord ce qu'on a en cache, le reseau n'est qu'un recours.
//
// Ce fichier vit a la racine du projet, pas dans pwa/, pour une raison
// concrete du web : un service worker ne peut controler que les pages de
// son propre dossier ou en-dessous (sa "portee"), sauf si le serveur
// envoie un en-tete special que notre petit serveur local n'envoie pas.
// A la racine, sa portee couvre tout le site sans configuration
// supplementaire.
//
// Augmenter la version (version.js) a chaque fois que le CONTENU d'un fichier cache
// change, pas seulement quand la liste des fichiers s'allonge : en
// cache-first, un fichier deja en cache n'est plus jamais redemande, donc
// un correctif dans styles.css ou interface/*.js n'atteindrait jamais les
// utilisateurs deja installes sans ce changement de nom.
//
// Le nom vient de version.js (une seule source, aussi lue par l'Aide) : c'est lui
// qu'il faut changer, pas cette ligne.
importScripts('./version.js');
const NOM_CACHE = `kaah-${NOM_VERSION_KAAH_TEST}`;

// ESSENTIELS/SECONDAIRES (saab, 2026-09-25 : sur son iPhone, rouvrir l'icone
// hors ligne affichait la page sans le plateau) : `cache.addAll` echoue EN
// BLOC si un seul des fichiers demandes echoue a se telecharger — jusqu'ici
// une seule liste d'environ 3 Mo (dont la base Next Move a elle seule 1,6 Mo,
// voir CLAUDE.md), toute entiere ou rien. Sur un reseau mobile lent ou une
// installation interrompue trop tot, l'installation entiere pouvait donc ne
// jamais aboutir, et l'appli hors ligne se retrouvait sans AUCUN cache — le
// navigateur retombe alors sur son cache HTTP ordinaire, peu fiable (d'ou la
// page sans plateau). Separees en deux : les ESSENTIELS (tout ce qu'il faut
// pour afficher et jouer) doivent reussir pour que l'installation compte ;
// les SECONDAIRES (la base Next Move de Conseils, le solveur de puzzles, les
// sons — deja concus pour se charger en arriere-plan ou echouer sans rien
// casser, voir leurs fichiers) sont mis en cache a part, sans jamais faire
// echouer l'installation si eux n'y arrivent pas.
const FICHIERS_ESSENTIELS = [
  './',
  './index.html',
  './version.js',
  './styles.css',
  './moteur/plateau.js',
  './moteur/regles.js',
  './moteur/fleche-dernier-coup.js',
  './moteur/partie.js',
  './moteur/arbre.js',
  './moteur/bilan-sequence.js',
  './moteur/historique-navigation.js',
  './moteur/notation.js',
  './moteur/pendules.js',
  './moteur/sauvegarde.js',
  './moteur/nom-partie.js',
  './moteur/filtre-parties.js',
  './moteur/creation-partie.js',
  './moteur/copie-sequence.js',
  './moteur/correspondance.js',
  './moteur/variantes.js',
  './moteur/permutations.js',
  './moteur/next-move.js',
  './moteur/bases-coups.js',
  './moteur/ia-evaluation.js',
  './moteur/ia-evaluation-v2.js',
  './moteur/ia-memoire.js',
  './moteur/archive-recherches.js',
  './moteur/ia-recherche.js',
  './moteur/ia.js',
  './moteur/historique-profil-ia.js',
  './moteur/profils-ia.js',
  './moteur/sequence-prevue.js',
  './moteur/essai-ia.js',
  './moteur/puzzles.js',
  './moteur/solveur.js',
  './moteur/nulle.js',
  './moteur/revanche.js',
  './moteur/classement.js',
  './moteur/corbeille.js',
  './moteur/compte-volume.js',
  './moteur/ordre-groupes.js',
  './moteur/positions-my.js',
  './moteur/occurrences.js',
  './moteur/menaces.js',
  './moteur/couleurs.js',
  './moteur/reglages.js',
  './donnees/kaa-variantes.js',
  './donnees/kaa-puzzles.js',
  './rendu/plateau-svg.js',
  './rendu/relief-cylindres.js',
  './rendu/cadre-plateau.js',
  './rendu/relief-plateau.js',
  './rendu/couleurs-plateau.js',
  './rendu/cache-relief.js',
  './rendu/selection.js',
  './rendu/coordonnees-bord.js',
  './rendu/coordonnees-jeu.js',
  './rendu/trous-simples.js',
  './rendu/apparence-reglages.js',
  './rendu/fleche-dernier-coup.js',
  './rendu/ejections.js',
  './rendu/compteur-occurrences.js',
  './rendu/ligne-joueur.js',
  './rendu/abandon-nulle.js',
  './rendu/boutons-fin-piste.js',
  './rendu/evaluation.js',
  './rendu/pistes-triangle.js',
  './rendu/ejections-apercu.js',
  './rendu/pendule.js',
  './rendu/pendule-horizontale.js',
  './rendu/place-options-fin.js',
  './rendu/courroie.js',
  './rendu/corde.js',
  './rendu/vol-ejection.js',
  './rendu/animation.js',
  './rendu/arbre-ligne.js',
  './rendu/arbre-html.js',
  './rendu/commentaires-html.js',
  './rendu/conseils.js',
  './rendu/menaces.js',
  './interface/pendules.js',
  './interface/profils-ia.js',
  './interface/choix-joueurs.js',
  './interface/pendules-mode.js',
  './interface/ia.js',
  './interface/creation-partie.js',
  './interface/sequence.js',
  './interface/disposition.js',
  './interface/face-a-face.js',
  './interface/sauvegarde.js',
  './interface/fichiers.js',
  './interface/compte-titre.js',
  './interface/filtre-parties.js',
  './interface/mes-parties.js',
  './interface/variantes.js',
  './interface/next-move.js',
  './interface/puzzles-permutations.js',
  './interface/puzzles.js',
  './interface/solveur.js',
  './solveur/kai-plus.js',
  './interface/kai-plus.js',
  './interface/verification-puzzle.js',
  './interface/positions-my.js',
  './interface/corbeille.js',
  './interface/editeur-position.js',
  './interface/formulaire-position-my.js',
  './interface/fermeture-dialogues.js',
  './interface/ordre-colonne.js',
  './interface/code-correspondance.js',
  './interface/correspondance-rangement.js',
  './interface/correspondance.js',
  './interface/correspondance-en-cours.js',
  './interface/permutations.js',
  './interface/nulle.js',
  './interface/sons.js',
  './interface/reglages-sons.js',
  './interface/aide.js',
  './interface/mise-a-jour.js',
  './interface/notes-perso.js',
  './interface/abandon-nulle.js',
  './interface/filtres-classement.js',
  './interface/fin-de-partie.js',
  './interface/position-copiable.js',
  './interface/jauge-mes-parties.js',
  './interface/reglages-profils.js',
  './interface/deplacable.js',
  './interface/bases-coups-stockage.js',
  './interface/bases-coups.js',
  './interface/reglages-champs.js',
  './interface/reglages-rubriques.js',
  './interface/historique-ia.js',
  './interface/essai-ia.js',
  './interface/reglages-ia.js',
  './interface/reglages.js',
  './interface/noms-joueurs.js',
  './interface/commentaires.js',
  './interface/occurrences.js',
  './interface/menaces.js',
  './interface/confirmation.js',
  './interface/embranchement.js',
  './interface/sequence-prevue.js',
  './interface/hauteurs-colonne.js',
  './interface/recherche-ia.js',
  './interface/reflexion-ia.js',
  './interface/ia-reflexion.js',
  './interface/evaluations.js',
  './interface/lecture-sequence.js',
  './interface/saisie.js',
  './pwa/manifeste.webmanifest',
  './pwa/icones/icone-192.png',
  './pwa/icones/icone-512.png',
  './pwa/icones/icone-apple-180.png',
  './pwa/icones/favicon-32.png',
];

// Voir le commentaire au-dessus de FICHIERS_ESSENTIELS : gros (Next Move,
// 1,6 Mo) ou simplement dispensables (solveur, sons), jamais au prix d'une
// installation qui echoue entierement a cause d'eux.
const FICHIERS_SECONDAIRES = [
  './donnees/kaa-next-move.js',
  './solveur/kaa-solveur.js',
  './sons/move.wav',
  './sons/eject.wav',
  './sons/game_over.wav',
  './sons/occ_change.wav',
  './sons/occ_draw.wav',
  './sons/time_alert.wav',
];

// Chaque fichier redemande AU SERVEUR (`cache: 'reload'`), jamais au cache
// HTTP ordinaire du navigateur : GitHub Pages y laisse un fichier 10 minutes,
// et une nouvelle version s'installait alors avec des fichiers de la
// precedente (saab : "si on est passe a v6 alors que j'etais a v4, je
// recharge en v5 puis en v6").
function demandesFraiches(fichiers) {
  return fichiers.map((fichier) => new Request(fichier, { cache: 'reload' }));
}

// MISES A JOUR SUR ACCORD (saab, 2026-10-01 : « une fois l'appli chargee par
// internet, tant qu'il n'y a pas une nouvelle version, ce n'est pas la peine de
// recharger, et si une nouvelle version existe il faut demander si on veut la
// charger, pour eviter de consommer internet inutilement »). A chaque
// lancement, le navigateur ne relit que ce fichier et version.js (quelques
// Ko). S'ils ont change, la nouvelle version s'installe SANS rien telecharger
// et attend : la page la propose (interface/mise-a-jour.js), et seul un
// « Charger » telecharge ses fichiers (message 'charger'). Tant qu'elle n'est
// pas chargee, l'ancienne continue de servir son cache — meme si le navigateur
// active la nouvelle apres la fermeture de KAAH : son cache vide, c'est
// l'ancien qui repond (caches.match les parcourt tous), et l'ancien n'est
// efface qu'une fois le nouveau complet.
//
// Un cache complet porte ce marqueur. Les caches d'avant ce fonctionnement
// n'en ont pas : leur premiere mise a jour se fait encore toute seule, une
// fois — c'est elle qui installe ce fichier-ci.
const MARQUEUR_CACHE_COMPLET = 'kaah-cache-complet'; // pas un fichier du site : jamais servi

async function remplirLeCache() {
  const cache = await caches.open(NOM_CACHE);
  await cache.addAll(demandesFraiches(FICHIERS_ESSENTIELS));
  // Les secondaires ne doivent jamais faire echouer l'installation : une erreur
  // ici (reseau coupe en cours de route, par exemple) est avalee, l'appli reste
  // installee et jouable hors ligne sans eux.
  await cache.addAll(demandesFraiches(FICHIERS_SECONDAIRES)).catch(() => {});
  await cache.put(MARQUEUR_CACHE_COMPLET, new Response(NOM_VERSION_KAAH_TEST));
}

async function estComplet(nom) {
  if (!(await caches.has(nom))) return false;
  return Boolean(await (await caches.open(nom)).match(MARQUEUR_CACHE_COMPLET));
}

async function oublierLesAutresCaches() {
  const noms = await caches.keys();
  await Promise.all(noms.filter((nom) => nom !== NOM_CACHE).map((nom) => caches.delete(nom)));
}

// Une version deja installee selon ce fonctionnement (un cache complet) ?
async function installeeSurAccord() {
  for (const nom of await caches.keys()) if (nom.startsWith('kaah-') && (await estComplet(nom))) return true;
  return false;
}

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    (async () => {
      // Une mise a jour attend l'accord (voir plus haut) ; une premiere
      // installation se charge tout de suite.
      if (await installeeSurAccord()) return;
      await remplirLeCache();
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    (async () => {
      if (await estComplet(NOM_CACHE)) await oublierLesAutresCaches();
      await self.clients.claim();
    })()
  );
});

// La page demande l'etat de cette version ('etat' -> { version, complet }), ou
// son chargement ('charger' -> { pret } ou { erreur }), par un MessageChannel.
self.addEventListener('message', (evenement) => {
  const reponse = evenement.ports[0];
  if (!reponse) return;
  if (evenement.data === 'etat') {
    evenement.waitUntil(estComplet(NOM_CACHE).then((complet) => reponse.postMessage({ version: NOM_VERSION_KAAH_TEST, complet })));
  } else if (evenement.data === 'charger') {
    evenement.waitUntil(
      (async () => {
        try {
          await remplirLeCache();
          await oublierLesAutresCaches();
          // Prendre la main AVANT de repondre : la page recharge aussitot.
          await self.skipWaiting();
          reponse.postMessage({ pret: true });
        } catch (erreur) {
          reponse.postMessage({ erreur: String(erreur?.message ?? erreur) });
        }
      })()
    );
  }
});

// Safari (iPhone) demande ses sons par PLAGES d'octets (en-tete Range) et
// n'accepte, en retour, qu'une reponse 206 : lui renvoyer le fichier entier avec
// un 200 le fait renoncer a jouer. On decoupe donc la reponse du cache a la
// demande (interface/sons.js).
function reponsePartielle(reponseEnCache, requete) {
  const plage = /bytes=(\d*)-(\d*)/.exec(requete.headers.get('range'));
  return reponseEnCache.arrayBuffer().then((octets) => {
    const total = octets.byteLength;
    const debut = plage[1] === '' ? Math.max(0, total - Number(plage[2])) : Number(plage[1]);
    const fin = plage[1] !== '' && plage[2] !== '' ? Math.min(Number(plage[2]), total - 1) : total - 1;
    return new Response(octets.slice(debut, fin + 1), {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': reponseEnCache.headers.get('Content-Type') ?? 'application/octet-stream',
        'Content-Range': `bytes ${debut}-${fin}/${total}`,
        'Content-Length': String(fin - debut + 1),
      },
    });
  });
}

self.addEventListener('fetch', (evenement) => {
  evenement.respondWith(
    caches.match(evenement.request).then((reponseEnCache) => {
      if (!reponseEnCache) return fetch(evenement.request);
      return evenement.request.headers.has('range') ? reponsePartielle(reponseEnCache, evenement.request) : reponseEnCache;
    })
  );
});
