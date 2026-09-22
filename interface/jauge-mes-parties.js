// Jauge du nombre de parties enregistrees sur l'icone "Mes parties" (phase
// 12ter — idee de saab, n'existe PAS dans KAAWA : ses parties sont de vrais
// fichiers, visibles et supprimables a la main dans game_my/ ; KAAH les garde
// dans la memoire du navigateur, invisibles tant qu'on n'ouvre pas le
// dialogue). Un badge TOUJOURS visible (jamais seulement au survol,
// CLAUDE.md) pour penser a vider avant que le stockage du navigateur ne pose
// probleme : rien sous le premier seuil, vert entre les deux, rouge au-dela.
//
// Seuils PROVISOIREMENT fixes ici, pas encore reglables — le panneau de
// reglages (phase 22) les reprendra comme valeurs par defaut modifiables.
//
// Pas d'import ni d'export (voir moteur/plateau.js) :
// listerPartiesEnregistrees vient de interface/sauvegarde.js, charge avant
// celui-ci dans index.html.

const SEUIL_JAUGE_PARTIES_VERT = 20;
const SEUIL_JAUGE_PARTIES_ROUGE = 50;

// `element` : le badge lui-meme (index.html, .badge-mes-parties). A appeler
// au demarrage, puis a chaque fois que le nombre de parties peut avoir
// change (chaque coup/navigation sauvegarde, chaque suppression).
function actualiserJaugeMesParties(element) {
  const nombre = listerPartiesEnregistrees().length;
  element.hidden = nombre < SEUIL_JAUGE_PARTIES_VERT;
  element.textContent = String(nombre);
  element.classList.toggle('badge-mes-parties-alerte', nombre >= SEUIL_JAUGE_PARTIES_ROUGE);
}
