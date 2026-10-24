// Le Banc d'essais, les CEINTURES DES IA : la serie (un passage par profil et par
// sorte, interface/banc-essais-ceintures.js), son tableau, et la ceinture retenue pour
// chaque IA (saab, 2026-10-11 : « sa plus haute ceinture est attribuée à l'IA, comme ça
// on pourra leur mettre une mini icône ceinture (partie/PZL) » —
// `kaah-ceintures-ia` : { 'profil|niveau|reflexion': { variantes, pzl } }).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : passerLesCeintures, testerLesCeintures
// (interface/banc-essais-ceintures-passage.js),
// LIBELLES_SORTES_DU_PASSAGE, SENS_DU_PASSAGE, CLE_CEINTURES_DES_IA
// (interface/banc-essais-ceintures.js), CEINTURES, ceintureDuGrade (moteur/entrainement.js), SANS_CEINTURE
// (moteur/entrainement-serie.js),
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
  return `${nomDeLaCeinture(ceintureDuGrade(passage.ceinture))}<br>${etat}${grades.length ? `<br>${grades.join('<br>')}` : ''}`;
}

function journalDuPassageHtml(passage, nom) {
  // Un jeu joue se regarde sur le petit plateau (son numero : serieDesCeinturesDesIA).
  const lignes = passage.journal.map((jeu, rang) => `<tr${jeu.numero === undefined ? '' : ` data-partie-banc="${jeu.numero}" title="Toucher : la revoir sur le petit plateau"`}><td>${rang + 1}</td><td>${echapperBanc(CEINTURES[jeu.ceinture].nom)}</td><td>${echapperBanc(jeu.nom)}</td><td>${SENS_DU_PASSAGE[passage.sorte][jeu.sens]}</td><td>${jeu.reussi ? '<span class="resultat-reussi">✓</span>' : '<span class="resultat-rate">✗</span>'}</td><td>${echapperBanc(jeu.issue ?? '')}</td><td>${echapperBanc(jeu.evenement)}</td></tr>`);
  return `<details><summary>${echapperBanc(nom)} — ${LIBELLES_SORTES_DU_PASSAGE[passage.sorte]} (${passage.journal.length} jeux)</summary><table class="banc-tableau"><tr><th>#</th><th>Ceinture</th><th>Jeu</th><th>Sens</th><th></th><th>Issue</th><th>Suite</th></tr>${lignes.join('')}</table></details>`;
}

