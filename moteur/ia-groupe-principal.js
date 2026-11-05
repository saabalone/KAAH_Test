// L'ajout « Hp », les billes hors du groupe principal (saab, 2026-11-04 : « le pb c'est qu'il a son groupe isolé au
// bord » ; « Ok pour Hp ») : chaque bille hors du plus grand groupe de billes voisines de son camp coute ce poids
// (negatif), et le rapporte chez l'adversaire. Contre AP6 sans livre, dans 2611040008, 5 a 7 billes restent coupees en
// g-h-i jusqu'au tour 16 ; dans les 10 parties perdues ou nulles, AP6 reunit ses billes le premier ; dans les 4 gagnees
// avec Blanc, KAI++ les reunit avant lui ou au plus 3 tours apres. Gs ne paie que la reunion complete, souvent trop loin
// pour la recherche ; Hp paie chaque bille ramenee.
//
// Joues par KAI++ (solveur/kai-plus.cpp, billes_hors_du_groupe_principal) ; cette copie sert a l'affichage, et
// tests/kai-plus.test.js l'exige egale.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : couleurAdverse (regles.js), couleursDuPlateau (partie.js),
// CASES_VOISINES_IA (ia-evaluation-v2.js) viennent d'autres fichiers du jeu, appeles seulement a l'usage.

// Les billes de `camp` sur `couleurs` (notation -> couleur) hors de son plus grand groupe ; aucune bille, aucune.
function billesHorsDuGroupePrincipal(couleurs, camp) {
  const restantes = new Set(Object.keys(couleurs).filter((notation) => couleurs[notation] === camp));
  const total = restantes.size;
  let plusGrand = 0;
  while (restantes.size > 0) {
    const aVoir = [restantes.values().next().value];
    restantes.delete(aVoir[0]);
    let taille = 0;
    while (aVoir.length > 0) {
      taille++;
      for (const voisine of CASES_VOISINES_IA[aVoir.pop()]) if (voisine !== null && restantes.delete(voisine)) aVoir.push(voisine);
    }
    plusGrand = Math.max(plusGrand, taille);
  }
  return total - plusGrand;
}

// L'ajout « He », Hp qui grandit avec l'ecart au score (saab, 2026-11-04 : « 2 blocs complets sur le centre avec seulement 2
// billes d'écart au score ne peut faire que Nulle si pas d'erreur, donc il faut éviter que l'adversaire qui à un retard de 2
// billes ne se regroupe » ; « Ok pour He »). A 2 billes d'ecart, sur 20 tours, deux blocs : rien dans 3 cas sur 4 ; celui qui
// mene, groupe face a un camp coupe, gagne 71 % au banc et 67 % contre AbaPro ; coupe face a un camp groupe, 20 % et 32 %. A
// egalite au score, la position elle-meme n'en a aucun ; la recherche, elle, voit les ejections a venir : dans 2611040956,
// He -20 change deja le tour 3, He -10 le tour 26.
function termeDesBillesHorsDuGroupeSelonLEcart(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  const ecart = Math.abs(etat.billesEjecteesNoires - etat.billesEjecteesBlanches);
  return poids.billesHorsDuGroupeSelonLEcart * ecart * (billesHorsDuGroupePrincipal(couleurs, camp) - billesHorsDuGroupePrincipal(couleurs, couleurAdverse(camp)));
}

// Le terme Hp pour `camp` : ses billes hors du groupe principal moins celles de l'adversaire, fois le poids (negatif).
function termeDesBillesHorsDuGroupePrincipal(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return poids.billesHorsDuGroupePrincipal * (billesHorsDuGroupePrincipal(couleurs, camp) - billesHorsDuGroupePrincipal(couleurs, couleurAdverse(camp)));
}
