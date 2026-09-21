// Dessine le plateau et les billes en SVG. Ce fichier ne decide aucune
// regle du jeu : on lui donne des coordonnees et des couleurs, il les
// affiche, un point c'est tout.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : casesDuPlateau et
// versNotation viennent de moteur/plateau.js, charge avant celui-ci dans
// index.html.

const ESPACE_NOM_SVG = 'http://www.w3.org/2000/svg';

// Rayon d'une case, en unites SVG arbitraires (pas des pixels reels : le
// SVG s'adapte ensuite a la taille de l'ecran via son viewBox, voir
// ajusterViewBox ci-dessous).
const RAYON_CASE = 10;

// Rayon d'une bille. KAAWA calcule ce rapport avec une formule qui s'avere
// negative une fois lue en detail (`HEX_SIDE - HEX_SIDE * sqrt(3)`,
// kaa_board_widget_ClO_Co.py, `_calculate_sizes`) — un ecart trouve en
// verifiant, pas un rapport a copier tel quel. Valeur ci-dessous reglee
// avec saab (phase 19ter, correctif) : sur un vrai plateau, le petit trou
// rond n'est qu'un repere de centrage, bien plus PETIT que la bille — qui
// repose surtout sur le relief autour de lui (rendu/relief-plateau.js, le
// trou visuel `.case-dimple` vaut la MOITIE de ce rayon-ci, jamais l'inverse).
const RAYON_BILLE = RAYON_CASE * 0.7;
// Nom EXPLICITE separe (pas juste "utiliser RAYON_BILLE partout") : sert
// aussi de reference de taille pour rendu/fleche-dernier-coup.js (le
// chevron doit rester proportionnel a LA BILLE, jamais a la case) — une
// seule constante, jamais un `0.75` recopie a plusieurs endroits.

// Conversion coordonnees axiales (q, r) -> position a l'ecran, formule
// standard pour une grille hexagonale "pointy-top" (reference habituelle du
// domaine : Red Blob Games, Hexagonal Grids).
// Verifie contre une vraie capture d'ecran de KAAWA : la rangee 'a' (r = 4)
// est en BAS de l'ecran, la rangee 'i' (r = -4) en HAUT. Comme le SVG fait
// grandir y vers le bas, cela correspond a y = +1.5 * r, sans inversion.
// Utilisee aussi par rendu/animation.js, qui en a besoin pour calculer le
// point de sortie d'une bille ejectee (une position hors du plateau valide).
//
// Le plateau peut etre retourne de 180 degres (Revanche en face-a-face, voir
// orienterPlateau) : c'est ICI, et nulle part ailleurs, que ca se passe. Les cases,
// billes, fleches, coordonnees du bord, cadre et relief passent tous par cette
// fonction, donc tournent ensemble ; ce qui entoure le plateau (pendules, pistes,
// noms, compteurs) ne l'utilise pas et reste a sa place.
function positionEcran(q, r) {
  const x = RAYON_CASE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = RAYON_CASE * 1.5 * r;
  return { x: x * sensDuPlateau, y: y * sensDuPlateau };
}

// 1 : Noir en bas, comme d'habitude ; -1 : plateau retourne, Noir en haut.
let sensDuPlateau = 1;

// A appeler UNE fois, avant de dessiner quoi que ce soit (index.html) : la partie
// est rechargee pour chaque changement d'orientation, jamais retournee en direct.
function orienterPlateau(retourne) {
  sensDuPlateau = retourne ? -1 : 1;
}

function creerElementSVG(nom, attributs) {
  const element = document.createElementNS(ESPACE_NOM_SVG, nom);
  for (const [cle, valeur] of Object.entries(attributs)) {
    element.setAttribute(cle, valeur);
  }
  return element;
}

// Ecrit `texte` dans `element` SEULEMENT s'il est different. Reecrire le meme
// texte remplace quand meme le noeud, donc redessine : un redessin inutile
// coute cher sur un telephone (pendules ecrites 4 fois par seconde alors que
// les chiffres ne changent qu'une fois, lignes des joueurs a chaque coup...).
function ecrireSiChange(element, texte) {
  if (element.textContent !== texte) element.textContent = texte;
}

