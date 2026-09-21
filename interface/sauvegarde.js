// Sauvegarde automatique dans le navigateur (localStorage) et "Mes
// parties" (Phase 12). Ne connait rien de l'arbre KAAH ni du format
// KAAWA : l'appelant (index.html) lui donne des `donnees` deja
// converties (voir moteur.arbreVersDonnees) et ce fichier se contente de
// les ranger. Ne touche jamais aux fichiers, voir interface/fichiers.js,
// ni a l'affichage de la liste elle-meme, voir interface/mes-parties.js.
//
// UN SEUL stockage, "Mes parties" (`kaah-mes-parties`, un tableau de
// { id, donnees }) : TOUTE partie jouee y a automatiquement sa propre
// entree, sans aucun geste manuel — saab a signale qu'un bouton
// "Enregistrer" en plus de la sauvegarde automatique n'avait pas de sens,
// et que rien ne garantissait qu'une partie terminee soit conservee.
// `kaah-id-partie-active` retient juste QUELLE entree est la partie en
// cours. Le premier changement d'une partie neuve (son tout premier
// coup) cree son entree et la marque active ; chaque changement suivant
// met a jour cette meme entree — jamais besoin de choisir quoi garder.
// "Nouvelle partie" ne fait qu'oublier quelle entree est active (rien
// n'est jamais supprime) ; la precedente reste dans la liste, comme
// n'importe quelle autre partie deja jouee. `kaah-position-depart-
// suivante` (phase 13) suit le meme principe pour demarrer une partie
// neuve sur une variante plutot que sur la Marguerite Belge par defaut —
// une valeur a UN SEUL USAGE, relue puis effacee des le prochain
// demarrage (voir prendrePositionDepartSuivante).
//
// Limite de taille assumee, a garder en tete : chaque partie jouee
// s'accumule indefiniment (rien n'est jamais purge tout seul). Sans
// consequence pratique avant tres longtemps (le quota de localStorage
// fait plusieurs Mo, une partie quelques Ko) ; "Supprimer" dans la liste
// reste le seul menage possible pour l'instant — un vrai reglage (garder
// les N dernieres, par exemple) attendra une phase dediee si le besoin
// se confirme.
//
// Limite assumee et documentee (voir moteur/sauvegarde.js) : reprendre
// une partie redemarre les pendules a plein temps plutot que de reprendre
// le decompte exact — KAAWA lui-meme ne restitue que les REGLAGES de
// pendule au chargement d'un fichier (verifie dans son code source,
// kaa_app_ClO_Co.py, load_selected_game_file), pas un decompte precis
// repris a la seconde pres. Le plateau et tout l'arbre de coups, eux,
// reprennent exactement ou ils en etaient.
//
// localStorage peut echouer (navigation privee, quota plein, navigateur
// qui le desactive) : chaque acces est protege par un try/catch, une
// sauvegarde qui echoue ne doit jamais faire planter une partie en cours.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const CLE_MES_PARTIES = 'kaah-mes-parties';
const CLE_ID_ACTIVE = 'kaah-id-partie-active';

// Renvoie la liste "Mes parties" : un tableau de { id, donnees }
// (`donnees` au meme format que l'export, voir moteur.arbreVersDonnees).
// [] si vide, ou si le contenu est illisible.
function listerPartiesEnregistrees() {
  try {
    const texte = window.localStorage.getItem(CLE_MES_PARTIES);
    return texte ? JSON.parse(texte) : [];
  } catch {
    return [];
  }
}

function ecrirePartiesEnregistrees(liste) {
  try {
    window.localStorage.setItem(CLE_MES_PARTIES, JSON.stringify(liste));
    return true;
  } catch {
    return false;
  }
}

function obtenirIdPartieActive() {
  try {
    return window.localStorage.getItem(CLE_ID_ACTIVE);
  } catch {
    return null;
  }
}

