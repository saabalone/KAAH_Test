// Panneau "Occurrences" (Phase 18, suite) : quatre compteurs — Occ et Ref
// (moteur/nulle.js, la sequence EN COURS seulement) puis Br_Occ et Br_Ref
// (moteur/occurrences.js, TOUT L'ARBRE explore, toutes branches
// confondues) — plus la liste cliquable des AUTRES noeuds qui partagent
// la position ou la posRef du noeud regarde, pour y sauter directement.
// Calque sur l'onglet "Occurrences" de KAAWA (kaa_tab_manager_ClO_Co.py,
// setup_occurrences_tab), avec son propre bouton dans la colonne
// d'icones, comme Conseils/Puzzles/Commentaires.
//
// Les MEMES 4 chiffres sont aussi affiches EN PERMANENCE sur le plateau
// (rendu/compteur-occurrences.js, dessinerCompteurOccurrences/
// actualiserCompteurOccurrences), a la verticale tout a gauche, comme
// KAAWA (kaa_board_widget_ClO_Co.py, _add_occurrence_label) — etendu aux
// 4 compteurs (KAAWA n'y affiche qu'Occ/Ref, Br_Occ/Br_Ref etant un ajout
// KAAH deja dans ce panneau). Cet affichage-la ne depend PAS de
// l'ouverture du panneau : `actualiser` le met a jour a chaque coup ou
// navigation, panneau ouvert ou non, `svg` est donc necessaire des ce
// premier parametre.
//
// UN PANNEAU DOCKE, jamais une popup — meme raison que Conseils
// (interface/next-move.js).
//
// Couleur des lignes de la liste, calquee sur KAAWA (meme fichier,
// setup_occurrences_tab) : PAS le meme code a 4 couleurs que la
// Sequence/Commentaires (courant/origine/chemin/branche) — KAAWA
// lui-meme n'y distingue que la SECTION (Occ en blanc, Ref en jaune
// attenue), jamais la branche individuelle de chaque ligne.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : compterOccurrences,
// compterOccurrencesRef, SEUIL_NULLE_PAR_DEFAUT (moteur/nulle.js),
// etatOccurrencesArbre (moteur/occurrences.js), numeroDeTour, noeudA
// (moteur/arbre.js), positionsDepuisLaRacine (interface/nulle.js, petit
// utilitaire partage — voir ce fichier), actualiserCompteurOccurrences
// (rendu/compteur-occurrences.js) et ajusterCadreOccurrences
// (rendu/corde.js) viennent tous des fichiers charges avant
// celui-ci dans index.html.

