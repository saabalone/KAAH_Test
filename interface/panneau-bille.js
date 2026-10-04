// Le contenu du panneau d'une bille ou d'une aire (saab, 2026-10-04, ouvert
// par le clic droit : interface/infos-case.js) :
//   - les TERMES de l'evaluation, de Gain a Fourchette (« comme tableau 1er
//     coup »), une colonne par profil IA choisi (« pouvoir selectionner
//     l'affichage du calcul par plusieurs profils IA simultanement »), et
//     leur total — pour une bille, ce qu'elle apporte (moteur/bille-ia.js) ;
//     pour une aire, la valeur de sa position (moteur/aire-ia.js) ;
//   - les MESURES, qui ne dependent d'aucun poids.
// Chaque ligne se montre ou se cache (bouton ⚙ : zoneDuChoixBille).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : termesDeLaVersion
// (moteur/essai-ia.js), LIBELLES_REGLAGES_IA (moteur/historique-profil-ia.js),
// NOM_CAMP (rendu/ejections.js), COLONNES_ESSAI_IA (interface/essai-ia.js)
// viennent de fichiers charges avant celui-ci.

const plurielPanneau = (nombre, mot) => `${nombre} ${mot}${nombre > 1 ? 's' : ''}`;
// « 0 » et jamais « -0 » ; « ? » pour un calcul impossible (jamais un faux 0).
const nombrePanneau = (valeur) => (Number.isNaN(valeur) ? '?' : (valeur || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 }));
const signePanneau = (valeur) => (valeur > 0 ? `+${nombrePanneau(valeur)}` : nombrePanneau(valeur));

function texteDeLaSortie(sortie) {
  if (!sortie) return 'hors zone';
  if (sortie.coups === null) return 'aucune : piégée';
  const coups = plurielPanneau(sortie.coups, 'coup');
  if (sortie.libres.length > 0) return `${coups}, libre par ${sortie.libres.join(' ')}`;
  const bloquees = sortie.cases.map((sortieBloquee) => `${sortieBloquee} (adv. ${Number.isFinite(sortie.adversaire[sortieBloquee]) ? sortie.adversaire[sortieBloquee] : '—'})`);
  return `${coups}, bloquable : ${bloquees.join(', ')}`;
}

// Le piege de KAI++ (les deux camps jouent : moteur/sortie-bille.js,
// lireReponsePiege), ou { etat: 'calcul' } en attendant.
function texteDuPiege(piege) {
  if (!piege) return 'hors zone';
  if (piege.etat === 'calcul') return 'calcul…';
  if (piege.etat === 'hors') return 'hors zone';
  if (piege.etat === 'sort') return `sort en ${plurielPanneau(piege.coups, 'coup')}${piege.coup ? `, d’abord ${piege.coup}` : ''}`;
  if (piege.etat === 'piegee') return `piégée : aucune sortie en ${plurielPanneau(piege.coups, 'coup')}`;
  if (piege.etat === 'incertain') return piege.coups > 0 ? `piégée sur ${plurielPanneau(piege.coups, 'coup')} (au-delà : trop long)` : 'trop long à calculer';
  return '—';
}

// Les mesures d'une bille : [libelle, explication, texte d'un detail].
const LIGNES_MESURES_BILLE = {
  classe: ['Case', 'Sa case distincte (rotations et miroirs) et ses pas vers le centre', (d) => `${d.classe} (${d.pas} pas)`],
  voisines: ['Voisines', 'Ses billes amies voisines', (d) => String(d.voisines)],
  distanceMoyenne: ['Distance', 'Sa distance moyenne, en coups, aux autres billes de son camp', (d) => nombrePanneau(d.distanceMoyenne)],
  attaquant: ['Adversaire', 'La bille adverse la plus proche, en coups', (d) => (d.attaquant === null ? '—' : plurielPanneau(d.attaquant, 'coup'))],
  poussable: ['Poussée', 'Combien de sumitos adverses la poussent déjà', (d) => (d.poussable === 0 ? 'non' : plurielPanneau(d.poussable, 'sumito'))],
  ejectable: ['Éjectable', 'Un sumito adverse peut-il l’éjecter tout de suite ?', (d) => (d.ejectable ? 'oui' : 'non')],
  bloquee: ['Bloquée', 'Version 4 : sur les couronnes b et a, ne peut faire aucun pas vers le centre (seule, avec ses amies en ligne, ou en poussant) — le triangle a3 contre b3 b4 c4', (d) => (d.bloquee ? 'oui' : 'non')],
  piege: [
    'Piège',
    'KAI++ : sort-elle des couronnes b et a en 4 de ses coups au plus, quoi que fasse l’adversaire ? Les deux camps jouent (l’adversaire peut lui couper la route) ; le trait compte.',
    (d) => texteDuPiege(d.piege),
  ],
  sortie: [
    'Course',
    'Mesure rapide, sans réponse de l’adversaire : en combien de ses coups elle sort de la zone éjectable (4 amies en ligne la bloquent, une adverse aussi si elle ne peut pas la pousser), et par où elle arrive avant la bille adverse la plus rapide (le trait compte). Les autres billes ne bougent pas.',
    (d) => texteDeLaSortie(d.sortie),
  ],
};

