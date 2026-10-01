// Comment chaque machine cherche son coup (sorti d'interface/ia.js, qui
// decide QUAND elle cherche et ce qu'elle fait du coup trouve) :
//   - KAI : la recherche en JavaScript (moteur/ia.js), deroulee par TRANCHES de
//     quelques millisecondes sur ce fil — entre deux tranches le navigateur
//     fait avancer les pendules et repond aux clics ;
//   - KAI++ (phase 33bis) : le meme livre d'ouvertures, puis la recherche en
//     C++ dans son worker (interface/kai-plus.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : choisirCoupIA,
// textesDeLaSequence, coupDuLivre, poidsEnTexte, lireReponseKaiPlus,
// coupsDesPositions (moteur/ia.js), NIVEAUX_IA (moteur/ia-recherche.js),
// ecrirePosition (moteur/notation.js) viennent de fichiers charges avant
// celui-ci.

// Une tranche de recherche : court devant les 16 ms d'une image, pour que
// l'animation et les pendules restent fluides.
const DUREE_TRANCHE_MS = 12;
const MILLISECONDES_PAR_SECONDE = 1000;
// Le hasard des coups egaux de KAI++ : une graine entiere positive (32 bits signes).
const GRAINE_MAXIMUM = 2 ** 31;
// Tant que la machine est suspendue (boite du nom ouverte), on revient voir
// a ce rythme.
const ATTENTE_SUSPENSION_MS = 250;

// `recherche` : { etat, machine, suivi, debut, historique, livre, maintenant
// (horloge de la machine, sans le temps suspendu), estSuspendue(), encoreUtile(),
// jouer(resultat), finir() }.
function reflechirAvecKai({ etat, machine, suivi, debut, historique, livre, maintenant, estSuspendue, encoreUtile, jouer, finir }) {
  const generateur = choisirCoupIA(etat, {
    niveau: machine.niveau,
    poids: machine.poids,
    version: machine.version,
    base: livre,
    hasard: Math.random,
    maintenant,
    echeance: debut + machine.reflexionMax * MILLISECONDES_PAR_SECONDE,
    suivi,
    historique,
  });
  function tranche() {
    if (estSuspendue()) return setTimeout(tranche, ATTENTE_SUSPENSION_MS);
    if (!encoreUtile()) return finir();
    const finDeTranche = performance.now() + DUREE_TRANCHE_MS;
    let pas = generateur.next();
    while (!pas.done && performance.now() < finDeTranche) pas = generateur.next();
    if (!pas.done) return setTimeout(tranche, 0);
    jouer(pas.value);
  }
  setTimeout(tranche, 0);
}

// Elle rend des positions ; les coups en sont retrouves par les regles
// (moteur/ia.js, coupsDesPositions). La meme profondeur que KAI a niveau egal
// (NIVEAUX_IA), atteinte bien plus souvent dans le temps imparti. `enCours` (la reflexion en cours, interface/
// ia.js) recoit arreterTout() et abandonner() ; `kaiPlus` : le worker.
function reflechirAvecKaiPlus({ etat, machine, suivi, historique, livre, kaiPlus, enCours, jouer, finir }) {
  const duLivre = coupDuLivre(livre, etat, Math.random);
  if (duLivre) return jouer({ texte: duLivre.texte, source: 'livre', profondeur: 0, evaluation: null, noeuds: 0, sequence: [duLivre.texte] });
  let derniere = null; // la derniere profondeur annoncee
  let abandonnee = false;
  enCours.arreterTout = () => {
    if (derniere) kaiPlus.interrompre(); // sinon : a la premiere annonce, voir plus bas
  };
  enCours.abandonner = () => {
    abandonnee = true;
    kaiPlus.interrompre();
  };
  kaiPlus
    .chercher(
      {
        position: ecrirePosition(etat),
        joueurNoir: etat.joueurAuTrait === 'noir',
        profondeur: NIVEAUX_IA[machine.niveau].profondeur,
        poids: poidsEnTexte(machine.poids),
        version: machine.version,
        graine: Math.floor(Math.random() * GRAINE_MAXIMUM),
        dureeMs: machine.reflexionMax * MILLISECONDES_PAR_SECONDE,
        historique: historique.join('\n'),
      },
      (texte) => {
        const reponse = lireReponseKaiPlus(texte);
        if (!reponse) return;
        derniere = reponse;
        Object.assign(suivi, { profondeur: reponse.profondeur, evaluation: reponse.evaluation, noeuds: reponse.noeuds, sequence: coupsDesPositions(etat, reponse.positions) });
        if (suivi.arreter) kaiPlus.interrompre();
      }
    )
    .then((texte) => {
      const reponse = lireReponseKaiPlus(texte) ?? derniere;
      if (abandonnee || !reponse) return finir();
      const textes = textesDeLaSequence(etat, coupsDesPositions(etat, reponse.positions));
      jouer({ texte: textes[0], source: 'recherche', profondeur: reponse.profondeur, evaluation: reponse.evaluation, noeuds: reponse.noeuds, sequence: textes });
    });
}
