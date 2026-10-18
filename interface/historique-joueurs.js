// La boite « Historique des joueurs » (phase 35 ; saab, 2026-10-08) : la liste
// des joueurs suivis, puis le bilan de celui qu'on touche (moteur/historique-joueurs.js).
//
// LE REGISTRE (`kaah-historique-joueurs`) : un resume par partie finie, range a
// part de « Mes parties » — supprimer une partie de la liste (pour la vider
// avant de donner KAAH a des testeurs, par exemple) n'efface pas son historique.
// La premiere fois, il se remplit avec les parties finies deja dans « Mes
// parties » ; ensuite, chaque sauvegarde y note la partie si elle est finie
// (index.html, sauvegarderMaintenant).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : resumeDeLaPartie,
// joueursDeLHistorique, bilanDuJoueur (moteur/historique-joueurs.js),
// listerPartiesEnregistrees, formaterDateAffichage (interface/sauvegarde.js)
// viennent de fichiers charges avant celui-ci.

const CLE_HISTORIQUE_JOUEURS = 'kaah-historique-joueurs';

// { rempli, resumes: { id: resume } } ; jamais d'exception (stockage indisponible : vide).
function lireRegistreDesJoueurs() {
  try {
    const registre = JSON.parse(window.localStorage.getItem(CLE_HISTORIQUE_JOUEURS) ?? 'null');
    if (registre && typeof registre.resumes === 'object') return registre;
  } catch {
    // illisible : on repart de rien, les parties de « Mes parties » le rempliront
  }
  return { rempli: false, resumes: {} };
}

function ecrireRegistreDesJoueurs(registre) {
  try {
    window.localStorage.setItem(CLE_HISTORIQUE_JOUEURS, JSON.stringify(registre));
  } catch {
    // plein ou indisponible : l'historique ne retient pas cette partie, le jeu continue
  }
}

// Note (ou retire, si elle n'est plus finie : on est revenu en arriere) la partie `id`.
function noterPartieDansLHistorique(id, donnees) {
  if (!id) return;
  const registre = lireRegistreDesJoueurs();
  const resume = resumeDeLaPartie(id, donnees);
  if (resume) registre.resumes[id] = resume;
  else if (!(id in registre.resumes)) return;
  else delete registre.resumes[id];
  ecrireRegistreDesJoueurs(registre);
}

function resumesDeLHistorique() {
  const registre = lireRegistreDesJoueurs();
  if (!registre.rempli) {
    for (const { id, donnees } of listerPartiesEnregistrees()) {
      try {
        const resume = resumeDeLaPartie(id, donnees);
        if (resume) registre.resumes[id] ??= resume;
      } catch {
        // une partie illisible n'empeche pas les autres
      }
    }
    registre.rempli = true;
    ecrireRegistreDesJoueurs(registre);
  }
  return Object.values(registre.resumes);
}

const echapperHistorique = (texte) => String(texte).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const pourcentage = ({ parties, gagnees }) => (parties ? `${Math.round((100 * gagnees) / parties)} %` : '—');
const ligneDeCompte = (libelle, compte) =>
  `<tr><td>${libelle}</td><td>${compte.parties}</td><td class="historique-g">${compte.gagnees}</td><td>${compte.nulles}</td><td class="historique-p">${compte.perdues}</td><td>${pourcentage(compte)}</td></tr>`;
const ENTETE_COMPTE = '<tr><th></th><th>Parties</th><th>G</th><th>N</th><th>P</th><th>Gagnées</th></tr>';

const LIBELLES_RECORDS = {
  victoireLaPlusCourte: ['Victoire la plus courte', (v) => `${v} tours`],
  victoireLaPlusLongue: ['Victoire la plus longue', (v) => `${v} tours`],
  victoireLaPlusLarge: ['Victoire la plus large', (v) => `+${v}`],
  defaiteLaPlusCourte: ['Défaite la plus courte', (v) => `${v} tours`],
  defaiteLaPlusLongue: ['Défaite la plus longue', (v) => `${v} tours`],
  defaiteLaPlusLourde: ['Défaite la plus lourde', (v) => `−${v}`],
};
const SORTES_DE_SERIE = { victoires: ['victoire', 'victoires'], nulles: ['nulle', 'nulles'], defaites: ['défaite', 'défaites'] };
const NOMBRE_MAX_DE_LIGNES = 10; // adversaires, variantes : les plus jouees

