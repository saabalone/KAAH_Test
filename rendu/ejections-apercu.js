// Billes ejectees dans un APERCU (Mes parties/Variantes/Puzzles, phase 12,
// 13, 16) : deux colonnes de pions (une par camp), DANS le <svg> du plateau
// miniature lui-meme, en bas a gauche — exactement KAAWA (verifie dans
// kaa_ui_widgets_ClO_Co.py, MiniBoard._draw, commentaire "M38 — Billes
// ejectees : 2 colonnes verticales en bas a gauche").
//
// PAS un <svg> A PART, ni une gouttiere ajoutee au viewBox : le plateau
// miniature (rendu/plateau-svg.js, ajusterViewBox) laisse deja un coin vide
// en bas a gauche de son viewBox — les rangees a/b/c s'arretent de plus en
// plus tot en s'eloignant de la rangee e (la plus longue), qui seule touche
// le bord du viewBox. Les pions se posent dans ce vide naturel, jamais sur
// une vraie case. (Premiere version de cette fonctionnalite : un triangle
// pointe en haut, dans un <svg> separe — abandonnee, voir JOURNAL.md :
// l'orientation du triangle noir ne correspondait pas a celle attendue, et
// surtout un triangle ne montre pas assez clairement l'ECART entre les deux
// camps, contrairement a deux colonnes cote a cote.)
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerElementSVG
// (rendu/plateau-svg.js) et EJECTIONS_POUR_GAGNER (moteur/partie.js)
// viennent de fichiers charges avant celui-ci dans index.html.

const RAYON_EJECT_APERCU = RAYON_CASE * 0.3;
const ESPACE_EJECT_APERCU = RAYON_EJECT_APERCU * 2.3; // vertical, dans une colonne
const ESPACE_COLONNES_EJECT_APERCU = RAYON_EJECT_APERCU * 2.4; // horizontal, entre les 2 colonnes
// Coin bas-gauche du viewBox jusqu'au premier pion : assez pour ne jamais
// mordre sur la rangee 'a', verifie contre les coordonnees reelles du
// plateau (rangee 'a' commence a 35 unites du bord gauche du viewBox).
const MARGE_COIN_EJECT_APERCU = RAYON_CASE * 0.4;

// Une colonne de EJECTIONS_POUR_GAGNER pions, qui se remplit du bas vers le
// haut (`i = 0` est le pion le plus bas) — meme sens que KAAWA. Memes
// classes CSS que les vraies pistes du plateau principal
// (rendu/ejections.js, styles.css : .piste-case, .piste-ejection-{couleur}
// .piste-remplie) — UNE SEULE regle de couleur pour "case vide"/"case
// ejectee", jamais une seconde version inventee ici (CLAUDE.md : une regle
// n'est jamais ecrite a deux endroits). Chaque pion porte sa couleur et son
// rang (1 = le plus bas) : l'editeur de la boite « My » s'en sert pour regler
// les ejections d'un clic (interface/editeur-position.js) ; ailleurs, inertes.
function dessinerColonneEjectionsApercu(svg, x, yBase, nombreEjectees, couleur) {
  const groupe = creerElementSVG('g', { class: `piste-ejection-${couleur}` });
  for (let i = 0; i < EJECTIONS_POUR_GAGNER; i++) {
    const rempli = i < nombreEjectees;
    groupe.appendChild(
      creerElementSVG('circle', {
        cx: x,
        cy: yBase - i * ESPACE_EJECT_APERCU,
        r: RAYON_EJECT_APERCU,
        class: rempli ? 'piste-case piste-remplie' : 'piste-case',
        'data-ejection-couleur': couleur,
        'data-ejection-rang': String(i + 1),
      })
    );
  }
  svg.appendChild(groupe);
}

// A appeler APRES dessinerPlateau (et la pose des billes) sur le MEME
// <svg> : lit son viewBox deja fixe pour placer les deux colonnes dans son
// coin bas-gauche, sans le modifier. `billesEjecteesNoires`/
// `billesEjecteesBlanches` : voir moteur/partie.js.
function dessinerEjectionsApercu(svg, billesEjecteesNoires, billesEjecteesBlanches) {
  const [xMin, yMin, , hauteur] = svg.getAttribute('viewBox').split(' ').map(Number);
  const xNoir = xMin + MARGE_COIN_EJECT_APERCU;
  const xBlanc = xNoir + ESPACE_COLONNES_EJECT_APERCU;
  const yBase = yMin + hauteur - MARGE_COIN_EJECT_APERCU;
  dessinerColonneEjectionsApercu(svg, xNoir, yBase, billesEjecteesNoires, 'noir');
  dessinerColonneEjectionsApercu(svg, xBlanc, yBase, billesEjecteesBlanches, 'blanc');
}
