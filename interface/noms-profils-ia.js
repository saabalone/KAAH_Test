// Les NOMS des profils IA de cet appareil (saab, 2026-10-16 ; moteur/noms-ia.js) : le
// registre des Pn (jeu d'ajouts -> numero), le numero de poids dans sa famille, le nom
// montre dans les listes et son infobulle, le profil pret a jouer en machine. Extrait
// d'interface/profils-ia.js (regle des 200 lignes).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : registreAvecLesAjouts,
// nomAfficheDuProfilIA, familleDuProfilIA, numeroDePoidsSuivant (moteur/noms-ia.js),
// codeDesAjouts (moteur/ia-ajouts.js), suffixeDeVersionIA (moteur/ia.js), profilsIADansLOrdre
// (moteur/profils-ia.js), listerProfilsIA, nomDuProfilIAParDefaut (interface/profils-ia.js) viennent de
// fichiers charges avant celui-ci ; lireNomAuteurIA (interface/fichiers-profils-ia.js) ne
// sert qu'une fois la page chargee.

// Le registre des Pn (moteur/noms-ia.js) : jeu d'ajouts -> numero, sur cet appareil
// (« Exporter tout » l'emporte, comme toute donnee « kaah- »).
const CLE_NUMEROS_DES_AJOUTS = 'kaah-numeros-des-ajouts';

function lireRegistreDesAjouts() {
  try {
    const lu = JSON.parse(window.localStorage.getItem(CLE_NUMEROS_DES_AJOUTS) ?? '{}');
    return lu && typeof lu === 'object' && !Array.isArray(lu) ? lu : {};
  } catch {
    return {};
  }
}

// Le Pn des ajouts de `poids` (null sans ajout) : le sien, ou le suivant, retenu.
function numeroDesAjoutsDe(poids) {
  const avant = lireRegistreDesAjouts();
  const { registre, numero } = registreAvecLesAjouts(avant, codeDesAjouts(poids));
  if (registre !== avant) {
    try {
      window.localStorage.setItem(CLE_NUMEROS_DES_AJOUTS, JSON.stringify(registre));
    } catch {
      // Sans stockage : le numero vaut pour cette fois.
    }
  }
  return numero;
}

const familleDe = (profil) => familleDuProfilIA(profil, numeroDesAjoutsDe(profil.poids));

// Le numero du prochain jeu de poids de la famille de `profil`, d'apres `autres` (un
// profil de base compte pour le premier).
function numeroDePoidsDansSaFamille(profil, autres) {
  const famille = familleDe(profil);
  const pris = autres.filter((autre) => familleDe(autre) === famille).map((autre) => autre.numeroDePoids ?? 1);
  return numeroDePoidsSuivant(pris);
}

// Le nom d'avant les noms de 2026-10-16 : « Normal v5el_v2 (P7) » (P : son indice).
function libelleAncienProfilIA(profil) {
  if (!profil.indice || profil.nom.endsWith(`_(P${profil.indice})`)) return profil.nom;
  return `${profil.nom} (P${profil.indice})`;
}

// Le nom d'un profil dans les listes (moteur/noms-ia.js) : « Normal v5ElP2_v3 » ; celui
// d'un autre auteur, son nom devant (saab_Normal v5ElP2).
function libelleProfilIA(profil) {
  const nom = `${nomAfficheDuProfilIA(profil, numeroDesAjoutsDe(profil.poids), profil.numeroDePoids ?? 1)}${profil.issueDuBanc ?? ''}`;
  return profil.auteur && profil.auteur !== lireNomAuteurIA() ? `${profil.auteur}_${nom}` : nom;
}

// Son infobulle, partout ou il se montre (saab : « montrer tous les suffixes cachés par
// Pn ») : ses ajouts en clair, son ancien nom, puis tous ses reglages en une colonne
// (saab, 2026-10-18 ; moteur/historique-profil-ia.js, lignesDesReglagesIA).
function infobulleDuProfilIA(profil) {
  const ancien = `${profil.ancienNom && profil.ancienNom !== libelleProfilIA(profil) ? ` — ancien nom : ${profil.ancienNom}` : ''}${profil.nom === nomDuProfilIAParDefaut() ? ' — IA par défaut' : ''}`;
  return `${libelleProfilIA(profil)} = ${profil.style === 'agressif' ? 'Agr' : profil.style === 'defensif' ? 'Def' : 'Nor'} ${suffixeDeVersionIA(profil)}${ancien}\n\n${lignesDesReglagesIA(profil).join('\n')}`;
}

// L'IA par defaut en orange, partout ou un profil se montre (saab, 2026-10-18 : « mettre en
// orange l'IA par défaut, partout » ; styles.css, .profil-ia-par-defaut) : `nom`, le nom
// du profil de l'element (une valeur de liste « nom#v3 » : son profil).
function marquerSiProfilParDefaut(element, nom) {
  element.classList.toggle('profil-ia-par-defaut', String(nom).split('#v')[0] === nomDuProfilIAParDefaut());
}

// Une liste de profils : fermee, elle est orange quand l'IA par defaut y est choisie.
function suivreLeProfilParDefaut(select) {
  marquerSiProfilParDefaut(select, select.value);
  if (select.dataset.suitLeProfilParDefaut) return;
  select.dataset.suitLeProfilParDefaut = 'oui';
  select.addEventListener('change', () => marquerSiProfilParDefaut(select, select.value));
}

// Le profil a jouer en machine : avec son Pn (et, pour une ancienne version, son numero
// dans l'historique : _h).
const profilPourUneMachine = (profil, versionHistorique) => ({ ...profil, numeroDesAjouts: numeroDesAjoutsDe(profil.poids), ...(versionHistorique ? { versionHistorique } : {}) });

// Les profils dans l'ordre de Profils IA compares (saab, 2026-10-17 : « mettre partout le
// même ordre des profils IA que celui de Profils IA comparés ») : Agr, Nor, Def, la
// version, l'elagage, puis leurs Pn et _v (moteur/profils-ia.js, profilsIADansLOrdre) —
// chacun avec son Pn.
const listerProfilsIADansLOrdre = () => profilsIADansLOrdre(listerProfilsIA().map((profil) => ({ ...profil, numeroDesAjouts: numeroDesAjoutsDe(profil.poids) })));
