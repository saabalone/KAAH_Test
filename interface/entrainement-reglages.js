// Le TABLEAU DES REGLAGES de l'Entrainement (phase 36 ; saab, 2026-10-08 : « mets
// toutes les règles et paramètres en coche, comme les profils IA avec histo » ;
// 2026-10-09 : « un tableau des réglages ... chaque case du tableau est variable,
// toujours avec le code couleur » ; 2026-10-10 : « ce tableau pourra rester dans
// _Test mais inactif, car il montre bien ce qu'on doit faire ... tu peux supprimer
// toutes les rubriques de réglages qui font doublon »). Le profil actif : les regles
// generales (la coche et la valeur, puis le libelle), puis une ligne par grade et une
// colonne par reglage. Comme dans Reglages > Machine, une retouche est un BROUILLON en
// orange jusqu'a Valider (vert : changee a la derniere validation, jaune : a une plus
// ancienne), Abandonner l'oublie, et l'Historique montre les versions et y ramene.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : DESCRIPTION_PROFIL_ENTRAINEMENT,
// texteRegleEntrainement (moteur/entrainement-profil.js), memesReglages,
// demarrerHistorique, validerVersion, choisirVersion, lignesHistorique,
// couleursDesReglages, couleurLaPlusForte (moteur/historique-reglages.js),
// listerProfilsEntrainement, estProfilEntrainementIntegre, profilEntrainementActif,
// choisirProfilEntrainementActif, enregistrerProfilEntrainement,
// supprimerProfilEntrainement (interface/profils-entrainement.js), htmlDuTableauDesReglages
// (interface/entrainement-tableau.js),
// exporterProfilPourKAAHTest, sauverLesRetouchesEnFichier, messageDuStockagePlein,
// importerUnProfilEntrainement (interface/entrainement-reglages-fichiers.js),
// poserCouleurIA (interface/couleurs-ia.js), afficherHistorique
// (interface/historique-ia.js), formaterDateKAAWA (interface/sauvegarde.js),
// creerAnnulerRetablirDesReglages, brancherCtrlZEtCtrlY
// (interface/entrainement-reglages-annuler.js), lireLesChampsDesReglages,
// editerUneListeDeReglage, editerLesJeuxDesCeinturesDuTableau, lireLesGradesEnColonnes,
// retenirLesGradesEnColonnes (interface/entrainement-reglages-champs.js) viennent de fichiers charges avant celui-ci.

