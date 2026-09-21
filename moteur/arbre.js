// Arbre des coups joues (Phase 11). Rejouer un coup depuis un noeud passe
// cree une branche (un nouvel enfant) au lieu d'ecraser le futur, comme le
// fait vraiment KAAWA (champ "Tree" de ses fichiers de sauvegarde — voir
// game_my/Br_2608172039...json pour un exemple avec de vraies branches).
// Remplace moteur/historique.js (phase 9), dont la version lineaire ne
// pouvait pas representer ça — voir PLAN.md, note ⚑ apres la phase 10.
//
// Un noeud : { etat, coup, enfants, estOrigine }. `coup` est le texte du
// coup qui a mene a ce noeud (n'importe quel texte suffit pour l'arbre
// lui-meme, interface/saisie.js y met le coup Nacre — voir
// moteur/notation.js). Le noeud racine a `coup: null` (il represente la
// position de depart, pas un coup).
//
// `estOrigine` distingue la partie REELLEMENT jouee (comme le `is_origin`
// de KAAWA) d'une branche d'exploration : vrai seulement pour un coup joue
// alors qu'on etait deja au bout de la ligne d'origine (voir
// `cheminOrigine` ci-dessous). Rejouer un coup DIFFERENT depuis un noeud
// passe (apres etre revenu en arriere) cree donc toujours une branche
// d'exploration, jamais de l'origine — meme si c'est la premiere branche
// jouee a cet endroit.
//
// Le noeud courant est designe par un `chemin` : la suite des index
// d'enfant a suivre depuis la racine (chemin vide = a la racine). Le
// `cheminOrigine` de l'arbre suit, lui, le bout le plus profond de la
// ligne reellement jouee — il n'avance que quand un coup est joue
// EXACTEMENT a ce bout, et ne recule jamais tout seul en naviguant dans le
// passe (seule une suppression peut le faire reculer, voir
// `supprimerBranche`).
//
// Le "chemin principal" de KAAWA (son champ is_origin, au sens de
// l'affichage — premier enfant de chaque noeud) reste toujours le premier
// enfant : creer une branche ajoute donc toujours le nouvel enfant a la
// FIN de la liste, jamais au debut, pour ne jamais le deranger.
//
// Pur et immuable comme le reste du moteur : chaque fonction renvoie un
// nouvel arbre, sans jamais modifier celui qu'on lui passe. Une structure
// imbriquee ne peut pas se recopier avec un simple `[...tableau]` comme
// l'ancien historique lineaire : remplacerNoeud() ci-dessous ne recree que
// les noeuds sur le chemin concerne, les autres branches restent les memes
// objets (partage structurel).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : aucune dependance
// vers un autre fichier moteur.

function creerArbre(etatDepart) {
  return { racine: { etat: etatDepart, coup: null, enfants: [] }, chemin: [], cheminOrigine: [], nullesRefusees: [] };
}

function cheminsEgaux(cheminA, cheminB) {
  return cheminA.length === cheminB.length && cheminA.every((valeur, index) => valeur === cheminB[index]);
}

// Le noeud designe par `chemin`, quel qu'il soit (pas seulement le noeud
// courant — utilise par la barre laterale, qui affiche tout l'arbre).
function noeudA(arbre, chemin) {
  let noeud = arbre.racine;
  for (const index of chemin) noeud = noeud.enfants[index];
  return noeud;
}

function noeudCourant(arbre) {
  return noeudA(arbre, arbre.chemin);
}

function etatCourant(arbre) {
  return noeudCourant(arbre).etat;
}

// Reconstruit l'arbre en appliquant `transformation` au noeud designe par
// `chemin`, sans jamais modifier `noeud` ni ses descendants hors chemin.
function remplacerNoeud(noeud, chemin, transformation) {
  if (chemin.length === 0) return transformation(noeud);
  const [index, ...reste] = chemin;
  const enfants = noeud.enfants.map((enfant, i) =>
    i === index ? remplacerNoeud(enfant, reste, transformation) : enfant
  );
  return { ...noeud, enfants };
}

