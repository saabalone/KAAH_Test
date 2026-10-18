// Le CHOIX DES JEUX du banc d'essais (saab, 2026-10-14 : « pouvoir choisir une ou
// plusieurs ou toutes Variantes/PZL dans les tests entre IA, pour essayer les
// variantes/PZL qu'on veut ») : une liste a cocher repliable, sa recherche, Toutes et
// Aucune, et le resume de ce qui est choisi. En mode Parties, les variantes (la
// Marguerite belge au depart, comme avant) ; en mode Puzzles, les PZL du filtre (tous au
// depart : ce qu'on decoche est retenu, un PZL nouveau dans le filtre est donc coche).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : brancherClicMajuscule
// (interface/clic-majuscule.js) vient d'un fichier charge avant celui-ci.

// `conteneur` : la ou se dessine la liste ; `libelle` : « Variantes » ou « PZL » ;
// `parDefaut(nom)` : coche tant qu'on n'y a pas touche ; `surChange()`. Renvoie
// { remplir(noms), choisis() (les noms coches, dans l'ordre), }.
function creerChoixDesJeuxDuBanc(conteneur, libelle, parDefaut, surChange) {
  const touches = new Map(); // nom -> coche ou non (ce qu'on a change soi-meme)
  let noms = [];
  const estCoche = (nom) => touches.get(nom) ?? parDefaut(nom);
  const details = document.createElement('details');
  details.className = 'banc-choix-jeux';
  const resume = document.createElement('summary');
  const barre = document.createElement('div');
  barre.className = 'banc-choix-jeux-barre';
  const recherche = Object.assign(document.createElement('input'), { type: 'search', placeholder: 'Chercher un nom' });
  const bouton = (texte, titre, coche) => {
    const element = Object.assign(document.createElement('button'), { type: 'button', className: 'bouton-liste-reglage', textContent: texte, title: titre });
    element.addEventListener('click', () => {
      for (const ligne of liste.querySelectorAll('label:not([hidden])')) touches.set(ligne.dataset.nom, coche);
      dessiner();
    });
    return element;
  };
  const liste = document.createElement('div');
  liste.className = 'banc-choix-jeux-liste';
  barre.append(recherche, bouton('Tous', `Cocher tous les ${libelle} affichés`, true), bouton('Aucun', `Décocher tous les ${libelle} affichés`, false));
  details.append(resume, barre, liste);
  conteneur.replaceChildren(details);

  const choisis = () => noms.filter(estCoche);
  function resumer() {
    const coches = choisis();
    const detail = coches.length === noms.length ? `tous (${noms.length})` : coches.length <= 2 ? coches.join(', ') || 'aucun' : `${coches.length} sur ${noms.length}`;
    resume.textContent = `${libelle} : ${detail}`;
  }
  function dessiner() {
    const texte = recherche.value.trim().toLowerCase();
    liste.replaceChildren(
      ...noms.map((nom) => {
        const ligne = document.createElement('label');
        ligne.className = 'ligne-reglage';
        ligne.dataset.nom = nom;
        ligne.hidden = texte !== '' && !nom.toLowerCase().includes(texte);
        const coche = Object.assign(document.createElement('input'), { type: 'checkbox', checked: estCoche(nom) });
        coche.addEventListener('change', () => {
          touches.set(nom, coche.checked);
          resumer();
          surChange();
        });
        ligne.append(coche, ` ${nom}`);
        return ligne;
      })
    );
    resumer();
    surChange();
  }
  recherche.addEventListener('input', dessiner);
  // Maj + clic : toutes les cases entre la precedente et celle-ci.
  brancherClicMajuscule(
    liste,
    () => [[...liste.querySelectorAll('label:not([hidden]) input')]],
    (cases, etat) => {
      for (const coche of cases) touches.set(coche.closest('label').dataset.nom, etat);
      dessiner();
    }
  );

  return {
    remplir(nouveaux) {
      noms = nouveaux;
      dessiner();
    },
    choisis,
  };
}
