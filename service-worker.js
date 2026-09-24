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
// change, pas seulement quand la liste FICHIERS_A_CACHER s'allonge : en
// cache-first, un fichier deja en cache n'est plus jamais redemande, donc
// un correctif dans styles.css ou interface/*.js n'atteindrait jamais les
// utilisateurs deja installes sans ce changement de nom.
//
// Le nom vient de version.js (une seule source, aussi lue par l'Aide) : c'est lui
// qu'il faut changer, pas cette ligne.
importScripts('./version.js');
const NOM_CACHE = `kaah-${NOM_VERSION_KAAH_TEST}`;

const FICHIERS_A_CACHER = [
  './',
  './index.html',
  './version.js',
  './styles.css',
  './moteur/plateau.js',
  './moteur/regles.js',
  './moteur/fleche-dernier-coup.js',
  './moteur/partie.js',
  './moteur/arbre.js',
  './moteur/historique-navigation.js',
  './moteur/notation.js',
  './moteur/pendules.js',
  './moteur/sauvegarde.js',
  './moteur/nom-partie.js',
  './moteur/creation-partie.js',
  './moteur/variantes.js',
  './moteur/permutations.js',
  './moteur/next-move.js',
  './moteur/puzzles.js',
  './moteur/nulle.js',
  './moteur/revanche.js',
  './moteur/classement.js',
  './moteur/positions-my.js',
  './moteur/occurrences.js',
  './moteur/menaces.js',
  './moteur/couleurs.js',
  './moteur/reglages.js',
  './donnees/kaa-variantes.js',
  './donnees/kaa-next-move.js',
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
  './rendu/fleche-dernier-coup.js',
  './rendu/ejections.js',
  './rendu/compteur-occurrences.js',
  './rendu/ligne-joueur.js',
  './rendu/abandon-nulle.js',
  './rendu/boutons-fin-piste.js',
  './rendu/pistes-triangle.js',
  './rendu/ejections-apercu.js',
  './rendu/pendule.js',
  './rendu/animation.js',
  './rendu/arbre-ligne.js',
  './rendu/arbre-html.js',
  './rendu/commentaires-html.js',
  './rendu/conseils.js',
  './rendu/menaces.js',
  './interface/pendules.js',
  './interface/pendules-mode.js',
  './interface/creation-partie.js',
  './interface/sequence.js',
  './interface/disposition.js',
  './interface/face-a-face.js',
  './interface/sauvegarde.js',
  './interface/fichiers.js',
  './interface/mes-parties.js',
  './interface/variantes.js',
  './interface/next-move.js',
  './interface/puzzles.js',
  './interface/positions-my.js',
  './interface/editeur-position.js',
  './interface/formulaire-position-my.js',
  './interface/fermeture-dialogues.js',
  './interface/nulle.js',
  './interface/sons.js',
  './interface/reglages-sons.js',
  './interface/aide.js',
  './interface/abandon-nulle.js',
  './interface/filtres-classement.js',
  './interface/fin-de-partie.js',
  './interface/position-copiable.js',
  './interface/jauge-mes-parties.js',
  './interface/reglages-profils.js',
  './interface/deplacable.js',
  './interface/reglages.js',
  './interface/noms-joueurs.js',
  './interface/commentaires.js',
  './interface/occurrences.js',
  './interface/menaces.js',
  './interface/confirmation.js',
  './interface/embranchement.js',
  './interface/saisie.js',
  './sons/move.wav',
  './sons/eject.wav',
  './sons/game_over.wav',
  './sons/occ_change.wav',
  './sons/occ_draw.wav',
  './sons/time_alert.wav',
  './pwa/manifeste.webmanifest',
  './pwa/icones/icone-192.png',
  './pwa/icones/icone-512.png',
  './pwa/icones/icone-apple-180.png',
  './pwa/icones/favicon-32.png',
];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(caches.open(NOM_CACHE).then((cache) => cache.addAll(FICHIERS_A_CACHER)));
  self.skipWaiting(); // active la nouvelle version des le prochain rechargement, sans attendre
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((nom) => nom !== NOM_CACHE).map((nom) => caches.delete(nom))))
  );
  self.clients.claim();
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
