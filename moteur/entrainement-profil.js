// Le PROFIL d'Entrainement (phase 36 ; saab, 2026-10-08 : « mets toutes les règles
// et paramètres en coche, comme les profils IA avec histo, comme ça je changerai
// vraiment tout ce que je veux sans oublie ») : chaque regle est une ligne, cochee
// ou decochee, avec sa valeur ; le profil a des versions (moteur/historique-reglages.js,
// le moteur commun avec les profils IA). Un profil = { nom, regles: { cle: valeur } } ;
// une regle ABSENTE est decochee (comme un ajout d'un profil IA). Certaines lignes
// n'ont pas de case (le niveau et les temps d'une ceinture : toujours la). Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CEINTURES
// (moteur/entrainement.js), REGLAGES_ENTRAINEMENT_PAR_DEFAUT
// (moteur/entrainement-reglages.js) viennent de fichiers charges avant celui-ci.

// Chaque regle : [cle, libelle, sorte, valeur de depart, cochable, proposee] — sorte :
// 'case' (oui/non), 'nombre', 'minutes' (rangee en secondes), 'mode' (Bonus/Délai),
// 'liste' (des noms de jeux separes par |, un ! devant un jeu impose).
// Une regle 'case' decochee est fausse ; un nombre decoche, ce que dit son libelle.
// Une valeur de depart `undefined` : decochee au depart ; `proposee` : la valeur
// qu'elle prend quand on la coche.
const D_ENTRAINEMENT = REGLAGES_ENTRAINEMENT_PAR_DEFAUT;
const GROUPES_REGLES_ENTRAINEMENT = [
  {
    titre: 'La série',
    regles: [
      ['victoiresParJeu', 'Victoires par jeu (décochée : 1)', 'nombre', D_ENTRAINEMENT.serie.victoiresParJeu, true],
      ['jeuxParSerie', 'Jeux différents par série, 2 double, 3 triple (décochée : 1)', 'nombre', D_ENTRAINEMENT.serie.jeuxParSerie, true],
      ['revanche', 'Chaque victoire avec sa revanche', 'case', true, true],
      ['confirmation', 'Confirmation à une ceinture plus basse', 'case', true, true],
      ['revancheDeConfirmation', 'La confirmation avec sa revanche', 'case', true, true],
      // Saab, 2026-10-10 : « 3 séries ratées on réinitialise, n réinitialisations on
      // redescend » (la cle garde son ancien nom : les versions deja validees la relisent).
      ['seriesRatees', 'Essais ratés sur un jeu avant de le recommencer à zéro (décochée : jamais)', 'nombre', D_ENTRAINEMENT.serie.essaisAvantReinitialisation, true],
      ['reinitialisations', 'Jeux recommencés à zéro avant de redescendre d’une ceinture (décochée : jamais)', 'nombre', D_ENTRAINEMENT.serie.reinitialisationsAvantDeRedescendre, true],
      // Saab, 2026-10-10 : une pause trop longue, et le grade acquis est a reconfirmer.
      // Saab, 2026-10-15 : « on ajoutera une partie en fin de tentatives ... si c'est encore
      // Nulle c'est réussi » (moteur/entrainement-serie.js, suiteDUnEssai).
      ['rattrapageSurNulle', 'Essais ratés sur un jeu avec au moins une nulle : une partie de plus, réussie par une nulle (décochée : le jeu repart de zéro)', 'case', D_ENTRAINEMENT.serie.rattrapageSurNulle, true],
      ['joursSansJouer', 'Jours sans jouer à son grade (ou plus haut) avant de devoir le reconfirmer (décochée : jamais)', 'nombre', D_ENTRAINEMENT.serie.joursAvantReconfirmation, true],
      ['nulleDefaite', 'Une nulle compte comme une défaite (décochée : elle ne compte pas)', 'case', true, true],
      ['nonJoueeIgnoree', 'Une partie où le joueur n’a pas joué ne compte pas', 'case', true, true],
    ],
  },
  {
    titre: 'Pendant le jeu',
    regles: [
      ['pauses', 'Pauses par partie ou PZL (décochée : sans limite)', 'nombre', D_ENTRAINEMENT.pausesMax, true],
      ['bloquerConseils', 'Conseils bloqués', 'case', true, true],
      ['bloquerMenaces', 'Menaces bloquées', 'case', true, true],
      ['bloquerSequence', 'Séquence bloquée', 'case', true, true],
      ['bloquerCommentaires', 'Commentaires bloqués', 'case', true, true],
      ['bloquerOccurrences', 'Occurrences bloquées', 'case', true, true],
      ['bloquerReglages', 'Réglages bloqués', 'case', true, true],
      ['cacherEvaluation', 'Évaluation et réflexion de la machine cachées', 'case', true, true],
      ['interdireIA', 'Pas d’IA ni de Suggestion pour soi', 'case', true, true],
    ],
  },
  {
    titre: 'La machine',
    regles: [
      ['supplementIA', 'Temps en plus après une perte au temps, sur sa partie suivante de même couleur (s)', 'nombre', D_ENTRAINEMENT.supplementIAApresTemps, true],
      ['reflexionPzl', 'Réflexion max en PZL (s)', 'nombre', 60, false],
      ['pzlSansElagage', 'PZL : la meilleure défense, sans élagage (décochée : élagage 10)', 'case', true, true],
    ],
  },
  {
    titre: 'Les PZL',
    regles: [
      ['pzlDernierTour', 'Défense réussie si l’on tient jusqu’au dernier tour (décochée : seulement si l’attaque échoue)', 'case', true, true],
      ['pzlPermutation', 'Le plateau tourné autrement à chaque fois (12 orientations), pour ne pas reconnaître le PZL (décochée : toujours comme dans le fichier)', 'case', true, true],
      // Saab, 2026-10-11 : « dans toutes les ceintures ne mettre que ceux à sol unique »,
      // puis « mettre aussi PZL sol unique par défaut » : la regle se coche pour avoir
      // AUSSI les autres — decochee (ou absente d'un ancien profil), solution unique.
      ['pzlPlusieursSolutions', 'Aussi les PZL à plusieurs solutions au premier coup (décochée : seulement ceux à solution unique ; une liste de PZL faite à la main garde ses exceptions)', 'case', undefined, true],
    ],
  },
  // Un groupe par grade (les ceintures, puis les Dans, saab 2026-10-09).
  ...CEINTURES.map((ceinture, i) => {
    const c = D_ENTRAINEMENT.ceintures[i];
    const siDefini = (valeur) => (valeur === null || valeur === 0 ? undefined : valeur);
    return {
      titre: ceinture.dan ? ceinture.nom : `Ceinture ${ceinture.nom.toLowerCase()}`,
      ceinture: i,
      regles: [
        [`c${i}niveau`, 'Niveau de la machine', 'nombre', c.niveau, false],
        [`c${i}iaSansLimite`, 'La machine sans limite de temps', 'case', c.ia.sansLimite || undefined, true],
        [`c${i}ia`, 'Temps de la machine (min), si elle a une limite', 'minutes', c.ia.tempsInitial, false],
        [`c${i}iaElagage`, 'Élagage de la machine (décochée : aucun)', 'nombre', siDefini(c.ia.elagage), true, 10],
        [`c${i}iaReflexion`, 'Réflexion max de la machine par coup (s)', 'nombre', c.ia.reflexion, false],
        [`c${i}victoires`, 'Victoires par jeu, chacune l’aller et la revanche (décochée : celles de la série)', 'nombre', c.victoiresParJeu, true, 1],
        [`c${i}jeux`, 'Jeux différents par série (décochée : ceux de la série)', 'nombre', siDefini(c.jeuxParSerie), true, 2],
        // Les jeux proposes (saab, 2026-10-10) : une liste « nom|!impose|... ».
        [`c${i}variantes`, 'Variantes proposées, ! = imposée (décochée : toutes)', 'liste', c.variantes ?? undefined, true, ''],
        [`c${i}handicap`, 'Handicap : vos billes éjectées au départ (décochée : aucune)', 'nombre', siDefini(c.handicap), true, 1],
        [`c${i}variantesProposees`, 'Variantes proposées en tout : les imposées toujours, le tirage au hasard complète parmi les non imposées (décochée : toutes)', 'nombre', c.variantesProposees, true],
        [`c${i}mode`, 'Votre pendule', 'mode', c.joueur.mode, false],
        [`c${i}temps`, 'Votre temps (min)', 'minutes', c.joueur.tempsInitial, false],
        [`c${i}bonus`, 'Bonus par coup, en mode Bonus (s)', 'nombre', c.joueur.bonusParCoup, true],
        [`c${i}bonusEjection`, 'Bonus par éjection, en mode Bonus (s)', 'nombre', c.joueur.bonusParEjection, true],
        [`c${i}delai`, 'Délai, en mode Délai (s)', 'nombre', c.joueur.delai, true],
        // Les PZL, puis leur pendule, a part de celle des Variantes (saab, 2026-10-10 et 14).
        [`c${i}pzl`, 'PZL proposés, ! = imposé (décochée : tous ceux du grade)', 'liste', c.pzl ?? undefined, true, ''],
        [`c${i}pzlProposes`, 'PZL proposés en tout : les imposés toujours, le tirage au hasard complète parmi les non imposés (décochée : tous)', 'nombre', c.pzlProposes, true],
        [`c${i}pzlMode`, 'PZL : votre pendule', 'mode', c.pzlPendule.mode, false],
        [`c${i}pzlTemps`, 'PZL : votre temps pour tout le puzzle (min ; décochée : sans limite)', 'minutes', siDefini(c.pzlTemps), true, 2 * 60],
        [`c${i}pzlBonus`, 'PZL : bonus par coup, en mode Bonus (s)', 'nombre', siDefini(c.pzlPendule.bonusParCoup), true, c.joueur.bonusParCoup],
        [`c${i}pzlBonusEjection`, 'PZL : bonus par éjection, en mode Bonus (s)', 'nombre', siDefini(c.pzlPendule.bonusParEjection), true, c.joueur.bonusParEjection],
        [`c${i}pzlDelai`, 'PZL : délai, en mode Délai (s)', 'nombre', siDefini(c.pzlPendule.delai), true, c.joueur.delai],
        [`c${i}reinitialiserTout`, 'Un jeu recommencé à zéro y remet toute la série (décochée : ce jeu seul)', 'case', c.reinitialiserTout || undefined, true],
        [`c${i}annuler`, 'Annuler permis', 'case', c.annuler || undefined, true],
      ],
    };
  }),
];
const REGLES_ENTRAINEMENT = GROUPES_REGLES_ENTRAINEMENT.flatMap((groupe) => groupe.regles.map(([cle, libelle, sorte, defaut, cochable, proposee]) => ({ cle, libelle, sorte, defaut, cochable, proposee: proposee ?? defaut })));
const CLES_REGLES_ENTRAINEMENT = REGLES_ENTRAINEMENT.map((regle) => regle.cle);
const REGLE_ENTRAINEMENT = Object.fromEntries(REGLES_ENTRAINEMENT.map((regle) => [regle.cle, regle]));
const REGLES_ENTRAINEMENT_PAR_DEFAUT = Object.freeze(Object.fromEntries(REGLES_ENTRAINEMENT.filter((regle) => regle.defaut !== undefined).map((regle) => [regle.cle, regle.defaut])));
const NOM_PROFIL_ENTRAINEMENT_INTEGRE = 'Entraînement de saab';
const VALEUR_MAX_REGLE = 24 * 60 * 60; // une journee, en secondes : rien n'est plus grand

