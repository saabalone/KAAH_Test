// Le trace d'une courroie tendue autour d'une suite de cercles (des
// « poulies »), comme une corde passee autour de piquets : droite d'un cercle
// au suivant (leur tangente commune), arc de cercle autour de chacun. Sert a la
// corde du plateau (rendu/corde.js) : saab la veut droite entre deux
// elements, arrondie seulement en les contournant.
//
// Une poulie : { x, y, rayon }. Rayon POSITIF : la poulie est a DROITE de la
// corde (elle tourne a droite autour, a l'ecran) ; NEGATIF : a gauche. Rayon
// nul : un simple point de passage (debut, fin).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : rien d'autre n'est
// necessaire ici.

// Points de contact de la tangente commune de `a` vers `b` : sa direction d
// laisse chaque poulie du bon cote, sa normale droite n (a l'ecran, y vers le
// bas : n = (-d.y, d.x)) verifie n . (b - a) = b.rayon - a.rayon.
function tangenteEntrePoulies(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  // Deux poulies qui se touchent (ou presque) : cosinus borne, tangente de longueur nulle.
  const cosinus = Math.max(-1, Math.min(1, (b.rayon - a.rayon) / distance));
  const angle = Math.atan2(dy, dx) + Math.acos(cosinus);
  const n = { x: Math.cos(angle), y: Math.sin(angle) };
  return {
    depart: { x: a.x - a.rayon * n.x, y: a.y - a.rayon * n.y },
    arrivee: { x: b.x - b.rayon * n.x, y: b.y - b.rayon * n.y },
  };
}

// Angle balaye autour de `poulie` de `de` a `vers`, dans le sens ou la corde
// tourne ; un tour presque complet est un arrondi nul (erreur d'arrondi).
function angleBalaye(poulie, de, vers) {
  const tour = 2 * Math.PI;
  const debut = Math.atan2(de.y - poulie.y, de.x - poulie.x);
  const fin = Math.atan2(vers.y - poulie.y, vers.x - poulie.x);
  const balaye = (((poulie.rayon > 0 ? fin - debut : debut - fin) % tour) + tour) % tour;
  return balaye > tour - 1e-6 ? 0 : balaye;
}

// Les morceaux de la courroie, de la premiere poulie a la derniere :
// { depart, morceaux: [{ vers } (droite) | { vers, rayon, grandArc, sensHoraire } (arc)] }.
function tracerCourroie(poulies) {
  const tangentes = poulies.slice(1).map((poulie, i) => tangenteEntrePoulies(poulies[i], poulie));
  const morceaux = [];
  tangentes.forEach((tangente, i) => {
    morceaux.push({ vers: tangente.arrivee });
    const poulie = poulies[i + 1];
    const suivante = tangentes[i + 1];
    if (!suivante || poulie.rayon === 0) return;
    const balaye = angleBalaye(poulie, tangente.arrivee, suivante.depart);
    if (balaye === 0) return;
    morceaux.push({ vers: suivante.depart, rayon: Math.abs(poulie.rayon), grandArc: balaye > Math.PI, sensHoraire: poulie.rayon > 0 });
  });
  return { depart: tangentes[0].depart, morceaux };
}

// En chemin SVG ; `miroir` : retourne haut et bas (y -> -y), ce qui inverse
// aussi le sens de chaque arc.
function cheminDeCourroie({ depart, morceaux }, miroir = false) {
  const signe = miroir ? -1 : 1;
  const point = ({ x, y }) => `${x},${y * signe}`;
  return (
    `M${point(depart)}` +
    morceaux
      .map((morceau) =>
        morceau.rayon === undefined
          ? ` L${point(morceau.vers)}`
          : ` A${morceau.rayon},${morceau.rayon} 0 ${morceau.grandArc ? 1 : 0} ${morceau.sensHoraire !== miroir ? 1 : 0} ${point(morceau.vers)}`
      )
      .join('')
  );
}
