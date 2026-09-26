// Le code KAA1 du mode correspondance (phase 24, PHASE DELICATE ⚠ — voir
// PLAN.md) : jouer a distance en s'envoyant, apres chaque coup, un court texte
// (SMS, courriel...). Repris de KAAWA (kaa_engine_ClO_Co.py, encode_corr_move ;
// kaa_app_ClO_Co.py, apply_corr_code) et verifie contre sa vraie methode
// d'encodage, au caractere pres (tests/reference-correspondance-kaawa.json).
//
//   KAA1:<id>:<n° de coup>:<coup Nacre>:<statut>
//   premier envoi : ... puis :<position de depart>:<Noir>:<Blanc>:<evenement>:<nom de la position>:<couleur de l'expediteur>
//
// <id> : la date de creation de la partie (AAMMJJHHMM), qui l'identifie chez les
// deux joueurs. <n° de coup> : la profondeur du coup dans la partie (1 = le 1er
// coup de Noir). <coup Nacre> : vide quand rien n'est joue (config initiale d'un
// createur Blanc, abandon, nulle, proposition). <statut> : celui de KAAWA ('_' en
// cours, 'N' 6 ejections, 'R' abandon, 'D' nulle, 'T' temps, 'M' puzzle manque,
// 'P' proposition de nulle). La couleur est ecrite a l'anglaise, comme KAAWA.
//
// Un coup recu est rejoue comme KAAWA le rejoue (handle_click_from_nacre : ses
// deux clics), c'est-a-dire par lireCoupNacre — identique sur 160 208 coups
// (JOURNAL.md, phase 24). Un code n'est jamais applique a moitie : il est lu
// entierement, verifie (format, synchronisation, coup legal), puis applique.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lirePosition,
// ecrirePosition, lireCoupNacre, ecrireCoupNacreSansAmbiguite (moteur/notation.js),
// couleursDuPlateau, appliquerCoup (moteur/partie.js), creerArbre, jouerDansArbre,
// noeudCourant, etatCourant, marquerStatutFin, estStatutDefinitif,
// marquerFlecheDernierCoup (moteur/arbre.js), informationFlecheDernierCoup
// (moteur/fleche-dernier-coup.js) viennent de fichiers charges avant celui-ci.

const PREFIXE_CORRESPONDANCE = 'KAA1';
const SEPARATEUR_CORRESPONDANCE = ':';
const CHAMPS_CODE_COURT = 5;
const CHAMPS_CODE_PREMIER_ENVOI = 11;
const STATUT_EN_COURS = '_';
const STATUT_PROPOSITION_DE_NULLE = 'P';
const STATUTS_CORRESPONDANCE = [STATUT_EN_COURS, 'N', 'R', 'D', 'T', 'M', STATUT_PROPOSITION_DE_NULLE];
// Les statuts qui terminent la partie sans coup joue (le coup de la victoire par
// ejections, 'N', vient avec son coup et se constate sur la position).
const STATUTS_DE_FIN_SANS_COUP = ['R', 'D', 'T'];
const COULEUR_KAAWA = { noir: 'black', blanc: 'white' };
const COULEUR_KAAH = { black: 'noir', white: 'blanc' };
const MOTIF_COUP_CORRESPONDANCE = /^[a-i][1-9][a-i][1-9]$/;

// Comme `_s` de KAAWA : un nom ne doit jamais casser le decoupage du code.
function nettoyerChampCorrespondance(texte) {
  return String(texte ?? '').replaceAll(SEPARATEUR_CORRESPONDANCE, '-').replaceAll('|', '-').replaceAll('\n', '');
}

// `depart` : null, ou { position, nomNoir, nomBlanc, evenement, nomPosition,
// expediteur ('noir' | 'blanc') } pour le premier envoi.
function ecrireCodeCorrespondance({ idPartie, numeroDeCoup, coup, statut, depart }) {
  let code = [PREFIXE_CORRESPONDANCE, idPartie, numeroDeCoup, coup, statut].join(SEPARATEUR_CORRESPONDANCE);
  if (depart) {
    code += SEPARATEUR_CORRESPONDANCE + [
      depart.position,
      nettoyerChampCorrespondance(depart.nomNoir),
      nettoyerChampCorrespondance(depart.nomBlanc),
      nettoyerChampCorrespondance(depart.evenement),
      nettoyerChampCorrespondance(depart.nomPosition),
      COULEUR_KAAWA[depart.expediteur],
    ].join(SEPARATEUR_CORRESPONDANCE);
  }
  return code;
}

