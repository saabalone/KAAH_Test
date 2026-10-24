// REVOIR les parties d'un fichier du Banc d'essais (saab, 2026-10-14 : « pouvoir cliquer
// sur une partie pour la charger afin de la voir, et par exemple mettre des coches sur
// celles chargées ») : « Revoir un fichier LabAl… » lit une page exportee
// (moteur/banc-fichiers.js) et en liste les parties dans la zone des resultats ; « Voir »
// en fait une partie de Mes parties et l'ouvre sur le plateau (la page se recharge : le
// fichier ouvert est garde pour l'onglet, sa liste revient a la prochaine ouverture du
// banc), et la coche ✓ reste sur les parties deja vues.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lireFichierLabAlone,
// prefixeDeLaPartie (moteur/banc-fichiers.js), construirePartieDepuisSequence,
// NOTATION_NACRE (moteur/creation-partie.js), lirePosition (moteur/notation.js),
// POSITION_DEPART_BANC (interface/banc-essais-partie.js), echapperBanc
// (interface/banc-essais-page.js), choisirFichiersTexte (interface/fichiers.js),
// NOMS_STYLES_IA, ABREVIATIONS_STYLES_IA (moteur/ia.js), PREFIXE_LABALONE
// (moteur/banc-noms.js), donneesDuBancEnHtml, nomDuFichierDuChoix (moteur/banc-fichiers.js),
// pageDuBanc (interface/banc-essais-page.js), telechargerTexte (interface/fichiers.js),
// formaterDateKAAWA (interface/sauvegarde.js), SEUIL_NULLE_PAR_DEFAUT (moteur/nulle.js) viennent de
// fichiers charges avant celui-ci.

const CLE_FICHIER_LABALONE_OUVERT = 'kaah-labal-ouvert';
const CLE_PARTIES_LABALONE_VUES = 'kaah-labal-vues';

// Un joueur nomme par son profil (un vieux fichier, voir moteur/banc-fichiers.js) : son
// style abrege comme dans le nom d'une machine (saab, 2026-10-15 : « Abréger en
// Agr/Nor/Def ») — « Normal v5el_v2 (P7) » -> « Nor v5el_v2 (P7) ».
const nomAbregeDuJoueur = (nom) => Object.entries(NOMS_STYLES_IA).reduce((texte, [style, long]) => (texte.startsWith(`${long} `) ? `${ABREVIATIONS_STYLES_IA[style]}${texte.slice(long.length)}` : texte), nom);

