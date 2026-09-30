// La boite « Historique IA » de Reglages (saab, 2026-09-30 : « voir
// l'historique des modif d'un fichier, un peu comme les branches de
// Sequence ») : une ligne par version validee du profil IA, les branches
// decalees, la version courante en evidence ; toucher une ligne y revient
// (interface/reglages-ia.js). Les lignes viennent de
// moteur/historique-profil-ia.js (lignesHistoriqueIA).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lignesHistoriqueIA,
// libelleDateHistoriqueIA (moteur/historique-profil-ia.js) viennent de
// fichiers charges avant celui-ci.

const DECALAGE_BRANCHE_HISTORIQUE_PX = 14;
const MARGE_LIGNE_HISTORIQUE_PX = 4;

// `conteneur` : la liste ; `profil` : le profil montre (un profil integre n'a
// pas d'historique) ; `choisir(numero)` : revenir a cette version.
function afficherHistoriqueIA(conteneur, profil, choisir) {
  const lignes = lignesHistoriqueIA(profil);
  if (lignes.length === 0) {
    const vide = document.createElement('p');
    vide.className = 'note-reglages';
    vide.textContent = 'Pas encore de version validée.';
    conteneur.replaceChildren(vide);
    return;
  }
  conteneur.replaceChildren(
    ...lignes.map((ligne) => {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'ligne-historique-ia';
      bouton.classList.toggle('version-courante', ligne.courante);
      bouton.classList.toggle('hors-du-chemin', !ligne.surLeChemin);
      bouton.style.paddingLeft = `${ligne.niveau * DECALAGE_BRANCHE_HISTORIQUE_PX + MARGE_LIGNE_HISTORIQUE_PX}px`;
      const quoi = ligne.differences.length > 0 ? ligne.differences.join(', ') : ligne.note;
      bouton.textContent = [`v${ligne.numero}`, libelleDateHistoriqueIA(ligne.date), quoi].filter(Boolean).join(' · ');
      bouton.title = ligne.courante ? 'Version courante' : 'Revenir à cette version';
      bouton.addEventListener('click', () => choisir(ligne.numero));
      return bouton;
    })
  );
  // La version courante visible dans la liste — sans scrollIntoView, qui ferait
  // aussi defiler la boite Reglages entiere.
  const courante = conteneur.querySelector('.version-courante');
  if (courante) conteneur.scrollTop += courante.getBoundingClientRect().top - conteneur.getBoundingClientRect().top;
}
