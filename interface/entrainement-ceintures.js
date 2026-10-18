// Le TABLEAU DES CEINTURES de la boite Entrainement / Ceinture (phase 36) et, sous la
// ceinture ouverte, les jeux proposes (saab, 2026-10-10 : « dès que je clic visée ça
// m'affiche pour choisir un des Variante/PZL proposés » ; « clic sur le choix,
// affichage image, clic pour valider »). Ne fait que construire le HTML : la boite
// (interface/entrainement.js) decide de tout.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CEINTURES (moteur/entrainement.js),
// victoiresDeLaSerie, victoiresAttendues, jeuxChoisissables (moteur/entrainement-serie.js),
// libelleDesPendules, libelleDesPendulesDuPuzzle (moteur/entrainement-reglages.js),
// objectifDeLaCeinture (interface/objectifs-ceintures.js) viennent de fichiers charges avant.

const LIBELLES_DES_SENS = {
  variantes: { aller: 'Noir', revanche: 'Blanc' },
  pzl: { aller: 'Noir', revanche: 'Blanc' },
};
const echapperCeinture = (texte) => String(texte).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

// La pastille d'un grade (styles.css) : la ceinture noire et ses barrettes de Dan,
// la blanche et rouge a rayures, la rouge.
function classesDeLaCeinture(ceinture) {
  return ceinture.motif ? `ceinture ceinture-${ceinture.motif} ceinture-dan-${ceinture.dan}` : 'ceinture';
}

// « Noire » puis « 1er Dan » en dessous (saab, 2026-10-10 : « mettre les Dan en 2ème
// ligne, ça fait gagner de la largeur »).
function nomDeLaCeinture(ceinture) {
  const [couleur, dan] = ceinture.nom.split(', ');
  return `<span class="${classesDeLaCeinture(ceinture)}" style="background:${ceinture.couleur}"></span> <span class="nom-ceinture">${couleur}${dan ? `<br><span class="dan-ceinture">${dan}</span>` : ''}</span>`;
}

// Ce que demande un grade : la machine et les pendules (Variantes), ou les PZL.
function descriptionDuGrade(reglages, grade, sorte, nombreDeJeux) {
  const siens = reglages.ceintures[grade];
  if (sorte === 'variantes') {
    const details = [siens.handicap ? `handicap ${siens.handicap}` : '', siens.jeuxParSerie ? `série sur ${siens.jeuxParSerie} variantes` : ''].filter(Boolean).join(', ');
    return `KAI++ niveau ${siens.niveau}${siens.ia.elagage ? `, élagage ${siens.ia.elagage}` : ''}${details ? ` · ${details}` : ''}<br><span class="note-reglages">${libelleDesPendules(reglages, grade)}</span>`;
  }
  const pzl = [libelleDesPendulesDuPuzzle(reglages, grade), siens.annuler ? '' : 'sans Annuler'].filter(Boolean).join(' · ');
  return `${nombreDeJeux} PZL${pzl ? `<br><span class="note-reglages">${pzl}</span>` : ''}`;
}

// La case d'etat d'un grade en mode Ceinture : obtenue, confirmee, a confirmer, visee
// (ou en est la serie), ou Viser.
function etatEnModeCeinture(parcours, grade, regles, aConfirmer) {
  // Le grade acquis peut etre a reconfirmer (une pause trop longue) : avant « obtenue ».
  if (parcours.aConfirmer && parcours.confirmees.includes(grade)) return '✓ confirmée';
  if (!aConfirmer.includes(grade)) {
    if (grade === 0 && parcours.ceinture === 0) return 'ceinture de départ';
    if (grade <= parcours.ceinture) return '✓ obtenue';
  }
  if (aConfirmer.includes(grade)) return `<button class="bouton-dialogue bouton-visee" type="button" data-ouvrir="${grade}" title="Une victoire ici confirme la série : touchez pour choisir le jeu">À confirmer</button>`;
  if (grade === parcours.cible) {
    if (parcours.aConfirmer) return 'série réussie : confirmez';
    return `<button class="bouton-dialogue bouton-visee" type="button" data-ouvrir="${grade}" title="La ceinture que vous visez : touchez pour choisir un jeu">🎯 visée : ${victoiresDeLaSerie(parcours, regles)}/${victoiresAttendues(regles)}</button>`;
  }
  return `<button class="bouton-dialogue" type="button" data-viser="${grade}" title="Viser cette ceinture (on peut sauter des ceintures, il faudra les confirmer toutes)">Viser</button>`;
}

