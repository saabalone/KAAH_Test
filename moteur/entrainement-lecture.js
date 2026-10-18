// Ce que le jeu LIT d'un profil d'Entrainement (phase 36) : les listes de jeux
// proposes (« Standard|!mBelg|Alien » — un ! devant un jeu impose), les reglages
// structures (la serie, les pendules, les options), la regle de la serie d'un grade
// et ses jeux proposes. Pur ; extrait de moteur/entrainement-profil.js (regle des
// 200 lignes), qui decrit les regles a cocher.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CEINTURES (moteur/entrainement.js),
// quotasManquants (moteur/entrainement-serie.js) viennent de fichiers charges avant
// celui-ci ; valeursProfilEntrainement (moteur/entrainement-profil.js, charge apres)
// n'est appele qu'a l'usage.

// Une liste de jeux : « Standard|!mBelg|Alien|#eclate=1 » — un ! devant un jeu impose,
// et # pour imposer n jeux d'un type (saab, 2026-10-10 : « imposer n dans les types de
// variantes et PZL/Mini »).
const SEPARATEUR_LISTE = '|';
const MARQUE_IMPOSE = '!';
const MARQUE_QUOTA = '#';
const QUOTA_DE_TYPE = /^#([^=]+)=(\d+)$/;
function lireListeDeJeux(texte) {
  const candidats = [];
  const imposes = [];
  const quotas = {};
  for (const brut of String(texte).split(SEPARATEUR_LISTE).map((morceau) => morceau.trim())) {
    const quota = QUOTA_DE_TYPE.exec(brut);
    if (quota) {
      if (Number(quota[2]) > 0) quotas[quota[1].trim()] = Number(quota[2]);
      continue;
    }
    const impose = brut.startsWith(MARQUE_IMPOSE);
    const nom = brut.replace(MARQUE_IMPOSE, '').trim();
    if (!nom || nom.startsWith(MARQUE_QUOTA) || candidats.includes(nom)) continue;
    candidats.push(nom);
    if (impose) imposes.push(nom);
  }
  return { candidats, imposes, quotas };
}
const ecrireListeDeJeux = ({ candidats, imposes, quotas = {} }) =>
  [...candidats.map((nom) => (imposes.includes(nom) ? MARQUE_IMPOSE + nom : nom)), ...Object.entries(quotas).map(([type, n]) => `${MARQUE_QUOTA}${type}=${n}`)].join(SEPARATEUR_LISTE);

// Ce que le jeu lit d'un profil : la serie (moteur/entrainement.js), les
// pendules (moteur/entrainement-reglages.js) et les options de la partie.
function reglagesDuProfilEntrainement(profil) {
  const r = valeursProfilEntrainement(profil).regles;
  return {
    serie: {
      victoiresParJeu: r.victoiresParJeu ?? 1,
      jeuxParSerie: r.jeuxParSerie ?? 1,
      revanche: Boolean(r.revanche),
      confirmation: Boolean(r.confirmation),
      revancheDeConfirmation: Boolean(r.revancheDeConfirmation),
      essaisAvantReinitialisation: r.seriesRatees ?? Infinity,
      reinitialiserTousLesJeux: false,
      reinitialisationsAvantDeRedescendre: r.reinitialisations ?? Infinity,
      joursAvantReconfirmation: r.joursSansJouer ?? Infinity,
      rattrapageSurNulle: Boolean(r.rattrapageSurNulle),
    },
    pausesMax: r.pauses ?? Infinity,
    attenteDuCoupS: r.attenteDuCoup ?? null,
    supplementIAApresTemps: r.supplementIA ?? 0,
    options: {
      nulleDefaite: Boolean(r.nulleDefaite),
      nonJoueeIgnoree: Boolean(r.nonJoueeIgnoree),
      bloquer: ['Conseils', 'Menaces', 'Sequence', 'Commentaires', 'Occurrences', 'Reglages'].filter((quoi) => r[`bloquer${quoi}`]).map((quoi) => quoi.toLowerCase()),
      cacherEvaluation: Boolean(r.cacherEvaluation),
      interdireIA: Boolean(r.interdireIA),
      reflexionPzl: r.reflexionPzl,
      pzlSansElagage: Boolean(r.pzlSansElagage),
      pzlDernierTour: Boolean(r.pzlDernierTour),
      pzlPermutation: Boolean(r.pzlPermutation),
      pzlSolutionUnique: !r.pzlPlusieursSolutions,
    },
    ceintures: CEINTURES.map((_, i) => ({
      niveau: r[`c${i}niveau`],
      ia: { tempsInitial: r[`c${i}ia`], sansLimite: Boolean(r[`c${i}iaSansLimite`]), elagage: r[`c${i}iaElagage`] ?? 0, reflexion: r[`c${i}iaReflexion`] },
      joueur: { mode: r[`c${i}mode`], tempsInitial: r[`c${i}temps`], bonusParCoup: r[`c${i}bonus`] ?? 0, bonusParEjection: r[`c${i}bonusEjection`] ?? 0, delai: r[`c${i}delai`] ?? 0 },
      jeuxParSerie: r[`c${i}jeux`] ?? null,
      victoiresParJeu: r[`c${i}victoires`] ?? null,
      handicap: r[`c${i}handicap`] ?? 0,
      pzlTemps: r[`c${i}pzlTemps`] ?? null,
      pzlPendule: { mode: r[`c${i}pzlMode`], bonusParCoup: r[`c${i}pzlBonus`] ?? 0, bonusParEjection: r[`c${i}pzlBonusEjection`] ?? 0, delai: r[`c${i}pzlDelai`] ?? 0 },
      annuler: Boolean(r[`c${i}annuler`]),
      reinitialiserTout: Boolean(r[`c${i}reinitialiserTout`]),
      variantes: r[`c${i}variantes`] === undefined ? null : lireListeDeJeux(r[`c${i}variantes`]),
      variantesProposees: r[`c${i}variantesProposees`],
      pzl: r[`c${i}pzl`] === undefined ? null : lireListeDeJeux(r[`c${i}pzl`]),
      pzlProposes: r[`c${i}pzlProposes`],
    })),
  };
}

