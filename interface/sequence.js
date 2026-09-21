// Barre laterale Sequence (phase 11) : bascule son affichage, retient
// quelles branches sont repliees, garde l'heure de creation des coups pour
// l'afficher sur les feuilles, gere l'en-tete fixe (position de depart,
// comme le "[ POS. START ]" de KAAWA) et delegue le dessin de l'arbre a
// rendu/arbre-html.js. Separe de interface/saisie.js pour la meme raison
// que interface/pendules.js : un widget autonome avec son propre etat
// d'affichage (ici, les replis et les dates), pas une regle du jeu.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : dessinerArbre vient
// de rendu/arbre-html.js, charge avant celui-ci dans index.html.

// `elementsArbre` : { conteneur, entete, panneau, poigneeHauteur,
// poigneeLargeur } — voir interface/saisie.js. `bouton` n'en fait plus
// partie (phase 18) : le panneau est desormais PARTAGE avec Commentaires,
// et c'est interface/saisie.js, seul endroit qui connait les deux modes a
// la fois, qui bascule `panneau.hidden` et le mode affiche — voir
// forcerReaffichagePlateau plus bas, qu'il appelle a chaque bascule.
// `texteEnTete` est le texte fixe de l'en-tete (le nom de la variante
// s'il existe, sinon la position compressee elle-meme — voir
// moteur.ecrirePosition ; un vrai nom de variante viendra avec les
// variantes nommees, phase 13). `rappels` : { surClicNoeud(chemin),
// surClicSupprimer(chemin) }, tous deux fournis par interface/saisie.js
// (seul endroit qui possede `arbre`).
// Renvoie { actualiser(arbre), enregistrerDate(chemin) }.
function demarrerAffichageSequence(elementsArbre, texteEnTete, rappels) {
  const cheminsReplies = new Set();
  const datesParChemin = new Map();

  // `title` (pas seulement `textContent`) : le CSS tronque cette ligne a
  // une seule (styles.css, "…" en fin) quand la position compressee est
  // longue — le texte complet reste consultable au survol sur ordinateur,
  // jamais indispensable au jeu lui-meme (CLAUDE.md, "rien d'important au
  // survol seul").
  const texteEntete = `Depart : ${texteEnTete}`;
  elementsArbre.entete.textContent = texteEntete;
  elementsArbre.entete.title = texteEntete;
  elementsArbre.entete.addEventListener('click', () => rappels.surClicNoeud([]));

  activerRedimensionnementHauteur(elementsArbre.panneau, elementsArbre.poigneeHauteur);
  activerRedimensionnementLargeur(elementsArbre.panneau, elementsArbre.poigneeLargeur);

  function actualiser(arbre) {
    elementsArbre.entete.classList.toggle('arbre-courant', arbre.chemin.length === 0);

    dessinerArbre(elementsArbre.conteneur, arbre, cheminsReplies, datesParChemin, {
      surClicNoeud: rappels.surClicNoeud,
      surClicSupprimer: rappels.surClicSupprimer,
      surClicRepli: (cle) => {
        if (cheminsReplies.has(cle)) cheminsReplies.delete(cle);
        else cheminsReplies.add(cle);
        actualiser(arbre); // redessine avec le nouvel etat de repli, sans changer de noeud
      },
    });

    garderNoeudActifVisible(elementsArbre.conteneur);
  }

  // A appeler juste apres avoir cree un noeud (voir moteur.jouerDansArbre)
  // pour retenir la date a laquelle CE coup a vraiment ete joue — jamais
  // en rejouant un coup deja existant, qui garde la date de sa premiere
  // creation. Format KAAWA, AAMMJJHHMM (ex. "2609120425").
  function enregistrerDate(chemin) {
    const maintenant = new Date();
    const deuxChiffres = (valeur) => String(valeur).padStart(2, '0');
    const annee = String(maintenant.getFullYear()).slice(-2);
    const mois = deuxChiffres(maintenant.getMonth() + 1);
    const jour = deuxChiffres(maintenant.getDate());
    const heure = deuxChiffres(maintenant.getHours());
    const minute = deuxChiffres(maintenant.getMinutes());
    datesParChemin.set(chemin.join('.'), `${annee}${mois}${jour}${heure}${minute}`);
  }

  return { actualiser, enregistrerDate };
}

