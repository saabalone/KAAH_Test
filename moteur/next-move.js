// La base de coups Next Move : pour une position donnee, quels coups les
// parties precedentes ont-elles joues, et avec quel resultat. Repris de
// obtenir_conseil (kaa_engine_ClO_Co.py), qui interroge
// KAA_NEXT_MOVE_REF_Best_Stat.csv (29 942 positions, verifie en phase 14).
//
// Le CSV range chaque coup sous la position CANONIQUE (voir
// moteur/permutations.js) : une seule ligne sert pour les 12 orientations
// possibles d'une meme position sur le plateau. Trouver un conseil, c'est
// donc : ramener la position reelle a sa forme canonique, chercher dans la
// base, puis ramener le coup trouve vers le plateau reel avec la
// permutation inverse — dans cet ordre exact, sinon le coup pointerait sur
// de mauvaises cases.
//
// Deux filtres, repris tels quels de obtenir_conseil (lignes 755 a 773) :
// la base a ete construite par auto-jeu sur des positions parfois legerement
// differentes de la position actuelle (une case vide qui contenait une
// bille avant une ejection, par exemple), et un coup qui ne colle plus a
// LA position reelle doit etre tu plutot qu'affiche a tort.
//   1. la case de depart du coup doit contenir une bille (n'importe quel
//      camp) sur le plateau reel — sinon le coup part de nulle part.
//   2. un coup dont les deux coordonnees sont sur la meme colonne et
//      distantes de plus d'une case (un groupe de 2 ou 3 billes deplace
//      lateralement, note par sa premiere et sa derniere bille) doit avoir
//      les DEUX extremites occupees par le MEME camp sur le plateau reel —
//      sinon le groupe suggere n'existe pas vraiment ici.
//
// TROISIEME filtre, celui-la PROPRE A KAAH (KAAWA ne l'a pas) : le coup
// doit partir d'une bille du camp AU TRAIT.
// Bug signale par saab : apres 1.a1d4 a4c4, le panneau proposait "a5d5",
// qui part d'une bille BLANCHE alors que c'est a Noir de jouer — et il a
// verifie que KAAWA fait exactement la meme chose. Ce n'est PAS une erreur
// de permutation : la cle canonique ne dit pas a qui est le trait, et la
// base contient, selon les parties d'origine, des coups de l'un OU de
// l'autre camp (mesure sur les 29 942 cles : 14 881 ne stockent que des
// coups du premier camp, 14 982 que du second, 79 melangent les deux ;
// aucune ne part d'une case vide). Selon que la canonisation a inverse les
// camps pour la partie d'origine, le coup stocke appartient donc a l'un ou
// a l'autre. Afficher celui de l'adversaire n'est pas seulement inutile,
// c'est INJOUABLE (lireCoupNacre ne trouve aucun coup legal, cliquer ne
// fait rien). Impact mesure en rejouant une vraie partie de KAAWA (44
// positions) : 70 conseils avant filtre, 66 apres, et AUCUNE position ne
// se retrouve sans conseil a cause de lui.
//
// Verifie contre le vrai obtenir_conseil de KAAWA (execute tel quel, jamais
// reecrit) sur 603 positions dont la Marguerite Belge, 300 cles du CSV et
// leurs versions tournees : voir tests/next-move.test.js, qui applique le
// meme filtre de camp aux deux cotes de la comparaison pour que le reste
// (position canonique, retraduction du coup) reste verifie a l'identique.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lirePosition vient de
// notation.js, positionCanonique et permuterCoupNacreInverse de
// permutations.js — tous charges avant celui-ci dans index.html.

const SEPARATEUR_LIGNE_CSV = ',';

// Une ligne de donnees du CSV (pas l'entete) : "posRef,coup,victoires,defaites,nulles".
function lireLigneCsv(ligne) {
  const [position, coup, victoires, defaites, nulles] = ligne.split(SEPARATEUR_LIGNE_CSV);
  return {
    position,
    coup,
    victoires: Number(victoires),
    defaites: Number(defaites),
    nulles: Number(nulles),
  };
}

// Transforme le texte entier du CSV (entete compris, comme charge depuis
// donnees/kaa-next-move.js) en une table position canonique -> ses coups
// connus. Plusieurs lignes partagent souvent la meme position (jusqu'a 9
// coups differents, voir CLAUDE.md).
function analyserBaseNextMove(texteCsv) {
  const lignes = texteCsv.split('\n');
  const base = new Map();

  // La premiere ligne est l'entete ("full_posRef,next_move_Ref,..."),
  // jamais une donnee : on l'ignore comme le fait csv.DictReader en Python.
  for (let i = 1; i < lignes.length; i++) {
    const ligne = lignes[i].trim();
    if (!ligne) continue;

    const { position, coup, victoires, defaites, nulles } = lireLigneCsv(ligne);
    if (!base.has(position)) base.set(position, []);
    base.get(position).push({ coup, victoires, defaites, nulles });
  }

  return base;
}

// Les deux filtres de KAAWA, voir l'en-tete du fichier. `plateau` est celui
// de la VRAIE position jouee (jamais la position canonique).
function coupCoherentAvecLePlateau(coup, plateau, joueurAuTrait) {
  const depart = coup.slice(0, 2);
  const arrivee = coup.slice(2);

  // Filtre 1 : une bille, n'importe laquelle, doit occuper la case de depart.
  const camp = plateau[depart]?.couleur;
  if (!camp) return false;

  // Filtre 3, PROPRE A KAAH (voir l'en-tete du fichier) : cette bille doit
  // appartenir au camp AU TRAIT. Un coup de l'adversaire n'est pas juste
  // inutile, il est INJOUABLE — lireCoupNacre ne lui trouverait aucun coup
  // legal, cliquer dessus ne ferait rien du tout.
  if (camp !== joueurAuTrait) return false;

  // Filtre 2 : broadside sur la meme colonne, a plus d'une case d'ecart.
  if (depart[0] === arrivee[0]) {
    const ecart = Math.abs(Number(depart.slice(1)) - Number(arrivee.slice(1)));
    if (ecart > 1 && plateau[arrivee]?.couleur !== camp) return false;
  }

  return true;
}

// Les coups suggeres pour `texteBrutPosition` (la position REELLEMENT
// jouee, pas forcement canonique), tries par victoires decroissantes.
// `joueurAuTrait` ('noir' ou 'blanc') est OBLIGATOIRE : la position
// compressee ne dit pas a qui est le trait (lirePosition suppose toujours
// Noir, par convention KAAWA), et c'est pourtant indispensable pour ne
// proposer que des coups reellement jouables — voir coupCoherentAvecLePlateau.
// Renvoie toujours un tableau, jamais une erreur : une position absente de
// la base, ou un texte illisible, donnent simplement [] — comme
// obtenir_conseil, qui attrape lui-meme toute exception.
function obtenirConseils(base, texteBrutPosition, joueurAuTrait) {
  try {
    const etat = lirePosition(texteBrutPosition);
    const { positionReference, indexPermutation } = positionCanonique(texteBrutPosition);
    const entrees = base.get(positionReference) ?? [];

    const conseils = [];
    for (const entree of entrees) {
      const coup = permuterCoupNacreInverse(entree.coup, indexPermutation);
      if (!coupCoherentAvecLePlateau(coup, etat.plateau, joueurAuTrait)) continue;
      conseils.push({ coup, victoires: entree.victoires, defaites: entree.defaites, nulles: entree.nulles });
    }

    conseils.sort((a, b) => b.victoires - a.victoires);
    return conseils;
  } catch {
    return [];
  }
}
