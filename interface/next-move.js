// Panneau "Conseils" (Next Move, phase 15) : les coups suggeres par la
// base KAA_NEXT_MOVE_REF_Best_Stat.csv (moteur/next-move.js), avec leurs
// victoires/defaites/nulles. Reconstruit entierement a chaque
// rafraichissement (innerHTML) : une simple liste, pas le plateau lui-
// meme — voir CLAUDE.md, l'interdiction ne vise que les billes.
//
// UN PANNEAU, PAS UNE POPUP (contrairement a "Mes parties"/"Variantes").
// Il l'a ete — successivement centre, colle en bas a droite, puis en haut
// a droite — et c'etait a chaque fois la mauvaise piste : ce panneau sert
// a lire des indications DESSINEES SUR LE PLATEAU, le recouvrir revient a
// cacher exactement ce qu'on cherche a voir (saab : "le plus important
// dans cette appli c'est de voir le plateau... c'est pas vraiment
// pratique, non ?"). Il prend donc sa place DANS la mise en page, comme la
// Sequence : a cote du plateau sur ordinateur, en dessous sur telephone
// (le plateau y est plafonne a un carre, il reste donc de la hauteur) —
// voir styles.css. Se replie par son propre bouton, sans jamais rien
// masquer, et aucune manipulation n'est necessaire pour voir les fleches.
//
// Deux facons de voir les fleches, toutes deux reprises de KAAWA :
//   - cliquer une ligne affiche SA fleche seule, en plus, opaque par-dessus
//     les autres (meme principe "premier clic = apercu, meme clic une
//     seconde fois = jouer" que Variantes, voir interface/variantes.js) ;
//   - TOUTES les suggestions sont deja affichees des l'ouverture du
//     panneau, colorees par dominance (kaa_board_widget_ClO_Co.py,
//     show_all_suggestions) : vert si les victoires dominent, rouge si
//     les defaites dominent, bleu si les nulles dominent, gris sinon —
//     et plus epaisse pour le record de victoires ou de defaites parmi
//     les suggestions affichees.
//
// CORRIGE (saab : "les btn 'Tout afficher' et Fermer sont inutiles dans
// Conseils, un appui sur le btn Conseil passe en orange (car actif) et
// doit afficher toutes les fleches, un nouvel appui enleve les fleches
// et le orange") : `elements.bouton` fait desormais les deux a lui seul,
// exactement comme Commentaires/Occurrences/Sequence — plus de
// `boutonTout` ni de `fermer` distincts. Un second clic sur une ligne
// deja previsualisee joue toujours ce coup ; la fleche seule d'un apercu
// garde la MEME couleur que dans la toile de fond (signale par saab :
// jamais une couleur "apercu" a part).
//
// CORRIGE (saab : "il faudrait pouvoir differencier l'action sur le camp
// qui l'a active, si Noir clic Conseil il ne s'affiche que pour Noir, si
// Blanc clic aussi il s'affichera pour Blanc ET Noir, si Noir desactive
// Blanc aura tjs Conseil et vice versa, si les 2 ont desactive plus de
// Conseil") : UN SEUL bouton, mais DEUX etats d'activation independants,
// un par camp (`actifNoir`/`actifBlanc`) — jamais un seul drapeau global.
// Cliquer bascule le drapeau du camp AU TRAIT au moment du clic ; a
// chaque coup ou navigation, le panneau se montre ou se cache tout seul
// selon le drapeau du camp DESORMAIS au trait (voir `actualiser`), sans
// qu'il soit besoin de re-cliquer a chaque tour si ce camp a deja
// active. C'est donc une preference par JOUEUR ("je veux de l'aide sur
// mes coups"), pas un simple interrupteur pour toute la partie.
//
// Colonnes Coup/Gagne/Nul/Perdu, dans cet ORDRE precis (Nul AVANT Perdu —
// signale par saab, "qui montre plus une regression" que l'ordre habituel
// W/L/D de KAAWA). Le coup est colore comme sa fleche (la dominance) ;
// les 3 chiffres, eux, gardent chacun sa PROPRE couleur fixe (vert/bleu/
// rouge), jamais celle de la dominance du coup — deux echelles de couleur
// differentes, cote a cote (signale par saab).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : obtenirConseils
// vient de moteur/next-move.js, dessinerFlechesConseils/
// effacerFlechesConseils de rendu/conseils.js — tous charges avant celui-
// ci dans index.html.

