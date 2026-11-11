// La Sequence RESUMEE et la navigation par EJECTIONS (saab, 2026-11-10) : « replier seulement tout ce qui n'a pas de
// commentaire du nom de l'IA et garder aussi les Br. Comme ça on aurait une vision globale de la partie sur seulement qq
// lignes » ; « ajouter des couleurs sur le nom du KAI, en fin de partie vert s'il gagne, rouge perd, bleu Nulle, en début de
// partie idem si le KAI a la même fin sur toutes ses Br, sinon en violet » ; « ajouter dans la barre de navigation les 2 btn
// pour aller à l'éject précédente/suivante » ; « Déplier tout/Replier tout qui masquerait les Br de Br ». Des regles de
// lecture de l'arbre (moteur/arbre.js), sans affichage : rendu/arbre-html.js et interface/saisie.js s'en servent.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// Le nom d'une machine, tel que le commentaire d'un coup de partie Test le porte (moteur/arbre.js, commentaireDuProfil ;
// moteur/ia.js, nomDeLaMachine) : « KAI » ou « KAI++ », son niveau, puis ses reglages.
const NOM_DE_MACHINE = /^KAI\+{0,2}\d+_\S+$/;

const billesSorties = (etat) => etat.billesEjecteesNoires + etat.billesEjecteesBlanches;

// Le chemin du coup ou une bille est sortie, apres (`sens` 1) ou avant (`sens` -1) le coup regarde : en arriere, parmi ses
// ancetres (lui exclu) ; en avant, dans la suite de sa ligne (le premier enfant a chaque coup). null s'il n'y en a pas.
function cheminDeLEjection(arbre, sens) {
  const noeuds = [arbre.racine];
  for (const indice of arbre.chemin) noeuds.push(noeuds.at(-1).enfants[indice]);
  if (sens < 0) {
    for (let profondeur = arbre.chemin.length - 1; profondeur >= 1; profondeur--) {
      if (billesSorties(noeuds[profondeur].etat) > billesSorties(noeuds[profondeur - 1].etat)) return arbre.chemin.slice(0, profondeur);
    }
    return null;
  }
  let chemin = [...arbre.chemin];
  let noeud = noeuds.at(-1);
  while (noeud.enfants.length > 0) {
    const suivant = noeud.enfants[0];
    chemin = [...chemin, 0];
    if (billesSorties(suivant.etat) > billesSorties(noeud.etat)) return chemin;
    noeud = suivant;
  }
  return null;
}

// Les noms de machines d'un commentaire : ses lignes qui en sont un.
function nomsDesMachines(commentaire) {
  return String(commentaire ?? '')
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter((ligne) => NOM_DE_MACHINE.test(ligne));
}

// L'issue d'une fin de ligne pour `camp` : 'gagne', 'perd', 'nulle', ou null (pas finie, ou finie sans vainqueur connu : un
// temps ecoule, un abandon).
function issueDeLaFin(feuille, camp) {
  if (feuille.etat.vainqueur) return feuille.etat.vainqueur === camp ? 'gagne' : 'perd';
  return feuille.statutFin === 'D' ? 'nulle' : null;
}

// Le resultat de la machine de `camp` dans la suite de `noeud` (lui compris) : 'gagne', 'perd' ou 'nulle' si toutes ses
// fins de ligne finies disent la meme chose, 'mixte' sinon, null si aucune n'est finie.
function resultatDeLaMachine(noeud, camp) {
  const issues = new Set();
  const parcourir = (ici) => {
    if (ici.enfants.length === 0) {
      const issue = issueDeLaFin(ici, camp);
      if (issue) issues.add(issue);
      return;
    }
    for (const enfant of ici.enfants) parcourir(enfant);
  };
  parcourir(noeud);
  if (issues.size === 0) return null;
  return issues.size === 1 ? [...issues][0] : 'mixte';
}

// Le score final qu'ecrit une partie Test sur son dernier coup (interface/saisie.js) : « Fin -3-6tr37 ».
const SCORE_FINAL = /^Fin -\d+-\d+tr\d+$/;

// Un commentaire coupe en deux (saab, 2026-11-11 : les noms colores et le score s'affichent deja sous la ligne dans
// Commentaires, « tu peux supprimer le commentaire car ça fait doublon ») : `libre`, le texte tape, et `generees`, les
// lignes ecrites par KAAH (noms des machines, score final), gardees dans le fichier — le resume et les couleurs les
// lisent — mais plus montrees dans la zone de texte.
function separerCommentaire(commentaire) {
  const libres = [];
  const generees = [];
  for (const ligne of String(commentaire ?? '').split('\n')) {
    const propre = ligne.trim();
    if (NOM_DE_MACHINE.test(propre) || SCORE_FINAL.test(propre)) generees.push(propre);
    else libres.push(ligne);
  }
  return { libre: libres.join('\n').trim(), generees };
}

// L'inverse : le texte libre, puis les lignes de KAAH.
function recomposerCommentaire(libre, generees) {
  return [String(libre ?? '').trim(), ...generees].filter(Boolean).join('\n');
}

// Le camp que jouait la machine `nom`, nommee sur le coup au bout de `chemin` : celui du dernier coup qu'elle a joue sur la
// ligne, ce coup compris (le coup final d'une partie porte aussi le nom de la machine d'en face : moteur/arbre.js,
// commentaireDuProfil) ; sinon celui du coup lui-meme. Noir joue a la profondeur 1, 3, 5...
const campDeLaProfondeur = (profondeur) => (profondeur % 2 === 1 ? 'noir' : 'blanc');
function campDeLaMachine(arbre, chemin, nom) {
  const noeuds = [arbre.racine];
  for (const indice of chemin) noeuds.push(noeuds.at(-1).enfants[indice]);
  for (let profondeur = chemin.length; profondeur >= 1; profondeur--) {
    if (noeuds[profondeur].reflexionIA?.machine === nom) return campDeLaProfondeur(profondeur);
  }
  return campDeLaProfondeur(chemin.length);
}

// Le resume garde un coup s'il porte un nom de machine, s'il commence une branche (`nombreDeFreres` : les enfants de son
// parent, lui compris), s'il finit une ligne, ou si c'est le coup regarde (`cheminCourant`).
function gardeDansLeResume(noeud, nombreDeFreres, chemin, cheminCourant) {
  if (nomsDesMachines(noeud.commentaire).length > 0) return true;
  if (nombreDeFreres > 1 || noeud.enfants.length === 0) return true;
  return chemin.length === cheminCourant.length && chemin.every((indice, rang) => indice === cheminCourant[rang]);
}

// Une BRANCHE DE BRANCHE : un coup qui n'est pas le premier enfant de son parent (il ouvre une branche), alors qu'un coup
// plus haut sur son chemin en ouvrait deja une.
function estUneBrancheDeBranche(chemin) {
  if (chemin.length === 0 || chemin.at(-1) === 0) return false;
  return chemin.slice(0, -1).some((indice) => indice !== 0);
}
