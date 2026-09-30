// Recherche du meilleur coup (phase 29 ⚠, PLAN.md) : minimax a elagage
// alpha-beta, ecrit en "negamax" (la valeur d'une position pour l'un est
// l'oppose de sa valeur pour l'autre, moteur/ia-evaluation.js), par
// approfondissement progressif (1 coup d'avance, puis 2, puis...) jusqu'a la
// profondeur du niveau ou jusqu'a l'echeance.
//
// Fonction GENERATRICE : elle rend la main (`yield`) tous les
// NOEUDS_PAR_TRANCHE positions examinees. L'interface (interface/ia.js) la
// deroule par tranches de quelques millisecondes, entre lesquelles le
// navigateur fait avancer les pendules et repond aux clics — sans worker :
// un worker en file:// doit etre construit a partir de son propre texte, ce
// qui obligerait a y recopier les regles (interdit, CLAUDE.md). Pure et sans
// horloge a elle : `maintenant()` et `echeance` lui sont donnes, ce qui la
// rend testable avec une horloge simulee.
//
// Phase 32 (saab : « un tableau de reflexion ... et forcer l'IA a jouer avant
// son temps ») : `suivi`, un objet que la recherche tient a jour — profondeur
// finie, meilleur coup, evaluation, sequence prevue (la variante principale),
// positions examinees — et ou l'on peut poser `arreter` : elle s'arrete alors
// comme a l'echeance. La sequence se retient par distance a la racine
// (`variantes`) : a chaque noeud, le meilleur coup suivi de la meilleure suite
// de son enfant ; aucune incidence sur le coup choisi.
//
// Repetition (saab, 2026-09-30) : `historique`, les positions deja vues de la
// partie ; un coup qui fait revenir une position pour la SEUIL_NULLE_PAR_DEFAUT-ieme
// fois (moteur/nulle.js) mene a la nulle et vaut 0 — la machine le choisit
// quand tout le reste est pire pour elle, l'evite sinon.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : caseDansLaDirection
// (plateau.js), tousLesCoupsLegaux (regles.js), ecrirePosition (notation.js),
// compterOccurrences, SEUIL_NULLE_PAR_DEFAUT (nulle.js), appliquerCoup,
// couleursDuPlateau (partie.js), evaluerPosition, VALEUR_VICTOIRE_IA
// (ia-evaluation.js), evaluationDeLaVersion (ia-evaluation-v2.js) viennent de fichiers charges avant celui-ci.

// Profondeur (en coups, les siens et ceux de l'adversaire) par niveau. Le
// niveau 3 est borne par le temps de reflexion bien avant d'atteindre la
// sienne sur une position chargee.
// KAI++ (phase 33bis, 40 a 80 fois plus rapide) va au niveau 3 aussi loin que
// son temps de reflexion le permet, jusqu'a `profondeurKaiPlus` ; aux niveaux 1
// et 2, la meme profondeur que KAI, pour les comparer a egalite.
const NIVEAUX_IA = {
  1: { profondeur: 1 },
  2: { profondeur: 2 },
  3: { profondeur: 4, profondeurKaiPlus: 8 },
};

// Assez petit pour qu'une tranche dure quelques millisecondes meme sur un
// telephone lent, assez grand pour que rendre la main ne coute rien.
const NOEUDS_PAR_TRANCHE = 200;

const ARRET_A_L_ECHEANCE = Symbol('echeance');
const VALEUR_NULLE_IA = 0;

function ejecte(coup) {
  const derniere = coup.billesPoussees[coup.billesPoussees.length - 1];
  return derniere !== undefined && caseDansLaDirection(derniere, coup.direction) === null;
}

// Les coups les plus forcants d'abord (ejections, puis poussees) : l'elagage
// alpha-beta coupe d'autant plus qu'il rencontre tot les meilleurs coups. Tri
// stable : l'ordre recu (melange a la racine) departage le reste.
function ordonnerCoups(coups) {
  const priorite = (coup) => (ejecte(coup) ? 2 : coup.billesPoussees.length > 0 ? 1 : 0);
  return [...coups].sort((a, b) => priorite(b) - priorite(a));
}

// Melange de Fisher-Yates avec le hasard fourni : entre deux coups de meme
// valeur, l'IA ne joue pas toujours le meme (sinon deux parties se
// ressembleraient trait pour trait).
function melanger(coups, hasard) {
  const melange = [...coups];
  for (let i = melange.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    [melange[i], melange[j]] = [melange[j], melange[i]];
  }
  return melange;
}