// `vue` : { mode ('entrainement' ou 'ceinture'), sorte ('variantes' ou 'pzl') }.

// Les jeux d'une ceinture ouverte et leur etat : 'libre', 'reussi' (il reste acquis),
// 'pris' (plus de place dans la serie, moteur/entrainement-serie.js) ; `detail` : ses
// victoires et ses essais rates. En serie, les jeux commences ou reussis restent la
// meme si un nouveau tirage ne les propose plus.
function etatsDesJeux(vue, grade, parcours, regles, proposes, imposes) {
  const essais = (siens) => (siens?.echecs ? `raté ${siens.echecs}/${regles.essaisAvantReinitialisation}` : '');
  const libre = (nom, detail = '') => ({ nom, impose: imposes.includes(nom), etat: 'libre', detail });
  if (vue.mode === 'entrainement') return proposes.map((nom) => libre(nom));
  if (parcours.aConfirmer) return proposes.map((nom) => libre(nom, essais(parcours.enConfirmation[`${grade}|${nom}`])));
  const noms = [...new Set([...parcours.valides, ...Object.keys(parcours.enCours), ...proposes])];
  const libres = jeuxChoisissables(parcours, noms, regles);
  return noms.map((nom) => {
    const siens = parcours.enCours[nom];
    const victoires = siens?.victoires ? `${siens.victoires}/${regles.victoiresParJeu}` : '';
    const etat = parcours.valides.includes(nom) ? 'reussi' : libres.includes(nom) ? 'libre' : 'pris';
    return { ...libre(nom, [victoires, essais(siens)].filter(Boolean).join(' · ')), etat };
  });
}

// Les deux sens du jeu choisi (`etat` : le sien ; un jeu reussi se regarde, il ne se
// rejoue plus) : [{ sens, fait, interdit, titre }].
function sensDuJeuChoisi(vue, grade, parcours, choisi, etat) {
  const siens = vue.mode === 'entrainement' ? {} : parcours.aConfirmer ? parcours.enConfirmation[`${grade}|${choisi}`] ?? {} : parcours.enCours[choisi] ?? {};
  return ['aller', 'revanche'].map((sens) => {
    // PZL : Noir d'abord (saab, 2026-10-17 : « le 1er jeu se fait toujours en Noir » — il
    // joue le premier : on cherche soi-meme le 1er bon coup, la machine ne l'a pas montre).
    const noirDAbord = vue.mode === 'ceinture' && vue.sorte === 'pzl' && sens === 'revanche' && !siens.aller;
    const titre = etat === 'reussi' ? 'Ce jeu est réussi : il reste acquis' : noirDAbord ? 'D’abord en Noir : Blanc vient ensuite' : '';
    return { sens, fait: Boolean(siens[sens]), interdit: noirDAbord || etat !== 'libre', titre };
  });
}

