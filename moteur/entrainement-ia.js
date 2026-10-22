// Le PASSAGE DE CEINTURES D'UNE IA (saab, 2026-10-11 : « tester les ceintures entre
// IA : on part de Blanche et on vise la suivante, dès qu'on régresse le test s'arrête
// et sa plus haute ceinture est attribuée à l'IA, comme ça on pourra leur mettre une
// mini icône ceinture (partie/PZL) »). L'IA suit le parcours d'un joueur, avec les
// memes regles (moteur/entrainement-serie.js) ; ici, seulement ce qu'un joueur decide
// lui-meme : quel jeu jouer ensuite, et quand le passage s'arrete. Pur : le banc
// d'essais (interface/banc-essais-ceintures.js) joue les jeux.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : ceinturesJouables,
// jeuxChoisissables, jeuxDeConfirmation (moteur/entrainement-serie.js) viennent d'un fichier charge avant.

// Le jeu que l'IA joue ensuite : { ceinture, nom, sens }, ou null (plus rien a jouer :
// le sommet, ou une ceinture sans jeu propose). La ceinture a jouer la plus basse ; son
// jeu deja commence, sinon le premier jeu propose qui a sa place dans la serie ;
// l'aller, puis la revanche. `propositions(ceinture)` : les noms des jeux proposes.
function prochainJeuDuParcours(parcours, propositions, regles) {
  const ceinture = ceinturesJouables(parcours)[0];
  if (ceinture === undefined) return null;
  const enConfirmation = Boolean(parcours.aConfirmer);
  const commences = enConfirmation
    ? Object.fromEntries(Object.entries(parcours.enConfirmation ?? {}).filter(([cle]) => cle.startsWith(`${ceinture}|`)).map(([cle, jeu]) => [cle.slice(`${ceinture}|`.length), jeu]))
    : parcours.enCours ?? {};
  const proposes = propositions(ceinture);
  const nom = Object.keys(commences)[0] ?? (enConfirmation ? jeuxDeConfirmation(parcours, ceinture, proposes)[0] : jeuxChoisissables(parcours, proposes, regles)[0]);
  if (nom === undefined) return null;
  const avecRevanche = enConfirmation ? regles.revancheDeConfirmation ?? regles.revanche : regles.revanche;
  return { ceinture, nom, sens: avecRevanche && commences[nom]?.aller ? 'revanche' : 'aller' };
}

// Apres un jeu (`evenement` d'apresUnResultat, le parcours `avant` et `apres`) : le
// passage continue ({ fini: false }) ou s'arrete — { fini, ceinture (la plus haute
// obtenue), raison }. Il s'arrete a la premiere regression (la ceinture d'avant est la
// sienne), au sommet, ou sur un jeu refuse (jamais attendu : plutot que tourner en rond).
function suiteDuPassage(evenement, avant, apres) {
  if (evenement === 'regression') return { fini: true, ceinture: avant.ceinture, raison: 'régression' };
  if (evenement === 'refuse') return { fini: true, ceinture: avant.ceinture, raison: 'jeu refusé' };
  if (apres.cible === null) return { fini: true, ceinture: apres.ceinture, raison: 'sommet' };
  return { fini: false };
}

// TOUT TESTER, DU HAUT JUSQU'EN BAS (saab, 2026-10-11 : « tester la ceinture inférieure
// aussi si elle a raté la visée ... et on verra bien s'il n'y a pas de résultats
// étranges ») : chaque grade se teste a part, par sa serie seule. Le parcours d'une IA
// qui aurait la ceinture d'en dessous et viserait `grade` (la blanche se teste aussi :
// « en dessous » n'est alors qu'un point de depart).
function parcoursPourTester(grade) {
  return { ...parcoursNeuf(), ceinture: grade - 1, cible: grade };
}

// L'issue de la serie d'un grade teste a part, d'apres l'evenement d'un jeu : 'réussie'
// (la serie est complete : la confirmation ne se joue pas), 'ratée' (assez d'essais
// rates pour redescendre), ou null tant qu'elle continue.
function issueDeLaSerieTestee(evenement) {
  if (evenement === 'confirmation' || evenement === 'ceinture') return 'réussie';
  if (evenement === 'regression' || evenement === 'refuse') return 'ratée';
  return null;
}