// Rejoue `coup` (deja applique par appliquerCoup, donnant `nouvelEtat`)
// depuis le noeud courant. Si ce texte de coup a deja ete joue a cet
// endroit, on navigue simplement vers la branche existante au lieu d'en
// creer une deuxieme identique (comportement de KAAWA).
function jouerDansArbre(arbre, coup, nouvelEtat) {
  const noeud = noeudCourant(arbre);
  const indexExistant = noeud.enfants.findIndex((enfant) => enfant.coup === coup);
  if (indexExistant !== -1) {
    return { ...arbre, chemin: [...arbre.chemin, indexExistant] };
  }

  // On n'etend l'origine que si on jouait deja a son bout : revenir en
  // arriere puis jouer AUTRE CHOSE cree une branche d'exploration, meme
  // si c'est la toute premiere fois qu'on s'ecarte a cet endroit.
  const auBoutDeLOrigine = cheminsEgaux(arbre.chemin, arbre.cheminOrigine);
  const nouveauNoeud = { etat: nouvelEtat, coup, enfants: [], estOrigine: auBoutDeLOrigine };
  const nouvelIndex = noeud.enfants.length;
  const nouveauChemin = [...arbre.chemin, nouvelIndex];

  const racine = remplacerNoeud(arbre.racine, arbre.chemin, (n) => ({
    ...n,
    enfants: [...n.enfants, nouveauNoeud],
  }));
  // `{ ...arbre, ... }` et non un objet reconstruit a la main : un champ
  // qui ne serait pas explicitement recopie ICI disparaitrait a chaque
  // coup qui cree un noeud — exactement le bug trouve sur `nullesRefusees`
  // (phase 17, moteur/nulle.js) : une position refusee "revenait" des le
  // coup suivant, l'ancien code de cette fonction ne recopiant que
  // racine/chemin/cheminOrigine. Le spread rend cet oubli impossible pour
  // tout champ futur.
  return {
    ...arbre,
    racine,
    chemin: nouveauChemin,
    cheminOrigine: auBoutDeLOrigine ? nouveauChemin : arbre.cheminOrigine,
  };
}

function reculerDansArbre(arbre) {
  if (arbre.chemin.length === 0) return arbre;
  return { ...arbre, chemin: arbre.chemin.slice(0, -1) };
}

// Avance vers le premier enfant (le chemin principal, cf. is_origin de
// KAAWA) du noeud courant, s'il en a un.
function avancerDansArbre(arbre) {
  if (noeudCourant(arbre).enfants.length === 0) return arbre;
  return { ...arbre, chemin: [...arbre.chemin, 0] };
}

// Avance vers l'enfant `index` (n'importe lequel, pas seulement le premier)
// du noeud courant. Sert au choix d'embranchement (voir
// avancerJusquauProchainChoix ci-dessous et interface/saisie.js) : une fois
// que l'utilisateur a choisi UNE branche parmi plusieurs, on y avance
// exactement comme avancerDansArbre le ferait pour un enfant unique. Ne
// fait rien si `index` ne designe aucun enfant (garde defensive, comme
// avancerDansArbre sans enfant).
function avancerVersEnfant(arbre, index) {
  if (index < 0 || index >= noeudCourant(arbre).enfants.length) return arbre;
  return { ...arbre, chemin: [...arbre.chemin, index] };
}

function allerALaRacine(arbre) {
  return { ...arbre, chemin: [] };
}

// Saute directement a un chemin quelconque de l'arbre (utilise par la barre
// laterale, phase 11 : cliquer n'importe quel noeud y navigue directement,
// pas seulement un pas avant ou arriere). Le chemin est suppose valide
// (obtenu en parcourant ce meme arbre, voir rendu/arbre-html.js).
function allerAuNoeud(arbre, chemin) {
  return { ...arbre, chemin };
}

// Suit le chemin principal (premier enfant a chaque noeud) depuis la
// racine jusqu'a une feuille.
function allerAuBoutDuCheminPrincipal(arbre) {
  const chemin = [];
  let noeud = arbre.racine;
  while (noeud.enfants.length > 0) {
    chemin.push(0);
    noeud = noeud.enfants[0];
  }
  return { ...arbre, chemin };
}

