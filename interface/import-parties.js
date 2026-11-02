// IMPORTER DES PARTIES d'une sauvegarde (saab, 2026-10-31 : « je voudrais voir si je peux facilement choisir d'importer
// une partie ou des parties de ce fichier sinon ça ne va pas » ; « Oui, fais le » ; « Et pour la corbeille aussi il faut
// pouvoir la récupérer ») : Importer (l'icone de la colonne de gauche) reconnait un fichier « Exporter tout » ou
// KAAH_stockage_plein_ ; cette boite montre ses parties, la plus recente en haut, puis sa Corbeille, une case chacune —
// cochees a l'ouverture, sauf ce qui est deja ici ou en double dans le fichier (moteur/sauvegarde-complete.js,
// partiesAImporter, corbeilleAImporter) —, « Tout cocher », puis Importer : les parties cochees s'ajoutent a Mes
// parties, les elements de Corbeille retournent dans la Corbeille (d'ou chacun se restaure comme d'habitude) ; rien
// d'autre ne change.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lireSauvegardeComplete, partiesDeLaSauvegarde,
// partiesAImporter, corbeilleDeLaSauvegarde, corbeilleAImporter (moteur/sauvegarde-complete.js), nomDeFichierKAAWA
// (moteur/nom-partie.js), listerPartiesEnregistrees, ecrirePartiesEnregistrees, CLE_MES_PARTIES
// (interface/sauvegarde.js), listerCorbeille, ecrireCorbeille, nomAfficheCorbeille, CLE_CORBEILLE,
// actualiserBoutonsCorbeille (interface/corbeille.js), pluriel (interface/fin-entrainement.js) viennent d'autres
// fichiers du jeu, appeles seulement a l'usage.

const RAISONS_DEJA_LA = Object.freeze({ 'mes-parties': 'déjà dans Mes parties', corbeille: 'déjà dans la Corbeille', fichier: 'en double dans ce fichier' });
const GENRES_DE_LA_CORBEILLE_IMPORTEE = Object.freeze({ parties: 'Partie', puzzles: 'Puzzle My', variantes: 'Variante My', 'profils-entrainement': "Profil d'Entraînement" });

// Les donnees d'un fichier « Exporter tout » (ou KAAH_stockage_plein_), ou null si ce n'en est pas un.
function donneesDeLaSauvegardeDuTexte(texte) {
  try {
    return lireSauvegardeComplete(JSON.parse(texte));
  } catch {
    return null;
  }
}

function titreDeLaPartieImportee(donnees) {
  try {
    return nomDeFichierKAAWA(donnees);
  } catch {
    return `Partie du ${donnees.Date ?? '?'} (titre illisible)`;
  }
}

// Une ligne : sa case (`source` et `rang` pour la retrouver), son texte, et pourquoi elle est grisee.
function ligneAImporter(texte, dejaLa, source, rang) {
  const ligne = document.createElement('label');
  ligne.className = `ligne-liste ligne-import-partie${dejaLa ? ' deja-la' : ''}`;
  const coche = document.createElement('input');
  coche.type = 'checkbox';
  coche.dataset.source = source;
  coche.dataset.rang = String(rang);
  coche.disabled = Boolean(dejaLa);
  const titre = document.createElement('span');
  titre.textContent = texte;
  ligne.append(coche, titre);
  if (dejaLa) {
    const raison = document.createElement('span');
    raison.className = 'raison-deja-la';
    raison.textContent = ` — ${RAISONS_DEJA_LA[dejaLa]}`;
    ligne.append(raison);
  }
  return ligne;
}

