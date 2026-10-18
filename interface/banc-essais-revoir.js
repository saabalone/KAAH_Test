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
// (moteur/banc-noms.js) viennent de fichiers charges avant celui-ci.

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

// `elements` : { revoir (le bouton), resultats (la zone ou lister) } ; `estOccupe()` : une
// serie tourne (sa zone n'est pas a prendre) ; `ouvrirUnePartie({ arbre, prefixe, evenement, date,
// variante, joueurs })` (index.html) ; `surAffichage()` : un fichier vient d'etre ouvert.
// Renvoie afficher() : remontrer le fichier ouvert.
function brancherRevueDesFichiers(elements, estOccupe, ouvrirUnePartie, surAffichage) {
  const vuesDu = (nom) => lireStockageRevue(window.localStorage, CLE_PARTIES_LABALONE_VUES, {})[nom] ?? [];

  function afficher() {
    const fichier = lireStockageRevue(window.sessionStorage, CLE_FICHIER_LABALONE_OUVERT, null);
    if (!Array.isArray(fichier?.parties) || estOccupe()) return false;
    const vues = vuesDu(fichier.nom);
    const lignes = fichier.parties.map((partie) => {
      const vue = vues.includes(partie.numero);
      return `<tr class="${vue ? 'partie-labalone-vue' : ''}"><td>${vue ? '✓' : ''}</td><td>${partie.numero}</td><td>${echapperBanc(partie.essai)}</td><td>${echapperBanc(partie.variante ?? 'Marguerite Belge')}</td><td>${partie.essaiNoir ? 'Noir' : 'Blanc'}</td><td>${echapperBanc(partie.fin)}</td><td>${echapperBanc(partie.score)}</td><td>${partie.coups.length}</td><td><button class="bouton-dialogue" type="button" data-voir-partie="${partie.numero}" title="Ouvre cette partie sur le plateau (elle s'ajoute à Mes parties, son titre commence par ${echapperBanc(prefixeDeLaPartie(fichier, partie.numero))})">Voir</button></td></tr>`;
    });
    elements.resultats.innerHTML = `<h3>Revoir : ${echapperBanc(fichier.nom)}</h3><p class="note-reglages">Référence : ${echapperBanc(fichier.parties[0]?.reference ?? '?')}. ✓ : partie déjà vue. Voir l'ouvre sur le plateau.</p>
<table class="banc-tableau"><tr><th></th><th>N°</th><th>Essai</th><th>Variante</th><th>L'essai joue</th><th>Gagnant</th><th>Score</th><th>Coups</th><th></th></tr>${lignes.join('')}</table>`;
    return true;
  }

  function voir(numero) {
    const fichier = lireStockageRevue(window.sessionStorage, CLE_FICHIER_LABALONE_OUVERT, null);
    const partie = fichier?.parties.find((autre) => autre.numero === numero);
    if (!partie) return;
    const depart = { ...lirePosition(partie.position ?? POSITION_DEPART_BANC), joueurAuTrait: 'noir' };
    const { arbre, erreur } = construirePartieDepuisSequence(depart, partie.coups.join(' '), NOTATION_NACRE);
    if (erreur || !arbre) return window.alert(`La partie ${numero} ne se rejoue pas (coup ${erreur?.coup ?? '?'}).`);
    const toutes = lireStockageRevue(window.localStorage, CLE_PARTIES_LABALONE_VUES, {});
    ecrireStockageRevue(window.localStorage, CLE_PARTIES_LABALONE_VUES, { ...toutes, [fichier.nom]: [...new Set([...vuesDu(fichier.nom), numero])] });
    const [noir, blanc] = (partie.essaiNoir ? [partie.essai, partie.reference] : [partie.reference, partie.essai]).map(nomAbregeDuJoueur);
    // L'evenement : LabAl (ou LabAlCeint), que le prefixe redit (moteur/nom-partie.js).
    ouvrirUnePartie({ arbre, prefixe: prefixeDeLaPartie(fichier, numero), evenement: fichier.prefixe ?? PREFIXE_LABALONE, date: fichier.date, variante: partie.variante ?? 'Marguerite Belge', joueurs: { noir, blanc } });
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
  });
  return afficher;
}
