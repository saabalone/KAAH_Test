// Jauge du nombre de parties enregistrees sur l'icone "Mes parties" (phase
// 12ter — idee de saab, n'existe PAS dans KAAWA : ses parties sont de vrais
// fichiers, visibles et supprimables a la main dans game_my/ ; KAAH les garde
// dans la memoire du navigateur, invisibles tant qu'on n'ouvre pas le
// dialogue). Un badge TOUJOURS visible (jamais seulement au survol,
// CLAUDE.md) pour penser a vider avant que le stockage du navigateur ne pose
// probleme : vert tant qu'on reste sous le seuil, rouge au-dela.
//
// Seuil REGLABLE (correctif, saab) : dans la boite "Mes parties" elle-meme
// (jamais dans "Réglages" comme prevu au depart — un reglage d'AFFICHAGE de
// cette boite precise, pas un reglage du jeu au sens de moteur/reglages.js,
// donc pas dans son fichier `settings_N.json`). Un seul seuil desormais
// (avant : deux, un pour apparaitre, un pour rougir) : par defaut tres bas
// (2) pour que saab puisse voir le rouge sans creer 50 parties de test.
//
// Pas d'import ni d'export (voir moteur/plateau.js) :
// listerPartiesEnregistrees vient de interface/sauvegarde.js, charge avant
// celui-ci dans index.html.

const CLE_SEUIL_JAUGE_PARTIES = 'kaah-seuil-jauge-parties';
const SEUIL_JAUGE_PARTIES_PAR_DEFAUT = 2;

function lireSeuilJaugeParties() {
  try {
    const brut = window.localStorage.getItem(CLE_SEUIL_JAUGE_PARTIES);
    // `Number(null)` vaut 0 (jamais NaN) : sans ce garde explicite, une cle
    // absente (premiere visite) retombait sur 0 au lieu du vrai defaut (2).
    if (brut === null) return SEUIL_JAUGE_PARTIES_PAR_DEFAUT;
    const valeur = Number(brut);
    return Number.isFinite(valeur) && valeur >= 0 ? valeur : SEUIL_JAUGE_PARTIES_PAR_DEFAUT;
  } catch {
    return SEUIL_JAUGE_PARTIES_PAR_DEFAUT;
  }
}

function definirSeuilJaugeParties(valeur) {
  try {
    window.localStorage.setItem(CLE_SEUIL_JAUGE_PARTIES, String(valeur));
  } catch {
    // Tant que la page reste ouverte, le changement vaut quand meme.
  }
}

// `element` : le badge lui-meme (index.html, .badge-mes-parties). A appeler
// au demarrage, puis a chaque fois que le nombre de parties (ou le seuil)
// peut avoir change : chaque coup/navigation sauvegarde, chaque
// suppression, chaque retouche du champ de seuil.
function actualiserJaugeMesParties(element) {
  const nombre = listerPartiesEnregistrees().length;
  element.hidden = nombre === 0;
  element.textContent = String(nombre);
  element.classList.toggle('badge-mes-parties-alerte', nombre > lireSeuilJaugeParties());
}

// Cable le champ numerique de seuil (boite "Mes parties") : pre-rempli au
// seuil actuel, chaque retouche l'enregistre et rafraichit tout de suite le
// badge (`element`, le meme que ci-dessus).
function demarrerReglageJaugeMesParties(champSeuil, element) {
  champSeuil.value = lireSeuilJaugeParties();
  champSeuil.addEventListener('input', () => {
    const valeur = Number(champSeuil.value);
    definirSeuilJaugeParties(Number.isFinite(valeur) && valeur >= 0 ? valeur : SEUIL_JAUGE_PARTIES_PAR_DEFAUT);
    actualiserJaugeMesParties(element);
  });
}
