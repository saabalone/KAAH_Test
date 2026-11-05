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
// SUFFIXE_ELAGAGE_NOM_IA, LETTRE_MODIFICATION_DES_AJOUTS, FORME_JEU_D_AJOUTS_MODIFIE, estUnJeuDAjoutsModifie
// (moteur/ia.js), OPTIONS_IA (moteur/ia-ajouts.js) viennent de
// fichiers charges avant celui-ci.

// Les Pn FIXES des jeux d'ajouts des profils integres (saab, 2026-10-22 : « Dans Travail c'est
// Normal v5ElP5, dans _Test c'est Normal v5ElP1 » ; « oui, sinon impossible de comparer ») : les
// memes sur tous les appareils — ceux de l'appareil de saab (P4, P5 de ses essais), dans l'ordre
// ou ils sont apparus. Un nouveau jeu d'ajouts d'un profil integre prend ici le suivant
// (tests/profils-ia.test.js le verifie) : la suite de KAAH reste progressive (voir PnMm plus bas).
const NUMEROS_FIXES_DES_AJOUTS = Object.freeze({
  SvEcEaEp: 1,
  SvEcEaEpEf: 2,
  SvEcEaEpEfFn: 3,
  SvEcEaEpEfFnGfPfPpaPpmPgaPgm: 4,
  SvEcEaEpEfFnGfPfPpaPpmPgaPgmBpBmpBpb: 5,
  // Le P5M13 de saab, adopte (2026-11-05 : « passer la Nor en défaut ») : P5 sans l'etendue, avec At, Hp, He et Ph.
  SvEpEfFnGfPfPpaPpmPgaPgmBpBmpBpbAtHpHePh: 6,
});

// Un jeu d'ajouts A SOI (saab, 2026-10-31 : « On pourrait faire comme v et k pour P, càd si je modifie Pn il devient
// par ex. PnMm pour ne garder que la suite P vraiment progressive Pn+1 dans KAAH, donc pour l'utilisateur on aura P5M1
// si je modifie P5, etc..., puis si adopte ce P5M1 il deviendra P6 ») : « 5M1 » (moteur/ia.js,
// FORME_JEU_D_AJOUTS_MODIFIE), le jeu de KAAH le plus proche, puis sa modification sur cet appareil. Adopte par KAAH
// (un numero fixe), il prend le sien : le fixe passe avant.

// Les suffixes d'un code (« SvEcBpe ») : chacun une majuscule puis ses minuscules (moteur/ia-ajouts.js, OPTIONS_IA).
const suffixesDuCode = (code) => code.match(/[A-Z][a-z]*/g) ?? [];

// Le jeu de KAAH le plus proche de `code` : le moins de suffixes en plus ou en moins ; a egalite, le plus recent.
function jeuDeKAAHLePlusProche(code) {
  const siens = suffixesDuCode(code);
  const ecart = (fixe) => {
    const autres = suffixesDuCode(fixe);
    return siens.filter((suffixe) => !autres.includes(suffixe)).length + autres.filter((suffixe) => !siens.includes(suffixe)).length;
  };
  return Object.entries(NUMEROS_FIXES_DES_AJOUTS).reduce((meilleur, [fixe, numero]) => (ecart(fixe) <= meilleur.ecart ? { numero, ecart: ecart(fixe) } : meilleur), { numero: null, ecart: Infinity }).numero;
}

// La prochaine modification du jeu de KAAH `base` dans `registre` : « 5M3 ».
function modificationSuivante(registre, base) {
  const prises = Object.values(registre)
    .map((numero) => (estUnJeuDAjoutsModifie(numero) ? numero.match(FORME_JEU_D_AJOUTS_MODIFIE) : null))
    .filter((morceaux) => morceaux && Number(morceaux[1]) === base)
    .map((morceaux) => Number(morceaux[2]));
  return `${base}${LETTRE_MODIFICATION_DES_AJOUTS}${Math.max(0, ...prises) + 1}`;
}

// Un registre d'avant les PnMm (des numeros apres les fixes : P6, P7...) : chacun devient la modification de son jeu
// de KAAH le plus proche, dans l'ordre de ses anciens numeros.
function registreAJour(registre) {
  const anciens = Object.entries(registre).filter(([, numero]) => !estUnJeuDAjoutsModifie(numero)).sort(([, a], [, b]) => a - b);
  if (anciens.length === 0) return registre;
  return anciens.reduce((suite, [code]) => ({ ...suite, [code]: modificationSuivante(suite, jeuDeKAAHLePlusProche(code)) }), Object.fromEntries(Object.entries(registre).filter(([, numero]) => estUnJeuDAjoutsModifie(numero))));
}

