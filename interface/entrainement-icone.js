// L'icone Entrainement / Ceinture (saab, 2026-10-09 et 10) : la ceinture prend la
// couleur de la plus basse du proprietaire de l'appareil (interface/noms-connus.js) —
// « la ceinture de l'icône prend la couleur du plus bas grade Variante/PZL » — et 4
// ronds disent ses ceintures : en haut a gauche Variantes, a droite PZL ; en bas,
// celles d'avant (moteur/entrainement-serie.js, precedente). Verte, sans ronds, sans
// proprietaire.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CEINTURES, ceintureDuGrade (moteur/entrainement.js),
// proprietaireDeLAppareil (interface/noms-connus.js), parcoursDuJoueur
// (interface/entrainement-partie.js) viennent de fichiers charges avant celui-ci.

const RONDS_DE_L_ICONE = [
  ['--rond-variantes', 'variantes', 'ceinture', '.rond-variantes'],
  ['--rond-pzl', 'pzl', 'ceinture', '.rond-pzl'],
  ['--rond-variantes-precedente', 'variantes', 'precedente', '.rond-variantes-precedente'],
  ['--rond-pzl-precedente', 'pzl', 'precedente', '.rond-pzl-precedente'],
];

function colorerIconeEntrainement(bouton) {
  const nom = proprietaireDeLAppareil();
  for (const [propriete, , , rond] of RONDS_DE_L_ICONE) {
    bouton.style.removeProperty(propriete);
    bouton.querySelector(rond)?.classList.remove('rond-visible');
  }
  if (!nom) {
    bouton.style.removeProperty('--couleur-ceinture');
    return;
  }
  const parcours = { variantes: parcoursDuJoueur(nom, 'variantes'), pzl: parcoursDuJoueur(nom, 'pzl') };
  for (const [propriete, sorte, cle, rond] of RONDS_DE_L_ICONE) {
    const ceinture = CEINTURES[parcours[sorte][cle] ?? -1];
    if (!ceinture) continue;
    bouton.style.setProperty(propriete, ceinture.couleur);
    bouton.querySelector(rond)?.classList.add('rond-visible');
  }
  const libelle = (sorte) => {
    const ceinture = CEINTURES[parcours[sorte].ceinture];
    if (!ceinture) return 'sans ceinture'; // pas encore la blanche (moteur/entrainement-serie.js)
    return ceinture.dan ? ceinture.nom : `ceinture ${ceinture.nom.toLowerCase()}`;
  };
  bouton.style.setProperty('--couleur-ceinture', ceintureDuGrade(Math.min(parcours.variantes.ceinture, parcours.pzl.ceinture)).couleur);
  bouton.title = `Entraînement / Ceinture — ${nom} : ${libelle('variantes')} en Variantes, ${libelle('pzl')} en PZL`;
}
