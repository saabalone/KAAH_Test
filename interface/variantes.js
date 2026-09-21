// Dialogue "Variantes" (Phase 13) : parcourir les variantes officielles
// de KAAWA (donnees/kaa-variantes.js, copie mecanique de
// KAA_variants_kaa.json — voir ce fichier), avec un apercu au premier
// clic sur une ligne et un chargement au second (meme principe que
// KAAWA), plus des favoris.
//
// Favoris adaptes au navigateur, PAS le systeme a 3 fichiers de KAAWA
// (KAA_variants_usual.json + le prefixe "(my) " pour distinguer une
// variante _kaa d'une variante _my du meme nom) — saab a choisi cette
// methode plus simple, sur le meme principe que "Mes parties"
// (interface/sauvegarde.js) : un tableau de noms dans localStorage. KAAH
// n'a de toute facon aucun acces au systeme de fichiers depuis le
// navigateur, rien ne pourrait ecrire dans un vrai fichier _my ou _usual.
//
// Reconstruit entierement a chaque ouverture (innerHTML) : rien n'est
// anime ni ne garde d'etat entre deux ouvertures, contrairement au
// plateau (voir CLAUDE.md, interdiction de reconstruire LE PLATEAU par
// innerHTML — cette regle ne vise pas cette liste, ni l'apercu ci-dessous
// qui est un <svg> totalement independant du plateau principal).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : dessinerPlateau,
// poserBille (rendu/plateau-svg.js), dessinerEjectionsApercu
// (rendu/ejections-apercu.js) et depuisNotation (moteur/plateau.js)
// viennent tous des fichiers charges avant celui-ci dans index.html.

const CLE_FAVORIS_VARIANTES = 'kaah-variantes-favorites';

// Marguerite Belge et Standard restent TOUJOURS groupees ensemble dans cet
// ordre, meme sans etre favorites (demande de saab) : ce sont les deux
// points de depart les plus utilises, inutile de les chercher dans la
// liste alphabetique a chaque fois. Voir rangDePriorite plus bas.
const NOM_MARGUERITE_BELGE = 'Marguerite Belge';
const NOM_STANDARD = 'Standard';

function listerVariantesFavorites() {
  try {
    const texte = window.localStorage.getItem(CLE_FAVORIS_VARIANTES);
    return texte ? JSON.parse(texte) : [];
  } catch {
    return [];
  }
}

function basculerVarianteFavorite(nom) {
  const favoris = listerVariantesFavorites();
  const index = favoris.indexOf(nom);
  if (index === -1) favoris.push(nom);
  else favoris.splice(index, 1);
  try {
    window.localStorage.setItem(CLE_FAVORIS_VARIANTES, JSON.stringify(favoris));
  } catch {
    // Tant pis : voir interface/sauvegarde.js, meme philosophie —
    // jamais de plantage pour un favori qui n'a pas pu s'enregistrer.
  }
}

