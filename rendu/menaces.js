// Fleches de menaces (Phase 19, bouton "!?") : toutes les poussees
// possibles des deux camps, dessinees directement sur le plateau
// principal. Rendu seul : ce fichier ne decide rien, juste des segments
// entre deux cases — voir CLAUDE.md, "rendu/ dessine, ne decide rien".
// Repris de KAAWA (kaa_board_widget_ClO_Co.py, _draw_threat_arrows),
// meme technique que rendu/conseils.js (une <line> avec un marker-end
// par classe de couleur, un marker par classe plutot que de compter sur
// `context-stroke`, pas fiable partout — voir ce fichier pour pourquoi).
//
// Code couleur (PLAN.md) : vert = poussee du camp AU TRAIT ("ami"),
// orange = poussee de l'AUTRE camp ("ennemi") — sur la fleche PRINCIPALE
// (du bout de la queue du groupe jusqu'a la premiere bille adverse).
// Une poussee qui ejecte dessine EN PLUS une seconde fleche, rouge,
// juste sur le segment "derniere bille adverse -> hors du plateau" —
// plus large et plus opaque si cette ejection donnerait la victoire
// immediate ("fin de partie") — exactement la meme paire de fleches
// superposees que KAAWA (flèche ami/ennemi + flèche rouge d'ejection).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : depuisNotation vient
// de moteur/plateau.js, positionEcran et creerElementSVG de
// rendu/plateau-svg.js — tous charges avant celui-ci dans index.html.

const CLASSES_FLECHE_MENACE = ['ami', 'ennemi', 'ejection', 'ejection-fin'];

function assurerMarqueursFlechesMenaces(svg) {
  if (svg.querySelector('#marqueurs-fleches-menaces')) return;

  const defs = creerElementSVG('defs', { id: 'marqueurs-fleches-menaces' });
  for (const classe of CLASSES_FLECHE_MENACE) {
    const marqueur = creerElementSVG('marker', {
      id: `pointe-fleche-menace-${classe}`,
      viewBox: '0 0 10 10',
      refX: 8,
      refY: 5,
      markerWidth: 4,
      markerHeight: 2,
      orient: 'auto-start-reverse',
    });
    marqueur.appendChild(
      creerElementSVG('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: `fleche-menace-pointe fleche-menace-pointe-${classe}` })
    );
    defs.appendChild(marqueur);
  }
  svg.appendChild(defs);
}

// `menaces` : le tableau renvoye par moteur.menacesDeLaPosition (chaque
// element porte deja `ami`, voir ce fichier). Remplace entierement les
// fleches deja affichees — appeler avec un tableau vide efface simplement
// tout (meme principe que rendu.dessinerFlechesConseils).
function dessinerFlechesMenaces(svg, menaces) {
  effacerFlechesMenaces(svg);
  if (menaces.length === 0) return;
  assurerMarqueursFlechesMenaces(svg);

  const groupe = creerElementSVG('g', { id: 'fleches-menaces' });

  for (const menace of menaces) {
    ajouterFlechePrincipale(groupe, menace);
    if (menace.ejection) ajouterFlecheEjection(groupe, menace);
  }

  svg.appendChild(groupe);
}

// Du bout de la queue du groupe qui pousse jusqu'a la premiere bille
// adverse : le mouvement lui-meme, colore ami (vert) ou ennemi (orange).
function ajouterFlechePrincipale(groupe, menace) {
  const queue = depuisNotation(menace.billes[0]);
  const premiereAdverse = depuisNotation(menace.billesPoussees[0]);
  if (!queue || !premiereAdverse) return; // coup illisible : ignore plutot que de planter tout l'affichage

  const p1 = positionEcran(queue.q, queue.r);
  const p2 = positionEcran(premiereAdverse.q, premiereAdverse.r);
  const classe = menace.ami ? 'ami' : 'ennemi';

  groupe.appendChild(
    creerElementSVG('line', {
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      class: `fleche-menace fleche-menace-${classe}`,
      'marker-end': `url(#pointe-fleche-menace-${classe})`,
    })
  );
}

// De la derniere bille adverse poussee jusqu'a la case (fictive, hors du
// plateau) qu'elle atteindrait en sortant — `positionEcran` accepte sans
// probleme des coordonnees hors plateau, une simple formule geometrique
// (voir rendu/plateau-svg.js), exactement ce dont cette fleche a besoin.
function ajouterFlecheEjection(groupe, menace) {
  const derniereAdverse = depuisNotation(menace.billesPoussees[menace.billesPoussees.length - 1]);
  if (!derniereAdverse) return;

  const dehors = { q: derniereAdverse.q + menace.direction.q, r: derniereAdverse.r + menace.direction.r };
  const p1 = positionEcran(derniereAdverse.q, derniereAdverse.r);
  const p2 = positionEcran(dehors.q, dehors.r);
  const classe = menace.finDePartie ? 'ejection-fin' : 'ejection';

  groupe.appendChild(
    creerElementSVG('line', {
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      class: `fleche-menace fleche-menace-${classe}`,
      'marker-end': `url(#pointe-fleche-menace-${classe})`,
    })
  );
}

function effacerFlechesMenaces(svg) {
  svg.querySelector('#fleches-menaces')?.remove();
}