// `elements` : { dialogue, fichier, toutCocher, liste, titreCorbeille, corbeille, importer, fermer, message } ;
// `apresImport()` : Mes parties a change (sa jauge). Renvoie { ouvrir(nomDuFichier, donnees) } — `donnees` :
// donneesDeLaSauvegardeDuTexte.
function demarrerImportDesParties(elements, apresImport) {
  let ouvert = null;
  let parties = [];
  let corbeille = [];
  const casesLibres = () => [...elements.dialogue.querySelectorAll('.liste-import-parties input[type="checkbox"]:not(:disabled)')];

  function actualiserLeBouton() {
    const cochees = casesLibres().filter((coche) => coche.checked).length;
    elements.importer.disabled = cochees === 0;
    elements.importer.textContent = `Importer ${cochees}`;
    elements.toutCocher.checked = cochees > 0 && cochees === casesLibres().length;
    elements.toutCocher.disabled = casesLibres().length === 0;
  }

  // `cochees` : a l'ouverture, tout ce qui est nouveau ; apres un import, rien — ce qu'on n'a pas pris le reste, un
  // second toucher sur Importer n'emporte pas tout.
  function afficher(cochees) {
    parties = partiesAImporter(listerPartiesEnregistrees(), partiesDeLaSauvegarde(ouvert.donnees, CLE_MES_PARTIES));
    corbeille = corbeilleAImporter(listerCorbeille(), corbeilleDeLaSauvegarde(ouvert.donnees, CLE_CORBEILLE));
    const nouvelles = (liste) => liste.filter((element) => !element.dejaLa).length;
    elements.fichier.textContent = `${ouvert.nom} : ${pluriel(parties.length, 'partie')} (${nouvelles(parties)} pas encore dans Mes parties) ; sa Corbeille : ${pluriel(corbeille.length, 'élément')} (${nouvelles(corbeille)} pas encore dans la vôtre).`;
    // La plus recente en haut (comme Mes parties) : la partie en cours d'un stockage plein est la derniere du fichier.
    elements.liste.replaceChildren(...parties.map((partie, rang) => ligneAImporter(titreDeLaPartieImportee(partie.donnees), partie.dejaLa, 'parties', rang)).reverse());
    elements.corbeille.replaceChildren(
      ...corbeille.map(({ entree, dejaLa }, rang) => ligneAImporter(`${GENRES_DE_LA_CORBEILLE_IMPORTEE[entree.genre] ?? entree.genre} : ${nomAfficheCorbeille(entree)}`, dejaLa, 'corbeille', rang)).reverse()
    );
    elements.titreCorbeille.hidden = corbeille.length === 0;
    elements.corbeille.hidden = corbeille.length === 0;
    for (const coche of casesLibres()) coche.checked = cochees;
    actualiserLeBouton();
  }

  elements.toutCocher.addEventListener('change', () => {
    for (const coche of casesLibres()) coche.checked = elements.toutCocher.checked;
    actualiserLeBouton();
  });
  elements.dialogue.addEventListener('change', (evenement) => {
    if (evenement.target !== elements.toutCocher) actualiserLeBouton();
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
  elements.importer.addEventListener('click', () => {
    const choisies = (source) => casesLibres().filter((coche) => coche.checked && coche.dataset.source === source).map((coche) => Number(coche.dataset.rang));
    const ajoutees = choisies('parties').map((rang) => ({ id: parties[rang].id, donnees: parties[rang].donnees }));
    const remises = choisies('corbeille').map((rang) => corbeille[rang].entree);
    const plein = "Le stockage du navigateur est plein : faites d'abord de la place (Mes parties, puis la Corbeille), puis recommencez.";
    if (ajoutees.length > 0 && !ecrirePartiesEnregistrees([...listerPartiesEnregistrees(), ...ajoutees])) {
      elements.message.textContent = `Rien n'est importé. ${plein}`;
      return;
    }
    const corbeilleEcrite = remises.length === 0 || ecrireCorbeille([...listerCorbeille(), ...remises]);
    actualiserBoutonsCorbeille();
    apresImport();
    // La boite reste ouverte : ce qui est importe y passe « déjà dans Mes parties » (ou « … la Corbeille »).
    afficher(false);
    const faits = [ajoutees.length > 0 ? `${pluriel(ajoutees.length, 'partie')} ajoutée${ajoutees.length > 1 ? 's' : ''} à Mes parties` : '', remises.length > 0 && corbeilleEcrite ? `${pluriel(remises.length, 'élément')} remis dans la Corbeille` : ''].filter(Boolean);
    elements.message.textContent = `${faits.join(', ')}.${corbeilleEcrite ? '' : ` La Corbeille n'a rien reçu. ${plein}`}`;
  });

  function ouvrir(nom, donnees) {
    ouvert = { nom, donnees };
    elements.message.textContent = '';
    afficher(true);
    elements.dialogue.showModal();
  }

  return { ouvrir };
}
