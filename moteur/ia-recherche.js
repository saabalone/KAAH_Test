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
// Memoire (saab, 2026-10-01 : aller plus loin dans le meme temps) : table de
// transpositions, coups tueurs, historique — moteur/ia-memoire.js. Elle
// change le nombre de positions examinees, jamais la valeur trouvee.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : creerMemoireIA,
// cleDePositionIA, lireDansLaTable, ecrireDansLaTable, valeurSuffisante,
// noterCoupure, ordonnerAvecMemoire (ia-memoire.js), tousLesCoupsLegaux
// (regles.js), ecrirePosition (notation.js),
// compterOccurrences, SEUIL_NULLE_PAR_DEFAUT (nulle.js), appliquerCoup,
// couleursDuPlateau (partie.js), evaluerPosition, VALEUR_VICTOIRE_IA
// (ia-evaluation.js), evaluationDeLaVersion (ia-evaluation-v5.js) viennent de fichiers charges avant celui-ci.

// Profondeur (en coups, les siens et ceux de l'adversaire) par niveau : le
// niveau n regarde exactement n coups d'avance, KAI comme KAI++ (saab,
// 2026-10-01 : « IA3 s'arrete a 3 ... rajouter des btn de niveau si on veut 4,
// 5, n, et c'est le temps qui pourra arreter la recherche si niveau pas
// atteint ») — voir rechercheEcourtee pour le signaler.
const NIVEAU_MAX_IA = 8;
const NIVEAUX_IA = Object.fromEntries(Array.from({ length: NIVEAU_MAX_IA }, (_, rang) => [rang + 1, { profondeur: rang + 1 }]));

// La reflexion d'une machine (moteur/ia.js) s'est-elle arretee AVANT la
// profondeur de son niveau, faute de temps ? Jamais pour un coup du livre, ni
// quand elle a vu la fin de la partie (une victoire ou une defaite forcee :
// chercher plus loin n'y changerait rien).
function rechercheEcourtee({ source, profondeur, evaluation }, niveau) {
  if (source === 'livre') return false;
  if (Number.isFinite(evaluation) && Math.abs(evaluation) > VALEUR_VICTOIRE_IA / 2) return false;
  return profondeur < NIVEAUX_IA[niveau].profondeur;
}

// Assez petit pour qu'une tranche dure quelques millisecondes meme sur un
// telephone lent, assez grand pour que rendre la main ne coute rien.
const NOEUDS_PAR_TRANCHE = 200;

const ARRET_A_L_ECHEANCE = Symbol('echeance');
const VALEUR_NULLE_IA = 0;

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

