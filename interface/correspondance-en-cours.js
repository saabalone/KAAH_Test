// La liste « En cours » de la boite Correspondance (saab : "un btn 'en cours'
// qui affiche les parties en cours afin de pouvoir choisir celle qu'on veut
// revoir") : une ligne par partie par correspondance pas encore terminee —
// l'adversaire, votre camp, le tour, et a qui c'est de jouer. Toucher une
// ligne ouvre cette partie (la partie affichee reste dans Mes parties).
// Construite noeud par noeud, jamais par innerHTML : les noms sont saisis par
// les joueurs.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : partiesCorrespondanceEnCours,
// compterCorrespondancesEnCours, correspondanceDesDonnees, nomDeLAdversaire
// (interface/correspondance-rangement.js), elementsDuTitre (moteur/nom-partie.js),
// donneesVersArbre (moteur/sauvegarde.js), peutJouerEnCorrespondance
// (moteur/correspondance.js), obtenirIdPartieActive (interface/sauvegarde.js) et
// NOM_CAMP (rendu/ejections.js) viennent de fichiers charges avant celui-ci.

// Le texte d'une ligne pour `entree`, une partie enregistree.
function descriptionPartieEnCours(entree) {
  const correspondance = correspondanceDesDonnees(entree.donnees);
  let aVous = false;
  try {
    const arbre = donneesVersArbre(entree.donnees);
    aVous = peutJouerEnCorrespondance({ ...arbre, chemin: arbre.cheminOrigine }, correspondance.couleurLocale);
  } catch {
    // Partie illisible : montree quand meme, sans dire a qui c'est de jouer.
  }
  const camp = NOM_CAMP[correspondance.couleurLocale] ?? '?';
  const trait = aVous ? 'à vous de jouer' : "à l'adversaire";
  return `${nomDeLAdversaire(correspondance)} — vous : ${camp} — tour ${elementsDuTitre(entree.donnees).tours} — ${trait}`;
}

// `elements` : { bouton, liste, dialogue }. `ouvrirPartie(id)` : charge la
// partie choisie. Renvoie { actualiser() }, a appeler a chaque ouverture de la
// boite : le bouton dit combien il y en a, la liste repart repliee.
function demarrerCorrespondancesEnCours(elements, ouvrirPartie) {
  function actualiser() {
    const nombre = compterCorrespondancesEnCours();
    elements.bouton.textContent = `En cours (${nombre})`;
    elements.bouton.disabled = nombre === 0;
    elements.liste.hidden = true;
  }

  function remplir() {
    const idActif = obtenirIdPartieActive();
    const lignes = partiesCorrespondanceEnCours().map((entree) => {
      const ligne = document.createElement('div');
      ligne.className = 'ligne-liste ligne-en-cours-correspondance';
      ligne.textContent = descriptionPartieEnCours(entree) + (entree.id === idActif ? ' (affichée)' : '');
      ligne.addEventListener('click', () => {
        elements.dialogue.close();
        if (entree.id !== idActif) ouvrirPartie(entree.id);
      });
      return ligne;
    });
    elements.liste.replaceChildren(...lignes);
  }

  elements.bouton.addEventListener('click', () => {
    if (elements.liste.hidden) remplir();
    elements.liste.hidden = !elements.liste.hidden;
  });

  return { actualiser };
}