// `elements` : { bouton, dialogue, liste, apercu, fermer}. `apercu` est un
// <svg> vide, dedie a l'apercu (jamais le plateau principal) : les billes
// ejectees (rendu/ejections-apercu.js) s'y dessinent aussi, en 2 colonnes
// dans son coin bas-gauche, comme KAAWA.
// `variantes` : le tableau renvoye par moteur.lireVariantes.
// `surChargement(variante)` est appele quand l'utilisateur confirme le
// chargement d'une variante (voir index.html, qui sait demarrer une
// partie neuve sur cette position).
function demarrerSelectionVariantes(elements, variantes, surChargement) {
  let previsualisee = null;

  elements.bouton.addEventListener('click', () => {
    previsualisee = null;
    elements.apercu.innerHTML = '';
    rafraichir();
    elements.dialogue.showModal();
  });
  elements.fermer.addEventListener('click', () => elements.dialogue.close());

  // Cliquer l'APERCU lui-meme vaut confirmation (idee de saab) : c'est ce
  // qu'on regarde au moment de decider, et c'est la plus grande cible de la
  // fenetre — plus besoin de revenir viser la ligne.
  elements.apercu.addEventListener('click', () => {
    if (!previsualisee) return;
    surChargement(previsualisee);
    elements.dialogue.close();
  });

  function rafraichir() {
    elements.liste.innerHTML = '';
    const favoris = listerVariantesFavorites();
    // Les favoris d'abord, comme les "Usuals" de KAAWA : plus simple a
    // retrouver que de faire defiler les 71 a chaque fois. Ordre
    // alphabetique a l'interieur de chaque groupe, SAUF Marguerite Belge
    // et Standard (voir rangDePriorite) qui gardent toujours la meme place
    // l'une par rapport a l'autre, favorites ou non.
    const triees = [...variantes].sort((a, b) => {
      const rangA = rangDePriorite(a, favoris);
      const rangB = rangDePriorite(b, favoris);
      if (rangA !== rangB) return rangA - rangB;
      return a.nom.localeCompare(b.nom);
    });
    for (const variante of triees) {
      elements.liste.appendChild(creerLigne(variante, favoris.includes(variante.nom)));
    }
    garderLaLigneChoisieEnVue();
  }

  // Position d'une variante dans la liste, la plus petite valeur en tete.
  // Marguerite Belge et Standard sont EPINGLEES (saab : "mettre tjs la
  // marguerite Belge en 1ere ligne, Standard en 2eme, et si pas favori les
  // mettre a la fin des favoris dans cet ordre aussi") : en tete des
  // favoris si favorites (rang 0/1, devant les AUTRES favoris, rang 2),
  // sinon juste APRES les favoris (rang 3/4, avant tout le reste, rang 5)
  // — jamais melangees au tri alphabetique ordinaire des deux groupes.
  function rangDePriorite(variante, favoris) {
    const estFavori = favoris.includes(variante.nom);
    if (variante.nom === NOM_MARGUERITE_BELGE) return estFavori ? 0 : 3;
    if (variante.nom === NOM_STANDARD) return estFavori ? 1 : 4;
    return estFavori ? 2 : 5;
  }

  // La liste est entierement reconstruite a chaque clic : sans ceci, la
  // ligne qu'on vient de choisir peut se retrouver hors de la partie visible
  // et il faut la rechercher pour la confirmer (signale par saab). Le
  // defilement est calcule A LA MAIN sur la liste elle-meme, jamais par
  // `scrollIntoView` : celui-ci laisse le navigateur deplacer la FENETRE
  // entiere s'il le juge utile — deja rencontre, voir interface/sequence.js.
  function garderLaLigneChoisieEnVue() {
    const ligne = elements.liste.querySelector('.ligne-variante-previsualisee');
    if (!ligne) return;
    const cadreListe = elements.liste.getBoundingClientRect();
    const cadreLigne = ligne.getBoundingClientRect();
    if (cadreLigne.top < cadreListe.top) {
      elements.liste.scrollTop -= cadreListe.top - cadreLigne.top;
    } else if (cadreLigne.bottom > cadreListe.bottom) {
      elements.liste.scrollTop += cadreLigne.bottom - cadreListe.bottom;
    }
  }

  function creerLigne(variante, estFavorite) {
    const ligne = document.createElement('div');
    ligne.className = variante === previsualisee ? 'ligne-liste ligne-variante-previsualisee' : 'ligne-liste';

    const boutonFavori = document.createElement('button');
    boutonFavori.type = 'button';
    // Deux classes distinctes plutot qu'une seule avec un modificateur :
    // ★ et ☆ se ressemblent trop a taille normale (saab l'a signale), la
    // couleur doit porter l'essentiel de la difference, pas seulement le
    // caractere.
    boutonFavori.className = estFavorite ? 'bouton-favori bouton-favori-actif' : 'bouton-favori';
    boutonFavori.textContent = estFavorite ? '★' : '☆';
    boutonFavori.title = estFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris';
    boutonFavori.addEventListener('click', (evenement) => {
      evenement.stopPropagation(); // ne doit pas aussi previsualiser/charger la ligne
      basculerVarianteFavorite(variante.nom);
      rafraichir();
    });
    ligne.appendChild(boutonFavori);

    const texte = document.createElement('span');
    texte.className = 'ligne-liste-texte';
    texte.textContent = variante.createur ? `${variante.nom} (${variante.createur})` : variante.nom;
    ligne.appendChild(texte);

    ligne.addEventListener('click', () => {
      if (previsualisee === variante) {
        surChargement(variante);
        elements.dialogue.close();
        return;
      }
      previsualisee = variante;
      afficherApercu(variante);
      rafraichir(); // remet en evidence la ligne previsualisee
    });

    return ligne;
  }

  // Dessine `variante.position` dans le <svg> d'apercu, independant du
  // plateau principal — identifiants prefixes pour ne jamais entrer en
  // collision avec ceux des vraies billes en jeu (deux <svg> distincts
  // dans le meme document HTML, les id doivent rester uniques partout).
  function afficherApercu(variante) {
    elements.apercu.innerHTML = '';
    dessinerPlateau(elements.apercu);
    for (const [notation, bille] of Object.entries(variante.position.plateau)) {
      const { q, r } = depuisNotation(notation);
      poserBille(elements.apercu, { id: `apercu-${bille.id}`, q, r, couleur: bille.couleur });
    }
    dessinerEjectionsApercu(
      elements.apercu,
      variante.position.billesEjecteesNoires,
      variante.position.billesEjecteesBlanches
    );
  }
}