// Les nombres qui valent au moins 1 (saab, 2026-10-09 : une serie « a 0 victoire »
// serait complete tout de suite ; pour « aucun », on decoche) : les temps, niveaux,
// reflexions, et les comptes de la serie.
const COMPTES_AU_MOINS_UN = ['victoiresParJeu', 'jeuxParSerie', 'seriesRatees', 'reinitialisations', 'joursSansJouer'];
const auMoinsUn = (regle) => regle.sorte === 'minutes' || COMPTES_AU_MOINS_UN.includes(regle.cle) || /(niveau|jeux|victoires|Reflexion|Proposees|Proposes)$/.test(regle.cle) || regle.cle.startsWith('reflexion');

// Une valeur sure pour la regle `cle`, ou undefined (decochee) ; une regle sans
// case reprend sa valeur de depart.
function valeurDeRegle(cle, brute) {
  const regle = REGLE_ENTRAINEMENT[cle];
  if (brute === undefined || brute === null || brute === false) return regle.cochable ? undefined : regle.defaut;
  if (regle.sorte === 'case') return true;
  if (regle.sorte === 'mode') return ['bonus', 'delai'].includes(brute) ? brute : regle.defaut;
  if (regle.sorte === 'liste') return ecrireListeDeJeux(lireListeDeJeux(brute));
  const nombre = Math.round(Number(brute));
  if (!Number.isFinite(nombre)) return regle.proposee;
  return Math.min(VALEUR_MAX_REGLE, Math.max(auMoinsUn(regle) ? 1 : 0, nombre));
}

