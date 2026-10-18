// Les NOMS des profils IA et de leurs machines (saab, 2026-10-16 : « (Pn) remplace tous
// les suffixes de réglages d'une nouvelle version, sauf el et v, pour éviter des titres à
// rallonge ... on attribue le Pn juste aux changements de suffixe (et évitera aussi des Pn
// trop élevés qui ne représentent rien) et vm aux poids ... noter v5elPn_vm, ce serait plus
// court et dans l'ordre alphanumérique ... Pn sera toujours attribué aux mêmes suffixes :
// si v5elecef = v5elP2 alors v4elP2 = v4elecef »).
//   - Pn : le numero d'un JEU D'AJOUTS (moteur/ia-ajouts.js, codeDesAjouts : « EcEf »),
//     le meme pour toutes les versions et tous les styles ; le registre (code -> numero)
//     est garde sur l'appareil (interface/profils-ia.js) ;
//   - _vm : le numero du JEU DE POIDS dans sa FAMILLE (style, version, avec ou sans
//     elagage, Pn) — le premier n'en a pas, chaque nouveau prend le suivant.
// Ex. Normal v5El (la base), Normal v5ElP1 (un ajout), Normal v5ElP1_v2 (ses poids
// retouches). Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : NOMS_STYLES_IA, VERSION_IA,
// SUFFIXE_ELAGAGE_NOM_IA (moteur/ia.js), OPTIONS_IA (moteur/ia-ajouts.js) viennent de
// fichiers charges avant celui-ci.

// Le registre avec le jeu d'ajouts `code`, et son numero : le sien s'il en a deja un, le
// suivant sinon ; sans ajout (''), pas de numero.
function registreAvecLesAjouts(registre, code) {
  if (code === '') return { registre, numero: null };
  if (registre[code]) return { registre, numero: registre[code] };
  const numero = Math.max(0, ...Object.values(registre)) + 1;
  return { registre: { ...registre, [code]: numero }, numero };
}

// Le nom d'un profil : « Normal v5ElP2_v3 » ; la version 1 sans elagage ni ajout, le
// style seul (comme le profil integre « Normal »).
function nomAfficheDuProfilIA({ style, version, elagage }, numeroDesAjouts, numeroDePoids) {
  const nu = version === VERSION_IA && !elagage && !numeroDesAjouts;
  const base = nu ? NOMS_STYLES_IA[style] : `${NOMS_STYLES_IA[style]} v${version}${elagage ? SUFFIXE_ELAGAGE_NOM_IA : ''}${numeroDesAjouts ? `P${numeroDesAjouts}` : ''}`;
  return numeroDePoids > 1 ? `${base}_v${numeroDePoids}` : base;
}

// La famille d'un profil : ce que son nom dit avant _vm (le nombre de l'elagage n'y est pas).
const familleDuProfilIA = ({ style, version, elagage }, numeroDesAjouts) => `${style}|${version}|${elagage ? SUFFIXE_ELAGAGE_NOM_IA : ''}|${numeroDesAjouts ?? ''}`;

// Le numero du prochain jeu de poids d'une famille, d'apres ceux qu'elle a deja.
const numeroDePoidsSuivant = (numerosPris) => Math.max(0, ...numerosPris) + 1;

// Les ABREVIATIONS des reglages dans le nom d'une variante du banc (saab, 2026-10-16 :
// « gainScore80perteScore80 doit être abrégé par ScGain80ScPerte80 » ; « E5+30 et A1-10,
// c'est plus lisible et plus court ») ; un ajout s'abrege par son suffixe (Sv, Ec...).
const ABREVIATIONS_DES_REGLAGES_IA = {
  gain: 'Gain',
  perte: 'Perte',
  gainScore: 'ScGain',
  perteScore: 'ScPerte',
  centre: 'Centre',
  cohesion: 'Coh',
  compacite: 'Comp',
  bordSoi: 'BordM',
  bordAdverse: 'BordA',
  sumito: 'Sum',
  sumito32: 'Sum32',
  sumito31: 'Sum31',
  sumito21: 'Sum21',
  menaceEjection: 'Men',
  fourchette: 'Fourch',
  piege: 'Piege',
  elagage: 'El',
  niveau: 'Niv',
  temps: 'Tps',
};
// Les cases : leur nom (E5... A1), et leur valeur toujours signee (elles valent des deux cotes de 0).
const PREFIXE_DES_CASES_IA = 'case';
const abreviationDuReglageIA = (cle) =>
  ABREVIATIONS_DES_REGLAGES_IA[cle] ?? OPTIONS_IA.find((option) => option.cle === cle)?.suffixe ?? (cle.startsWith(PREFIXE_DES_CASES_IA) ? cle.slice(PREFIXE_DES_CASES_IA.length) : cle);
const valeurAbregeeDuReglageIA = (cle, valeur) => `${cle.startsWith(PREFIXE_DES_CASES_IA) && valeur >= 0 ? '+' : ''}${String(valeur).replace('.', ',')}`;
