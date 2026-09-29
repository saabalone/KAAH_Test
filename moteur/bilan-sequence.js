// Ce qui se lit sur la sequence regardee (phase 30, demandes de saab du
// 2026-09-30) : qui l'a perdue, et le temps pris par chaque camp. Pur, comme
// le reste du moteur : rien n'est stocke en plus dans le fichier, tout se
// recalcule depuis l'arbre, donc aussi en rejouant une partie rechargee.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : couleurAdverse
// (regles.js) vient d'un fichier charge avant celui-ci.

// La ligne du noeud regarde : le chemin qui y mene, puis la suite par les
// premiers enfants (le chemin principal, celui que « Coup suivant » suit)
// jusqu'au bout. Sur la ligne reellement jouee, c'est elle ; sur une branche,
// c'est la branche.
function noeudsDeLaLigne(arbre) {
  const noeuds = [];
  let noeud = arbre.racine;
  for (const index of arbre.chemin) {
    noeud = noeud.enfants[index];
    noeuds.push(noeud);
  }
  while (noeud.enfants.length > 0) {
    noeud = noeud.enfants[0];
    noeuds.push(noeud);
  }
  return noeuds;
}

// Les camps perdants d'un noeud de fin, d'apres les regles de fin d'Abalone
// et de la pendule : 6 billes ejectees font perdre l'autre camp ; au temps ou
// par abandon, perd celui qui avait le trait ; une nulle fait perdre les deux
// (saab : « en cas de Nulle, les 2 camps se reduisent »). Un statut que KAAH
// ne produit pas (echec de puzzle importe) ne reduit personne.
function perdantsDuNoeud(noeud) {
  if (noeud.etat.vainqueur) return [couleurAdverse(noeud.etat.vainqueur)];
  if (noeud.statutFin === 'D') return ['noir', 'blanc'];
  if (noeud.statutFin === 'T' || noeud.statutFin === 'R') return [noeud.etat.joueurAuTrait];
  return [];
}

// Les camps dont les billes prennent la taille d'un trou (saab) : ceux qui ont
// perdu la ligne regardee, a sa premiere fin — meme en y naviguant avant cette
// fin, jamais sur une branche qui n'est pas finie.
function perdantsDeLaSequence(arbre) {
  const fin = noeudsDeLaLigne(arbre).find((noeud) => noeud.statutFin || noeud.etat.vainqueur);
  return fin ? perdantsDuNoeud(fin) : [];
}

// Le temps pris par chaque camp, en secondes, pour arriver au noeud regarde :
// la somme des durees de ses coups (moteur/pendules.js, dureeDernierCoup, posee
// sur chaque noeud avec son instantane de pendules). Un noeud sans duree (vieux
// fichier) compte pour zero.
function tempsCumules(arbre) {
  const cumul = { noir: 0, blanc: 0 };
  let parent = arbre.racine;
  for (const index of arbre.chemin) {
    const noeud = parent.enfants[index];
    cumul[parent.etat.joueurAuTrait] += noeud.pendulesSnapshot?.dureeDernierCoup ?? 0;
    parent = noeud;
  }
  return cumul;
}
