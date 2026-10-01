// La boite « Essai sur la position du plateau » de Reglages, rubrique Machine
// (saab, 2026-09-30 : « connaitre les poids calcules, afin de savoir ce qu'on
// doit modifier ... juste voir l'essai puis le valider si besoin »). Avec les
// poids AFFICHES — retouches en orange comprises, rien n'est enregistre — :
//   - la valeur d'une bille sur chacune des 9 cases distinctes ;
//   - les coups de la position du plateau, classes comme le niveau 2 les
//     classe, avec ce que chacun change a chaque terme de l'evaluation. Pour
//     faire passer un meilleur coup devant, on voit quel terme le penalise ;
//   - le coup du NIVEAU 3 (saab, 2026-10-01), cherche a cote par la vraie
//     recherche (moteur/ia.js), par tranches pour ne rien figer : trop long a
//     calculer pour chaque coup, il est seulement signale dans la liste.
// Toucher un coup le met en orange (le choisi, en vert, reste en haut) et le
// garde juste en dessous : on le voit remonter en retouchant les poids.
// Recalcule a chaque retouche, et a chaque changement de position du plateau
// tant que la boite est ouverte (on peut naviguer, voir index.html, case
// « Essai sur position »).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : essaiDesCoups,
// valeursDesCases, detailDeLEvaluation (moteur/essai-ia.js), etatsDeLaSequence
// (moteur/sequence-prevue.js), choisirCoupIA, libelleEvaluation,
// MACHINE_PAR_DEFAUT (moteur/ia.js), CLES_POIDS_IA, VALEUR_VICTOIRE_IA
// (moteur/ia-evaluation.js), CLES_POIDS_IA_V2 (moteur/ia-evaluation-v2.js),
// LIBELLES_REGLAGES_IA (moteur/historique-profil-ia.js), numeroDeTour
// (moteur/arbre.js), NOM_CAMP (rendu/ejections.js), DUREE_TRANCHE_MS,
// MILLISECONDES_PAR_SECONDE (interface/ia-reflexion.js) viennent de fichiers
// charges avant celui-ci.

const COLONNES_ESSAI_IA = {
  gain: 'Gain',
  perte: 'Perte',
  centre: 'Centre',
  cohesion: 'Cohés.',
  bordSoi: 'Bord m.',
  bordAdverse: 'Bord a.',
  sumito: 'Sumito',
  menaceEjection: 'Menace',
  fourchette: 'Fourch.',
};
const NIVEAU_RECHERCHE_ESSAI = 3;
const VERIFICATION_POSITION_ESSAI_MS = 300;
const DECIMALES_DUREE_ESSAI = 1;

function texteValeurEssai(valeur) {
  if (Math.abs(valeur) >= VALEUR_VICTOIRE_IA / 2) return valeur > 0 ? 'Gagne' : 'Perd';
  const arrondi = Math.round(valeur);
  return arrondi > 0 ? `+${arrondi}` : arrondi === 0 ? '·' : String(arrondi);
}

function ligneDeTableau(cellules, balise = 'td') {
  const tr = document.createElement('tr');
  for (const contenu of cellules) {
    const cellule = document.createElement(balise);
    cellule.textContent = contenu;
    tr.appendChild(cellule);
  }
  return tr;
}

