// Quelle base de coups (Next Move) sert aux Conseils, et quels fichiers
// peuvent en devenir une (saab, 2026-09-27) : comme le selecteur "BDD moves"
// de KAAWA (kaa_settings_popup_ClO_Co.py, F6), qui liste tous les
// KAA_NEXT_MOVE_REF_*.csv et retient le choix dans le reglage
// `nextmove.bdd_file` (moteur/reglages.js).
//
// KAAH en embarque UNE : depuis le 2026-10-21 (saab : « faire …_PS_AO_MIGS_ULA_… qui regroupe
// les 4 et le mettre par défaut pour avoir plus de conseils »), la fusion Multi de la base de
// KAAWA (PS) et des parties d'ULA, d'abal.online (AO) et de Migs++ — les coups vus dans au moins
// 2 parties et le 1er coup unique de chaque camp de chaque partie (generer-bases-coups.js) ; avant,
// la _Fus de KAAWA seule, aujourd'hui KAA_NEXT_MOVE_REF_PS_Best_Stat_Fus.csv. Les autres
// s'importent (interface/bases-coups.js). Pur : ni DOM, ni stockage.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ce fichier ne depend
// d'aucun autre.

const NOM_BASE_INTEGREE = 'KAA_NEXT_MOVE_REF_PS_AO_MIGS_ULA_Multi_Best_Stat_Fus.csv';
const ENTETE_BASE_NEXT_MOVE = 'full_posRef,next_move_Ref,nb_W,nb_L,nb_D';
const NOMBRE_DE_COLONNES_BASE = 5;
const MARQUE_BOM = '\uFEFF';
// Le motif de KAAWA (glob "KAA_NEXT_MOVE_REF_*.csv") : un fichier nomme
// autrement serait invisible pour lui, meme copie dans son dossier.
const MOTIF_NOM_BASE = /^KAA_NEXT_MOVE_REF_.+\.csv$/;
const MOTIF_COUP_BASE = /^[a-i][1-9][a-i][1-9]$/;
const MOTIF_NOMBRE_DE_PARTIES = /^\d+$/;

// null si `texte` (le contenu du fichier `nom`) peut servir de base, sinon la
// raison du refus, a montrer telle quelle. Verifie chaque ligne : une base
// abimee serait sinon acceptee puis muette, sans que personne sache pourquoi.
function verifierBaseNextMove(nom, texte) {
  if (!MOTIF_NOM_BASE.test(nom)) {
    return 'Nom refusé : une base de coups doit s\'appeler KAA_NEXT_MOVE_REF_(...).csv, comme dans KAAWA.';
  }
  if (nom === NOM_BASE_INTEGREE) {
    return `${NOM_BASE_INTEGREE} est la base intégrée à KAAH : renommez le fichier avant de l'importer.`;
  }
  const [entete, ...lignes] = texte.replace(MARQUE_BOM, '').split(/\r?\n/);
  if (entete.trim() !== ENTETE_BASE_NEXT_MOVE) {
    return `Ce fichier n'est pas une base de coups (première ligne attendue : ${ENTETE_BASE_NEXT_MOVE}).`;
  }
  let coups = 0;
  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i].trim();
    if (!ligne) continue;
    const colonnes = ligne.split(',');
    const [, coup, ...parties] = colonnes;
    const lisible =
      colonnes.length === NOMBRE_DE_COLONNES_BASE &&
      MOTIF_COUP_BASE.test(coup) &&
      parties.every((nombre) => MOTIF_NOMBRE_DE_PARTIES.test(nombre));
    // +2 : la ligne 1 est l'entete, et les numeros commencent a 1.
    if (!lisible) return `Ligne ${i + 2} illisible : ${ligne}`;
    coups++;
  }
  if (coups === 0) return 'Ce fichier ne contient aucun coup.';
  return null;
}

// Le nom de la base a charger : celle demandee si elle a bien ete importee,
// la base integree sinon — reglage par defaut (null), ou fichier demande
// introuvable (supprime depuis, ou reglage venu de KAAWA) : meme repli que
// charger_donnees de KAAWA, qui ne laisse jamais les Conseils sans base.
function nomBaseAUtiliser(nomDemande, nomsImportes) {
  return nomsImportes.includes(nomDemande) ? nomDemande : NOM_BASE_INTEGREE;
}
