// Le GRAPHIQUE DES 4 GROUPES de l'evaluation (saab, 2026-10-14 : « faire un graphique avec
// 4 courbes : Attaque, Compacité, Cohésion, Matériel » ; 2026-10-15 : « c'est la part de
// chaque groupe dans l'évaluation au fil des tours d'une partie ») : la part de chaque
// groupe (moteur/ia-groupes.js) a chaque coup de la ligne regardee, pour un profil et un
// camp ; un curseur choisit un coup et dit ses 4 valeurs (rien au survol seul).
//
// Saab, 2026-10-15 : « un btn pour basculer en pourcentage » ; « que la partie sur le
// plateau suive le curseur ». 2026-10-16 : « pouvoir afficher sur n'importe quelle partie
// en cours ces courbes et barres ... à chaque clic sur plateau il disparaît ; on pourrait
// l'afficher à la place (ou par-dessus) le tableau des séquences, à l'extérieur du
// plateau pour être toujours visible » — un PANNEAU de la colonne de droite (comme
// Conseils, jamais une boite qui recouvre le plateau), au-dessus de la Sequence ; il suit
// la partie a chaque coup et a chaque navigation. Le dessin : interface/graphique-groupes-
// dessin.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : GROUPES_DE_L_EVALUATION_IA,
// partsDesGroupes, pourcentagesDesGroupes, barresDesGroupes, fenetreDuGraphique,
// ligneSuivieParLeGraphique, ejectionsDeLaLigne (moteur/ia-groupes.js), detailDeLEvaluation
// (moteur/essai-ia.js), lireMachine (moteur/ia.js), ecrirePosition (moteur/notation.js),
// etatsDeLaSequence (moteur/sequence-prevue.js), listerProfilsIA (interface/profils-ia.js),
// remplirListeProfils, profilDuChoix (interface/liste-profils-choix.js), svgDesCourbes, coupSousLaFraction,
// htmlDesBarres (interface/graphique-groupes-dessin.js), brancherLaBoiteDesBarres
// (interface/graphique-groupes-barres.js) viennent de fichiers charges avant celui-ci.

// L'ecart du zoom, retenu sur l'appareil (« on pourra régler ce nb »).
const CLE_ECART_GRAPHIQUE = 'kaah-graphique-groupes-ecart';
const ECART_GRAPHIQUE_PAR_DEFAUT = 10;
const PROFIL_GRAPHIQUE_PAR_DEFAUT = nomDuProfilIAParDefaut(); // interface/profils-ia.js

function lireEcartDuGraphique() {
  try {
    const brut = window.localStorage.getItem(CLE_ECART_GRAPHIQUE);
    return brut !== null && Number.isInteger(Number(brut)) && Number(brut) >= 0 ? Number(brut) : ECART_GRAPHIQUE_PAR_DEFAUT;
  } catch {
    return ECART_GRAPHIQUE_PAR_DEFAUT;
  }
}

// La position de depart d'une sequence se reconnait a sa position ecrite et au trait.
const clefDeLaPosition = (etat) => `${ecrirePosition(etat)}|${etat.joueurAuTrait}`;