// La couleur de dominance d'un conseil, reprise de KAAWA
// (kaa_tab_manager_ClO_Co.py, C_GREEN/C_RED/C_BLUE) : victoires,
// defaites ou nulles, celle qui l'emporte donne sa couleur ; une egalite
// (y compris 0-0-0, aucune partie jouee depuis ce coup) reste neutre.
function classeDominanceConseil(conseil) {
  const { victoires, defaites, nulles } = conseil;
  if (victoires > defaites && victoires > nulles) return 'victoire';
  if (defaites > victoires && defaites > nulles) return 'defaite';
  if (nulles > victoires && nulles > defaites) return 'nulle';
  return 'egalite';
}

// `svg` est le plateau PRINCIPAL (les fleches s'y dessinent directement,
// jamais sur un plateau a part comme l'apercu des Variantes). `elements` :
// { bouton, panneau, liste }. `obtenirBase()` renvoie
// la base (moteur.analyserBaseNextMove), ou une Map vide tant qu'elle n'a
// pas fini de se charger (voir index.html : analysee en arriere-plan pour
// ne jamais faire attendre les pendules, CLAUDE.md) — obtenirConseils
// traite deja une base vide comme "aucune suggestion", rien de special a
// faire ici. `obtenirEtatActuel()` renvoie { position, joueurAuTrait } :
// la position compressee courante (moteur.ecrirePosition) ET le camp au
// trait — indispensable, la position compressee ne le dit pas et un coup
// de l'adversaire n'est meme pas jouable (voir moteur/next-move.js).
// `surCoupChoisi(coupTexte)` est appele quand une ligne est confirmee (un
// second clic sur la meme ligne) : a l'appelant de jouer ce coup (voir
// index.html, qui sait traduire un texte Nacre en coup reel).
function demarrerConseils(svg, elements, obtenirBase, obtenirEtatActuel, surCoupChoisi) {
  let previsualise = null;
  let conseilsActuels = [];
  // Voir l'en-tete du fichier : deux drapeaux independants, jamais un
  // seul. Commencent tous deux inactifs (comme l'unique drapeau avant
  // cette correction) : une partie neuve ne montre rien tant que personne
  // n'a clique.
  let actifNoir = false;
  let actifBlanc = false;

  function estActifPour(camp) {
    return camp === 'noir' ? actifNoir : actifBlanc;
  }

  // Bascule le drapeau du camp AU TRAIT MAINTENANT (celui pour qui ce
  // clic compte), jamais l'autre.
  elements.bouton.addEventListener('click', () => {
    const { joueurAuTrait } = obtenirEtatActuel();
    if (joueurAuTrait === 'noir') actifNoir = !actifNoir;
    else actifBlanc = !actifBlanc;
    actualiser();
  });

  // Clic dans une zone inactive du plateau (ni case, ni bille, ni pendule,
  // ni bouton de pause) : deuxieme facon d'eteindre, en plus du bouton —
  // mais seulement le camp actuellement affiche (jamais l'autre camp, dont
  // le drapeau peut rester actif en silence jusqu'a son propre tour).
  svg.addEventListener('click', (evenement) => {
    if (evenement.target.closest('[data-notation], .bouton-pendule, #pause-plateau')) return;
    if (elements.panneau.hidden) return;
    const { joueurAuTrait } = obtenirEtatActuel();
    if (joueurAuTrait === 'noir') actifNoir = false;
    else actifBlanc = false;
    actualiser();
  });

  // A appeler par index.html apres chaque coup ou navigation : la position
  // (et donc le camp au trait) a change, donc les fleches affichees ne
  // valent plus rien — meme (et surtout) panneau ferme, ou elles
  // restaient sinon a l'ecran alors qu'elles designaient la position
  // d'AVANT (signale par saab). Montre ou cache le panneau tout seul selon
  // le drapeau du camp DESORMAIS au trait : voir l'en-tete du fichier,
  // c'est ce qui fait qu'un camp qui a deja active n'a jamais besoin de
  // re-cliquer a son tour suivant.
  function actualiser() {
    previsualise = null;
    const { position, joueurAuTrait } = obtenirEtatActuel();

    if (!estActifPour(joueurAuTrait)) {
      conseilsActuels = [];
      elements.panneau.hidden = true;
      elements.bouton.classList.remove('bouton-actif');
      effacerFlechesConseils(svg);
      rafraichirListe();
      return;
    }

    elements.panneau.hidden = false;
    elements.bouton.classList.add('bouton-actif');
    conseilsActuels = obtenirConseils(obtenirBase(), position, joueurAuTrait);
    rafraichirListe();
    rafraichirFleches();
  }

  function rafraichirListe() {
    elements.liste.innerHTML = '';
    if (conseilsActuels.length === 0) {
      const vide = document.createElement('p');
      vide.textContent = 'Aucune suggestion pour cette position.';
      elements.liste.appendChild(vide);
      return;
    }
    for (const conseil of conseilsActuels) {
      elements.liste.appendChild(creerLigne(conseil));
    }
  }

  // 4 colonnes : Coup, Gagne, Nul, Perdu — cet ORDRE precis (Nul avant
  // Perdu) demande par saab, "qui montre plus une regression" que l'ordre
  // habituel W/L/D. Le coup est colore comme sa fleche (meme dominance
  // victoires/nulles/defaites) ; les 3 chiffres, eux, gardent chacun sa
  // PROPRE couleur fixe (vert/bleu/rouge), jamais celle de la dominance.
  function creerLigne(conseil) {
    const ligne = document.createElement('div');
    ligne.className =
      conseil === previsualise ? 'ligne-liste ligne-conseil ligne-variante-previsualisee' : 'ligne-liste ligne-conseil';

    const texte = document.createElement('span');
    texte.className = `ligne-liste-texte texte-conseil-${classeDominanceConseil(conseil)}`;
    texte.textContent = conseil.coup;
    ligne.appendChild(texte);

    ligne.appendChild(creerValeur(conseil.victoires, 'valeur-gagne'));
    ligne.appendChild(creerValeur(conseil.nulles, 'valeur-nul'));
    ligne.appendChild(creerValeur(conseil.defaites, 'valeur-perdu'));

    ligne.addEventListener('click', () => {
      if (previsualise === conseil) {
        // Le panneau reste ouvert : jouer declenche actualiser() (voir
        // index.html, surChangement), qui remplace aussitot la liste par
        // les suggestions de la NOUVELLE position. Du temps ou c'etait une
        // popup, il fallait la refermer pour revoir le plateau ; ce n'est
        // plus le cas, elle ne le recouvre plus.
        surCoupChoisi(conseil.coup);
        return;
      }
      // Les autres suggestions restent affichees, translucides (signale
      // par saab) : previsualise devient juste LE coup mis en avant,
      // opaque, par-dessus les autres.
      previsualise = conseil;
      rafraichirListe();
      rafraichirFleches();
    });

    return ligne;
  }

  function creerValeur(nombre, classe) {
    const valeur = document.createElement('span');
    valeur.className = classe;
    valeur.textContent = nombre;
    return valeur;
  }

  // Toutes les suggestions restent translucides en toile de fond (pour
  // bientot voir les coordonnees des cases a travers), et celle qu'on
  // vient de choisir passe en opaque par-dessus — dessinee en dernier,
  // donc peinte au-dessus des autres.
  //
  // Jamais par-dessus le grand bouton rond de pause (signale par saab) :
  // #pause-plateau, une fois affiche, est ajoute APRES coup dans le meme
  // <svg> (voir interface/saisie.js) — sans cette garde, une fleche
  // dessinee ensuite (Conseils ouvert pendant une pause) se peindrait
  // par-dessus lui et revelerait une information de position que la
  // pause est justement censee cacher.
  function rafraichirFleches() {
    if (svg.querySelector('#pause-plateau')) {
      effacerFlechesConseils(svg);
      return;
    }

    const fleches = [];

    const maxVictoires = Math.max(0, ...conseilsActuels.map((c) => c.victoires));
    const maxDefaites = Math.max(0, ...conseilsActuels.map((c) => c.defaites));
    for (const conseil of conseilsActuels) {
      if (conseil === previsualise) continue; // celle-la se dessine a part, opaque, plus bas
      fleches.push({
        coup: conseil.coup,
        classe: classeDominanceConseil(conseil),
        dominante: (conseil.victoires === maxVictoires && maxVictoires > 0) || (conseil.defaites === maxDefaites && maxDefaites > 0),
        translucide: true,
      });
    }

    if (previsualise) {
      // Meme couleur que dans la toile de fond (signale par saab) :
      // la dominance du coup, jamais une couleur "apercu" a part.
      fleches.push({ coup: previsualise.coup, classe: classeDominanceConseil(previsualise) });
    }

    dessinerFlechesConseils(svg, fleches);
  }

  return { actualiser };
}
