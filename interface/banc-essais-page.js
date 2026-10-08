// Le tableau du banc d'essais (interface/banc-essais.js), affiche dans la boite
// et exporte en page : d'abord les REGLAGES COMPLETS de chaque profil (saab,
// 2026-10-08 : « au debut un petit tableau des reglages complets de chaque
// fichier, comme ca on peut facilement comparer » ; en orange ce qui differe de
// la reference, et son titre en jaune, la couleur des versions plus anciennes
// dans KAAH : la base a laquelle on compare), puis le resume, puis chaque partie et sa sequence (les coups du
// livre en orange quand la reference les joue, en vert quand l'essai les joue
// sans le livre).
//
// Les colonnes de valeurs ont toutes la meme largeur (saab, 2026-10-08 :
// « ajustees sur la plus grande valeur ou sur le plus grand mot ») : les titres
// passent sur plusieurs lignes, coupes aux espaces et apres les signes (« _ »,
// « · », « ( »...), jamais au milieu d'un nombre (0,5).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_REGLAGES_IA,
// LIBELLES_REGLAGES_IA (moteur/historique-profil-ia.js) viennent de fichiers
// charges avant celui-ci.

const echapperBanc = (texte) => String(texte).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
// Une espace insecable : « 35 / 40 » et « 6,8 s » ne se coupent pas.
const INSECABLE = ' ';
const nombreBanc = (valeur, decimales = 1) => (Number.isFinite(valeur) ? valeur.toFixed(decimales).replace('.', ',') : '—');
const REGLAGES_HORS_POIDS_BANC = ['niveau', 'temps', 'version', 'elagage'];
const LIBELLES_RECHERCHE_BANC = { niveau: 'Niveau', temps: 'Réflexion max (s)' };
const MARGE_LARGEUR_BANC = 1; // en caracteres

// Les morceaux d'un titre : un par coupure permise, apres un signe suivi d'une
// lettre ou d'un chiffre, sauf entre deux chiffres.
function morceauxDuTitre(texte) {
  const caracteres = [...String(texte)];
  const morceaux = [''];
  caracteres.forEach((caractere, rang) => {
    morceaux[morceaux.length - 1] += caractere;
    const suivant = caracteres[rang + 1] ?? '';
    const dansUnNombre = /\p{N}/u.test(caracteres[rang - 1] ?? '') && /\p{N}/u.test(suivant);
    if (/[^\p{L}\p{N}\s]/u.test(caractere) && /[\p{L}\p{N}]/u.test(suivant) && !dansUnNombre) morceaux.push('');
  });
  return morceaux;
}

const titreCoupable = (texte) => morceauxDuTitre(texte).map(echapperBanc).join('<wbr>');

// La largeur commune des colonnes : le plus long mot des titres, ou la plus
// longue valeur (coupee aux espaces ordinaires seulement).
function largeurCommune(titres, valeurs) {
  const mots = [...titres.flatMap((titre) => morceauxDuTitre(titre).flatMap((morceau) => morceau.split(' '))), ...valeurs.flatMap((valeur) => String(valeur).split(' '))];
  return `${Math.max(1, ...mots.map((mot) => [...mot].length)) + MARGE_LARGEUR_BANC}ch`;
}

const enteteBanc = (titre, largeur, classe = '') => `<th class="${classe}" style="width:${largeur}">${titreCoupable(titre)}</th>`;

