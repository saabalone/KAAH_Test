// Dessine la liste des commentaires pour TOUT L'ARBRE EXPLORE (Phase 18,
// suite) — un second mode du MEME panneau que la Sequence
// (interface/sequence.js), jamais affiches en meme temps (voir
// index.html) : saab a signale que montrer les deux cote a cote
// dupliquait le meme arbre pour rien, et a demande de reprendre le
// principe de KAAWA, deux onglets d'une seule zone.
//
// PAS la meme GRILLE que rendu/arbre-html.js (10 colonnes figees,
// Noir/Blanc apparies sur la meme ligne) : KAAWA lui-meme rend son onglet
// "Commentaire" avec UNE LIGNE PAR NOEUD, jamais deux camps sur la meme
// ligne (kaa_tab_manager_ClO_Co.py, _add_comment_line). MAIS le texte du
// coup lui-meme, sur cette ligne, est RECONSTRUIT EXACTEMENT COMME
// L'ONGLET SEQUENCE (meme fonction dans KAAWA, seulement appelee une fois
// par noeud au lieu de deux) — saab l'a signale explicitement apres une
// premiere version qui inventait sa propre mise en forme : "KAAWA
// reconstruit les coups comme la Sequence mais avec qu'un coup par
// ligne". Concretement, repris tel quel de rendu/arbre-ligne.js :
//   - `texteDuCoup` pour le prefixe "-" de Blanc et l'icone de branche
//     (●/○, uniquement si ce noeud a des freres — meme calcul que
//     rendu/arbre-html.js, `noeud.enfants.length > 1` du PARENT) ;
//   - `classeCouleur` pour les 4 couleurs (courant/origine/chemin/branche) ;
//   - PAS D'INDENTATION qui grandirait avec la profondeur (saab : "pas
//     d'indentation") — exactement comme la Sequence, qui ne l'a jamais
//     eue non plus (voir rendu/arbre-html.js, "PAS d'indentation qui
//     grandit avec la profondeur").
//
// Deux colonnes SUR UNE SEULE LIGNE par coup (etiquette | commentaire),
// jamais une ligne par-dessus l'autre (signale par saab : ca doublait la
// hauteur de chaque ligne, surtout quand le commentaire est vide). Le
// commentaire reste tronque a une ligne tant qu'on ne clique pas sur son
// bouton "+" pour le deployer (colonne "chemins deplies" — meme principe
// que le repli des branches, voir interface/commentaires.js).
//
// TOUTES LES BRANCHES, jamais seulement la sequence en cours (revu apres
// que saab a signale que la premiere version, limitee au chemin regarde,
// changeait la structure de KAAWA sans le demander : "comment savoir les
// commentaires de chaque branche si on ne les essaie pas toutes ???").
//
// Pas d'import ni d'export (voir moteur/plateau.js) : numeroDeTour vient
// de moteur/arbre.js, texteDuCoup et classeCouleur de
// rendu/arbre-ligne.js — tous charges avant celui-ci dans index.html.

// `etat` : { cheminsReplies: Set (branches masquees, meme Set que la
// Sequence — repartagee, voir interface/commentaires.js), cheminsDeplies:
// Set (commentaires affiches en entier), filtreTexte: string (recherche en
// cours, insensible a la casse), etiquettesOccurrences: Map chemin-texte ->
// tableau de { texte, seuilAtteint } (un par tag Occ/Ref present sur ce
// noeud, voir interface/commentaires.js) }.
// `rappels` : { surClicNoeud(chemin), surClicRepli(cle),
// surClicDeplier(cle), surCommentaireModifie(chemin, texte) }.
function dessinerCommentaires(conteneur, arbre, etat, rappels) {
  const liste = document.createElement('div');
  liste.className = 'commentaires-lignes';
  // `false` : la racine ("Depart") n'a jamais de freres.
  marcherNoeud(liste, arbre.racine, [], false, arbre, etat, rappels);
  conteneur.replaceChildren(liste);
}

function marcherNoeud(conteneur, noeud, chemin, aDesFreres, arbre, etat, rappels) {
  const cle = chemin.join('.');
  const parties = etat.etiquettesOccurrences.get(cle) ?? []; // [{ texte, seuilAtteint }], voir interface/commentaires.js
  const commentaire = noeud.commentaire ?? '';
  const texteDesParties = parties.map((p) => p.texte).join(' ');

  // Filtre : sur le commentaire ET son tag Occ/Ref auto-calcule (comme
  // KAAWA, dont l'aide de recherche donne justement "occ" en exemple —
  // voir interface/commentaires.js). Une ligne qui ne correspond pas
  // reste simplement absente ; ses enfants, eux, restent des lignes
  // independantes (liste a plat, pas une vraie imbrication DOM) et
  // continuent de s'afficher normalement s'ils correspondent.
  const correspond =
    !etat.filtreTexte ||
    commentaire.toLowerCase().includes(etat.filtreTexte) ||
    texteDesParties.toLowerCase().includes(etat.filtreTexte);

  if (correspond) {
    conteneur.appendChild(creerLigneCommentaire(noeud, chemin, cle, aDesFreres, parties, arbre, etat, rappels));
  }

  if (etat.cheminsReplies.has(cle)) return; // branche repliee : rien de plus a afficher

  // Le marqueur de branche (●/○, voir rendu/arbre-ligne.js) d'un ENFANT
  // depend du nombre de freres qu'IL a, donc du nombre d'enfants qu'A CE
  // NOEUD-CI — jamais du sien propre.
  const enfantsOntDesFreres = noeud.enfants.length > 1;
  noeud.enfants.forEach((enfant, index) => {
    marcherNoeud(conteneur, enfant, [...chemin, index], enfantsOntDesFreres, arbre, etat, rappels);
  });
}

