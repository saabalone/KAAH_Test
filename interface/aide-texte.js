// Le TEXTE de l'Aide mis en forme a l'affichage (extrait d'interface/aide.js, regle des
// 200 lignes) : des retours a la ligne aux ponctuations, et les noms de couleur ecrits
// dans leur couleur. Le texte lui-meme (index.html) reste ecrit d'un seul tenant.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

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