// `elements` : { bouton (« Graphique », dans Reglages), icone (Graphique, avec Seq/Com/Occ :
// ouvre et ferme), reglages (cette boite : elle se ferme), panneau, profil, camp (un bouton :
// un clic passe a l'autre camp), ecart, pourcentage, barres (le bouton), coup (range),
// valeurs, zone, dessin, tableauBarres, fermer } ; `partie` : { arbre() (l'arbre de la
// partie), etatDuChemin(chemin), allerAuChemin(chemin) (le plateau y va),
// suivreSurLePetitPlateau(depart, textes, rang) (interface/sequence-prevue.js) }.
// Renvoie { actualiser() : a chaque coup ou navigation (index.html) ; montrerUneSequence
// (etat, textes, titre, ouvrirSiFerme) : une sequence proposee (Reflexion IA, Recherche,
// Conseils) au bout de la ligne qui mene a `etat` }.
function demarrerGraphiqueDesGroupes(elements, partie) {
  let ligne = null; // le chemin jusqu'au bout de la ligne suivie
  // Une sequence proposee (saab, 2026-10-16 : « clic sur chaque coup proposé (et sa
  // séquence) pour voir 4 groupes sur la séquence ») : { depart (son etat), etats (ceux
  // qu'elle donne), titre, horsPartie (sa position n'est pas sur la ligne regardee) }.
  let sequence = null;
  let details = []; // le detail de l'evaluation a chaque position montree
  let ejections = []; // les ejections de ces positions (moteur/ia-groupes.js, ejectionsDeLaLigne)
  let enPourcentage = false;
  let avecBarres = true;
  elements.ecart.value = String(lireEcartDuGraphique());

  const ouvert = () => !elements.panneau.hidden;
  const machineChoisie = () => {
    const profil = profilDuChoix(elements.profil.value) ?? listerProfilsIA()[0];
    return lireMachine({ version: profil.version, style: profil.style, elagage: profil.elagage, poids: profil.poids });
  };
  // Le rang de la premiere position proposee (avant : celles de la partie), ou null.
  const debutDeLaSequence = () => (sequence ? (sequence.horsPartie ? 1 : ligne.length + 1) : null);

  // Le detail de chaque position montree, pour le profil et le camp choisis : la ligne de
  // la partie, puis la sequence proposee.
  function calculer() {
    const machine = machineChoisie();
    const etatsDeLaLigne = sequence?.horsPartie ? [sequence.depart] : Array.from({ length: ligne.length + 1 }, (_, rang) => partie.etatDuChemin(ligne.slice(0, rang)));
    const etats = [...etatsDeLaLigne, ...(sequence?.etats ?? [])];
    details = etats.map((etat) => detailDeLEvaluation(etat, elements.camp.value, machine.poids, machine.version));
    ejections = ejectionsDeLaLigne(etats);
    elements.coup.max = String(details.length - 1);
  }

  function dessiner() {
    const rang = Math.min(Number(elements.coup.value) || 0, details.length - 1);
    const courbes = details.map(partsDesGroupes);
    const montrees = enPourcentage ? courbes.map(pourcentagesDesGroupes) : courbes;
    const toutes = montrees.flatMap((parts) => Object.values(parts));
    const axe = enPourcentage ? { bas: 0, haut: 100, enPourcentage } : { bas: Math.min(0, ...toutes), haut: Math.max(0, ...toutes), enPourcentage };
    const fenetre = fenetreDuGraphique(rang, courbes.length, Math.max(0, Math.round(Number(elements.ecart.value) || 0)));
    elements.dessin.innerHTML = svgDesCourbes(montrees, rang, fenetre, { ...axe, debutProjete: debutDeLaSequence(), ejections, camp: elements.camp.value });
    elements.dessin.dataset.debut = String(fenetre.debut);
    elements.dessin.dataset.fin = String(fenetre.fin);
    const parts = courbes[rang] ?? {};
    const pourcentages = pourcentagesDesGroupes(parts);
    const titre = sequence ? `<button class="bouton-dialogue bouton-danger" type="button" data-quitter-sequence title="Revient aux courbes de la partie">✕</button> <b>${sequence.titre}</b> (en pointillé) — ` : '';
    elements.valeurs.innerHTML = `${titre}Coup ${rang} : ${GROUPES_DE_L_EVALUATION_IA.map(({ cle, libelle, couleur }) => `<span style="color:${couleur}">${libelle} ${Math.round(parts[cle] ?? 0)} (${Math.round(pourcentages[cle] ?? 0)} %)</span>`).join(' · ')}`;
    elements.tableauBarres.hidden = !avecBarres;
    if (avecBarres) elements.tableauBarres.querySelector('.contenu-barres-groupes').innerHTML = htmlDesBarres(barresDesGroupes(details[rang] ?? {}));
  }

  // A chaque coup ou navigation : la ligne suivie (la meme tant qu'on y navigue, sequence
  // proposee comprise) et le curseur sur la position regardee.
  function actualiser() {
    if (!ouvert()) return;
    const regarde = partie.arbre().chemin;
    const suivie = sequence?.horsPartie ? regarde : ligneSuivieParLeGraphique(ligne ?? [], regarde);
    if (suivie !== ligne) {
      ligne = [...suivie];
      sequence = null;
      calculer();
    }
    elements.coup.value = String(regarde.length);
    dessiner();
  }

  // Le plateau suit le curseur sur la ligne de la partie (actualiser suit) ; dans une
  // sequence proposee, seules les courbes le suivent.
  // Dans une sequence proposee, le petit plateau suit aussi (s'il la montre ; `depuisLePetitPlateau` :
  // c'est lui qui demande).
  function allerAuCoup(rang, depuisLePetitPlateau = false) {
    elements.coup.value = String(rang);
    if (!sequence?.horsPartie && rang <= ligne.length) partie.allerAuChemin(ligne.slice(0, rang));
    if (sequence && !depuisLePetitPlateau) partie.suivreSurLePetitPlateau?.(sequence.depart, sequence.textes, Math.max(0, rang - (debutDeLaSequence() - 1)));
    dessiner();
  }

  function recalculer() {
    calculer();
    dessiner();
  }

  function ouvrir() {
    // La liste des profils du choix d'un joueur, anciennes versions comprises.
    remplirListeProfils(elements.profil, { voulue: elements.profil.value || PROFIL_GRAPHIQUE_PAR_DEFAUT, filtreStyle: '' });
    elements.reglages.close();
    elements.panneau.hidden = false;
    elements.icone.classList.add('bouton-actif');
    elements.tableauBarres.hidden = !avecBarres;
    [ligne, sequence] = [null, null];
    actualiser();
  }

  // La sequence `textes` depuis `etat` : au bout de la ligne qui y mene (la position
  // regardee ou une d'avant), sinon seule ; le curseur sur sa position de depart.
  function montrerUneSequence(etat, textes, titre, ouvrirSiFerme) {
    if (!ouvert() && !ouvrirSiFerme) return;
    if (!ouvert()) ouvrir();
    const regarde = partie.arbre().chemin;
    let rang = regarde.length;
    while (rang >= 0 && clefDeLaPosition(partie.etatDuChemin(regarde.slice(0, rang))) !== clefDeLaPosition(etat)) rang--;
    ligne = rang >= 0 ? regarde.slice(0, rang) : [];
    sequence = { depart: etat, textes, etats: etatsDeLaSequence(etat, textes).slice(1), titre, horsPartie: rang < 0 };
    calculer();
    elements.coup.value = String(debutDeLaSequence() - 1);
    dessiner();
  }

  // Le coup `rang` de la sequence proposee (le petit plateau, interface/sequence-prevue.js).
  function suivreLaSequence(rang) {
    if (!ouvert() || !sequence) return;
    allerAuCoup(debutDeLaSequence() - 1 + rang, true);
  }

  // Fermer cache aussi les barres sorties du panneau.
  function fermer() {
    elements.panneau.hidden = true;
    elements.tableauBarres.hidden = true;
    elements.icone.classList.remove('bouton-actif');
  }
  elements.bouton.addEventListener('click', ouvrir);
  elements.icone.addEventListener('click', () => (ouvert() ? fermer() : ouvrir()));
  elements.fermer.addEventListener('click', fermer);
  elements.profil.addEventListener('change', recalculer);
  elements.camp.addEventListener('click', () => {
    elements.camp.value = elements.camp.value === 'noir' ? 'blanc' : 'noir';
    elements.camp.textContent = elements.camp.value === 'noir' ? 'Noir' : 'Blanc';
    recalculer();
  });
  elements.coup.addEventListener('input', () => allerAuCoup(Number(elements.coup.value) || 0));
  elements.ecart.addEventListener('change', () => {
    try {
      window.localStorage.setItem(CLE_ECART_GRAPHIQUE, elements.ecart.value);
    } catch {
      // le zoom ne survivra pas au rechargement
    }
    dessiner();
  });
  elements.pourcentage.addEventListener('click', () => {
    enPourcentage = !enPourcentage;
    elements.pourcentage.textContent = enPourcentage ? 'En valeurs' : 'En %';
    dessiner();
  });
  // Barres : orange quand elles sont affichees, vert sinon (saab, 2026-10-16).
  function montrerLesBarres(oui) {
    avecBarres = oui;
    elements.barres.classList.toggle('bouton-allume', oui);
    elements.barres.classList.toggle('bouton-a-faire', !oui);
    dessiner();
  }
  elements.barres.addEventListener('click', () => montrerLesBarres(!avecBarres));
  elements.tableauBarres.addEventListener('click', (evenement) => {
    if (evenement.target.closest('[data-cacher-barres]')) montrerLesBarres(false);
  });
  elements.valeurs.addEventListener('click', (evenement) => {
    if (!evenement.target.closest('[data-quitter-sequence]')) return;
    [ligne, sequence] = [null, null];
    actualiser();
  });
  // Toucher les courbes : le coup sous le doigt.
  elements.dessin.addEventListener('click', (evenement) => {
    const cadre = elements.dessin.getBoundingClientRect();
    const fenetre = { debut: Number(elements.dessin.dataset.debut), fin: Number(elements.dessin.dataset.fin) };
    allerAuCoup(coupSousLaFraction((evenement.clientX - cadre.left) / cadre.width, fenetre));
  });
  brancherLaBoiteDesBarres(elements.tableauBarres, elements.zone);
  elements.barres.classList.add('bouton-allume');
  return { actualiser, montrerUneSequence, suivreLaSequence, ouvert, fermer };
}
