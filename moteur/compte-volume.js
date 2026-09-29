// Le nombre d'entrees d'une boite et leur volume, dans son titre (phase 31,
// saab, 2026-09-30) : « par ex : (11, 10k) ou pour 1000k mettre 1M » — Mes
// parties, Variantes, Puzzles, Corbeille. Pur : l'interface donne les
// entrees, ce fichier ne sait rien du stockage.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const OCTETS_PAR_K = 1000;
const K_PAR_M = 1000;
const DIXIEMES = 10;

// Des milliers d'octets arrondis (jamais « 0k » pour quelque chose), puis des
// millions a une decimale — virgule francaise, sans « ,0 ».
function formaterVolume(octets) {
  const k = octets === 0 ? 0 : Math.max(1, Math.round(octets / OCTETS_PAR_K));
  if (k < K_PAR_M) return `${k}k`;
  const m = Math.round((octets / (OCTETS_PAR_K * K_PAR_M)) * DIXIEMES) / DIXIEMES;
  return `${String(m).replace('.', ',')}M`;
}

function libelleNombreEtVolume(nombre, octets) {
  return `(${nombre}, ${formaterVolume(octets)})`;
}

// Le volume d'une donnee telle qu'elle est rangee : son texte JSON, en UTF-8.
function volumeEnOctets(donnee) {
  return new TextEncoder().encode(JSON.stringify(donnee)).length;
}