function definirIdPartieActive(id) {
  try {
    window.localStorage.setItem(CLE_ID_ACTIVE, id);
  } catch {
    // Tant pis : voir l'en-tete du fichier, jamais de plantage pour ca.
  }
}

// "Nouvelle partie" (index.html) : oublie seulement QUELLE entree est
// active. La partie precedente ne disparait pas pour autant — elle reste
// dans la liste, comme n'importe quelle autre partie deja jouee (voir
// l'en-tete du fichier).
function oublierPartieActive() {
  try {
    window.localStorage.removeItem(CLE_ID_ACTIVE);
  } catch {
    // Rien de plus a faire.
  }
}

const CLE_POSITION_DEPART = 'kaah-position-depart-suivante';

// Pose la position de depart pour le TOUT PROCHAIN chargement de page
// SEULEMENT (voir prendrePositionDepartSuivante) — utilise par "Charger"
// dans le dialogue Variantes (interface/variantes.js, phase 13) pour
// demarrer une partie neuve sur une autre position que la Marguerite
// Belge par defaut.
function definirPositionDepartSuivante(texteBrut, nom) {
  try {
    window.localStorage.setItem(CLE_POSITION_DEPART, JSON.stringify({ texteBrut, nom }));
  } catch {
    // Tant pis : la partie demarrera simplement sur la position par
    // defaut, comme si aucune variante n'avait ete choisie.
  }
}

// Relit PUIS OUBLIE immediatement la position choisie (voir ci-dessus) :
// ne doit jamais influencer un chargement de page ulterieur, seulement
// celui qui suit tout de suite le clic sur "Charger".
function prendrePositionDepartSuivante() {
  try {
    const texte = window.localStorage.getItem(CLE_POSITION_DEPART);
    if (!texte) return null;
    window.localStorage.removeItem(CLE_POSITION_DEPART);
    return JSON.parse(texte);
  } catch {
    return null;
  }
}

const CLE_REPRISE_DEJA_CONFIRMEE = 'kaah-reprise-deja-confirmee';

// Meme principe a UN SEUL USAGE que CLE_POSITION_DEPART juste au-dessus,
// pour une raison differente (signale par saab : "je clic sur l'image de
// la partie choisie, elle revient et je dois clic une seconde fois") :
// choisir explicitement une partie dans "Mes parties" (interface/
// mes-parties.js, `confirmer`) recharge la page pour l'afficher — et cette
// partie devient alors "la partie active a reprendre au demarrage" comme
// n'importe quelle autre, ce qui rouvrait AUSSITOT le meme dialogue de
// confirmation de reprise (index.html, `ouvrirPourConfirmationReprise`)
// par-dessus le plateau qu'on venait tout juste de choisir de voir — un
// second clic pour rien, puisqu'on vient DEJA de confirmer explicitement.
// Ce drapeau, pose juste avant ce rechargement PRECIS, dit a index.html de
// sauter cette confirmation-la une seule fois : une reprise SILENCIEUSE
// (browser rouvert, onglet rafraichi sans geste dans "Mes parties") continue
// de la demander normalement, elle seule le justifie.
function definirRepriseDejaConfirmee() {
  try {
    window.localStorage.setItem(CLE_REPRISE_DEJA_CONFIRMEE, '1');
  } catch {
    // Tant pis : la confirmation de reprise s'affichera simplement une
    // fois de trop, jamais pire que ça.
  }
}

function prendreRepriseDejaConfirmee() {
  try {
    const valeur = window.localStorage.getItem(CLE_REPRISE_DEJA_CONFIRMEE);
    if (!valeur) return false;
    window.localStorage.removeItem(CLE_REPRISE_DEJA_CONFIRMEE);
    return true;
  } catch {
    return false;
  }
}

