// L'ajout « At », les angles des triangles (saab, 2026-11-03 : « repérer les billes sur les angles des triangles
// a135c135e1..., ou a24c246e1..., ou b135d1..., b246d2... ; ça sert de défense et aussi d'attaque si on remplit ces
// triangles, et donc mettre un poids At (Angle triangle) »). Un triangle de cote 2 a ses 3 angles a 2 pas l'un de
// l'autre — lettre et chiffre de meme parite : une des 4 familles de saab — et ses 3 milieux entre eux ; rempli, c'est
// le triangle de 6 billes. Chaque triangle dont les 3 angles sont au camp rapporte ce poids, et le coute chez
// l'adversaire. Contre AP6 sans livre, dans les 7 parties perdues ou nulles, KAI++ en tenait 0,3 a 0,8 par position et
// AP6 1 a 3,5 ; dans les 3 gagnees avec Blanc, KAI++ 1,1 a 2,5 ; AP10, qui bat AP6 6-1, 2,2.
//
// Joue par KAI++ (solveur/kai-plus.cpp, angles_de_triangles) ; cette copie sert a l'affichage, et
// tests/kai-plus.test.js l'exige egale.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : casesDuPlateau, estCaseValide, versNotation (plateau.js),
// couleurAdverse (regles.js), couleursDuPlateau (partie.js) viennent de fichiers charges avant celui-ci.

// Les angles des 72 triangles de cote 2, en notation. En coordonnees axiales : (q, r), (q + 2, r), (q + 2, r - 2), et
// (q, r), (q, r - 2), (q + 2, r - 2) — les deux orientations. Les milieux sont toujours sur le plateau quand les
// angles y sont (un hexagone n'a pas de creux).
const COTE_DES_TRIANGLES = 2;
const ANGLES_DES_TRIANGLES = casesDuPlateau().flatMap(({ q, r }) =>
  [
    [{ q, r }, { q: q + COTE_DES_TRIANGLES, r }, { q: q + COTE_DES_TRIANGLES, r: r - COTE_DES_TRIANGLES }],
    [{ q, r }, { q, r: r - COTE_DES_TRIANGLES }, { q: q + COTE_DES_TRIANGLES, r: r - COTE_DES_TRIANGLES }],
  ]
    .filter((angles) => angles.every((angle) => estCaseValide(angle.q, angle.r)))
    .map((angles) => angles.map((angle) => versNotation(angle.q, angle.r)))
);

// Les triangles de `camp` sur `couleurs` (notation -> couleur) : ceux dont les 3 angles sont a lui.
function anglesDeTriangles(couleurs, camp) {
  return ANGLES_DES_TRIANGLES.filter((angles) => angles.every((notation) => couleurs[notation] === camp)).length;
}

// Le terme At pour `camp` : ses triangles moins ceux de l'adversaire, fois le poids.
function termeDesAnglesDeTriangles(etat, camp, poids) {
  const couleurs = couleursDuPlateau(etat.plateau);
  return poids.anglesDeTriangles * (anglesDeTriangles(couleurs, camp) - anglesDeTriangles(couleurs, couleurAdverse(camp)));
}
