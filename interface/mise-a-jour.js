// Les mises a jour de KAAH, sur accord (saab, 2026-10-01 : « si une nouvelle
// version existe il faut demander si on veut la charger, pour eviter de
// consommer internet inutilement »). Le service worker (service-worker.js)
// installe une nouvelle version sans rien telecharger ; ce fichier la propose,
// et ne demande son chargement (quelques Mo) qu'apres « Charger ». Refuser
// garde la version actuelle, hors ligne comme avant : la question reviendra au
// prochain lancement.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : NOM_VERSION_KAAH_TEST
// (version.js) vient d'un fichier charge avant celui-ci.

// Ce que repond un service worker a un message ('etat' ou 'charger', voir
// service-worker.js).
function demanderAuServiceWorker(travailleur, message) {
  return new Promise((resoudre) => {
    const canal = new MessageChannel();
    canal.port1.onmessage = (evenement) => resoudre(evenement.data);
    travailleur.postMessage(message, [canal.port2]);
  });
}

// `enregistrement` : celui de service-worker.js ; `proposer(version, tailleMo,
// charger)` (tailleMo : son poids, null s'il n'est pas connu) : demande l'accord (index.html, boite de confirmation) et appelle charger()
// s'il est donne ; `signaler(texte)` : un message pendant le chargement ;
// `recharger()` : la page, une fois la nouvelle version prete.
function surveillerLesMisesAJour(enregistrement, { proposer, signaler, recharger }) {
  let dejaProposee = null; // une seule question par version et par lancement

  async function charger(travailleur) {
    signaler('Chargement de la nouvelle version…');
    const reponse = await demanderAuServiceWorker(travailleur, 'charger');
    if (reponse.erreur) return signaler(`Chargement impossible (${reponse.erreur}) : la version actuelle reste en place.`);
    recharger();
  }

  // Une version autre que celle de la page, pas encore chargee : en attente,
  // ou deja active mais sans ses fichiers (KAAH ferme entre-temps).
  async function verifier() {
    const candidat = enregistrement.waiting ?? enregistrement.active;
    if (!candidat) return;
    const { version, complet, tailleMo = null } = await demanderAuServiceWorker(candidat, 'etat');
    const aCharger = enregistrement.waiting ? !complet || version !== NOM_VERSION_KAAH_TEST : !complet;
    if (!aCharger || dejaProposee === version) return;
    dejaProposee = version;
    proposer(version, tailleMo, () => charger(candidat));
  }

  enregistrement.addEventListener('updatefound', () => {
    const installe = enregistrement.installing;
    installe?.addEventListener('statechange', () => {
      if (installe.state === 'installed' || installe.state === 'activated') verifier();
    });
  });
  verifier();
}
