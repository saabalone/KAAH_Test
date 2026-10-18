// Les OPERATIONS PAR COLONNE des tableaux Ceintures × (interface/entrainement-ceintures-
// jeux.js ; extrait pour la regle des 200 lignes) : le prereglage des PZL et son second
// clic, et COPIER une colonne pour la COLLER dans d'autres (saab, 2026-10-15 : « copier/
// coller la colonne précédente dans les colonnes suivantes, surtout pour celles qui ont
// des 📌, comme ça je n'aurai qu'à ajouter des imposés sur les suivantes »).
//
// Et le MAJ + CLIC d'une case (saab, 2026-10-15 : « Shift + clic pour sélectionner
// plusieurs champs ») : dans sa colonne (les lignes affichees) ou dans sa ligne.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : brancherClicMajuscule
// (interface/clic-majuscule.js) vient d'un fichier charge avant celui-ci.

// `outils` : { corps, grades, listeDe(grade), poserLaListe(grade, liste), verifier(),
// boutonPrereglage }. Renvoie { remettre (a l'ouverture), preregler(listeDuGrade),
// copier(grade), coller(grade, jusquIci) }.
function creerColonnesDesCeintures(outils) {
  let avantPrereglage = null; // les listes d'avant le prereglage : un second clic les remet
  let copiee = null; // { grade, liste } : la colonne copiee

  function marquerLaCopie() {
    outils.corps.classList.toggle('colonne-copiee', copiee !== null);
    for (const bouton of outils.corps.querySelectorAll('[data-copier-grade]')) bouton.classList.toggle('bouton-actif', copiee?.grade === Number(bouton.dataset.copierGrade));
  }

  function remettre() {
    [avantPrereglage, copiee] = [null, null];
    outils.boutonPrereglage.classList.remove('bouton-actif');
    marquerLaCopie();
  }

  // Remplace tout le tableau par `listeDuGrade(grade)`, qu'on retouche ensuite ; un
  // second clic remet le tableau d'avant (saab, 2026-10-14 : « 2ème clic inactif »).
  function preregler(listeDuGrade) {
    const avant = avantPrereglage;
    avantPrereglage = avant ? null : outils.grades.map(outils.listeDe);
    for (const grade of outils.grades) outils.poserLaListe(grade, avant ? avant[grade] : listeDuGrade(grade));
    outils.boutonPrereglage.classList.toggle('bouton-actif', avantPrereglage !== null);
    outils.verifier();
  }

  // Copier : coches, 📌 et nombres imposes ; retoucher la meme colonne oublie la copie.
  function copier(grade) {
    copiee = copiee?.grade === grade ? null : { grade, liste: outils.listeDe(grade) };
    marquerLaCopie();
  }

  // Coller dans `grade` ; `jusquIci` (Maj + clic) : dans toutes les colonnes depuis la
  // copiee jusqu'a celle-ci.
  function coller(grade, jusquIci) {
    if (!copiee || grade === copiee.grade) return;
    const [de, a] = [Math.min(copiee.grade, grade), Math.max(copiee.grade, grade)];
    const cibles = jusquIci ? outils.grades.filter((autre) => autre >= de && autre <= a && autre !== copiee.grade) : [grade];
    for (const cible of cibles) outils.poserLaListe(cible, copiee.liste);
    outils.verifier();
  }

  return { remettre, preregler, copier, coller };
}

// `caseDe(rangee, grade, quoi)`, `poser(nom, grade, quoi, oui)`, `verifier()` : ceux du
// tableau (interface/entrainement-ceintures-jeux.js).
function brancherClicMajusculeDesCeintures(corps, grades, caseDe, poser, verifier) {
  const sorteDeCase = (caseTouchee) => (caseTouchee.matches('[data-impose]') ? 'impose' : 'inclus');
  const colonneDe = (caseTouchee) => caseTouchee.closest('td').cellIndex - 1;
  brancherClicMajuscule(
    corps,
    (caseTouchee) => {
      const rangee = caseTouchee.closest('tr[data-nom]');
      if (!rangee) return [];
      const quoi = sorteDeCase(caseTouchee);
      return [[...corps.querySelectorAll('tr[data-nom]:not([hidden])')].map((autre) => caseDe(autre, colonneDe(caseTouchee), quoi)), grades.map((grade) => caseDe(rangee, grade, quoi))];
    },
    (cases, etat) => {
      for (const autre of cases) poser(autre.closest('tr').dataset.nom, colonneDe(autre), sorteDeCase(autre), etat);
      verifier();
    }
  );
}
