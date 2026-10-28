// Les noms demandes a la FIN de la partie, dans une seule boite (saab, 2026-10-28 : « il y a d'abord Joueur 1,
// mais si je valide sans nommer je n'ai pas la boite Joueur 2, il faudrait mettre la boite avec les 2 Joueurs,
// en fond blanc pour Blanc et noir pour Noir, on ne valide qu'une fois ») : un champ par camp encore sans nom
// (index.html, demanderLesNomsALaFin), Blanc en haut et Noir en bas comme leurs billes. Un champ vide garde son
// nom (Joueur_1, Joueur_2) : Valider sans rien taper, c'est les laisser ainsi — plus besoin de le demander avant.
// Un seul nom tape sur deux : on demande si l'autre reste ainsi (saab : « si je ne rempli qu'un nom demander si
// je veux laisser qu'un seule nom »). Fermer (Echap) ne change rien.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : brancherSaisieNomJoueur (interface/noms-joueurs.js),
// nomJoueurAutorise (moteur/nom-partie.js), NOM_CAMP (rendu/ejections.js) viennent de fichiers charges avant
// celui-ci.

// `elements` : { dialogue, lignes ({ noir, blanc } : chaque ligne, avec son champ), valider }. `joueurs` : les
// noms en jeu ; `nomsJoueurs` : la boite du nom (interface/noms-joueurs.js, nommer) ; `confirmation` :
// interface/confirmation.js ; `surChangement()` : sauvegarder, une fois. Renvoie { ouvrir(camps) }.
function demarrerNomsDeFinDePartie(elements, joueurs, nomsJoueurs, confirmation, surChangement) {
  const champDe = (camp) => elements.lignes[camp].querySelector('input');
  for (const camp of ['noir', 'blanc']) {
    brancherSaisieNomJoueur(champDe(camp));
    champDe(camp).addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Enter') valider();
    });
  }
  let campsANommer = [];

  function ouvrir(camps) {
    campsANommer = camps;
    for (const camp of ['noir', 'blanc']) {
      elements.lignes[camp].hidden = !camps.includes(camp);
      champDe(camp).value = '';
      champDe(camp).placeholder = joueurs[camp];
    }
    elements.dialogue.showModal();
    champDe(camps[0]).focus();
  }

  const nomTape = (camp) => nomJoueurAutorise(champDe(camp).value);

  function appliquer() {
    let change = false;
    for (const camp of campsANommer.filter(nomTape)) change = nomsJoueurs.nommer(camp, nomTape(camp)) || change;
    elements.dialogue.close();
    if (change) surChangement();
  }

  function valider() {
    const nommes = campsANommer.filter(nomTape);
    const [laisse] = campsANommer.filter((camp) => !nomTape(camp));
    if (nommes.length === 0 || !laisse) return appliquer();
    confirmation.demander(
      `Seul ${NOM_CAMP[nommes[0]]} est nommé (${nomTape(nommes[0])}) : laisser ${NOM_CAMP[laisse]} en ${joueurs[laisse]} ?`,
      appliquer,
      `Laisser ${joueurs[laisse]}`,
      { texte: `Nommer ${NOM_CAMP[laisse]}`, surRefus: () => champDe(laisse).focus() },
      { confirmerVert: true }
    );
  }

  elements.valider.addEventListener('click', valider);
  return { ouvrir };
}
