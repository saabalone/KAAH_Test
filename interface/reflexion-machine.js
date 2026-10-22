// La REFLEXION D'UNE MACHINE dans les boites de joueur (sorti d'interface/choix-joueurs.js) :
// les paliers des boutons − et +, et la reflexion proposee pour son niveau.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : REFLEXION_SANS_LIMITE_S,
// MACHINE_PAR_DEFAUT (moteur/ia.js), TEMPS_DES_NIVEAUX_KAI_PLUS_S
// (interface/conseil-temps-ia.js) viennent de fichiers charges avant celui-ci.

// Les paliers (secondes), dans les bornes de lireMachine (moteur/ia.js), puis sans limite
// (saab, 2026-10-22 : « il manque des paliers et infini ») : le champ vide, « ∞ ».
const PALIERS_REFLEXION_S = [0.5, 1, 2, 3, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 300, REFLEXION_SANS_LIMITE_S];
const rangDuPalier = (secondes) => (secondes === REFLEXION_SANS_LIMITE_S ? Infinity : secondes);

// Le palier au-dessus (sens 1) ou au-dessous (-1) de `valeur`, meme hors palier.
function palierVoisin(valeur, sens) {
  const rang = rangDuPalier(valeur);
  if (sens > 0) return PALIERS_REFLEXION_S.find((palier) => rangDuPalier(palier) > rang) ?? PALIERS_REFLEXION_S.at(-1);
  return PALIERS_REFLEXION_S.findLast((palier) => rangDuPalier(palier) < rang) ?? PALIERS_REFLEXION_S[0];
}

// La reflexion proposee pour un niveau (saab, 2026-10-22 : « le faire évoluer en fonction du
// niveau pour être à peu près sûr de l'atteindre ») : le premier palier qui couvre MARGE fois
// le temps qui suffit le plus souvent (la mesure du conseil de temps, sur un ordinateur — un
// telephone est plusieurs fois plus lent), jamais moins que l'ancienne reflexion par defaut,
// au plus le dernier palier avant ∞ (la machine joue des que son niveau est fini : une
// reflexion large ne la ralentit pas).
const MARGE_DE_LA_REFLEXION_PROPOSEE = 4;
const RANG_DU_TEMPS_LE_PLUS_SOUVENT = 1; // [mediane, 80 %]
function reflexionProposee(niveau, elague) {
  const table = elague ? TEMPS_DES_NIVEAUX_KAI_PLUS_S.avecElagage : TEMPS_DES_NIVEAUX_KAI_PLUS_S.sansElagage;
  const voulue = (table[niveau]?.[RANG_DU_TEMPS_LE_PLUS_SOUVENT] ?? 0) * MARGE_DE_LA_REFLEXION_PROPOSEE;
  const paliers = PALIERS_REFLEXION_S.filter((palier) => palier !== REFLEXION_SANS_LIMITE_S && palier >= MACHINE_PAR_DEFAUT.reflexionMax);
  return paliers.find((palier) => palier >= voulue) ?? paliers.at(-1);
}
