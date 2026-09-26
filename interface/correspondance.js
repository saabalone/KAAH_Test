// La boite « Correspondance ✉ » (phase 24) : creer une partie par correspondance,
// recevoir le code d'un coup adverse, renvoyer son dernier code — le menu
// « Correspondance » de KAAWA (kaa_app_ClO_Co.py, open_corr_popup,
// action_corr_new_game_popup, action_corr_receive_popup, apply_corr_code). Tout
// ce qui touche au code lui-meme (format, synchronisation, coup) est dans
// moteur/correspondance.js : ce fichier ne fait que ranger et afficher.
//
// Recevoir un code met a jour la partie enregistree, puis la recharge : un seul
// chemin de chargement (celui de toute partie reprise), jamais une partie modifiee
// sous les yeux du joueur. Ce qu'il faut lui dire ensuite (« à vous de jouer »,
// une proposition de nulle...) passe le rechargement dans sessionStorage.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lireCodeCorrespondance,
// codeAEnvoyer, recevoirCode, partieDepuisPremierCode, peutJouerEnCorrespondance
// (moteur/correspondance.js), creerArbre (moteur/arbre.js), lirePosition
// (moteur/notation.js), donneesVersArbre (moteur/sauvegarde.js), le rangement des
// parties (interface/correspondance-rangement.js),
// listerPartiesEnregistrees, creerNouvellePartie, mettreAJourPartie,
// obtenirIdPartieActive, formaterDateKAAWA (interface/sauvegarde.js),
// nomJoueurAutorise (moteur/nom-partie.js), NOMS_PAR_DEFAUT (moteur/revanche.js)
// viennent de fichiers charges avant celui-ci ; brancherSaisieNomJoueur
// (interface/noms-joueurs.js) et demarrerCorrespondancesEnCours
// (interface/correspondance-en-cours.js), charges apres, ne sont appeles
// qu'une fois tout charge. codeDejaDansLaPartie : moteur/correspondance.js.

// Le bouton de la colonne (saab) : le nombre de parties par correspondance en
// cours ecrit dans son enveloppe ouverte (index.html, .nombre-correspondances),
// et vert — le vert de ce qui attend un geste — des qu'il y en a une. A
// rappeler a chaque sauvegarde ou suppression (index.html).
function actualiserBoutonCorrespondance(bouton) {
  const nombre = compterCorrespondancesEnCours();
  bouton.querySelector('.nombre-correspondances').textContent = nombre > 0 ? String(nombre) : '';
  bouton.classList.toggle('correspondance-en-cours', nombre > 0);
}

// Un code colle sur l'appareil meme qui l'a envoye (saab, en essayant les deux
// camps sur un seul telephone) : chaque appareil ne tient qu'UN camp d'une
// partie — et une appli installee partage la memoire de son navigateur.
function messageCodeDeCetAppareil(couleurLocale) {
  return (
    `Ce code vient de cet appareil, où vous jouez ${NOM_CAMP[couleurLocale]} : il est pour votre adversaire, à coller sur SON appareil. ` +
    'Pour essayer seul les deux camps, jouez-les dans deux navigateurs différents (Chrome et Firefox par exemple) : ' +
    "l'appli installée et son navigateur partagent la même mémoire, donc la même partie."
  );
}