// `elements` : { bouton, panneau, entete, liste }. `rappels` :
// { surClicNoeud(chemin), surOccurrences(occ) } — le second, facultatif, est
// appele a chaque mise a jour avec le compte Occ de la position regardee (le
// son d'Occ, phase 21, interface/saisie.js).
function demarrerAffichageOccurrences(svg, elements, rappels) {
  let dernierArbre = null;

  // `.bouton-actif` (signale par saab : meme orange que Conseils/Menaces
  // quand le panneau est ouvert) : reservee au bouton lui-meme, le
  // compteur sur le plateau (dessine plus bas) reste visible panneau
  // ouvert ou pas, il n'a donc pas besoin de ce signal.
  elements.bouton.addEventListener('click', () => {
    elements.panneau.hidden = !elements.panneau.hidden;
    elements.bouton.classList.toggle('bouton-actif', !elements.panneau.hidden);
    if (!elements.panneau.hidden && dernierArbre) rafraichirPanneau(dernierArbre);
  });

  // A appeler a CHAQUE coup ou navigation, meme si le panneau est ferme :
  // le compteur sur le plateau, lui, reste toujours visible (voir l'en-tete
  // du fichier). Le contenu du panneau (liste incluse) ne se reconstruit,
  // lui, que si le panneau est reellement ouvert — inutile de le faire
  // deux fois, une fois maintenant et une autre a la reouverture.
  function actualiser(arbre) {
    dernierArbre = arbre;
    const compteurs = calculerCompteurs(arbre);
    actualiserCompteurOccurrences(svg, compteurs, SEUIL_NULLE_PAR_DEFAUT);
    // Purement decoratif, appele a CHAQUE coup : un `try` pour ne jamais
    // casser la partie a cause de son cadre (voir index.html, meme raison
    // pour rendu/corde.js).
    try {
      ajusterCadreOccurrences(svg); // sa longueur a pu changer (rendu/corde.js)
    } catch (erreur) {
      console.error("Le cadre d'Occ n'a pas pu s'ajuster (jeu inchange) :", erreur);
    }
    rappels.surOccurrences?.(compteurs.occ);
    if (!elements.panneau.hidden) rafraichirPanneau(arbre);
  }

  // Les 4 compteurs pour `arbre` a sa position REGARDEE : partages entre
  // le panneau et le plateau, jamais calcules deux fois separement.
  function calculerCompteurs(arbre) {
    const positions = positionsDepuisLaRacine(arbre, arbre.chemin);
    const positionCourante = positions[positions.length - 1];
    const branches = etatOccurrencesArbre(arbre, positionCourante);
    return {
      occ: compterOccurrences(positions, positionCourante),
      ref: compterOccurrencesRef(positions, positionCourante),
      brOcc: branches.brOccurrences,
      brRef: branches.brOccurrencesRef,
      branches,
    };
  }

  // Le texte d'un coup, pour une ligne cliquable : "Depart" pour la
  // racine, sinon son numero de tour et son texte Nacre — meme convention
  // que interface/commentaires.js.
  function etiquetteDuNoeud(arbre, chemin) {
    if (chemin.length === 0) return 'Départ';
    return `${numeroDeTour(chemin.length)}. ${noeudA(arbre, chemin).coup}`;
  }

  function rafraichirPanneau(arbre) {
    const compteurs = calculerCompteurs(arbre);

    elements.entete.innerHTML = '';
    elements.entete.appendChild(creerCompteur('Occ.', compteurs.occ));
    elements.entete.appendChild(creerCompteur('Ref.', compteurs.ref));
    elements.entete.appendChild(creerCompteur('Br_Occ.', compteurs.brOcc));
    elements.entete.appendChild(creerCompteur('Br_Ref.', compteurs.brRef));

    elements.liste.innerHTML = '';
    const cleActuelle = arbre.chemin.join('.');
    const autresExacts = compteurs.branches.noeudsExacts.filter((n) => n.chemin.join('.') !== cleActuelle);

    if (autresExacts.length === 0 && compteurs.branches.noeudsRefSeuls.length === 0) {
      const vide = document.createElement('p');
      vide.textContent = 'Aucune autre occurrence trouvée.';
      elements.liste.appendChild(vide);
      return;
    }

    autresExacts.forEach((n, index) => {
      const rang = index + 1;
      elements.liste.appendChild(
        creerLigne(`Occ o${rang} | ${etiquetteDuNoeud(arbre, n.chemin)}`, n.chemin, 'occ', rang)
      );
    });

    if (compteurs.branches.noeudsRefSeuls.length > 0) {
      const separateur = document.createElement('p');
      separateur.className = 'separateur-occurrences';
      separateur.textContent = '--- Ref (même posRef) ---';
      elements.liste.appendChild(separateur);
      compteurs.branches.noeudsRefSeuls.forEach((n, index) => {
        const rang = index + 1;
        elements.liste.appendChild(
          creerLigne(`Ref o${rang} | ${etiquetteDuNoeud(arbre, n.chemin)}`, n.chemin, 'ref', rang)
        );
      });
    }
  }

  // Un compteur "Occ. 3" : en couleur d'alerte des que le seuil de nulle
  // est atteint (SEUIL_NULLE_PAR_DEFAUT, moteur/nulle.js — un seul chiffre
  // reglable, jamais deux a tenir synchronises), sinon neutre.
  function creerCompteur(etiquette, valeur) {
    const span = document.createElement('span');
    span.className =
      valeur >= SEUIL_NULLE_PAR_DEFAUT ? 'compteur-occurrences compteur-occurrences-seuil' : 'compteur-occurrences';
    span.textContent = `${etiquette} ${valeur}`;
    return span;
  }

  // `section` : 'occ' ou 'ref' — voir l'en-tete du fichier pour la couleur
  // de base que ca donne (styles.css, .ligne-occurrence-occ/-ref), gardee
  // TELLE QUELLE tant que `rang` (le numero "oN" affiche) reste sous le
  // seuil de nulle (saab : "dans Occurrences on passe seulement o>=3 en
  // bleu, on garde les couleurs existantes si o<3") — au-dela, une
  // troisieme classe (.ligne-occurrence-seuil) bascule en bleu par-dessus,
  // meme regle que le tag de Commentaires (interface/commentaires.js).
  function creerLigne(texte, chemin, section, rang) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = `ligne-occurrence ligne-occurrence-${section}`;
    if (rang >= SEUIL_NULLE_PAR_DEFAUT) bouton.classList.add('ligne-occurrence-seuil');
    bouton.textContent = texte;
    bouton.addEventListener('click', () => rappels.surClicNoeud(chemin));
    return bouton;
  }

  return { actualiser };
}

