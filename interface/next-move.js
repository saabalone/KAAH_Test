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
// Pas d'import ni d'export (voir moteur/plateau.js) : conseilsDuCampAuTrait
// vient de moteur/next-move.js, dessinerFlechesConseils/
// effacerFlechesConseils de rendu/conseils.js, ligneDeConseil, flechesDesConseils
// d'interface/next-move-lignes.js — tous charges avant celui-ci dans index.html.


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
// `surApercu(coup)` : un coup mis en avant (saab, 2026-10-16 : le voir dans les 4 groupes).
function demarrerConseils(svg, elements, obtenirBase, obtenirEtatActuel, surCoupChoisi, surApercu = () => {}) {
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

  // Fermer (saab, 2026-10-16 : « mettre Fermer sur Conseil, sinon on ne peut pas bien voir
  // Réflexion ») : eteint le camp au trait, comme un second clic sur l'ampoule.
  elements.fermer?.addEventListener('click', () => {
    const { joueurAuTrait } = obtenirEtatActuel();
    if (joueurAuTrait === 'noir') actifNoir = false;
    else actifBlanc = false;
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
    conseilsActuels = conseilsDuCampAuTrait(obtenirBase(), position, joueurAuTrait);
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

  // La ligne d'un conseil (interface/next-move-lignes.js) : le premier clic le met en
  // avant, le second le joue.
  function creerLigne(conseil) {
    return ligneDeConseil(conseil, conseil === previsualise, () => {
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
      surApercu(conseil.coup);
    });
  }

  // Les fleches (interface/next-move-lignes.js, flechesDesConseils). Jamais par-dessus le
  // grand bouton rond de pause (signale par saab) : #pause-plateau, une fois affiche, est ajoute APRES coup dans le meme
  // <svg> (voir interface/saisie.js) — sans cette garde, une fleche
  // dessinee ensuite (Conseils ouvert pendant une pause) se peindrait
  // par-dessus lui et revelerait une information de position que la
  // pause est justement censee cacher.
  function rafraichirFleches() {
    if (svg.querySelector('#pause-plateau')) {
      effacerFlechesConseils(svg);
      return;
    }

    dessinerFlechesConseils(svg, flechesDesConseils(conseilsActuels, previsualise));
  }

  return { actualiser };
}
