// IMPORTER DES VARIANTES cochees (saab, 2026-11-08 : « il faudrait que je puisse charger que ce que je veux, non ? » —
// apres avoir importe d'un coup les 171 positions en deux blocs) : Importer My (Variantes) ne fusionne plus tout le
// fichier, il ouvre cette boite — une case par variante du fichier, decochee au depart (on choisit), « Tout cocher »,
// puis Importer : les cochees rejoignent les variantes My (moteur/positions-my.js, importerEntreesMy, qui renomme un nom
// deja pris). Une variante dont la position est deja parmi les siennes est grisee, « déjà là ». Meme modele que
// l'import des parties d'une sauvegarde (interface/import-parties.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : listerEntreesMy, importerEntreesMy (interface/positions-my.js) et
// pluriel (interface/fin-entrainement.js) viennent d'autres fichiers du jeu, appeles seulement a l'usage.

// `elements` : { dialogue, fichier, toutCocher, liste, importer, fermer, message } ; `apresImport()` : les variantes My
// ont change (index.html : recharger pour les montrer). Renvoie { ouvrir(variantes) } — `variantes` : le `content` du
// fichier (format KAAWA).
function demarrerImportDesVariantes(elements, apresImport) {
  let variantes = [];
  const casesLibres = () => [...elements.liste.querySelectorAll('input[type="checkbox"]:not(:disabled)')];

  function actualiserLeBouton() {
    const cochees = casesLibres().filter((coche) => coche.checked).length;
    elements.importer.disabled = cochees === 0;
    elements.importer.textContent = `Importer ${cochees}`;
    elements.toutCocher.checked = cochees > 0 && cochees === casesLibres().length;
    elements.toutCocher.disabled = casesLibres().length === 0;
  }

  function ligneDeVariante(variante, rang, dejaLa) {
    const ligne = document.createElement('label');
    ligne.className = `ligne-liste ligne-import-partie${dejaLa ? ' deja-la' : ''}`;
    const coche = document.createElement('input');
    coche.type = 'checkbox';
    coche.dataset.rang = String(rang);
    coche.disabled = dejaLa;
    const titre = document.createElement('span');
    titre.textContent = variante.variant_name ?? `Variante ${rang + 1}`;
    titre.title = variante.pos ?? '';
    ligne.append(coche, titre);
    if (dejaLa) {
      const raison = document.createElement('span');
      raison.className = 'raison-deja-la';
      raison.textContent = ' — déjà là';
      ligne.append(raison);
    }
    return ligne;
  }

  elements.toutCocher.addEventListener('change', () => {
    for (const coche of casesLibres()) coche.checked = elements.toutCocher.checked;
    actualiserLeBouton();
  });
  elements.liste.addEventListener('change', actualiserLeBouton);
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
  elements.importer.addEventListener('click', () => {
    const choisies = casesLibres().filter((coche) => coche.checked).map((coche) => variantes[Number(coche.dataset.rang)]);
    if (choisies.length === 0) return;
    let renommees;
    try {
      renommees = importerEntreesMy('variantes', choisies);
    } catch (erreur) {
      elements.message.textContent = `Fichier illisible : ${erreur.message}`;
      return;
    }
    if (renommees === null) {
      elements.message.textContent = "Rien n'est importé : le stockage du navigateur est plein ou indisponible.";
      return;
    }
    const suffixe = renommees.length > 0 ? `, dont ${renommees.length} renommée(s) (nom déjà pris)` : '';
    window.alert(`${pluriel(choisies.length, 'variante')} importée(s)${suffixe}.`);
    elements.dialogue.close();
    apresImport();
  });

  function ouvrir(nouvelles) {
    variantes = nouvelles;
    const positionsDejaLa = new Set(listerEntreesMy('variantes').map((entree) => entree.pos));
    const lignes = variantes.map((variante, rang) => ligneDeVariante(variante, rang, positionsDejaLa.has(variante.pos)));
    const dejaLa = variantes.filter((variante) => positionsDejaLa.has(variante.pos)).length;
    elements.fichier.textContent = `${pluriel(variantes.length, 'variante')} dans ce fichier${dejaLa > 0 ? `, dont ${dejaLa} déjà parmi les vôtres` : ''}. Cochez celles à importer.`;
    elements.liste.replaceChildren(...lignes);
    elements.message.textContent = '';
    actualiserLeBouton();
    elements.dialogue.showModal();
  }

  return { ouvrir };
}
