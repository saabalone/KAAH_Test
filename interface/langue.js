// La LANGUE de l'interface (saab, 2026-10-18 : version anglaise, bouton Fra/Eng) : en
// anglais, chaque texte affiche qui est dans le dictionnaire (donnees/traduction-anglais.js)
// est remplace a l'affichage, au chargement puis a chaque changement de la page — le code
// du jeu reste en francais et ne voit rien (aucune decision ne lit un texte affiche). En
// francais, rien ne tourne. Changer de langue recharge la page.
//
// Laisses tels quels : ce que l'on ecrit (champs, commentaires), la Sequence, les coups,
// et le corps de l'Aide (en anglais, un bouton le copie pour un traducteur).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : TRADUCTION_ANGLAIS,
// TRADUCTION_ANGLAIS_MOTIFS (donnees/traduction-anglais.js) viennent d'un fichier charge
// avant celui-ci.

const CLE_LANGUE = 'kaah-langue';
const LANGUE_PAR_DEFAUT = 'fr';
const ATTRIBUTS_TRADUITS = ['title', 'placeholder', 'aria-label'];
const ZONES_SANS_TRADUCTION = 'textarea, input, [contenteditable], script, style, #arbre, #commentaires-liste, .aide-corps, .banc-coups';

function langueChoisie() {
  try {
    return window.localStorage.getItem(CLE_LANGUE) === 'en' ? 'en' : LANGUE_PAR_DEFAUT;
  } catch {
    return LANGUE_PAR_DEFAUT;
  }
}

function changerDeLangue() {
  try {
    window.localStorage.setItem(CLE_LANGUE, langueChoisie() === 'en' ? 'fr' : 'en');
  } catch {
    return; // sans stockage, la langue ne survivrait pas au rechargement
  }
  window.location.reload();
}

// Le texte anglais de `texte` (ses espaces de bord gardes), ou null s'il n'y en a pas.
function texteEnAnglais(texte) {
  const coeur = texte.replace(/\s+/g, ' ').trim();
  if (!coeur) return null;
  const traduit = TRADUCTION_ANGLAIS[coeur];
  if (traduit !== undefined) return traduit === coeur ? null : texte.replace(texte.trim(), () => traduit);
  const brut = texte.trim();
  for (const [motif, remplacement] of TRADUCTION_ANGLAIS_MOTIFS) {
    if (!motif.test(brut)) continue;
    const traduitAvecMotif = brut.replace(motif, remplacement);
    // Inchange : rien a ecrire (l'observateur ne doit pas se relancer).
    return traduitAvecMotif === brut ? null : texte.replace(brut, () => traduitAvecMotif);
  }
  return null;
}

const horsTraduction = (element) => Boolean(element?.closest?.(ZONES_SANS_TRADUCTION));

function traduireUnTexte(noeud) {
  if (horsTraduction(noeud.parentElement)) return;
  const traduit = texteEnAnglais(noeud.nodeValue);
  if (traduit !== null) noeud.nodeValue = traduit;
}

function traduireLesAttributs(element) {
  if (element.closest(ZONES_SANS_TRADUCTION) && !element.matches('input, textarea')) return;
  for (const attribut of ATTRIBUTS_TRADUITS) {
    const valeur = element.getAttribute(attribut);
    const traduit = valeur ? texteEnAnglais(valeur) : null;
    if (traduit !== null) element.setAttribute(attribut, traduit);
  }
}

// Un element et tout ce qu'il contient.
function traduireUnElement(racine) {
  if (racine.nodeType === Node.TEXT_NODE) return traduireUnTexte(racine);
  if (racine.nodeType !== Node.ELEMENT_NODE) return;
  traduireLesAttributs(racine);
  for (const element of racine.querySelectorAll('[title], [placeholder], [aria-label]')) traduireLesAttributs(element);
  const parcours = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
  for (let noeud = parcours.nextNode(); noeud; noeud = parcours.nextNode()) traduireUnTexte(noeud);
}

// En anglais : la page tout de suite, puis tout ce qui change ensuite.
function demarrerLaLangue() {
  const anglais = langueChoisie() === 'en';
  document.documentElement.lang = anglais ? 'en' : 'fr';
  document.documentElement.classList.toggle('en-anglais', anglais);
  for (const bouton of document.querySelectorAll('[data-changer-langue]')) {
    bouton.textContent = anglais ? 'Français' : 'English';
    bouton.addEventListener('click', changerDeLangue);
  }
  if (!anglais) return;
  traduireUnElement(document.body);
  new MutationObserver((changements) => {
    for (const changement of changements) {
      if (changement.type === 'characterData') traduireUnTexte(changement.target);
      else if (changement.type === 'attributes') traduireLesAttributs(changement.target);
      else changement.addedNodes.forEach(traduireUnElement);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTS_TRADUITS });
}

// L'Aide en anglais : son texte entier copie, pour un traducteur.
function brancherLaCopieDeLAide(bouton, corps) {
  bouton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(corps.innerText);
      bouton.textContent = 'Copied ✓ — now paste it into a translator';
    } catch {
      bouton.textContent = 'Copy failed: select the text and copy it by hand';
    }
  });
}
