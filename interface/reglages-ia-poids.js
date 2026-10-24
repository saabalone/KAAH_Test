// Les CHAMPS DES POIDS de la rubrique Machine de Reglages (interface/reglages-ia.js) :
// chaque poids (son champ `poids-ia-<cle>`, sa case a cocher, ses − et +), le style, la
// version et le livre — les montrer, et les relire pour une retouche. Extrait
// d'interface/reglages-ia.js (regle des 200 lignes).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_POIDS_IA
// (moteur/ia-evaluation.js), CLES_POIDS_IA_V2 (moteur/ia-evaluation-v2.js),
// CLES_POIDS_IA_V3 (moteur/ia-evaluation-v3.js), CLES_POIDS_IA_V4 (moteur/ia-evaluation-v4.js),
// CLES_POIDS_IA_V5 (moteur/ia-evaluation-v5.js), CLES_OPTIONS_IA, POIDS_PROPOSES_OPTIONS_IA
// (moteur/ia-ajouts.js), POIDS_DES_VERSIONS_IA, SUFFIXE_ELAGAGE_IA, ELAGAGE_PAR_DEFAUT_IA
// (moteur/ia.js), rangerLesLignesParGroupe (interface/groupes-ia.js), brancherAppuiProlonge
// (interface/appui-prolonge.js), copieDuProfilDuMilieu (moteur/ia-phase.js), listerProfilsIA
// (interface/profils-ia.js), listerProfilsIADansLOrdre, libelleProfilIA (interface/noms-profils-ia.js)
// viennent de fichiers charges avant celui-ci.