// La regle de la serie pour viser `grade` dans `sorte` ('variantes' ou 'pzl') : celle
// du profil, avec ce que le grade change — les jeux par serie (les ceintures blanche
// et rouge : 2, puis 3 variantes), la reinitialisation de toute la serie, les imposes
// et les quotas par type. `typesDe(nom)` : les types d'un jeu (moteur/entrainement.js,
// typesDuJeu), que seule l'interface connait. La serie a toujours au moins autant de
// jeux qu'il y en a d'imposes (saab, 2026-10-11 : « vérifier que le réglage est
// possible ») : sinon aucun jeu ne pourrait y prendre place.
function reglesDeSerieDuGrade(reglages, grade, sorte = 'variantes', typesDe = () => []) {
  const siens = reglages.ceintures[grade];
  if (!siens) return reglages.serie;
  const imposes = siens[sorte]?.imposes ?? [];
  const quotas = quotasPossibles(siens[sorte], typesDe);
  return {
    ...reglages.serie,
    jeuxParSerie: Math.max(siens.jeuxParSerie || reglages.serie.jeuxParSerie, placesImposees({ imposes, quotas }, typesDe)),
    ...(siens.victoiresParJeu ? { victoiresParJeu: siens.victoiresParJeu } : {}),
    reinitialiserTousLesJeux: siens.reinitialiserTout,
    imposes,
    quotas,
    typesDe,
  };
}

// Les jeux qu'une liste impose dans la serie : ses imposes, puis ce qui manque au nombre
// impose de chaque type — un jeu impose compte dans celui de son type (saab, 2026-10-11 :
// « 📌 et Ligne d'un type = 1 ... je ne voulais qu'une »), comme dans la serie
// (moteur/entrainement-serie.js, placePourUnJeu).
function placesImposees({ imposes = [], quotas = {} }, typesDe = () => []) {
  return imposes.length + quotasManquants(quotas, imposes, typesDe);
}

// Un quota ne demande jamais plus de jeux de son type que la liste n'en a (sinon la
// serie ne pourrait jamais se finir).
function quotasPossibles(liste, typesDe) {
  if (!liste) return {};
  return Object.fromEntries(
    Object.entries(liste.quotas)
      .map(([type, quota]) => [type, Math.min(quota, liste.candidats.filter((nom) => typesDe(nom).includes(type)).length)])
      .filter(([, quota]) => quota > 0)
  );
}

// Les noms des jeux que `grade` peut proposer dans `sorte` : sa liste (ceux qui
// existent parmi `nomsExistants`, dans son ordre — un PZL d'un autre grade y est
// permis), ou, decochee, `nomsDuGrade`.
function candidatsDuGrade(reglages, grade, sorte, nomsDuGrade, nomsExistants = nomsDuGrade) {
  const liste = reglages.ceintures[grade][sorte];
  return liste ? liste.candidats.filter((nom) => nomsExistants.includes(nom)) : [...nomsDuGrade];
}

// Combien en tirer au hasard (undefined : tous).
const nombreDeJeuxProposes = (reglages, grade, sorte) => reglages.ceintures[grade][sorte === 'pzl' ? 'pzlProposes' : 'variantesProposees'];