const lireStockageRevue = (stockage, cle, defaut) => {
  try {
    return JSON.parse(stockage.getItem(cle) ?? 'null') ?? defaut;
  } catch {
    return defaut;
  }
};
const ecrireStockageRevue = (stockage, cle, valeur) => {
  try {
    stockage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch {
    return false;
  }
};

// Le fichier des parties d'une serie (moteur/banc-fichiers.js, nomDuFichierDesParties), a part
// des resultats : leur liste, lisible seule — les donnees qui servent a les revoir y sont glissees
// a cote (donneesDuBancEnHtml).
function contenuDuFichierDesParties({ parties }) {
  const lignes = parties.map((partie) => `<tr class="${partie.essaiNoir ? 'banc-essai-noir' : 'banc-essai-blanc'}"><td>${partie.numero}</td><td>${echapperBanc(partie.essai)}</td><td>${echapperBanc(partie.reference)}</td><td>${echapperBanc(partie.variante ?? 'Marguerite Belge')}</td><td>${partie.essaiNoir ? 'Noir' : 'Blanc'}</td><td>${gagnantDeLaPartieHtml(partie)}</td><td>${echapperBanc(partie.score)}</td><td class="banc-coups">${sequenceDuFichierHtml(partie)}</td></tr>`);
  return `<p class="note-reglages">${parties.length} parties. Dans KAAH : LabAl, « Revoir un fichier LabAl… », puis Voir. Ce fichier se supprime sans toucher à celui des résultats. L'essai en Blanc : la ligne en blanc ; en Noir : en gris. Un coup du livre en <span class="banc-livre-actif">orange</span> quand l'adversaire le joue, en <span class="banc-livre">vert</span> quand l'essai le joue ; en <span class="banc-occ">bleu</span> un coup qui redonne une position déjà vue, avec son Occ (${SEUIL_NULLE_PAR_DEFAUT} : nulle).</p>
<table class="banc-tableau"><tr><th>N°</th><th>Essai</th><th>Adversaire</th><th>Variante, jeu</th><th>L'essai joue</th><th>Gagnant</th><th>Score</th><th>Coups</th></tr>${lignes.join('')}</table>`;
}

// Qui gagne, ecrit comme dans les resultats (saab, 2026-10-23 : « c'est pas clair pour voir si c'est
// l'essai ou la ref qui gagne, pourquoi tu ne reprends pas ce que tu faisais avant ? » ; interface/
// banc-essais-page.js, partiesHtmlDuBanc) : « essai (Noir) » en vert gras, « référence (Blanc) » ; une
// nulle, ou l'issue d'un jeu des ceintures (« ✓ réussi »), telle quelle.
function gagnantDeLaPartieHtml({ fin, essaiNoir }) {
  if (fin !== 'noir' && fin !== 'blanc') return echapperBanc(fin);
  const gagnee = (fin === 'noir') === essaiNoir;
  return gagnee ? `<b class="banc-essai">essai (${essaiNoir ? 'Noir' : 'Blanc'})</b>` : `référence (${essaiNoir ? 'Blanc' : 'Noir'})`;
}

// La sequence d'une partie, numerotee, avec le code couleur des resultats (saab, 2026-10-23 : « tu ne
// mets plus le code couleur, pour le livre et Occ ? » ; interface/banc-essais-page.js,
// partiesHtmlDuBanc) : `livre` et `occurrences`, coup par coup, quand la partie les a.
function sequenceDuFichierHtml({ coups, essaiNoir, livre = [], occurrences = [] }) {
  return coups
    .map((coup, rang) => {
      const parLAdversaire = (rang % 2 === 0) !== essaiNoir;
      const duLivre = livre[rang] ? `<span class="${parLAdversaire ? 'banc-livre-actif' : 'banc-livre'}">${echapperBanc(coup)}</span>` : echapperBanc(coup);
      const occ = occurrences[rang] ?? 1;
      const texte = occ > 1 ? `<span class="banc-occ">${echapperBanc(coup)}<sup>${occ}</sup></span>` : duLivre;
      return rang % 2 === 0 ? `<span class="banc-tour">${rang / 2 + 1}.</span>${texte}` : texte;
    })
    .join(' ');
}

// `elements` : { revoir (le bouton), resultats (la zone ou lister) } ; `estOccupe()` : une
// serie tourne (sa zone n'est pas a prendre) ; `ouvrirUnePartie({ arbre, prefixe, evenement, date,
// variante, joueurs })` (index.html) ; `surAffichage()` : un fichier vient d'etre ouvert.
// Renvoie afficher() : remontrer le fichier ouvert.
function brancherRevueDesFichiers(elements, estOccupe, ouvrirUnePartie, surAffichage) {
  const vuesDu = (nom) => lireStockageRevue(window.localStorage, CLE_PARTIES_LABALONE_VUES, {})[nom] ?? [];

  const fichierOuvert = () => lireStockageRevue(window.sessionStorage, CLE_FICHIER_LABALONE_OUVERT, null);
  // Les cases cochees vont avec le fichier ouvert : Voir recharge la page, elles restent.
  const cocheesDe = (fichier) => fichier.cochees ?? [];
  const garder = (fichier) => ecrireStockageRevue(window.sessionStorage, CLE_FICHIER_LABALONE_OUVERT, fichier);

  function afficher() {
    const fichier = fichierOuvert();
    if (!Array.isArray(fichier?.parties) || estOccupe()) return false;
    const vues = vuesDu(fichier.nom);
    const cochees = cocheesDe(fichier);
    const lignes = fichier.parties.map((partie) => {
      const vue = vues.includes(partie.numero);
      return `<tr class="${vue ? 'partie-labalone-vue' : ''}"><td><input type="checkbox" data-cocher-partie="${partie.numero}"${cochees.includes(partie.numero) ? ' checked' : ''}> ${vue ? '✓' : ''}</td><td>${partie.numero}</td><td>${echapperBanc(partie.essai)}</td><td>${echapperBanc(partie.variante ?? 'Marguerite Belge')}</td><td>${partie.essaiNoir ? 'Noir' : 'Blanc'}</td><td>${gagnantDeLaPartieHtml(partie)}</td><td>${echapperBanc(partie.score)}</td><td>${partie.coups.length}</td><td><button class="bouton-dialogue" type="button" data-voir-partie="${partie.numero}" title="Ouvre cette partie sur le plateau (elle s'ajoute à Mes parties, son titre commence par ${echapperBanc(prefixeDeLaPartie(fichier, partie.numero))})">Voir</button></td></tr>`;
    });
    // Saab, 2026-10-23 : « Ok pour le btn Supprimer ou même copier ou exporter les parties qu'on veut ».
    const aucune = cochees.length === 0 ? ' disabled' : '';
    const actions = `<p class="actions-type-jeux"><button class="bouton-dialogue bouton-a-faire" type="button" data-exporter-cochees${aucune} title="Les parties cochées dans un nouveau fichier (…_choix<date>.html), que Revoir reprend ; leur numéro et leur titre restent">Exporter les cochées (${cochees.length})</button><button class="bouton-dialogue bouton-a-faire" type="button" data-copier-cochees${aucune} title="Les parties cochées dans Mes parties, sans en ouvrir aucune (leur titre commence par le préfixe du fichier, sa date et leur numéro), puis enlevées de la liste">Copier dans Mes parties</button><button class="bouton-dialogue bouton-danger" type="button" data-supprimer-cochees${aucune} title="Les enlève de cette liste ; le fichier lui-même ne change pas (exportez ce qui reste pour le remplacer)">Supprimer les cochées</button></p>`;
    const toutes = fichier.parties.length > 0 && cochees.length === fichier.parties.length;
    elements.resultats.innerHTML = `<h3>Revoir : ${echapperBanc(fichier.nom)}</h3><p class="note-reglages">Référence : ${echapperBanc(fichier.parties[0]?.reference ?? '?')}. ✓, et son essai en violet : partie déjà vue. Voir l'ouvre sur le plateau. Cochez des parties pour les exporter dans un nouveau fichier, les copier dans Mes parties, ou les enlever de la liste.</p>${actions}
<table class="banc-tableau"><tr><th><input type="checkbox" data-cocher-toutes${toutes ? ' checked' : ''} title="Toutes cochées, ou aucune"></th><th>N°</th><th>Essai</th><th>Variante, jeu</th><th>L'essai joue</th><th>Gagnant</th><th>Score</th><th>Coups</th><th></th></tr>${lignes.join('')}</table>`;
    return true;
  }

  // Une partie du fichier, rejouee, prete pour Mes parties : { arbre, prefixe, evenement, date,
  // variante, joueurs }, ou { erreur } (le coup qui ne se rejoue pas).
  function partiePourMesParties(fichier, partie) {
    const depart = { ...lirePosition(partie.position ?? POSITION_DEPART_BANC), joueurAuTrait: 'noir' };
    const { arbre, erreur } = construirePartieDepuisSequence(depart, partie.coups.join(' '), NOTATION_NACRE);
    if (erreur || !arbre) return { erreur: erreur?.coup ?? '?' };
    const [noir, blanc] = (partie.essaiNoir ? [partie.essai, partie.reference] : [partie.reference, partie.essai]).map(nomAbregeDuJoueur);
    // L'evenement : LabAl (ou LabAlCeint), que le prefixe redit (moteur/nom-partie.js).
    return { arbre, prefixe: prefixeDeLaPartie(fichier, partie.numero), evenement: fichier.prefixe ?? PREFIXE_LABALONE, date: fichier.date, variante: partie.variante ?? 'Marguerite Belge', joueurs: { noir, blanc } };
  }

  function voir(numero) {
    const fichier = fichierOuvert();
    const partie = fichier?.parties.find((autre) => autre.numero === numero);
    if (!partie) return;
    const prete = partiePourMesParties(fichier, partie);
    if (prete.erreur) return window.alert(`La partie ${numero} ne se rejoue pas (coup ${prete.erreur}).`);
    const toutes = lireStockageRevue(window.localStorage, CLE_PARTIES_LABALONE_VUES, {});
    ecrireStockageRevue(window.localStorage, CLE_PARTIES_LABALONE_VUES, { ...toutes, [fichier.nom]: [...new Set([...vuesDu(fichier.nom), numero])] });
    ouvrirUnePartie(prete);
  }

  // Les cochees dans Mes parties, sans en ouvrir aucune (saab, 2026-10-23 : « ajoute btn Copier »),
  // puis enlevees de la liste (« faire automatique Supprimer les cochées + Copier ») : elles sont
  // dans Mes parties, la liste garde ce qui reste a trier. Une partie qui ne se rejoue pas reste.
  function copierLesCochees() {
    const fichier = fichierOuvert();
    const parties = fichier.parties.filter((partie) => cocheesDe(fichier).includes(partie.numero));
    const illisibles = [];
    const copiees = [];
    let plein = false;
    for (const partie of parties) {
      const prete = partiePourMesParties(fichier, partie);
      if (prete.erreur) {
        illisibles.push(partie.numero);
        continue;
      }
      if (!ouvrirUnePartie(prete, false)) {
        plein = true;
        break;
      }
      copiees.push(partie.numero);
    }
    garder({ ...fichier, parties: fichier.parties.filter((partie) => !copiees.includes(partie.numero)), cochees: cocheesDe(fichier).filter((numero) => !copiees.includes(numero)) });
    afficher();
    const nombre = `${copiees.length} partie${copiees.length > 1 ? 's' : ''} copiée${copiees.length > 1 ? 's' : ''} dans Mes parties et enlevée${copiees.length > 1 ? 's' : ''} de la liste`;
    if (plein) return window.alert(`Mes parties est plein : ${nombre}, sur ${parties.length}. Faites de la place (Mes parties > Supprimer), puis recommencez avec les autres (toujours cochées).`);
    window.alert(`${nombre}${illisibles.length ? ` ; ne se rejouent pas (restées cochées) : n° ${illisibles.join(', ')}` : ''}.`);
  }

  // `numeros` cochees (ou decochees) : toutes celles du fichier pour la case du titre.
  function cocher(numeros, cochee) {
    const fichier = fichierOuvert();
    const autres = cocheesDe(fichier).filter((numero) => !numeros.includes(numero));
    garder({ ...fichier, cochees: cochee ? [...autres, ...numeros] : autres });
    afficher();
  }

  function exporterLesCochees() {
    const fichier = fichierOuvert();
    const parties = fichier.parties.filter((partie) => cocheesDe(fichier).includes(partie.numero));
    if (parties.length === 0) return;
    const nom = nomDuFichierDuChoix(fichier.nom, formaterDateKAAWA(new Date()));
    telechargerTexte(pageDuBanc(contenuDuFichierDesParties({ parties }), `LabAlone, les parties choisies — ${fichier.nom}`, donneesDuBancEnHtml({ parties })), `${nom}.html`, 'text/html');
  }

  function supprimerLesCochees() {
    const fichier = fichierOuvert();
    const cochees = cocheesDe(fichier);
    if (cochees.length === 0 || !window.confirm(`Enlever ${cochees.length} partie${cochees.length > 1 ? 's' : ''} de la liste ?\n\nLe fichier lui-même ne change pas : pour le remplacer, cochez tout ce qui reste et exportez-le.`)) return;
    garder({ ...fichier, parties: fichier.parties.filter((partie) => !cochees.includes(partie.numero)), cochees: [] });
    afficher();
  }

  elements.revoir.addEventListener('click', () => {
    if (estOccupe()) return window.alert('Une série tourne : revoir un fichier après elle (ou Arrêter).');
    choisirFichiersTexte('.html,text/html', false, ([fichier]) => {
      const lu = lireFichierLabAlone(fichier.texte, fichier.nom);
      if (!lu) return window.alert(`${fichier.nom} n’est pas un fichier exporté par le Banc d’essais (pas de parties à revoir).`);
      if (!ecrireStockageRevue(window.sessionStorage, CLE_FICHIER_LABALONE_OUVERT, { nom: fichier.nom.replace(/\.html$/, ''), ...lu })) return window.alert('Le navigateur refuse de garder ce fichier (trop gros ?).');
      afficher();
      surAffichage();
    });
  });
  elements.resultats.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('[data-voir-partie]');
    if (bouton) voir(Number(bouton.dataset.voirPartie));
    if (evenement.target.closest('[data-exporter-cochees]')) exporterLesCochees();
    if (evenement.target.closest('[data-copier-cochees]')) copierLesCochees();
    if (evenement.target.closest('[data-supprimer-cochees]')) supprimerLesCochees();
  });
  elements.resultats.addEventListener('change', (evenement) => {
    const caseDUnePartie = evenement.target.closest('[data-cocher-partie]');
    if (caseDUnePartie) cocher([Number(caseDUnePartie.dataset.cocherPartie)], caseDUnePartie.checked);
    const caseDuTitre = evenement.target.closest('[data-cocher-toutes]');
    if (caseDuTitre) cocher(fichierOuvert().parties.map((partie) => partie.numero), caseDuTitre.checked);
  });
  return afficher;
}
