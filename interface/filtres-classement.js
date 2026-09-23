// La rangee de boutons de classement des dialogues Variantes et Puzzles (phase
// 20ter) : « Toutes · Equilibrees · Handi · Bloc defensif... », « Tous · Easy ·
// Medium... ». Une seule rangee, a defilement horizontal (la barre de defilement reste
// visible : on ne doit jamais avoir a deviner qu'on peut defiler), boutons de 44 px.
// Le filtre choisi est retenu d'une ouverture a l'autre dans localStorage (une cle par
// dialogue). Les favoris restent en tete de liste, au-dessus de tout filtre (voir
// interface/variantes.js et interface/puzzles.js). Ce qui appartient a chaque
// categorie est decide par moteur/classement.js, jamais ici.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// `conteneur` : l'element qui recoit les boutons. `categories` : celles qui ont au
// moins un element, avec leur `nombre` (moteur.categoriesNonVides). `surChangement()` :
// appelee apres chaque choix. Renvoie { cle() } : la categorie courante.
function creerBarreFiltres(conteneur, categories, cleStockage, surChangement) {
  let courante = 'tous';
  try {
    const retenue = window.localStorage.getItem(cleStockage);
    if (categories.some((categorie) => categorie.cle === retenue)) courante = retenue;
  } catch {
    // stockage indisponible : « Toutes »
  }

  const boutons = new Map();
  // Le nombre d'elements de la categorie, sur le bouton lui-meme (saab : "indiquer
  // le nb sur chaque bouton de Variantes et chaque type, PZL, Mini, etc.").
  for (const { cle, libelle, nombre } of categories) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bouton-filtre';
    bouton.textContent = `${libelle} (${nombre})`;
    bouton.addEventListener('click', () => {
      courante = cle;
      try {
        window.localStorage.setItem(cleStockage, cle);
      } catch {
        // Tant que la page reste ouverte, le choix vaut quand meme.
      }
      marquerActif();
      surChangement();
    });
    boutons.set(cle, bouton);
    conteneur.appendChild(bouton);
  }

  function marquerActif() {
    for (const [cle, bouton] of boutons) bouton.classList.toggle('bouton-actif', cle === courante);
  }
  marquerActif();

  return { cle: () => courante };
}
