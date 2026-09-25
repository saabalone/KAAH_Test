// Deplace la barre de navigation entre le bas du plateau (telephone, la ou
// le pouce arrive — regle CLAUDE.md) et le bas du panneau Sequence
// (ordinateur, ou elle liberait sinon une bande de hauteur au plateau
// pour rien — signale par saab). Un seul jeu de boutons et d'ecouteurs de
// clic (voir interface/saisie.js, elementsNavigation) : `appendChild` sur
// un element existant le DEPLACE (il ne le duplique pas) et garde ses
// ecouteurs de clic intacts, contrairement a une reconstruction par
// innerHTML — pas besoin de deux jeux de boutons a synchroniser.
//
// Deuxieme responsabilite, meme fichier (correctif phase 15, meme famille
// de probleme — "ou est-ce que ca s'affiche selon l'ecran") :
// demarrerExtensionColonneGauche, le deploiement temporaire des libelles
// de #colonne-gauche sur telephone (voir plus bas et styles.css).
// Un repli complet de la colonne a une simple poignee a ete essaye puis
// abandonne (saab : "pas bonne idee mon repli total, le bouton fonctionne
// mal, certainement zone trop petite... on supprime, le plateau est assez
// grand avec des petites icones") — voir JOURNAL.md.
//
// 700px : le seuil de bascule choisi une fois pour tout le projet (voir
// CLAUDE.md, "un seul seuil de bascule"), le meme que celui de
// styles.css — a garder synchronise si ce seuil change un jour.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const SEUIL_ORDINATEUR = window.matchMedia('(min-width: 700px)');

// La fonction `placer` de demarrerDispositionNavigation, retenue pour que
// interface/face-a-face.js puisse replacer la barre quand on entre ou sort du
// mode (elle ne change de parent qu'au franchissement du seuil sinon).
let placerNavigationActuel = null;

function replacerNavigation() {
  placerNavigationActuel?.();
}

