// Reorganiser les groupes d'icones de la colonne de gauche (saab : "pouvoir
// reorganiser les icones dans la barre par groupe" ; groupes seulement, avec des
// fleches — son choix, plus fiable au doigt qu'un glisser-deposer qui se
// confondrait avec le defilement de la colonne).
//
// Reglages > « Réorganiser les groupes » passe la colonne en mode
// reorganisation : chaque groupe recoit ▲ en haut et ▼ en bas, les vrais
// boutons ne repondent plus, un ✓ en tete de colonne termine. Chaque fleche
// deplace le groupe tout de suite et l'ordre est retenu (localStorage, a part
// des reglages de KAAWA dont le fichier n'en sait rien). « Ordre d'origine »
// revient a celui d'index.html. Les groupes sont DEPLACES (appendChild), jamais
// reconstruits : leurs boutons gardent leurs ecouteurs de clic.
//
// La regle de l'ordre (ordre retenu, groupe nouveau, deplacement) est dans
// moteur/ordre-groupes.js ; ce fichier ne fait que deplacer et retenir.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ordonnerGroupes,
// deplacerGroupe (moteur/ordre-groupes.js) viennent d'un fichier charge avant
// celui-ci.

const CLE_ORDRE_COLONNE = 'kaah-ordre-groupes-colonne';

function lireOrdreColonne() {
  try {
    const ordre = JSON.parse(window.localStorage.getItem(CLE_ORDRE_COLONNE) ?? '[]');
    return Array.isArray(ordre) ? ordre : [];
  } catch {
    return [];
  }
}

function ecrireOrdreColonne(ordre) {
  try {
    window.localStorage.setItem(CLE_ORDRE_COLONNE, JSON.stringify(ordre));
  } catch {
    // Tant que la page reste ouverte, l'ordre vaut quand meme.
  }
}

// La cle stable d'un groupe : l'identifiant de son premier vrai bouton.
function cleDuGroupe(groupe) {
  return groupe.querySelector('button:not(.fleche-groupe)')?.id ?? '';
}

// Une fleche ▲ ou ▼ du mode reorganisation.
function creerFlecheGroupe(symbole, titre, surClic) {
  const fleche = document.createElement('button');
  fleche.type = 'button';
  fleche.className = 'fleche-groupe';
  fleche.textContent = symbole;
  fleche.title = titre;
  fleche.setAttribute('aria-label', titre);
  fleche.addEventListener('click', surClic);
  return fleche;
}

// `elements` : { colonne (#colonne-gauche), conteneur (#boutons-sauvegarde),
// reorganiser, ordreOrigine (les deux boutons de Reglages), dialogueReglages }.
function demarrerOrdreColonne(elements) {
  const groupes = [...elements.conteneur.querySelectorAll(':scope > .groupe-boutons')];
  const ordreDOrigine = groupes.map(cleDuGroupe);
  const groupeDe = new Map(groupes.map((groupe) => [cleDuGroupe(groupe), groupe]));
  let ordre = ordonnerGroupes(ordreDOrigine, lireOrdreColonne());

  function afficher() {
    for (const cle of ordre) elements.conteneur.appendChild(groupeDe.get(cle));
  }

  function deplacer(cle, sens) {
    ordre = deplacerGroupe(ordre, cle, sens);
    ecrireOrdreColonne(ordre);
    afficher();
    groupeDe.get(cle).scrollIntoView({ block: 'nearest' });
  }

  for (const [cle, groupe] of groupeDe) {
    groupe.prepend(creerFlecheGroupe('▲', 'Monter ce groupe', () => deplacer(cle, -1)));
    groupe.append(creerFlecheGroupe('▼', 'Descendre ce groupe', () => deplacer(cle, 1)));
  }

  const terminer = creerFlecheGroupe('✓', 'Terminer la réorganisation', () => basculer(false));
  terminer.id = 'bouton-fin-reorganisation';
  terminer.hidden = true;
  elements.colonne.insertBefore(terminer, elements.conteneur);

  function basculer(actif) {
    elements.colonne.classList.toggle('colonne-en-reorganisation', actif);
    terminer.hidden = !actif;
  }

  elements.reorganiser.addEventListener('click', () => {
    elements.dialogueReglages.close();
    basculer(true);
  });
  elements.ordreOrigine.addEventListener('click', () => {
    ordre = [...ordreDOrigine];
    ecrireOrdreColonne([]);
    afficher();
  });

  afficher();
}
