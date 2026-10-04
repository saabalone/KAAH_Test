// Les infos d'une case du plateau (saab, 2026-10-04) :
//   - au SURVOL, sur ordinateur : « que ca affiche des valeurs (comme celles
//     dans KAAWA) » — sa notation, ses coordonnees axiales, ce qui l'occupe —,
//     au-dessus a droite de la souris ;
//   - au CLIC DROIT sur une bille, son panneau (interface/panneau-flottant.js,
//     contenu : interface/panneau-bille.js) a cote du plateau, sur la ligne e,
//     deplacable : ce qu'elle apporte a chaque terme, pour un ou plusieurs
//     profils IA, et ses mesures ;
//   - son bouton AIRE : un contour dessine en glissant (interface/
//     aire-plateau.js), dont la position est evaluee pour le camp de la bille
//     (moteur/aire-ia.js) ; un clic droit sur une bille de l'AUTRE camp ouvre
//     la meme aire pour lui, dans un 2e panneau colle au 1er (saab : « pour
//     comparer »).
// « Et je peux choisir ce que je veux afficher » : le bouton ⚙ ; CET appareil
// retient le choix.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : COORDONNEES_DES_CASES_IA
// (moteur/ia-evaluation-v3.js), termesDeLaVersion (moteur/essai-ia.js),
// detailDeLaBille (moteur/bille-ia.js), detailDeLAire (moteur/aire-ia.js),
// NOM_CAMP (rendu/ejections.js), COLONNES_ESSAI_IA (interface/essai-ia.js),
// listerProfilsIA, libelleProfilIA (interface/profils-ia.js), celluleBille,
// LIGNES_MESURES_BILLE, lignesMesuresAire, tableauDesTermes, tableauDesMesures,
// zoneDuChoixBille (interface/panneau-bille.js), creerPanneauFlottant
// (interface/panneau-flottant.js), demarrerAirePlateau (interface/
// aire-plateau.js), ecrirePosition (moteur/notation.js), lireReponsePiege
// (moteur/sortie-bille.js), creerKaiPlus (interface/kai-plus.js) viennent de
// fichiers charges avant celui-ci.

const CLE_INFOS_CASE = 'kaah-infos-case';
// Le piege (KAI++, solveur/kai-plus.cpp) : 4 coups de la bille au plus, et une
// limite de positions (environ 2 secondes) — au-dela, « trop long ».
const COUPS_MAX_PIEGE = 4;
const POSITIONS_MAX_PIEGE = 400000;
const ECART_AU_CURSEUR_PX = 14;
const VERSION_LA_PLUS_COMPLETE_IA = 4;
const CHAMPS_SURVOL_CASE = { notation: 'Notation', axiales: 'Coordonnées axiales (q,r)', occupant: 'Bille (Noir, Blanc, vide)' };

function lireChoixInfosCase() {
  try {
    return { profils: [], ...JSON.parse(window.localStorage.getItem(CLE_INFOS_CASE) ?? '{}') };
  } catch {
    return { profils: [] };
  }
}

function retenirChoixInfosCase(choix) {
  try {
    window.localStorage.setItem(CLE_INFOS_CASE, JSON.stringify(choix));
  } catch {
    // Tant pis : tout sera montre la prochaine fois.
  }
}

const boutonDePanneau = (texte, titre) => {
  const bouton = celluleBille('button', texte, titre);
  bouton.type = 'button';
  return bouton;
};

