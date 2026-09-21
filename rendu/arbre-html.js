// Dessine l'arbre des coups dans la barre laterale « Sequence » (Phase 11,
// affinee pour ressembler d'avantage a KAAWA — kaa_tab_manager_ClO_Co.py,
// setup_sequence_tab / _render_tree_recursive). Pure fonction de rendu :
// ne decide jamais elle-meme de naviguer, de replier une branche ou de
// supprimer un noeud, se contente d'appeler les fonctions qu'on lui donne
// quand l'utilisateur clique. Les morceaux d'une ligne (etiquette, boutons,
// suffixes) sont construits par rendu/arbre-ligne.js ; ce fichier-ci ne
// fait que parcourir l'arbre et les assembler dans le bon ordre.
//
// Mise en page calquee sur KAAWA, avec un alignement strict en colonnes
// (signale par saab) : `.arbre-lignes` est une grille CSS a 10 colonnes
// fixes (repli, numero, coup, suffixes, suppression — deux fois, pour Noir
// puis Blanc). CHAQUE ligne fournit exactement ces 10 elements, meme
// quand un cote n'a rien a montrer (voir ajouterSegment) : c'est ce qui
// garantit que les colonnes restent alignees d'une ligne a l'autre —
// plutot que de les omettre, ce qui decalait tout (corrige dans cette
// meme phase).
//   - PAS d'indentation qui grandit avec la profondeur (un premier essai
//     imbriquait un niveau par tour, ce qui finissait par sortir de
//     l'ecran) : toutes les lignes commencent au meme bord gauche, la
//     profondeur ne se lit que dans le numero de tour ; une branche se
//     distingue par sa couleur et une icone (●/○) ;
//   - chaque camp a son PROPRE repli : celui de Noir masque toutes ses
//     reponses blanches (et tout ce qui suit), celui d'une reponse
//     blanche ne masque que SA propre suite ;
//   - le numero de tour ne s'affiche qu'une fois par ligne : sur Noir
//     quand il est present, sur Blanc SEULEMENT quand la ligne commence
//     directement par une reponse blanche (une deuxieme branche au meme
//     tour, Noir n'y est pas repete) ;
//   - le prefixe "-" devant un coup blanc, le suffixe d'ejection/fin de
//     partie et la date de creation d'une feuille (voir `datesParChemin`)
//     partagent tous la meme colonne "suffixes", geree par
//     rendu/arbre-ligne.js.
//
// Contrairement au plateau (rendu/plateau-svg.js, qui ne doit JAMAIS se
// redessiner par innerHTML — voir CLAUDE.md), reconstruire cette petite
// grille en entier a chaque appel ne pose aucun probleme : rien n'y est
// anime, et aucune identite DOM n'a besoin de survivre d'un rendu a
// l'autre.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerEtiquette,
// creerEtiquetteVide, creerBoutonSupprimer, creerBoutonRepli, creerNumero,
// creerSuffixes, creerSuffixesVide et texteDuCoup viennent de
// rendu/arbre-ligne.js, charge avant celui-ci dans index.html.

// `arbre` : voir moteur/arbre.js. `cheminsReplies` : un Set de chemins
// (chaque chemin encode en texte, ex. "0.1") dont la branche ne doit pas
// s'afficher. `datesParChemin` : Map chemin-texte -> date deja formatee,
// pour les feuilles dont on connait l'instant de creation (voir
// interface/saisie.js). `rappels` : { surClicNoeud(chemin),
// surClicRepli(cle), surClicSupprimer(chemin) }.
function dessinerArbre(conteneur, arbre, cheminsReplies, datesParChemin, rappels) {
  const grille = document.createElement('div');
  grille.className = 'arbre-lignes';
  dessinerTour(grille, arbre.racine.enfants, arbre.racine.etat, [], 1, arbre, cheminsReplies, datesParChemin, rappels);
  conteneur.replaceChildren(grille);
}

// La date d'un noeud, seulement s'il s'agit d'une feuille (aucun enfant) :
// jamais sur un coup qui a une suite, pour ne pas laisser croire qu'une
// branche entiere partage une seule date.
function dateDuNoeud(noeud, chemin, datesParChemin) {
  return noeud.enfants.length === 0 ? datesParChemin.get(chemin.join('.')) ?? '' : '';
}

