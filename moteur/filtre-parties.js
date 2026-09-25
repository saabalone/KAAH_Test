// Choisir precisement quelles parties selectionner dans « Mes parties »
// (demande de saab : "un champ pour chaque element du titre des parties", a
// remplir et cocher). Pur, sans DOM : interface/filtre-parties.js affiche les
// champs, interface/mes-parties.js n'affiche que les parties qui correspondent.
//
// Les elements compares sont ceux dont le titre est fait (elementsDuTitre,
// moteur/nom-partie.js), lus dans les DONNEES — jamais en decoupant le titre
// sur ses virgules : un nom de puzzle en contient lui-meme.
//
// Ecriture d'un champ (second retour de saab) :
//   - une virgule separe plusieurs choix, un seul suffit ("N,T") ;
//   - date et tours : "<" avant, ">" apres, "=" ou rien = le DEBUT de la date
//     ("260925" : tout le 25/09/26) ou le nombre exact de tours ;
//   - joueurs, vainqueur : ni casse, ni espace, ni "_" ; un nom par defaut
//     (Joueur_1, Player_2, Joueur_1R) se trouve aussi par sa premiere lettre et
//     son numero ("j1") ; "A-B" = une partie entre A et B, dans un sens ou dans
//     l'autre ;
//   - score : "5-6" ou "6-5", le premier "-" facultatif ;
//   - le reste : "contient", sans casse.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : rien d'autre n'est
// necessaire ici.

const CHAMPS_DU_FILTRE = ['date', 'evenement', 'variante', 'joueurs', 'score', 'tours', 'vainqueur', 'statut'];

// Un filtre : un { actif, valeur } par champ (cocher sans perdre le texte
// saisi, et inversement), plus `branches` : 'toutes', 'avec' ou 'sans'.
const FILTRE_VIDE = Object.freeze({
  branches: 'toutes',
  ...Object.fromEntries(CHAMPS_DU_FILTRE.map((champ) => [champ, { actif: false, valeur: '' }])),
});

// "<2609" -> { signe: '<', reste: '2609' } ; sans signe, '='.
function lireComparaison(choix) {
  const signe = ['<', '>', '='].includes(choix[0]) ? choix[0] : '=';
  return { signe, reste: (signe === choix[0] ? choix.slice(1) : choix).trim() };
}

// Date AAMMJJHHMM : comparee sur la longueur saisie (ecriture a chiffres fixes,
// l'ordre du texte est celui du temps).
function dateCorrespond(date, choix) {
  const { signe, reste } = lireComparaison(choix);
  const debut = date.slice(0, reste.length);
  if (signe === '<') return debut < reste;
  if (signe === '>') return debut > reste;
  return debut === reste;
}

function toursCorrespondent(tours, choix) {
  const { signe, reste } = lireComparaison(choix);
  const nombre = Number(reste);
  if (reste === '' || Number.isNaN(nombre)) return false;
  if (signe === '<') return tours < nombre;
  if (signe === '>') return tours > nombre;
  return tours === nombre;
}

function simplifierNom(texte) {
  return texte.toLowerCase().replace(/[\s_]/g, '');
}

// Nom par defaut de KAAH (moteur/revanche.js, "Joueur 1", suffixe R en
// revanche) ou de KAAWA ("Player_1").
const NOM_PAR_DEFAUT = /^(joueur|player)(\d+)r?$/;

function nomCorrespond(nom, choix) {
  const simple = simplifierNom(nom);
  const cherche = simplifierNom(choix);
  if (simple.includes(cherche)) return true;
  // "Debut et fin" seulement pour un nom par defaut (saab) : "j1" -> Joueur_1.
  const parDefaut = NOM_PAR_DEFAUT.exec(simple);
  return parDefaut !== null && cherche.length >= 2 && cherche[0] === simple[0] && cherche.slice(1) === parDefaut[2];
}

function joueursCorrespondent(noir, blanc, choix) {
  if (nomCorrespond(noir, choix) || nomCorrespond(blanc, choix)) return true;
  const [a, b, ...rien] = choix.split('-');
  if (rien.length > 0 || !a?.trim() || !b?.trim()) return false;
  return (nomCorrespond(noir, a) && nomCorrespond(blanc, b)) || (nomCorrespond(noir, b) && nomCorrespond(blanc, a));
}

// Score "-5-6" : chaque camp, dans un ordre ou dans l'autre.
function scoreCorrespond(score, choix) {
  const [x, y] = score.replace(/^-/, '').split('-');
  const [a, b] = choix.replace(/^-/, '').split('-').map((morceau) => morceau.trim());
  if (b === undefined || b === '') return a === x || a === y;
  return (a === x && b === y) || (a === y && b === x);
}

function champCorrespond(champ, elements, choix) {
  if (champ === 'date') return dateCorrespond(elements.date, choix);
  if (champ === 'tours') return toursCorrespondent(elements.tours, choix);
  if (champ === 'joueurs') return joueursCorrespondent(elements.joueurNoir, elements.joueurBlanc, choix);
  if (champ === 'vainqueur') return nomCorrespond(elements.vainqueur, choix);
  if (champ === 'score') return scoreCorrespond(elements.score, choix);
  return elements[champ].toLowerCase().includes(choix.toLowerCase());
}

// Vrai si la partie correspond a TOUS les champs coches et remplis — et, dans
// chacun, a l'un de ses choix separes par une virgule.
function partieCorrespond(elements, filtre) {
  if (filtre.branches === 'avec' && !elements.branches) return false;
  if (filtre.branches === 'sans' && elements.branches) return false;
  for (const champ of CHAMPS_DU_FILTRE) {
    const { actif, valeur } = filtre[champ];
    const choix = valeur.split(',').map((morceau) => morceau.trim()).filter((morceau) => morceau !== '');
    if (actif && choix.length > 0 && !choix.some((unChoix) => champCorrespond(champ, elements, unChoix))) return false;
  }
  return true;
}
