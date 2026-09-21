// Panneau "Commentaires" (Phase 18) : un commentaire libre par coup
// (moteur.marquerCommentaire, champ `comment` de KAAWA), pour TOUS LES
// COUPS DE TOUTES LES BRANCHES explorees — jamais seulement la sequence en
// cours. Une premiere version se limitait au chemin regarde ; saab a
// corrige : "tu as pris l'initiative de changer la structure de KAAWA...
// comment savoir les commentaires de chaque branche si on ne les essaie
// pas toutes ??? Avec KAAWA on voit tout identique a la sequence donc on
// peut scroller et vite voir." Ce fichier montre donc desormais TOUT
// l'arbre, exactement comme interface/sequence.js — voir
// rendu/commentaires-html.js pour le detail du rendu (une ligne par
// noeud, pas la grille figee de la Sequence).
//
// UN SEUL PANNEAU PHYSIQUE, PARTAGE AVEC LA SEQUENCE (voir
// interface/saisie.js, qui bascule entre les deux modes) : saab a
// approuve cette fusion plutot que deux panneaux empiles ("tu fusionnes
// en un seul panneau comme KAAWA") — les deux montrant le meme arbre,
// les empiler aurait double l'espace pris pour rien. Ce module ne gere
// donc NI le bouton NI l'attribut `hidden` du panneau : seulement son
// CONTENU (voir interface/saisie.js pour la bascule de mode).
//
// Recherche, "tout replier/deplier" et "Copier" (kaa_tab_manager_ClO_Co.py,
// setup_comment_tab) : la recherche filtre sur le texte du commentaire ET
// sur un tag "Occ pN oM"/"Ref pN oM" calcule a la volee (voir
// calculerEtiquettesOccurrences plus bas) — repris de KAAWA, dont l'aide
// de la barre de recherche donne d'ailleurs "occ" en exemple. ECART
// ASSUME vis-a-vis de KAAWA : la-bas, ce tag est ECRIT EN DUR dans le
// commentaire persiste (`node["comment"]`), donc sauvegarde dans le
// fichier et visible meme sans passer par cet onglet. KAAH le calcule
// seulement A L'AFFICHAGE, jamais ecrit dans `noeud.commentaire` : un
// vrai commentaire tape par saab ne doit jamais se faire discretement
// prefixer d'un texte genere, ni ce texte genere se retrouver sauvegarde
// comme si c'etait un commentaire ecrit a la main.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : numeroDeTour
// (moteur/arbre.js), SEUIL_NULLE_PAR_DEFAUT (moteur/nulle.js),
// positionCanonique (moteur/permutations.js), noeudsDeLArbre
// (moteur/occurrences.js), dessinerCommentaires (rendu/commentaires-html.js)
// et garderNoeudActifVisible (interface/sequence.js) viennent tous des
// fichiers charges avant celui-ci dans index.html.

