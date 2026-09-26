// "Base de coups (BDD moves)" dans Reglages (saab, 2026-09-27) : choisir la
// base qui sert aux Conseils, en importer une, en supprimer une — le
// selecteur "BDD moves" de KAAWA (kaa_settings_popup_ClO_Co.py, F6), plus
// l'import, que KAAWA n'a pas besoin de proposer (il lit son propre dossier).
//
// Le CHOIX est un reglage comme un autre (`nextmove.bdd_file`, meme cle que
// KAAWA) : interface/reglages.js l'enregistre dans le profil, l'annule, le
// remet a Defaut... et appelle ici `afficher` (remplir la liste) et `charger`
// (la base elle-meme). Ce fichier ne touche jamais au reglage directement :
// apres un import ou une suppression, il change la liste puis declenche son
// evenement `change`, exactement comme un choix a la main.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : NOM_BASE_INTEGREE,
// verifierBaseNextMove, nomBaseAUtiliser (moteur/bases-coups.js),
// analyserBaseNextMove (moteur/next-move.js), KAA_NEXT_MOVE_CSV
// (donnees/kaa-next-move.js), listerBasesImportees, lireBaseImportee,
// enregistrerBaseImportee, supprimerBaseImportee
// (interface/bases-coups-stockage.js) viennent de fichiers charges avant.

// `elements` : { select, importer, supprimer, etat }. `surBaseChargee(base)`
// recoit la base analysee (moteur.analyserBaseNextMove), a donner aux
// Conseils. Renvoie { afficher(nomDemande), charger(nomDemande) }.
function demarrerBasesCoups(elements, surBaseChargee) {
  // Le repli sur la base integree se dit toujours (reglage venu de KAAWA, base
  // supprimee depuis...) : sinon on croirait voir les conseils de la base choisie.
  const mentionIntrouvable = (nomDemande, nom) =>
    nomDemande && nom !== nomDemande ? ` — ${nomDemande} introuvable sur cet appareil` : '';
  let dernierNomDemande; // jamais `null` au depart : le premier charger(null) doit agir
  let nomCharge = null;
  let chargementEnCours = 0;

  async function afficher(nomDemande) {
    const noms = await listerBasesImportees();
    const options = [NOM_BASE_INTEGREE, ...noms].map((nom) => {
      const option = document.createElement('option');
      option.value = nom;
      option.textContent = nom === NOM_BASE_INTEGREE ? `${nom} (intégrée)` : nom;
      return option;
    });
    elements.select.replaceChildren(...options);
    elements.select.value = nomBaseAUtiliser(nomDemande, noms);
  }

  // Charge la base demandee (ou la base integree, voir nomBaseAUtiliser),
  // analysee en ARRIERE-PLAN comme au demarrage (setTimeout : les pendules
  // n'attendent jamais, CLAUDE.md). Un nouveau chargement demande entre-temps
  // l'emporte sur l'ancien.
  async function charger(nomDemande) {
    if (nomDemande === dernierNomDemande) return; // appele a chaque retouche de couleur
    dernierNomDemande = nomDemande;
    const numero = ++chargementEnCours;
    let nom = nomBaseAUtiliser(nomDemande, await listerBasesImportees());
    if (nom === nomCharge) {
      elements.etat.textContent = `Base utilisée : ${nom}${mentionIntrouvable(nomDemande, nom)}`;
      return;
    }
    elements.etat.textContent = `Chargement de ${nom}...`;
    let texte = KAA_NEXT_MOVE_CSV;
    if (nom !== NOM_BASE_INTEGREE) texte = await lireBaseImportee(nom).catch(() => null);
    if (!texte) {
      nom = NOM_BASE_INTEGREE; // illisible sur cet appareil : meme repli qu'un fichier absent
      texte = KAA_NEXT_MOVE_CSV;
    }
    const introuvable = mentionIntrouvable(nomDemande, nom);
    setTimeout(() => {
      if (numero !== chargementEnCours) return;
      const base = analyserBaseNextMove(texte);
      nomCharge = nom;
      surBaseChargee(base);
      elements.etat.textContent = `Base utilisée : ${nom} (${base.size} positions)${introuvable}`;
    }, 0);
  }

  function choisir(nom) {
    elements.select.value = nom;
    elements.select.dispatchEvent(new Event('change'));
  }

  // Meme contrat que le reste des Reglages : un refus se dit toujours
  // (alerte), jamais un bouton muet.
  async function importer(fichier) {
    const texte = await fichier.text();
    const refus = verifierBaseNextMove(fichier.name, texte);
    if (refus) {
      window.alert(refus);
      return;
    }
    const dejaLa = (await listerBasesImportees()).includes(fichier.name);
    if (dejaLa && !window.confirm(`Remplacer la base « ${fichier.name} » déjà importée ?`)) return;
    try {
      await enregistrerBaseImportee(fichier.name, texte);
    } catch (erreur) {
      window.alert(`Impossible de garder cette base sur cet appareil (${erreur?.message ?? erreur}).`);
      return;
    }
    // Remplacee sous le meme nom : elle doit etre relue, pas reconnue.
    if (fichier.name === nomCharge) nomCharge = null;
    dernierNomDemande = undefined;
    await afficher(fichier.name);
    choisir(fichier.name);
  }

  elements.importer.addEventListener('click', () => {
    const entree = document.createElement('input');
    entree.type = 'file';
    entree.accept = '.csv,text/csv';
    entree.addEventListener('change', () => {
      if (entree.files[0]) importer(entree.files[0]);
    });
    entree.click();
  });

  elements.supprimer.addEventListener('click', async () => {
    const nom = elements.select.value;
    if (nom === NOM_BASE_INTEGREE) {
      window.alert('La base intégrée à KAAH n\'est pas supprimable.');
      return;
    }
    if (!window.confirm(`Supprimer la base « ${nom} » de cet appareil ?`)) return;
    await supprimerBaseImportee(nom);
    await afficher(NOM_BASE_INTEGREE);
    choisir(NOM_BASE_INTEGREE);
  });

  return { afficher, charger };
}
