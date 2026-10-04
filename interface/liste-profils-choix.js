// La liste des profils IA du choix d'un joueur (boite du debut de partie, boite
// du nom : interface/choix-joueurs.js), saab 2026-10-04 :
//   - « tous les profils s'affichent, ce qui fait une grande liste : ajouter
//     une selection de style de base pour n'afficher que le style choisi » ;
//   - « on ne voit pas les versions precedentes : si j'ai fait _v3, la _v2 ne
//     se trouve que dans l'historique de Reglages » — chaque profil a soi est
//     suivi de ses anciennes versions (« ↳ v2 · 03/10 14:10 »), jouables telles
//     quelles (moteur/historique-profil-ia.js, choisirVersionIA).
// La valeur d'une ancienne version : le nom du profil, puis « #v » et son numero.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : NOMS_STYLES_IA
// (moteur/ia.js), choisirVersionIA, libelleDateHistoriqueIA
// (moteur/historique-profil-ia.js), listerProfilsIA, trouverProfilIA,
// libelleProfilIA (interface/profils-ia.js), colorerListeProfilsIA
// (interface/couleurs-ia.js) viennent de fichiers charges avant celui-ci.

const SEPARATEUR_VERSION_PROFIL = '#v';
const TOUS_LES_STYLES_IA = '';

// Le profil d'une valeur de la liste, a la version choisie ; null s'il n'existe plus.
function profilDuChoix(valeur) {
  const [nom, numero] = String(valeur).split(SEPARATEUR_VERSION_PROFIL);
  const profil = trouverProfilIA(nom);
  return profil && numero ? choisirVersionIA(profil, Number(numero)) : profil;
}

// La valeur de la liste pour une machine deja en jeu : son profil, a la version
// qu'elle joue si ce n'est plus la courante.
function valeurDuProfilDeLaMachine(machine) {
  const profil = trouverProfilIA(machine.profil);
  const numero = machine.versionProfil ?? 1;
  return profil?.historique && profil.courante !== numero ? `${machine.profil}${SEPARATEUR_VERSION_PROFIL}${numero}` : machine.profil;
}

function optionDeProfil(valeur, texte) {
  const option = document.createElement('option');
  option.value = valeur;
  option.textContent = texte;
  return option;
}

// Remplit `select` : les profils du style `filtreStyle` (tous si vide), chacun
// suivi de ses anciennes versions ; `profilGarde`, un profil qui n'existe plus
// (celui d'une machine deja en jeu), en tete. Renvoie la valeur choisie :
// `voulue` si elle est dans la liste, sinon la premiere.
function remplirListeProfils(select, { voulue, filtreStyle, profilGarde }) {
  const options = [];
  if (profilGarde && !trouverProfilIA(profilGarde)) options.push(optionDeProfil(profilGarde, profilGarde));
  for (const profil of listerProfilsIA()) {
    if (filtreStyle !== TOUS_LES_STYLES_IA && profil.style !== filtreStyle) continue;
    options.push(optionDeProfil(profil.nom, libelleProfilIA(profil)));
    const anciennes = (profil.historique ?? []).filter((version) => version.numero !== profil.courante).sort((a, b) => b.numero - a.numero);
    for (const version of anciennes) {
      const date = version.date ? ` · ${libelleDateHistoriqueIA(version.date)}` : '';
      options.push(optionDeProfil(`${profil.nom}${SEPARATEUR_VERSION_PROFIL}${version.numero}`, `   ↳ v${version.numero}${date}`));
    }
  }
  select.replaceChildren(...options);
  const valeurs = options.map((option) => option.value);
  select.value = valeurs.includes(voulue) ? voulue : (valeurs[0] ?? NOMS_STYLES_IA.normal);
  colorerListeProfilsIA(select);
  return select.value;
}

// Le style a filtrer d'abord : celui du profil choisi (une liste courte).
function styleDuChoix(valeur) {
  return profilDuChoix(valeur)?.style ?? TOUS_LES_STYLES_IA;
}
