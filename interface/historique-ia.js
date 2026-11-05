// La boite « Historique IA » de Reglages (saab, 2026-09-30 : « voir
// l'historique des modif d'un fichier, un peu comme les branches de
// Sequence ») : une ligne par version validee du profil IA, les branches
// decalees, la version courante en evidence ; toucher une ligne y revient
// (interface/reglages-ia.js). Les lignes viennent de
// moteur/historique-profil-ia.js (lignesHistoriqueIA). Au survol, le nom du profil a
// cette version (saab, 2026-11-03 : « sinon c'est pas évident à retrouver » — le v3 de
// l'historique n'est pas le _v2 du nom des parties).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lignesHistoriqueIA, DESCRIPTION_REGLAGES_IA
// (moteur/historique-profil-ia.js), libelleDateHistorique, choisirVersion
// (moteur/historique-reglages.js), suffixeDeLaVersionDuProfil (moteur/ia.js) viennent de fichiers charges avant celui-ci ;
// libelleProfilIA, profilASaVersion (interface/noms-profils-ia.js) ne servent qu'a l'affichage.

const DECALAGE_BRANCHE_HISTORIQUE_PX = 14;
const MARGE_LIGNE_HISTORIQUE_PX = 4;

// `conteneur` : la liste ; `profil` : le profil montre (un profil integre n'a
// pas d'historique) ; `choisir(numero)` : revenir a cette version.
function afficherHistoriqueIA(conteneur, profil, choisir) {
  // Le nom que prend sa machine (moteur/ia.js, suffixeDeLaVersionDuProfil) : la version courante, ou une ancienne.
  const nomALaVersion = (ligne) =>
    `${libelleProfilIA(profilASaVersion(profil, ligne.numero))}${suffixeDeLaVersionDuProfil(ligne.courante ? { versionProfil: ligne.numero } : { versionHistorique: ligne.numero })}`;
  afficherHistorique(conteneur, lignesHistoriqueIA(profil), choisir, nomALaVersion);
}

// La meme boite pour tout reglage a versions (les profils d'Entrainement aussi) :
// `lignes` : moteur/historique-reglages.js, lignesHistorique ; `nomALaVersion(ligne)` :
// facultatif, le nom montre au survol.
function afficherHistorique(conteneur, lignes, choisir, nomALaVersion = null) {
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
      bouton.textContent = [`v${ligne.numero}`, libelleDateHistorique(ligne.date), quoi].filter(Boolean).join(' · ');
      bouton.title = [nomALaVersion?.(ligne), ligne.courante ? 'Version courante' : 'Revenir à cette version'].filter(Boolean).join(' — ');
      bouton.addEventListener('click', () => choisir(ligne.numero));
      return bouton;
    })
  );
  // La version courante visible dans la liste — sans scrollIntoView, qui ferait
  // aussi defiler la boite Reglages entiere.
  const courante = conteneur.querySelector('.version-courante');
  if (courante) conteneur.scrollTop += courante.getBoundingClientRect().top - conteneur.getBoundingClientRect().top;
}