// Avance depuis le noeud courant tant que le chemin est SANS AMBIGUITE (un
// seul enfant), et s'arrete des qu'un embranchement se presente (plusieurs
// enfants) ou qu'une feuille est atteinte — sans jamais choisir a la place
// de l'utilisateur. Calque sur action_end_to_Nacre de KAAWA ("avance a la
// fin, s'arrete a chaque bifurcation avec popup, puis continue") : c'est a
// l'appelant (interface/saisie.js) de proposer le choix des qu'il trouve
// plusieurs enfants sur le noeud renvoye, puis de rappeler cette fonction
// depuis avancerVersEnfant pour continuer plus loin s'il y a d'autres
// embranchements ensuite. Ne fait rien si on est deja sur un embranchement
// ou une feuille.
function avancerJusquauProchainChoix(arbre) {
  let chemin = arbre.chemin;
  while (noeudA(arbre, chemin).enfants.length === 1) {
    chemin = [...chemin, 0];
  }
  return { ...arbre, chemin };
}

// Le noeud designe par `chemin` peut-il etre supprime ? Une branche
// d'exploration (estOrigine faux) se supprime toujours ; la ligne
// REELLEMENT jouee (estOrigine vrai) ne peut perdre que son propre bout
// actuel — le droit a l'erreur sur le tout dernier coup vraiment joue,
// jamais un coup plus ancien deja depasse. Regle calquee sur
// action_annule_move de KAAWA (sa securite « le droit a l'erreur est
// epuise pour ce tour »).
function peutSupprimerNoeud(arbre, chemin) {
  if (chemin.length === 0) return false; // jamais la position de depart
  if (!noeudA(arbre, chemin).estOrigine) return true;
  return cheminsEgaux(chemin, arbre.cheminOrigine);
}

// Le noeud designe par `chemin` peut-il "remonter" (echanger sa place avec
// son frere immediatement precedent) ? Calque sur le bouton "Remonter" du
// popup "Controle de Branche" de KAAWA (kaa_app_ClO_Co.py) : toujours
// possible, SAUF le cas precis ou ce remontee deloguerait l'origine (la
// ligne REELLEMENT jouee) de sa place de premier enfant — elle doit
// toujours rester affichee en premier, meme si saab reordonne le reste.
function peutRemonterNoeud(arbre, chemin) {
  if (chemin.length === 0) return false; // la racine n'a pas de frere
  const index = chemin[chemin.length - 1];
  if (index === 0) return false; // rien au-dessus pour echanger
  const parent = noeudA(arbre, chemin.slice(0, -1));
  if (index === 1 && parent.enfants[0].estOrigine) return false;
  return true;
}

// Echange deux enfants adjacents (`indexA`/`indexB`) du noeud designe par
// `chemin`. Ne verifie AUCUNE securite elle-meme (voir `peutRemonterNoeud`) :
// comme `appliquerCoup` fait confiance a `coupsDepuis`, c'est a l'appelant
// de ne demander cet echange que pour un index autorise.
function remonterNoeud(arbre, chemin) {
  const index = chemin[chemin.length - 1];
  const cheminParent = chemin.slice(0, -1);
  const racine = remplacerNoeud(arbre.racine, cheminParent, (noeud) => {
    const enfants = [...noeud.enfants];
    [enfants[index - 1], enfants[index]] = [enfants[index], enfants[index - 1]];
    return { ...noeud, enfants };
  });
  // `chemin`/`cheminOrigine` : meme raisonnement que
  // `ajusterCheminApresSuppression`, mais un ECHANGE plutot qu'un decalage —
  // seuls les deux index concernes bougent, tous les autres restent
  // inchanges (contrairement a une suppression, qui decale tout ce qui suit).
  return {
    ...arbre,
    racine,
    chemin: echangerIndexDansChemin(arbre.chemin, cheminParent, index, index - 1),
    cheminOrigine: echangerIndexDansChemin(arbre.cheminOrigine, cheminParent, index, index - 1),
  };
}

