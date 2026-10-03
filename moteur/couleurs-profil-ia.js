// Les couleurs d'un profil IA (saab, 2026-09-30) : orange, retouche pas encore
// validee ; vert, change a la derniere validation ; jaune, change a une
// validation plus ancienne — « le vert indique toujours les dernieres modif,
// et les jaunes les plus anciennes ». Chaque reglage a la sienne, et elles
// remontent (saab, 2026-10-02 : « on remonte les couleurs de la valeur jusqu'a
// son fichier ») : le profil, et la machine qui joue avec lui, prennent la
// plus forte. Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_REGLAGES_IA,
// valeurReglageIA, memesReglagesIA, cheminDeVersionIA, choisirVersionIA
// (historique-profil-ia.js), PROFILS_IA_INTEGRES (profils-ia.js),
// nomDuProfilIntegre (ia.js) viennent de fichiers charges avant celui-ci.

// De la plus forte a la plus faible.
const COULEURS_IA_DE_LA_PLUS_FORTE = ['modifie', 'dernier', 'ancien'];

function couleurLaPlusForte(couleurs) {
  const presentes = new Set(couleurs);
  return COULEURS_IA_DE_LA_PLUS_FORTE.find((couleur) => presentes.has(couleur)) ?? null;
}

// La couleur de chaque reglage : 'modifie', 'dernier', 'ancien' ou null.
// `brouillon` : les valeurs des champs, null s'il n'y a aucune retouche en cours.
function couleursDesReglagesIA(profil, brouillon) {
  const chemin = cheminDeVersionIA(profil);
  const courante = chemin.at(-1);
  const changeA = (cle, rang) => valeurReglageIA(chemin[rang], cle) !== valeurReglageIA(chemin[rang - 1], cle);
  return Object.fromEntries(
    CLES_REGLAGES_IA.map((cle) => {
      if (brouillon && valeurReglageIA(brouillon, cle) !== valeurReglageIA(courante, cle)) return [cle, 'modifie'];
      if (chemin.length > 1 && changeA(cle, chemin.length - 1)) return [cle, 'dernier'];
      for (let rang = 1; rang < chemin.length - 1; rang++) if (changeA(cle, rang)) return [cle, 'ancien'];
      return [cle, null];
    })
  );
}

function couleurDuProfilIA(profil, brouillon = null) {
  return couleurLaPlusForte(Object.values(couleursDesReglagesIA(profil, brouillon)));
}

// Les couleurs des reglages d'une machine (moteur/ia.js, lireMachine), qui
// garde les poids de son profil au debut de la partie : celles de la version
// du profil qu'elle joue ; ses poids ne sont ceux d'aucune version validee (un
// essai, un profil retouche ou supprime depuis) : orange la ou ils different
// du profil integre de son style. `profil` : le sien, ou null s'il n'existe plus.
function couleursDeLaMachineIA(machine, profil) {
  if (profil && memesReglagesIA(profil, machine)) return couleursDesReglagesIA(profil, null);
  const version = profil?.historique?.find((ancienne) => memesReglagesIA(ancienne, machine));
  if (version) return couleursDesReglagesIA(choisirVersionIA(profil, version.numero), null);
  const integre = PROFILS_IA_INTEGRES.find((existant) => existant.nom === nomDuProfilIntegre(machine.style, machine.version, machine.elagage));
  return couleursDesReglagesIA(integre, machine);
}

function couleurDeLaMachineIA(machine, profil) {
  return couleurLaPlusForte(Object.values(couleursDeLaMachineIA(machine, profil)));
}

// Le tableau comparatif des profils IA (saab, 2026-10-03 : « en colonnes la
// date (si elle existe), le profil IA, sa description, et tous les reglages
// avec leur code couleur ») : une ligne par profil — la date de sa version
// courante ('' pour un profil integre ou d'avant l'historique), et chaque
// reglage en texte (texteReglageIA, historique-profil-ia.js) avec sa couleur.
function lignesComparaisonIA(profils) {
  return profils.map((profil) => {
    const courante = profil.historique?.find((version) => version.numero === profil.courante);
    const couleurs = couleursDesReglagesIA(profil, null);
    return {
      nom: profil.nom,
      indice: profil.indice ?? null,
      date: courante?.date ?? '',
      description: profil.description ?? '',
      reglages: Object.fromEntries(CLES_REGLAGES_IA.map((cle) => [cle, { texte: texteReglageIA(cle, valeurReglageIA(profil, cle)), couleur: couleurs[cle] }])),
    };
  });
}
