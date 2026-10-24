// Relire un FICHIER du Banc d'essais pour en revoir les parties (saab, 2026-10-14 :
// « pouvoir cliquer sur une partie pour la charger afin de la voir, et mettre des coches
// sur celles chargées ; on pourrait créer des fichiers LabAl/LabAlCeint, et le titre des
// parties reprendrait le préfixe du fichier d'origine avec sa date + n° ») : la page
// exportee porte les donnees de ses parties dans un bloc JSON ; un fichier exporte avant
// se relit dans son tableau des parties (toutes depuis la Marguerite belge). Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const ID_DONNEES_LABALONE = 'donnees-labalone';
const NOM_DE_FICHIER_LABALONE = /^(LabAl[A-Za-z]*)_(\d{10})/;
const ANCIEN_NOM_DU_BANC = /^banc_essais_(\d{10})/;
const COUP_NACRE_DU_BANC = /^[a-i][1-9][a-i][1-9]$/;

// Le bloc a glisser dans la page : `donnees` ({ parties: [{ numero, variante, position,
// essai, reference, essaiNoir, coups, fin, score }] }). « < » s'ecrit \u003c : un texte
// ne peut pas fermer la balise.
function donneesDuBancEnHtml(donnees) {
  return `<script type="application/json" id="${ID_DONNEES_LABALONE}">${JSON.stringify(donnees).replaceAll('<', '\\u003c')}</script>`;
}

const texteDuHtml = (html) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/ /g, ' ').trim();
const cellulesDe = (ligne) => [...ligne.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(([, cellule]) => cellule);

// Les noms des machines dans le nom d'un fichier (moteur/banc-noms.js :
// LabAl_date_Reference(parties)-Essai1[..], -Essai2[..]) : { reference, essais }, ou null.
// Un nom trop long a perdu ses derniers essais (« (+1 essais) ») : ils manquent.
const MACHINES_DU_NOM_LABALONE = /^LabAl[A-Za-z]*_\d{10}_([^(]+)\(\d+\)(.*)$/;
function machinesDuNomDeFichier(nomDuFichier) {
  const trouve = MACHINES_DU_NOM_LABALONE.exec(nomDuFichier);
  if (!trouve) return null;
  return { reference: trouve[1], essais: [...trouve[2].matchAll(/-([^[,]+)\[\d+x_\d+y_\d+n\]/g)].map(([, machine]) => machine) };
}

// Un fichier d'avant les donnees : le tableau des parties (N°, Essai, Ouverture — « 1 »,
// ou « Standard, 1 » —, L'essai joue, Gagnant, Score, Tours, Séquence) et la reference.
// Le tableau ne nomme que les profils : `machines` (machinesDuNomDeFichier), quand le nom
// du fichier les dit, donne les noms des machines (saab, 2026-10-15 : « il manque
// KAI++niveau et tps, comme dans la notation des parties »).
function partiesDuTableau(html, machines) {
  const debut = html.indexOf('<h3>Les parties</h3>');
  if (debut < 0) return null;
  const tableau = /<table[^>]*>([\s\S]*?)<\/table>/.exec(html.slice(debut))?.[1];
  if (!tableau) return null;
  const reference = machines?.reference ?? texteDuHtml(/Référence : ([\s\S]*?)<\/th>/.exec(html)?.[1] ?? '');
  return [...tableau.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map(([, ligne]) => cellulesDe(ligne))
    .filter((cellules) => cellules.length >= 8 && /^\d+$/.test(texteDuHtml(cellules[0])))
    .map(([numero, essai, ouverture, joue, gagnant, score, , sequence]) => {
      const variante = /^(.+), \d+$/.exec(texteDuHtml(ouverture))?.[1] ?? null;
      return {
        numero: Number(texteDuHtml(numero)),
        variante,
        position: null,
        essai: machines?.essais[Number(/^(\d+)\./.exec(texteDuHtml(essai))?.[1]) - 1] ?? texteDuHtml(essai).replace(/^\d+\.\s*/, ''),
        reference,
        essaiNoir: texteDuHtml(joue) === 'Noir',
        // Ni le numero du tour ni l'Occ en exposant (interface/banc-essais-page.js) ne sont des coups.
        coups: texteDuHtml(sequence.replace(/<span class="banc-tour">[^<]*<\/span>|<sup>[^<]*<\/sup>/g, ' ')).split(/\s+/).filter((coup) => COUP_NACRE_DU_BANC.test(coup)),
        fin: texteDuHtml(gagnant),
        score: texteDuHtml(score),
      };
    });
}

// { prefixe (« LabAl »...), date, parties } d'une page exportee, ou null.
function lireFichierLabAlone(html, nomDuFichier) {
  const nom = NOM_DE_FICHIER_LABALONE.exec(nomDuFichier);
  const ancien = ANCIEN_NOM_DU_BANC.exec(nomDuFichier);
  const bloc = new RegExp(`<script type="application/json" id="${ID_DONNEES_LABALONE}">([\\s\\S]*?)</script>`).exec(html)?.[1];
  let parties = null;
  try {
    parties = bloc ? JSON.parse(bloc).parties : partiesDuTableau(html, machinesDuNomDeFichier(nomDuFichier));
  } catch {
    parties = null;
  }
  if (!Array.isArray(parties) || parties.length === 0) return null;
  return { prefixe: nom?.[1] ?? 'LabAl', date: nom?.[2] ?? ancien?.[1] ?? '', parties };
}

// « LabAl_2610131857_1 » : le prefixe du titre d'une partie revue (moteur/nom-partie.js).
const prefixeDeLaPartie = ({ prefixe, date }, numero) => [prefixe, date, numero].filter((morceau) => morceau !== '').join('_');

// Les parties dans un fichier A PART des resultats (saab, 2026-10-23 : « faire un 2eme fichier
// séparé des parties, comme ça on pourrait les revoir, les supprimer, sans toucher au LabAl des
// résultats ») : le nom des resultats, puis _parties — meme prefixe, meme date, donc les memes
// titres de parties revues.
const SUFFIXE_DU_FICHIER_DES_PARTIES = '_parties';
const nomDuFichierDesParties = (nomDesResultats) => `${nomDesResultats}${SUFFIXE_DU_FICHIER_DES_PARTIES}`;

// Les parties cochees d'un fichier revu, dans un nouveau fichier (saab, 2026-10-23 : « copier ou
// exporter les parties qu'on veut ») : le nom du fichier ouvert, puis _choix et la date — le prefixe
// et la date d'origine restent en tete, les parties gardent leur numero, donc leur titre.
const nomDuFichierDuChoix = (nomDuFichierOuvert, date) => `${nomDuFichierOuvert}_choix${date}`;