// A appeler une seule fois, apres que `navigation`, `colonnePrincipale` et
// `arbrePanneau` existent tous dans le DOM.
//
// Le bouton Sequence n'est PLUS un des 6 boutons de `navigation` (correctif
// de disposition, phase 18) : saab a demande de regrouper Sequence,
// Commentaires et Occurrences au MEME endroit, la colonne d'icones — il y
// vit desormais en permanence (index.html, `#bouton-sequence`), dans les
// DEUX mises en page, sans plus jamais voyager. Seuls les 5 boutons de
// DEPLACEMENT (debut/precedent/annuler/suivant/fin) continuent de
// rejoindre le bas du panneau Sequence/Commentaires sur ordinateur, la ou
// ils occupaient sinon une bande de hauteur prise au plateau en portrait.
//
// Second voyageur, meme mecanique : `enteteJeu` (index.html,
// #entete-partie — la position copiable, phase 12bis, et le bandeau qui
// nomme la partie en cours, ensemble). Il occupe une ligne AU-DESSUS du
// plateau, ce qui ne coute rien en portrait (ou c'est la largeur qui limite
// le plateau) mais lui prend de la hauteur en paysage — ou c'est justement
// la hauteur qui commande sa taille (styles.css). Il monte donc en haut de
// `colonneDroite` sur ordinateur (saab : "on passe la barre du titre de la
// game a droite en haut, ce qui fait gagner encore un peu"), et redescend
// au-dessus du plateau en portrait.
//
// Troisieme voyageur (correctif, saab, 2026-09-25) : `messageDemarrage`
// (index.html, #message-demarrage-pendules — "Touchez une pendule..."). Il
// vivait a cote d'`enteteJeu`, AU-DESSUS du plateau : apparaitre/disparaitre
// y changeait la hauteur disponible pour `#plateau` (`height: 100%` d'un
// FLEX ITEM, styles.css), donc la taille du plateau elle-meme — signale par
// saab, "le bandeau fait baisser le plateau, en paysage on est oblige de le
// remonter [pour] mettre le nom de J1". Il suit desormais `navigation`,
// juste apres elle (portrait, paysage) ; en face-a-face, la derniere ligne de
// la colonne des fenetres, tournee a la verticale, a cote de la barre. Jamais
// plus au-dessus du plateau, qui ne bouge plus quand il apparait ou disparait.
function demarrerDispositionNavigation(navigation, colonnePrincipale, arbrePanneau, enteteJeu, colonneDroite, messageDemarrage) {
  function placer() {
    if (SEUIL_ORDINATEUR.matches) {
      // Face-a-face (phase 20, saab) : la barre quitte la colonne des fenetres
      // pour se poser au milieu du plateau, contre lui — Annuler pile a son
      // centre, les deux joueurs a egale distance. Voir styles.css.
      // Le rappel, lui, y rejoint la colonne des fenetres, tournee a la
      // verticale : dans l'etroite bande de la barre, une phrase entiere ne
      // tiendrait pas (styles.css, body.face-a-face #colonne-droite).
      if (document.body.classList.contains('face-a-face')) {
        document.body.appendChild(navigation);
        colonneDroite.append(messageDemarrage);
      } else {
        arbrePanneau.appendChild(navigation);
        navigation.after(messageDemarrage);
      }
      colonneDroite.prepend(enteteJeu);
      // L'attribut `hidden` de la partie HTML vaut pour le repli PAR
      // DEFAUT sur telephone (laisser toute la place au plateau) — sur
      // ordinateur, la sequence a toujours ete visible d'entree (voir
      // styles.css) ; le nouveau bouton pour la masquer, lui, ne doit
      // jamais partir deja replie.
      arbrePanneau.hidden = false;
      // Un plateau reduit a la main en portrait (phase 18,
      // activerRedimensionnementPlateauPortrait) n'a plus de sens des
      // qu'on quitte le portrait telephone : la hauteur de l'ECRAN
      // commande deja sa taille en paysage/ordinateur (styles.css) — sans
      // ce nettoyage, la valeur choisie a la main "fuirait" d'une mise en
      // page a l'autre, comme deja rencontre avec --largeur-sequence.
      const plateau = document.getElementById('plateau');
      if (plateau) reinitialiserHauteurPlateauPortrait(plateau);
      // Meme nettoyage pour `arbrePanneau` (Sequence/Commentaires), qui
      // peut avoir ete reduit A LA MAIN en portrait par la poignee
      // d'Occurrences (interface/occurrences.js,
      // activerRedimensionnementOccurrencesPortrait) : une hauteur choisie
      // pour LA-BAS n'a plus de sens ici, ou c'est sa PROPRE poignee
      // ordinateur (interface/sequence.js) qui commande.
      reinitialiserHauteurOccurrencesPortrait(arbrePanneau);
    } else {
      colonnePrincipale.prepend(enteteJeu); // au-dessus du plateau, sa place d'origine
      colonnePrincipale.appendChild(navigation);
      navigation.after(messageDemarrage);
      // Symetrique du nettoyage ci-dessus : une hauteur choisie a la main
      // sur ORDINATEUR (interface/sequence.js, activerRedimensionnementHauteur)
      // n'a pas plus de sens en portrait, ou c'est le flex-grow
      // d'Occurrences (styles.css) qui doit commander tout seul, sans
      // hauteur imposee venue de l'autre mise en page.
      reinitialiserHauteurOccurrencesPortrait(arbrePanneau);
    }
  }

  placerNavigationActuel = placer;
  placer();
  // Redimensionner la fenetre au travers du seuil (pas seulement au
  // premier chargement) doit aussi deplacer la barre — sinon elle reste
  // coincee dans le mauvais parent jusqu'au prochain rechargement.
  SEUIL_ORDINATEUR.addEventListener('change', placer);
}

// Sur telephone, #colonne-gauche n'est qu'une etroite bande d'icones (voir
// styles.css) : ce bouton la deploie temporairement par-dessus le plateau
// pour montrer le nom de chaque bouton, sans jamais agrandir la colonne au
// repos (elle reprendrait sinon la place du plateau en permanence). Sans
// effet sur ordinateur, ou les libelles sont deja toujours visibles (le
// bouton lui-meme y reste cache, voir styles.css).
function demarrerExtensionColonneGauche(bouton, colonne) {
  bouton.addEventListener('click', () => {
    colonne.classList.toggle('colonne-gauche-etendue');
  });

  // Un clic sur un des vrais boutons (jouer une action) doit refermer le
  // deploiement : rien ne le referme sinon tant qu'on n'a pas retouche a
  // ce bouton-la, ce qui laisserait le plateau masque sans raison.
  colonne.addEventListener('click', (evenement) => {
    if (evenement.target !== bouton && evenement.target.closest('button') !== bouton) {
      colonne.classList.remove('colonne-gauche-etendue');
    }
  });
}
