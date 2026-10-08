// Le BANC D'ESSAIS (saab, 2026-10-08 : « une petite appli, en une option pour
// ordi, qui permet de programmer ce qu'on veut, comme tu fais, sans faire de
// code ») : des profils IA, eventuellement des variantes d'un ou deux poids,
// chacun joue contre un profil de REFERENCE, sur des ouvertures tirees au
// hasard, avec la revanche ; le resultat en tableau (interface/banc-essais.js).
// La reference se sert du livre d'ouvertures (ses premiers coups au hasard parmi
// les siens, pour varier les ouvertures, puis le livre normal), l'essai jamais.
// Pur : la recherche (KAI++) et l'affichage sont dans l'interface.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : couleursDuPlateau,
// appliquerCoup (partie.js), ecrirePosition (notation.js), lireCoupNacre
// (notation.js), obtenirConseils (next-move.js), SEUIL_NULLE_PAR_DEFAUT
// (nulle.js), coupDuLivre (ia.js), CLES_CASES_IA_V3 (ia-evaluation-v3.js) viennent de fichiers charges avant celui-ci.

// 150 tours : au-dela, nulle (une partie entre machines qui tourne en rond).
const COUPS_MAX_BANC = 300;
const GRAINE_PREMIERE_OUVERTURE = 1000;
const PAS_DES_GRAINES = 7919;

// « 0, 40, 60 » -> [0, 40, 60] ; « sans » -> null (enlever le poids, un ajout) ;
// la virgule decimale francaise est comprise (« 0,5 ; 1 »).
function lireValeursDuBanc(texte) {
  const morceaux = String(texte).includes(';') ? String(texte).split(';') : String(texte).split(/,(?!\d)|,\s+/);
  return morceaux
    .map((morceau) => morceau.trim().toLowerCase())
    .filter(Boolean)
    .map((morceau) => (morceau === 'sans' ? null : Number(morceau.replace(',', '.'))))
    .filter((valeur) => valeur === null || Number.isFinite(valeur));
}

// « Cases (e5 a a1) × » (saab, 2026-10-08 : « comment on fait si on veut changer
// e5 a a1 qui en fait 9 ? ») : les 9 cases multipliees ensemble.
const CLE_CASES_BANC = 'cases';
// Le niveau et la reflexion (en secondes) de chaque profil (saab, 2026-10-08 :
// « choisir des niveaux et tps de reflexion differents pour chaque fichier »).
const REGLAGES_DE_RECHERCHE_BANC = ['niveau', 'temps'];

// Chaque profil ({ nom, version, elagage, poids }), et une variante par
// combinaison des valeurs de `variations` ([{ cle, valeurs }]) ; la cle
// `elagage` change l'elagage, `niveau` et `temps` ceux du profil (null : les
// garder), la cle CLE_CASES_BANC multiplie les cases que le
// profil a (CLES_CASES_IA_V3), une valeur null enleve le poids (ou les cases).
function variantesDuBanc(profils, variations) {
  if (variations.length === 0) return profils;
  const combinaisons = variations.reduce((suites, { cle, valeurs }) => suites.flatMap((suite) => valeurs.map((valeur) => [...suite, [cle, valeur]])), [[]]);
  return profils.flatMap((profil) =>
    combinaisons.map((combinaison) => {
      const poids = { ...profil.poids };
      let elagage = profil.elagage;
      const recherche = {};
      for (const [cle, valeur] of combinaison) {
        if (cle === 'elagage') elagage = valeur ?? 0;
        else if (REGLAGES_DE_RECHERCHE_BANC.includes(cle)) {
          if (valeur !== null) recherche[cle] = valeur;
        }
        else if (cle === CLE_CASES_BANC) {
          for (const caseIA of CLES_CASES_IA_V3.filter((caseIA) => caseIA in poids)) {
            if (valeur === null) delete poids[caseIA];
            else poids[caseIA] *= valeur;
          }
        } else if (valeur === null) delete poids[cle];
        else poids[cle] = valeur;
      }
      const texte = (valeur) => String(valeur).replace('.', ','); // la virgule decimale francaise
      const libelle = (cle, valeur) => (valeur === null ? `${cle} sans` : cle === CLE_CASES_BANC ? `${cle} ×${texte(valeur)}` : `${cle} ${texte(valeur)}`);
      const nom = `${profil.nom} · ${combinaison.map(([cle, valeur]) => libelle(cle, valeur)).join(' · ')}`;
      return { ...profil, ...recherche, nom, elagage, poids };
    })
  );
}