// Les regles retenues par une version (le moteur commun des versions).
function valeursProfilEntrainement(brut) {
  const regles = {};
  for (const cle of CLES_REGLES_ENTRAINEMENT) {
    const valeur = valeurDeRegle(cle, brut?.regles?.[cle]);
    if (valeur !== undefined) regles[cle] = valeur;
  }
  return { regles };
}

// `typesDUnJeu(sorte, nom)` : les types d'un jeu, que seule l'interface connait — avec
// eux, une liste dit le vrai nombre de jeux qu'elle impose dans la serie (placesImposees) ;
// sans eux, ses seuls jeux imposes.
const texteRegleEntrainement = (cle, valeur, typesDUnJeu = () => []) => {
  if (valeur === undefined) return '—';
  if (valeur === true) return '✓';
  if (REGLE_ENTRAINEMENT[cle].sorte === 'liste') {
    const liste = lireListeDeJeux(valeur);
    const typesDe = (nom) => typesDUnJeu(cle.endsWith('pzl') ? 'pzl' : 'variantes', nom);
    const imposes = placesImposees({ imposes: liste.imposes, quotas: quotasPossibles(liste, typesDe) }, typesDe);
    return `${liste.candidats.length} jeu${liste.candidats.length > 1 ? 'x' : ''}${imposes ? `, ${imposes} imposé${imposes > 1 ? 's' : ''}` : ''}`;
  }
  if (REGLE_ENTRAINEMENT[cle].sorte === 'minutes') return `${valeur / 60} min`;
  if (REGLE_ENTRAINEMENT[cle].sorte === 'mode') return valeur === 'bonus' ? 'Bonus' : 'Délai';
  return String(valeur);
};

// Pour le moteur commun des versions (moteur/historique-reglages.js).
const DESCRIPTION_PROFIL_ENTRAINEMENT = {
  cles: CLES_REGLES_ENTRAINEMENT,
  valeurs: valeursProfilEntrainement,
  valeur: (valeurs, cle) => valeurs.regles[cle],
  libelle: (cle) => {
    const groupe = GROUPES_REGLES_ENTRAINEMENT.find((g) => g.regles.some(([autre]) => autre === cle));
    const libelle = REGLE_ENTRAINEMENT[cle].libelle.replace(/ \(.*\)$/, '');
    return groupe.ceinture === undefined ? libelle : `${groupe.titre.replace(' (Variantes)', '')}, ${libelle.toLowerCase()}`;
  },
  texte: texteRegleEntrainement,
};