// `elements` : { bouton, dialogue, nomLocal, nomAdversaire, jouerNoir, jouerBlanc,
// creer, champCode, recevoir, erreur, renvoyer, enCours, listeEnCours, fermer }.
// `rappels` : { correspondanceActive(), arbreActif(), positionDeDepart() → { texte,
// nom }, ouvrirPartie(id), confirmer(message, suite, mot), afficherCode({ titre,
// message, code }) }.
function demarrerCorrespondance(elements, rappels) {
  let couleurChoisie = 'noir';
  // Memes caracteres permis que partout (interface/noms-joueurs.js, appele
  // seulement une fois tout charge : l'ordre des fichiers n'y change rien).
  brancherSaisieNomJoueur(elements.nomLocal);
  brancherSaisieNomJoueur(elements.nomAdversaire);

  function afficherChoix() {
    elements.jouerNoir.classList.toggle('bouton-actif', couleurChoisie === 'noir');
    elements.jouerBlanc.classList.toggle('bouton-actif', couleurChoisie === 'blanc');
  }
  elements.jouerNoir.addEventListener('click', () => {
    couleurChoisie = 'noir';
    afficherChoix();
  });
  elements.jouerBlanc.addEventListener('click', () => {
    couleurChoisie = 'blanc';
    afficherChoix();
  });

  function montrerErreur(message) {
    elements.erreur.textContent = message ?? '';
    elements.erreur.hidden = !message;
  }

  // La liste « En cours » (interface/correspondance-en-cours.js).
  const enCours = demarrerCorrespondancesEnCours(
    { bouton: elements.enCours, liste: elements.listeEnCours, dialogue: elements.dialogue },
    rappels.ouvrirPartie
  );

  elements.bouton.addEventListener('click', () => {
    elements.champCode.value = '';
    montrerErreur(null);
    afficherChoix();
    enCours.actualiser();
    elements.renvoyer.hidden = !rappels.correspondanceActive();
    elements.dialogue.showModal();
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());

  // Nouvelle partie : depuis la position de depart de la partie affichee, comme
  // KAAWA (qui demande d'abord de charger une variante). Blanc envoie tout de
  // suite la config ; Noir joue d'abord, son code partira avec son 1er coup.
  elements.creer.addEventListener('click', () => {
    const depart = rappels.positionDeDepart();
    const moi = nomJoueurAutorise(elements.nomLocal.value) || NOMS_PAR_DEFAUT[couleurChoisie];
    const lui = nomJoueurAutorise(elements.nomAdversaire.value) || 'Adversaire';
    const correspondance = {
      idPartie: formaterDateKAAWA(new Date()),
      couleurLocale: couleurChoisie,
      nomNoir: couleurChoisie === 'noir' ? moi : lui,
      nomBlanc: couleurChoisie === 'noir' ? lui : moi,
      evenement: EVENEMENT_CORRESPONDANCE,
      nomPosition: depart.nom,
    };
    const creer = () => {
      const arbre = creerArbre(lirePosition(depart.texte));
      const id = creerNouvellePartie(donneesDeCorrespondance(arbre, correspondance));
      if (!id) return montrerErreur('Impossible d\'enregistrer la partie (stockage du navigateur indisponible).');
      memoriserCouleurLocale(correspondance.idPartie, couleurChoisie);
      annoncerApresChargement(
        couleurChoisie === 'blanc'
          ? { type: 'code', titre: 'Nouvelle partie — code KAA1', message: `Envoyez ce code à ${lui} : Noir (${lui}) joue le premier coup.`, code: codeAEnvoyer(arbre, correspondance) }
          : { type: 'message', message: 'Partie créée : à vous de jouer le premier coup. Le code à envoyer apparaîtra juste après.' }
      );
      elements.dialogue.close();
      rappels.ouvrirPartie(id);
    };
    if (obtenirIdPartieActive()) {
      rappels.confirmer('Créer cette partie par correspondance ? La partie en cours restera dans Mes parties.', creer, 'Créer');
    } else {
      creer();
    }
  });

  elements.recevoir.addEventListener('click', () => {
    const code = lireCodeCorrespondance(elements.champCode.value);
    if (code.erreur) return montrerErreur(code.erreur);
    const existante = listerPartiesEnregistrees()
      .filter((entree) => entree.donnees?.corr_mode && entree.donnees.Date === code.idPartie)
      .at(-1);
    let resultat;
    let correspondance;
    if (existante) {
      correspondance = correspondanceDesDonnees(existante.donnees);
      let arbreExistant;
      try {
        arbreExistant = donneesVersArbre(existante.donnees);
      } catch {
        return montrerErreur('La partie enregistrée est illisible.');
      }
      // Un code deja dans la partie (moteur/correspondance.js) : dire pourquoi,
      // plutot que "l'adversaire refuse la nulle" ou "desynchronisation".
      const deja = codeDejaDansLaPartie(arbreExistant, code, correspondance.couleurLocale);
      if (deja === 'mien') return montrerErreur(messageCodeDeCetAppareil(correspondance.couleurLocale));
      if (deja === 'recu') return montrerErreur('Ce code a déjà été reçu : la partie est à jour.');
      resultat = recevoirCode(arbreExistant, code);
      if (!resultat.erreur && resultat.coupRecu && code.statut === '_') correspondance.couleurLocale = resultat.couleurLocale;
    } else {
      if (!code.depart) {
        return montrerErreur(`Partie ${code.idPartie} introuvable sur cet appareil : il faut d'abord recevoir le tout premier code de votre adversaire.`);
      }
      resultat = partieDepuisPremierCode(code);
      correspondance = resultat.correspondance;
    }
    if (resultat.erreur) return montrerErreur(resultat.erreur);

    memoriserCouleurLocale(code.idPartie, correspondance.couleurLocale);
    const donnees = donneesDeCorrespondance(resultat.arbre, correspondance);
    const id = existante ? existante.id : creerNouvellePartie(donnees);
    if (existante) mettreAJourPartie(existante.id, donnees);
    if (!id) return montrerErreur('Impossible d\'enregistrer la partie (stockage du navigateur indisponible).');
    annoncerApresChargement(annonceDeReception(code, resultat, correspondance, !existante));
    elements.dialogue.close();
    rappels.ouvrirPartie(id);
  });

  // KAAWA « Envoyer coup ↑ » : le code du dernier coup — sauf si c'est a nous de
  // jouer, il n'y a alors rien de neuf a envoyer.
  elements.renvoyer.addEventListener('click', () => {
    const correspondance = rappels.correspondanceActive();
    const arbre = rappels.arbreActif();
    elements.dialogue.close();
    if (peutJouerEnCorrespondance({ ...arbre, chemin: arbre.cheminOrigine }, correspondance.couleurLocale)) {
      rappels.afficherCode({ titre: 'Correspondance', message: 'C\'est à vous de jouer : aucun code à renvoyer.' });
      return;
    }
    rappels.afficherCode({
      titre: 'Renvoyer le code KAA1',
      message: `Votre dernier code, à renvoyer à ${nomDeLAdversaire(correspondance)} :`,
      code: codeAEnvoyer(arbre, correspondance),
    });
  });
}
