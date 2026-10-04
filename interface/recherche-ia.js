// La recherche de KAI++ par premier coup (saab, 2026-10-02 : « sur quel 1er
// coup l'IA a fait ces recherches aux differents niveaux (ou combien si > 10
// et lesquels 10) et les meilleures sequences trouvees sur chacun ... pour
// voir si elle va chercher trop de coups pour rien ») : un tableau sous
// Reflexion IA, deplie par defaut, sur ordinateur seulement (styles.css : il
// faut de la place). Ses lignes : interface/recherche-ia-lignes.js.
//
// Pendant que KAI++ cherche : sa recherche en direct. Sinon : les recherches
// GARDEES (saab : « enregistrer les tableaux, a part de la partie mais avec un
// lien, pour les revoir a la navigation et comparer ») — moteur/
// archive-recherches.js, dans le stockage du navigateur : d'abord celles qui ont
// choisi le coup qui mene au plateau, puis celles faites sur la position du
// plateau ; plusieurs (Relancer, d'autres reglages) : une liste pour passer de
// l'une a l'autre.
//
// Ou elles vivent (et la case Garder) : interface/stockage-recherches.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : numeroDeTour
// (moteur/arbre.js), cleDeSolution (moteur/sequence-prevue.js),
// recherchesDeLaPosition, TAILLE_ARCHIVE_RECHERCHES_MAX
// (moteur/archive-recherches.js), obtenirIdPartieActive (interface/sauvegarde.js),
// tableauDeLaRecherche (interface/recherche-ia-lignes.js), lireArchiveRecherches,
// garderDansLArchive, gardeLesRecherches, choisirDeGarderLesRecherches,
// oublierLesRecherches, placeDesRecherches, exporterLesRecherches
// (interface/stockage-recherches.js) viennent de fichiers charges avant celui-ci.

const FORMAT_DE_LA_DATE = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const LIBELLES_GENRE_RECHERCHE = { jeu: '', hypothese: ' (aurait joué)', suggestion: ' (suggestion)' };
// Un caractere de l'archive (du texte JSON presque tout en ASCII) pese un octet.
const OCTETS_PAR_KO = 1024;
const PART_PRESQUE_PLEINE = 0.9;
const NOTE_ELAGAGE_RECHERCHE = "« ≤ » : écarté par l'élagage, vaut au plus cela. Touchez un coup : sa séquence sur un plateau.";

