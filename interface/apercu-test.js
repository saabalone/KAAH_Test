// L'APERCU DE KAAH_TEST (saab, 2026-10-10 : « me rajouter dans les icônes un btn Test,
// qui me montre l'affichage réel de KAAH_Test ... n'apparaîtra pas dans le vrai
// KAAH_Test ») : KAAH_Test ne differe de la version de travail que par la classe
// version-de-travail (index.html, version.js) ; l'apercu recharge la page sans elle,
// donc exactement comme les testeurs la voient, et le bouton reste la pour revenir.
// Retenu pour l'onglet (sessionStorage) : un jeu d'Entrainement qui recharge la page
// reste dans l'apercu ; fermer l'onglet en sort.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const CLE_APERCU_KAAH_TEST = 'kaah-apercu-test';

function apercuDeKAAHTestActif() {
  try {
    return window.sessionStorage.getItem(CLE_APERCU_KAAH_TEST) === 'oui';
  } catch {
    return false;
  }
}

// `bouton` : l'icone Test ; `recharger` : demarrerRechargement (index.html).
function demarrerApercuDeKAAHTest(bouton, recharger) {
  const actif = apercuDeKAAHTestActif();
  bouton.classList.toggle('bouton-actif', actif);
  bouton.title = actif ? 'Aperçu de KAAH_Test en cours : toucher pour revenir à la version de travail' : 'Voir KAAH exactement comme dans KAAH_Test (les réglages en lecture seule, sans les ajouts de travail)';
  bouton.addEventListener('click', () => {
    try {
      if (actif) window.sessionStorage.removeItem(CLE_APERCU_KAAH_TEST);
      else window.sessionStorage.setItem(CLE_APERCU_KAAH_TEST, 'oui');
    } catch {
      return; // sans stockage, l'apercu ne tiendrait pas au rechargement
    }
    recharger();
  });
}