// Les mesures d'une aire : ses billes, de chaque camp.
function lignesMesuresAire(camp) {
  const adverse = camp === 'noir' ? 'blanc' : 'noir';
  return {
    siennes: [NOM_CAMP[camp], 'Ses billes dans l’aire, bord compris', (d) => `${d.billes[camp].length} : ${d.billes[camp].join(' ')}`],
    adverses: [NOM_CAMP[adverse], 'Les billes adverses dans l’aire, bord compris', (d) => `${d.billes[adverse].length} : ${d.billes[adverse].join(' ') || '—'}`],
  };
}

function celluleBille(balise, texte, titre) {
  const element = document.createElement(balise);
  element.textContent = texte;
  if (titre) element.title = titre;
  return element;
}

// Les termes : une ligne par terme de la plus haute version des colonnes, et le
// total. `colonnes` : [{ nom, detail }] (detail.termes, detail.valeur).
function tableauDesTermes(colonnes, version, choix) {
  const tableau = document.createElement('table');
  const entete = document.createElement('tr');
  entete.append(celluleBille('th', ''), ...colonnes.map(({ nom }) => celluleBille('th', nom, `Poids de ${nom}`)));
  tableau.append(entete);
  for (const terme of termesDeLaVersion(version)) {
    if (choix[`terme-${terme}`] === false) continue;
    const ligne = document.createElement('tr');
    ligne.title = LIBELLES_REGLAGES_IA[terme];
    ligne.append(celluleBille('th', COLONNES_ESSAI_IA[terme]), ...colonnes.map(({ detail }) => celluleBille('td', terme in detail.termes ? signePanneau(detail.termes[terme]) : '—')));
    tableau.append(ligne);
  }
  const total = document.createElement('tr');
  total.className = 'ligne-total-bille';
  total.title = 'La somme des termes';
  total.append(celluleBille('th', 'Total'), ...colonnes.map(({ detail }) => celluleBille('td', signePanneau(detail.valeur))));
  tableau.append(total);
  return tableau;
}

function tableauDesMesures(lignes, detail, choix) {
  const tableau = document.createElement('table');
  for (const [cle, [libelle, explication, texte]] of Object.entries(lignes)) {
    if (choix[cle] === false) continue;
    const ligne = document.createElement('tr');
    ligne.title = explication;
    ligne.append(celluleBille('th', libelle), celluleBille('td', texte(detail)));
    tableau.append(ligne);
  }
  return tableau;
}

// Le choix du bouton ⚙ : `groupes`, [[titre, [[cle, libelle, coche]]]] ;
// `changer(cle, coche)` a chaque case touchee.
function zoneDuChoixBille(groupes, changer) {
  const zone = document.createElement('div');
  zone.className = 'choix-infos-case';
  for (const [titre, cases] of groupes) {
    zone.append(celluleBille('p', titre));
    for (const [cle, libelle, coche] of cases) {
      const label = document.createElement('label');
      const entree = document.createElement('input');
      entree.type = 'checkbox';
      entree.checked = coche;
      entree.addEventListener('change', () => changer(cle, entree.checked));
      label.append(entree, ` ${libelle}`);
      zone.append(label);
    }
  }
  return zone;
}
