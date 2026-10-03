// Le tableau comparatif des profils de reglages du plateau (saab, 2026-10-03 :
// « un tableau recapitulatif du Plateau, comme Profil IA (lisible ;-)) ») :
// une ligne par reglage, rangees par rubrique comme dans Reglages, une colonne
// par profil (Défaut d'abord) — dans ce sens-la, car il y a bien plus de
// reglages que de profils. En orange, ce qui differe de Défaut (comme dans
// Reglages) ; une couleur s'y voit en pastille, avec son code. Toucher le nom
// d'un profil le choisit dans Reglages. La rubrique Machine a son propre
// tableau (interface/comparaison-ia.js) ; seule sa case Livre est ici.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : reglageDifferentDuDefaut
// (moteur/reglages.js), couleurVersHex (moteur/couleurs.js), CHAMPS_REGLAGES
// (interface/reglages-champs.js), listerNomsProfils, lireReglagesDuProfil
// (interface/reglages-profils.js) viennent de fichiers charges avant celui-ci.

const POURCENT_COMPARAISON = 100;
// Les commandes de Reglages hors de la table d'interface/reglages-champs.js :
// [id, genre, categorie, cle].
const AUTRES_COMMANDES_COMPARAISON = [
  ['case-mode-simple', 'simple', 'board', 'show_shadows'],
  ['case-pendules-horizontales', 'case', 'kaah', 'horizontal_clocks'],
  ['select-base-coups', 'texte', 'nextmove', 'bdd_file'],
];

// La valeur d'un reglage, lisible : une couleur en pastille et code, une case
// en oui / non, une transparence en pourcentage (comme son curseur).
function celluleDeReglage(genre, valeur) {
  const td = document.createElement('td');
  if (genre === 'couleur') {
    const hex = couleurVersHex(valeur);
    const pastille = document.createElement('span');
    pastille.className = 'pastille-comparaison';
    pastille.style.background = hex;
    td.append(pastille, ` ${hex}`);
    return td;
  }
  const textes = {
    case: () => (valeur ? 'oui' : 'non'),
    simple: () => (valeur ? 'non' : 'oui'), // « Mode simple » : sans relief
    transparence: () => `${Math.round((1 - valeur) * POURCENT_COMPARAISON)} %`,
  };
  td.textContent = (textes[genre] ?? (() => String(valeur)))();
  return td;
}

// Le libelle d'une commande : le texte de sa ligne, sans celui des boutons − et +.
function libelleDeCommande(commande) {
  const ligne = commande.closest('label');
  if (!ligne) return commande.getAttribute('aria-label') ?? commande.id;
  return [...ligne.childNodes].filter((noeud) => noeud.nodeType === Node.TEXT_NODE).map((noeud) => noeud.textContent).join(' ').trim();
}

// `elements` : { bouton, dialogue, tableau, fermer, reglages (le dialogue
// Reglages), selectProfil }.
function demarrerComparaisonReglages(elements) {
  const commandes = new Map([...CHAMPS_REGLAGES, ...AUTRES_COMMANDES_COMPARAISON].map(([id, genre, categorie, cle]) => [id, { genre, categorie, cle }]));

  function remplir() {
    const noms = listerNomsProfils();
    const profils = noms.map((nom) => lireReglagesDuProfil(nom));
    const entete = document.createElement('tr');
    entete.append(document.createElement('th'));
    noms.forEach((nom, rang) => {
      const th = document.createElement('th');
      th.textContent = nom;
      th.className = 'comparaison-nom-profil';
      th.title = 'Toucher pour choisir ce profil dans Réglages';
      const differe = [...commandes.values()].some(({ categorie, cle }) => reglageDifferentDuDefaut(profils[rang], categorie, cle));
      th.classList.toggle('reglage-modifie', differe);
      th.addEventListener('click', () => {
        elements.dialogue.close();
        elements.selectProfil.value = nom;
        elements.selectProfil.dispatchEvent(new Event('change'));
      });
      entete.append(th);
    });
    const lignes = [];
    for (const rubrique of elements.reglages.querySelectorAll('details.rubrique-reglages')) {
      const presentes = [...rubrique.querySelectorAll('[id]')].filter((commande) => commandes.has(commande.id));
      if (presentes.length === 0) continue;
      const titre = document.createElement('tr');
      titre.className = 'comparaison-rubrique';
      const cellule = document.createElement('td');
      cellule.colSpan = noms.length + 1;
      cellule.textContent = rubrique.querySelector('summary').textContent.trim();
      titre.append(cellule);
      lignes.push(titre);
      for (const commande of presentes) {
        const { genre, categorie, cle } = commandes.get(commande.id);
        const tr = document.createElement('tr');
        const libelle = document.createElement('td');
        libelle.textContent = libelleDeCommande(commande);
        tr.append(
          libelle,
          ...profils.map((reglages) => {
            const td = celluleDeReglage(genre, reglages[categorie][cle]);
            td.classList.toggle('reglage-modifie', reglageDifferentDuDefaut(reglages, categorie, cle));
            return td;
          })
        );
        lignes.push(tr);
      }
    }
    elements.tableau.replaceChildren(entete, ...lignes);
  }

  elements.bouton.addEventListener('click', () => {
    remplir();
    elements.dialogue.showModal();
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
}