function echangerIndexDansChemin(chemin, cheminParent, indexA, indexB) {
  const profondeur = cheminParent.length;
  if (chemin.length <= profondeur) return chemin; // ne descend pas jusque-la : rien a ajuster
  for (let i = 0; i < profondeur; i++) {
    if (chemin[i] !== cheminParent[i]) return chemin; // branche differente : rien a ajuster
  }
  const indexActuel = chemin[profondeur];
  if (indexActuel === indexA) return [...cheminParent, indexB, ...chemin.slice(profondeur + 1)];
  if (indexActuel === indexB) return [...cheminParent, indexA, ...chemin.slice(profondeur + 1)];
  return chemin;
}

// Le noeud courant, apres suppression, reste le meme noeud logique s'il
// n'a pas ete supprime lui-meme : comme retirer un enfant decale les index
// des enfants suivants (filter comble le trou), il faut ajuster `chemin`
// en consequence pour continuer a designer le meme noeud. Sert aussi bien
// pour `chemin` que pour `cheminOrigine` : si l'origine perd son propre
// bout, elle recule d'un cran vers son parent, exactement comme le ferait
// `chemin` dans le meme cas.
function ajusterCheminApresSuppression(chemin, cheminParent, indexSupprime) {
  const profondeur = cheminParent.length;
  if (chemin.length <= profondeur) return chemin; // ne descend pas jusque-la : rien a ajuster
  for (let i = 0; i < profondeur; i++) {
    if (chemin[i] !== cheminParent[i]) return chemin; // branche differente : rien a ajuster
  }

  const indexActuel = chemin[profondeur];
  if (indexActuel === indexSupprime) return cheminParent; // etait dans la branche supprimee : on remonte
  const indexAjuste = indexActuel > indexSupprime ? indexActuel - 1 : indexActuel;
  return [...cheminParent, indexAjuste, ...chemin.slice(profondeur + 1)];
}

// Marque le noeud designe par `chemin` d'un code de fin de partie — "N"
// (normal, 6 ejections), "T" (temps ecoule) ou "D" (nulle acceptee, phase
// 17) — comme le champ `term_status` de KAAWA. Purement informatif pour
// l'affichage (voir rendu/arbre-ligne.js) : ne change ni `etat` ni la
// suite de l'arbre. NE COUVRE PAS l'echec d'un puzzle (phase 16, code "M"
// chez KAAWA) : la encore contrairement a KAAWA, KAAH ne le stocke nulle
// part — un puzzle rate se RECALCULE a chaque affichage depuis la position
// et les coups joues (moteur.etatDuPuzzle), rien a memoriser sur le noeud
// lui-meme (voir index.html, definirPositionSansSuite).
function marquerStatutFin(arbre, chemin, statut) {
  const racine = remplacerNoeud(arbre.racine, chemin, (noeud) => ({ ...noeud, statutFin: statut }));
  return { ...arbre, racine };
}

// Ce statut de fin interdit-il tout coup de plus sur ce noeud ? Oui pour une
// nulle acceptee ("D") et un abandon ("R") : la partie est finie d'un commun
// accord ou par renoncement. Non pour un temps ecoule ("T", on peut encore
// analyser) ; la victoire par ejections ("N") est deja definitive par
// `etat.vainqueur`, pas par ce statut.
function estStatutDefinitif(statut) {
  return statut === 'D' || statut === 'R';
}

// Associe un instantane des pendules (voir interface/pendules.js) au
// noeud designe par `chemin`, sans toucher a son etat ni au reste de
// l'arbre. KAAWA fait la meme chose (`p1_time`/`p2_time` par noeud de son
// Tree) : naviguer dans l'historique doit reafficher le temps TEL QU'IL
// ETAIT a ce moment-la, pas un temps qui continuerait de s'ecouler
// pendant qu'on regarde ailleurs. `instantane` est une donnee opaque pour
// ce fichier — moteur/pendules.js seul en connait la forme.
function marquerPendulesSnapshot(arbre, chemin, instantane) {
  const racine = remplacerNoeud(arbre.racine, chemin, (noeud) => ({ ...noeud, pendulesSnapshot: instantane }));
  return { ...arbre, racine };
}

