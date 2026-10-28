// Les SERIES du banc d'essais (interface/banc-essais.js les lance) : des parties contre
// la reference (et leur recolte de puzzles, si demandee), ou des puzzles que chaque essai
// attaque et que la reference defend. Extrait d'interface/banc-essais.js (regle des 200
// lignes). `banc` : { base() (le livre d'ouvertures), controle() ({ arret, pause,
// reprendre }), viderLaRecolte() (une recolte neuve : { entrees, date, ajoutee }) }.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : partiesDuBanc, resumeDuBanc
// (moteur/banc-essais.js), nomDuFichierDuBanc (moteur/banc-noms.js), machinesDeLaPartieDuBanc
// (moteur/banc-fichiers.js), nomDeMachineDuBanc
// (interface/banc-essais-choix.js), jouerUnePartieDuBanc, POSITION_DEPART_BANC
// (interface/banc-essais-partie.js),
// contenuDuBanc (interface/banc-essais-page.js), resumeDesPuzzles, entreeDuPuzzleRecolte
// (moteur/banc-puzzles.js), jouerUnPuzzleDuBanc, puzzleDeLaPartie, verifierParLeSolveur
// (interface/banc-essais-puzzles.js), creerSolveur (interface/solveur.js),
// contenuDesPuzzles (interface/banc-essais-page-puzzles.js) viennent de fichiers charges
// avant celui-ci.

const CREATEUR_DES_RECOLTES = "KAI++ (banc d'essais)";

// Une serie de parties (et sa recolte de puzzles, si demandee).
function serieDePartiesDuBanc(essais, reference, parametres, banc) {
  const taches = partiesDuBanc(essais.length, parametres);
  const parties = [];
  const { active } = parametres.recolte;
  // Le livre de chacun, dans le nom des machines (La / Ls) comme dans leurs reglages.
  const livreDeLaReference = parametres.livre !== false;
  const livreDesEssais = parametres.livreEssai === true;
  const recolte = banc.viderLaRecolte();
  const solveur = active ? creerSolveur() : null; // un seul pour tout le banc (128 Mo)
  const fabriquer = (partie) => (etat, tours) => entreeDuPuzzleRecolte({ etat, gagnant: partie.fin, tours, numero: partie.numero, date: recolte.date, createur: CREATEUR_DES_RECOLTES });
  const jouer = async (tache, kai, suivi) => {
    const partie = await jouerUnePartieDuBanc(tache, reference, essais[tache.essai], parametres, kai, banc.base(), banc.controle(), suivi);
    if (!partie) return;
    const trouve = active ? await puzzleDeLaPartie(partie, solveur, parametres.recolte, suivi, fabriquer(partie)) : null;
    // Arretee pendant la recolte : sa reponse n'est pas sure. Une position deja recoltee : une fois.
    if (trouve && !banc.controle().arret && !recolte.entrees.some((deja) => deja.entree.pos === trouve.entree.pos)) recolte.entrees.push({ ...trouve, numero: partie.numero });
    delete partie.etats; // les positions ne servaient qu'a la recolte
    parties.push(partie);
  };
  const rendu = () => contenuDuBanc({ reference, essais, parties, resume: resumeDuBanc(parties, essais.length), parametres, recoltes: active ? recolte : null });
  const libelle = (tache) => `Partie ${tache.numero}/${taches.length} — ${tache.essai + 1}. ${essais[tache.essai].nom} en ${tache.referenceNoir ? 'Blanc' : 'Noir'}, ouverture ${tache.ouverture}`;
  const nomDuFichier = (date) => {
    const resume = resumeDuBanc(parties, essais.length);
    return nomDuFichierDuBanc({ date, reference: nomDeMachineDuBanc(reference, livreDeLaReference), partiesParEssai: taches.length / essais.length, essais: essais.map((essai, rang) => ({ machine: nomDeMachineDuBanc(essai, livreDesEssais), ...resume[rang] })), recolte: active });
  };
  // Les parties, pour les revoir depuis le fichier exporte (moteur/banc-fichiers.js).
  const donnees = () => ({
    parties: parties.map((p) => ({ numero: p.numero, variante: p.variante ?? null, position: p.position ?? POSITION_DEPART_BANC, essai: nomDeMachineDuBanc(essais[p.essai], livreDesEssais), reference: nomDeMachineDuBanc(reference, livreDeLaReference), essaiNoir: !p.referenceNoir, coups: p.coups, livre: p.livre, occurrences: p.occurrences, fin: p.fin, score: p.score, machines: machinesDeLaPartieDuBanc({ essai: essais[p.essai], reference, essaiNoir: !p.referenceNoir, livreEssai: livreDesEssais, livreReference: livreDeLaReference }) })),
  });
  const essaisRetouches = () => {
    const resume = resumeDuBanc(parties, essais.length);
    return essais.map((essai, rang) => ({ essai, resume: resume[rang] })).filter(({ essai }) => essai.retouche);
  };
  // Une partie finie, pour la regarder (interface/banc-essais-regarder.js).
  const partieARegarder = (numero) => {
    const p = parties.find((partie) => partie.numero === numero);
    if (!p) return p;
    const [essai, adverse] = [essais[p.essai].nom, reference.nom];
    return { numero, position: p.position ?? POSITION_DEPART_BANC, coups: p.coups, titre: `Partie ${numero} — ${p.essai + 1}. ${essai} en ${p.referenceNoir ? 'Blanc' : 'Noir'}, ${p.fin}, ${p.score}`, joueurs: p.referenceNoir ? { noir: adverse, blanc: essai } : { noir: essai, blanc: adverse } };
  };
  return { taches, jouer, rendu, fait: () => parties.length, unite: 'parties', libelle, nomDuFichier, donnees, essaisRetouches, partieARegarder, nomDeLEssai: (tache) => essais[tache.essai].nom, nomDeLAdversaire: () => reference.nom };
}

// Une serie de puzzles : chaque essai attaque chaque puzzle, la reference defend.
function serieDePuzzlesDuBanc(essais, reference, parametres, banc, puzzles) {
  if (puzzles.length === 0) {
    window.alert('Aucun puzzle entre ces tours : changez les tours mini et maxi, ou cochez KAAWA ou My.');
    return null;
  }
  const taches = essais.flatMap((_, essai) => puzzles.map((puzzle) => ({ essai, puzzle })));
  const resultats = [];
  // UN solveur pour tout le banc (il reserve 128 Mo) : les verifications passent une par une.
  const solveur = parametres.solveur ? creerSolveur() : null;
  const jouer = async (tache, kai, suivi) => {
    const resultat = await jouerUnPuzzleDuBanc(tache, essais[tache.essai], reference, kai, banc.controle(), suivi, parametres.defenseComplete);
    if (!resultat) return;
    if (solveur && resultat.resolu) {
      suivi({ etape: 'vérification par le solveur…' });
      resultat.verdict = await verifierParLeSolveur(solveur, resultat);
      resultat.resolu = resultat.verdict === 'valide'; // ne compte que « Bravo »
    }
    resultats.push(resultat);
  };
  const rendu = () => contenuDesPuzzles({ reference, essais, resultats, resume: resumeDesPuzzles(resultats, essais.length), parametres: { ...parametres, nombreDePuzzles: puzzles.length } });
  const libelle = (tache, numero) => `Puzzle ${numero}/${taches.length} — ${tache.essai + 1}. ${essais[tache.essai].nom} : ${tache.puzzle.nom}`;
  return { taches, jouer, rendu, fait: () => resultats.length, unite: 'puzzles', libelle };
}
