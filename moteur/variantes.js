// Lecture des variantes de KAAWA (Phase 13). Format verifie directement
// dans un vrai fichier (donnees/KAA_variants_kaa.json, copie telle quelle
// de KAA_variants_kaa.json — voir CLAUDE.md, "Compatibilite des
// fichiers"), pas devine :
//   { content: [ { variant_name, pos, creator, date, equilibre,
//     handi_score, handi_bille, Type: {...} }, ... ] }
// `lireVariantes` garde maintenant `equilibre`, `handi_*` et `Type` (phase 20ter,
// classement : moteur/classement.js), convertis des chaines "True"/"False" en
// booleens et en liste d'etiquettes.
//
// "Toute modification part dans _my, jamais dans _kaa" (PLAN.md) :
// contrairement a KAAWA, KAAH n'a aucun acces au systeme de fichiers
// depuis le navigateur — il ne peut de toute facon RIEN reecrire sur
// disque. Les variantes ajoutees par saab vivront dans le stockage local
// du navigateur (meme mecanisme que "Mes parties", phase 12), jamais
// dans `donnees/KAA_variants_kaa.json` (un fichier statique livre avec
// l'application, jamais modifie). `lireVariantes` ci-dessous est donc
// deliberement pure : elle ne modifie jamais l'objet qu'on lui passe.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : lirePosition vient
// de moteur/notation.js, charge avant celui-ci dans index.html.

const BILLES_MAX_PAR_CAMP = 14;

// Les notations d'un seul camp dans une demi-position compressee
// ("a12b123..."), sans le chiffre d'ejections en tete — meme analyse que
// moteur.lirePosition, mais SANS fusionner les doublons : juste apres,
// erreurDePosition s'en sert pour les detecter avant qu'ils ne le soient.
function notationsDuCamp(demi) {
  const notations = [];
  for (const [, lettre, chiffres] of demi.slice(1).matchAll(/([a-i])(\d+)/g)) {
    for (const chiffre of chiffres) notations.push(`${lettre}${chiffre}`);
  }
  return notations;
}

// Verifie qu'une position compressee est coherente : jamais plus de
// BILLES_MAX_PAR_CAMP billes pour un meme camp, aucune case occupee deux
// fois (par le meme camp, ou par les deux a la fois). Renvoie un message
// d'erreur, ou `null` si tout va bien. Le chiffre d'ejections en tete
// (voir CLAUDE.md) n'entre pas dans ce compte : une variante a handicap
// a toujours jusqu'a 14 billes sur le plateau, le chiffre n'est qu'un
// score de depart, jamais des billes physiquement retirees du materiel.
function erreurDePosition(texte) {
  const moities = String(texte).split('_');
  if (moities.length !== 2) return `position mal formee : "${texte}"`;

  const [noires, blanches] = moities.map(notationsDuCamp);
  if (noires.length > BILLES_MAX_PAR_CAMP) return `trop de billes noires (${noires.length})`;
  if (blanches.length > BILLES_MAX_PAR_CAMP) return `trop de billes blanches (${blanches.length})`;

  const vues = new Set();
  for (const notation of [...noires, ...blanches]) {
    if (vues.has(notation)) return `case "${notation}" occupee plus d'une fois`;
    vues.add(notation);
  }
  return null;
}

// Lit un fichier de variantes deja parse en JSON (voir l'en-tete du
// fichier) et renvoie un tableau de { nom, position, texteBrut, createur }
// — `position` est deja l'etat complet (voir moteur.lirePosition), pret a
// demarrer une partie sans repasser par le texte compresse. Leve une
// erreur explicite, en nommant la variante en cause, plutot que de
// construire un tableau a moitie faux en silence.
// `estMy` : les positions creees soi-meme (phase 23bis, moteur/positions-my.js),
// rangees dans leur categorie « My ». `entree` garde l'original tel quel : c'est
// de lui que « Modifier » repart, champ par champ.
function lireVariantes(donnees, estMy = false) {
  return (donnees.content ?? []).map((entree) => {
    const erreur = erreurDePosition(entree.pos);
    if (erreur) throw new Error(`Variante "${entree.variant_name}" invalide : ${erreur}`);
    return {
      nom: entree.variant_name,
      position: lirePosition(entree.pos),
      texteBrut: entree.pos,
      createur: entree.creator ?? '',
      equilibre: entree.equilibre === 'True',
      handi: entree.handi_score === 'True' || entree.handi_bille === 'True',
      types: Object.entries(entree.Type ?? {}).filter(([, valeur]) => valeur === 'True').map(([cle]) => cle),
      my: estMy,
      entree,
    };
  });
}
