// Le Banc d'essais : le branchement des OUTILS de la version de travail (saab,
// 2026-10-11) — les ceintures des IA, les PZL de Mes parties, le compte des solutions
// des PZL My. Chacun fabrique sa serie et la confie au lancement du banc
// (interface/banc-essais.js, lancer) ; extrait de ce fichier (regle des 200 lignes).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : brancherCeinturesDesIA,
// serieDesCeinturesDesIA (interface/banc-essais-ceintures-page.js),
// brancherRechercheDansMesParties, serieDesPartiesEnregistrees, serieDesPuzzlesMyACompter
// (interface/banc-essais-mes-parties.js), creerSolveur (interface/solveur.js) viennent
// de fichiers charges avant celui-ci.

// `elements` : ceux de la boite (ceinturesDesIA, mesParties) ; `banc` : { lancer(serie,
// machines), essais() (les profils coches), jeux() ({ variantes, puzzles }), controle()
// ({ arret, pause } ou null : rien ne tourne), viderLaRecolte() (une recolte neuve) }.
function brancherOutilsDuBanc(elements, banc) {
  const estArretee = () => Boolean(banc.controle()?.arret);
  // Le solveur seul travaille : une partie (ou un PZL) a la fois, avec sa limite de temps.
  const solveurLimite = (limiteS) => creerSolveur({ limiteDepart: limiteS, limiteParCoup: limiteS });

  // Les ceintures des IA : un passage par profil coche et par sorte.
  brancherCeinturesDesIA(elements.ceinturesDesIA, (sortes, cibleDeDepart, toutTester) => {
    const essais = banc.essais();
    if (essais.length === 0) return window.alert('Cochez au moins un profil à essayer.');
    banc.lancer(serieDesCeinturesDesIA(essais, sortes, banc.jeux(), banc.controle, cibleDeDepart, toutTester));
  });

  brancherRechercheDansMesParties(
    elements.mesParties,
    (choix) => {
      if (banc.controle()) return;
      banc.lancer(serieDesPartiesEnregistrees(choix, solveurLimite(choix.limiteS), banc.viderLaRecolte(), estArretee), 1);
    },
    (limiteS) => {
      const serie = serieDesPuzzlesMyACompter(solveurLimite(limiteS), estArretee);
      if (serie.taches.length === 0) return window.alert('Tous vos PZL My ont déjà leur nombre de solutions.');
      banc.lancer(serie, 1);
    }
  );
}