// La serie du banc (interface/banc-essais.js, lancer) : une tache par profil et par sorte.
// `essais` : les profils coches ; `sortes` : ['variantes', 'pzl'] ; `jeux` : { variantes,
// puzzles } ; `obtenirControle()` : { arret, pause, reprendre } ; `cibleDeDepart` : la
// ceinture visee d'abord (null : la suivante) ; `toutTester` : la serie de chaque grade,
// de la visee jusqu'a la blanche (interface/banc-essais-ceintures-passage.js).
function serieDesCeinturesDesIA(essais, sortes, jeux, obtenirControle, cibleDeDepart = null, toutTester = false) {
  const LA_JAUNE = 1;
  const gradeLePlusHaut = cibleDeDepart ?? LA_JAUNE;
  const passages = essais.flatMap((_, essai) => sortes.map((sorte) => ({ essai, sorte, ceinture: SANS_CEINTURE, journal: [], raison: null, commence: false })));
  const passageDe = (tache) => passages.find((passage) => passage.essai === tache.essai && passage.sorte === tache.sorte);
  // Tout tester : chaque grade est une tache a part, tous en parallele (saab, 2026-10-23 : « il ne fait
  // qu'une partie à la fois ? ») — ils se testent chacun seul ; sinon, un passage par profil et sorte.
  const grades = Array.from({ length: gradeLePlusHaut + 1 }, (_, rang) => gradeLePlusHaut - rang);
  const taches = toutTester ? passages.flatMap(({ essai, sorte }) => grades.map((grade) => ({ essai, sorte, grade }))) : passages.map(({ essai, sorte }) => ({ essai, sorte }));
  const finies = new Set();
  const serie = { taches, unite: toutTester ? 'grades' : 'passages', fait: () => finies.size };
  // Les parties jouees, a regarder sur le petit plateau (saab, 2026-10-22 : « on ne voit pas au
  // clic la partie ceinture en test en mini plateau » ; interface/banc-essais-regarder.js) :
  // numero -> { numero, position, coups, titre, joueurs }.
  const parties = new Map();
  serie.partieARegarder = (numero) => parties.get(numero) ?? null;
  // Et pour le fichier des parties (interface/banc-essais.js, Exporter ; saab, 2026-10-23 : « on ne
  // peut pas revoir les parties ») : l'issue de son jeu, au journal — une partie nulle rejouee, ou
  // une revanche oubliee apres l'aller, n'y est pas.
  serie.donnees = () => {
    const jeux = new Map(passages.flatMap((passage) => passage.journal).filter((jeu) => jeu.numero !== undefined).map((jeu) => [jeu.numero, jeu]));
    const jouees = [...parties.values()].filter((partie) => partie.coups.length > 0);
    return {
      parties: jouees.map(({ numero, jeu, position, essai, adversaire, essaiNoir, coups }) => {
        const issue = jeux.get(numero);
        return { numero, variante: jeu, position, essai, reference: adversaire, essaiNoir, coups, fin: issue ? (issue.reussi ? '✓ réussi' : '✗ raté') : '—', score: issue?.issue ?? '' };
      }),
    };
  };
  // Le suivi d'une ligne « en cours » (`suiviDuBanc`) : le passage annonce chaque partie ({ partie :
  // { position, essaiNoir, adversaire, titre } }, puis ses coupsJoues) ; elle prend un numero, et sa
  // ligne se touche pour la suivre. Une ligne par machine : celle du renfort a la sienne.
  function suiviDUneLigne(tache, suiviDuBanc) {
    let numeroEnCours;
    const suivi = (nouveau) => {
      if (!nouveau.partie) {
        if (nouveau.coupsJoues && parties.has(numeroEnCours)) parties.get(numeroEnCours).coups = nouveau.coupsJoues;
        return suiviDuBanc(nouveau);
      }
      const { position, essaiNoir, adversaire, titre } = nouveau.partie;
      const nom = essais[tache.essai].nom;
      numeroEnCours = parties.size + 1;
      parties.set(numeroEnCours, { numero: numeroEnCours, position, coups: [], titre: `${nom} — ${titre}`, joueurs: essaiNoir ? { noir: nom, blanc: adversaire } : { noir: adversaire, blanc: nom }, jeu: titre, essai: nomDeMachineDuBanc(essais[tache.essai]), adversaire, essaiNoir });
      return suiviDuBanc({ numero: numeroEnCours, position, essaiNoir, nomDuProfil: nom, nomAdverse: adversaire, titreDeLaPartie: `${nom} — ${titre}`, coupsJoues: [] });
    };
    suivi.numero = () => numeroEnCours;
    return suivi;
  }
  // Tout tester : ce qu'a donne chaque grade (grade -> { journal, grades }), reuni dans le passage.
  const parGrade = new Map(); // passage -> Map
  function reunirLesGrades(passage) {
    const siens = [...(parGrade.get(passage)?.entries() ?? [])].sort(([a], [b]) => b - a).map(([, etat]) => etat);
    passage.journal = siens.flatMap((etat) => etat.journal ?? []);
    passage.grades = siens.flatMap((etat) => etat.grades ?? []);
    passage.ceinture = Math.max(SANS_CEINTURE, ...passage.grades.filter(({ issue }) => issue === 'réussie').map(({ grade }) => grade));
  }
  serie.jouer = async (tache, kai, suiviDuBanc, renfortDuBanc = null) => {
    const passage = passageDe(tache);
    passage.commence = true;
    const suivi = suiviDUneLigne(tache, suiviDuBanc);
    const renfort = renfortDuBanc && { machine: renfortDuBanc.machine, suivi: (texte) => suiviDUneLigne(tache, renfortDuBanc.suivi(texte)), finir: renfortDuBanc.finir };
    const candidat = essais[tache.essai];
    if (!toutTester) {
      const surJeu = (etat) => {
        Object.assign(passage, etat);
        serie.surProgres?.();
      };
      Object.assign(passage, await passerLesCeintures(candidat, tache.sorte, jeux, kai, obtenirControle(), suivi, surJeu, cibleDeDepart, renfort));
      finies.add(tache);
      if (passage.raison !== 'arrêté') retenirLaCeintureDeLIA(candidat, tache.sorte, passage.ceinture);
      return;
    }
    if (!parGrade.has(passage)) parGrade.set(passage, new Map());
    const surJeu = (etat) => {
      parGrade.get(passage).set(tache.grade, etat);
      reunirLesGrades(passage);
      serie.surProgres?.();
    };
    const resultat = await testerLesCeintures(candidat, tache.sorte, jeux, kai, obtenirControle(), suivi, surJeu, tache.grade, tache.grade, renfort);
    surJeu(resultat);
    finies.add(tache);
    // Le passage fini : tous ses grades testes (ou arretes).
    const siennes = taches.filter((autre) => autre.essai === tache.essai && autre.sorte === tache.sorte);
    if (resultat.raison === 'arrêté') passage.raison = 'arrêté';
    if (siennes.every((autre) => finies.has(autre))) {
      passage.raison ??= 'tout testé';
      if (passage.raison !== 'arrêté') retenirLaCeintureDeLIA(candidat, tache.sorte, passage.ceinture);
    }
  };
  serie.libelle = (tache) => `${essais[tache.essai].nom} — ceintures en ${LIBELLES_SORTES_DU_PASSAGE[tache.sorte]}${tache.grade === undefined ? '' : `, ${CEINTURES[tache.grade].nom.toLowerCase()}`}`;
  // « LabAlCeint_date_machine = ceinture réussie(ceinture visée) » : la visee d'abord,
  // sinon celle qui suit la ceinture obtenue (le passage s'arrete a sa premiere regression).
  serie.nomDuFichier = (date) =>
    nomDuFichierDesCeintures({
      date,
      passages: passages.map((passage) => ({ machine: nomDeMachineDuBanc(essais[passage.essai]), sorte: passage.sorte, ceinture: ceintureDuGrade(passage.ceinture), visee: CEINTURES[cibleDeDepart ?? Math.min(passage.ceinture + 1, CEINTURES.length - 1)] })),
    });
  serie.rendu = () => {
    const lignes = essais.map((candidat, essai) => {
      const cellule = (sorte) => `<td>${etatDuPassageHtml(passages.find((passage) => passage.essai === essai && passage.sorte === sorte))}</td>`;
      return `<tr><td>${echapperBanc(candidat.nom)}</td><td>${candidat.niveau}</td><td>${candidat.temps} s</td>${cellule('variantes')}${cellule('pzl')}</tr>`;
    });
    const journaux = passages.filter((passage) => passage.journal.length > 0).map((passage) => journalDuPassageHtml(passage, essais[passage.essai].nom));
    const depart = cibleDeDepart === null ? '' : ` Il vise d'abord la ceinture ${echapperBanc(CEINTURES[cibleDeDepart].nom.toLowerCase())} : les ceintures sautées sont à confirmer.`;
    if (toutTester) {
      return `<p class="note-reglages">Tout tester : chaque profil joue la série de chaque grade, de la ceinture ${echapperBanc(CEINTURES[cibleDeDepart ?? LA_JAUNE].nom.toLowerCase())} jusqu'à la blanche, que celle du dessus soit réussie ou ratée (les règles du profil « ${echapperBanc(profilEntrainementActif().nom)} », sans les confirmations). ✓ : série réussie ; ✗ : ratée (assez d'essais ratés pour redescendre). La ceinture affichée est la plus haute réussie. La machine d'un grade prend ses coups dans le livre ; entre IA, une partie nulle se rejoue (3 essais) et, si elle le reste, compte comme réussie. Sans pendule : chaque IA réfléchit sa réflexion max. Dans un PZL, l'IA testée cherche sans élagage, pas plus loin que les tours qui restent.</p>
<table class="banc-tableau"><tr><th>Profil</th><th>Niv.</th><th>Réfl.</th><th>Variantes</th><th>PZL</th></tr>${lignes.join('')}</table>
<h3>Les jeux</h3>${journaux.join('') || '<p class="note-reglages">Aucun jeu fini pour l’instant.</p>'}`;
    }
    return `<p class="note-reglages">Chaque profil part sans ceinture (la blanche à gagner d'abord) et suit les règles du profil « ${echapperBanc(profilEntrainementActif().nom)} » contre la machine de chaque grade ; le passage s'arrête à sa première régression (ou au sommet, ou faute de jeu), et sa plus haute ceinture lui est attribuée.${depart}${cibleDeDepart === null ? '' : ' Un échec avant toute ceinture redescend d\x27un cran (ce qui est réussi au-dessus vaut en dessous) ; la première ceinture obtenue ainsi est la sienne.'} La machine d'un grade prend ses coups dans le livre, comme contre un joueur ; entre IA, une partie nulle se rejoue (3 essais) et, si elle le reste, compte comme réussie. Sans pendule : chaque IA réfléchit sa réflexion max. Dans un PZL, l'IA testée cherche sans élagage, pas plus loin que les tours qui restent.</p>
<table class="banc-tableau"><tr><th>Profil</th><th>Niv.</th><th>Réfl.</th><th>Variantes</th><th>PZL</th></tr>${lignes.join('')}</table>
<h3>Les jeux</h3>${journaux.join('') || '<p class="note-reglages">Aucun jeu fini pour l’instant.</p>'}`;
  };
  return serie;
}

// `elements` : { variantes, pzl (cases), cible (<select> : la ceinture visee d'abord),
// tout (case : tout tester), lancer } ; `lancerLaSerie(sortes, cibleDeDepart, toutTester)`.
function brancherCeinturesDesIA(elements) {
  elements.cible.replaceChildren(new Option('la suivante (jaune)', ''), ...CEINTURES.slice(2).map((ceinture, rang) => new Option(ceinture.nom, rang + 2)));
  // Le choix, lu au Lancer du banc (le mode « Ceintures » de Ce qu'on essaie) : { sortes,
  // cibleDeDepart, toutTester }, ou null (rien de coche).
  return function choixDesCeintures() {
    const sortes = [elements.variantes.checked && 'variantes', elements.pzl.checked && 'pzl'].filter(Boolean);
    if (sortes.length === 0) return window.alert('Cochez Variantes ou PZL (Ceintures des IA).') ?? null;
    return { sortes, cibleDeDepart: elements.cible.value === '' ? null : Number(elements.cible.value), toutTester: elements.tout.checked };
  };
}