// `conteneur` : le corps de la boite ; `surChangement` : la boite Entrainement se
// redessine ; `options` : { lectureSeule, ouvrirListe(cle, valeur, lectureSeule) —
// promesse de la nouvelle liste, ou null (interface/entrainement-listes.js),
// ouvrirCeinturesJeux(sorte, listes, jeuxParSerie, lectureSeule) — promesse des listes
// changees, par grade, ou null (interface/entrainement-ceintures-jeux.js),
// typesDUnJeu(sorte, nom) — les types d'un jeu, pour dire ce qu'une liste impose }.
function demarrerReglagesEntrainement(conteneur, surChangement, { lectureSeule = false, ouvrirListe, ouvrirCeinturesJeux, typesDUnJeu } = {}) {
  let brouillon = null; // { regles } retouchees pas encore validees, ou null
  let exporte = false; // le profil affiche a deja ete exporte pour KAAH_Test
  const historiqueDesRetouches = creerAnnulerRetablirDesReglages(); // Ctrl+Z, Ctrl+Y
  // Le texte d'une liste connait les types des jeux : le vrai nombre de jeux imposes.
  const texteDeRegle = (cle, valeur) => texteRegleEntrainement(cle, valeur, typesDUnJeu);
  const descriptionDuProfil = { ...DESCRIPTION_PROFIL_ENTRAINEMENT, texte: texteDeRegle };
  const echapper = (texte) => String(texte).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

  let enColonnes = lireLesGradesEnColonnes();

  function afficher() {
    const profil = profilEntrainementActif();
    const valeurs = brouillon ?? profil;
    const options = listerProfilsEntrainement().map((p) => `<option value="${echapper(p.nom)}" ${p.nom === profil.nom ? 'selected' : ''}>${echapper(p.nom)}</option>`);
    conteneur.innerHTML = `${lectureSeule ? '<p class="note-reglages">Les réglages tels que saab les a fixés : on les lit, on ne les change pas ici.</p>' : ''}
${htmlDeLaBarreDesReglages({ options, brouillon, exporte, lectureSeule })}
${estProfilEntrainementIntegre(profil.nom) ? '<p class="note-reglages">Profil intégré : valider une retouche crée un nouveau profil.</p>' : '<button class="bouton-dialogue" type="button" data-supprimer title="Envoie ce profil et toutes ses versions à la corbeille (bouton Corbeille, en bas), d’où il se restaure">Supprimer ce profil</button>'}
${htmlDuTableauDesReglages(valeurs, enColonnes, texteDeRegle)}
<details class="groupe-regles"><summary>Historique</summary><div class="historique-regles"></div></details>`;
    // Les couleurs de chaque regle, remontees au nom du grade (comme les profils IA).
    const couleurs = couleursDesReglages(descriptionDuProfil, profil, brouillon);
    for (const [cle, couleur] of Object.entries(couleurs)) poserCouleurIA(conteneur.querySelector(`[data-ligne="${cle}"]`), couleur);
    for (const nom of conteneur.querySelectorAll('[data-nom-grade]')) {
      const siennes = [...conteneur.querySelectorAll(`[data-du-grade="${nom.dataset.nomGrade}"]`)].map((element) => couleurs[element.dataset.ligne]);
      poserCouleurIA(nom, couleurLaPlusForte(siennes));
    }
    afficherHistorique(conteneur.querySelector('.historique-regles'), lignesHistorique(descriptionDuProfil, profil), revenirALaVersion);
    // KAAH_Test : tout se lit, rien ne change (les listes s'ouvrent, pour les voir).
    if (lectureSeule) {
      for (const element of conteneur.querySelectorAll('input, select, button:not([data-liste], [data-transposer], [data-ceintures-jeux])')) element.disabled = true;
    }
  }

  const lireLesChamps = () => lireLesChampsDesReglages(conteneur);

  // Redessine sans perdre l'endroit ou l'on etait dans le tableau.
  function afficherAuMemeEndroit() {
    const avant = conteneur.querySelector('.defilement-horizontal');
    const [gauche, haut] = [avant?.scrollLeft ?? 0, avant?.scrollTop ?? 0];
    afficher();
    conteneur.querySelector('.defilement-horizontal')?.scrollTo(gauche, haut);
  }

  function retoucher() {
    const valeurs = lireLesChamps();
    const nouveau = memesReglages(descriptionDuProfil, valeurs, profilEntrainementActif()) ? null : valeurs;
    // Rien de change (Transposer relit le tableau) : rien a annuler.
    const memeBrouillon = nouveau === brouillon || (nouveau !== null && brouillon !== null && memesReglages(descriptionDuProfil, nouveau, brouillon));
    if (!memeBrouillon) historiqueDesRetouches.retenir(brouillon);
    brouillon = nouveau;
    afficherAuMemeEndroit();
  }

  // Ctrl+Z, Ctrl+Y : le brouillon d'avant, ou celui qu'on vient d'annuler.
  function revenirA(autre) {
    if (lectureSeule || autre === undefined) return;
    brouillon = autre;
    afficherAuMemeEndroit();
  }
  brancherCtrlZEtCtrlY(
    conteneur,
    () => revenirA(historiqueDesRetouches.annuler(brouillon)),
    () => revenirA(historiqueDesRetouches.retablir(brouillon))
  );

  // Le profil `nom` devient l'actif (null : le navigateur n'a rien enregistre, tout
  // reste comme avant). Renvoie si c'est fait.
  function devenirActif(nom) {
    if (nom === null) {
      window.alert(messageDuStockagePlein());
      return false;
    }
    [brouillon, exporte] = [null, false];
    historiqueDesRetouches.oublier();
    choisirProfilEntrainementActif(nom);
    afficher();
    surChangement();
    return true;
  }

  function revenirALaVersion(numero) {
    const profil = profilEntrainementActif();
    if (lectureSeule || estProfilEntrainementIntegre(profil.nom) || (brouillon && !window.confirm('Abandonner les retouches pas encore validées (en orange) ?'))) return;
    devenirActif(enregistrerProfilEntrainement(profil.nom, choisirVersion(descriptionDuProfil, profil, numero)));
  }

  // Une liste de jeux, ou celles de toutes les ceintures (interface/entrainement-reglages-champs.js).
  const editerListe = async (bouton) => (await editerUneListeDeReglage(bouton, ouvrirListe, lectureSeule)) && retoucher();
  const editerLesJeuxDesCeintures = async (sorte) => (await editerLesJeuxDesCeinturesDuTableau(conteneur, sorte, ouvrirCeinturesJeux, lectureSeule)) && retoucher();

  function exporterPourKAAHTest() {
    if (brouillon) return window.alert('Validez (ou abandonnez) d’abord les retouches en orange : seul un profil validé s’exporte.');
    exporterProfilPourKAAHTest(profilEntrainementActif());
    exporte = true;
    afficher();
  }

  // Renvoie si c'est enregistre. Sinon (stockage plein), rien ne se perd : les retouches
  // restent en orange, et partent dans une copie de secours (saab, 2026-10-15 : « profil
  // non validé et disparu !! »).
  function validerLeBrouillon() {
    const date = formaterDateKAAWA(new Date());
    let profil = profilEntrainementActif();
    // Le profil integre ne change jamais : sa retouche validee en devient un nouveau.
    if (estProfilEntrainementIntegre(profil.nom)) profil = demarrerHistorique(descriptionDuProfil, { ...profil }, date, `depuis ${profil.nom}`);
    const ancien = profil.nom;
    const nom = enregistrerProfilEntrainement(ancien, validerVersion(descriptionDuProfil, profil, brouillon, date));
    if (nom === null) sauverLesRetouchesEnFichier(brouillon.regles, ancien);
    return devenirActif(nom);
  }

  // Avant de fermer la boite : des retouches en orange se valident, ou l'on reste (saab,
  // 2026-10-14 : « mes valeurs ont l'air d'être les anciennes » — fermee sans Valider).
  function peutFermer() {
    if (!brouillon) return true;
    if (!window.confirm('Des retouches (en orange) ne sont pas validées.\n\nOK : les valider maintenant, puis fermer.\nAnnuler : rester dans le tableau (Valider, ou Abandonner pour les oublier).')) return false;
    return validerLeBrouillon();
  }

  // Maj + clic sur une coche (interface/entrainement-tableau.js) : le tableau se relit une fois.
  brancherClicMajusculeDesReglages(conteneur, retoucher);

  conteneur.addEventListener('change', (evenement) => {
    if (evenement.target.matches('[data-profil]')) {
      if (brouillon && !window.confirm('Abandonner les retouches pas encore validées (en orange) ?')) return afficher();
      [brouillon, exporte] = [null, false];
      historiqueDesRetouches.oublier();
      choisirProfilEntrainementActif(evenement.target.value);
      afficher();
      surChangement();
      return;
    }
    retoucher();
  });
  conteneur.addEventListener('click', (evenement) => {
    const liste = evenement.target.closest('[data-liste]');
    const mode = evenement.target.closest('[data-basculer-mode]');
    if (mode) {
      mode.value = mode.value === 'bonus' ? 'delai' : 'bonus';
      retoucher();
    } else if (liste) {
      editerListe(liste);
    } else if (evenement.target.closest('[data-ceintures-jeux]')) {
      editerLesJeuxDesCeintures(evenement.target.closest('[data-ceintures-jeux]').dataset.ceinturesJeux);
    } else if (evenement.target.closest('[data-transposer]')) {
      // Une retouche en cours est gardee : le brouillon se relit avant de retourner le tableau.
      if (!lectureSeule) retoucher();
      enColonnes = !enColonnes;
      retenirLesGradesEnColonnes(enColonnes);
      afficher();
    } else if (evenement.target.closest('[data-abandonner]')) {
      // Abandonner s'annule aussi (Ctrl+Z ramene les retouches).
      if (brouillon) historiqueDesRetouches.retenir(brouillon);
      brouillon = null;
      afficher();
    } else if (evenement.target.closest('[data-valider]') && brouillon) {
      validerLeBrouillon();
    } else if (evenement.target.closest('[data-exporter]')) {
      exporterPourKAAHTest();
    } else if (evenement.target.closest('[data-importer]')) {
      if (brouillon && !window.confirm('Abandonner les retouches pas encore validées (en orange) ?')) return;
      importerUnProfilEntrainement(devenirActif);
    } else if (evenement.target.closest('[data-supprimer]')) {
      const nom = profilEntrainementActif().nom;
      if (!window.confirm(`Supprimer le profil « ${nom} » ? Il ira dans la corbeille (bouton Corbeille, en bas), d'où il se restaure.`)) return;
      if (!supprimerProfilEntrainement(nom)) return window.alert(messageDuStockagePlein().replace(/\n\nRien n’est perdu[^\n]*/, ''));
      devenirActif(NOM_PROFIL_ENTRAINEMENT_INTEGRE);
    }
  });
  return { afficher, peutFermer };
}