// Lit un code colle. Renvoie les champs de ecrireCodeCorrespondance, ou
// { erreur } — plus exigeant que KAAWA (qui ne verifie que le prefixe, le
// nombre de champs et le numero) : un code abime doit etre refuse ICI, jamais
// decouvert a moitie applique.
function lireCodeCorrespondance(texte) {
  const code = String(texte ?? '').trim();
  if (!code.startsWith(`${PREFIXE_CORRESPONDANCE}${SEPARATEUR_CORRESPONDANCE}`)) {
    return { erreur: `Code invalide (doit commencer par ${PREFIXE_CORRESPONDANCE}:).` };
  }
  const champs = code.split(SEPARATEUR_CORRESPONDANCE);
  if (champs.length < CHAMPS_CODE_COURT) return { erreur: 'Code trop court : il a été coupé en le copiant ?' };
  const [, idPartie, texteNumero, coup, statut] = champs;
  if (idPartie === '') return { erreur: 'Code sans identifiant de partie.' };
  if (!/^\d+$/.test(texteNumero)) return { erreur: `Numéro de coup invalide : « ${texteNumero} ».` };
  if (coup !== '' && !MOTIF_COUP_CORRESPONDANCE.test(coup)) return { erreur: `Coup invalide : « ${coup} ».` };
  if (!STATUTS_CORRESPONDANCE.includes(statut)) return { erreur: `Statut inconnu : « ${statut} ».` };

  let depart = null;
  if (champs.length >= CHAMPS_CODE_PREMIER_ENVOI) {
    const [position, nomNoir, nomBlanc, evenement, nomPosition, couleur] = champs.slice(CHAMPS_CODE_COURT);
    try {
      lirePosition(position);
    } catch {
      return { erreur: `Position de départ illisible : « ${position} ».` };
    }
    if (!COULEUR_KAAH[couleur]) return { erreur: `Couleur de l'expéditeur inconnue : « ${couleur} ».` };
    depart = { position, nomNoir, nomBlanc, evenement, nomPosition, expediteur: COULEUR_KAAH[couleur] };
  }
  return { idPartie, numeroDeCoup: Number(texteNumero), coup, statut, depart };
}

// Une partie de correspondance n'avance que sur sa ligne REELLEMENT jouee
// (l'origine) : envoyer ou recevoir un code part toujours de son dernier coup,
// meme si l'on est en train de revoir un coup plus ancien.
function auDernierCoupReel(arbre) {
  return { ...arbre, chemin: arbre.cheminOrigine };
}

// Peut-on jouer un coup ICI ? Seulement a son tour (comme KAAWA, qui verrouille
// le plateau sinon), seulement sur le dernier coup reel — un coup d'analyse
// ailleurs dans la partie decalerait les numeros des codes — et jamais une fois
// la partie terminee.
function peutJouerEnCorrespondance(arbre, couleurLocale) {
  const surLeDernierCoup =
    arbre.chemin.length === arbre.cheminOrigine.length && arbre.chemin.every((index, rang) => index === arbre.cheminOrigine[rang]);
  const noeud = noeudCourant(arbre);
  return surLeDernierCoup && !noeud.etat.vainqueur && !noeud.statutFin && noeud.etat.joueurAuTrait === couleurLocale;
}

// Refuser une proposition de nulle (ajout de KAAH : KAAWA ne renvoie rien, et le
// proposant reste bloque) : un code SANS coup, en cours, au meme numero. KAAWA
// l'accepte tel quel (sans coup, il attend le receveur deja a ce coup-la) et
// rend la main au proposant, dont c'est le tour.
function codeDeRefusDeNulle(arbre, correspondance) {
  return ecrireCodeCorrespondance({
    idPartie: correspondance.idPartie,
    numeroDeCoup: arbre.cheminOrigine.length,
    coup: '',
    statut: STATUT_EN_COURS,
    depart: null,
  });
}

// Le code a envoyer depuis le dernier coup reel de `arbre` — encode_corr_move de
// KAAWA. `correspondance` : { idPartie, couleurLocale, nomNoir, nomBlanc,
// evenement, nomPosition }. `statut` : force (proposition de nulle 'P') ; sinon
// celui du noeud courant, 'N' si la position est gagnee, '_' sinon. Le premier
// envoi porte la config : Noir createur a son 1er coup, Blanc createur avant
// tout coup (c'est Noir, l'adversaire, qui ouvre).
function codeAEnvoyer(arbre, correspondance, statut) {
  const fin = auDernierCoupReel(arbre);
  const noeud = noeudCourant(fin);
  const statutEnvoye = statut ?? noeud.statutFin ?? (noeud.etat.vainqueur ? 'N' : STATUT_EN_COURS);
  const numeroDeCoup = fin.chemin.length;
  const avecCoup = (statutEnvoye === STATUT_EN_COURS || statutEnvoye === 'N') && numeroDeCoup > 0;
  const premierEnvoi =
    (numeroDeCoup === 1 && correspondance.couleurLocale === 'noir') ||
    (numeroDeCoup === 0 && correspondance.couleurLocale === 'blanc');
  return ecrireCodeCorrespondance({
    idPartie: correspondance.idPartie,
    numeroDeCoup,
    coup: avecCoup ? noeud.coup : '',
    statut: statutEnvoye,
    depart: premierEnvoi
      ? {
          position: ecrirePosition(arbre.racine.etat),
          nomNoir: correspondance.nomNoir,
          nomBlanc: correspondance.nomBlanc,
          evenement: correspondance.evenement,
          nomPosition: correspondance.nomPosition,
          expediteur: correspondance.couleurLocale,
        }
      : null,
  });
}

