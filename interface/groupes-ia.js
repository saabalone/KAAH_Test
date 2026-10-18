// Les GROUPES de l'evaluation A L'ECRAN (saab, 2026-10-16 : « dans la boîte Aire/Plateau et
// autres endroits où il y a la liste de réglage, mettre les paramètres dans l'ordre des
// groupes (avec nom du groupe Attaque/Compacité/...), avec les labels de la couleur de sa
// courbe »). L'ordre lui-meme est dans moteur/ia-groupes.js ; ici, le titre de chaque
// groupe et sa couleur, pour les listes (Reglages) et les tableaux (panneaux, Comparer,
// banc).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : GROUPES_DE_L_EVALUATION_IA,
// REGLAGE_DE_RECHERCHE_IA, groupeDuReglage, groupeDuTerme (moteur/ia-groupes.js)
// viennent de fichiers charges avant celui-ci.

const GROUPES_ET_RECHERCHE_IA = [...GROUPES_DE_L_EVALUATION_IA, REGLAGE_DE_RECHERCHE_IA];

// Le libelle d'un reglage ou d'un terme a la couleur de son groupe (rien hors groupe).
function colorerSelonLeGroupe(element, groupe) {
  if (groupe) element.style.color = groupe.couleur;
  return element;
}

// Une liste de lignes, une par reglage (Reglages, rubrique Machine) : rangee groupe apres
// groupe, chacun sous son titre, chaque ligne bordee de sa couleur (le texte garde la
// sienne : orange, vert, jaune selon la validation). `ligneDe(cle)` : la ligne d'un
// reglage. Renvoie actualiser() : un titre se cache quand toutes ses lignes le sont
// (la Compacite avant la version 3).
function rangerLesLignesParGroupe(ligneDe) {
  const repere = document.createComment('les reglages par groupe (interface/groupes-ia.js)');
  ligneDe(GROUPES_ET_RECHERCHE_IA[0].reglages[0]).before(repere);
  const rangees = GROUPES_ET_RECHERCHE_IA.map((groupe) => {
    const titre = colorerSelonLeGroupe(document.createElement('p'), groupe);
    titre.className = 'titre-groupe-ia';
    titre.textContent = groupe.libelle;
    // La recherche n'a que des ajouts : cachee comme eux hors de la version de travail.
    if (groupe === REGLAGE_DE_RECHERCHE_IA) titre.classList.add('poids-ajout');
    const lignes = groupe.reglages.map(ligneDe);
    for (const ligne of lignes) {
      ligne.classList.add('ligne-groupe-ia');
      ligne.style.setProperty('--couleur-groupe-ia', groupe.couleur);
    }
    repere.before(titre, ...lignes);
    return { titre, lignes };
  });
  return () => {
    for (const { titre, lignes } of rangees) titre.hidden = lignes.every((ligne) => ligne.hidden);
  };
}

// La ligne de titre d'un groupe dans un tableau dont chaque ligne est un reglage ou un
// terme : `colonnes`, le nombre de colonnes qu'elle couvre.
function ligneDeTitreDeGroupe(groupe, colonnes) {
  const ligne = document.createElement('tr');
  ligne.className = 'ligne-titre-groupe-ia';
  const titre = colorerSelonLeGroupe(document.createElement('th'), groupe);
  titre.colSpan = colonnes;
  titre.textContent = groupe.libelle;
  ligne.append(titre);
  return ligne;
}

// Les memes, en texte (une page exportee : le banc d'essais).
const htmlDuTitreDeGroupe = (groupe, colonnes) => `<tr class="ligne-titre-groupe-ia"><th colspan="${colonnes}" style="color:${groupe.couleur}">${groupe.libelle}</th></tr>`;
const styleDuGroupe = (groupe) => (groupe ? ` style="color:${groupe.couleur}"` : '');

// `cles` dans l'ordre (des reglages ou des termes, `groupeDe` : groupeDuReglage ou
// groupeDuTerme) : chacune avec le groupe qui commence juste avant elle, ou null.
function groupesQuiCommencent(cles, groupeDe) {
  return cles.map((cle, rang) => {
    const groupe = groupeDe(cle);
    return groupe && (rang === 0 || groupeDe(cles[rang - 1]) !== groupe) ? groupe : null;
  });
}
