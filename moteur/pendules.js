// Calcul des pendules : le temps restant de chaque camp, et comment ce
// temps evolue a chaque coup. Pur et immuable comme le reste du moteur :
// aucun acces au DOM, aucun minuteur reel ici. C'est interface/pendules.js
// qui appelle ecoulerTemps() a intervalles reguliers avec le temps
// REELLEMENT ecoule (mesure via Date.now()), pour que le passage en
// arriere-plan de l'onglet ne fasse jamais deriver les pendules — voir
// CLAUDE.md, critere de fin de cette phase.
//
// Deux modes, comme dans KAAWA :
//   - "pendule" : chaque camp a un temps qui decompte ; seul le joueur au
//     trait voit le sien decroitre, et un temps a zero fait perdre.
//   - "chrono" : pas de decompte qui fait perdre, on mesure juste le temps
//     pris sur le coup en cours (remis a zero a chaque coup joue).
//
// La sirene d'alerte sonore (fin de la phase 10 dans PLAN.md) est laissee
// a la phase 21 ("Les sons") : ce fichier n'a besoin de rien de plus qu'un
// nombre de secondes pour que l'interface decide elle-meme, a l'affichage,
// si le temps est bas — inutile d'ajouter ici un champ qu'aucun test ne
// demande.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ce fichier se charge
// comme un script classique, dans l'ordre liste par index.html.

// Construit des pendules neuves. `reglages` : { mode, tempsInitial,
// bonusParCoup, bonusParEjection, delai, modeChoisi } — tous facultatifs
// sauf mode et tempsInitial (le mode chrono demarre a zero : il mesure un
// coup, pas un compte a rebours). `modeChoisi` (phase 22bis) : 'chrono',
// 'bonus' ou 'delai' — le nom du mode tel que choisi dans le popup
// (interface/pendules-mode.js), gardé A PART de `mode` ('pendule'/'chrono',
// ce que le CALCUL regarde) pour que Bonus et Délai, deux `mode: 'pendule'`
// aux yeux du calcul, restent distinguables pour le LABEL (libellePendule
// plus bas) meme quand leurs deux chiffres sont a zero.
function creerPendules(reglages) {
  const tempsDepart = reglages.mode === 'chrono' ? 0 : reglages.tempsInitial;
  return {
    mode: reglages.mode,
    modeChoisi: reglages.modeChoisi,
    tempsNoir: tempsDepart,
    tempsBlanc: tempsDepart,
    delai: reglages.delai ?? 0,
    delaiRestant: reglages.delai ?? 0,
    bonusParCoup: reglages.bonusParCoup ?? 0,
    bonusParEjection: reglages.bonusParEjection ?? 0,
    perdantParTemps: null,
  };
}

// Fait avancer le temps de `secondes` pour le joueur au trait. En mode
// pendule, respecte le delai (a la Fischer) : tant qu'il en reste, la
// pendule elle-meme ne bouge pas.
function ecoulerTemps(pendules, joueurAuTrait, secondes) {
  if (pendules.perdantParTemps) return pendules; // partie deja perdue au temps, plus rien ne bouge

  const cle = joueurAuTrait === 'noir' ? 'tempsNoir' : 'tempsBlanc';

  if (pendules.mode === 'chrono') {
    return { ...pendules, [cle]: pendules[cle] + secondes };
  }

  const delaiRestant = Math.max(0, pendules.delaiRestant - secondes);
  const secondesSurLaPendule = Math.max(0, secondes - pendules.delaiRestant);
  const nouveauTemps = Math.max(0, pendules[cle] - secondesSurLaPendule);

  return {
    ...pendules,
    delaiRestant,
    [cle]: nouveauTemps,
    perdantParTemps: nouveauTemps === 0 ? joueurAuTrait : null,
  };
}

// Bascule vers le mode chrono, sans toucher au temps deja ecoule ni aux
// compteurs — utilise quand la partie continue en analyse apres sa fin
// (voir interface/saisie.js) : le decompte qui fait perdre n'a alors plus
// de sens. KAAWA fait la meme bascule pour toute branche qui n'est plus
// la ligne reellement jouee (son `clock_mode`).
function passerEnChrono(pendules) {
  if (pendules.mode === 'chrono') return pendules;
  return { ...pendules, mode: 'chrono', perdantParTemps: null };
}

// A appeler juste apres qu'un coup soit joue par `joueurQuiAJoue` : ajoute
// les bonus a son temps (mode pendule), ou remet son chrono a zero pour le
// prochain coup (mode chrono). Le delai reparts toujours complet pour le
// tour suivant : il ne s'accumule pas d'un tour a l'autre.
function appliquerBonusDeCoup(pendules, joueurQuiAJoue, ejection) {
  const cle = joueurQuiAJoue === 'noir' ? 'tempsNoir' : 'tempsBlanc';
  const delaiRestant = pendules.delai;

  if (pendules.mode === 'chrono') {
    return { ...pendules, [cle]: 0, delaiRestant };
  }

  const bonus = pendules.bonusParCoup + (ejection ? pendules.bonusParEjection : 0);
  return { ...pendules, [cle]: pendules[cle] + bonus, delaiRestant };
}

// Change de mode EN COURS DE PARTIE (phase 22bis, bouton dedie de la
// colonne de gauche) : `tempsNoir`/`tempsBlanc` (le temps deja ecoule)
// survivent tels quels, jamais remis a `tempsInitial` — tout le reste vient
// ENTIEREMENT de `nouveauxReglages`, jamais un melange avec les anciens
// (passer de Bonus a Délai ne doit garder aucune trace de bonusParCoup).
// `delaiRestant` redemarre plein : un délai a moitie ecoule n'a plus de
// sens des que son propre reglage change de valeur. Une defaite au temps
// deja actee (`perdantParTemps`) est effacee, comme passerEnChrono : changer
// de mode est une decision de saab, jamais cense rejouer un verdict deja
// rendu.
function changerModePendules(pendules, nouveauxReglages) {
  return {
    ...pendules,
    mode: nouveauxReglages.mode,
    modeChoisi: nouveauxReglages.modeChoisi,
    delai: nouveauxReglages.delai ?? 0,
    delaiRestant: nouveauxReglages.delai ?? 0,
    bonusParCoup: nouveauxReglages.bonusParCoup ?? 0,
    bonusParEjection: nouveauxReglages.bonusParEjection ?? 0,
    perdantParTemps: null,
  };
}

// Le texte affiche sous chaque pendule (phase 22bis), tel que KAAWA le
// construit (kaa_board_widget_ClO_Co.py) : uniquement a partir de ce que
// `pendules` porte deja sur elle (jamais un etat separe qui pourrait
// diverger, PLAN.md, phase 22bis, test 3).
function libellePendule(pendules) {
  if (pendules.modeChoisi === 'delai') return `Délai | Coup+${pendules.delai}s`;
  if (pendules.modeChoisi === 'bonus') return `Bonus | Coup+${pendules.bonusParCoup} Éject+${pendules.bonusParEjection}`;
  return 'Chrono';
}
