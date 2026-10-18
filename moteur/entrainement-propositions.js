// Les PLACES et les PROPOSITIONS d'une serie du mode Ceinture (extrait de
// moteur/entrainement-serie.js, regle des 200 lignes) : quels jeux ont encore leur place
// dans la serie, compte tenu des jeux imposes et des nombres imposes par type, et quels
// jeux proposer au joueur. Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : REGLES_DE_SERIE_PAR_DEFAUT, complet
// (moteur/entrainement-serie.js) viennent d'un fichier charge avant celui-ci.

// Par type, les jeux qui manquent encore a son nombre impose (`quotas` : { type: n }),
// ceux de `comptes` etant deja pris.
function quotasManquants(quotas, comptes, typesDe) {
  return Object.entries(quotas ?? {}).reduce((somme, [type, quota]) => somme + Math.max(0, quota - comptes.filter((nom) => typesDe(nom).includes(type)).length), 0);
}

// Les places de la serie : les jeux reussis, les commences, et celles gardees aux
// obligations — les imposes pas encore commences, puis, par type, les jeux qui
// manquent encore a son quota (`regles.quotas` : { type: n } ; `regles.typesDe(nom)`).
// Un jeu neuf ne prend une place que s'il en reste une, obligations comprises.
function placePourUnJeu(parcours, nom, regles) {
  const { valides, enCours } = complet(parcours);
  if (valides.includes(nom)) return false;
  if (enCours[nom]) return true;
  const engages = [...valides, ...Object.keys(enCours), nom];
  const imposes = (regles.imposes ?? []).filter((autre) => !engages.includes(autre));
  const typesDe = regles.typesDe ?? (() => []);
  return engages.length + imposes.length + quotasManquants(regles.quotas, [...engages, ...imposes], typesDe) <= regles.jeuxParSerie;
}

// Parmi `propositions` (dans leur ordre), les jeux qu'on peut jouer maintenant pour la serie.
function jeuxChoisissables(parcours, propositions, regles = REGLES_DE_SERIE_PAR_DEFAUT) {
  return propositions.filter((nom) => placePourUnJeu(parcours, nom, regles));
}

// Les jeux proposes : les imposes (s'ils sont parmi les candidats), puis, au hasard,
// de quoi remplir chaque quota de type, puis d'autres jusqu'a `nombre` (undefined :
// tous) ; dans l'ordre des candidats. `obligations` : { imposes, quotas, typesDe }
// (voir placePourUnJeu) ; `hasard` : comme Math.random (les tests le fixent).
function tirerPropositions(candidats, { imposes = [], quotas = {}, typesDe = () => [] } = {}, nombre, hasard = Math.random) {
  if (nombre === undefined) return [...candidats];
  const retenus = new Set(candidats.filter((nom) => imposes.includes(nom)));
  const tirer = (parmi) => {
    const restants = parmi.filter((nom) => !retenus.has(nom));
    if (restants.length > 0) retenus.add(restants[Math.floor(hasard() * restants.length)]);
    return restants.length > 0;
  };
  for (const [type, quota] of Object.entries(quotas)) {
    const duType = candidats.filter((nom) => typesDe(nom).includes(type));
    while ([...retenus].filter((nom) => typesDe(nom).includes(type)).length < quota && tirer(duType));
  }
  while (retenus.size < nombre && tirer(candidats));
  return candidats.filter((nom) => retenus.has(nom));
}