// Le registre avec le jeu d'ajouts `code`, et son numero : le fixe s'il en a un, sinon le sien (PnMm) s'il en a deja
// un, la modification suivante de son jeu de KAAH le plus proche sinon ; sans ajout (''), pas de numero.
function registreAvecLesAjouts(registre, code) {
  if (code === '') return { registre, numero: null };
  if (NUMEROS_FIXES_DES_AJOUTS[code]) return { registre, numero: NUMEROS_FIXES_DES_AJOUTS[code] };
  const aJour = registreAJour(registre);
  if (aJour[code]) return { registre: aJour, numero: aJour[code] };
  const numero = modificationSuivante(aJour, jeuDeKAAHLePlusProche(code));
  return { registre: { ...aJour, [code]: numero }, numero };
}

// Les jeux d'ajouts a soi du `registre`, en clair (saab, 2026-11-01 : « je ne vois pas l'explication de Mn de PnMn pour
// mes versions de poids ») : ce que chacun retire puis ajoute a son jeu de KAAH, « P5M1 = P5 − Bp + Pr », dans l'ordre
// des listes ; un jeu que KAAH a adopte (un numero fixe) n'en est plus un.
function jeuxDAjoutsASoi(registre) {
  const codeDuJeuDeKAAH = (base) => Object.keys(NUMEROS_FIXES_DES_AJOUTS).find((code) => NUMEROS_FIXES_DES_AJOUTS[code] === base);
  return Object.entries(registreAJour(registre))
    .filter(([code, numero]) => estUnJeuDAjoutsModifie(numero) && !NUMEROS_FIXES_DES_AJOUTS[code])
    .sort(([, a], [, b]) => rangDuJeuDAjouts(a) - rangDuJeuDAjouts(b))
    .map(([code, numero]) => {
      const base = Number(numero.match(FORME_JEU_D_AJOUTS_MODIFIE)[1]);
      const siens = suffixesDuCode(code);
      const ceuxDeKAAH = suffixesDuCode(codeDuJeuDeKAAH(base));
      const enMoins = ceuxDeKAAH.filter((suffixe) => !siens.includes(suffixe)).map((suffixe) => ` − ${suffixe}`);
      const enPlus = siens.filter((suffixe) => !ceuxDeKAAH.includes(suffixe)).map((suffixe) => ` + ${suffixe}`);
      return { numero, texte: `P${numero} = P${base}${enMoins.join('')}${enPlus.join('')}` };
    });
}

// Le rang d'un jeu d'ajouts dans les listes (moteur/profils-ia.js, profilsIADansLOrdre) : P5, ses modifications, P6.
const MODIFICATIONS_PAR_JEU_D_AJOUTS = 1000;
function rangDuJeuDAjouts(numero) {
  if (!estUnJeuDAjoutsModifie(numero)) return numero ?? 0;
  const [, base, modification] = numero.match(FORME_JEU_D_AJOUTS_MODIFIE);
  return Number(base) + Number(modification) / MODIFICATIONS_PAR_JEU_D_AJOUTS;
}

// Le nom d'un profil : « Normal v5ElP2_k3 » (un profil de KAAH), « Normal v5ElP2_v3 » (`personnel` : un profil
// perso, moteur/ia.js, lettreDuJeuDePoids) ; la version 1 sans elagage ni ajout, le style seul (comme le profil
// integre « Normal »). Le livre n'y est pas : c'est la machine qui le choisit (moteur/ia.js, nomDeLaMachine).
function nomAfficheDuProfilIA({ style, version, elagage, poids = {} }, numeroDesAjouts, numeroDePoids, personnel = false) {
  const nu = version === VERSION_IA && !elagage && !numeroDesAjouts;
  const base = nu ? NOMS_STYLES_IA[style] : `${NOMS_STYLES_IA[style]} v${version}${elagage ? SUFFIXE_ELAGAGE_NOM_IA : ''}${numeroDesAjouts ? `P${numeroDesAjouts}${seuilDesPhasesDansLeNom(poids)}` : ''}`;
  return numeroDePoids > 1 ? `${base}_${lettreDuJeuDePoids(personnel)}${numeroDePoids}` : base;
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
