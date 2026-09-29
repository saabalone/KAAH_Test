// Les profils IA (phase 32, saab : « ajouter dans Reglages les parametres de
// l'IA, avec ajout et choix de fichier, comme profil, IA/date, qu'on pourra
// utiliser pour J1 ou J2 ») : un nom, la version de l'IA, un style de base (qui
// donne le nom de la machine, KAI2_Nor_5s) et les poids de l'evaluation. Trois
// profils integres, un par style, jamais modifies ; les autres sont ceux de
// l'utilisateur (interface/profils-ia.js les range sur l'appareil). Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : STYLES_IA, CLES_POIDS_IA
// (ia-evaluation.js), VERSION_IA, NOMS_STYLES_IA, lireMachine (ia.js) viennent
// de fichiers charges avant celui-ci.

const PROFILS_IA_INTEGRES = Object.keys(STYLES_IA).map((style) => ({
  nom: NOMS_STYLES_IA[style],
  version: VERSION_IA,
  style,
  poids: STYLES_IA[style],
}));

// Un profil relu (stockage, fichier importe), ou null s'il n'a pas de nom. Les
// memes valeurs sures qu'une machine (lireMachine) : style inconnu -> normal,
// poids faux -> celui du style.
function lireProfilIA(brut) {
  if (!brut || typeof brut !== 'object' || typeof brut.nom !== 'string' || brut.nom.trim() === '') return null;
  const { version, style, poids } = lireMachine(brut);
  return { nom: brut.nom.trim(), version, style, poids };
}

// Le reglage d'une machine qui joue avec `profil` (voir moteur/ia.js,
// lireMachine) : tout le profil, pour que le fichier de la partie le garde.
function machineDuProfil(profil, { niveau, reflexionMax }) {
  return lireMachine({ version: profil.version, niveau, style: profil.style, profil: profil.nom, poids: profil.poids, reflexionMax });
}
