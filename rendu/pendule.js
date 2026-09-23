// Le cadre-bouton autour de chaque pendule, et le grand bouton rond qui
// masque le plateau pendant la pause — correctif demande par saab apres la
// phase 15 : "encadrer [les pendules] dans un bouton gris qui pourra
// servir de Start et Pause ... qu'en Pause on masquera entierement le
// plateau par un gros bouton rond vert avec le signe Pause ||, on pourra
// redemarrer soit sur clic pendule soit par ce gros bouton". La logique de
// pause elle-meme (quel etat, quand basculer) vit dans
// interface/pendules.js — ce fichier ne fait que dessiner, voir CLAUDE.md.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG
// vient de rendu/plateau-svg.js, RAYON_PISTE de rendu/ejections.js — tous
// deux charges avant celui-ci dans index.html.
//
// PENDULES VERTICALES, quel que soit le mode (demande de saab) : le texte se
// lit de HAUT en BAS, dans les coins vides a droite de l'hexagone (la piste
// d'ejection occupe ceux de gauche, rendu/pistes-triangle.js). Le cadre est
// dessine a plat puis tourne de 90 degres autour de son centre : une seule
// geometrie, `interface/pendules.js` continue d'ecrire dans le meme <text>.

// Longueur du cadre gris (le long du texte) : assez pour "5:00" a la taille
// de police choisie sans le mesurer (un <text> SVG ne donne sa largeur
// reelle qu'une fois affiche, et il est encore vide a cet instant —
// interface/pendules.js n'y ecrit qu'ensuite). Epaisseur (perpendiculairement
// au texte) REDUITE : la place au-dessus et au-dessous des chiffres quand on
// les lit (signale par saab).
const LARGEUR_BOUTON_PENDULE = RAYON_PISTE * 11;
const HAUTEUR_BOUTON_PENDULE = RAYON_PISTE * 3;
const ROTATION_PENDULE = 90;
const JEU_PENDULE = RAYON_PISTE * 0.4;
// Retrait des bandes "||" par rapport aux bouts arrondis du cadre.
const JEU_BANDE_PENDULE = RAYON_PISTE * 0.3;

// Centre de la pendule dans le coin haut-droit (`enHaut` vrai, Blanc) ou
// bas-droit (Noir) : collee au bord droit et au bord haut (ou bas) du
// plateau, cadre a la verticale.
function positionPendule(limites, enHaut) {
  const x = limites.xMax - HAUTEUR_BOUTON_PENDULE / 2 - JEU_PENDULE;
  const decalageY = LARGEUR_BOUTON_PENDULE / 2 + JEU_PENDULE;
  return { x, y: enHaut ? limites.yMin + decalageY : limites.yMax - decalageY };
}

// Le cadre ET le texte ecrit par interface/pendules.js, dans un <g>
// cliquable (voir interface/pendules.js, basculerPauseManuelle). Meme
// identifiant de texte (`pendule-noir`/`pendule-blanc`) que l'ancien
// <span> HTML qu'il remplace : aucun autre fichier n'a besoin de savoir
// que ce sont maintenant des <text> SVG.
function dessinerPendule(svg, camp, { x, y }) {
  const groupe = creerElementSVG('g', {
    id: `bouton-pendule-${camp}`,
    class: 'bouton-pendule',
    transform: `rotate(${ROTATION_PENDULE} ${x} ${y})`,
  });
  groupe.appendChild(
    creerElementSVG('rect', {
      x: x - LARGEUR_BOUTON_PENDULE / 2,
      y: y - HAUTEUR_BOUTON_PENDULE / 2,
      width: LARGEUR_BOUTON_PENDULE,
      height: HAUTEUR_BOUTON_PENDULE,
      rx: RAYON_PISTE * 0.6,
      class: `cadre-pendule cadre-pendule-${camp}`,
    })
  );
  // Les deux bandes vertes "||" (pause), au-dessus et au-dessous des chiffres sur
  // toute la longueur du cadre : cadre tourne, elles deviennent deux traits
  // verticaux — le signe Pause, qui dit qu'un clic met en pause (saab). Cachees
  // sauf quand la pendule tourne (styles.css, .pendule-en-marche).
  const epaisseurBande = HAUTEUR_BOUTON_PENDULE * 0.11;
  const margeBande = HAUTEUR_BOUTON_PENDULE * 0.05;
  for (const yBande of [y - HAUTEUR_BOUTON_PENDULE / 2 + margeBande, y + HAUTEUR_BOUTON_PENDULE / 2 - margeBande - epaisseurBande]) {
    groupe.appendChild(
      creerElementSVG('rect', {
        x: x - LARGEUR_BOUTON_PENDULE / 2 + JEU_BANDE_PENDULE,
        y: yBande,
        width: LARGEUR_BOUTON_PENDULE - JEU_BANDE_PENDULE * 2,
        height: epaisseurBande,
        class: 'pendule-bande',
      })
    );
  }
  const texte = creerElementSVG('text', {
    id: `pendule-${camp}`,
    x,
    class: `pendule-camp pendule-camp-${camp}`,
    'text-anchor': 'middle',
  });
  groupe.appendChild(texte);
  svg.appendChild(groupe);
  // Chiffres centres sur leur ENCRE dans l'epaisseur du cadre : `dominant-
  // baseline: middle` centrait la boite de ligne, et les chiffres, qui
  // montent plus haut que le milieu de cette boite, sortaient decales (trop
  // a droite une fois la pendule tournee, saab). Leur hauteur ne depend pas de
  // ce qu'ils disent : mesuree une fois sur les dix chiffres.
  texte.setAttribute('y', y - centreDeLEncre(texte, '0123456789').y);
}