// `elements` : { conteneur, barreRecherche, boutonReplierTout,
// boutonCopier }. `rappels` : { surClicNoeud(chemin),
// surCommentaireModifie(chemin, texte) } — fournis par interface/saisie.js
// (voir la meme convention que interface/sequence.js).
function demarrerAffichageCommentaires(elements, rappels) {
  const cheminsReplies = new Set();
  const cheminsDeplies = new Set();
  let filtreTexte = '';
  let touteReplie = false;
  let dernierArbre = null;

  elements.barreRecherche.addEventListener('input', () => {
    filtreTexte = elements.barreRecherche.value.trim().toLowerCase();
    if (dernierArbre) rafraichir(dernierArbre);
  });

  elements.boutonReplierTout.addEventListener('click', () => {
    touteReplie = !touteReplie;
    elements.boutonReplierTout.textContent = touteReplie ? '▶ Tout deplier' : '▼ Tout replier';
    cheminsReplies.clear();
    if (touteReplie && dernierArbre) {
      // Replie chaque noeud qui a des enfants, sauf ceux sur le chemin
      // REGARDE (sinon le coup courant disparaitrait de la vue).
      marquerReplisSaufChemin(dernierArbre.racine, [], dernierArbre.chemin, cheminsReplies);
    }
    if (dernierArbre) rafraichir(dernierArbre);
  });

  elements.boutonCopier.addEventListener('click', () => copierEnBloc());

  // A appeler a chaque coup ou navigation, meme si ce mode n'est pas
  // affiche en ce moment (voir interface/saisie.js) : la prochaine fois
  // qu'on bascule dessus, le contenu doit deja etre a jour.
  function actualiser(arbre) {
    dernierArbre = arbre;
    rafraichir(arbre);
  }

  function rafraichir(arbre) {
    const etat = {
      cheminsReplies,
      cheminsDeplies,
      filtreTexte,
      etiquettesOccurrences: calculerEtiquettesOccurrences(arbre),
    };
    dessinerCommentaires(elements.conteneur, arbre, etat, {
      surClicNoeud: rappels.surClicNoeud,
      surClicRepli: (cle) => {
        if (cheminsReplies.has(cle)) cheminsReplies.delete(cle);
        else cheminsReplies.add(cle);
        rafraichir(arbre);
      },
      surClicDeplier: (cle) => {
        if (cheminsDeplies.has(cle)) cheminsDeplies.delete(cle);
        else cheminsDeplies.add(cle);
        rafraichir(arbre);
      },
      surCommentaireModifie: rappels.surCommentaireModifie,
    });

    // Voir interface/sequence.js, garderNoeudActifVisible : meme correctif,
    // partage — le coup regarde doit rester visible qu'on vienne de
    // naviguer, de chercher un texte ou de (re)plier une branche.
    garderNoeudActifVisible(elements.conteneur);
  }

  // "Copier" (kaa_tab_manager_ClO_Co.py, _copy_comments_to_clipboard) :
  // TOUT l'arbre, indente par profondeur, "N. coup | commentaire" (le
  // commentaire omis s'il est vide).
  function copierEnBloc() {
    if (!dernierArbre) return;
    const lignes = [];
    marcherPourCopie(dernierArbre.racine, [], 0, lignes);
    navigator.clipboard?.writeText(lignes.join('\n')).then(() => confirmerCopie(), () => {});
  }

  function marcherPourCopie(noeud, chemin, profondeur, lignes) {
    const indentation = '  '.repeat(profondeur);
    const prefixe = chemin.length === 0 ? 'Départ' : `${numeroDeTour(chemin.length)}. ${noeud.coup}`;
    lignes.push(noeud.commentaire ? `${indentation}${prefixe} | ${noeud.commentaire}` : `${indentation}${prefixe}`);
    noeud.enfants.forEach((enfant, index) => marcherPourCopie(enfant, [...chemin, index], profondeur + 1, lignes));
  }

  function confirmerCopie() {
    const texteDepart = elements.boutonCopier.textContent;
    elements.boutonCopier.textContent = 'Copié !';
    setTimeout(() => {
      elements.boutonCopier.textContent = texteDepart;
    }, 1200);
  }

  return { actualiser };
}

// Replie tous les noeuds-avec-enfants SAUF LES ANCETRES du coup regarde :
// "Tout replier" ne doit jamais faire disparaitre le coup qu'on est en
// train de regarder lui-meme.
function marquerReplisSaufChemin(noeud, chemin, cheminActuel, cheminsReplies) {
  const estAncetreDuChemin = chemin.length < cheminActuel.length && chemin.every((v, i) => v === cheminActuel[i]);
  if (noeud.enfants.length > 0 && !estAncetreDuChemin) {
    cheminsReplies.add(chemin.join('.'));
  }
  noeud.enfants.forEach((enfant, index) => marquerReplisSaufChemin(enfant, [...chemin, index], cheminActuel, cheminsReplies));
}

