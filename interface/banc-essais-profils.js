// La liste des PROFILS A ESSAYER du banc d'essais, et l'origine de ce qu'on fait varier
// (extrait d'interface/banc-essais-choix.js, regle des 200 lignes) : une ligne par profil
// du style choisi — sa coche, son nom, son niveau et sa reflexion (saab, 2026-10-08 :
// « choisir des niveaux et tps de reflexion differents pour chaque fichier »).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : listerProfilsIA, libelleProfilIA
// (interface/profils-ia.js), CLE_CASES_BANC (moteur/banc-essais.js), nomDeLaMachine
// (moteur/ia.js), numeroDesAjoutsDe (interface/profils-ia.js), TEMPS_SANS_LIMITE_BANC
// (interface/banc-essais-champs.js) viennent de fichiers
// charges avant celui-ci.

// `coches` : les noms coches (Set) ; `recherches` : nom -> { niveau, temps } tapes ;
// `reglagesDuProfil(tapes, retenir, nom)` : ses deux champs ; `surCoche()`.
function dessinerLesProfilsDuBanc(elements, coches, recherches, reglagesDuProfil, surCoche) {
  const style = elements.style.value;
  elements.profils.replaceChildren(
    ...listerProfilsIADansLOrdre() // l'ordre de Profils IA compares
      .filter((profil) => !style || profil.style === style)
      .map((profil) => {
        const ligne = document.createElement('div');
        ligne.className = 'ligne-reglage banc-ligne-profil';
        const etiquette = document.createElement('label');
        const coche = document.createElement('input');
        coche.type = 'checkbox';
        coche.checked = coches.has(profil.nom);
        coche.addEventListener('change', () => {
          if (coche.checked) coches.add(profil.nom);
          else coches.delete(profil.nom);
          surCoche();
        });
        etiquette.append(coche, ` ${libelleProfilIA(profil)}`);
        etiquette.title = infobulleDuProfilIA(profil);
        poserCouleurIA(etiquette, couleurDuProfilIA(profil)); // ses couleurs, comme dans Reglages
        marquerSiProfilParDefaut(etiquette, profil.nom);
        const tapes = recherches.get(profil.nom) ?? {};
        const retenir = (cle) => (valeur) => recherches.set(profil.nom, { ...recherches.get(profil.nom), [cle]: valeur });
        ligne.append(etiquette, ...reglagesDuProfil(tapes, retenir, libelleProfilIA(profil)));
        return ligne;
      })
  );
}

// La valeur d'origine du parametre choisi dans « Faire varier », pour chaque profil coche
// (saab, 2026-10-08 : « mets aussi la valeur d'origine qd on choisit un parametre d'un
// fichier »). `profils` : les profils du banc coches.
function afficherLesOriginesDuBanc(elements, profils) {
  const valeurDe = (profil, cle) => {
    if (cle === CLE_CASES_BANC) return '×1';
    const valeur = cle in profil && cle !== 'poids' ? profil[cle] : profil.poids[cle];
    return valeur === undefined ? 'sans' : String(valeur).replace('.', ',');
  };
  for (const [select, origine] of [[elements.cle1, elements.origine1], [elements.cle2, elements.origine2]]) {
    origine.textContent = select.value && profils.length > 0 ? `Origine : ${profils.map((profil) => `${profil.nom} ${valeurDe(profil, select.value)}`).join(' · ')}` : '';
  }
}

// Le nom d'un profil du banc dans un nom de fichier : celui de sa machine dans le titre
// d'une partie (KAI++8_Def_160s_v4El10P2_v3, moteur/ia.js), « inf » pour une reflexion
// sans limite, et ce qu'on y fait varier, abrege (« Normal v5El · ScGain 80 · E5 +30 » :
// _ScGain80E5+30, moteur/noms-ia.js) — les signes restent. Ses ajouts par leur Pn : ceux
// de la variante (une variation peut en enlever un).
function nomDeMachineDuBanc(profil) {
  const machine = nomDeLaMachine({ moteur: 'kai++', niveau: profil.niveau, style: profil.style, reflexionMax: profil.temps, version: profil.version, elagage: profil.elagage, poids: profil.poids, numeroDesAjouts: numeroDesAjoutsDe(profil.poids), numeroDePoids: profil.numeroDePoids });
  const variation = profil.nom.includes(' · ') ? `_${profil.nom.slice(profil.nom.indexOf(' · ') + 3).replace(/[^\p{L}\p{N},+-]+/gu, '')}` : '';
  const sansLivre = profil.nom.includes(' sans livre') ? '_sansLivre' : '';
  return `${machine}${sansLivre}${variation}`;
}
