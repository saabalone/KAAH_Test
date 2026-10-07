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
// Pas d'import ni d'export (voir moteur/plateau.js) : LIBELLES_REGLAGES_IA (moteur/historique-profil-ia.js),
// NOM_CAMP (rendu/ejections.js), COLONNES_ESSAI_IA (interface/essai-ia.js)
// viennent de fichiers charges avant celui-ci.

const plurielPanneau = (nombre, mot) => `${nombre} ${mot}${nombre > 1 ? 's' : ''}`;
// « 0 » et jamais « -0 » ; « ? » pour un calcul impossible (jamais un faux 0).
const nombrePanneau = (valeur) => (Number.isNaN(valeur) ? '?' : (valeur || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2, useGrouping: false }));
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

// La valeur d'un terme, et a cote, en gris, le reglage qui l'a donnee (saab,
// 2026-10-05 : « Gain | +5000/+1000 | ») — rien pour un terme sans reglage
// unique (Cases) ; « — » pour un terme absent de la version du profil.
function celluleDeTerme(termes, terme, poids) {
  const td = document.createElement('td');
  if (!(terme in termes)) {
    td.textContent = '—';
    return td;
  }
  td.textContent = signePanneau(termes[terme]);
  if (poids && Number.isFinite(poids[terme])) {
    const reglage = document.createElement('span');
    reglage.className = 'reglage-du-terme';
    reglage.textContent = `/${signePanneau(poids[terme])}`;
    td.append(reglage);
  }
  return td;
}

// Les termes : une ligne par terme (`termes`, ceux des versions des colonnes,
// moteur/essai-ia.js, termesDesProfils), et le total. `colonnes` : [{ nom, detail, poids, actif }] — `actif` : le profil de
// la machine, en orange. Pour une bille, une colonne par profil : ce qu'elle
// apporte (detail.termes), reglages en gris. Pour une aire (`aire`), deux par
// profil : l'aire seule, puis son apport a toute la position, reglages en gris.
function tableauDesTermes(colonnes, termes, choix, aire = false) {
  const tableau = document.createElement('table');
  tableau.className = 'tableau-termes-bille';
  const entete = document.createElement('tr');
  entete.append(celluleBille('th', ''));
  for (const { nom, actif } of colonnes) {
    const th = celluleBille('th', nom, actif ? `Poids de ${nom} (la machine de ce camp)` : `Poids de ${nom}`);
    th.className = actif ? 'profil-panneau profil-actif' : 'profil-panneau';
    if (aire) th.colSpan = 2;
    entete.append(th);
  }
  tableau.append(entete);
  if (aire) {
    const sousTitres = document.createElement('tr');
    sousTitres.append(celluleBille('th', ''));
    for (let i = 0; i < colonnes.length; i++) {
      sousTitres.append(
        celluleBille('th', 'seule', 'L’aire seule : ses billes, comme si rien d’autre n’existait (ni les éjections de la partie)'),
        celluleBille('th', 'avec l’ext.', 'Ce que les billes de l’aire apportent à toute la position : avec elles, moins sans elles ; Gain et Perte : les éjections de la partie. Tout le plateau : l’évaluation de la machine')
      );
    }
    tableau.append(sousTitres);
  }
  // Les valeurs du profil de la machine en orange, comme son nom (saab,
  // 2026-10-07 : « ca sera plus visuel » — pour une bille aussi, sans attendre
  // Aire ou Plateau) ; les reglages restent gris.
  const enOrange = (actif, cellulesDuProfil) => {
    if (actif) for (const cellule of cellulesDuProfil) cellule.classList.add('valeur-profil-actif');
    return cellulesDuProfil;
  };
  const cellules = ({ detail, poids, actif }, terme) =>
    enOrange(actif, aire ? [celluleDeTerme(detail.termes, terme, null), celluleDeTerme(detail.apport, terme, poids)] : [celluleDeTerme(detail.termes, terme, poids)]);
  for (const terme of termes) {
    if (choix[`terme-${terme}`] === false) continue;
    const ligne = document.createElement('tr');
    ligne.title = LIBELLES_REGLAGES_IA[terme];
    ligne.append(celluleBille('th', COLONNES_ESSAI_IA[terme]), ...colonnes.flatMap((colonne) => cellules(colonne, terme)));
    tableau.append(ligne);
  }
  const total = document.createElement('tr');
  total.className = 'ligne-total-bille';
  total.title = 'La somme des termes';
  total.append(
    celluleBille('th', 'Total'),
    ...colonnes.flatMap(({ detail, actif }) =>
      enOrange(actif, aire ? [celluleBille('td', signePanneau(detail.valeur)), celluleBille('td', signePanneau(detail.valeurApport))] : [celluleBille('td', signePanneau(detail.valeur))])
    )
  );
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