// Les tags "Occ pN oM" / "Ref pN oM" (voir l'en-tete du fichier) pour
// TOUS les noeuds de l'arbre a la fois, calcules en une seule passe.
// Repris de KAAWA (kaa_tab_manager_ClO_Co.py, _compute_occ_tags) : un
// identifiant de groupe (p0, p1...) par position (Occ) ou posRef (Ref)
// partagee par plus d'un noeud, attribue dans l'ordre de PREMIERE
// RENCONTRE du parcours ; le tag Ref n'apparait que si son groupe est
// PLUS GRAND que le groupe Occ a la meme position (sinon Ref ne dirait
// rien de plus qu'Occ).
//
// Chaque tag renvoye est { texte, seuilAtteint } — jamais juste une chaine
// (corrige deux fois, saab : d'abord "les Occ >= 3 ne passent pas en bleu",
// puis "il faut regarder si o>=3 ... les o<3 restent en jaune") :
// `seuilAtteint` compare le RANG AFFICHE ("o1", "o2"...) a
// SEUIL_NULLE_PAR_DEFAUT — PAS la taille totale du groupe. La 1re et la 2e
// fois qu'une position revient ne sont pas encore une alerte, meme si le
// groupe grandit encore plus tard ailleurs dans l'arbre ; seul "o3" (et
// au-dela) doit virer au bleu, exactement comme KAAWA colore son propre
// compteur EN JOUANT ("[color=0080FF]" des que le compte ATTEINT
// occ_limit, jamais retroactivement sur les occurrences precedentes) et
// comme .compteur-occurrences-seuil ailleurs dans KAAH. Occ et Ref
// gardent chacun leur propre `seuilAtteint` : l'un peut avoir atteint son
// seuil sans que l'autre ait atteint le sien.
function calculerEtiquettesOccurrences(arbre) {
  const noeuds = noeudsDeLArbre(arbre);
  const groupesExacts = new Map(); // position -> chemins[]
  const refDeChaquePosition = new Map(); // position -> posRef (evite de la recalculer)
  const groupesRef = new Map(); // posRef -> chemins[]

  for (const { chemin, position } of noeuds) {
    if (!groupesExacts.has(position)) groupesExacts.set(position, []);
    groupesExacts.get(position).push(chemin);

    let ref = refDeChaquePosition.get(position);
    if (ref === undefined) {
      ref = positionCanonique(position).positionReference;
      refDeChaquePosition.set(position, ref);
    }
    if (!groupesRef.has(ref)) groupesRef.set(ref, []);
    groupesRef.get(ref).push(chemin);
  }

  const idExactParPosition = new Map();
  for (const position of groupesExacts.keys()) {
    if (groupesExacts.get(position).length > 1) idExactParPosition.set(position, idExactParPosition.size);
  }
  const idRefParRef = new Map();
  for (const ref of groupesRef.keys()) {
    if (groupesRef.get(ref).length > 1) idRefParRef.set(ref, idRefParRef.size);
  }

  const etiquettes = new Map();
  for (const { chemin, position } of noeuds) {
    const cle = chemin.join('.');
    const chemsExacts = groupesExacts.get(position);
    const ref = refDeChaquePosition.get(position);
    const chemsRef = groupesRef.get(ref);
    const tags = [];

    if (chemsExacts.length > 1) {
      const rang = chemsExacts.findIndex((c) => c.join('.') === cle) + 1;
      tags.push({
        texte: `Occ p${idExactParPosition.get(position)} o${rang}`,
        // Le RANG affiche ("o1", "o2"...) compare au seuil, pas la
        // taille totale du groupe : corrige (saab, "il faut regarder si
        // o>=3 ... les o<3 restent en jaune") — la 1re et la 2e fois
        // qu'une position revient ne sont pas encore une alerte, meme si
        // elle revient une 3e fois plus tard ailleurs dans l'arbre ; seul
        // "o3" (et au-dela) doit virer au bleu.
        seuilAtteint: rang >= SEUIL_NULLE_PAR_DEFAUT,
      });
    }
    if (chemsRef.length > chemsExacts.length) {
      const rang = chemsRef.findIndex((c) => c.join('.') === cle) + 1;
      tags.push({
        texte: `Ref p${idRefParRef.get(ref)} o${rang}`,
        seuilAtteint: rang >= SEUIL_NULLE_PAR_DEFAUT, // meme principe que Occ juste au-dessus
      });
    }
    if (tags.length > 0) etiquettes.set(cle, tags);
  }
  return etiquettes;
}
