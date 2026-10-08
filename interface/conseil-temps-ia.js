// Le CONSEIL DE TEMPS d'un niveau de l'IA (saab, 2026-10-08 : « un conseil de tps
// qd on choisit les profondeurs de IA »), sous la reflexion max du choix d'une
// machine (interface/choix-joueurs.js) : combien de temps KAI++ met d'habitude a
// finir ce niveau, et si la reflexion max choisie risque de l'arreter avant.
//
// Les temps : mesures le 2026-10-08 sur le PC de saab (16 coeurs, un seul utilise),
// KAI++ avec Normal v4el (elagage 10) et Normal v4 (sans elagage), sur 23
// positions de vraies parties (debut, milieu et fin) — [mediane, 80 %] en
// secondes, une position apres l'autre ; Infinity : plus de 2 minutes (la mesure
// s'arretait la).
// Un telephone est plusieurs fois plus lent ; KAI (JavaScript) aussi.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const TEMPS_DES_NIVEAUX_KAI_PLUS_S = {
  avecElagage: { 1: [0, 0], 2: [0, 0.01], 3: [0.01, 0.01], 4: [0.03, 0.04], 5: [0.14, 0.17], 6: [0.38, 0.5], 7: [1.4, 2], 8: [3.44, 5.47] },
  sansElagage: { 1: [0, 0], 2: [0, 0.01], 3: [0.02, 0.03], 4: [0.09, 0.11], 5: [0.96, 1.21], 6: [2.85, 6.62], 7: [32.1, 71.1], 8: [Infinity, Infinity] },
};
// KAI (JavaScript) : 40 a 80 fois plus lent que KAI++ (Aide, « KAI et KAI++ »).
const KAI_PLUS_LENT_QUE_KAI_PLUS = 50;
const SOUS_LE_DIXIEME_S = 0.1;
const SECONDES_PAR_MINUTE_CONSEIL = 60;
const DIX_SECONDES = 10; // au-dela, a la seconde pres

function secondesLisibles(secondes) {
  if (secondes === Infinity) return 'plus de 2 min';
  if (secondes < SOUS_LE_DIXIEME_S) return 'moins de 0,1 s';
  if (secondes >= SECONDES_PAR_MINUTE_CONSEIL) return `${Math.round(secondes / SECONDES_PAR_MINUTE_CONSEIL)} min`;
  if (secondes >= DIX_SECONDES) return `${Math.round(secondes)} s`;
  return `${(Math.round(secondes * 10) / 10).toString().replace('.', ',')} s`;
}

// { texte, tropCourt } pour { moteur ('kai' | 'kai++'), niveau, elague (le profil
// elague), reflexionMax (en s) } ; null si le niveau n'a pas de mesure.
function conseilDeTemps({ moteur, niveau, elague, reflexionMax }) {
  const table = elague ? TEMPS_DES_NIVEAUX_KAI_PLUS_S.avecElagage : TEMPS_DES_NIVEAUX_KAI_PLUS_S.sansElagage;
  const mesure = table?.[niveau];
  if (!mesure) return null;
  const facteur = moteur === 'kai' ? KAI_PLUS_LENT_QUE_KAI_PLUS : 1;
  const [habituel, souvent] = mesure.map((secondes) => secondes * facteur);
  const qui = `${moteur === 'kai' ? 'KAI' : 'KAI++'}, ${elague ? 'avec' : 'sans'} élagage`;
  const tropCourt = reflexionMax < souvent;
  const suite = tropCourt
    ? ` Avec ${secondesLisibles(reflexionMax)} de réflexion max, il s'arrêtera souvent avant (il joue alors le meilleur coup de la profondeur finie)${souvent === Infinity ? ' : baissez plutôt le niveau, ou prenez un profil qui élague (« el »).' : ` : donnez-lui au moins ${secondesLisibles(souvent)}.`}`
    : '';
  return { texte: `Niveau ${niveau} (${qui}) : d'habitude ${secondesLisibles(habituel)} par coup, ${secondesLisibles(souvent)} le plus souvent au plus, sur un ordinateur (un téléphone : plusieurs fois plus).${suite}`, tropCourt };
}

// La ligne du conseil, sous `champReflexion` (la reflexion max d'une machine) :
// `lireChoix()` -> { role ('humain' | 'kai' | 'kai++'), niveau, elague }. Elle
// suit chaque frappe dans le champ ; renvoie afficher(reflexionMax), a appeler a
// chaque autre changement (niveau, moteur, profil).
function brancherConseilDeTemps(champReflexion, lireChoix) {
  const ligne = document.createElement('p');
  ligne.className = 'conseil-temps-niveau';
  champReflexion.closest('label, .ligne-reglage, p, div').after(ligne);
  const afficher = (reflexionMax) => {
    const { role, niveau, elague } = lireChoix();
    const conseil = role === 'kai' || role === 'kai++' ? conseilDeTemps({ moteur: role, niveau, elague, reflexionMax }) : null;
    ligne.hidden = !conseil;
    ligne.textContent = conseil?.texte ?? '';
    ligne.classList.toggle('conseil-trop-court', Boolean(conseil?.tropCourt));
  };
  champReflexion.addEventListener('input', () => afficher(Number(champReflexion.value)));
  return afficher;
}
