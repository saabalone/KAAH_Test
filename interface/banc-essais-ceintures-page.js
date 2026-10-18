// Le Banc d'essais, les CEINTURES DES IA : la serie (un passage par profil et par
// sorte, interface/banc-essais-ceintures.js), son tableau, et la ceinture retenue pour
// chaque IA (saab, 2026-10-11 : « sa plus haute ceinture est attribuée à l'IA, comme ça
// on pourra leur mettre une mini icône ceinture (partie/PZL) » —
// `kaah-ceintures-ia` : { 'profil|niveau|reflexion': { variantes, pzl } }).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : passerLesCeintures, testerLesCeintures
// (interface/banc-essais-ceintures-passage.js),
// LIBELLES_SORTES_DU_PASSAGE, SENS_DU_PASSAGE, CLE_CEINTURES_DES_IA
// (interface/banc-essais-ceintures.js), CEINTURES (moteur/entrainement.js),
// nomDeLaCeinture (interface/entrainement-ceintures.js), profilEntrainementActif
// (interface/profils-entrainement.js), echapperBanc (interface/banc-essais-page.js),
// formaterDateKAAWA (interface/sauvegarde.js), nomDuFichierDesCeintures
// (moteur/banc-noms.js), nomDeMachineDuBanc (interface/banc-essais-choix.js) viennent de
// fichiers charges avant celui-ci.

const cleDeLIA = (candidat) => `${candidat.nom}|niv${candidat.niveau}|${candidat.temps}s`;

// La ceinture d'une IA, retenue (ou remplacee) apres un passage termine.
function retenirLaCeintureDeLIA(candidat, sorte, ceinture) {
  try {
    const toutes = JSON.parse(window.localStorage.getItem(CLE_CEINTURES_DES_IA) ?? '{}');
    toutes[cleDeLIA(candidat)] = { ...toutes[cleDeLIA(candidat)], [sorte]: { ceinture, date: formaterDateKAAWA(new Date()), profilEntrainement: profilEntrainementActif().nom } };
    window.localStorage.setItem(CLE_CEINTURES_DES_IA, JSON.stringify(toutes));
  } catch {
    // stockage indisponible : la ceinture reste dans le tableau
  }
}

function etatDuPassageHtml(passage) {
  if (!passage) return '';
  const jeux = `${passage.journal.length} jeu${passage.journal.length > 1 ? 'x' : ''}`;
  if (!passage.commence) return '<span class="note-reglages">en attente</span>';
  const etat = `<span class="note-reglages">${passage.raison ? `${jeux}, arrêt : ${passage.raison}` : `en cours, ${jeux}`}</span>`;
  // Tout tester : chaque grade et l'issue de sa serie, du plus haut au plus bas.
  const grades = (passage.grades ?? []).map(({ grade, issue }) => `<span class="${issue === 'réussie' ? 'resultat-reussi' : issue === 'ratée' ? 'resultat-rate' : 'note-reglages'}">${issue === 'réussie' ? '✓' : issue === 'ratée' ? '✗' : '…'} ${echapperBanc(CEINTURES[grade].nom)}${issue === 'réussie' || issue === 'ratée' ? '' : ` (${issue})`}</span>`);
  return `${nomDeLaCeinture(CEINTURES[passage.ceinture])}<br>${etat}${grades.length ? `<br>${grades.join('<br>')}` : ''}`;
}

function journalDuPassageHtml(passage, nom) {
  const lignes = passage.journal.map((jeu, rang) => `<tr><td>${rang + 1}</td><td>${echapperBanc(CEINTURES[jeu.ceinture].nom)}</td><td>${echapperBanc(jeu.nom)}</td><td>${SENS_DU_PASSAGE[passage.sorte][jeu.sens]}</td><td>${jeu.reussi ? '<span class="resultat-reussi">✓</span>' : '<span class="resultat-rate">✗</span>'}</td><td>${echapperBanc(jeu.issue ?? '')}</td><td>${echapperBanc(jeu.evenement)}</td></tr>`);
  return `<details><summary>${echapperBanc(nom)} — ${LIBELLES_SORTES_DU_PASSAGE[passage.sorte]} (${passage.journal.length} jeux)</summary><table class="banc-tableau"><tr><th>#</th><th>Ceinture</th><th>Jeu</th><th>Sens</th><th></th><th>Issue</th><th>Suite</th></tr>${lignes.join('')}</table></details>`;
}

