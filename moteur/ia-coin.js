// L'ajout « Co », le COIN du bloc adverse (saab, 2026-11-06 : « la technique qui cherche à se mettre dans la bonne position
// d'attaque, càd en gros mettre des 3 billes alignées sur les 3 axes d'un coin le moins au bord du bloc de l'adversaire, au
// bout d'un moment avec son retard de 3 billes il devrait craquer qq part » ; « Ok, lance le coin »). Avec 3 billes d'avance
// et les deux camps en bloc, KAI++ gagnait une partie sur deux (essais 58 et 59) : Gs et Mc le poussaient a couper, sans lui
// dire ou attaquer.
//
// Joue par KAI++ (solveur/kai-plus.cpp, axes_sur_le_coin) ; cette copie sert a l'affichage, et tests/kai-plus.test.js
// l'exige egale.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : BILLES_MAX_PAR_COUP, couleurAdverse (regles.js), couleursDuPlateau
// (partie.js), DISTANCE_AU_CENTRE (ia-evaluation.js), CASES_VOISINES_IA (ia-evaluation-v2.js), estEnBloc (ia-groupe-principal.js)
// viennent d'autres fichiers du jeu, appeles seulement a l'usage.

// Un coin du bloc : au plus 3 voisines dans le bloc (une bille du tour d'un hexagone en a 3, d'un bord droit 4, du milieu 6).
const VOISINES_MAX_D_UN_COIN = 3;
// Les 3 axes d'une case : une direction et son opposee (moteur/plateau.js, DIRECTIONS : l'opposee de la direction d est d + 3).
const NOMBRE_D_AXES = 3;

// Le bloc de `camp` sur `couleurs` (notation -> couleur) : son plus grand groupe de billes voisines ; s'il y en a plusieurs de
// la meme taille, tous — le bloc ne depend alors pas de l'ordre des cases, le meme en JavaScript et en C++.
function blocDuCamp(couleurs, camp) {
  const restantes = new Set(Object.keys(couleurs).filter((notation) => couleurs[notation] === camp));
  const groupes = [];
  while (restantes.size > 0) {
    const groupe = [restantes.values().next().value];
    restantes.delete(groupe[0]);
    for (let rang = 0; rang < groupe.length; rang++) {
      for (const voisine of CASES_VOISINES_IA[groupe[rang]]) if (voisine !== null && restantes.delete(voisine)) groupe.push(voisine);
    }
    groupes.push(groupe);
  }
  const plusGrand = Math.max(0, ...groupes.map((groupe) => groupe.length));
  return new Set(groupes.filter((groupe) => groupe.length === plusGrand).flat());
}

// La case centrale et ses voisines : avec l'ajout Ce, quand `camp` tient e5, Co et Ca visent un coin ailleurs (saab : « lui
// couper un coin ailleurs »).
const CASE_CENTRALE = 'e5';
function horsDuCentreTenu(couleurs, camp, notation) {
  return couleurs[CASE_CENTRALE] !== camp || (notation !== CASE_CENTRALE && !CASES_VOISINES_IA[CASE_CENTRALE].includes(notation));
}

// Les coins du bloc de `camp` les moins au bord : ceux qui ont au plus VOISINES_MAX_D_UN_COIN voisines dans le bloc, au plus
// pres du centre. Un coin au bord ne laisse pas la place d'y aligner 3 billes. `horsDuCentre` (l'ajout Ce) : si `camp` tient
// e5, ni e5 ni ses voisines.
function coinsVises(couleurs, camp, horsDuCentre = false) {
  const bloc = blocDuCamp(couleurs, camp);
  const coins = [...bloc].filter((notation) => CASES_VOISINES_IA[notation].filter((voisine) => bloc.has(voisine)).length <= VOISINES_MAX_D_UN_COIN && (!horsDuCentre || horsDuCentreTenu(couleurs, camp, notation)));
  const plusPres = Math.min(...coins.map((notation) => DISTANCE_AU_CENTRE[notation]));
  return coins.filter((notation) => DISTANCE_AU_CENTRE[notation] === plusPres);
}

// Vrai si `camp` a une ligne de BILLES_MAX_PAR_COUP billes qui vise `coin` dans la direction `direction` (son rang dans
// DIRECTIONS) : les cases a 1, 2 et 3 pas du coin, toutes a lui.
function ligneQuiVise(couleurs, camp, coin, direction) {
  let ici = coin;
  for (let pas = 0; pas < BILLES_MAX_PAR_COUP; pas++) {
    ici = CASES_VOISINES_IA[ici][direction];
    if (ici === null || couleurs[ici] !== camp) return false;
  }
  return true;
}