// Applique un code lu (lireCodeCorrespondance) au dernier coup reel de la partie.
// Renvoie { arbre, couleurLocale, coupRecu, propositionDeNulle } ou { erreur }. Synchronisation de KAAWA : avec un coup, le receveur doit etre
// au coup precedent ; sans coup (fin, proposition, config), deja a ce coup-la.
// `couleurLocale` : qui doit jouer maintenant chez le receveur (partie en cours).
function recevoirCode(arbrePartie, code) {
  const arbre = auDernierCoupReel(arbrePartie);
  const attendu = code.coup ? code.numeroDeCoup - 1 : code.numeroDeCoup;
  if (arbre.chemin.length !== attendu) {
    return {
      erreur:
        `Désynchronisation : ce code attend la partie au coup ${attendu}, elle est au coup ${arbre.chemin.length}. ` +
        'Demandez à votre adversaire de renvoyer son dernier code.',
    };
  }
  const noeud = noeudCourant(arbre);
  if (noeud.etat.vainqueur || estStatutDefinitif(noeud.statutFin)) return { erreur: 'Cette partie est déjà terminée.' };

  let suite = arbre;
  if (code.coup) {
    const etat = etatCourant(arbre);
    const plateau = couleursDuPlateau(etat.plateau);
    const coup = lireCoupNacre(plateau, etat.joueurAuTrait, code.coup);
    if (!coup) return { erreur: `Coup ${code.coup} impossible dans cette position.` };
    const resultat = appliquerCoup(etat, coup);
    suite = jouerDansArbre(suite, ecrireCoupNacreSansAmbiguite(plateau, etat.joueurAuTrait, coup), resultat.etat);
    suite = marquerFlecheDernierCoup(suite, suite.chemin, informationFlecheDernierCoup(coup));
    if (resultat.etat.vainqueur) suite = marquerStatutFin(suite, suite.chemin, 'N');
  }
  if (STATUTS_DE_FIN_SANS_COUP.includes(code.statut)) suite = marquerStatutFin(suite, suite.chemin, code.statut);

  return {
    arbre: suite,
    couleurLocale: etatCourant(suite).joueurAuTrait,
    coupRecu: code.coup !== '',
    propositionDeNulle: code.statut === STATUT_PROPOSITION_DE_NULLE,
  };
}

// Le code colle est-il DEJA dans cette partie ? 'mien' : c'est celui que cet
// appareil a lui-meme envoye (colle chez soi au lieu de chez l'adversaire) ;
// 'recu' : celui de l'adversaire, deja applique ; null : a appliquer. Sans cela,
// l'appliquer donnait un message trompeur (saab, les deux camps essayes sur le
// meme appareil : "l'adversaire refuse la nulle", "desynchronisation"). La
// config (premier envoi) dit qui l'a envoyee ; un code court, lui, se
// reconnait a son coup, qui est deja le dernier de la partie.
// `couleurLocale` : la couleur jouee ici ('noir', 'blanc' ou null si inconnue).
function codeDejaDansLaPartie(arbrePartie, code, couleurLocale) {
  const arbre = auDernierCoupReel(arbrePartie);
  if (code.depart) {
    if (code.depart.expediteur === couleurLocale) return 'mien';
    return arbre.chemin.length >= code.numeroDeCoup ? 'recu' : null;
  }
  if (code.coup === '' || arbre.chemin.length !== code.numeroDeCoup || noeudCourant(arbre).coup !== code.coup) return null;
  // Le dernier coup a ete joue par le camp qui n'a plus le trait.
  const auteur = etatCourant(arbre).joueurAuTrait === 'noir' ? 'blanc' : 'noir';
  return auteur === couleurLocale ? 'mien' : 'recu';
}

// Le tout premier code recu (celui qui porte la config) : cree la partie chez le
// receveur, puis y applique le coup eventuel. `correspondance` est ce que le
// receveur gardera ; sa couleur est l'inverse de celle de l'expediteur.
function partieDepuisPremierCode(code) {
  if (!code.depart) return { erreur: 'Ce code ne crée pas de partie : il faut le tout premier code de votre adversaire.' };
  const resultat = recevoirCode(creerArbre(lirePosition(code.depart.position)), code);
  if (resultat.erreur) return resultat;
  const couleurLocale = code.depart.expediteur === 'noir' ? 'blanc' : 'noir';
  return {
    ...resultat,
    couleurLocale,
    correspondance: {
      idPartie: code.idPartie,
      couleurLocale,
      nomNoir: code.depart.nomNoir,
      nomBlanc: code.depart.nomBlanc,
      evenement: code.depart.evenement,
      nomPosition: code.depart.nomPosition,
    },
  };
}