// Le grand bouton rond de pause, qui masque tout le plateau (un rectangle
// gris fonce sur tout le viewBox, un rond vert avec "||" au centre).
// Idempotent : appeler deux fois de suite sans masquerPause entre les deux
// ne cree pas un second cadre par-dessus le premier.
function afficherPause(svg) {
  if (svg.querySelector('#pause-plateau')) return;

  const [xMin, yMin, largeur, hauteur] = svg.getAttribute('viewBox').split(' ').map(Number);
  const groupe = creerElementSVG('g', { id: 'pause-plateau' });
  groupe.appendChild(creerElementSVG('rect', { x: xMin, y: yMin, width: largeur, height: hauteur, class: 'fond-pause' }));

  // Diametre = largeur de l'hexagone lui-meme (signale par saab : "pour
  // eviter de reflechir sur la position pendant que celui qui a mis en
  // pause s'est absente") — `largeur` n'est jamais etiree par les bandes
  // du haut et du bas (seule `hauteur` l'est, voir rendu/ejections.js,
  // agrandirViewBoxPourNoms), c'est deja la vraie largeur du plateau.
  const rayon = largeur / 2;
  const cx = xMin + largeur / 2;
  const cy = yMin + hauteur / 2;
  groupe.appendChild(creerElementSVG('circle', { cx, cy, r: rayon, class: 'bouton-pause-rond' }));

  // Le symbole "||" : deux barres verticales, jamais du texte (une police
  // ne rendrait pas forcement le meme caractere partout).
  const largeurBarre = rayon * 0.22;
  const hauteurBarre = rayon * 0.9;
  const ecart = rayon * 0.16;
  for (const xGauche of [cx - ecart - largeurBarre, cx + ecart]) {
    groupe.appendChild(
      creerElementSVG('rect', {
        x: xGauche,
        y: cy - hauteurBarre / 2,
        width: largeurBarre,
        height: hauteurBarre,
        class: 'barre-pause',
      })
    );
  }

  svg.appendChild(groupe);
}

function masquerPause(svg) {
  svg.querySelector('#pause-plateau')?.remove();
}

// Le libelle du mode de pendule (phase 22bis, PLAN.md) : "Bonus | Coup+2
// Éject+0", "Délai | Coup+5s" ou "Chrono" (moteur/pendules.js,
// libellePendule). CORRIGE (saab : une premiere version l'affichait dans une
// bande a part, qui agrandissait le viewBox et retrecissait donc le plateau
// a l'ecran — "tout ce qu'on rajoute doit trouver sa place sans rien
// toucher ni deplacer de ce qui existait") : ni bande, ni agrandissement,
// juste un texte plus PETIT, coller CONTRE la pendule (meme y), dans le vide
// deja libre entre elle et le plateau (verifie a l'oeil, aucune bille du
// coin approchee). Pas de cadre autour de lui, comme le compteur Occ/Ref
// (rendu/compteur-occurrences.js) : seulement du texte, tourne comme la
// pendule pour se lire de haut en bas.
const DECALAGE_LIBELLE_PENDULE = HAUTEUR_BOUTON_PENDULE * 1.15 + JEU_PENDULE;

function dessinerLibellePendule(svg, camp, { x, y }) {
  const xLibelle = x - DECALAGE_LIBELLE_PENDULE;
  svg.appendChild(
    creerElementSVG('text', {
      id: `libelle-pendule-${camp}`,
      class: 'libelle-pendule',
      x: xLibelle,
      y,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      transform: `rotate(${ROTATION_PENDULE} ${xLibelle} ${y})`,
    })
  );
}
