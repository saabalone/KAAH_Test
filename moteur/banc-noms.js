// Les NOMS DES FICHIERS exportes par le Banc d'essais, LabAlone (saab, 2026-10-14 :
// « au lieu de banc_essais_2610130406, qui n'est pas explicite, mettre
// LabAl_Date_Référence(nb total parties)-Essai1[gagné Noir_gagné Blanc_Nulle],
// -Essai2 etc. » ; « pour test Ceinture : LabAlCeint_date_Référence = ceint
// réussie(ceint visée) » ; « ajouter suffixe PZL si on a cherché à récolter des PZL »).
// Chaque machine y porte le nom qu'elle a dans le titre d'une partie (moteur/ia.js,
// nomDeLaMachine : KAI++8_Def_160s_v4el). Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const PREFIXE_LABALONE = 'LabAl';
const SUFFIXE_DE_RECOLTE = 'PZL';
// Un nom de fichier plus long ne passe pas partout (Windows : 255 avec le dossier).
const LONGUEUR_MAX_DU_NOM_LABALONE = 200;
const LIBELLES_COURTS_DES_SORTES = { variantes: 'Var', pzl: 'PZL' };

// `morceaux` joints par `separateur` tant que le nom tient ; sinon « (+n essais) ».
function nomBorneDeLabAlone(debut, morceaux, separateur) {
  let nom = debut;
  for (let rang = 0; rang < morceaux.length; rang++) {
    const reste = morceaux.length - rang;
    const suite = `${nom}${rang === 0 ? '' : separateur}${morceaux[rang]}`;
    const place = reste > 1 ? ` (+${reste - 1} essais)`.length : 0;
    if (suite.length + place > LONGUEUR_MAX_DU_NOM_LABALONE) return `${nom} (+${reste} essais)`;
    nom = suite;
  }
  return nom;
}

// Un essai de parties. `reference` et `essais[].machine` : des noms de machine ;
// `partiesParEssai` ; `essais[]` : { machine, enNoir, enBlanc, nulles } (ses victoires
// en Noir — x —, en Blanc — y —, et ses nulles) ; `recolte` : on y a cherche des PZL.
function nomDuFichierDuBanc({ date, reference, partiesParEssai, essais, recolte = false }) {
  const debut = `${PREFIXE_LABALONE}${recolte ? SUFFIXE_DE_RECOLTE : ''}_${date}_${reference}(${partiesParEssai})`;
  return nomBorneDeLabAlone(debut, essais.map((essai) => `-${essai.machine}[${essai.enNoir}x_${essai.enBlanc}y_${essai.nulles}n]`), ', ');
}

// « Noire, 1er Dan » -> Noire1 ; « Blanche et rouge, 6e Dan » -> BlancheRouge6.
function nomCourtDeLaCeinture(ceinture) {
  const [couleur, dan = ''] = ceinture.nom.split(', ');
  const mots = couleur.split(' ').filter((mot) => mot !== 'et');
  return `${mots.map((mot) => mot[0].toUpperCase() + mot.slice(1)).join('')}${dan.replace(/\D/g, '')}`;
}

// Un passage de ceintures. `passages[]` : { machine, sorte ('variantes' | 'pzl'),
// ceinture (la reussie), visee } ; une seule sorte en tout : elle n'est pas dite.
function nomDuFichierDesCeintures({ date, passages, recolte = false }) {
  const uneSeuleSorte = new Set(passages.map((passage) => passage.sorte)).size === 1;
  const machines = [...new Set(passages.map((passage) => passage.machine))];
  const morceaux = machines.map((machine) => {
    const siens = passages.filter((passage) => passage.machine === machine).map((passage) => `${uneSeuleSorte ? '' : `${LIBELLES_COURTS_DES_SORTES[passage.sorte]} `}${nomCourtDeLaCeinture(passage.ceinture)}(${nomCourtDeLaCeinture(passage.visee)})`);
    return `${machine} = ${siens.join(' ')}`;
  });
  return nomBorneDeLabAlone(`${PREFIXE_LABALONE}Ceint${recolte ? SUFFIXE_DE_RECOLTE : ''}_${date}_`, morceaux, ', ');
}
