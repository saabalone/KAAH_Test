// Les LIGNES et les FLECHES du panneau Conseils (interface/next-move.js) : la dominance
// d'un conseil, sa ligne dans la liste, et les fleches de tous. Extrait
// d'interface/next-move.js (regle des 200 lignes).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

// La couleur de dominance d'un conseil, reprise de KAAWA
// (kaa_tab_manager_ClO_Co.py, C_GREEN/C_RED/C_BLUE) : victoires,
// defaites ou nulles, celle qui l'emporte donne sa couleur ; une egalite
// (y compris 0-0-0, aucune partie jouee depuis ce coup) reste neutre.
function classeDominanceConseil(conseil) {
  const { victoires, defaites, nulles } = conseil;
  if (victoires > defaites && victoires > nulles) return 'victoire';
  if (defaites > victoires && defaites > nulles) return 'defaite';
  if (nulles > victoires && nulles > defaites) return 'nulle';
  return 'egalite';
}

// 4 colonnes : Coup, Gagne, Nul, Perdu — cet ORDRE precis (Nul avant
// Perdu) demande par saab, "qui montre plus une regression" que l'ordre
// habituel W/L/D. Le coup est colore comme sa fleche (meme dominance
// victoires/nulles/defaites) ; les 3 chiffres, eux, gardent chacun sa
// PROPRE couleur fixe (vert/bleu/rouge), jamais celle de la dominance.
// `previsualise` : c'est le coup mis en avant ; `surClic()` : la ligne touchee.
function ligneDeConseil(conseil, previsualise, surClic) {
  const ligne = document.createElement('div');
  ligne.className =
    previsualise ? 'ligne-liste ligne-conseil ligne-variante-previsualisee' : 'ligne-liste ligne-conseil';

  const texte = document.createElement('span');
  texte.className = `ligne-liste-texte texte-conseil-${classeDominanceConseil(conseil)}`;
  texte.textContent = conseil.coup;
  ligne.appendChild(texte);

  ligne.appendChild(creerValeur(conseil.victoires, 'valeur-gagne'));
  ligne.appendChild(creerValeur(conseil.nulles, 'valeur-nul'));
  ligne.appendChild(creerValeur(conseil.defaites, 'valeur-perdu'));

  ligne.addEventListener('click', surClic);
  return ligne;
}

function creerValeur(nombre, classe) {
  const valeur = document.createElement('span');
  valeur.className = classe;
  valeur.textContent = nombre;
  return valeur;
}

// Les fleches de `conseils` : toutes translucides en toile de fond, sauf le coup mis en
// avant (`previsualise`), opaque, dessine en dernier — donc peint au-dessus des autres.
function flechesDesConseils(conseils, previsualise) {
  const fleches = [];
  const maxVictoires = Math.max(0, ...conseils.map((c) => c.victoires));
  const maxDefaites = Math.max(0, ...conseils.map((c) => c.defaites));
  for (const conseil of conseils) {
    if (conseil === previsualise) continue; // celle-la se dessine a part, opaque, plus bas
    fleches.push({
      coup: conseil.coup,
      classe: classeDominanceConseil(conseil),
      dominante: (conseil.victoires === maxVictoires && maxVictoires > 0) || (conseil.defaites === maxDefaites && maxDefaites > 0),
      translucide: true,
    });
  }

  if (previsualise) {
    // Meme couleur que dans la toile de fond (signale par saab) :
    // la dominance du coup, jamais une couleur "apercu" a part.
    fleches.push({ coup: previsualise.coup, classe: classeDominanceConseil(previsualise) });
  }
  return fleches;
}