function reglagesCompletsDuBanc(reference, essais) {
  const valeurDe = (profil, cle) => (REGLAGES_HORS_POIDS_BANC.includes(cle) ? profil[cle] : profil.poids[cle]);
  const cles = ['niveau', 'temps', ...CLES_REGLAGES_IA.filter((cle) => REGLAGES_HORS_POIDS_BANC.includes(cle) || [reference, ...essais].some((profil) => profil.poids[cle] !== undefined))];
  const texte = (valeur) => (valeur === undefined ? '—' : String(valeur).replace('.', ','));
  const profils = [reference, ...essais];
  const titres = [`Référence : ${reference.nom}`, ...essais.map((essai, rang) => `${rang + 1}. ${essai.nom}`)];
  const largeur = largeurCommune(titres, cles.flatMap((cle) => profils.map((profil) => texte(valeurDe(profil, cle)))));
  const lignes = cles.map((cle) => {
    const deLaReference = valeurDe(reference, cle);
    const cellules = essais.map((essai) => {
      const valeur = valeurDe(essai, cle);
      return `<td class="${valeur !== deLaReference ? 'banc-change' : ''}">${texte(valeur)}</td>`;
    });
    return `<tr><th>${echapperBanc(LIBELLES_RECHERCHE_BANC[cle] ?? LIBELLES_REGLAGES_IA[cle] ?? cle)}</th><td>${texte(deLaReference)}</td>${cellules.join('')}</tr>`;
  });
  return `<table class="banc-tableau banc-reglages-complets"><tr><th>Réglage</th>${titres.map((titre, rang) => enteteBanc(titre, largeur, rang === 0 ? 'banc-reference' : '')).join('')}</tr>${lignes.join('')}</table>`;
}

function resumeHtmlDuBanc(essais, resume, parametres) {
  const parEssai = parametres.ouvertures * (parametres.revanche ? 2 : 1);
  const titres = [`Gagnées (sur ${parEssai})`, 'en Noir', 'en Blanc', 'Nulles', 'Tours', "Temps de l'essai"];
  const valeurs = resume.map((r) => [`${r.gagnees}${INSECABLE}/${INSECABLE}${r.jouees}`, r.enNoir, r.enBlanc, r.nulles, Math.round(r.tours), `${nombreBanc(r.secondes)}${INSECABLE}s`]);
  const largeur = largeurCommune(titres, valeurs.flat());
  const lignes = essais.map((essai, rang) => {
    const r = resume[rang];
    const classe = r.jouees === 0 ? '' : r.gagnees * 2 > r.jouees ? 'banc-mieux' : r.gagnees * 2 < r.jouees - r.nulles ? 'banc-moins' : '';
    const [gagnees, ...autres] = valeurs[rang];
    return `<tr class="${classe}"><td>${rang + 1}. ${echapperBanc(essai.nom)}</td><td><b>${gagnees}</b></td>${autres.map((valeur) => `<td>${valeur}</td>`).join('')}</tr>`;
  });
  return `<table class="banc-tableau"><tr><th>Essai</th>${titres.map((titre) => enteteBanc(titre, largeur)).join('')}</tr>${lignes.join('')}</table>`;
}

function partiesHtmlDuBanc(essais, parties) {
  const triees = [...parties].sort((a, b) => a.essai - b.essai || a.ouverture - b.ouverture || Number(b.referenceNoir) - Number(a.referenceNoir));
  const essaiNoir = (p) => !p.referenceNoir;
  const gagnee = (p) => (p.fin === 'noir' && essaiNoir(p)) || (p.fin === 'blanc' && !essaiNoir(p));
  const gagnant = (p) => (p.fin.startsWith('nulle') ? p.fin : gagnee(p) ? `essai (${essaiNoir(p) ? 'Noir' : 'Blanc'})` : `référence (${essaiNoir(p) ? 'Blanc' : 'Noir'})`);
  const titres = ['Ouverture', "L'essai joue", 'Gagnant', 'Score', 'Tours'];
  const largeur = largeurCommune(titres, triees.flatMap((p) => [p.ouverture, essaiNoir(p) ? 'Noir' : 'Blanc', gagnant(p), p.score, p.tours]));
  const lignes = triees.map((p) => {
    const texteGagnant = gagnee(p) ? `<b class="banc-essai">${echapperBanc(gagnant(p))}</b>` : echapperBanc(gagnant(p));
    const coups = p.coups
      .map((coup, i) => {
        const parLaReference = (i % 2 === 0) === p.referenceNoir;
        const texte = p.livre[i] ? `<span class="${parLaReference ? 'banc-livre-actif' : 'banc-livre'}">${coup}</span>` : coup;
        return i % 2 === 0 ? `<span class="banc-tour">${i / 2 + 1}.</span>${texte}` : texte;
      })
      .join(' ');
    return `<tr><td>${p.numero}</td><td>${p.essai + 1}. ${echapperBanc(essais[p.essai].nom)}</td><td>${p.ouverture}</td><td>${essaiNoir(p) ? 'Noir' : 'Blanc'}</td><td>${texteGagnant}</td><td>${p.score}</td><td>${p.tours}</td><td class="banc-coups">${coups}</td></tr>`;
  });
  return `<table class="banc-tableau"><tr><th>N°</th><th>Essai</th>${titres.map((titre) => enteteBanc(titre, largeur)).join('')}<th>Séquence</th></tr>${lignes.join('')}</table>`;
}