// `boite` : le <details> du tableau ; `sequencePrevue` : le petit plateau
// (interface/sequence-prevue.js). Renvoie { afficher(enCours), montrerPosition(etat,
// precedent, coups), garder(recherche) } — `enCours` : la ligne en cours de
// Reflexion IA (interface/ia.js), dont `details` (KAI++), `poids`, `version`,
// `reflexionMax` ; `recherche` : { etat, machine, coupsJoues, camp, genre, details,
// poids, version, reflexionMax }.
function demarrerRechercheIA(boite, sequencePrevue) {
  const entete = boite.querySelector('thead');
  const corps = boite.querySelector('tbody');
  const note = boite.querySelector('.note-recherche-ia');
  const liste = boite.querySelector('.choix-recherche-ia');
  let detailsEnDirect = null; // pendant que KAI++ cherche
  let etatMontre = null; // la position du plateau
  let etatPrecedent = null; // celle d'avant son dernier coup, ou null au debut
  // Les coups joues : celui qui mene au plateau, celui qui en part (encadres).
  let coupsJoues = { dernier: null, suivant: null };
  let gardees = []; // { recherche, etat, coupActif }

  function remplir(details, contexte) {
    const tableau = tableauDeLaRecherche(details, contexte, (sequence, titre) => sequencePrevue.montrer(contexte.etat, sequence, titre));
    entete.replaceChildren(tableau.entete);
    corps.replaceChildren(...tableau.lignes);
  }

  const marque = (camp) => (camp === 'noir' ? '●' : '○');
  const titre = ({ machine, coupsJoues: joues, camp, date, genre }) =>
    `${numeroDeTour(joues)} ${marque(camp)} ${machine}${LIBELLES_GENRE_RECHERCHE[genre] ?? ''} — ${FORMAT_DE_LA_DATE.format(date)}`;

  // Les recherches gardees, celle choisie dans la liste. D'abord celles qui ont
  // choisi le coup qui mene au plateau (saab, 2026-10-02 : « qd je navigue il
  // doit afficher ce qu'il avait deja mis sur le coup correspondant ») — la
  // machine vient de jouer, ou on est alle sur son coup —, puis celles faites
  // sur la position du plateau (ce qu'elle a cherche pour le coup suivant).
  function montrerLesGardees() {
    const archive = lireArchiveRecherches();
    const de = (etat, coupActif) => (etat ? recherchesDeLaPosition(archive, cleDeSolution(etat)).map((recherche) => ({ recherche, etat, coupActif })) : []);
    gardees = [...de(etatPrecedent, coupsJoues.dernier), ...de(etatMontre, coupsJoues.suivant)];
    liste.replaceChildren(
      ...gardees.map(({ recherche }, rang) => {
        const option = document.createElement('option');
        option.value = String(rang);
        option.textContent = titre(recherche);
        return option;
      })
    );
    liste.hidden = gardees.length < 2;
    if (gardees.length === 0) {
      note.textContent = "Aucune recherche de KAI++ gardée pour ce coup ni pour cette position (KAI et le livre d'ouvertures n'en font pas).";
      entete.replaceChildren();
      corps.replaceChildren();
      return;
    }
    montrerLaChoisie();
  }

  function montrerLaChoisie() {
    const { recherche, etat, coupActif } = gardees[Number(liste.value) || 0];
    note.textContent = `${titre(recherche)}${gardees.length > 1 ? ` — ${gardees.length} recherches gardées pour ce coup et cette position` : ''}. ${NOTE_ELAGAGE_RECHERCHE}`;
    remplir(recherche.details, { etat, poids: recherche.poids, version: recherche.version, reflexionMax: recherche.reflexionMax, coupActif });
  }

  liste.addEventListener('change', montrerLaChoisie);

  // Toutes les recherches gardees, en tableau pour Excel (saab, 2026-10-03 :
  // « le btn Exporter pour voir les fichiers »). Dans le titre du tableau : le
  // toucher ne doit pas le replier.
  boite.querySelector('.bouton-exporter-recherches').addEventListener('click', (evenement) => {
    evenement.preventDefault();
    exporterLesRecherches(lireArchiveRecherches());
  });

  // Pleine (saab, 2026-10-03 : « une alerte si c'est plein ... sinon demander si
  // on veut exporter ») : une fois par ouverture, juste avant que les plus
  // anciennes s'effacent, la proposition de les exporter d'abord.
  let pleineSignalee = false;
  function avantDOublier(archive) {
    if (pleineSignalee) return;
    pleineSignalee = true;
    const message = "Les recherches de KAI++ gardées sur cet appareil sont pleines : à partir de maintenant, les plus anciennes s'effacent pour faire de la place aux nouvelles. Les exporter d'abord dans un fichier (pour Excel) ?";
    if (window.confirm(message)) exporterLesRecherches(archive);
  }

  // Leur poids sur l'appareil (saab, 2026-10-03 : « afin de savoir si on doit
  // les exporter/supprimer »), et de quoi les oublier toutes.
  const poids = boite.querySelector('.poids-recherches');
  function afficherPoids() {
    const caracteres = placeDesRecherches();
    poids.textContent = `${Math.ceil(caracteres / OCTETS_PAR_KO)} Ko (max ${Math.round(TAILLE_ARCHIVE_RECHERCHES_MAX / OCTETS_PAR_KO)})`;
    // Presque pleine : en orange, pour penser a exporter ou vider.
    poids.classList.toggle('reglage-modifie', caracteres >= TAILLE_ARCHIVE_RECHERCHES_MAX * PART_PRESQUE_PLEINE);
  }
  boite.querySelector('.bouton-vider-recherches').addEventListener('click', (evenement) => {
    evenement.preventDefault();
    if (!window.confirm('Oublier toutes les recherches de KAI++ gardées sur cet appareil ? (Exporter les garde dans un fichier.)')) return;
    oublierLesRecherches();
    afficherPoids();
    if (detailsEnDirect === null) montrerLesGardees();
  });
  afficherPoids();

  // Garder ou non les recherches sur l'appareil (saab, 2026-10-04) ; sans, elles
  // ne vivent que le temps de cette ouverture. Dans le titre : la toucher ne
  // replie pas le tableau.
  const caseGarder = boite.querySelector('.case-garder-recherches');
  caseGarder.checked = gardeLesRecherches();
  caseGarder.closest('label').addEventListener('click', (evenement) => evenement.stopPropagation());
  caseGarder.addEventListener('change', () => {
    choisirDeGarderLesRecherches(caseGarder.checked);
    afficherPoids();
  });

  function afficher(enCours) {
    const details = enCours?.details;
    if (details) {
      if (details === detailsEnDirect) return;
      detailsEnDirect = details;
      liste.hidden = true;
      note.textContent = `${numeroDeTour(enCours.coupsJoues)} ${marque(enCours.camp)} — en cours. ${NOTE_ELAGAGE_RECHERCHE}`;
      remplir(details, { etat: enCours.etat, poids: enCours.poids, version: enCours.version, reflexionMax: enCours.reflexionMax, coupActif: null });
      return;
    }
    if (detailsEnDirect === null) return;
    detailsEnDirect = null;
    montrerLesGardees();
  }

  // `precedent` : la position d'avant le dernier coup du chemin, null au debut ;
  // `coups` : { dernier, suivant } — les textes des coups joues autour du plateau.
  function montrerPosition(etat, precedent, coups) {
    if (etat === etatMontre && precedent === etatPrecedent) return;
    etatMontre = etat;
    etatPrecedent = precedent;
    coupsJoues = coups;
    if (detailsEnDirect === null) montrerLesGardees();
  }

  function garder({ etat, machine, coupsJoues: joues, camp, genre, details, poids: poidsDeLaMachine, version, reflexionMax }) {
    garderDansLArchive(cleDeSolution(etat), { machine, date: Date.now(), idPartie: obtenirIdPartieActive(), coupsJoues: joues, camp, genre, details, poids: poidsDeLaMachine, version, reflexionMax }, avantDOublier);
    afficherPoids();
    if (detailsEnDirect === null && (etat === etatMontre || etat === etatPrecedent)) montrerLesGardees();
  }

  return { afficher, montrerPosition, garder };
}
