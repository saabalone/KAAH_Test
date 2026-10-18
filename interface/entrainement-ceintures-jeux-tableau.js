// Le HTML des tableaux CEINTURES × VARIANTES et CEINTURES × PZL
// (interface/entrainement-ceintures-jeux.js, qui les fait vivre) : l'en-tete (une
// ceinture par colonne), la ligne « Imposés / série », puis, type par type, la ligne du
// type (par ceinture : tout cocher, et son nombre impose) et une ligne par jeu (par
// ceinture : la coche et le 📌). Et l'image d'un jeu, montree au clic sur son nom.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CEINTURES (moteur/entrainement.js),
// classesDeLaCeinture (interface/entrainement-ceintures.js), dessinerPlateau, poserBille
// (rendu/plateau-svg.js), dessinerEjectionsApercu (rendu/ejections-apercu.js),
// depuisNotation (moteur/plateau.js) viennent de fichiers charges avant celui-ci.

const echapperCeinturesJeux = (texte) => String(texte).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

// La pastille de la ceinture et, dessous, son Dan (« 1er ») : la colonne reste etroite.
function enteteDeCeintureJeux(ceinture, grade) {
  const dan = ceinture.nom.split(', ')[1]?.replace(' Dan', '') ?? '';
  const nom = echapperCeinturesJeux(ceinture.nom);
  return `<th title="${nom}"><span class="${classesDeLaCeinture(ceinture)}" style="background:${ceinture.couleur}"></span><br><span class="dan-ceinture">${dan || '&nbsp;'}</span><br><button class="bouton-liste-reglage" type="button" data-cocher-grade="${grade}" title="${nom} : cocher (ou décocher) tous ses jeux affichés">✓</button><br><button class="bouton-liste-reglage" type="button" data-copier-grade="${grade}" title="${nom} : copier cette colonne (coches, 📌, nombres imposés) pour la coller dans d’autres">⧉</button><button class="bouton-liste-reglage" type="button" data-coller-grade="${grade}" title="${nom} : coller ici la colonne copiée ; Maj + clic : dans toutes les colonnes depuis la copiée jusqu’à celle-ci">📋</button></th>`;
}

// `jeu` : { nom, detail, douteux, grades (ou il est propose de lui-meme) } ; `listes` :
// par grade, { candidats, imposes, quotas }. Le nom se touche : l'image du jeu.
function ligneDeJeuDesCeintures(jeu, type, listes) {
  const cases = listes.map(
    (liste, grade) =>
      `<td class="${jeu.grades.includes(grade) ? '' : 'hors-grade'}"><input type="checkbox" data-inclus title="Proposé" ${liste.candidats.includes(jeu.nom) ? 'checked' : ''} /><input type="checkbox" class="epingle" data-impose title="Imposé : toujours proposé, à réussir dans la série" ${liste.imposes.includes(jeu.nom) ? 'checked' : ''} /></td>`
  );
  return `<tr data-nom="${echapperCeinturesJeux(jeu.nom)}" data-type="${type.cle}"><td class="nom-grade"><button class="bouton-liste-reglage" type="button" data-cocher-jeu title="Cocher (ou décocher) ce jeu pour toutes les ceintures">⇉</button> <span class="nom-jeu-ceintures" data-montrer-jeu title="${echapperCeinturesJeux(`${jeu.detail ? `${jeu.detail} — ` : ''}Toucher : voir la position`)}">${echapperCeinturesJeux(jeu.nom)}${jeu.douteux ? ' ⚠' : ''}</span></td>${cases.join('')}</tr>`;
}

