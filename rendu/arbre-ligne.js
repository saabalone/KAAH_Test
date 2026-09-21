// Construit les morceaux d'UNE ligne de la barre laterale Sequence
// (etiquette de coup, bouton de suppression, bouton de repli, suffixes,
// numero de tour) — rendu/arbre-html.js s'occupe, lui, de parcourir
// l'arbre et d'assembler ces morceaux en lignes completes. Separe pour
// que ni l'un ni l'autre ne depasse la taille d'un fichier a la fois
// (regle CLAUDE.md, ~200 lignes).
//
// Alignement en colonnes (signale par saab) : un element absent (pas de
// repli parce que ce noeud n'a pas d'enfant, pas de ✕ parce que
// moteur.peutSupprimerNoeud le refuse) doit quand meme RESERVER sa place,
// sinon les colonnes suivantes se decalent d'une ligne a l'autre. Chaque
// "creerXxx" ci-dessous renvoie donc TOUJOURS un element de la meme
// taille — invisible (`.invisible`, cache mais garde sa place) quand
// l'action ne s'applique pas, jamais absent.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : peutSupprimerNoeud
// vient de moteur/arbre.js, charge avant celui-ci dans index.html.

function cheminEgal(a, b) {
  return a.length === b.length && a.every((valeur, index) => valeur === b[index]);
}

// Un noeud est un ancetre STRICT du noeud courant : sur le chemin qui y
// mene, sans etre lui-meme le noeud courant (deja couvert par la couleur
// "courant").
function estSurLeCheminCourant(chemin, cheminCourant) {
  return chemin.length < cheminCourant.length && chemin.every((valeur, index) => valeur === cheminCourant[index]);
}

// Meme ordre de priorite que KAAWA (_render_tree_recursive) : courant,
// puis origine, puis chemin menant au noeud courant, puis branche.
function classeCouleur(noeud, chemin, arbre) {
  if (cheminEgal(chemin, arbre.chemin)) return 'arbre-courant';
  if (noeud.estOrigine) return 'arbre-origine';
  if (estSurLeCheminCourant(chemin, arbre.chemin)) return 'arbre-chemin';
  return 'arbre-branche';
}

// " (-b-w)" si CE coup vient d'ejecter une bille (le compte total a
// augmente par rapport au parent), rien sinon — meme condition que KAAWA
// (score_str), mais pas la meme ecriture : KAAWA affiche juste "(b-w)",
// mais saab a fait remarquer que ça se lit comme un score sportif
// ("6-5" = 6 contre 5), alors qu'il s'agit de billes PERDUES. Le "-" en
// tete ("-5-6") montre que ce sont des billes EN MOINS pour chaque camp.
// Sans consequence sur la compatibilite des fichiers (voir CLAUDE.md,
// "Compatibilite des fichiers") : ceci n'est qu'un affichage, jamais lu
// ni ecrit par du texte Nacre ou une position compressee.
function suffixeEjection(etatNoeud, etatParent) {
  const b = etatNoeud.billesEjecteesNoires;
  const w = etatNoeud.billesEjecteesBlanches;
  if (b <= etatParent.billesEjecteesNoires && w <= etatParent.billesEjecteesBlanches) return '';
  return ` (-${b}-${w})`;
}

// " [N]" (normal, 6 ejections) ou " [T]" (temps ecoule) si ce noeud
// termine la partie — memes lettres que le `term_status` de KAAWA (voir
// moteur.marquerStatutFin ; "D" et "M" viendront avec les nulles et les
// puzzles, phases 16 et 15).
function suffixeFinDePartie(noeud) {
  return noeud.statutFin ? ` [${noeud.statutFin}]` : '';
}

