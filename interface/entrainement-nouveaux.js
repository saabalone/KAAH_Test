// Les NOUVEAUX PZL A VALIDER (saab, 2026-10-17 : « si je rajoute des PZL, il faudra les
// valider dans la plus haute ceinture réussie, donc mettre une alerte sur la ceinture
// qu'il y a des nouveaux PZL à valider ») : le parcours PZL d'un joueur retient les PZL
// des ceintures qu'il a acquises (la premiere fois qu'on ouvre sa boite) ; un PZL ajoute
// ensuite a l'une d'elles est signale sur sa plus haute ceinture reussie, impose parmi
// les jeux proposes a ce grade en mode Entrainement, et valide des qu'il est gagne.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : nouveauxJeuxAValider,
// avecDesJeuxConnus (moteur/entrainement-serie.js), parcoursDuJoueur, enregistrerParcours
// (interface/entrainement-partie.js) viennent de fichiers charges avant celui-ci.

// Les PZL des ceintures acquises par `joueur` qu'il n'a pas encore valides ;
// `candidatsDuGrade(grade)` : les noms des PZL d'un grade.
function nouveauxPzlAValider(joueur, candidatsDuGrade) {
  const parcours = parcoursDuJoueur(joueur, 'pzl');
  if (!(parcours.ceinture > 0)) return [];
  const actuels = [...new Set(Array.from({ length: parcours.ceinture + 1 }, (_, grade) => candidatsDuGrade(grade)).flat())];
  if (!Array.isArray(parcours.jeuxConnus)) {
    enregistrerParcours(joueur, 'pzl', avecDesJeuxConnus(parcours, actuels)); // la premiere fois : on retient
    return [];
  }
  return nouveauxJeuxAValider(parcours, actuels);
}

// Un PZL gagne (en Entrainement comme en Ceinture) : valide, s'il etait nouveau.
function validerUnNouveauPzl(joueur, sorte, nom) {
  if (sorte !== 'pzl') return;
  const parcours = parcoursDuJoueur(joueur, 'pzl');
  if (Array.isArray(parcours.jeuxConnus) && !parcours.jeuxConnus.includes(nom)) enregistrerParcours(joueur, 'pzl', avecDesJeuxConnus(parcours, [nom]));
}

// Le signal sur la ceinture : « ⚠ 2 nouveaux PZL à valider », leurs noms en infobulle.
const signalDesNouveauxPzl = (nouveaux, echapper) =>
  nouveaux.length === 0 ? '' : `<br><span class="nouveaux-pzl" title="${echapper(`À gagner en Entraînement à cette ceinture (ils y sont proposés) : ${nouveaux.join(', ')}`)}">⚠ ${nouveaux.length} nouveau${nouveaux.length > 1 ? 'x' : ''} PZL à valider</span>`;
