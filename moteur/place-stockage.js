// La PLACE que KAAH prend dans le stockage du navigateur, zone par zone (saab, 2026-10-24 : une partie
// finie contre AP6 « n'est pas notée » — le stockage, environ 5 Mo pour tout le site, etait plein, et
// rien ne disait ce qui le remplissait). Les parties s'y ecrivent toutes ensemble a chaque coup : une
// seule zone trop grosse, et plus rien ne s'enregistre. Pur : les tailles viennent de
// interface/sauvegarde.js (taillesDuStockage), en caracteres (un caractere, environ un octet ici).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// Les zones qui peuvent grossir, et ce qu'on y fait pour liberer de la place.
const ZONES_DU_STOCKAGE = [
  { cle: 'kaah-mes-parties', nom: 'Mes parties' },
  { cle: 'kaah-corbeille', nom: 'Corbeille' },
  { cle: 'kaah-recherches-ia', nom: 'Recherches gardées' },
  { cle: 'kaah-puzzles-sol-starts', nom: 'Solutions des puzzles' },
];
const NOM_DU_RESTE = 'Le reste';
const CARACTERES_PAR_MO = 1e6;
// Une zone plus petite ne se cite pas dans le texte (elle compte dans le total).
const PLACE_MINIMALE_CITEE = 0.1 * CARACTERES_PAR_MO;

const enMo = (caracteres) => (caracteres / CARACTERES_PAR_MO).toFixed(1).replace('.', ',');

// `tailles` : { cle: caracteres }. Renvoie { total, zones: [{ nom, taille }] } — les zones connues
// presentes, puis le reste, de la plus grosse a la plus petite.
function placeParZone(tailles) {
  const connues = ZONES_DU_STOCKAGE.filter((zone) => tailles[zone.cle] > 0).map((zone) => ({ nom: zone.nom, taille: tailles[zone.cle] }));
  const reste = Object.entries(tailles)
    .filter(([cle]) => !ZONES_DU_STOCKAGE.some((zone) => zone.cle === cle))
    .reduce((somme, [, taille]) => somme + taille, 0);
  const zones = [...connues, ...(reste > 0 ? [{ nom: NOM_DU_RESTE, taille: reste }] : [])].sort((a, b) => b.taille - a.taille);
  return { total: Object.values(tailles).reduce((somme, taille) => somme + taille, 0), zones };
}

// « 4,8 Mo : Mes parties 3,1 · Corbeille 1,2 · Recherches gardées 0,5 ».
function texteDeLaPlace({ total, zones }) {
  const citees = zones.filter((zone) => zone.taille >= PLACE_MINIMALE_CITEE).map((zone) => `${zone.nom} ${enMo(zone.taille)}`);
  return citees.length ? `${enMo(total)} Mo : ${citees.join(' · ')}` : `${enMo(total)} Mo`;
}
