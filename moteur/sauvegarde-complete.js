// La SAUVEGARDE COMPLETE (saab, 2026-10-09 : « comment faire qd on change
// d'appareil pour ne pas perdre toutes nos données ? ») : tout ce que KAAH garde
// dans le navigateur (localStorage, une cle « kaah-… » par sorte de donnees :
// parties, historique des joueurs, ceintures, profils IA et d'Entrainement, noms,
// favoris, positions My, reglages) dans un seul fichier, a importer sur l'autre
// appareil. Pur : interface/sauvegarde-complete.js lit et ecrit le stockage.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const FORMAT_SAUVEGARDE_COMPLETE = 'KAAH_sauvegarde_complete_1';
const PREFIXE_DES_DONNEES_KAAH = 'kaah-';

const estUneDonneeKAAH = (cle, valeur) => typeof cle === 'string' && cle.startsWith(PREFIXE_DES_DONNEES_KAAH) && typeof valeur === 'string';

// `stockage` : { cle: texte } (tout le localStorage) ; `date` : formaterDateKAAWA.
function sauvegardeComplete(stockage, date) {
  return {
    format: FORMAT_SAUVEGARDE_COMPLETE,
    date,
    donnees: Object.fromEntries(Object.entries(stockage).filter(([cle, valeur]) => estUneDonneeKAAH(cle, valeur))),
  };
}

// Les donnees d'un fichier de sauvegarde complete, ou null si ce n'en est pas un.
function lireSauvegardeComplete(brut) {
  if (!brut || brut.format !== FORMAT_SAUVEGARDE_COMPLETE || typeof brut.donnees !== 'object' || brut.donnees === null) return null;
  return Object.fromEntries(Object.entries(brut.donnees).filter(([cle, valeur]) => estUneDonneeKAAH(cle, valeur)));
}
