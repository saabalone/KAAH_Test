// Place le grand bouton Annuler et la barre de navigation (phase 31, saab,
// 2026-09-30 : « un large btn Annuler independant ... les nouveaux btn de
// navigation n'apparaitront qu'avec les tableaux, entre Annuler et Tableau »).
// Annuler est toujours visible : sous le plateau sur telephone (la ou le
// pouce arrive — regle CLAUDE.md), sous le panneau Sequence sur ordinateur,
// au milieu du plateau en face-a-face. La barre vit DANS le panneau Sequence/
// Commentaires, en haut, sur telephone (Annuler est au-dessus du panneau), et
// en bas en face-a-face — fermer le panneau la cache avec lui ; sur ordinateur,
// dans la colonne des tableaux, toujours visible (saab, 2026-10-06 :
// interface/navigation-colonne.js). Un seul jeu de boutons et d'ecouteurs de
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
// Le bouton Sequence n'est PLUS un des boutons de `navigation` (correctif
// de disposition, phase 18) : saab a demande de regrouper Sequence,
// Commentaires et Occurrences au MEME endroit, la colonne d'icones — il y
// vit desormais en permanence (index.html, `#bouton-sequence`), dans les
// DEUX mises en page, sans plus jamais voyager.
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
// remonter [pour] mettre le nom de J1". Il suit desormais `barreAnnuler` en
// portrait ; sur ordinateur, il passe sous le titre, en tete de la colonne
// des tableaux (jamais hors fenetre) ; en face-a-face, la derniere ligne de
// la colonne des fenetres, tournee a la verticale, a cote de la barre. Jamais
// plus au-dessus du plateau, qui ne bouge plus quand il apparait ou disparait.
// Quatrieme voyageur (saab, 2026-09-30) : `reflexionIA`, le tableau de reflexion
// de la machine — toujours en tete de la colonne des tableaux (sous le titre sur
// ordinateur, sous le plateau sur telephone), jamais au-dessus du plateau : en
// paysage etroit, il lui volait de la hauteur.
function demarrerDispositionNavigation(navigation, barreAnnuler, colonnePrincipale, arbrePanneau, enteteJeu, reflexionIA, colonneDroite, messageDemarrage) {
  // Sur ordinateur, la barre du plateau elle-meme vit dans la colonne des
  // tableaux, en bas par defaut, deplacable (interface/navigation-colonne.js ;
  // saab, 2026-10-06 : une seule barre, « ca fait doublon ») : celle de
  // Reflexion IA n'y sert plus (styles.css la cache). En face-a-face, comme
  // avant : la barre au bas de la Sequence, celle de Reflexion IA dans la
  // colonne. Sur telephone, celle de Reflexion IA sous ses tableaux.
  const navigationReflexion = reflexionIA.querySelector('.navigation-reflexion-ia');
  function placer() {
    if (SEUIL_ORDINATEUR.matches) {
      if (document.body.classList.contains('face-a-face')) {
        colonneDroite.append(navigationReflexion);
        arbrePanneau.appendChild(navigation);
      } else {
        reflexionIA.append(navigationReflexion);
      }
      // Face-a-face (phase 20, saab) : Annuler quitte la colonne des fenetres
      // pour se poser au milieu du plateau, contre lui — les deux joueurs a
      // egale distance. Voir styles.css.
      // Le rappel, lui, y rejoint la colonne des fenetres, tournee a la
      // verticale : dans l'etroite bande d'Annuler, une phrase entiere ne
      // tiendrait pas (styles.css, body.face-a-face #colonne-droite).
      // Sinon, juste sous le titre, au-dessus des tableaux (saab, 2026-10-01 :
      // « jamais hors fenetre » — sous Annuler, Reflexion IA et la Sequence le
      // poussaient sous le bas de l'ecran).
      colonneDroite.prepend(enteteJeu);
      enteteJeu.after(reflexionIA);
      if (document.body.classList.contains('face-a-face')) {
        document.body.appendChild(barreAnnuler);
        colonneDroite.append(messageDemarrage);
      } else {
        arbrePanneau.after(barreAnnuler);
        enteteJeu.after(messageDemarrage);
        // Les tableaux sont en place : la barre peut retrouver le sien.
        poserNavigationDansLaColonne(navigation, colonneDroite);
      }
      // L'attribut `hidden` de la partie HTML : la Sequence repliee PAR
      // DEFAUT, sur ordinateur aussi desormais (saab, 2026-10-02 : « par
      // defaut a l'ouverture, ne pas mettre les tableaux ») — son bouton
      // l'ouvre.
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
      colonneDroite.prepend(reflexionIA);
      reflexionIA.append(navigationReflexion);
      colonnePrincipale.appendChild(barreAnnuler);
      barreAnnuler.after(messageDemarrage);
      arbrePanneau.prepend(navigation);
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

// Des doubles des boutons de navigation du plateau, la ou ils manquent (l'essai
// des poids, saab 2026-10-01 ; sous Reflexion IA, 2026-10-02) : chacun nomme le
// sien (`data-bouton-plateau`) et le touche. Renvoie de quoi les griser (et les
// etiqueter, Lecture ▶ / ⏸) comme les leurs, a appeler apres chaque changement.
function doublerBoutonsPlateau(boutons) {
  const paires = [...boutons].map((bouton) => [bouton, document.getElementById(bouton.dataset.boutonPlateau)]);
  for (const [bouton, original] of paires) bouton.addEventListener('click', () => original.click());
  return () => {
    for (const [bouton, original] of paires) {
      bouton.disabled = original.disabled;
      bouton.textContent = original.textContent;
    }
  };
}
