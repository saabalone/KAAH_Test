// Les profils IA (phase 32, saab : « ajouter dans Reglages les parametres de
// l'IA, avec ajout et choix de fichier, comme profil, IA/date, qu'on pourra
// utiliser pour J1 ou J2 ») : un nom, la version de l'IA, un style de base (qui
// donne le nom de la machine, KAI2_Nor_5s) et les poids de l'evaluation. Trois
// profils integres, un par style, jamais modifies ; les autres sont ceux de
// l'utilisateur (interface/profils-ia.js les range sur l'appareil). Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : STYLES_IA, CLES_POIDS_IA
// (ia-evaluation.js), VERSIONS_IA, POIDS_DES_VERSIONS_IA, nomDuProfilIntegre,
// NOMS_STYLES_IA, lireMachine (ia.js), lireHistoriqueIA, valeursReglagesIA
// (historique-profil-ia.js) viennent de fichiers charges avant celui-ci.

// Trois par version : Agressif, Normal, Défensif (version 1), puis « … v2 ».
const PROFILS_IA_INTEGRES = VERSIONS_IA.flatMap((version) =>
  Object.keys(STYLES_IA).map((style) => ({
    nom: nomDuProfilIntegre(style, version),
    version,
    style,
    poids: POIDS_DES_VERSIONS_IA[version].styles[style],
  }))
);

// Un profil relu (stockage, fichier importe), ou null s'il n'a pas de nom. Les
// memes valeurs sures qu'une machine (lireMachine) : style inconnu -> normal,
// poids faux -> celui du style. Son historique (moteur/historique-profil-ia.js)
// le suit s'il est intact : le profil prend alors les valeurs de sa version
// courante.
function lireProfilIA(brut) {
  if (!brut || typeof brut !== 'object' || typeof brut.nom !== 'string' || brut.nom.trim() === '') return null;
  const nom = brut.nom.trim();
  // L'indice d'un profil de l'utilisateur (interface/profils-ia.js), repris
  // dans le nom de ses machines (moteur/ia.js, nomDeLaMachine).
  const indice = Number.isInteger(brut.indice) && brut.indice > 0 ? { indice: brut.indice } : {};
  const lu = lireHistoriqueIA(brut);
  if (!lu) return { nom, ...valeursReglagesIA(brut), ...indice };
  const courante = lu.historique.find((version) => version.numero === lu.courante);
  return { nom, ...valeursReglagesIA(courante), historique: lu.historique, courante: lu.courante, ...indice };
}

// Le reglage d'une machine qui joue avec `profil` (voir moteur/ia.js,
// lireMachine) : tout le profil, pour que le fichier de la partie le garde.
// `moteur` : 'kai' ou 'kai++' (moteur/ia.js).
// `livre` : jouer l'ouverture dans la base de coups (moteur/ia.js).
function machineDuProfil(profil, { niveau, reflexionMax, moteur = 'kai', livre = true }) {
  return lireMachine({ moteur, version: profil.version, niveau, style: profil.style, profil: profil.nom, indiceProfil: profil.indice, poids: profil.poids, reflexionMax, livre });
}
