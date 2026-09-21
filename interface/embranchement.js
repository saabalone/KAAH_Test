// Popup de choix de branche : demandee quand la navigation ("Coup suivant"
// ou "Dernier coup") arrive sur un noeud qui a plusieurs enfants, au lieu
// de choisir silencieusement le premier (signale par saab : "Qd je navigue
// il faut que si j'arrive à une branche on me demande de choisir").
// Calque sur KAAWA : action_next_move ouvre son "Contrôle de Branche" des
// qu'un noeud a plus d'un enfant (len(children) > 1), et action_end_to_Nacre
// s'arrete au premier embranchement rencontre en avancant, propose le
// meme choix, puis continue automatiquement une fois la branche choisie
// (kaa_app_ClO_Co.py, _show_fork_popup_then_continue) — voir
// interface/saisie.js pour cette suite automatique.
//
// UN PANNEAU, PAS UNE POPUP QUI RECOUVRE LE PLATEAU (signale par saab, deja
// applique a Conseils/Menaces : "comment savoir ce qu'on veut faire" si le
// plateau reste cache pendant qu'on choisit ?). Docke donc DANS #colonne-
// droite comme Sequence/Conseils/Occurrences (voir index.html), jamais un
// `<dialog>` — la mise en page en flex/grid garantit deja qu'aucun panneau
// de cette colonne ne recouvre jamais #colonne-principale (le plateau), sur
// telephone comme sur ordinateur. Peut en revanche recouvrir/remplacer
// l'AFFICHAGE des autres panneaux de cette colonne (Sequence, etc.) : saab
// l'a explicitement autorise ("place ta fenetre sur les autres fenetres
// mais pas sur le plateau").
//
// Chaque branche a DEUX boutons cote a cote : "▲" (Remonter — echange sa
// place avec la branche precedente, JAMAIS visible si `peutRemonter` est
// faux, voir moteur.peutRemonterNoeud) qui ne ferme pas le panneau, et le
// coup lui-meme (Valider — choisit cette branche) qui le ferme. Memes DEUX
// actions que le popup "Controle de Branche" de KAAWA (ses boutons
// "Remonter" et "Valider" — "Supprimer" n'a pas d'equivalent ici, chaque
// coup de la Sequence a deja son propre ✕, voir rendu/arbre-ligne.js).
// Couleur du coup EXACTEMENT comme dans la Sequence (rendu/arbre-ligne.js,
// classes .arbre-origine/.arbre-branche) : vert pour la ligne reellement
// jouee, violet pour toute autre branche. "Annuler" referme sans rien
// choisir.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : aucune dependance
// vers un autre fichier.
function demarrerEmbranchement(elements) {
  // La branche qu'on vient de faire "Remonter" (le texte de son coup, pas
  // son index — l'index change justement a chaque remontee) : encadree en
  // gris clair (signale par saab : "pour pouvoir suivre son deplacement",
  // PAS en orange, deja reserve au coup actif ailleurs dans KAAH) tant
  // qu'aucune AUTRE branche n'a ete remontee depuis. Remise a `null` des
  // que le panneau se referme, pour ne jamais reapparaitre au prochain
  // embranchement sans rapport.
  let coupRemonte = null;

  elements.annuler.addEventListener('click', () => {
    coupRemonte = null;
    elements.panneau.hidden = true;
  });

  // `branches` : [{ coup, estOrigine, peutRemonter }], dans l'ORDRE actuel
  // des enfants (voir interface/saisie.js, qui la reconstruit a chaque
  // appel — y compris apres un "Remonter", pour refleter le nouvel ordre).
  // `surChoix(index)` ferme le panneau et rappelle avec l'index CHOISI.
  // `surRemonter(index)` ne ferme PAS le panneau (on peut vouloir remonter
  // plusieurs fois de suite avant de choisir) : c'est a l'appelant de
  // rappeler `demander` avec une liste rafraichie pour continuer.
  function demander(branches, surChoix, surRemonter) {
    elements.liste.innerHTML = '';
    branches.forEach((branche, index) => {
      const ligne = document.createElement('div');
      ligne.className = 'ligne-embranchement';

      const remonter = document.createElement('button');
      remonter.type = 'button';
      remonter.className = 'arbre-repli';
      remonter.textContent = '▲';
      if (branche.peutRemonter) {
        remonter.title = 'Remonter cette branche';
        remonter.addEventListener('click', () => {
          coupRemonte = branche.coup;
          surRemonter(index);
        });
      } else {
        remonter.classList.add('invisible');
        remonter.disabled = true;
      }
      ligne.appendChild(remonter);

      const choisir = document.createElement('button');
      choisir.type = 'button';
      choisir.className = `bouton-dialogue ${branche.estOrigine ? 'arbre-origine' : 'arbre-branche'}`;
      if (branche.coup === coupRemonte) choisir.classList.add('bouton-dialogue-remontee');
      choisir.textContent = branche.coup;
      choisir.addEventListener('click', () => {
        coupRemonte = null;
        elements.panneau.hidden = true;
        surChoix(index);
      });
      ligne.appendChild(choisir);

      elements.liste.appendChild(ligne);
    });
    elements.panneau.hidden = false;
  }

  return { demander };
}