// `elements` : { bouton, dialogue, contenu, machines (case), retour, fermer } ;
// `chargerPartie(id)` : rouvre une partie de « Mes parties » (faux si elle n'y est plus).
function demarrerHistoriqueJoueurs(elements, chargerPartie) {
  function afficherListe() {
    elements.retour.hidden = true;
    const joueurs = joueursDeLHistorique(resumesDeLHistorique()).filter((joueur) => elements.machines.checked || !joueur.machine);
    const lignes = joueurs.map(
      (joueur) =>
        `<tr class="historique-joueur" data-nom="${echapperHistorique(joueur.nom)}"><td>${joueur.machine ? '🤖 ' : ''}${echapperHistorique(joueur.nom)}</td><td>${joueur.parties}</td><td class="historique-g">${joueur.gagnees}</td><td>${joueur.nulles}</td><td class="historique-p">${joueur.perdues}</td><td>${pourcentage(joueur)}</td></tr>`
    );
    elements.contenu.innerHTML = joueurs.length
      ? `<table class="tableau-historique"><tr><th>Joueur</th><th>Parties</th><th>G</th><th>N</th><th>P</th><th>Gagnées</th></tr>${lignes.join('')}</table>`
      : '<p class="note-reglages">Aucune partie finie entre joueurs nommés pour l’instant.</p>';
    elements.contenu.insertAdjacentHTML('beforeend', '<p class="note-reglages">Les noms par défaut (Joueur_1, Joueur_2…) ne sont pas suivis : donnez votre nom (touchez-le sur le plateau). Les puzzles ont leur propre bilan.</p>');
  }

  function afficherJoueur(nom) {
    elements.retour.hidden = false;
    const bilan = bilanDuJoueur(resumesDeLHistorique(), nom);
    const enCours = bilan.serieEnCours;
    const serie = enCours ? `En cours : ${enCours.longueur} ${SORTES_DE_SERIE[enCours.sorte][enCours.longueur > 1 ? 1 : 0]} de suite · meilleure série : ${bilan.meilleureSerie} victoire${bilan.meilleureSerie > 1 ? 's' : ''}` : '';
    const records = Object.entries(LIBELLES_RECORDS).map(([cle, [libelle, valeur]]) => {
      const record = bilan.records[cle];
      if (!record) return `<tr><td>${libelle}</td><td colspan="3">—</td></tr>`;
      const { resume } = record;
      const enNoir = resume.noir === nom;
      const adversaire = enNoir ? resume.blanc : resume.noir;
      // Le score de son point de vue : ses ejections, puis celles qu'il a subies.
      const score = enNoir ? `${resume.ejecteesBlanches}-${resume.ejecteesNoires}` : `${resume.ejecteesNoires}-${resume.ejecteesBlanches}`;
      return `<tr><td>${libelle}</td><td><b>${valeur(record.valeur)}</b> (${score})</td><td>contre ${echapperHistorique(adversaire)}, ${echapperHistorique(resume.variante)}, ${formaterDateAffichage(resume.date)}</td><td><button class="bouton-dialogue historique-ouvrir" type="button" data-id="${echapperHistorique(record.id)}">Voir</button></td></tr>`;
    });
    const parNom = (comptes) => comptes.slice(0, NOMBRE_MAX_DE_LIGNES).map((compte) => ligneDeCompte(echapperHistorique(compte.nom), compte)).join('');
    elements.contenu.innerHTML = `<h3>${bilan.machine ? '🤖 ' : ''}${echapperHistorique(nom)}</h3>
<table class="tableau-historique">${ENTETE_COMPTE}${ligneDeCompte('<b>Total</b>', bilan)}${ligneDeCompte('en Noir', bilan.parCamp.noir)}${ligneDeCompte('en Blanc', bilan.parCamp.blanc)}${bilan.puzzles.parties ? ligneDeCompte('Puzzles', bilan.puzzles) : ''}</table>
<p class="note-reglages">${serie}</p>
<h4>Records</h4><table class="tableau-historique historique-records">${records.join('')}</table>
<h4>Contre chaque adversaire</h4><table class="tableau-historique">${ENTETE_COMPTE}${parNom(bilan.adversaires)}</table>
<h4>Par variante</h4><table class="tableau-historique">${ENTETE_COMPTE}${parNom(bilan.variantes)}</table>`;
  }

  elements.contenu.addEventListener('click', (evenement) => {
    const voir = evenement.target.closest('.historique-ouvrir');
    if (voir) {
      if (!chargerPartie(voir.dataset.id)) voir.replaceWith(document.createTextNode('plus dans Mes parties'));
      else elements.dialogue.close();
      return;
    }
    const ligne = evenement.target.closest('.historique-joueur');
    if (ligne) afficherJoueur(ligne.dataset.nom);
  });
  elements.machines.addEventListener('change', afficherListe);
  elements.retour.addEventListener('click', afficherListe);
  elements.bouton.addEventListener('click', () => {
    afficherListe();
    elements.dialogue.showModal();
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());
}
