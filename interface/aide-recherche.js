// Chercher dans l'Aide (saab, 2026-10-08 : « un champ de recherche dans Aide, si
// on veut trouver un terme ou autre ») : chaque endroit trouve est surligne, ses
// chapitres s'ouvrent, ▲ ▼ (ou Entree, Maj+Entree) passent d'un endroit a
// l'autre, l'endroit courant en orange. Sans tenir compte des accents ni des
// majuscules (« reflexion » trouve « Réflexion »). Effacer le champ enleve les
// surlignages et referme ce que la recherche avait ouvert.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const LONGUEUR_MIN_RECHERCHE_AIDE = 2;
const DELAI_RECHERCHE_AIDE_MS = 200; // attendre la fin de la frappe

// Un caractere sans accent, en minuscule — toujours de la meme longueur que
// l'original (un emoji compte pour deux), pour que les positions du texte
// simplifie soient celles du texte affiche.
function caractereSimplifie(caractere) {
  const simple = caractere.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  if (simple.length === caractere.length) return simple;
  const minuscule = caractere.toLowerCase();
  return minuscule.length === caractere.length ? minuscule : caractere;
}

const texteSimplifie = (texte) => [...texte].map(caractereSimplifie).join('');

// `elements` : { champ, compte, precedent, suivant, corps }.
function demarrerRechercheAide(elements) {
  let trouves = []; // les <mark>, dans l'ordre du texte
  let courant = -1;
  let ouvertsParLaRecherche = [];
  let minuterie = null;

  function effacer() {
    for (const mark of trouves) {
      const parent = mark.parentNode;
      mark.replaceWith(document.createTextNode(mark.textContent));
      parent.normalize();
    }
    for (const details of ouvertsParLaRecherche) details.open = false;
    trouves = [];
    ouvertsParLaRecherche = [];
    courant = -1;
  }

  // Les noeuds de texte du corps (pas ceux des <style>/<script>).
  function noeudsDeTexte() {
    const parcours = document.createTreeWalker(elements.corps, NodeFilter.SHOW_TEXT);
    const noeuds = [];
    while (parcours.nextNode()) noeuds.push(parcours.currentNode);
    return noeuds;
  }

  // Entoure chaque occurrence de `terme` (deja simplifie) dans `noeud` d'un <mark>.
  function surligner(noeud, terme) {
    const simple = texteSimplifie(noeud.textContent);
    const positions = [];
    for (let position = simple.indexOf(terme); position >= 0; position = simple.indexOf(terme, position + terme.length)) positions.push(position);
    // De la fin vers le debut : couper le texte ne decale pas les positions restantes.
    const marks = [];
    for (const position of positions.reverse()) {
      const morceau = noeud.splitText(position);
      morceau.splitText(terme.length);
      const mark = document.createElement('mark');
      mark.className = 'aide-trouve';
      morceau.replaceWith(mark);
      mark.append(morceau);
      marks.unshift(mark);
    }
    return marks;
  }

  function ouvrirAutourDe(element) {
    for (let details = element.closest('details'); details; details = details.parentElement?.closest('details')) {
      if (!details.open) {
        // Marque lue par interface/aide.js : ce chapitre ne remonte pas en haut
        // de la boite (l'evenement toggle arrive juste apres).
        details.dataset.ouvertParRecherche = '1';
        details.open = true;
        ouvertsParLaRecherche.push(details);
      }
    }
  }

  // Apres les evenements toggle des chapitres qu'on vient d'ouvrir et leur mise
  // en page : enlever leur marque, puis amener l'endroit trouve au milieu.
  const amenerSousLesYeux = (mark) =>
    setTimeout(() => {
      for (const details of elements.corps.querySelectorAll('details[data-ouvert-par-recherche]')) delete details.dataset.ouvertParRecherche;
      mark.scrollIntoView({ block: 'center' });
    });

  function aller(rang) {
    if (trouves.length === 0) return;
    trouves[courant]?.classList.remove('aide-trouve-courant');
    courant = (rang + trouves.length) % trouves.length;
    const mark = trouves[courant];
    mark.classList.add('aide-trouve-courant');
    ouvrirAutourDe(mark);
    amenerSousLesYeux(mark);
    elements.compte.textContent = `${courant + 1} / ${trouves.length}`;
  }

  function chercher() {
    effacer();
    const terme = texteSimplifie(elements.champ.value.trim());
    const assez = terme.length >= LONGUEUR_MIN_RECHERCHE_AIDE;
    if (assez) trouves = noeudsDeTexte().flatMap((noeud) => surligner(noeud, terme));
    for (const mark of trouves) ouvrirAutourDe(mark);
    elements.compte.textContent = !assez ? '' : trouves.length === 0 ? 'rien trouvé' : `${trouves.length} trouvé${trouves.length > 1 ? 's' : ''}`;
    elements.precedent.disabled = elements.suivant.disabled = trouves.length === 0;
    if (trouves.length > 0) aller(0);
  }

  elements.champ.addEventListener('input', () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(chercher, DELAI_RECHERCHE_AIDE_MS);
  });
  elements.champ.addEventListener('keydown', (evenement) => {
    if (evenement.key !== 'Enter') return;
    evenement.preventDefault();
    aller(courant + (evenement.shiftKey ? -1 : 1));
  });
  elements.precedent.addEventListener('click', () => aller(courant - 1));
  elements.suivant.addEventListener('click', () => aller(courant + 1));
  elements.precedent.disabled = elements.suivant.disabled = true;
}