// Le coup actif (.arbre-courant) doit toujours rester dans la partie
// visible de `conteneur`, meme s'il vient de sortir de la zone de
// defilement — sinon on perd le fil apres quelques coups des que la liste
// depasse la hauteur du panneau (signale par saab). Fonction PARTAGEE
// (phase 18, suite) : interface/commentaires.js l'appelle aussi sur son
// propre conteneur (#commentaires-liste) — saab a signale que naviguer
// depuis Occurrences ou chercher un coup dans Commentaires ne faisait pas
// toujours defiler jusqu'a lui ("le focus ne se fait pas tjs si le coup
// est hors fenetre"), un oubli : seule la Sequence avait ce correctif
// jusqu'ici. Definie ICI, au niveau du fichier (pas dans une fermeture),
// et chargee AVANT interface/commentaires.js dans index.html pour que ce
// dernier puisse s'en servir sans rien importer (voir moteur/plateau.js).
//
// `element.scrollIntoView(...)` NE CONVIENT PAS ici : c'est le navigateur
// qui decide comment satisfaire la demande, et sur telephone, pendant un
// zoom au doigt, il peut deplacer la FENETRE VISUELLE ENTIERE (pas
// seulement le petit defilement de la liste) pour y arriver — ce qui
// decale le plateau que saab avait justement cadre en zoomant (signale
// par saab). On calcule donc a la main le decalage a l'interieur de
// `conteneur` (son propre `scrollTop`) et rien d'autre : aucune chance que
// ca touche au defilement de la page ni au cadrage du navigateur. Sans
// effet (et sans risque) si `conteneur` est actuellement masque
// (`hidden`) : son rectangle est alors nul des deux cotes, la comparaison
// ne declenche donc aucun defilement.
function garderNoeudActifVisible(conteneur) {
  const coupActif = conteneur.querySelector('.arbre-courant');
  if (!coupActif) return;
  // En face-a-face la colonne est TOURNEE de 90 degres : les rectangles a
  // l'ecran (getBoundingClientRect) ont leurs axes echanges avec ceux du
  // defilement, la comparaison ci-dessous ne voudrait plus rien dire.
  // scrollIntoView, lui, raisonne dans le repere de l'element.
  if (document.body.classList.contains('face-a-face')) {
    coupActif.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return;
  }
  const cadreConteneur = conteneur.getBoundingClientRect();
  const cadreCoup = coupActif.getBoundingClientRect();
  if (cadreCoup.top < cadreConteneur.top) {
    conteneur.scrollTop -= cadreConteneur.top - cadreCoup.top;
  } else if (cadreCoup.bottom > cadreConteneur.bottom) {
    conteneur.scrollTop += cadreCoup.bottom - cadreConteneur.bottom;
  }
}