// `elements` : ceux de la rubrique (style, version, elagage, livre) ; `retoucher()` : un
// champ a change. Renvoie { ligneDe(cle), afficherValeurs(valeurs), lireValeurs() }.
function creerLesChampsDesPoidsIA(elements, retoucher) {
  const CLES_POIDS = [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2, ...CLES_POIDS_IA_V3, ...CLES_POIDS_IA_V4, ...CLES_POIDS_IA_V5, ...CLES_OPTIONS_IA];
  const champPoids = (cle) => document.getElementById(`poids-ia-${cle}`);
  const champDe = (cle) => ({ version: elements.version, style: elements.style, elagage: elements.elagage, livre: elements.livre })[cle] ?? champPoids(cle);
  const ligneDe = (cle) => champDe(cle).closest('label');
  const estUnAjout = (cle) => CLES_OPTIONS_IA.includes(cle);

  // Une case devant chaque poids (saab, 2026-10-07 : « ce qui permettrait de le
  // supprimer plutot que de le regler a 0, c'est bcp plus simple ») : decochee,
  // le poids vaut 0 — ou, pour un ajout (le sumito vide), le profil ne l'a plus.
  // Recochee : la valeur d'avant, sinon celle du style.
  const cases = Object.fromEntries(
    CLES_POIDS.map((cle) => {
      const coche = document.createElement('input');
      coche.type = 'checkbox';
      coche.className = 'coche-poids';
      coche.title = estUnAjout(cle) ? 'Mettre ou enlever cet ajout' : 'Décochée : ce poids ne compte plus (0)';
      ligneDe(cle).prepend(coche);
      return [cle, coche];
    })
  );
  // Les poids groupe apres groupe, sous le nom de chacun (interface/groupes-ia.js).
  const actualiserLesGroupes = rangerLesLignesParGroupe(ligneDe);
  const valeursAvantDecoche = {};
  function valeurProposee(cle) {
    const style = elements.style.value;
    const version = Number.parseInt(elements.version.value, 10);
    const proposee = estUnAjout(cle) ? POIDS_PROPOSES_OPTIONS_IA[style]?.[cle] : POIDS_DES_VERSIONS_IA[version]?.styles[style]?.[cle];
    return valeursAvantDecoche[cle] || proposee || Number(champPoids(cle).step) || 1;
  }

  function afficherValeurs(valeurs) {
    elements.style.value = valeurs.style;
    // L'elagage se choisit avec la version (« 2el ») ; son nombre, seulement alors.
    elements.version.value = `${valeurs.version}${valeurs.elagage > 0 ? SUFFIXE_ELAGAGE_IA : ''}`;
    ligneDe('elagage').hidden = !(valeurs.elagage > 0);
    elements.elagage.value = valeurs.elagage;
    elements.livre.checked = valeurs.livre;
    for (const cle of CLES_POIDS) {
      const present = cle in valeurs.poids;
      // Un ajout se montre toujours (sa case le met) ; un poids, avec sa version.
      ligneDe(cle).hidden = !present && !estUnAjout(cle);
      cases[cle].checked = present && valeurs.poids[cle] !== 0;
      champPoids(cle).disabled = !cases[cle].checked;
      if (present) champPoids(cle).value = valeurs.poids[cle];
      else if (estUnAjout(cle)) champPoids(cle).value = valeurProposee(cle);
    }
    actualiserLesGroupes();
    afficherLeMilieu(valeurs.milieu);
  }

  // Le profil du milieu de l'ajout Ct (moteur/ia-phase.js ; saab, 2026-10-23 : « lance Copie ») :
  // choisi dans la liste, ses reglages sont copies ; tant qu'on ne le change pas, la copie reste —
  // meme si ce profil a change depuis, ou n'existe plus (il reste alors dans la liste, « copie »).
  const listeDuMilieu = document.getElementById('select-profil-milieu-ia');
  let milieuAffiche = null;
  listeDuMilieu.addEventListener('change', () => retoucher());
  function afficherLeMilieu(milieu) {
    milieuAffiche = milieu ?? null;
    const profils = listerProfilsIADansLOrdre();
    // Chacun sous le nom des listes (« Agressif v5ElP5 ») : c'est lui que la copie garde.
    const choix = [['', '— profil du milieu —'], ...profils.map((profil) => [libelleProfilIA(profil), libelleProfilIA(profil)])];
    if (milieu && !choix.some(([valeur]) => valeur === milieu.profil)) choix.push([milieu.profil, `${milieu.profil} (copie)`]);
    listeDuMilieu.replaceChildren(...choix.map(([valeur, texte]) => Object.assign(document.createElement('option'), { value: valeur, textContent: texte })));
    listeDuMilieu.value = milieu?.profil ?? '';
    listeDuMilieu.disabled = !cases.centreTenu.checked;
  }
  function milieuLu() {
    if (!cases.centreTenu.checked || listeDuMilieu.value === '') return undefined;
    if (milieuAffiche?.profil === listeDuMilieu.value) return milieuAffiche;
    const profil = listerProfilsIA().find((autre) => libelleProfilIA(autre) === listeDuMilieu.value);
    return profil ? copieDuProfilDuMilieu({ ...profil, nom: libelleProfilIA(profil) }) : milieuAffiche;
  }

  // Ce que montrent les champs : { style, version, livre, elagage, poids } — un poids
  // decoche vaut 0, un ajout decoche n'y est plus.
  function lireValeurs() {
    const choix = elements.version.value;
    const elague = choix.endsWith(SUFFIXE_ELAGAGE_IA);
    return {
      style: elements.style.value,
      version: Number.parseInt(choix, 10),
      livre: elements.livre.checked,
      elagage: !elague ? 0 : ligneDe('elagage').hidden ? ELAGAGE_PAR_DEFAUT_IA : Math.max(1, Math.round(Number(elements.elagage.value)) || ELAGAGE_PAR_DEFAUT_IA),
      poids: Object.fromEntries(
        CLES_POIDS.filter((cle) => !ligneDe(cle).hidden && (cases[cle].checked || !estUnAjout(cle))).map((cle) => [cle, cases[cle].checked ? Number(champPoids(cle).value) : 0])
      ),
      ...(milieuLu() ? { milieu: milieuLu() } : {}),
    };
  }

  for (const cle of CLES_POIDS) {
    cases[cle].addEventListener('change', () => {
      if (cases[cle].checked) champPoids(cle).value = valeurProposee(cle);
      else valeursAvantDecoche[cle] = Number(champPoids(cle).value);
      retoucher();
    });
  }
  for (const champ of [...CLES_POIDS.map(champPoids), elements.elagage]) {
    champ.addEventListener('change', retoucher);
    // Les boutons - et + (saab, 2026-09-30), comme ceux des tailles d'Affichage.
    for (const bouton of champ.parentElement.querySelectorAll('[data-pas]')) {
      // Un appui prolonge enchaine les pas (interface/appui-prolonge.js).
      brancherAppuiProlonge(bouton, () => {
        if (Number(bouton.dataset.pas) > 0) champ.stepUp();
        else champ.stepDown();
        champ.dispatchEvent(new Event('change'));
      });
    }
  }

  return { ligneDe, afficherValeurs, lireValeurs };
}
