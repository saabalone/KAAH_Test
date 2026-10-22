// Un VALIDER QUI ATTEND (saab, 2026-10-19 : « certains Valider ne sont pas en vert quand on
// a fait une action qui demande validation, ex. quand on entre le nom ») : des qu'on change
// quelque chose dans sa boite (un champ, une case, une liste, un des boutons de choix), son
// bouton passe au vert (bouton-a-faire, comme tout ce qui attend un geste) ; rouverte, la
// boite le remet neutre.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// `dialogue` : la boite ; `bouton` : son Valider ; `choix` : un selecteur des boutons qui
// changent un reglage d'un clic (ex. Humain / IA, les niveaux).
function signalerLaValidationAttendue(dialogue, bouton, choix = null) {
  const attendre = () => bouton.classList.add('bouton-a-faire');
  dialogue.addEventListener('input', attendre);
  dialogue.addEventListener('change', attendre);
  if (choix) dialogue.addEventListener('click', (evenement) => evenement.target.closest(choix) && attendre());
  // A chaque ouverture, neutre (a la fermeture, la boite remet ses champs : ce serait un changement).
  new MutationObserver(() => dialogue.open && bouton.classList.remove('bouton-a-faire')).observe(dialogue, { attributes: true, attributeFilter: ['open'] });
}