// Vrai si la ligne de `camp` qui vise `coin` dans la direction `direction` peut le POUSSER tout de suite (l'ajout Ca, saab,
// 2026-11-11) : en sens inverse, a partir du coin, moins de billes adverses que la ligne (1 ou 2), puis une case vide ou le
// bord (la sortie).
function ligneQuiPousse(couleurs, camp, coin, direction) {
  if (!ligneQuiVise(couleurs, camp, coin, direction)) return false;
  const sens = (direction + NOMBRE_D_AXES) % (2 * NOMBRE_D_AXES);
  const adverse = couleurAdverse(camp);
  let ici = coin;
  let adverses = 0;
  while (ici !== null && couleurs[ici] === adverse) {
    adverses++;
    ici = CASES_VOISINES_IA[ici][sens];
  }
  return adverses < BILLES_MAX_PAR_COUP && (ici === null || couleurs[ici] === undefined);
}

// Les axes ou `camp` a une ligne de 3 qui vise un coin du bloc adverse (0 a 3), pour le meilleur de ses coins vises ;
// `quiPoussent` (l'ajout Ca) : seulement ceux dont la ligne peut pousser le coin ; `horsDuCentre` (l'ajout Ce) : un coin
// ailleurs que e5 et ses voisines, si l'adversaire tient e5.
function axesSurLeCoin(couleurs, camp, quiPoussent = false, horsDuCentre = false) {
  const ligne = quiPoussent ? ligneQuiPousse : ligneQuiVise;
  let meilleur = 0;
  for (const coin of coinsVises(couleurs, couleurAdverse(camp), horsDuCentre)) {
    let axes = 0;
    for (let axe = 0; axe < NOMBRE_D_AXES; axe++) {
      if (ligne(couleurs, camp, coin, axe) || ligne(couleurs, camp, coin, axe + NOMBRE_D_AXES)) axes++;
    }
    meilleur = Math.max(meilleur, axes);
  }
  return meilleur;
}

// Les lignes d'un camp sur le coin ne comptent que s'il mene de 3 billes ou plus (saab, 2026-11-07 : « l'intérêt de Co c'est
// normalement qd il a 3 billes d'avances car 2 billes ne suffisent normalement pas pour couper sans avoir un retour qq part »)
// — avant, il changeait des coups de l'ouverture, a 0-0, contre AbaPro.
const AVANCE_POUR_VISER_LE_COIN = 3;
function avanceDuCamp(etat, camp) {
  const ejecteesAdverses = camp === 'noir' ? etat.billesEjecteesBlanches : etat.billesEjecteesNoires;
  const ejecteesSiennes = camp === 'noir' ? etat.billesEjecteesNoires : etat.billesEjecteesBlanches;
  return ejecteesAdverses - ejecteesSiennes;
}

// Le terme Co pour `camp` : ses axes au carre (deux axes valent 4 fois un seul, trois 9 fois : l'adversaire ne pare pas tout)
// moins ceux de l'adversaire, fois le poids (positif) — chacun seulement s'il mene de AVANCE_POUR_VISER_LE_COIN billes. Avec
// l'ajout Ce, un coin ailleurs que e5.
function termeDuCoin(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  const horsDuCentre = Boolean(poids.centreAdverse);
  const axesAuCarre = (qui) => (avanceDuCamp(etat, qui) >= AVANCE_POUR_VISER_LE_COIN ? axesSurLeCoin(couleurs, qui, false, horsDuCentre) ** 2 : 0);
  return poids.lignesSurLeCoin * (axesAuCarre(camp) - axesAuCarre(couleurAdverse(camp)));
}

// L'ajout « Ca », le coin ATTAQUE (saab, 2026-11-11 : « ok, lance ») : comme Co, mais un axe ne compte que si sa ligne peut
// pousser le coin tout de suite — a l'essai 68, Co 30 faisait garder ses axes au meneur sans attaquer (pousser cassait les
// lignes que Co recompense) ; Ca recompense une position d'ou l'on pousse, pas une position a garder.
function termeDuCoinAttaque(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  const horsDuCentre = Boolean(poids.centreAdverse);
  const axesAuCarre = (qui) => (avanceDuCamp(etat, qui) >= AVANCE_POUR_VISER_LE_COIN ? axesSurLeCoin(couleurs, qui, true, horsDuCentre) ** 2 : 0);
  return poids.lignesQuiPoussentLeCoin * (axesAuCarre(camp) - axesAuCarre(couleurAdverse(camp)));
}

// L'ajout « Ce », le CENTRE adverse (saab, 2026-11-11 : « si l'adversaire a e5 dans son bloc, c'est vers lui aussi qu'il faut
// garder 2 axes de 3 billes, puis arriver à lui couper un coin ailleurs puis petit à petit arriver à prendre e5 » ; « Peut être
// qu'il faut essayer aussi de mettre des billes en attente sur le 3ème axe » ; « Ok »). Mesure sur les 92 positions en deux
// blocs : le mene tient e5 dans 55, ou le temoin ne gagne que 38 % ; avec moins de 2 axes pleins sur e5, le meneur perd une
// bille dans les 2 tours 4 fois plus souvent ; Co, qui vise e5 lui-meme, le fait entourer sur ses 3 axes — un mur ou il fait
// nulle. Ce garde 2 axes et des billes en attente sur le 3e, sans rien de plus pour le remplir : le reste attaque ailleurs.
const AXES_GARDES_SUR_LE_CENTRE = 2;
// Sur le 3e axe, une ligne pas encore pleine : 1 ou 2 billes.
const BILLES_EN_ATTENTE_MAX = BILLES_MAX_PAR_COUP - 1;