// Glisser-deposer sur `poignee` (le petit bandeau au bas du panneau, visible
// seulement sur ordinateur — voir styles.css) ajuste directement la
// hauteur de `panneau` : sur ordinateur, la sequence ne prend que la
// moitie de l'ecran par defaut (styles.css), pour laisser de la place a
// de futures pages en dessous (menaces phase 19, notes phase 26...) ;
// saab a demande de pouvoir agrandir ou reduire cette moitie a la main.
// Sans effet sur telephone : la poignee y est masquee, `pointerdown` ne
// s'y declenche jamais.
function activerRedimensionnementHauteur(panneau, poignee) {
  let hauteurDepart = 0;
  let yDepart = 0;
  let xDepart = 0;

  // En face-a-face la colonne est tournee de +90 : le bas du panneau est sur
  // sa GAUCHE a l'ecran, et l'agrandir se fait en tirant vers la gauche.
  // offsetHeight (et non getBoundingClientRect) : la hauteur DANS le repere du
  // panneau, que la rotation ne change pas.
  const enFaceAFace = () => document.body.classList.contains('face-a-face');
  const glissement = (evenement) => (enFaceAFace() ? xDepart - evenement.clientX : evenement.clientY - yDepart);

  poignee.addEventListener('pointerdown', (evenement) => {
    hauteurDepart = panneau.offsetHeight;
    yDepart = evenement.clientY;
    xDepart = evenement.clientX;
    poignee.setPointerCapture(evenement.pointerId);
  });

  poignee.addEventListener('pointermove', (evenement) => {
    if (!poignee.hasPointerCapture(evenement.pointerId)) return;
    const hauteurDemandee = hauteurDepart + glissement(evenement);
    // Ni trop petit (l'en-tete et une ligne au moins doivent rester
    // visibles) ni plus grand que la fenetre elle-meme.
    panneau.style.height = `${Math.max(120, Math.min(hauteurDemandee, window.innerHeight))}px`;
  });

  // Relache EXPLICITEMENT la capture (bug trouve par saab : un
  // glisser-deposer qui finit mal — la souris relachee au-dessus d'un
  // <dialog>, par exemple — pouvait laisser la capture engagee POUR DE
  // BON, ce qui detourne alors TOUS les evenements pointeur suivants,
  // partout sur la page, vers cette poignee : plus aucun clic nulle part
  // ne fonctionne, jusqu'au rechargement complet. Le navigateur relache
  // la capture tout seul dans le cas normal, mais ne JAMAIS en dependre
  // pour un element aussi central que celui-ci.
  poignee.addEventListener('pointerup', (evenement) => poignee.releasePointerCapture(evenement.pointerId));
  poignee.addEventListener('pointercancel', (evenement) => poignee.releasePointerCapture(evenement.pointerId));
}

// Meme principe qu'activerRedimensionnementHauteur, mais sur la LARGEUR du
// panneau : saab a signale que zoomer avec le navigateur (Ctrl+molette)
// pour agrandir le plateau ne marche pas bien, la largeur fixe du panneau
// (400px, styles.css) prenant une part de plus en plus grosse d'une place
// totale qui retrecit — au lieu de zoomer, on peut maintenant reduire ou
// agrandir directement le panneau, sans toucher au zoom.
//
// Le panneau est a DROITE du plateau (dans #colonne-droite, elle-meme a
// droite sur ordinateur) : glisser la poignee vers la GAUCHE doit donc
// l'ELARGIR, d'ou le signe oppose a celui d'activerRedimensionnementHauteur
// (glisser vers le bas agrandit LA, glisser vers la gauche agrandit ICI).
//
// Ecrit une VARIABLE CSS sur la racine (`--largeur-sequence`), que
// styles.css n'utilise que dans la media query ordinateur, plutot qu'un
// `style.width` pose directement sur le panneau. Deux raisons : une largeur
// en dur survivrait au passage en portrait, ou le panneau doit reprendre
// toute la largeur de l'ecran (un `style` en ligne bat n'importe quelle
// regle de feuille) ; et ce n'est plus `flex-basis` qui convient depuis que
// le panneau vit dans une COLONNE flex, ou un flex-basis reglerait sa
// hauteur. Sans effet sur telephone de toute facon : la poignee y est
// masquee, `pointerdown` ne s'y declenche jamais.
function activerRedimensionnementLargeur(panneau, poignee) {
  let largeurDepart = 0;
  let xDepart = 0;

  poignee.addEventListener('pointerdown', (evenement) => {
    largeurDepart = panneau.getBoundingClientRect().width;
    xDepart = evenement.clientX;
    poignee.setPointerCapture(evenement.pointerId);
  });

  poignee.addEventListener('pointermove', (evenement) => {
    if (!poignee.hasPointerCapture(evenement.pointerId)) return;
    const largeurDemandee = largeurDepart - (evenement.clientX - xDepart);
    // Ni trop etroit (en dessous, la grille a 10 colonnes defile
    // horizontalement — #arbre a un `overflow-x: auto` en secours, voir
    // styles.css) ni au point de ne plus laisser de place au plateau.
    const largeur = Math.max(200, Math.min(largeurDemandee, window.innerWidth - 200));
    document.documentElement.style.setProperty('--largeur-sequence', `${largeur}px`);
  });

  // Voir activerRedimensionnementHauteur ci-dessus : relache explicite,
  // jamais laissee au seul navigateur.
  poignee.addEventListener('pointerup', (evenement) => poignee.releasePointerCapture(evenement.pointerId));
  poignee.addEventListener('pointercancel', (evenement) => poignee.releasePointerCapture(evenement.pointerId));
}