// `elements` : { boite (<details>), position (<p>), niveau3 (<p>), cases
// (<table>), coups (<table>), creer (bouton « Créer Es_ ») } ;
// `obtenirEtat()` : la position du plateau et son nombre de coups joues,
// { etat, coupsJoues }, ou null ; `creerEssai(texte, valeurs)` : la copie
// « Es_ » avec ce coup (index.html, creerPartieEssai). Renvoie
// { actualiser(valeurs) } — `valeurs` : { nom, version, style, poids } (le
// brouillon ou le profil).
function demarrerEssaiIA(elements, obtenirEtat, creerEssai) {
  let valeursMontrees = null;
  let etatMontre = null;
  let coupChoisi = null; // le texte du coup touche (en orange), sur etatMontre
  let rechercheEnCours = 0; // numero de la recherche du niveau 3 qui compte encore
  let niveau3 = null; // { texte, evaluation, sequence } : le coup du niveau 3, une fois trouve

  elements.creer.addEventListener('click', () => {
    if (coupChoisi) creerEssai(coupChoisi, valeursMontrees);
  });

  function afficherCases(poids) {
    const cases = valeursDesCases(poids);
    elements.cases.replaceChildren(
      ligneDeTableau(['Case', ...cases.map((c) => c.notation)], 'th'),
      ligneDeTableau(['Les miennes', ...cases.map((c) => texteValeurEssai(c.miennes))]),
      ligneDeTableau(['Adverses', ...cases.map((c) => texteValeurEssai(c.adverses))]),
      ligneDeTableau(['Voisines', ...cases.map((c) => String(c.voisines))])
    );
  }

  function afficherCoups({ version, poids }, etat) {
    const cles = version >= 2 ? [...CLES_POIDS_IA, ...CLES_POIDS_IA_V2] : CLES_POIDS_IA;
    const essai = essaiDesCoups(etat, poids, version);
    const entete = ligneDeTableau(['#', 'Coup', 'Niv. 3', 'Niv. 2', 'Niv. 1', ...cles.map((cle) => COLONNES_ESSAI_IA[cle])], 'th');
    cles.forEach((cle, rang) => (entete.children[rang + 5].title = LIBELLES_REGLAGES_IA[cle]));
    const actuelle = ligneDeTableau(['', 'Position', '', '', '', ...cles.map((cle) => texteValeurEssai(essai.detail[cle] ?? 0))]);
    actuelle.className = 'essai-position-actuelle';
    actuelle.title = 'Les termes de la position actuelle ; en dessous, ce que chaque coup y ajoute';
    const lignes = essai.coups.map((ligne, rang) => {
      const duNiveau3 = ligne.texte === niveau3?.texte;
      const tr = ligneDeTableau([String(rang + 1), ligne.texte, duNiveau3 ? texteValeurEssai(niveau3.evaluation) : '', texteValeurEssai(ligne.deuxCoups), texteValeurEssai(ligne.unCoup), ...cles.map((cle) => texteValeurEssai(ligne.ecarts[cle] ?? 0))]);
      tr.dataset.coup = ligne.texte;
      tr.classList.toggle('essai-coup-choisi', rang === 0);
      tr.classList.toggle('essai-coup-touche', ligne.texte === coupChoisi && rang > 0);
      tr.classList.toggle('essai-coup-niveau-3', duNiveau3);
      tr.title = 'Toucher pour suivre ce coup (en orange)';
      tr.addEventListener('click', () => {
        coupChoisi = coupChoisi === ligne.texte ? null : ligne.texte;
        afficherCoups(valeursMontrees, etat);
      });
      return tr;
    });
    // Sous le choisi (vert), pour les comparer d'un coup d'oeil : le coup du
    // niveau 3 et ce qu'il donne AU BOUT de sa sequence (la position que le
    // niveau 3 a reellement evaluee, terme par terme), puis le coup touche.
    const remonter = (texte) => {
      const index = lignes.findIndex((tr, rang) => rang > 0 && tr.dataset.coup === texte);
      return index > 0 ? lignes.splice(index, 1) : [];
    };
    const enTete = [...remonter(niveau3?.texte), ...(niveau3 ? [ligneFinDeSequence(niveau3, etat, cles, essai.detail, { version, poids })] : []), ...remonter(coupChoisi)];
    lignes.splice(1, 0, ...enTete);
    elements.coups.replaceChildren(entete, actuelle, ...lignes);
    elements.creer.disabled = !coupChoisi;
  }

  // La position au bout de la sequence du niveau 3 : ses termes, moins ceux de
  // la position actuelle (ce que la sequence entiere change).
  function ligneFinDeSequence(trouve, etat, cles, detailActuel, { version, poids }) {
    const fin = etatsDeLaSequence(etat, trouve.sequence).at(-1);
    const detailFin = detailDeLEvaluation(fin, etat.joueurAuTrait, poids, version);
    const tr = ligneDeTableau(['', `→ ${trouve.sequence.length} coups`, texteValeurEssai(trouve.evaluation), '', '', ...cles.map((cle) => texteValeurEssai((detailFin[cle] ?? 0) - (detailActuel[cle] ?? 0)))]);
    tr.className = 'essai-fin-de-sequence';
    tr.title = `Au bout de la séquence du niveau ${NIVEAU_RECHERCHE_ESSAI} (${trouve.sequence.join(' ')}) : ce qui a changé, terme par terme`;
    return tr;
  }

  // Le coup du niveau 3, par la vraie recherche, par tranches (comme la
  // machine, interface/ia-reflexion.js) ; abandonnee des qu'une autre
  // commence (retouche, autre position).
  function chercherNiveau3({ version, poids }, etat) {
    const numero = ++rechercheEnCours;
    niveau3 = null;
    const debut = performance.now();
    elements.niveau3.textContent = `Niveau ${NIVEAU_RECHERCHE_ESSAI} : cherche…`;
    const generateur = choisirCoupIA(etat, {
      niveau: NIVEAU_RECHERCHE_ESSAI,
      poids,
      version,
      base: null,
      hasard: () => 0,
      maintenant: () => performance.now(),
      echeance: debut + MACHINE_PAR_DEFAUT.reflexionMax * MILLISECONDES_PAR_SECONDE,
    });
    function tranche() {
      if (numero !== rechercheEnCours) return;
      const finDeTranche = performance.now() + DUREE_TRANCHE_MS;
      let pas = generateur.next();
      while (!pas.done && performance.now() < finDeTranche) pas = generateur.next();
      if (!pas.done) return setTimeout(tranche, 0);
      const { texte, profondeur, evaluation, sequence } = pas.value;
      const duree = ((performance.now() - debut) / MILLISECONDES_PAR_SECONDE).toFixed(DECIMALES_DUREE_ESSAI);
      niveau3 = { texte, evaluation, sequence };
      elements.niveau3.textContent = `Niveau ${NIVEAU_RECHERCHE_ESSAI} (${profondeur} coups d'avance, ${duree} s) : ${texte}, ${libelleEvaluation(evaluation)} — séquence ${sequence.join(' ')}`;
      afficherCoups(valeursMontrees, etat);
    }
    setTimeout(tranche, 0);
  }

  function afficher() {
    const valeurs = valeursMontrees;
    const position = obtenirEtat();
    if (position?.etat !== etatMontre) coupChoisi = null;
    etatMontre = position?.etat ?? null;
    afficherCases(valeurs.poids);
    if (!position || position.etat.vainqueur) {
      rechercheEnCours++;
      elements.position.textContent = 'Pas de coup à essayer sur la position du plateau.';
      elements.niveau3.textContent = '';
      elements.coups.replaceChildren();
      return;
    }
    elements.position.textContent = `${NOM_CAMP[position.etat.joueurAuTrait]} joue (tour ${numeroDeTour(position.coupsJoues + 1)}). En vert, le coup du niveau 2 ; « Niv. 2 » : après la meilleure réponse ; les termes : ce que le coup change. Encadré : le coup du niveau ${NIVEAU_RECHERCHE_ESSAI}.`;
    afficherCoups(valeurs, position.etat);
    chercherNiveau3(valeurs, position.etat);
  }

  function actualiser(valeurs) {
    valeursMontrees = valeurs;
    if (elements.boite.open) afficher();
  }

  elements.boite.addEventListener('toggle', () => {
    if (elements.boite.open && valeursMontrees) afficher();
  });

  // La position du plateau a change (navigation, coup joue) : l'essai suit,
  // tant qu'on le voit.
  setInterval(() => {
    if (!valeursMontrees || !elements.boite.open || elements.boite.closest('dialog')?.open === false) return;
    if (obtenirEtat()?.etat !== etatMontre) afficher();
  }, VERIFICATION_POSITION_ESSAI_MS);

  return { actualiser };
}
