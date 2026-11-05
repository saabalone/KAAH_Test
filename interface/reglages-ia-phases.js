// Les COPIES DES PHASES dans Reglages, rubrique Machine (les ajouts Ct et Ph, moteur/ia-phase.js) : une liste pour copier un profil, et une
// colonne par phase a cote de chaque poids (saab, 2026-11-04 : « le profil n'a qu'une colonne il en faudrait autant que de phase, non ? »).
// Extrait d'interface/reglages-ia-poids.js (regle des 200 lignes).
//
// La liste (saab, 2026-10-23 : « lance Copie ») : choisi, un profil remplit la colonne ; tant qu'on ne le change pas, la copie reste — meme si
// ce profil a change depuis, ou n'existe plus (il reste alors dans la liste, « copie »). Un chiffre tape dans une colonne retouche la copie :
// son nom le dit (« retouché »). Vide, une colonne joue la phase d'avant : son chiffre s'y lit en grise.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : copieDuProfilDuMilieu (moteur/ia-phase.js), CLES_DES_COPIES_DES_PHASES,
// LIBELLES_DES_COPIES_DES_PHASES, LIBELLES_REGLAGES_IA (moteur/historique-profil-ia.js), listerProfilsIA (interface/profils-ia.js),
// listerProfilsIADansLOrdre, libelleProfilIA (interface/noms-profils-ia.js) viennent de fichiers charges avant celui-ci.

const AJOUTS_DES_PHASES = ['centreTenu', 'phasesAuScore'];
const SUFFIXE_COPIE_RETOUCHEE = ' (retouché)';
const TITRES_DES_COLONNES_DE_PHASES = { milieu: 'Mil', fin: 'Fin', finEnAvance: 'Fin+' };
const copieRetouchee = (copie, poids) => ({ ...copie, poids, profil: `${copie.profil.replace(SUFFIXE_COPIE_RETOUCHEE, '')}${SUFFIXE_COPIE_RETOUCHEE}` });

