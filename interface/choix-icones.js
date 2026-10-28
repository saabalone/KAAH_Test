// Choisir les icones de la colonne de gauche (saab, 2026-10-27 : « Réglages/Colonne icones, en plus du btn
// réorganiser, ajouter btn Choix des icones, on pourra cocher ceux qu'on veut afficher ») : Reglages >
// « Choix des icônes » deplie une case a cocher par icone ; decochee, l'icone quitte la colonne tout de
// suite, et un groupe dont toutes les icones sont decochees avec elle. Retenu sur cet appareil
// (localStorage, a part des reglages de KAAWA comme l'ordre des groupes, interface/ordre-colonne.js) ; ni
// Défaut ni un profil n'y touchent. Reglages reste toujours affiche : sans lui, plus moyen de revenir ici.
// En mode reorganisation, les icones decochees reapparaissent (styles.css) : un groupe cache ne doit pas
// avaler en silence un ▲ ou un ▼.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const CLE_ICONES_MASQUEES = 'kaah-icones-masquees';
const ICONE_TOUJOURS_AFFICHEE = 'bouton-reglages';
// Une icone qui n'existe que sur ordinateur, en local ou dans la version de travail : sa ligne non plus.
const CLASSES_DES_ICONES_A_PART = ['banc-ordinateur', 'bouton-version-locale', 'seulement-version-de-travail'];

function lireIconesMasquees() {
  try {
    const ids = JSON.parse(window.localStorage.getItem(CLE_ICONES_MASQUEES) ?? '[]');
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function ecrireIconesMasquees(ids) {
  try {
    window.localStorage.setItem(CLE_ICONES_MASQUEES, JSON.stringify(ids));
  } catch {
    // Stockage indisponible : le choix vaut pour cette visite seulement.
  }
}

// Le dessin d'une icone de la colonne, copie sans ses identifiants (ils restent uniques dans la page) — aussi
// dans l'Aide (interface/aide.js, illustrerLesIcones) : un seul dessin, celui de la colonne, jamais un second a
// tenir a jour.
function dessinDeLIcone(icone) {
  const dessin = document.createElement('span');
  dessin.className = 'dessin-icone';
  // Son bouton : styles.css lui donne la couleur que ce bouton a par defaut (Face-à-face, vert).
  dessin.dataset.copieDe = icone.id;
  dessin.setAttribute('aria-hidden', 'true');
  const copie = icone.querySelector('.icone-bouton')?.cloneNode(true);
  if (copie) {
    for (const noeud of copie.querySelectorAll('[id]')) noeud.removeAttribute('id');
    dessin.append(copie);
  }
  return dessin;
}

// `elements` : { conteneur (#boutons-sauvegarde), bouton (« Choix des icônes »), liste (ou viennent les
// cases), toutAfficher }.
function demarrerChoixIcones(elements) {
  const masquees = new Set(lireIconesMasquees().filter((id) => id !== ICONE_TOUJOURS_AFFICHEE));

  const groupes = () => [...elements.conteneur.querySelectorAll(':scope > .groupe-boutons')];
  const iconesDu = (groupe) => [...groupe.querySelectorAll(':scope > button:not(.fleche-groupe)')];
  // L'infobulle d'une icone sans la ligne qu'on y ajoute ici (les cachees de son groupe, peut-etre deja
  // traduite) : jamais une copie gardee a part, Entraînement et Test changent la leur (interface/
  // entrainement-icone.js, apercu-test.js).
  const titreDOrigine = (icone) => icone.title.replace(/\n(Cachées dans ce groupe|Hidden in this group)[^\n]*$/, '');
  const nomDe = (icone) => icone.querySelector('.libelle-bouton')?.textContent.trim() || titreDOrigine(icone);

  // Un groupe dont des icones sont cachees le dit dans l'infobulle de ses icones (saab, 2026-10-28 : « Si je
  // supprime des btn d'un groupe, qd je clic sur un btn du groupe et/ou au survol de ce btn, afficher qu'il existe
  // d'autres btn ») — au survol, ou par un appui long sur telephone (interface/infobulle-tactile.js). Plus de
  // « +n » sur le groupe (saab : « sur Ceinture il cache le rond du bas droite, et est-ce que ce mini btn ne
  // risque pas d'être cliqué à la place du btn ... seulement l'afficher dans info bulle »).
  function signalerLesCachees(icones) {
    const cachees = icones.filter((icone) => masquees.has(icone.id));
    const enPartie = cachees.length > 0 && cachees.length < icones.length;
    const phrase = `Cachées dans ce groupe : ${cachees.map(nomDe).join(', ')} (Réglages > Colonne d'icônes > Choix des icônes)`;
    for (const icone of icones) icone.title = enPartie ? `${titreDOrigine(icone)}\n${phrase}` : titreDOrigine(icone);
  }

  function appliquer() {
    for (const groupe of groupes()) {
      const icones = iconesDu(groupe);
      for (const icone of icones) icone.classList.toggle('icone-masquee', masquees.has(icone.id));
      groupe.classList.toggle('groupe-masque', icones.every((icone) => masquees.has(icone.id)));
      signalerLesCachees(icones);
    }
  }

  function changer(id, affichee) {
    if (affichee) masquees.delete(id);
    else masquees.add(id);
    ecrireIconesMasquees([...masquees]);
    appliquer();
  }

  function ligneDe(icone) {
    const ligne = document.createElement('label');
    ligne.className = 'ligne-choix-icone';
    ligne.title = titreDOrigine(icone);
    for (const classe of CLASSES_DES_ICONES_A_PART) if (icone.classList.contains(classe)) ligne.classList.add(classe);
    const caseACocher = document.createElement('input');
    caseACocher.type = 'checkbox';
    caseACocher.checked = !masquees.has(icone.id);
    caseACocher.disabled = icone.id === ICONE_TOUJOURS_AFFICHEE;
    caseACocher.addEventListener('change', () => changer(icone.id, caseACocher.checked));
    const nom = document.createElement('span');
    nom.textContent = nomDe(icone);
    ligne.append(caseACocher, dessinDeLIcone(icone), nom);
    return ligne;
  }

  // Par groupe, dans l'ordre de la colonne (saab, 2026-10-28 : « qu'ils soient dans le même ordre et par groupe
  // que la barre ») : un cadre par groupe, ses icones de haut en bas ; les cadres se suivent de haut en bas,
  // colonne apres colonne (styles.css). Refaite a chaque ouverture : l'ordre a pu changer (Réorganiser les groupes).
  function cadreDu(groupe) {
    const cadre = document.createElement('div');
    cadre.className = 'groupe-choix-icones';
    for (const classe of CLASSES_DES_ICONES_A_PART) if (groupe.classList.contains(classe)) cadre.classList.add(classe);
    cadre.append(...iconesDu(groupe).map(ligneDe));
    return cadre;
  }

  function construireLaListe() {
    elements.liste.replaceChildren(...groupes().map(cadreDu));
  }

  elements.bouton.addEventListener('click', () => {
    const ouvrir = elements.liste.parentElement.hidden;
    if (ouvrir) construireLaListe();
    elements.liste.parentElement.hidden = !ouvrir;
    elements.bouton.classList.toggle('bouton-actif', ouvrir);
  });
  elements.toutAfficher.addEventListener('click', () => {
    masquees.clear();
    ecrireIconesMasquees([]);
    appliquer();
    construireLaListe();
  });

  appliquer();
}