// L'elagage (saab, 2026-10-02 : « v2b » (devenue v2el), « comme v2 mais en elaguant ... Elag = 10,
// on ne cherche que sur les 10 meilleurs ») : les `nombre` meilleurs `coups`
// selon la valeur de la position juste apres, pour le camp qui joue ; a valeur
// egale, la plus petite position en texte — un ordre qui ne doit rien au
// hasard, pour que KAI++ (solveur/kai-plus.cpp) garde exactement les memes.
// 0, ou autant que de coups : tous. L'ordre des gardes n'importe pas (la
// memoire les reordonne).
function meilleursCoupsIA(etat, coups, nombre, evaluer, poids) {
  if (nombre <= 0 || nombre >= coups.length) return coups;
  const notes = coups.map((coup) => {
    const apres = appliquerCoup(etat, coup).etat;
    return { coup, valeur: evaluer(apres, etat.joueurAuTrait, poids), position: ecrirePosition(apres) };
  });
  notes.sort((a, b) => b.valeur - a.valeur || (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));
  return notes.slice(0, nombre).map(({ coup }) => coup);
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
  // Nulle par repetition PLUS LOIN que son propre coup (saab, 2026-10-02 : « le
  // camp en meilleure position doit pouvoir eviter la nulle ») : une position
  // deja vue dans la partie ou sur la ligne cherchee. Son propre coup (distance
  // 1) est vu par rechercherCoup.
  const position = ecrirePosition(etat);
  if (distance > 1 && !etat.vainqueur && repetitionsVues(contexte, position) + 1 >= SEUIL_NULLE_PAR_DEFAUT) return VALEUR_NULLE_IA;
  if (etat.vainqueur || profondeur === 0) {
    const valeur = contexte.evaluer(etat, contexte.camp, contexte.poids);
    const ajustee = etat.vainqueur ? valeur - Math.sign(valeur) * distance : valeur;
    return signe * ajustee;
  }
  // Deja cherchee a cette profondeur (moteur/ia-memoire.js) ?
  const { memoire } = contexte;
  const cle = cleDePositionIA(etat, position);
  const connue = lireDansLaTable(memoire, cle, distance);
  if (connue?.profondeur === profondeur && valeurSuffisante(connue, alpha, beta)) {
    contexte.variantes[distance] = connue.suite;
    return connue.valeur;
  }
  const legaux = tousLesCoupsLegaux(couleursDuPlateau(etat.plateau), etat.joueurAuTrait);
  if (legaux.length === 0) return signe * contexte.evaluer(etat, contexte.camp, contexte.poids);
  const alphaDeDepart = alpha;
  let meilleure = -Infinity;
  let meilleurCoup = null;
  // Elaguer a un coup de la fin ne gagnerait rien : chaque coup y est juste
  // evalue, et le meilleur juste apres est garde.
  const cherches = profondeur > 1 ? meilleursCoupsIA(etat, legaux, contexte.elagage, contexte.evaluer, contexte.poids) : legaux;
  contexte.ligne.push(position);
  for (const coup of ordonnerAvecMemoire(cherches, memoire, distance, legaux[connue?.indexCoup])) {
    const valeur = -(yield* negamax(appliquerCoup(etat, coup).etat, profondeur - 1, -beta, -alpha, contexte, distance + 1));
    if (valeur > meilleure) {
      meilleure = valeur;
      meilleurCoup = coup;
      contexte.variantes[distance] = [coup, ...contexte.variantes[distance + 1]];
    }
    if (valeur > alpha) alpha = valeur;
    if (alpha >= beta) {
      noterCoupure(memoire, coup, distance, profondeur);
      break;
    }
  }
  contexte.ligne.pop();
  // Toute la fenetre en dessous : seulement une borne haute (aucun coup n'a
  // atteint alpha) ; au-dessus : une borne basse (la coupure).
  const borne = meilleure <= alphaDeDepart ? 'haute' : meilleure >= beta ? 'basse' : 'exacte';
  ecrireDansLaTable(memoire, cle, distance, { profondeur, valeur: meilleure, borne, indexCoup: legaux.indexOf(meilleurCoup), suite: contexte.variantes[distance] });
  return meilleure;
}

// Combien de fois `position` a deja ete vue : dans la partie, et sur la ligne
// cherchee jusqu'ici.
function repetitionsVues(contexte, position) {
  return (contexte.vues.get(position) ?? 0) + contexte.ligne.filter((vue) => vue === position).length;
}

// Le meilleur coup pour le camp au trait de `etat`. `options` : { niveau,
// poids, version (1 ou 2 : moteur/ia-evaluation.js ou ia-evaluation-v2.js),
// elagage (meilleursCoupsIA ; 0 : aucun), hasard, maintenant, echeance, suivi
// (facultatif, voir l'en-tete), historique }.
// Renvoie { coup, profondeur, evaluation, sequence (des coups), noeuds } — la
// profondeur ENTIEREMENT examinee, et son evaluation pour la machine. La
// profondeur 1 va toujours au bout, meme echeance depassee ou arret demande :
// il faut bien un coup a jouer.
function* rechercherCoup(etat, { niveau, poids, version = 1, elagage = 0, hasard, maintenant, echeance, suivi = {}, historique = [] }) {
  const evaluer = evaluationDeLaVersion(version);
  const memoire = creerMemoireIA();
  // Les positions de la partie (combien de fois chacune) et celles de la ligne
  // cherchee, pour la nulle par repetition (negamax).
  const vues = new Map();
  for (const vue of historique) vues.set(vue, (vues.get(vue) ?? 0) + 1);
  const contexte = { camp: etat.joueurAuTrait, poids, evaluer, elagage, noeuds: 0, maintenant, echeance, arretPossible: false, suivi, variantes: [], memoire, vues, ligne: [] };
  // L'elagage vaut aussi pour les premiers coups, a toute profondeur.
  const legaux = tousLesCoupsLegaux(couleursDuPlateau(etat.plateau), etat.joueurAuTrait);
  const gardes = new Set(meilleursCoupsIA(etat, legaux, elagage, evaluer, poids));
  const racine = ordonnerAvecMemoire(melanger(legaux, hasard), memoire, 0, null).filter((coup) => gardes.has(coup));
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