// Valeur de `etat` pour le camp AU TRAIT, en regardant `profondeur` coups plus
// loin. `distance` (coups depuis la racine) fait preferer la victoire la plus
// proche et la defaite la plus lointaine.
function* negamax(etat, profondeur, alpha, beta, contexte, distance) {
  contexte.noeuds++;
  if (contexte.noeuds % NOEUDS_PAR_TRANCHE === 0) {
    contexte.suivi.noeuds = contexte.noeuds;
    yield;
    const arret = contexte.maintenant() >= contexte.echeance || contexte.suivi.arreter;
    if (contexte.arretPossible && arret) throw ARRET_A_L_ECHEANCE;
  }
  const signe = etat.joueurAuTrait === contexte.camp ? 1 : -1;
  contexte.variantes[distance] = [];
  if (etat.vainqueur || profondeur === 0) {
    const valeur = contexte.evaluer(etat, contexte.camp, contexte.poids);
    const ajustee = etat.vainqueur ? valeur - Math.sign(valeur) * distance : valeur;
    return signe * ajustee;
  }
  const coups = ordonnerCoups(tousLesCoupsLegaux(couleursDuPlateau(etat.plateau), etat.joueurAuTrait));
  if (coups.length === 0) return signe * contexte.evaluer(etat, contexte.camp, contexte.poids);
  let meilleure = -Infinity;
  for (const coup of coups) {
    const valeur = -(yield* negamax(appliquerCoup(etat, coup).etat, profondeur - 1, -beta, -alpha, contexte, distance + 1));
    if (valeur > meilleure) {
      meilleure = valeur;
      contexte.variantes[distance] = [coup, ...contexte.variantes[distance + 1]];
    }
    if (valeur > alpha) alpha = valeur;
    if (alpha >= beta) break;
  }
  return meilleure;
}

// Le meilleur coup pour le camp au trait de `etat`. `options` : { niveau,
// poids, version (1 ou 2 : moteur/ia-evaluation.js ou ia-evaluation-v2.js),
// hasard, maintenant, echeance, suivi (facultatif, voir l'en-tete),
// historique }.
// Renvoie { coup, profondeur, evaluation, sequence (des coups), noeuds } — la
// profondeur ENTIEREMENT examinee, et son evaluation pour la machine. La
// profondeur 1 va toujours au bout, meme echeance depassee ou arret demande :
// il faut bien un coup a jouer.
function* rechercherCoup(etat, { niveau, poids, version = 1, hasard, maintenant, echeance, suivi = {}, historique = [] }) {
  const evaluer = evaluationDeLaVersion(version);
  const contexte = { camp: etat.joueurAuTrait, poids, evaluer, noeuds: 0, maintenant, echeance, arretPossible: false, suivi, variantes: [] };
  const racine = ordonnerCoups(melanger(tousLesCoupsLegaux(couleursDuPlateau(etat.plateau), etat.joueurAuTrait), hasard));
  let meilleurCoup = racine[0];
  let profondeurAtteinte = 0;
  for (let profondeur = 1; profondeur <= NIVEAUX_IA[niveau].profondeur; profondeur++) {
    contexte.arretPossible = profondeur > 1;
    try {
      // Le meilleur coup de la profondeur precedente en tete : il coupe le plus.
      const ordre = [meilleurCoup, ...racine.filter((coup) => coup !== meilleurCoup)];
      let alpha = -Infinity;
      let meilleurIci = null;
      let sequenceIci = [];
      for (const coup of ordre) {
        const apres = appliquerCoup(etat, coup).etat;
        const repetitions = compterOccurrences(historique, ecrirePosition(apres)) + 1;
        contexte.variantes[1] = [];
        const valeur =
          repetitions >= SEUIL_NULLE_PAR_DEFAUT && !apres.vainqueur
            ? VALEUR_NULLE_IA
            : -(yield* negamax(apres, profondeur - 1, -Infinity, -alpha, contexte, 1));
        if (meilleurIci === null || valeur > alpha) {
          alpha = valeur;
          meilleurIci = coup;
          sequenceIci = [coup, ...contexte.variantes[1]];
        }
      }
      meilleurCoup = meilleurIci;
      profondeurAtteinte = profondeur;
      Object.assign(suivi, { profondeur, coup: meilleurCoup, evaluation: alpha, sequence: sequenceIci });
      if (alpha >= VALEUR_VICTOIRE_IA - profondeur) break; // victoire forcee trouvee : inutile de chercher plus loin
    } catch (arret) {
      if (arret !== ARRET_A_L_ECHEANCE) throw arret;
      break;
    }
  }
  suivi.noeuds = contexte.noeuds;
  return { coup: meilleurCoup, profondeur: profondeurAtteinte, evaluation: suivi.evaluation, sequence: suivi.sequence, noeuds: contexte.noeuds };
}
