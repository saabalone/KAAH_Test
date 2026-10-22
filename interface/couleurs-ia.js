// Les couleurs des profils IA a l'ecran (moteur/couleurs-profil-ia.js : orange,
// pas encore valide ; vert, derniere validation ; jaune, plus ancienne) — sur
// une ligne de Reglages, une liste de profils, le nom d'une machine (saab,
// 2026-10-02 : « on remonte les couleurs de la valeur jusqu'a son fichier »).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : couleurDuProfilIA
// (moteur/couleurs-profil-ia.js), listerProfilsIA (interface/profils-ia.js) viennent de
// fichiers charges avant celui-ci. Le nom d'une machine en couleurs :
// interface/nom-machine-couleurs.js.

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
  suivreLeProfilParDefaut(select); // interface/noms-profils-ia.js
}
