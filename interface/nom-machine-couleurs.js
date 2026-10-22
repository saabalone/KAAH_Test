// Le NOM D'UNE MACHINE EN COULEURS (saab, 2026-10-22 : « (b) en marron ») : chaque morceau
// a sa valeur par defaut en marron — le moteur (KAI++), le niveau, la reflexion proposee
// pour ce niveau, et le style et le profil quand c'est l'IA par defaut telle quelle ;
// sinon le style garde la couleur de ses reglages (orange, vert, jaune :
// moteur/couleurs-profil-ia.js). Le marron et pas l'orange : l'orange dit deja « retouche
// pas encore validee », le jaune « validee il y a longtemps », le violet est aux branches.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : morceauxDuNomDeLaMachine (moteur/ia.js),
// couleurDeLaMachineIA (moteur/couleurs-profil-ia.js), memesReglagesIA
// (moteur/historique-profil-ia.js), trouverProfilIA, nomDuProfilIAParDefaut
// (interface/profils-ia.js), poserCouleurIA (interface/couleurs-ia.js), MOTEUR_PROPOSE_IA,
// NIVEAU_PROPOSE_IA, reflexionProposee (interface/choix-joueurs.js) viennent de fichiers
// charges avant celui-ci.

const COULEUR_PAR_DEFAUT_IA = 'defaut';

// [{ texte, couleur }] : 'defaut', 'modifie', 'dernier', 'ancien' ou null.
function morceauxColoresDuNom(machine) {
  const profil = trouverProfilIA(machine.profil);
  const profilParDefaut = machine.profil === nomDuProfilIAParDefaut() && profil !== null && memesReglagesIA(profil, machine);
  const parDefaut = {
    moteur: machine.moteur === MOTEUR_PROPOSE_IA,
    niveau: machine.niveau === NIVEAU_PROPOSE_IA,
    temps: machine.reflexionMax === reflexionProposee(machine.niveau, machine.elagage > 0),
    style: profilParDefaut,
    profil: profilParDefaut,
  };
  const couleurDesReglages = profilParDefaut ? null : couleurDeLaMachineIA(machine, profil);
  return morceauxDuNomDeLaMachine(machine).map(({ cle, texte }) => ({
    texte,
    couleur: parDefaut[cle] ? COULEUR_PAR_DEFAUT_IA : cle === 'style' ? couleurDesReglages : null,
  }));
}

// Les memes morceaux pour une page HTML (la boite du nom, interface/noms-joueurs.js) :
// des textes et des <span>.
function nomColoreDeLaMachine(machine) {
  return morceauxColoresDuNom(machine).map(({ texte, couleur }) => {
    if (!couleur) return texte;
    const morceau = document.createElement('span');
    morceau.textContent = texte;
    if (couleur === COULEUR_PAR_DEFAUT_IA) morceau.classList.add('valeur-par-defaut');
    else poserCouleurIA(morceau, couleur);
    return morceau;
  });
}