// `cases` : la case de chaque poids ; `ligneDe(cle)` : sa ligne ; `clesDesPoids` ; `rubrique` : l'element qui porte la mise en colonnes ;
// `retoucher()`, `pendantLaFrappe()`. A creer apres le rangement par groupes. Renvoie { afficher(valeurs), lire() }.
function creerLesCopiesDesPhases({ cases, ligneDe, clesDesPoids, rubrique, retoucher, pendantLaFrappe }) {
  const COPIES = {
    milieu: { liste: document.getElementById('select-profil-milieu-ia'), vide: '— profil du milieu —', ajouts: AJOUTS_DES_PHASES },
    fin: { liste: document.getElementById('select-profil-fin-ia'), vide: '— profil de fin —', ajouts: ['phasesAuScore'] },
    finEnAvance: { liste: document.getElementById('select-profil-fin-avance-ia'), vide: '— profil de fin, en avance —', ajouts: ['phasesAuScore'] },
  };
  const affichees = {};
  let valeursAffichees = null;
  const estCochee = (copie) => COPIES[copie].ajouts.some((ajout) => cases[ajout].checked);
  for (const { liste } of Object.values(COPIES)) liste.addEventListener('change', () => retoucher());

  // Une colonne par copie, dans chaque ligne de poids.
  const clesDesColonnes = clesDesPoids.filter((cle) => !AJOUTS_DES_PHASES.includes(cle));
  const champs = Object.fromEntries(
    CLES_DES_COPIES_DES_PHASES.map((copie) => [
      copie,
      Object.fromEntries(
        clesDesColonnes.map((cle) => {
          const champ = document.createElement('input');
          champ.type = 'number';
          champ.className = 'champ-de-phase';
          champ.title = `${LIBELLES_DES_COPIES_DES_PHASES[copie]} : ${LIBELLES_REGLAGES_IA[cle] ?? cle}`;
          champ.addEventListener('change', () => retoucher());
          champ.addEventListener('input', pendantLaFrappe);
          ligneDe(cle).querySelector('.nombre-avec-boutons').append(champ);
          return [cle, champ];
        })
      ),
    ])
  );
  // Le titre des colonnes, sur le titre de chaque groupe.
  const titres = [...rubrique.querySelectorAll('.titre-groupe-ia')].map((titreDuGroupe) => {
    const titre = document.createElement('span');
    titre.className = 'titres-des-phases';
    titre.append(
      Object.assign(document.createElement('span'), { textContent: 'Ouv' }),
      ...CLES_DES_COPIES_DES_PHASES.map((copie) => Object.assign(document.createElement('span'), { textContent: TITRES_DES_COLONNES_DE_PHASES[copie], className: `titre-phase-${copie}` }))
    );
    titreDuGroupe.append(titre);
    return titre;
  });

  // Ce que joue la phase d'avant (moteur/ia-phase.js, copieDeLaPhase) : ce qu'on lit dans une colonne vide.
  const phaseDAvant = (valeurs, copie) => (copie === 'milieu' ? valeurs : copie === 'fin' ? valeurs.milieu ?? valeurs : valeurs.fin ?? valeurs.milieu ?? valeurs);

  function afficherLaCopie(copie, valeurs) {
    const { liste, vide } = COPIES[copie];
    const celle = valeurs[copie] ?? null;
    affichees[copie] = celle;
    // Chacun sous le nom des listes (« Agressif v5ElP5 ») : c'est lui que la copie garde.
    const choix = [['', vide], ...listerProfilsIADansLOrdre().map((profil) => [libelleProfilIA(profil), libelleProfilIA(profil)])];
    if (celle && !choix.some(([valeur]) => valeur === celle.profil)) choix.push([celle.profil, `${celle.profil} (copie)`]);
    liste.replaceChildren(...choix.map(([valeur, texte]) => Object.assign(document.createElement('option'), { value: valeur, textContent: texte })));
    liste.value = celle?.profil ?? '';
    liste.disabled = !estCochee(copie);
    const modele = phaseDAvant(valeurs, copie);
    for (const cle of clesDesColonnes) {
      const champ = champs[copie][cle];
      champ.hidden = !estCochee(copie) || !rubrique.classList.contains('avec-colonnes-de-phases');
      champ.value = celle?.poids[cle] ?? '';
      champ.placeholder = modele.poids[cle] ?? '';
      // Pareil que l'ouverture : en retrait, pour que ce qui change se voie.
      champ.classList.toggle('comme-l-ouverture', celle !== null && celle.poids[cle] === valeurs.poids[cle]);
    }
  }

  function afficher(valeurs) {
    valeursAffichees = valeurs;
    rubrique.classList.toggle('avec-colonnes-de-phases', AJOUTS_DES_PHASES.some((ajout) => cases[ajout].checked));
    for (const copie of CLES_DES_COPIES_DES_PHASES) afficherLaCopie(copie, valeurs);
    for (const titre of titres) for (const copie of CLES_DES_COPIES_DES_PHASES) titre.querySelector(`.titre-phase-${copie}`).hidden = !estCochee(copie);
  }

  // Le profil choisi dans la liste : sa copie, celle qu'on montre s'il n'a pas change, rien s'il n'y en a pas.
  function copieDeLaListe(copie) {
    const { liste } = COPIES[copie];
    if (liste.value === '') return null;
    if (affichees[copie]?.profil === liste.value) return affichees[copie];
    const profil = listerProfilsIA().find((autre) => libelleProfilIA(autre) === liste.value);
    return profil ? copieDuProfilDuMilieu({ ...profil, nom: libelleProfilIA(profil) }) : affichees[copie];
  }

  function lireLaCopie(copie) {
    if (!estCochee(copie)) return null;
    const choisie = copieDeLaListe(copie);
    // Un autre profil dans la liste remplace la colonne.
    if ((affichees[copie]?.profil ?? '') !== COPIES[copie].liste.value) return choisie;
    const tapes = Object.fromEntries(clesDesColonnes.filter((cle) => !ligneDe(cle).hidden).map((cle) => [cle, champs[copie][cle].value.trim()]));
    if (!choisie && Object.values(tapes).every((tape) => tape === '')) return null;
    // Une colonne vide ou l'on tape : a partir de ce que jouait sa phase.
    const base = choisie ?? { profil: LIBELLES_DES_COPIES_DES_PHASES[copie], version: valeursAffichees.version, elagage: valeursAffichees.elagage, style: valeursAffichees.style, poids: { ...phaseDAvant(valeursAffichees, copie).poids } };
    const poids = { ...base.poids };
    for (const [cle, tape] of Object.entries(tapes)) {
      if (tape === '' && choisie) delete poids[cle];
      else if (tape !== '') poids[cle] = Number(tape);
    }
    return Object.keys(tapes).some((cle) => poids[cle] !== base.poids[cle]) || !choisie ? copieRetouchee(base, poids) : base;
  }

  const lire = () => Object.fromEntries(CLES_DES_COPIES_DES_PHASES.map((copie) => [copie, lireLaCopie(copie)]).filter(([, copie]) => copie));
  return { afficher, lire };
}