// `svg` : le plateau ; `obtenirEtat()` : la position affichee ; `poidsPour(camp)` :
// { nom, poids, version } de la machine qui juge pour ce camp.
function demarrerInfosCase(svg, obtenirEtat, poidsPour) {
  let choix = lireChoixInfosCase();
  // La bille touchee ({ notation, camp }) ou l'aire de ce camp ({ camp, cases }) ;
  // et le camp de la comparaison (meme aire), ou null.
  let montre = null;
  let campCompare = null;
  let choixOuvert = false;

  const infobulle = document.createElement('div');
  infobulle.className = 'infobulle-case';
  infobulle.hidden = true;
  document.body.append(infobulle);
  const boutonAire = boutonDePanneau('Aire', 'Dessiner une aire : appuyer sur une case et glisser, le trait suit les cases survolées ; relâcher la ferme');
  const boutonChoix = boutonDePanneau('⚙', 'Choisir les lignes, les profils IA et les champs du survol');
  const boutonFermer = boutonDePanneau('×', 'Fermer');
  const boutonFermerComparaison = boutonDePanneau('×', 'Fermer la comparaison');
  const comparaison = creerPanneauFlottant([boutonFermerComparaison]);
  const principal = creerPanneauFlottant([boutonAire, boutonChoix, boutonFermer], () => {
    if (!comparaison.element.hidden) comparaison.collerA(principal);
  });

  // Le piege, calcule dans son propre worker (la machine qui joue n'attend
  // jamais) : les reponses gardees par position, trait et case.
  const kaiPiege = creerKaiPlus();
  const pieges = new Map();
  let piegeEnCours = null;

  function piegeDe(etat, notation, detail) {
    if (detail.sortie === null) return null;
    const cle = `${ecrirePosition(etat)} ${etat.joueurAuTrait} ${notation}`;
    if (pieges.has(cle)) return pieges.get(cle);
    if (piegeEnCours !== cle) {
      if (piegeEnCours) kaiPiege.interrompre();
      piegeEnCours = cle;
      kaiPiege
        .chercher({ type: 'piege', position: ecrirePosition(etat), joueurNoir: etat.joueurAuTrait === 'noir', notation, coupsMax: COUPS_MAX_PIEGE, limite: POSITIONS_MAX_PIEGE }, () => {})
        .then((texte) => {
          if (piegeEnCours !== cle) return; // interrompu par une autre demande
          piegeEnCours = null;
          pieges.set(cle, lireReponsePiege(texte) ?? { etat: 'erreur' });
          if (!principal.element.hidden) remplir();
        });
    }
    return { etat: 'calcul' };
  }

  const aire = demarrerAirePlateau(svg, (cases) => {
    montre = { camp: montre.camp, cases };
    remplir();
  });

  const caseSous = (evenement) => evenement.target.closest?.('[data-notation]')?.dataset.notation ?? null;
  const estUneCase = (notation) => Boolean(notation && COORDONNEES_DES_CASES_IA[notation]);

  // ---- Survol ----
  function texteDuSurvol(notation) {
    const { q, r } = COORDONNEES_DES_CASES_IA[notation];
    const occupant = obtenirEtat()?.plateau[notation]?.couleur;
    const morceaux = { notation, axiales: `(${q},${r})`, occupant: occupant ? NOM_CAMP[occupant] : 'vide' };
    return Object.keys(CHAMPS_SURVOL_CASE).filter((cle) => choix[`survol-${cle}`] !== false).map((cle) => morceaux[cle]).join(' ');
  }

  svg.addEventListener('pointermove', (evenement) => {
    if (evenement.pointerType !== 'mouse' || aire.enCours()) return;
    const notation = caseSous(evenement);
    const texte = estUneCase(notation) ? texteDuSurvol(notation) : '';
    infobulle.hidden = texte === '';
    if (texte === '') return;
    infobulle.textContent = texte;
    // Au-dessus a droite de la souris (saab, 2026-10-04).
    infobulle.style.left = `${Math.max(0, Math.min(evenement.clientX + ECART_AU_CURSEUR_PX, window.innerWidth - infobulle.offsetWidth))}px`;
    infobulle.style.top = `${Math.max(0, evenement.clientY - ECART_AU_CURSEUR_PX - infobulle.offsetHeight)}px`;
  });
  svg.addEventListener('pointerleave', () => (infobulle.hidden = true));

  // ---- Panneaux ----
  // Les profils dont on montre les poids : la machine du camp, puis ceux choisis.
  function sourcesPour(camp) {
    const machine = poidsPour(camp);
    const choisis = listerProfilsIA()
      .filter((profil) => choix.profils.includes(profil.nom) && profil.nom !== machine.nom)
      .map((profil) => ({ nom: libelleProfilIA(profil), poids: profil.poids, version: profil.version }));
    return [machine, ...choisis];
  }

  function zoneDuChoix() {
    const coche = (cle) => choix[cle] !== false;
    return zoneDuChoixBille(
      [
        ['Termes', termesDeLaVersion(VERSION_LA_PLUS_COMPLETE_IA).map((terme) => [`terme-${terme}`, COLONNES_ESSAI_IA[terme], coche(`terme-${terme}`)])],
        ['Profils IA (en plus de la machine)', listerProfilsIA().map((profil) => [`profil:${profil.nom}`, libelleProfilIA(profil), choix.profils.includes(profil.nom)])],
        ['Mesures', Object.entries(LIGNES_MESURES_BILLE).map(([cle, [libelle]]) => [cle, libelle, coche(cle)])],
        ['Au survol', Object.entries(CHAMPS_SURVOL_CASE).map(([cle, libelle]) => [`survol-${cle}`, libelle, coche(`survol-${cle}`)])],
      ],
      (cle, coche) => {
        const nom = cle.startsWith('profil:') ? cle.slice('profil:'.length) : null;
        choix = nom ? { ...choix, profils: coche ? [...choix.profils, nom] : choix.profils.filter((autre) => autre !== nom) } : { ...choix, [cle]: coche };
        retenirChoixInfosCase(choix);
        remplir();
      }
    );
  }

  // Le tableau des termes (une colonne par profil) et les mesures, pour `camp`.
  function contenuPour(camp) {
    const etat = obtenirEtat();
    const sources = sourcesPour(camp);
    const version = Math.max(...sources.map((source) => source.version));
    const colonnes = sources.map((source) => ({
      nom: source.nom,
      detail: montre.cases ? detailDeLAire(etat, montre.cases, camp, source.poids, source.version) : detailDeLaBille(etat, montre.notation, source.poids, source.version),
    }));
    if (!montre.cases) colonnes[0].detail.piege = piegeDe(etat, montre.notation, colonnes[0].detail);
    const mesures = montre.cases ? tableauDesMesures(lignesMesuresAire(camp), colonnes[0].detail, {}) : tableauDesMesures(LIGNES_MESURES_BILLE, colonnes[0].detail, choix);
    return [tableauDesTermes(colonnes, version, choix), mesures];
  }

  function remplir() {
    const morceaux = [];
    if (montre.camp) {
      principal.titre.textContent = montre.cases ? `Aire · ${NOM_CAMP[montre.camp]}` : `${montre.notation} · ${NOM_CAMP[montre.camp]}`;
      morceaux.push(...contenuPour(montre.camp));
    } else {
      principal.titre.textContent = `${montre.notation} · vide`;
    }
    // Saab, 2026-10-04 : « je faisais l'analyse sur une game over » — tout vaut 0.
    if (obtenirEtat()?.vainqueur) morceaux.unshift(celluleBille('p', 'Partie finie : la machine ne compte plus que la victoire, tous les termes valent 0.'));
    if (aire.enCours()) morceaux.push(celluleBille('p', 'Appuyez sur une case et glissez : le trait suit les cases survolées ; relâchez pour fermer (Échap : annuler).'));
    if (montre.cases) morceaux.push(celluleBille('p', 'Clic droit sur une bille adverse : la même aire pour son camp, à côté.'));
    if (choixOuvert) morceaux.push(zoneDuChoix());
    principal.corps.replaceChildren(...morceaux);
    // L'aire est celle d'un camp : il faut d'abord avoir touche une de ses billes.
    boutonAire.disabled = !montre.camp;
    principal.recadrer();
    comparaison.element.hidden = !(montre.cases && campCompare);
    if (comparaison.element.hidden) return;
    comparaison.titre.textContent = `Aire · ${NOM_CAMP[campCompare]}`;
    comparaison.corps.replaceChildren(...contenuPour(campCompare));
    comparaison.collerA(principal);
  }

  function fermer() {
    principal.element.hidden = true;
    comparaison.element.hidden = true;
    aire.effacer();
    montre = null;
    campCompare = null;
  }

  svg.addEventListener('contextmenu', (evenement) => {
    const notation = caseSous(evenement);
    if (!estUneCase(notation) || aire.enCours()) return;
    evenement.preventDefault();
    infobulle.hidden = true;
    const camp = obtenirEtat()?.plateau[notation]?.couleur ?? null;
    if (montre?.cases && camp && camp !== montre.camp) {
      campCompare = camp;
      return remplir();
    }
    aire.effacer();
    montre = { notation, camp };
    campCompare = null;
    principal.element.hidden = false;
    remplir();
    principal.placerAuBordDuPlateau(svg);
  });
  boutonAire.addEventListener('click', () => {
    montre = { camp: montre.camp, notation: montre.notation };
    campCompare = null;
    aire.commencer();
    remplir();
  });
  boutonChoix.addEventListener('click', () => {
    choixOuvert = !choixOuvert;
    remplir();
  });
  boutonFermer.addEventListener('click', fermer);
  boutonFermerComparaison.addEventListener('click', () => {
    campCompare = null;
    remplir();
  });
  document.addEventListener('keydown', (evenement) => {
    if (evenement.key !== 'Escape' || principal.element.hidden) return;
    if (aire.enCours()) {
      aire.effacer();
      remplir();
    } else fermer();
  });
}