// Dessine les 61 cases dans le <svg> fourni et ajuste son viewBox pour que
// tout le plateau reste visible, quelle que soit la taille de l'ecran.
// Chaque case porte son identifiant de notation (data-notation) : c'est ce
// que l'interface (saisie.js) lit pour savoir sur quelle case on a clique.
function dessinerPlateau(svg) {
  const groupeCases = creerElementSVG('g', { class: 'cases' });

  for (const { q, r } of casesDuPlateau()) {
    const { x, y } = positionEcran(q, r);
    groupeCases.appendChild(
      creerElementSVG('circle', {
        cx: x,
        cy: y,
        r: RAYON_CASE * 0.9,
        class: 'case',
        'data-notation': versNotation(q, r),
      })
    );
  }

  svg.appendChild(groupeCases);
  ajusterViewBox(svg);
}

// LES DEUX SEULS REGLAGES DE LA TAILLE DU PLATEAU — c'est ici que saab peut
// essayer des valeurs, et nulle part ailleurs. Ce sont les marges vides
// laissees autour des 61 cases, exprimees en rayons de case.
//
// Elles ne changent PAS la taille du plateau a l'ecran (la boite garde la
// place que la mise en page lui donne) : elles changent la PROPORTION de
// cette boite, et donc la taille des cases dedans.
//   - augmenter MARGES_HORIZONTALES : plus de vide a gauche et a droite de
//     la rangee e (la plus longue), la boite devient plus large que haute,
//     donc en portrait — ou c'est la largeur qui commande, voir styles.css —
//     le plateau devient MOINS HAUT et les cases plus petites ;
//   - augmenter MARGES_VERTICALES : l'inverse, plateau plus haut.
// C'est exactement le reglage demande par saab ("plus d'espace vide sur les
// cotes de la ligne e tout en restant serre verticalement").
//
// PLANCHER A NE PAS FRANCHIR : 0.9 de chaque cote. En dessous, les cases du
// bord depassent du viewBox et sont rognees a l'ecran. Et chaque dixieme
// gagne au-dela retrecit d'autant la zone tactile de TOUTES les cases sur
// telephone (regle des 44px, CLAUDE.md) : c'est le vrai cout de ce reglage,
// a garder en tete en essayant des valeurs.
const MARGES_HORIZONTALES = 0.95;
const MARGES_VERTICALES = 0.95;

function ajusterViewBox(svg) {
  const margeEnLargeur = RAYON_CASE * MARGES_HORIZONTALES;
  const margeEnHauteur = RAYON_CASE * MARGES_VERTICALES;
  const positions = casesDuPlateau().map(({ q, r }) => positionEcran(q, r));
  const xMin = Math.min(...positions.map((p) => p.x)) - margeEnLargeur;
  const xMax = Math.max(...positions.map((p) => p.x)) + margeEnLargeur;
  const yMin = Math.min(...positions.map((p) => p.y)) - margeEnHauteur;
  const yMax = Math.max(...positions.map((p) => p.y)) + margeEnHauteur;
  svg.setAttribute('viewBox', `${xMin} ${yMin} ${xMax - xMin} ${yMax - yMin}`);
}

// Donne au <svg> les MEMES proportions que son viewBox, une fois pour
// toutes. A appeler en dernier, apres dessinerPistesEjection : c'est elle
// qui agrandit le viewBox pour loger les deux bandes (rendu/ejections.js),
// donc avant elle la proportion n'est pas encore la bonne.
//
// Pourquoi : sans ca, la boite du plateau prenait toute la hauteur que la
// mise en page lui laissait, et cette hauteur changeait des que la liste des
// Conseils ou la Sequence gagnaient ou perdaient une ligne — le plateau
// "bougeait" tout seul (signale par saab). Avec une proportion fixe, une
// seule dimension suffit a determiner l'autre : la largeur disponible en
// portrait, la hauteur disponible en paysage (voir styles.css), et plus rien
// de ce qui l'entoure ne peut le faire varier.
//
// saab avait propose un CARRE. Le dessin fait en realite 0,865 de large pour
// 1 de haut (les deux bandes de pendules/ejections le rendent un peu plus
// haut que large) : un carre laisserait donc deux bandes vides sur les cotes
// et un plateau plus PETIT a place egale. La proportion exacte du viewBox
// donne le meme plateau fige, sans un pixel perdu — d'ou ce choix, qui
// repond a la demande (un plateau qui ne bouge plus) sans la suivre a la
// lettre.
function fixerProportionsPlateau(svg) {
  const [, , largeur, hauteur] = svg.getAttribute('viewBox').split(' ').map(Number);
  svg.style.aspectRatio = `${largeur} / ${hauteur}`;
}

