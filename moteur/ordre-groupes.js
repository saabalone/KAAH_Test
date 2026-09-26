// L'ordre des groupes d'icones de la colonne de gauche, choisi par le joueur
// (saab : "pouvoir reorganiser les icones dans la barre par groupe" ; par
// groupe seulement, les icones restent dans le leur). Pur, sans DOM :
// interface/ordre-colonne.js deplace les groupes et retient l'ordre. Un groupe
// y est designe par une cle stable (l'identifiant de son premier bouton).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// L'ordre a afficher : celui retenu pour les groupes qu'il connait ; un groupe
// qu'il ne connait pas (ajoute par une version plus recente) garde sa place
// d'origine ; une cle retenue qui n'existe plus est oubliee.
function ordonnerGroupes(ordreDOrigine, ordreRetenu) {
  const connus = ordreRetenu.filter((cle) => ordreDOrigine.includes(cle));
  const nouveaux = new Set(ordreDOrigine.filter((cle) => !connus.includes(cle)));
  let suivant = 0;
  return ordreDOrigine.map((cle) => (nouveaux.has(cle) ? cle : connus[suivant++]));
}

// `ordre` avec `cle` montee (sens -1) ou descendue (sens 1) d'une place ;
// inchange au bord. Jamais modifie en place.
function deplacerGroupe(ordre, cle, sens) {
  const depart = ordre.indexOf(cle);
  const arrivee = depart + sens;
  if (depart === -1 || arrivee < 0 || arrivee >= ordre.length) return [...ordre];
  const resultat = [...ordre];
  [resultat[depart], resultat[arrivee]] = [resultat[arrivee], resultat[depart]];
  return resultat;
}