// Le contenu : { reference, essais, parties, resume, parametres, recoltes (null :
// pas de recolte ; interface/banc-essais-page-puzzles.js, recolteHtml) }.
function contenuDuBanc({ reference, essais, parties, resume, parametres, recoltes = null }) {
  const { ouvertures, revanche, hasard, livre } = parametres;
  const livreDeLaReference = livre
    ? `La référence se sert du livre (ses ${hasard} premiers coups au hasard parmi ceux du livre)`
    : `La référence <b>sans le livre</b> (seulement ses ${hasard} premiers coups au hasard parmi ceux du livre, pour varier les ouvertures)`;
  return `<p class="note-reglages">KAI++ (niveau et réflexion de chacun dans les réglages complets), Marguerite belge, ${ouvertures} ouvertures${revanche ? ' × revanche' : ''}. ${livreDeLaReference}, l'essai jamais.</p>
<h3>Les réglages complets (en orange : ce qui diffère de la référence)</h3>${reglagesCompletsDuBanc(reference, essais)}
<h3>Résumé</h3>${resumeHtmlDuBanc(essais, resume, parametres)}
<h3>Les parties</h3><p class="note-reglages">Un coup du livre en <span class="banc-livre-actif">orange</span> quand la référence le joue, en <span class="banc-livre">vert</span> quand l'essai le joue sans le livre.</p>${partiesHtmlDuBanc(essais, parties)}${recoltes ? recolteHtml(recoltes, parametres.recolte.toursMini) : ''}`;
}

// La page exportee, lisible seule (ses couleurs comprises) : `html`, le contenu
// affiche (contenuDuBanc ou contenuDesPuzzles, interface/banc-essais-page-puzzles.js).
const STYLE_PAGE_BANC = `body { background: #1e1e1e; color: #e4e4e4; font: 13px sans-serif; margin: 12px; }
h1 { font-size: 18px; } h3 { font-size: 15px; margin-top: 18px; } .note-reglages { color: #c4c4c4; }
table { border-collapse: collapse; } th, td { padding: 2px 6px; border-bottom: 1px solid #3a3a3a; text-align: left; vertical-align: top; }
th { color: #9a9a9a; font-weight: normal; vertical-align: bottom; } th.banc-reference { color: #d9b62b; font-weight: bold; } .banc-change { color: #e0832a; font-weight: bold; }
.banc-mieux td:first-child { color: #3fcf7a; } .banc-moins td:first-child { color: #e0832a; } .banc-essai { color: #3fcf7a; }
.banc-coups { font-family: monospace; font-size: 12px; max-width: 900px; } .banc-tour { color: #7a7a7a; margin-left: 4px; }
.banc-livre { color: #3fcf7a; } .banc-livre-actif { color: #e0832a; } .banc-rate { color: #e05a5a; } .banc-moins-sur { color: #d9b62b; }`;

function pageDuBanc(html, titre) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapperBanc(titre)}</title><style>${STYLE_PAGE_BANC}</style></head><body><h1>${echapperBanc(titre)}</h1>${html}</body></html>`;
}
