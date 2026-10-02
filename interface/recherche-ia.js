// La recherche de KAI++ par premier coup (saab, 2026-10-02 : « sur quel 1er
// coup l'IA a fait ces recherches aux differents niveaux (ou combien si > 10
// et lesquels 10) et les meilleures sequences trouvees sur chacun ... pour
// voir si elle va chercher trop de coups pour rien ») : un tableau sous
// Reflexion IA, sur ordinateur seulement (styles.css : il faut de la place).
// Pour chaque profondeur finie, la plus profonde en haut : combien de premiers
// coups, combien de positions ; puis les 10 meilleurs premiers coups — leur
// valeur (« ≤ » : ecarte par l'elagage, il vaut au plus cela), les positions
// examinees sous lui et leur part, sa sequence ; et ce qu'ont coute les autres.
//
// Pendant que KAI++ cherche : sa recherche en direct. Sinon : les recherches
// GARDEES pour la position du plateau (saab : « enregistrer les tableaux, a
// part de la partie mais avec un lien, pour les revoir a la navigation et
// comparer ») — moteur/archive-recherches.js, dans le stockage du navigateur ;
// plusieurs (Relancer, d'autres reglages) : une liste pour passer de l'une a
// l'autre.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : libelleEvaluation
// (moteur/ia.js), numeroDeTour (moteur/arbre.js), cleDeSolution
// (moteur/sequence-prevue.js), ajouterRecherche, recherchesDeLaPosition,
// ARCHIVE_RECHERCHES_VIDE, TAILLE_ARCHIVE_RECHERCHES_MAX
// (moteur/archive-recherches.js), obtenirIdPartieActive (interface/
// sauvegarde.js) viennent de fichiers charges avant celui-ci.

const POURCENT_RECHERCHE_IA = 100;
const FORMAT_DES_NOMBRES = new Intl.NumberFormat('fr-FR');
const FORMAT_DE_LA_DATE = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const CLE_ARCHIVE_RECHERCHES = 'kaah-recherches-ia';
const ESSAIS_D_ECRITURE_ARCHIVE = 3; // en reduisant de moitie a chaque refus du stockage
const LIBELLES_GENRE_RECHERCHE = { jeu: '', hypothese: ' (aurait joué)', suggestion: ' (suggestion)' };

function partEnPourcent(partie, total) {
  return total > 0 ? `${Math.round((partie / total) * POURCENT_RECHERCHE_IA)} %` : '';
}

function lireArchiveRecherches() {
  try {
    return JSON.parse(window.localStorage.getItem(CLE_ARCHIVE_RECHERCHES)) ?? ARCHIVE_RECHERCHES_VIDE;
  } catch {
    return ARCHIVE_RECHERCHES_VIDE;
  }
}

// Le stockage plein (les parties d'abord) : l'archive se resserre.
function garderDansLArchive(cle, recherche) {
  let tailleMax = TAILLE_ARCHIVE_RECHERCHES_MAX;
  for (let essai = 0; essai < ESSAIS_D_ECRITURE_ARCHIVE; essai++, tailleMax /= 2) {
    try {
      window.localStorage.setItem(CLE_ARCHIVE_RECHERCHES, JSON.stringify(ajouterRecherche(lireArchiveRecherches(), cle, recherche, tailleMax)));
      return;
    } catch {
      // Essai suivant, plus petit.
    }
  }
}

