// La SAUVEGARDE COMPLETE dans Reglages (saab, 2026-10-09 : « comment faire qd on
// change d'appareil pour ne pas perdre toutes nos données ? ») : Exporter tout
// telecharge un fichier KAAH_sauvegarde_<date>.json ; sur l'autre appareil,
// Importer tout le relit (moteur/sauvegarde-complete.js), remplace les donnees de
// KAAH de cet appareil, puis recharge la page.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : sauvegardeComplete,
// lireSauvegardeComplete, PREFIXE_DES_DONNEES_KAAH (moteur/sauvegarde-complete.js),
// telechargerTexte, demarrerImportation (interface/fichiers.js), formaterDateKAAWA
// (interface/sauvegarde.js) viennent de fichiers charges avant celui-ci.

function lireToutLeStockage() {
  const stockage = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const cle = window.localStorage.key(i);
      stockage[cle] = window.localStorage.getItem(cle);
    }
  } catch {
    // stockage indisponible : un fichier vide
  }
  return stockage;
}

// `elements` : { exporter, importer, note } ; `confirmer(message, action)` : la
// boite verte habituelle ; `recharger` : demarrerRechargement (index.html).
function demarrerSauvegardeComplete(elements, confirmer, recharger) {
  // L'occupation du stockage, a chaque ouverture de la rubrique.
  elements.rubrique?.addEventListener('toggle', () => {
    if (elements.rubrique.open) elements.occupation.textContent = `Stockage du navigateur (environ 5 000 k en tout) : ${occupationDuStockage()}`;
  });
  elements.exporter.addEventListener('click', () => {
    const date = formaterDateKAAWA(new Date());
    const fichier = sauvegardeComplete(lireToutLeStockage(), date);
    telechargerTexte(JSON.stringify(fichier), `KAAH_sauvegarde_${date}.json`, 'application/json');
    elements.note.textContent = `${Object.keys(fichier.donnees).length} sortes de données exportées. Copiez ce fichier sur l’autre appareil (câble, mail, cloud…), puis Importer tout.`;
  });
  elements.importer.addEventListener('click', () => {
    demarrerImportation(
      (brut) => {
        const donnees = lireSauvegardeComplete(brut);
        if (!donnees) {
          elements.note.textContent = 'Ce fichier n’est pas une sauvegarde complète de KAAH.';
          return;
        }
        confirmer(`Remplacer toutes les données de KAAH de cet appareil par celles du fichier (${brut.date ?? 'date inconnue'}) ?`, () => {
          try {
            const anciennes = Object.keys(lireToutLeStockage()).filter((cle) => cle.startsWith(PREFIXE_DES_DONNEES_KAAH));
            for (const cle of anciennes) window.localStorage.removeItem(cle);
            for (const [cle, valeur] of Object.entries(donnees)) window.localStorage.setItem(cle, valeur);
          } catch {
            elements.note.textContent = 'Le navigateur refuse d’enregistrer (stockage plein ou bloqué).';
            return;
          }
          recharger();
        });
      },
      (message) => (elements.note.textContent = message)
    );
  });
}

// Ce que pese KAAH dans le navigateur (environ 5 Mo pour tout le site ; saab, 2026-10-15 :
// « comme j'avais fait un test non exporté, c'est peut-être pour ça que le navigateur était
// plein ? »), dans la Sauvegarde complete et quand un enregistrement est refuse.
const CARACTERES_PAR_K = 1024;
const CLES_LES_PLUS_LOURDES_MONTREES = 6;

// Ce qui remplit le stockage du navigateur : les cles les plus lourdes, en milliers de
// caracteres, et le total.
function occupationDuStockage() {
  const tailles = [];
  try {
    for (let rang = 0; rang < window.localStorage.length; rang++) {
      const cle = window.localStorage.key(rang);
      tailles.push([cle, cle.length + (window.localStorage.getItem(cle)?.length ?? 0)]);
    }
  } catch {
    return 'le stockage du navigateur est illisible.';
  }
  const enK = (taille) => `${Math.round(taille / CARACTERES_PAR_K)} k`;
  const total = tailles.reduce((somme, [, taille]) => somme + taille, 0);
  const lourdes = tailles.sort((a, b) => b[1] - a[1]).slice(0, CLES_LES_PLUS_LOURDES_MONTREES).map(([cle, taille]) => `  ${cle} : ${enK(taille)}`);
  return `${enK(total)} caractères en tout, dont :\n${lourdes.join('\n')}`;
}