// La serie du banc (interface/banc-essais.js, lancer) : une tache par profil et par sorte.
// `essais` : les profils coches ; `sortes` : ['variantes', 'pzl'] ; `jeux` : { variantes,
// puzzles } ; `obtenirControle()` : { arret, pause, reprendre } ; `cibleDeDepart` : la
// ceinture visee d'abord (null : la suivante) ; `toutTester` : la serie de chaque grade,
// de la visee jusqu'a la blanche (interface/banc-essais-ceintures-passage.js).
function serieDesCeinturesDesIA(essais, sortes, jeux, obtenirControle, cibleDeDepart = null, toutTester = false) {
  const LA_JAUNE = 1;
  const taches = essais.flatMap((_, essai) => sortes.map((sorte) => ({ essai, sorte })));
  const passages = taches.map((tache) => ({ ...tache, ceinture: 0, journal: [], raison: null, commence: false }));
  const serie = { taches, unite: 'passages', fait: () => passages.filter((passage) => passage.raison).length };
  serie.jouer = async (tache, kai, suivi) => {
    const passage = passages[taches.indexOf(tache)];
    passage.commence = true;
    const surJeu = (etat) => {
      Object.assign(passage, etat);
      serie.surProgres?.();
    };
    const passer = toutTester
      ? testerLesCeintures(essais[tache.essai], tache.sorte, jeux, kai, obtenirControle(), suivi, surJeu, cibleDeDepart ?? LA_JAUNE)
      : passerLesCeintures(essais[tache.essai], tache.sorte, jeux, kai, obtenirControle(), suivi, surJeu, cibleDeDepart);
    Object.assign(passage, await passer);
    if (passage.raison !== 'arrêté') retenirLaCeintureDeLIA(essais[tache.essai], tache.sorte, passage.ceinture);
  };
  serie.libelle = (tache) => `${essais[tache.essai].nom} — ceintures en ${LIBELLES_SORTES_DU_PASSAGE[tache.sorte]}`;
  // « LabAlCeint_date_machine = ceinture réussie(ceinture visée) » : la visee d'abord,
  // sinon celle qui suit la ceinture obtenue (le passage s'arrete a sa premiere regression).
  serie.nomDuFichier = (date) =>
    nomDuFichierDesCeintures({
      date,
      passages: passages.map((passage) => ({ machine: nomDeMachineDuBanc(essais[passage.essai]), sorte: passage.sorte, ceinture: CEINTURES[passage.ceinture], visee: CEINTURES[cibleDeDepart ?? Math.min(passage.ceinture + 1, CEINTURES.length - 1)] })),
    });
  serie.rendu = () => {
    const lignes = essais.map((candidat, essai) => {
      const cellule = (sorte) => `<td>${etatDuPassageHtml(passages.find((passage) => passage.essai === essai && passage.sorte === sorte))}</td>`;
      return `<tr><td>${echapperBanc(candidat.nom)}</td><td>${candidat.niveau}</td><td>${candidat.temps} s</td>${cellule('variantes')}${cellule('pzl')}</tr>`;
    });
    const journaux = passages.filter((passage) => passage.journal.length > 0).map((passage) => journalDuPassageHtml(passage, essais[passage.essai].nom));
    const depart = cibleDeDepart === null ? '' : ` Il vise d'abord la ceinture ${echapperBanc(CEINTURES[cibleDeDepart].nom.toLowerCase())} : les ceintures sautées sont à confirmer.`;
    if (toutTester) {
      return `<p class="note-reglages">Tout tester : chaque profil joue la série de chaque grade, de la ceinture ${echapperBanc(CEINTURES[cibleDeDepart ?? LA_JAUNE].nom.toLowerCase())} jusqu'à la blanche, que celle du dessus soit réussie ou ratée (les règles du profil « ${echapperBanc(profilEntrainementActif().nom)} », sans les confirmations). ✓ : série réussie ; ✗ : ratée (assez d'essais ratés pour redescendre). La ceinture affichée est la plus haute réussie. La machine d'un grade prend ses coups dans le livre ; entre IA, une partie nulle se rejoue (3 essais) et, si elle le reste, compte comme réussie. Sans pendule : chaque IA réfléchit sa réflexion max.</p>
<table class="banc-tableau"><tr><th>Profil</th><th>Niv.</th><th>Réfl.</th><th>Variantes</th><th>PZL</th></tr>${lignes.join('')}</table>
<h3>Les jeux</h3>${journaux.join('') || '<p class="note-reglages">Aucun jeu fini pour l’instant.</p>'}`;
    }
    return `<p class="note-reglages">Chaque profil part de la blanche et suit les règles du profil « ${echapperBanc(profilEntrainementActif().nom)} » contre la machine de chaque grade ; le passage s'arrête à sa première régression (ou au sommet, ou faute de jeu), et sa plus haute ceinture lui est attribuée.${depart} La machine d'un grade prend ses coups dans le livre, comme contre un joueur ; entre IA, une partie nulle se rejoue (3 essais) et, si elle le reste, compte comme réussie. Sans pendule : chaque IA réfléchit sa réflexion max.</p>
<table class="banc-tableau"><tr><th>Profil</th><th>Niv.</th><th>Réfl.</th><th>Variantes</th><th>PZL</th></tr>${lignes.join('')}</table>
<h3>Les jeux</h3>${journaux.join('') || '<p class="note-reglages">Aucun jeu fini pour l’instant.</p>'}`;
  };
  return serie;
}

// `elements` : { variantes, pzl (cases), cible (<select> : la ceinture visee d'abord),
// tout (case : tout tester), lancer } ; `lancerLaSerie(sortes, cibleDeDepart, toutTester)`.
function brancherCeinturesDesIA(elements, lancerLaSerie) {
  elements.cible.replaceChildren(new Option('la suivante (jaune)', ''), ...CEINTURES.slice(2).map((ceinture, rang) => new Option(ceinture.nom, rang + 2)));
  elements.lancer.addEventListener('click', () => {
    const sortes = [elements.variantes.checked && 'variantes', elements.pzl.checked && 'pzl'].filter(Boolean);
    if (sortes.length === 0) return window.alert('Cochez Variantes ou PZL.');
    lancerLaSerie(sortes, elements.cible.value === '' ? null : Number(elements.cible.value), elements.tout.checked);
  });
}