// Ajoute les 5 elements d'UN camp (repli, numero, coup, suffixes,
// suppression) a la grille. `info` est `null` quand ce camp n'a rien a
// montrer sur cette ligne (le cote Blanc d'une ligne qui n'a encore aucune
// reponse, ou le cote Noir d'une deuxieme reponse blanche au meme tour) :
// on reserve alors la meme largeur avec des elements vides/invisibles,
// jamais en les omettant (voir l'en-tete du fichier).
function ajouterSegment(conteneur, info, arbre, rappels, datesParChemin) {
  if (!info) {
    conteneur.appendChild(creerBoutonRepli(null, false, false, rappels));
    conteneur.appendChild(creerNumero(''));
    conteneur.appendChild(creerEtiquetteVide());
    conteneur.appendChild(creerSuffixesVide());
    conteneur.appendChild(creerBoutonSupprimer(null, arbre, rappels));
    return;
  }

  const { cheminRepli, aDesEnfantsPourRepli, replie, numeroTexte, noeud, chemin, texte, etatParent } = info;
  conteneur.appendChild(creerBoutonRepli(cheminRepli, aDesEnfantsPourRepli, replie, rappels));
  conteneur.appendChild(creerNumero(numeroTexte));
  conteneur.appendChild(creerEtiquette(noeud, chemin, texte, arbre, rappels));
  conteneur.appendChild(creerSuffixes(noeud, etatParent, dateDuNoeud(noeud, chemin, datesParChemin)));
  conteneur.appendChild(creerBoutonSupprimer(chemin, arbre, rappels));
}

// Dessine un tour complet : chaque enfant NOIR de `enfantsNoirs` (tous au
// meme niveau — plusieurs s'il y a une branche a ce point), avec, pour
// chacun, sa ou ses reponses BLANCHES sur la meme ligne (ou une ligne
// chacune s'il y en a plusieurs). Recurse ensuite au tour suivant.
// `etatParentDesNoirs` sert a detecter une ejection sur le coup noir
// lui-meme (voir rendu/arbre-ligne.js, suffixeEjection).
function dessinerTour(conteneur, enfantsNoirs, etatParentDesNoirs, cheminParent, numeroTour, arbre, cheminsReplies, datesParChemin, rappels) {
  enfantsNoirs.forEach((noeudNoir, indexNoir) => {
    const cheminNoir = [...cheminParent, indexNoir];
    const cleNoir = cheminNoir.join('.');
    const texteNoir = texteDuCoup(noeudNoir, true, enfantsNoirs.length > 1);
    const enfantsBlancs = noeudNoir.enfants;

    if (enfantsBlancs.length === 0) {
      // Feuille : ni repli (rien a masquer) ni reponse blanche.
      ajouterSegment(
        conteneur,
        {
          cheminRepli: cleNoir,
          aDesEnfantsPourRepli: false,
          replie: false,
          numeroTexte: numeroTour,
          noeud: noeudNoir,
          chemin: cheminNoir,
          texte: texteNoir,
          etatParent: etatParentDesNoirs,
        },
        arbre,
        rappels,
        datesParChemin
      );
      ajouterSegment(conteneur, null, arbre, rappels, datesParChemin);
      return;
    }

    // Le repli de Noir masque TOUTES ses reponses blanches (et tout ce
    // qui suit) : independant du repli de chaque reponse blanche, qui ne
    // masque que sa propre suite (voir plus bas).
    const replieNoir = cheminsReplies.has(cleNoir);
    const segmentNoir = {
      cheminRepli: cleNoir,
      aDesEnfantsPourRepli: true,
      replie: replieNoir,
      numeroTexte: numeroTour,
      noeud: noeudNoir,
      chemin: cheminNoir,
      texte: texteNoir,
      etatParent: etatParentDesNoirs,
    };

    if (replieNoir) {
      ajouterSegment(conteneur, segmentNoir, arbre, rappels, datesParChemin);
      ajouterSegment(conteneur, null, arbre, rappels, datesParChemin);
      return;
    }

    enfantsBlancs.forEach((noeudBlanc, indexBlanc) => {
      const cheminBlanc = [...cheminNoir, indexBlanc];
      const texteBlanc = texteDuCoup(noeudBlanc, false, enfantsBlancs.length > 1);
      const replieeBlanc = cheminsReplies.has(cheminBlanc.join('.'));

      ajouterSegment(conteneur, indexBlanc === 0 ? segmentNoir : null, arbre, rappels, datesParChemin);
      ajouterSegment(
        conteneur,
        {
          cheminRepli: cheminBlanc.join('.'),
          aDesEnfantsPourRepli: noeudBlanc.enfants.length > 0,
          replie: replieeBlanc,
          // Le numero n'est repete sur Blanc QUE quand Noir n'est pas
          // affiche sur cette ligne (une deuxieme branche au meme tour) —
          // sinon Noir l'a deja montre juste a cote (voir l'en-tete du
          // fichier).
          numeroTexte: indexBlanc === 0 ? '' : numeroTour,
          noeud: noeudBlanc,
          chemin: cheminBlanc,
          texte: texteBlanc,
          etatParent: noeudNoir.etat,
        },
        arbre,
        rappels,
        datesParChemin
      );

      if (!replieeBlanc && noeudBlanc.enfants.length > 0) {
        dessinerTour(conteneur, noeudBlanc.enfants, noeudBlanc.etat, cheminBlanc, numeroTour + 1, arbre, cheminsReplies, datesParChemin, rappels);
      }
    });
  });
}