// `boite` : le <details> du tableau. Renvoie { afficher(enCours), montrerPosition(etat),
// garder(recherche) } — `enCours` : la ligne en cours de Reflexion IA
// (interface/ia.js), dont `details` (KAI++) ; `recherche` : { etat, machine,
// coupsJoues, camp, genre, details }.
function demarrerRechercheIA(boite) {
  const corps = boite.querySelector('tbody');
  const note = boite.querySelector('.note-recherche-ia');
  const liste = boite.querySelector('.choix-recherche-ia');
  let detailsEnDirect = null; // pendant que KAI++ cherche
  let etatMontre = null; // la position du plateau
  let gardees = [];

  function cellule(texte, classe) {
    const td = document.createElement('td');
    td.textContent = texte;
    if (classe) td.className = classe;
    return td;
  }

  function lignesDeLaProfondeur({ profondeur, coups, noeuds, lignes }) {
    const sousLesMeilleurs = lignes.reduce((total, ligne) => total + ligne.noeuds, 0);
    const autres = coups - lignes.length;
    const entete = document.createElement('tr');
    entete.className = 'recherche-ia-profondeur';
    const resume = cellule(
      `Prof. ${profondeur} : ${coups} premiers coups, ${FORMAT_DES_NOMBRES.format(noeuds)} positions` +
        (autres > 0 ? ` — les ${autres} autres : ${FORMAT_DES_NOMBRES.format(noeuds - sousLesMeilleurs)} (${partEnPourcent(noeuds - sousLesMeilleurs, noeuds)})` : '')
    );
    resume.colSpan = 5;
    entete.append(resume);
    const rangees = lignes.map(({ valeur, exacte, noeuds: sous, sequence }, rang) => {
      const tr = document.createElement('tr');
      tr.append(
        cellule(String(rang + 1)),
        cellule(sequence[0] ?? '', 'recherche-ia-coup'),
        cellule(`${exacte ? '' : '≤ '}${libelleEvaluation(valeur)}`),
        cellule(`${FORMAT_DES_NOMBRES.format(sous)} (${partEnPourcent(sous, noeuds)})`),
        cellule(sequence.slice(1).join(' '), 'sequence-prevue')
      );
      if (rang === 0) tr.classList.add('recherche-ia-choisi');
      return tr;
    });
    return [entete, ...rangees];
  }

  function remplir(details) {
    corps.replaceChildren(...[...details].reverse().flatMap(lignesDeLaProfondeur));
  }

  const marque = (camp) => (camp === 'noir' ? '●' : '○');
  const titre = ({ machine, coupsJoues, camp, date, genre }) =>
    `${numeroDeTour(coupsJoues)} ${marque(camp)} ${machine}${LIBELLES_GENRE_RECHERCHE[genre] ?? ''} — ${FORMAT_DE_LA_DATE.format(date)}`;

  // Les recherches gardees pour la position du plateau, celle choisie dans la liste.
  function montrerLesGardees() {
    gardees = etatMontre ? recherchesDeLaPosition(lireArchiveRecherches(), cleDeSolution(etatMontre)) : [];
    liste.replaceChildren(
      ...gardees.map((recherche, rang) => {
        const option = document.createElement('option');
        option.value = String(rang);
        option.textContent = titre(recherche);
        return option;
      })
    );
    liste.hidden = gardees.length < 2;
    if (gardees.length === 0) {
      note.textContent = 'Aucune recherche de KAI++ gardée pour cette position.';
      corps.replaceChildren();
      return;
    }
    montrerLaChoisie();
  }

  function montrerLaChoisie() {
    const recherche = gardees[Number(liste.value) || 0];
    note.textContent = `${titre(recherche)}${gardees.length > 1 ? ` — ${gardees.length} recherches gardées pour cette position` : ''}. « ≤ » : écarté par l'élagage, vaut au plus cela.`;
    remplir(recherche.details);
  }

  liste.addEventListener('change', montrerLaChoisie);

  function afficher(enCours) {
    const details = enCours?.details;
    if (details) {
      if (details === detailsEnDirect) return;
      detailsEnDirect = details;
      liste.hidden = true;
      note.textContent = `${numeroDeTour(enCours.coupsJoues)} ${marque(enCours.camp)} — en cours. « ≤ » : écarté par l'élagage, vaut au plus cela.`;
      remplir(details);
      return;
    }
    if (detailsEnDirect === null) return;
    detailsEnDirect = null;
    montrerLesGardees();
  }

  function montrerPosition(etat) {
    if (etat === etatMontre) return;
    etatMontre = etat;
    if (detailsEnDirect === null) montrerLesGardees();
  }

  function garder({ etat, machine, coupsJoues, camp, genre, details }) {
    garderDansLArchive(cleDeSolution(etat), { machine, date: Date.now(), idPartie: obtenirIdPartieActive(), coupsJoues, camp, genre, details });
    if (detailsEnDirect === null && etat === etatMontre) montrerLesGardees();
  }

  return { afficher, montrerPosition, garder };
}
