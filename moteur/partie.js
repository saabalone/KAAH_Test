// Etat de la partie et application d'un coup.
// Reproduit le comportement de KAAWA (execute_move, kaa_engine_ClO_Co.py) :
// deplacer le groupe, deplacer ou ejecter les billes adverses poussees,
// alterner le joueur au trait, verifier la victoire.
//
// Le moteur est immuable : appliquerCoup ne modifie jamais `etat`, il en
// renvoie un nouveau — voir CLAUDE.md.
// `coup` doit venir de regles.coupsDepuis : ce fichier fait confiance a sa
// legalite, il se contente de l'executer. Il ne revalide rien.
//
// Pas d'import ni d'export (voir plateau.js) : caseDansLaDirection vient de
// plateau.js, charge avant celui-ci dans index.html.

// Regle d'Abalone : le premier camp qui fait sortir 6 billes adverses du
// plateau gagne la partie.
const EJECTIONS_POUR_GAGNER = 6;

function couleurAdverse(couleur) {
  return couleur === 'noir' ? 'blanc' : 'noir';
}

// regles.js ne s'interesse qu'aux couleurs : les identifiants de billes ne
// changent rien a la legalite d'un coup. Cette projection donne le plateau
// au format qu'il attend ({ case: 'noir' | 'blanc' }).
function couleursDuPlateau(plateau) {
  const couleurs = {};
  for (const [notation, bille] of Object.entries(plateau)) {
    couleurs[notation] = bille.couleur;
  }
  return couleurs;
}

// Ce que l'interface a besoin de savoir sur une bille qui bouge, sans
// jamais avoir a comparer deux plateaux pour le deviner — voir CLAUDE.md,
// "l'interface ne devine jamais ce qui a bouge". La direction est incluse
// meme pour un simple deplacement : une bille ejectee (arrivee null) en a
// besoin pour que l'animation sache de quel cote la faire sortir.
function deplacement(bille, depart, arrivee, direction) {
  return { id: bille.id, couleur: bille.couleur, depart, arrivee, direction, ejectee: arrivee === null };
}

function appliquerCoup(etat, coup) {
  const plateau = { ...etat.plateau };
  const deplacements = [];

  // On vide d'abord toutes les cases de depart (le groupe et les
  // eventuelles billes adverses poussees), avant de les repeupler : une
  // bille poussee ne doit jamais se retrouver ecrasee par le groupe qui la
  // pousse dans sa propre case de depart.
  for (const notation of [...coup.billes, ...coup.billesPoussees]) {
    delete plateau[notation];
  }

  for (const depart of coup.billes) {
    const bille = etat.plateau[depart];
    const arrivee = caseDansLaDirection(depart, coup.direction);
    plateau[arrivee] = bille;
    deplacements.push(deplacement(bille, depart, arrivee, coup.direction));
  }

  let billesEjecteesNoires = etat.billesEjecteesNoires;
  let billesEjecteesBlanches = etat.billesEjecteesBlanches;

  for (const depart of coup.billesPoussees) {
    const bille = etat.plateau[depart];
    const arrivee = caseDansLaDirection(depart, coup.direction);
    if (arrivee === null) {
      if (bille.couleur === 'noir') billesEjecteesNoires += 1;
      else billesEjecteesBlanches += 1;
    } else {
      plateau[arrivee] = bille;
    }
    deplacements.push(deplacement(bille, depart, arrivee, coup.direction));
  }

  // Regle d'Abalone : le camp qui a fait sortir 6 billes adverses gagne
  // immediatement, meme si son propre compteur d'ejectees subies est aussi
  // eleve (une seule victoire par coup, on regarde d'abord les blanches
  // ejectees : c'est arbitraire mais sans consequence, les deux compteurs
  // ne peuvent pas atteindre 6 au meme coup).
  let vainqueur = null;
  if (billesEjecteesNoires >= EJECTIONS_POUR_GAGNER) vainqueur = 'blanc';
  else if (billesEjecteesBlanches >= EJECTIONS_POUR_GAGNER) vainqueur = 'noir';

  return {
    etat: {
      plateau,
      joueurAuTrait: couleurAdverse(etat.joueurAuTrait),
      billesEjecteesNoires,
      billesEjecteesBlanches,
      vainqueur,
    },
    deplacements,
  };
}