function creerLigneCommentaire(noeud, chemin, cle, aDesFreres, parties, arbre, etat, rappels) {
  const ligne = document.createElement('div');
  ligne.className = 'ligne-commentaire';

  if (noeud.enfants.length > 0) {
    const repli = document.createElement('button');
    repli.type = 'button';
    repli.className = 'bouton-repli-commentaire';
    repli.textContent = etat.cheminsReplies.has(cle) ? '▶' : '▼'; // les memes que la Sequence (rendu/arbre-ligne.js)
    repli.addEventListener('click', () => rappels.surClicRepli(cle));
    ligne.appendChild(repli);
  } else {
    const espace = document.createElement('span');
    espace.className = 'bouton-repli-commentaire bouton-repli-invisible';
    ligne.appendChild(espace);
  }

  // Le coup lui-meme : reconstruit EXACTEMENT comme l'onglet Sequence
  // (voir l'en-tete du fichier), jamais une mise en forme inventee ici.
  // `estNoir` se lit sur la PARITE de la profondeur (Noir joue toujours en
  // premier, CLAUDE.md) : profondeur 1, 3, 5... est un coup Noir.
  const estNoir = chemin.length % 2 === 1;
  const texteCoup =
    chemin.length === 0 ? 'Depart' : `${numeroDeTour(chemin.length)}. ${texteDuCoup(noeud, estNoir, aDesFreres)}`;

  const etiquette = document.createElement('span');
  etiquette.className = 'etiquette-commentaire';

  const labelCoup = document.createElement('span');
  labelCoup.className = `arbre-noeud ${classeCouleur(noeud, chemin, arbre)}`;
  labelCoup.textContent = texteCoup;
  labelCoup.addEventListener('click', () => rappels.surClicNoeud(chemin));
  etiquette.appendChild(labelCoup);

  if (parties.length > 0) {
    // Le tag auto-calcule (jamais ecrit dans le commentaire, voir l'en-tete
    // du fichier) dans SA PROPRE couleur, separee du commentaire ecrit a la
    // main — demande par saab, "coherent avec KAAWA". Occ et Ref (chacun
    // son propre <span>, jamais un seul bloc de texte) passent en BLEU
    // des que leur groupe atteint le seuil de nulle, JAUNE sinon — corrige
    // (saab : "les Occ >= 3 ne passent pas en bleu"), voir
    // interface/commentaires.js pour le calcul de `seuilAtteint`.
    etiquette.appendChild(document.createTextNode(' ['));
    parties.forEach((partie, index) => {
      if (index > 0) etiquette.appendChild(document.createTextNode(' '));
      const spanTag = document.createElement('span');
      spanTag.className = partie.seuilAtteint
        ? 'etiquette-occurrence-tag etiquette-occurrence-tag-seuil'
        : 'etiquette-occurrence-tag';
      spanTag.textContent = partie.texte;
      spanTag.title = partie.texte; // le tag complet reste lisible au survol s'il est coupe
      etiquette.appendChild(spanTag);
    });
    etiquette.appendChild(document.createTextNode(']'));
  }

  ligne.appendChild(etiquette);

  const deplie = etat.cheminsDeplies.has(cle);
  const boutonDeplier = document.createElement('button');
  boutonDeplier.type = 'button';
  boutonDeplier.className = 'bouton-deplier-commentaire';
  boutonDeplier.textContent = deplie ? '−' : '+';
  boutonDeplier.title = deplie ? 'Replier le commentaire' : 'Voir le commentaire en entier';
  boutonDeplier.addEventListener('click', () => rappels.surClicDeplier(cle));
  ligne.appendChild(boutonDeplier);

  const zone = document.createElement('textarea');
  zone.className = deplie ? 'texte-commentaire texte-commentaire-deplie' : 'texte-commentaire';
  zone.placeholder = 'Aucun commentaire';
  zone.value = noeud.commentaire ?? '';
  zone.rows = deplie ? 3 : 1;
  zone.addEventListener('change', () => rappels.surCommentaireModifie(chemin, zone.value));
  ligne.appendChild(zone);

  return ligne;
}