// La partie active a reprendre au demarrage, ou `null` s'il n'y en a pas
// (premier lancement, ou "Nouvelle partie" est passe par la).
function chargerPartieActive() {
  const id = obtenirIdPartieActive();
  if (!id) return null;
  const entree = listerPartiesEnregistrees().find((e) => e.id === id);
  return entree ? entree.donnees : null;
}

// Ajoute `donnees` comme une toute nouvelle entree (identifiant neuf),
// sans toucher aux autres. Renvoie son identifiant, ou `null` en cas
// d'echec d'ecriture.
function creerNouvellePartie(donnees) {
  const liste = listerPartiesEnregistrees();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  liste.push({ id, donnees });
  return ecrirePartiesEnregistrees(liste) ? id : null;
}

function mettreAJourPartie(id, donnees) {
  const liste = listerPartiesEnregistrees();
  const index = liste.findIndex((entree) => entree.id === id);
  if (index === -1) return false;
  liste[index] = { id, donnees };
  return ecrirePartiesEnregistrees(liste);
}

// Sauvegarde `donnees` (deja convertie par l'appelant, voir
// moteur.arbreVersDonnees — ce fichier ne connait rien de l'arbre KAAH
// lui-meme) comme la partie EN COURS : met a jour son entree si elle en a
// deja une, ou en cree une nouvelle sinon (son tout premier coup, voir
// l'en-tete du fichier) et la marque active. Appelee apres chaque coup,
// navigation ou defaite au temps (voir interface/saisie.js,
// `surChangement`). Renvoie `true`/`false` : saab a signale ne voir
// aucune indication que la partie est bien enregistree (contrairement a
// KAAWA, qui affiche le nom du fichier) — c'est ce que index.html affiche
// a partir de cette valeur (voir #etat-sauvegarde).
function sauvegarderPartieActive(donnees) {
  const idActif = obtenirIdPartieActive();
  if (idActif && mettreAJourPartie(idActif, donnees)) return true;
  const nouvelId = creerNouvellePartie(donnees);
  if (!nouvelId) return false;
  definirIdPartieActive(nouvelId);
  return true;
}

// Supprime une entree de "Mes parties" — si c'etait la partie active,
// oublie aussi qu'elle l'etait (sinon la prochaine reprise pointerait
// vers une entree qui n'existe plus).
function supprimerPartieNommee(id) {
  const reussi = ecrirePartiesEnregistrees(listerPartiesEnregistrees().filter((entree) => entree.id !== id));
  if (reussi && obtenirIdPartieActive() === id) oublierPartieActive();
  return reussi;
}

// Convertit une date au format de KAAWA (AAMMJJHHMM) en texte lisible
// ("13/09 23:30"), pour l'afficher dans la liste "Mes parties" — jamais
// utilisee pour ecrire un fichier, seulement pour l'affichage.
function formaterDateAffichage(dateKAAWA) {
  if (!dateKAAWA || dateKAAWA.length !== 10) return dateKAAWA ?? '';
  const jour = dateKAAWA.slice(4, 6);
  const mois = dateKAAWA.slice(2, 4);
  const heure = dateKAAWA.slice(6, 8);
  const minute = dateKAAWA.slice(8, 10);
  return `${jour}/${mois} ${heure}:${minute}`;
}

// Date/heure au format de KAAWA (AAMMJJHHMM, ex. "2609130425") — meme
// format que interface/sequence.js utilise deja pour la date de chaque
// coup individuel ; ce fichier en a besoin separement pour la date de
// DEBUT de partie (Date, au niveau du fichier entier).
function formaterDateKAAWA(date) {
  const deuxChiffres = (valeur) => String(valeur).padStart(2, '0');
  const annee = String(date.getFullYear()).slice(-2);
  const mois = deuxChiffres(date.getMonth() + 1);
  const jour = deuxChiffres(date.getDate());
  const heure = deuxChiffres(date.getHours());
  const minute = deuxChiffres(date.getMinutes());
  return `${annee}${mois}${jour}${heure}${minute}`;
}