// EXCEPTION ASSUMEE, meme famille que activerRedimensionnementPlateauPortrait
// (interface/sequence.js, phase 18) : le plafond fixe qu'avait
// #panneau-occurrences (styles.css, `max-height: 30vh`) ne montrait presque
// aucune ligne des qu'on avait AUSSI la Sequence/Commentaires ou Conseils
// ouverts a cote, en portrait — "on ne voit pas les lignes de Occurrences".
//
// CORRIGE UNE SECONDE FOIS (saab, apres verification) : la premiere version
// posait `style.maxHeight` sur #panneau-occurrences lui-meme, ce qui
// laissait un VIDE entre lui et Sequence/Commentaires des que ce dernier
// etait court ("le Occurrence doit coller a Sequence/Commentaire ... sinon
// il y a un vide entre les 2") — #panneau-occurrences a maintenant
// flex-grow (styles.css) pour occuper tout ce que les panneaux au-dessus
// laissent, sans jamais de trou. Cette poignee ne pose donc plus RIEN sur
// #panneau-occurrences (aucun plafond, saab : "ne pas mettre de limite si
// on veut augmenter Occurrence avec la poignee") : agrandir Occurrences
// au-dela de cet espace libre ne peut venir que d'ailleurs, donc elle
// REDUIT DIRECTEMENT `arbrePanneau` (Sequence/Commentaires) a la place —
// "ca doit pouvoir reduire Seq/Com, c'est tjs le meme principe : l'action
// sur une fenetre est priorisee sur les autres fenetres". La place ainsi
// liberee revient alors a Occurrences tout seul, par son propre
// flex-grow — cette poignee n'a besoin de connaitre que `arbrePanneau`.
function activerRedimensionnementOccurrencesPortrait(arbrePanneau, poignee) {
  let hauteurDepart = 0;
  let yDepart = 0;

  poignee.addEventListener('pointerdown', (evenement) => {
    hauteurDepart = arbrePanneau.getBoundingClientRect().height;
    yDepart = evenement.clientY;
    poignee.setPointerCapture(evenement.pointerId);
  });

  poignee.addEventListener('pointermove', (evenement) => {
    if (!poignee.hasPointerCapture(evenement.pointerId)) return;
    // Glisser vers le HAUT (agrandir Occurrences) doit REDUIRE
    // Sequence/Commentaires : signe oppose a un glisser-pour-agrandir
    // habituel, d'ou `yDepart - evenement.clientY` retranche plutot
    // qu'ajoute.
    const hauteurDemandee = hauteurDepart - (yDepart - evenement.clientY);
    // Pas de plafond haut (voir l'en-tete de la fonction) : le
    // flex-shrink de `arbrePanneau` (styles.css) l'empechera de toute
    // facon de descendre sous ce que la colonne peut vraiment lui
    // laisser. En bas, au moins son en-tete reste visible.
    arbrePanneau.style.height = `${Math.max(40, hauteurDemandee)}px`;
  });

  // Voir activerRedimensionnementHauteur (interface/sequence.js) : relache
  // EXPLICITEMENT la capture, jamais laissee au seul navigateur.
  poignee.addEventListener('pointerup', (evenement) => poignee.releasePointerCapture(evenement.pointerId));
  poignee.addEventListener('pointercancel', (evenement) => poignee.releasePointerCapture(evenement.pointerId));
}

// A appeler quand on CHANGE de cote du seuil ordinateur/telephone
// (interface/disposition.js), dans LES DEUX SENS : cette poignee et celle,
// desktop, de interface/sequence.js (activerRedimensionnementHauteur)
// posent toutes deux `arbrePanneau.style.height` — sans ce nettoyage, une
// valeur choisie a la main d'un cote fausserait la disposition en flex de
// l'autre (meme piege deja rencontre avec --largeur-sequence et la
// hauteur du plateau).
function reinitialiserHauteurOccurrencesPortrait(arbrePanneau) {
  arbrePanneau.style.height = '';
}
