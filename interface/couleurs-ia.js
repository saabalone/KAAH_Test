// Les couleurs des profils IA a l'ecran (moteur/couleurs-profil-ia.js : orange,
// pas encore valide ; vert, derniere validation ; jaune, plus ancienne) — sur
// une ligne de Reglages, une liste de profils, le nom d'une machine (saab,
// 2026-10-02 : « on remonte les couleurs de la valeur jusqu'a son fichier »).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : couleurDuProfilIA
// (moteur/couleurs-profil-ia.js), nomDeLaMachine, ABREVIATIONS_STYLES_IA
// (moteur/ia.js), listerProfilsIA (interface/profils-ia.js) viennent de
// fichiers charges avant celui-ci.

const CLASSES_COULEURS_IA = { modifie: 'reglage-modifie', dernier: 'reglage-valide-dernier', ancien: 'reglage-valide-ancien' };

function poserCouleurIA(element, couleur) {
  for (const [nom, classe] of Object.entries(CLASSES_COULEURS_IA)) element.classList.toggle(classe, couleur === nom);
}

// Une liste de profils (Reglages, choix des joueurs) : chaque profil a sa
// couleur, la liste fermee celle du profil choisi (saab : « idem lorsqu'ils se
// deplient pour choisir »). `couleurDe(nom)` : facultatif, pour le profil en
// cours de retouche. Un nom qui n'est plus un profil : sans couleur.
function colorerListeProfilsIA(select, couleurDe = null) {
  const profils = new Map(listerProfilsIA().map((profil) => [profil.nom, profil]));
  const couleur = (nom) => (!profils.has(nom) ? null : couleurDe ? couleurDe(nom) : couleurDuProfilIA(profils.get(nom)));
  for (const option of select.options) poserCouleurIA(option, couleur(option.value));
  poserCouleurIA(select, couleur(select.value));
}

// Le nom d'une machine (KAI2_Nor_5s), l'abreviation de son style (saab :
// « Agr / Nor / Def ») dans la couleur de ses reglages : [texte, <span>, texte].
function nomDeLaMachineColore(machine, couleur) {
  const nom = nomDeLaMachine(machine);
  const style = document.createElement('span');
  style.textContent = ABREVIATIONS_STYLES_IA[machine.style];
  poserCouleurIA(style, couleur);
  const debut = nom.indexOf(`_${style.textContent}_`) + 1;
  return [nom.slice(0, debut), style, nom.slice(debut + style.textContent.length)];
}
