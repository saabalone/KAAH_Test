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
// (notation.js), obtenirConseils, conseilsDuCampAuTrait, coupGagnantOuEgal (next-move.js), SEUIL_NULLE_PAR_DEFAUT,
// compterOccurrences (nulle.js), coupDuLivre (ia.js), CLES_CASES_IA_V3 (ia-evaluation-v3.js), GROUPES_DE_L_EVALUATION_IA,
// multiplierUnGroupe (ia-groupes.js), lirePosition (notation.js), billesHorsDuGroupePrincipal (ia-groupe-principal.js)
// viennent de fichiers charges avant celui-ci.

// 150 tours : au-dela, nulle (une partie entre machines qui tourne en rond).
const COUPS_MAX_BANC = 300;
const GRAINE_PREMIERE_OUVERTURE = 1000;
const PAS_DES_GRAINES = 7919;

// « 0, 40, 60 » -> [0, 40, 60] ; « sans » -> null (enlever le poids, un ajout) ;
// la virgule decimale francaise est comprise (« 0,5 ; 1 ») ; « 60 % » -> 0,6 (un groupe ×).
function lireValeursDuBanc(texte) {
  const morceaux = String(texte).includes(';') ? String(texte).split(';') : String(texte).split(/,(?!\d)|,\s+/);
  return morceaux
    .map((morceau) => morceau.trim().toLowerCase())
    .filter(Boolean)
    .map((morceau) => (morceau === 'sans' ? null : /%$/.test(morceau) ? Number(morceau.replace('%', '').trim().replace(',', '.')) / 100 : Number(morceau.replace(',', '.'))))
    .filter((valeur) => valeur === null || Number.isFinite(valeur));
}

// « Cases (e5 a a1) × » (saab, 2026-10-08 : « comment on fait si on veut changer
// e5 a a1 qui en fait 9 ? ») : les 9 cases multipliees ensemble.
const CLE_CASES_BANC = 'cases';
// « Attaque × » ... (saab, 2026-10-14 : « pouvoir donner un pourcentage sur chaque groupe ») :
// tous les poids d'un groupe de l'evaluation (moteur/ia-groupes.js) multiplies ensemble.
const PREFIXE_GROUPE_BANC = 'groupe:';
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
        else if (cle.startsWith(PREFIXE_GROUPE_BANC)) {
          if (valeur !== null) Object.assign(poids, multiplierUnGroupe(poids, cle.slice(PREFIXE_GROUPE_BANC.length), valeur));
        } else if (cle === CLE_CASES_BANC) {
          for (const caseIA of CLES_CASES_IA_V3.filter((caseIA) => caseIA in poids)) {
            if (valeur === null) delete poids[caseIA];
            else poids[caseIA] *= valeur;
          }
        } else if (valeur === null) delete poids[cle];
        else poids[cle] = valeur;
      }
      const texte = (valeur) => String(valeur).replace('.', ','); // la virgule decimale francaise
      const libelleDuGroupe = (cle) => GROUPES_DE_L_EVALUATION_IA.find((groupe) => `${PREFIXE_GROUPE_BANC}${groupe.cle}` === cle)?.libelle;
      // Chaque reglage abrege (moteur/noms-ia.js : ScGain 80, E5 +30, Sv sans).
      const libelle = (cle, valeur) =>
        libelleDuGroupe(cle) && valeur !== null ? `${libelleDuGroupe(cle)} ×${texte(valeur)}` : cle === CLE_CASES_BANC ? `${cle} ${valeur === null ? 'sans' : `×${texte(valeur)}`}` : `${abreviationDuReglageIA(cle)} ${valeur === null ? 'sans' : valeurAbregeeDuReglageIA(cle, valeur)}`;
      const nom = `${profil.nom} · ${combinaison.map(([cle, valeur]) => libelle(cle, valeur)).join(' · ')}`;
      return { ...profil, ...recherche, nom, elagage, poids };
    })
  );
}

