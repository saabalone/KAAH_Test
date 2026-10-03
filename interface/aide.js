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
  if (enregistrement.installing) return 'installation en cours, gardez internet quelques secondes.';
  if (enregistrement.waiting) return 'prêt ✓ — une nouvelle version attend votre accord (proposée au lancement).';
  // Le cache de la version affichee, ou celui qui la sert encore pendant qu'une
  // nouvelle version attend d'etre chargee (interface/mise-a-jour.js).
  const cachePret = (await window.caches.keys()).some((nom) => nom.startsWith('kaah-'));
  if (navigator.serviceWorker.controller && cachePret) return 'prêt ✓ (KAAH marche sans internet sur cet appareil).';
  return 'installé, actif à la prochaine ouverture de KAAH.';
}

// L'Aide aeree (saab, 2026-10-02 : « trop dense, va a la ligne plus souvent, a
// chaque ponctuation ») : un retour a la ligne apres chaque fin de phrase (. !
// ?, suivie d'une majuscule, d'un chiffre ou d'un guillemet) et apres « : » et
// « ; » — jamais apres une virgule, qui decouperait les listes ; une ligne trop
// longue se replie d'elle-meme a un espace. Fait ici, a l'affichage : le texte
// de l'Aide (index.html) reste ecrit d'un seul tenant.
const COUPURE_DE_L_AIDE = /([.!?](?=\s+[\p{Lu}\d«(])|[:;](?=\s+\S))\s+/gu;

function aererLeTexte(conteneur) {
  const parcours = document.createTreeWalker(conteneur, NodeFilter.SHOW_TEXT, {
    acceptNode: (noeud) => (noeud.parentElement.closest('summary') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const textes = [];
  while (parcours.nextNode()) textes.push(parcours.currentNode);
  for (const noeud of textes) {
    const morceaux = noeud.textContent.split(COUPURE_DE_L_AIDE);
    if (morceaux.length === 1) continue;
    // split garde la ponctuation capturee : texte, ponctuation, texte, ...
    const contenu = [];
    for (let i = 0; i < morceaux.length; i += 2) {
      contenu.push(document.createTextNode(morceaux[i] + (morceaux[i + 1] ?? '')));
      if (i + 1 < morceaux.length) contenu.push(document.createElement('br'));
    }
    noeud.replaceWith(...contenu);
  }
}

// Les noms de couleur de l'Aide ecrits DANS leur couleur (saab, 2026-10-01) ;
// noir et blanc, illisibles ainsi sur le fond sombre, dans un cadre de leur
// couleur, le mot de la couleur opposee. Au feminin et au pluriel aussi.
const COULEURS_DE_L_AIDE = [
  [/^vert(e|s|es)?$/i, 'mot-vert'],
  [/^oranges?$/i, 'mot-orange'],
  [/^jaunes?$/i, 'mot-jaune'],
  [/^rouges?$/i, 'mot-rouge'],
  [/^bleu(e|s|es)?$/i, 'mot-bleu'],
  [/^gris(e|es)?$/i, 'mot-gris'],
  [/^noir(e|s|es)?$/i, 'mot-noir'],
  [/^blanc(he|s|hes)?$/i, 'mot-blanc'],
];
const MOTS_DE_COULEUR = /(\p{L}+)/gu;

function colorerLesCouleurs(conteneur) {
  const parcours = document.createTreeWalker(conteneur, NodeFilter.SHOW_TEXT);
  const textes = [];
  while (parcours.nextNode()) textes.push(parcours.currentNode);
  for (const noeud of textes) {
    const morceaux = noeud.textContent.split(MOTS_DE_COULEUR);
    if (!morceaux.some((mot) => COULEURS_DE_L_AIDE.some(([motif]) => motif.test(mot)))) continue;
    noeud.replaceWith(
      ...morceaux.map((mot) => {
        const couleur = COULEURS_DE_L_AIDE.find(([motif]) => motif.test(mot));
        if (!couleur) return document.createTextNode(mot);
        const span = document.createElement('span');
        span.className = couleur[1];
        span.textContent = mot;
        return span;
      })
    );
  }
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
      if (!chapitre.open) return;
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

// `elements` : { bouton, dialogue, version, horsLigne, fermer, corps } —
// `fermer` est une LISTE de boutons (en haut et en bas de la boite).
function demarrerAide(elements) {
  aererLeTexte(elements.corps);
  colorerLesCouleurs(elements.corps);
  preparerChapitres(elements.corps);
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
    if (!elements.dialogue.open) elements.dialogue.showModal();
  }

  elements.bouton.addEventListener('click', ouvrir);
  for (const bouton of elements.fermer) bouton.addEventListener('click', () => elements.dialogue.close());
  // Par-dessus les boites du demarrage (reprise de partie...), une fois la
  // page prete.
  if (lancementParLUtilisateur()) setTimeout(ouvrir, 0);
}