// Supprime le noeud designe par `chemin`, et donc tous ses descendants. On
// ne supprime jamais la racine (chemin vide) : elle represente la position
// de depart, pas un coup joue. N'applique aucune regle de securite elle-
// meme (voir `peutSupprimerNoeud`) : comme `appliquerCoup` fait confiance
// a `coupsDepuis`, c'est a l'appelant de ne demander une suppression que
// pour un noeud autorise.
function supprimerBranche(arbre, chemin) {
  if (chemin.length === 0) return arbre;

  const cheminParent = chemin.slice(0, -1);
  const indexASupprimer = chemin[chemin.length - 1];
  const racine = remplacerNoeud(arbre.racine, cheminParent, (n) => ({
    ...n,
    enfants: n.enfants.filter((_, i) => i !== indexASupprimer),
  }));
  // `{ ...arbre, ... }` : voir jouerDansArbre plus haut, meme raison
  // (ne jamais reconstruire l'objet a la main, sous peine d'y oublier un
  // champ). "Annuler" un coup ne doit JAMAIS effacer `nullesRefusees` —
  // une position refusee le reste, meme si le coup qui l'a fait apparaitre
  // est ensuite annule et rejoue.
  return {
    ...arbre,
    racine,
    chemin: ajusterCheminApresSuppression(arbre.chemin, cheminParent, indexASupprimer),
    cheminOrigine: ajusterCheminApresSuppression(arbre.cheminOrigine, cheminParent, indexASupprimer),
  };
}

// Retient qu'une proposition de nulle par repetition a ete REFUSEE pour
// `position` (le texte compresse exact — phase 17, moteur/nulle.js).
// Vit sur L'ARBRE ENTIER, pas sur un noeud precis (contrairement a
// `statutFin`/`pendulesSnapshot`) : une position refusee ne doit plus
// jamais reproposer, meme si elle revient plus tard par un AUTRE chemin,
// meme apres avoir annule le coup qui l'a fait apparaitre puis rejoue la
// meme chose (signale par saab : suivre le NOEUD plutot que la POSITION
// laissait la question revenir des le coup suivant). Persiste dans la
// sauvegarde comme le reste de l'arbre (voir moteur/sauvegarde.js).
function refuserNulle(arbre, position) {
  if (arbre.nullesRefusees.includes(position)) return arbre; // deja present, rien a dupliquer
  return { ...arbre, nullesRefusees: [...arbre.nullesRefusees, position] };
}

// Attache la fleche du dernier coup (phase 19bis) au noeud designe par
// `chemin` — `info` vient de moteur.informationFlecheDernierCoup, jamais
// recalculee ici. Meme moule que marquerStatutFin/marquerPendulesSnapshot :
// un noeud precis, jamais une variable globale, pour que naviguer dans
// l'historique affiche toujours la fleche du coup qui a MENE a ce noeud, et
// jamais celle d'un autre. La racine (avant le tout premier coup) n'en
// recoit jamais : elle ne represente aucun coup a fleche.
function marquerFlecheDernierCoup(arbre, chemin, info) {
  const racine = remplacerNoeud(arbre.racine, chemin, (noeud) => ({ ...noeud, flecheDernierCoup: info }));
  return { ...arbre, racine };
}

// Attache un commentaire au noeud designe par `chemin` (phase 18) — le
// champ `comment` de KAAWA, un texte libre par coup, ecrase a chaque appel
// (jamais fusionne ni complete). Meme moule que `marquerStatutFin` : ne
// change ni `etat` ni le reste de l'arbre, purement informatif pour
// l'affichage (voir interface/commentaires.js) et persiste dans la
// sauvegarde comme lui (voir moteur/sauvegarde.js).
function marquerCommentaire(arbre, chemin, texte) {
  const racine = remplacerNoeud(arbre.racine, chemin, (noeud) => ({ ...noeud, commentaire: texte }));
  return { ...arbre, racine };
}

// Numero de tour a partir du nombre de coups deja joues depuis la racine —
// meme formule que KAAWA (display_turn = (history_index+1)//2, jamais sous
// 1). Vit ICI, et pas dans l'interface qui l'affiche : c'est une regle de
// comptage des coups, et la regle de fin des puzzles s'en sert aussi
// (moteur/puzzles.js) — elle ne doit surtout pas etre ecrite a deux
// endroits (CLAUDE.md).
function numeroDeTour(nombreDeCoupsJoues) {
  return Math.max(1, Math.floor((nombreDeCoupsJoues + 1) / 2));
}