// Les parties a jouer : par essai, par variante, une par ouverture (et sa revanche) —
// { numero (a partir de 1), essai, variante (son nom, ou null : la position de depart du
// banc), position (son texte), ouverture, graine, referenceNoir }. Meme ouverture, meme
// graine, d'un essai et d'une variante a l'autre : on compare sur les memes debuts.
// `variantes` : [{ nom, position }] (saab, 2026-10-14 : « pouvoir choisir une ou
// plusieurs ou toutes Variantes/PZL dans les tests entre IA »).
function partiesDuBanc(nombreDEssais, { ouvertures, revanche, variantes = [null] }) {
  const parties = [];
  for (let essai = 0; essai < nombreDEssais; essai++) {
    for (const variante of variantes.length ? variantes : [null]) {
      for (let ouverture = 1; ouverture <= ouvertures; ouverture++) {
        const graine = GRAINE_PREMIERE_OUVERTURE + (ouverture - 1) * PAS_DES_GRAINES;
        for (const referenceNoir of revanche ? [true, false] : [true]) parties.push({ numero: parties.length + 1, essai, variante: variante?.nom ?? null, position: variante?.position, ouverture, graine, referenceNoir });
      }
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
    // Seulement les verts et les gris, vus du camp au trait (saab, 2026-10-22 : « pas les rouges »).
    const conseils = conseilsDuCampAuTrait(livre, ecrirePosition(etat), etat.joueurAuTrait).filter(coupGagnantOuEgal);
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

// La NULLE DES BLOCS (saab, 2026-11-06 : « dès qu'une partie se trouve en 2 blocs sans différence de score >2 après 100 tours (ou
// moins, à vérifier ?), il faudrait déclarer Nulle car normalement il n'y a pas d'issue à moins d'erreur ») : a la fin d'un tour (apres
// Blanc), des le tour TOURS_AVANT_LA_NULLE_DES_BLOCS, si les TOURS_EN_BLOCS_POUR_LA_NULLE derniers tours ont fini deux camps en bloc
// (aucune bille hors du groupe principal, moteur/ia-groupe-principal.js), au meme score, a ECART_MAX_DE_LA_NULLE_DES_BLOCS billes au
// plus. Mesure sur 2 664 parties differentes des fichiers LabAl : 23 parties la declenchent, toutes finies nulles ; avec une bille
// dehors permise, ou 10 tours seulement, des parties gagnees l'auraient ete.
const TOURS_AVANT_LA_NULLE_DES_BLOCS = 60;
const TOURS_EN_BLOCS_POUR_LA_NULLE = 20;
const ECART_MAX_DE_LA_NULLE_DES_BLOCS = 2;
const COUPS_PAR_TOUR_BANC = 2;

const enBlocs = (etat) => ['noir', 'blanc'].every((camp) => billesHorsDuGroupePrincipal(couleursDuPlateau(etat.plateau), camp) === 0);

function nulleDesBlocs(historique, nombreDeCoups) {
  if (nombreDeCoups % COUPS_PAR_TOUR_BANC !== 0 || nombreDeCoups / COUPS_PAR_TOUR_BANC < TOURS_AVANT_LA_NULLE_DES_BLOCS) return false;
  const rangs = Array.from({ length: TOURS_EN_BLOCS_POUR_LA_NULLE }, (_, tour) => historique.length - 1 - COUPS_PAR_TOUR_BANC * tour);
  if (rangs.at(-1) < 0) return false; // un historique trop court : rien a juger
  const finsDeTours = rangs.map((rang) => lirePosition(historique[rang]));
  const [derniere] = finsDeTours;
  if (Math.abs(derniere.billesEjecteesNoires - derniere.billesEjecteesBlanches) > ECART_MAX_DE_LA_NULLE_DES_BLOCS) return false;
  return finsDeTours.every((fin) => fin.billesEjecteesNoires === derniere.billesEjecteesNoires && fin.billesEjecteesBlanches === derniere.billesEjecteesBlanches && enBlocs(fin));
}

// Les PREMIERS COUPS VARIES de la machine d'une ceinture (saab, 2026-11-06 : « Le mieux est de varier ces 1 ou 2 1er coups ») : sans
// eux, les essais d'un meme jeu redonnaient la meme partie (les deux KAI++ sont deterministes). Ses PREMIERS_COUPS_VARIES premiers coups
// sont tires parmi les bons : chaque coup legal, la position d'apres cherchee par KAI++ a PROFONDEUR_DES_COUPS_VARIES
// (interface/banc-essais-partie.js), ceux a MARGE_DES_COUPS_VARIES points au plus du meilleur. Mesure au depart de 7 variantes : a 10
// ou 20 points, seulement le meilleur et son symetrique (la meme partie en miroir) ; a 50, 2 a 4 coups vraiment differents.
const PREMIERS_COUPS_VARIES = 2;
const PROFONDEUR_DES_COUPS_VARIES = 3;
const MARGE_DES_COUPS_VARIES = 50;

// `valeurs` : [{ coup, valeur (pour le camp qui joue) }].
function bonsCoupsDuDepart(valeurs) {
  const meilleure = Math.max(...valeurs.map(({ valeur }) => valeur));
  return valeurs.filter(({ valeur }) => valeur >= meilleure - MARGE_DES_COUPS_VARIES);
}

// La fin de la partie : 'noir' ou 'blanc' (6 ejections), la nulle par
// repetition (SEUIL_NULLE_PAR_DEFAUT fois la meme position, moteur/nulle.js), celle
// des blocs ou celle de la limite de coups ; null si elle continue. `historique` : les
// positions ecrites, celle de depart et la derniere comprises.
function finDeLaPartieDuBanc(etat, historique, nombreDeCoups) {
  if (etat.vainqueur) return etat.vainqueur;
  const derniere = historique.at(-1);
  if (derniere !== undefined && compterOccurrences(historique, derniere) >= SEUIL_NULLE_PAR_DEFAUT) return 'nulle (répétition)';
  if (nulleDesBlocs(historique, nombreDeCoups)) return 'nulle (blocs)';
  if (nombreDeCoups >= COUPS_MAX_BANC) return 'nulle (limite)';
  return null;
}

// L'Occ de chaque coup (moteur/nulle.js) : combien de fois la position qu'il donne est
// deja venue, elle comprise — 2 et plus, une repetition ; SEUIL_NULLE_PAR_DEFAUT, la
// nulle. `historique` : les positions ecrites, celle de depart comprise.
const occurrencesDesCoups = (historique) => historique.slice(1).map((position, rang) => compterOccurrences(historique.slice(0, rang + 2), position));

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
