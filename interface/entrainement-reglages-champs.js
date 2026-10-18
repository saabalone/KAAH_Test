// Les CHAMPS du tableau des reglages de l'Entrainement (interface/entrainement-reglages.js) :
// les relire (une case decochee enleve la regle), changer une liste de jeux par sa boite
// (une liste, ou celles de toutes les ceintures d'un coup), et le sens du tableau. Extrait
// d'interface/entrainement-reglages.js (regle des 200 lignes).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : REGLE_ENTRAINEMENT,
// valeursProfilEntrainement (moteur/entrainement-profil.js), CEINTURES (moteur/entrainement.js),
// SECONDES_PAR_MINUTE_AFFICHEE (interface/entrainement-tableau.js) viennent de fichiers
// charges avant celui-ci.

// Les valeurs telles qu'affichees dans `conteneur` : une case decochee enleve la regle.
function lireLesChampsDesReglages(conteneur) {
  const regles = {};
  for (const element of conteneur.querySelectorAll('[data-ligne]')) {
    const cle = element.dataset.ligne;
    const regle = REGLE_ENTRAINEMENT[cle];
    const caseACocher = element.querySelector('[data-coche]');
    if (caseACocher && !caseACocher.checked) continue;
    const champValeur = element.querySelector('[data-valeur]');
    if (!champValeur) regles[cle] = true;
    else if (regle.sorte === 'mode' || regle.sorte === 'liste') regles[cle] = champValeur.value;
    else regles[cle] = Number(champValeur.value) * (regle.sorte === 'minutes' ? SECONDES_PAR_MINUTE_AFFICHEE : 1);
  }
  return valeursProfilEntrainement({ regles });
}

// Une liste de jeux (`bouton`, celui de sa cellule) : sa boite, `ouvrirListe` ; changee,
// elle est cochee d'office. Renvoie (promesse) si elle a change.
async function editerUneListeDeReglage(bouton, ouvrirListe, lectureSeule) {
  const cle = bouton.dataset.liste;
  const cellule = bouton.closest('[data-ligne]');
  const caseACocher = cellule.querySelector('[data-coche]');
  const actuelle = caseACocher.checked ? cellule.querySelector('[data-valeur]').value : undefined;
  const nouvelle = await ouvrirListe?.(cle, actuelle, lectureSeule);
  if (lectureSeule || nouvelle === null || nouvelle === undefined) return false;
  cellule.querySelector('[data-valeur]').value = nouvelle;
  caseACocher.checked = true;
  return true;
}

// Les listes de jeux (`sorte` : 'variantes' ou 'pzl') de toutes les ceintures, en un
// tableau (`ouvrirCeinturesJeux`) : celles qu'il change se reportent ici (cochees d'office).
// Renvoie (promesse) si l'une a change.
async function editerLesJeuxDesCeinturesDuTableau(conteneur, sorte, ouvrirCeinturesJeux, lectureSeule) {
  const cellules = CEINTURES.map((_, grade) => conteneur.querySelector(`[data-ligne="c${grade}${sorte}"]`));
  const actuelles = cellules.map((cellule) => (cellule.querySelector('[data-coche]').checked ? cellule.querySelector('[data-valeur]').value : undefined));
  const { regles } = lireLesChampsDesReglages(conteneur);
  const jeuxParSerie = CEINTURES.map((_, grade) => regles[`c${grade}jeux`] ?? regles.jeuxParSerie ?? 1);
  const nouvelles = await ouvrirCeinturesJeux?.(sorte, actuelles, jeuxParSerie, lectureSeule);
  if (lectureSeule || !nouvelles) return false;
  nouvelles.forEach((nouvelle, grade) => {
    if (nouvelle === undefined) return;
    cellules[grade].querySelector('[data-valeur]').value = nouvelle;
    cellules[grade].querySelector('[data-coche]').checked = true;
  });
  return true;
}

// Le sens du tableau des grades, retenu sur l'appareil (saab, 2026-10-11 : « mettre par
// défaut les ceintures en colonne, donc quand on clique Transposer ça inverse ») : les
// grades en colonnes, sauf si l'on a choisi les lignes.
const CLE_GRADES_EN_LIGNES = 'kaah-entrainement-grades-en-lignes';

function lireLesGradesEnColonnes() {
  try {
    return window.localStorage.getItem(CLE_GRADES_EN_LIGNES) !== 'oui';
  } catch {
    return true; // sans stockage : le sens de depart
  }
}

function retenirLesGradesEnColonnes(enColonnes) {
  try {
    window.localStorage.setItem(CLE_GRADES_EN_LIGNES, enColonnes ? 'non' : 'oui');
  } catch {
    // le sens ne survivra pas au rechargement
  }
}