// Pose une bille sur le plateau : un <g> persistant portant un identifiant
// stable, et son identifiant de case (data-notation, tenu a jour par
// animation.animerDeplacements a chaque coup). Ce <g> n'est jamais recree
// par la suite — voir CLAUDE.md, interdiction de reconstruire le plateau
// par innerHTML.
function poserBille(svg, { id, q, r, couleur }) {
  const { x, y } = positionEcran(q, r);
  const groupe = creerElementSVG('g', {
    id,
    class: `bille bille-${couleur}`,
    'data-notation': versNotation(q, r),
  });
  // La position se fixe via la propriete CSS (style.transform), pas
  // l'attribut XML transform="..." : c'est la seule facon fiable, sur tous
  // les navigateurs, de faire jouer la transition CSS de .bille quand
  // animation.js changera cette position plus tard.
  groupe.style.transform = `translate(${x}px, ${y}px)`;
  groupe.appendChild(creerElementSVG('circle', { r: RAYON_BILLE, class: 'bille-cercle' }));
  svg.appendChild(groupe);
  return groupe;
}

// Met en evidence les cases passees en argument (les destinations d'un
// coup possible), et efface toute mise en evidence precedente. Appeler
// avec un tableau vide efface simplement tout.
function mettreEnEvidence(svg, notations) {
  const destinations = new Set(notations);
  for (const caseElement of svg.querySelectorAll('.case')) {
    caseElement.classList.toggle('case-possible', destinations.has(caseElement.dataset.notation));
  }
}

// Reaffiche le plateau pour correspondre exactement a `plateau` (le
// dictionnaire notation -> {couleur, id} d'un etat quelconque) : utilisee
// par la navigation dans l'historique (phase 9), qui peut sauter de
// plusieurs coups d'un coup, pas seulement le precedent ou le suivant.
//
// A la difference de animation.animerDeplacements (qui suit un coup
// precis), cette fonction ne sait pas QUEL coup a mene d'un etat a
// l'autre : elle compare simplement "qui est deja affiche" a "qui devrait
// l'etre", et ajuste au minimum — sans jamais toucher aux billes qui
// restent a leur place, et sans jamais reconstruire les cases.
function synchroniserBilles(svg, plateau) {
  const billesAffichees = new Map(
    [...svg.querySelectorAll('.bille')].map((element) => [element.id, element])
  );

  const idsAttendus = new Set(Object.values(plateau).map((bille) => bille.id));

  // Une bille affichee qui ne devrait plus l'etre a ete ejectee entre
  // l'etat affiche et l'etat cible : on la retire.
  for (const [id, element] of billesAffichees) {
    if (!idsAttendus.has(id)) element.remove();
  }

  for (const [notation, bille] of Object.entries(plateau)) {
    const { q, r } = depuisNotation(notation);
    const element = billesAffichees.get(bille.id);

    if (!element) {
      // N'existait pas encore affichee : soit c'est le tout premier
      // affichage, soit on revient en arriere avant l'ejection de cette
      // bille (retiree par animerEjection, donc a recreer).
      poserBille(svg, { id: bille.id, q, r, couleur: bille.couleur });
    } else if (element.dataset.notation !== notation) {
      const { x, y } = positionEcran(q, r);
      element.style.transform = `translate(${x}px, ${y}px)`;
      element.dataset.notation = notation;
    }
  }
}