// Les parties a jouer : par essai, une par ouverture (et sa revanche) —
// { essai, ouverture, graine, referenceNoir }. Meme ouverture, meme graine, d'un
// essai a l'autre : on compare les essais sur les memes debuts.
function partiesDuBanc(nombreDEssais, { ouvertures, revanche }) {
  const parties = [];
  for (let essai = 0; essai < nombreDEssais; essai++) {
    for (let ouverture = 1; ouverture <= ouvertures; ouverture++) {
      const graine = GRAINE_PREMIERE_OUVERTURE + (ouverture - 1) * PAS_DES_GRAINES;
      for (const referenceNoir of revanche ? [true, false] : [true]) parties.push({ essai, ouverture, graine, referenceNoir });
    }
  }
  return parties;
}

// Un hasard reproductible (le meme a chaque lancement) : [0, 1[.
function hasardDuBanc(graine) {
  let etat = graine;
  return () => {
    etat = (etat * 1103515245 + 12345) % 2147483648;
    return etat / 2147483648;
  };
}

// Le coup de la reference dans le livre : ses `coupsAuHasard` premiers coups
// tires parmi tous ceux du livre, ensuite le livre normal (moteur/ia.js,
// coupDuLivre) ; null hors du livre. `livreEnsuite` faux (saab, 2026-10-08 :
// tester aussi la reference sans livre) : les coups au hasard seulement, qui
// varient les ouvertures, puis toujours null (la recherche).
function coupDeLaReferenceAuLivre(livre, etat, hasard, coupsDejaJoues, coupsAuHasard, livreEnsuite = true) {
  if (!livre) return null;
  if (coupsDejaJoues < coupsAuHasard) {
    const conseils = obtenirConseils(livre, ecrirePosition(etat), etat.joueurAuTrait);
    if (conseils.length > 0) {
      const choisi = conseils[Math.floor(hasard() * conseils.length)];
      const coup = lireCoupNacre(couleursDuPlateau(etat.plateau), etat.joueurAuTrait, choisi.coup);
      if (coup) return coup;
    }
  }
  if (!livreEnsuite) return null;
  return coupDuLivre(livre, etat, hasard)?.coup ?? null;
}

// Le coup est-il un coup du livre pour cette position (meme joue sans lui) ?
function dansLeLivre(livre, etat, coup) {
  if (!livre) return false;
  const apres = ecrirePosition(appliquerCoup(etat, coup).etat);
  return obtenirConseils(livre, ecrirePosition(etat), etat.joueurAuTrait).some((conseil) => {
    const lu = lireCoupNacre(couleursDuPlateau(etat.plateau), etat.joueurAuTrait, conseil.coup);
    return lu !== null && ecrirePosition(appliquerCoup(etat, lu).etat) === apres;
  });
}

// La fin de la partie : 'noir' ou 'blanc' (6 ejections), la nulle par
// repetition (SEUIL_NULLE_PAR_DEFAUT fois la meme position, moteur/nulle.js) ou
// par la limite de coups ; null si elle continue. `historique` : les positions
// ecrites, la derniere comprise.
function finDeLaPartieDuBanc(etat, historique, nombreDeCoups) {
  if (etat.vainqueur) return etat.vainqueur;
  const derniere = historique.at(-1);
  if (derniere !== undefined && historique.filter((position) => position === derniere).length >= SEUIL_NULLE_PAR_DEFAUT) return 'nulle (répétition)';
  if (nombreDeCoups >= COUPS_MAX_BANC) return 'nulle (limite)';
  return null;
}

// Par essai : { jouees, gagnees, enNoir, enBlanc, nulles, tours, secondes } —
// `parties` : [{ essai, referenceNoir, fin, tours, secondesEssai }].
function resumeDuBanc(parties, nombreDEssais) {
  return Array.from({ length: nombreDEssais }, (_, essai) => {
    const siennes = parties.filter((p) => p.essai === essai);
    const essaiNoir = (p) => !p.referenceNoir;
    const gagnee = (p) => (p.fin === 'noir' && essaiNoir(p)) || (p.fin === 'blanc' && !essaiNoir(p));
    const moyenne = (valeurs) => (valeurs.length ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length : 0);
    return {
      jouees: siennes.length,
      gagnees: siennes.filter(gagnee).length,
      enNoir: siennes.filter((p) => gagnee(p) && essaiNoir(p)).length,
      enBlanc: siennes.filter((p) => gagnee(p) && !essaiNoir(p)).length,
      nulles: siennes.filter((p) => p.fin.startsWith('nulle')).length,
      tours: moyenne(siennes.map((p) => p.tours)),
      secondes: moyenne(siennes.map((p) => p.secondesEssai)),
    };
  });
}