// Un type (sans jeu : absent) : sa ligne — par ceinture, ✓ (saab, 2026-10-11 : « pouvoir
// cocher tout par type aussi ») et son nombre impose —, puis ses jeux.
function lignesDeTypeDesCeintures(type, jeux, listes) {
  const siens = jeux.filter((jeu) => (type.cle === '' ? jeu.types.length === 0 : jeu.types.includes(type.cle)));
  if (siens.length === 0) return '';
  const cases = listes.map((liste, grade) => {
    const quota = type.cle === '' ? '' : `<br><input class="nombre-reglage" type="number" min="0" max="${siens.length}" step="1" data-quota="${type.cle}" data-grade="${grade}" value="${liste.quotas[type.cle] ?? 0}" title="Combien de jeux de ce type sont imposés dans la série de cette ceinture (un jeu 📌 de ce type en fait partie). Au-delà des jeux cochés, tous ceux du type se cochent." />`;
    return `<td><button class="bouton-liste-reglage" type="button" data-cocher-type="${type.cle}" data-grade="${grade}" title="Cocher (ou décocher) tous les jeux affichés de ce type pour cette ceinture">✓</button>${quota}</td>`;
  });
  return `<tr class="titre-type-jeux-ceintures"><td class="nom-grade">${echapperCeinturesJeux(type.libelle)} (${siens.length})${type.cle === '' ? '' : '<br><span class="note-reglages"><span class="seulement-modifiable">✓ tous · </span>imposés</span>'}</td>${cases.join('')}</tr>${siens.map((jeu) => ligneDeJeuDesCeintures(jeu, type, listes)).join('')}`;
}

// Tout le tableau. `titre` : « Variante » ou « PZL » ; `types` : [{ cle, libelle }].
function htmlDuTableauCeinturesJeux(titre, types, jeux, listes) {
  return `<table class="tableau-historique tableau-ceintures-jeux"><tr><th class="nom-grade">${titre}</th>${CEINTURES.map(enteteDeCeintureJeux).join('')}</tr>
<tr class="ligne-imposes-serie"><td class="nom-grade" title="Les jeux que la liste impose dans la série, sur les jeux de la série. Orange : plus de jeux imposés que la série n'en avait ; elle s'allonge d'autant.">Imposés / série</td>${CEINTURES.map((_, grade) => `<td data-imposes-du-grade="${grade}"></td>`).join('')}</tr>
${types.map((type) => lignesDeTypeDesCeintures(type, jeux, listes)).join('')}</table>`;
}

// L'image d'une position, pour information (saab, 2026-10-14 : « au clic sur le label du
// PZL/Vari que l'image s'affiche, juste pour info pas pour jouer ») : `position` est
// l'etat d'une variante ou d'un puzzle (moteur.lirePosition).
function dessinerImageDeJeu(svg, position) {
  svg.replaceChildren();
  dessinerPlateau(svg);
  for (const [notation, bille] of Object.entries(position.plateau)) poserBille(svg, { id: `image-jeu-${bille.id}`, ...depuisNotation(notation), couleur: bille.couleur });
  dessinerEjectionsApercu(svg, position.billesEjecteesNoires, position.billesEjecteesBlanches);
}

// La recherche d'un nom : les lignes des autres jeux se cachent, et un type dont aucun
// jeu ne se montre aussi.
function filtrerLesJeuxDesCeintures(corps, recherche) {
  const texte = recherche.trim().toLowerCase();
  let titre = null;
  let visibles = 0;
  const clore = () => {
    if (titre) titre.hidden = visibles === 0;
  };
  for (const rangee of corps.querySelectorAll('tr.titre-type-jeux-ceintures, tr[data-nom]')) {
    if (rangee.dataset.nom === undefined) {
      clore();
      [titre, visibles] = [rangee, 0];
    } else {
      rangee.hidden = texte !== '' && !rangee.dataset.nom.toLowerCase().includes(texte);
      if (!rangee.hidden) visibles++;
    }
  }
  clore();
}

// L'image du jeu touche (`image` : { cadre, nom, svg }) : celle de `jeu` ; le retoucher,
// ou toucher l'image, la referme. Extrait d'interface/entrainement-ceintures-jeux.js (regle
// des 200 lignes).
function montrerOuCacherLImageDuJeu(image, jeu) {
  const montre = jeu && !(jeu.nom === image.nom.textContent && !image.cadre.hidden);
  image.cadre.hidden = !montre;
  if (!montre) return;
  image.nom.textContent = jeu.nom;
  dessinerImageDeJeu(image.svg, jeu.position);
}

// Un nombre impose ne depasse jamais les jeux coches de son type pour sa ceinture
// (`coches(type, grade)`).
function bornerLesNombresImposes(corps, coches) {
  for (const champ of corps.querySelectorAll('[data-quota]')) {
    const maximum = coches(champ.dataset.quota, Number(champ.dataset.grade));
    if (Number(champ.value) > maximum) champ.value = maximum;
  }
}