// Le nombre de billes de `camp` alignees vers e5 dans la direction `direction`, a partir de sa voisine (0 a 3).
function billesVersLeCentre(couleurs, camp, direction) {
  let ici = CASE_CENTRALE;
  let billes = 0;
  while (billes < BILLES_MAX_PAR_COUP) {
    ici = CASES_VOISINES_IA[ici][direction];
    if (ici === null || couleurs[ici] !== camp) break;
    billes++;
  }
  return billes;
}

// Ce pour `camp`, en billes : rien si l'adversaire ne tient pas e5. Sinon, sur chacun des 3 axes de e5, le plus long
// alignement de ses billes vers e5 (le meilleur des deux sens) ; chaque axe plein compte BILLES_MAX_PAR_COUP billes, jusqu'a
// AXES_GARDES_SUR_LE_CENTRE axes ; une fois ces 2 axes pleins, le 3e compte ses billes, au plus BILLES_EN_ATTENTE_MAX.
function valeurDuCentreAdverse(couleurs, camp) {
  if (couleurs[CASE_CENTRALE] !== couleurAdverse(camp)) return 0;
  const axes = [];
  for (let axe = 0; axe < NOMBRE_D_AXES; axe++) axes.push(Math.max(billesVersLeCentre(couleurs, camp, axe), billesVersLeCentre(couleurs, camp, axe + NOMBRE_D_AXES)));
  axes.sort((a, b) => b - a);
  const pleins = axes.filter((billes) => billes === BILLES_MAX_PAR_COUP).length;
  const gardes = Math.min(pleins, AXES_GARDES_SUR_LE_CENTRE);
  const enAttente = pleins >= AXES_GARDES_SUR_LE_CENTRE ? Math.min(axes[AXES_GARDES_SUR_LE_CENTRE], BILLES_EN_ATTENTE_MAX) : 0;
  return gardes * BILLES_MAX_PAR_COUP + enAttente;
}

// Le terme Ce pour `camp` : le sien moins celui de l'adversaire, fois le poids — chacun seulement s'il mene de
// AVANCE_POUR_VISER_LE_COIN billes, comme Co.
function termeDuCentreAdverse(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  const valeur = (qui) => (avanceDuCamp(etat, qui) >= AVANCE_POUR_VISER_LE_COIN ? valeurDuCentreAdverse(couleurs, qui) : 0);
  return poids.centreAdverse * (valeur(camp) - valeur(couleurAdverse(camp)));
}

// L'ajout « Cc », le CONTROLE DU CENTRE (saab, 2026-11-11 : « Prendre e5, c'est le contrôler au maximum, c'est cette case qui permet
// de tout contrôler, on ne doit la quitter que si l'adversaire n'est plus en bloc, car sinon il faut tout recommencer » ; « ok »). Sur
// chacun des 3 axes de e5, la ligne de ses billes qui passe par e5 : a BILLES_MAX_PAR_COUP, e5 ne se pousse plus sur cet axe (on ne
// pousse qu'en surnombre, a 3 billes au plus). Son poids reste sous la valeur d'une bille : un 3/2 qui ejecte en quittant e5 reste
// joue (saab : « les 2 billes gagnées pèsent lourd »).
const LA_BILLE_DE_E5 = 1;

// Cc pour `camp`, en billes : rien s'il ne tient pas e5, ou si l'adversaire n'est plus en bloc ; sinon, sur chaque axe de e5, la
// ligne de ses billes qui passe par e5, au plus BILLES_MAX_PAR_COUP (3 axes pleins : 9, e5 imprenable).
function valeurDuControleDuCentre(couleurs, camp) {
  if (couleurs[CASE_CENTRALE] !== camp || !estEnBloc(couleurs, couleurAdverse(camp))) return 0;
  let valeur = 0;
  for (let axe = 0; axe < NOMBRE_D_AXES; axe++) {
    const ligne = LA_BILLE_DE_E5 + billesVersLeCentre(couleurs, camp, axe) + billesVersLeCentre(couleurs, camp, axe + NOMBRE_D_AXES);
    valeur += Math.min(ligne, BILLES_MAX_PAR_COUP);
  }
  return valeur;
}

// Le terme Cc pour `camp` : le sien moins celui de l'adversaire, fois le poids, quel que soit le score.
function termeDuControleDuCentre(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return poids.controleDuCentre * (valeurDuControleDuCentre(couleurs, camp) - valeurDuControleDuCentre(couleurs, couleurAdverse(camp)));
}
