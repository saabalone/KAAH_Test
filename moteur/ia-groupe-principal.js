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
// L'ajout « Pm », les PETITS MORCEAUX seulement (saab, 2026-11-12 : « Je ne sais pas si c'est une question d'El, mais plutôt un vision
// du jeu, non? » ; « Ok pour l'ajout ») : avec `petitsMorceaux` > 0, seulement les billes des morceaux de moins de `petitsMorceaux`
// billes — un morceau de BILLES_MAX_PAR_COUP billes peut pousser et se defendre. Dans 2611121807 (le P9 contre AP6), au coup 53, la
// branche de saab e3h6 coupait Noir en deux groupes de 6 et 8 : 6 billes dehors, -120 a 4-0, et le tri de la racine la rangeait 26e.
function billesHorsDuGroupePrincipal(couleurs, camp, petitsMorceaux = 0) {
  const restantes = new Set(Object.keys(couleurs).filter((notation) => couleurs[notation] === camp));
  const estCompte = (taille) => !(petitsMorceaux > 0) || taille < petitsMorceaux;
  let comptees = 0;
  let plusGrand = 0;
  while (restantes.size > 0) {
    const aVoir = [restantes.values().next().value];
    restantes.delete(aVoir[0]);
    let taille = 0;
    while (aVoir.length > 0) {
      taille++;
      for (const voisine of CASES_VOISINES_IA[aVoir.pop()]) if (voisine !== null && restantes.delete(voisine)) aVoir.push(voisine);
    }
    if (estCompte(taille)) comptees += taille;
    plusGrand = Math.max(plusGrand, taille);
  }
  return estCompte(plusGrand) ? comptees - plusGrand : comptees;
}

// Un camp EN BLOC : au plus BILLES_DEHORS_D_UN_BLOC billes hors de son groupe principal (saab, 2026-11-04, pour les phases :
// « groupé, au plus 1 bille dehors » ; moteur/ia-phase.js et l'ajout Cc, moteur/ia-coin.js).
const BILLES_DEHORS_D_UN_BLOC = 1;
const estEnBloc = (couleurs, camp) => billesHorsDuGroupePrincipal(couleurs, camp) <= BILLES_DEHORS_D_UN_BLOC;

// L'ajout « He », Hp qui grandit avec l'ecart au score (saab, 2026-11-04 : « 2 blocs complets sur le centre avec seulement 2
// billes d'écart au score ne peut faire que Nulle si pas d'erreur, donc il faut éviter que l'adversaire qui à un retard de 2
// billes ne se regroupe » ; « Ok pour He »). A 2 billes d'ecart, sur 20 tours, deux blocs : rien dans 3 cas sur 4 ; celui qui
// mene, groupe face a un camp coupe, gagne 71 % au banc et 67 % contre AbaPro ; coupe face a un camp groupe, 20 % et 32 %. A
// egalite au score, la position elle-meme n'en a aucun ; la recherche, elle, voit les ejections a venir : dans 2611040956,
// He -20 change deja le tour 3, He -10 le tour 26.
function termeDesBillesHorsDuGroupeSelonLEcart(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  const ecart = Math.abs(etat.billesEjecteesNoires - etat.billesEjecteesBlanches);
  const morceaux = poids.petitsMorceaux ?? 0;
  return poids.billesHorsDuGroupeSelonLEcart * ecart * (billesHorsDuGroupePrincipal(couleurs, camp, morceaux) - billesHorsDuGroupePrincipal(couleurs, couleurAdverse(camp), morceaux));
}

// L'ajout « Ba », les BILLES AMIES d'ULA (saab, 2026-11-11 : « Dans ULA il compte les billes amies, càd celles avec qui une bille est en
// contacte, 6 c'est les 7 billes en marguerite » ; « Donc tu vois pour les billes amies? ») : chaque bille vaut selon le nombre de ses
// voisines de son camp, la table de debutsaab9 (« Cl_#saab, Réglages ULA », compacite, contact avec amies). La Cohesion de KAI++
// paie chaque paire de voisines au meme prix ; ULA paie surtout la bille tres entouree, et fait payer la bille seule.
const VALEUR_SELON_LES_BILLES_AMIES = [-2, 0, 1, 3, 5, 6, 7];

// Ba pour `camp`, en points d'ULA : la somme, sur ses billes, de la valeur de leur nombre de billes amies.
function valeurDesBillesAmies(couleurs, camp) {
  let valeur = 0;
  for (const [notation, couleur] of Object.entries(couleurs)) {
    if (couleur !== camp) continue;
    const amies = CASES_VOISINES_IA[notation].filter((voisine) => voisine !== null && couleurs[voisine] === camp).length;
    valeur += VALEUR_SELON_LES_BILLES_AMIES[amies];
  }
  return valeur;
}

// Le terme Ba pour `camp` : le sien moins celui de l'adversaire, fois le poids.
function termeDesBillesAmies(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return poids.billesAmies * (valeurDesBillesAmies(couleurs, camp) - valeurDesBillesAmies(couleurs, couleurAdverse(camp)));
}

// Le terme Hp pour `camp` : ses billes hors du groupe principal moins celles de l'adversaire, fois le poids (negatif).
function termeDesBillesHorsDuGroupePrincipal(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  const morceaux = poids.petitsMorceaux ?? 0;
  return poids.billesHorsDuGroupePrincipal * (billesHorsDuGroupePrincipal(couleurs, camp, morceaux) - billesHorsDuGroupePrincipal(couleurs, couleurAdverse(camp), morceaux));
}