// Force un vrai reflow ET un repaint du plateau (phase 15, correctif) :
// afficher/masquer ce panneau (Sequence ou Commentaires, phase 18) change
// la hauteur de la ligne de grille du plateau sur telephone (styles.css),
// et le SVG reste parfois affiche a son ANCIENNE taille — les cases
// debordent a droite jusqu'a ce qu'on retouche l'ecran (un second tap
// "corrige" tout seul, signe d'un probleme de RE-AFFICHAGE du navigateur
// plutot que de logique). `display:none` puis relire une dimension
// (`offsetHeight`) fait sortir puis rentrer l'element du flux, ce qu'un
// simple redimensionnement de conteneur ne declenche pas toujours tout
// seul sur un <svg>. A appeler par interface/saisie.js a chaque bascule
// du panneau partage (voir l'en-tete du fichier).
function forcerReaffichagePlateau() {
  const plateau = document.getElementById('plateau');
  if (!plateau) return;
  const affichageInitial = plateau.style.display;
  plateau.style.display = 'none';
  void plateau.offsetHeight; // force le recalcul avant de reafficher
  plateau.style.display = affichageInitial;
}

// EXCEPTION ASSUMEE a "le plateau garde sa taille maximale" (phase 18) :
// saab l'a demandee lui-meme, seulement pour le portrait telephone et
// seulement a la main — "on peut afficher plusieurs lignes en mettant une
// poignee sur le plateau qui pourra reduire le plateau et donc agrandir
// le Commentaire". `poignee` vit juste apres #plateau dans
// #colonne-principale (index.html) : le reduire libere mecaniquement de
// la hauteur pour la ligne de grille suivante (Sequence/Commentaires),
// sans toucher a `grid-template-rows` (styles.css, seulement visible sur
// telephone — voir la media query).
//
// Contrairement a activerRedimensionnementHauteur/Largeur plus haut (qui
// ecrivent une VARIABLE CSS, jamais un style en ligne — voir ces
// fonctions pour pourquoi), celle-ci pose directement `plateau.style
// .height` : plus simple ici parce que la valeur normale ("auto", derivee
// de la largeur) n'est PAS un nombre qu'on pourrait remettre dans une
// variable par defaut. Le style en ligne est donc explicitement EFFACE
// des qu'on quitte le portrait (voir interface/disposition.js,
// SEUIL_ORDINATEUR) pour ne jamais fausser paysage/ordinateur — meme
// precaution que la fuite deja rencontree sur --largeur-sequence.
function activerRedimensionnementPlateauPortrait(plateau, poignee) {
  let hauteurDepart = 0;
  let yDepart = 0;

  poignee.addEventListener('pointerdown', (evenement) => {
    hauteurDepart = plateau.getBoundingClientRect().height;
    yDepart = evenement.clientY;
    poignee.setPointerCapture(evenement.pointerId);
  });

  poignee.addEventListener('pointermove', (evenement) => {
    if (!poignee.hasPointerCapture(evenement.pointerId)) return;
    const hauteurDemandee = hauteurDepart + (evenement.clientY - yDepart);
    // Pas trop petit (en dessous, le plateau ne veut plus rien dire) ; pas
    // de plafond explicite au-dela : `max-width: 100%` (styles.css) fait
    // deja le travail si on redemande plus que la largeur disponible ne
    // permet, exactement comme en paysage (voir #plateau, styles.css).
    plateau.style.height = `${Math.max(120, hauteurDemandee)}px`;
    plateau.style.width = 'auto';
  });

  poignee.addEventListener('pointerup', (evenement) => poignee.releasePointerCapture(evenement.pointerId));
  poignee.addEventListener('pointercancel', (evenement) => poignee.releasePointerCapture(evenement.pointerId));
}

// A appeler quand on QUITTE le portrait telephone (interface/disposition.js) :
// un plateau reduit a la main n'a plus de sens en paysage/ordinateur, ou
// c'est la hauteur de l'ECRAN qui commande deja sa taille (styles.css).
function reinitialiserHauteurPlateauPortrait(plateau) {
  plateau.style.height = '';
  plateau.style.width = '';
}