// Ce qu'il faut faire sous une ceinture ouverte.
function consigneDeLaCeinture(vue, grade, parcours, regles) {
  const nom = CEINTURES[grade].nom.toLowerCase();
  const revanche = 'Noir puis Blanc';
  if (vue.mode === 'entrainement') return `Ceinture ${nom} : touchez un jeu pour le voir, puis lancez Noir ou Blanc${vue.sorte === 'pzl' ? ' (on attaque avec le camp qui doit gagner, sinon on défend)' : ''}.`;
  if (parcours.aConfirmer) return `Confirmation de la ceinture ${nom} : un jeu gagné${regles.revancheDeConfirmation ? ` (${revanche})` : ''}.`;
  const plusieurs = regles.victoiresParJeu > 1;
  const victoires = `${plusieurs ? `${regles.victoiresParJeu} victoires` : 'une victoire'}${regles.revanche ? ` (${plusieurs ? 'chacune ' : ''}${revanche})` : ''}`;
  const jeux = regles.jeuxParSerie > 1 ? `${regles.jeuxParSerie} jeux à réussir, ${victoires} sur chacun` : `un jeu à réussir, ${victoires}`;
  return `Pour la ceinture ${nom} : ${jeux}. Touchez un jeu pour le voir, puis lancez-le.`;
}

// `ligne` : { grade, description, etat, compte, ouverte, propositions (HTML ou '') }.
function ligneDeCeinture({ grade, description, etat, compte, ouverte, propositions }) {
  const rangee = `<tr class="${ouverte ? 'ceinture-visee' : ''}"><td class="cellule-nom-ceinture">${nomDeLaCeinture(CEINTURES[grade])}</td><td>${description}</td><td>${compte}</td><td>${etat}</td></tr>`;
  return ouverte ? `${rangee}<tr class="ligne-propositions"><td colspan="4">${propositions}</td></tr>` : rangee;
}

// Les jeux proposes sous une ceinture : `jeux` = [{ nom, impose, etat ('libre',
// 'reussi', 'pris'), detail }] ; `choisi` : le jeu touche (son image et ses deux
// sens, `sens` = [{ sens, fait, interdit, titre }]) ; `consigne` : ce qu'il faut faire.
// Au-dessus : ce qu'on apprend a cette ceinture.
function htmlDesPropositions({ sorte, grade, consigne, jeux, choisi, sens }) {
  const objectif = objectifDeLaCeinture(grade, sorte);
  if (jeux.length === 0) return `${objectif}<p class="note-reglages">${consigne}</p><p class="note-reglages">Aucun jeu proposé dans ce grade (Tableau des réglages : ses listes).</p>`;
  const boutons = jeux.map(({ nom, impose, etat, detail }) => {
    const titre = etat === 'reussi' ? 'Réussi : il reste acquis' : etat === 'pris' ? 'Plus de place dans la série : finissez les jeux commencés ou imposés' : 'Voir ce jeu';
    return `<button class="bouton-dialogue bouton-jeu-propose${nom === choisi ? ' bouton-actif' : ''}${etat !== 'libre' ? ' jeu-fait' : ''}" type="button" data-jeu="${echapperCeinture(nom)}" title="${titre}" ${etat === 'pris' ? 'disabled' : ''}>${impose ? '📌 ' : ''}${etat === 'reussi' ? '✓ ' : ''}${echapperCeinture(nom)}${detail ? ` <span class="note-reglages">${detail}</span>` : ''}</button>`;
  });
  const lancement = choisi
    ? `<div class="choix-jeu-entrainement"><svg id="apercu-entrainement" class="apercu-entrainement"></svg><div class="sens-jeu-entrainement">${sens
        .map((un) => `<button class="bouton-dialogue${un.fait ? ' jeu-fait' : ''}" type="button" data-ceinture="${grade}" data-sens="${un.sens}" data-nom="${echapperCeinture(choisi)}" ${un.fait || un.interdit ? 'disabled' : ''} ${un.titre ? `title="${un.titre}"` : ''}>${un.fait ? '✓ ' : '▶ '}${LIBELLES_DES_SENS[sorte][un.sens]}</button>`)
        .join('')}</div></div>`
    : '';
  return `${objectif}<p class="consigne-entrainement">${consigne}</p><div class="jeux-proposes">${boutons.join('')}</div>${lancement}`;
}
