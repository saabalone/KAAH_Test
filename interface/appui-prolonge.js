// L'APPUI PROLONGE sur un bouton − / + ou une fleche ▲ ▼ (saab, 2026-10-14 : « les
// réglages par flèches ou -/+ doivent être plus fins, mettre tout au pas -/+ 1 (appui
// prolongé pour aller rapidement) ») : un appui fait un pas ; tenu, les pas s'enchainent
// apres un court delai, jusqu'a ce qu'on relache.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const DELAI_AVANT_REPETITION_MS = 400;
const INTERVALLE_DE_REPETITION_MS = 60;

// `action()` : un pas. Le clavier (Entree, Espace) fait un pas par touche.
function brancherAppuiProlonge(bouton, action) {
  // Son appui tenu fait deja quelque chose : pas d'infobulle au doigt (interface/infobulle-tactile.js).
  bouton.dataset.appuiProlonge = 'oui';
  let attente = null;
  let repetition = null;
  const relacher = () => {
    clearTimeout(attente);
    clearInterval(repetition);
  };
  bouton.addEventListener('pointerdown', (evenement) => {
    if (evenement.button !== 0 || bouton.disabled) return;
    relacher();
    action();
    attente = setTimeout(() => (repetition = setInterval(action, INTERVALLE_DE_REPETITION_MS)), DELAI_AVANT_REPETITION_MS);
  });
  for (const fin of ['pointerup', 'pointerleave', 'pointercancel']) bouton.addEventListener(fin, relacher);
  // Un clic sans pointeur (`detail` 0) : le clavier, ou un autre bouton qui le declenche.
  bouton.addEventListener('click', (evenement) => {
    if (evenement.detail === 0) action();
  });
}