// Les suffixes (ejection, fin de partie, et la date de creation si `noeud`
// est une feuille) bout a bout, dans UNE seule colonne (voir styles.css,
// .arbre-suffixes) dont la largeur est calculee sur la date — toujours la
// plus longue des trois : la reserver evite qu'aucun des trois ne decale
// l'alignement des lignes voisines. `dateTexte` vient de
// interface/sequence.js (deja au format AAMMJJHHMM) ; vide si ce noeud
// n'est pas une feuille ou que sa date n'est pas encore connue.
function creerSuffixes(noeud, etatParent, dateTexte) {
  const span = document.createElement('span');
  span.className = 'arbre-suffixes';
  const suffixes = suffixeEjection(noeud.etat, etatParent) + suffixeFinDePartie(noeud);
  span.textContent = dateTexte ? `${suffixes} ${dateTexte}`.trim() : suffixes;
  return span;
}

// Colonne "suffixes" vide (le cote d'une ligne qui n'a rien a afficher) :
// meme largeur reservee, sans texte.
function creerSuffixesVide() {
  const span = document.createElement('span');
  span.className = 'arbre-suffixes';
  return span;
}

// Le texte d'un coup : l'icone de branche si ce noeud a des freres
// (plusieurs coups possibles a cet endroit), puis le prefixe "-" pour
// Blanc (convention KAAWA).
function texteDuCoup(noeud, estNoir, aDesFreres) {
  const prefixe = estNoir ? '' : '-';
  const icone = aDesFreres ? (estNoir ? '● ' : '○ ') : '';
  return `${icone}${prefixe}${noeud.coup}`;
}

function creerEtiquette(noeud, chemin, texte, arbre, rappels) {
  const etiquette = document.createElement('span');
  etiquette.textContent = texte;
  etiquette.className = `arbre-noeud ${classeCouleur(noeud, chemin, arbre)}`;
  etiquette.addEventListener('click', () => rappels.surClicNoeud(chemin));
  return etiquette;
}

// Emplacement vide (le cote Blanc d'une ligne qui n'a encore aucune
// reponse blanche) : meme colonne "move", mais sans texte ni clic.
function creerEtiquetteVide() {
  const span = document.createElement('span');
  span.className = 'arbre-noeud';
  return span;
}

// Bouton de suppression (✕), actif seulement si moteur.peutSupprimerNoeud
// l'autorise pour ce noeud precis (l'origine ne peut perdre que son
// propre bout, une branche se supprime toujours — voir moteur/arbre.js) ;
// invisible sinon, mais toujours present (voir l'en-tete du fichier). La
// confirmation elle-meme (« vraiment supprimer ? ») est demandee par
// l'appelant (interface/saisie.js), pas ici.
function creerBoutonSupprimer(chemin, arbre, rappels) {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'arbre-supprimer';
  bouton.textContent = '✕';
  if (!chemin || !peutSupprimerNoeud(arbre, chemin)) {
    bouton.classList.add('invisible');
    bouton.disabled = true;
    return bouton;
  }
  bouton.title = 'Supprimer ce coup (et tout ce qui en dépend)';
  bouton.addEventListener('click', (evenement) => {
    evenement.stopPropagation();
    rappels.surClicSupprimer(chemin);
  });
  return bouton;
}

// Le controle ▶/▼ : replie ou deplie tout ce qui suit `cle` (le dernier
// noeud affiche sur la ligne). Invisible mais toujours present si ce
// noeud n'a pas d'enfant (voir l'en-tete du fichier).
function creerBoutonRepli(cle, aDesEnfants, replie, rappels) {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'arbre-repli';
  if (!aDesEnfants) {
    bouton.classList.add('invisible');
    bouton.disabled = true;
    return bouton;
  }
  bouton.textContent = replie ? '▶' : '▼';
  bouton.title = replie ? 'Déplier cette branche' : 'Replier cette branche';
  bouton.addEventListener('click', (evenement) => {
    evenement.stopPropagation();
    rappels.surClicRepli(cle);
  });
  return bouton;
}

function creerNumero(texte) {
  const span = document.createElement('span');
  span.className = 'arbre-numero';
  span.textContent = texte === '' ? '' : `${texte}.`;
  return span;
}
