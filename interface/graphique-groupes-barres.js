// La BOITE DES BARRES du graphique des 4 groupes (interface/graphique-groupes.js) : sous
// les courbes ; tiree par sa poignee, elle sort du panneau (saab, 2026-10-16 : « doit
// pouvoir sortir de la boîte 4 groupes ») et se pose n'importe ou, sa poignee toujours
// dans l'ecran — sinon on ne pourrait plus ni la tirer ni la fermer. Posee dans <body> :
// jamais sous une boite du dessus, jamais tournee avec la colonne de droite. ⤓ la remet
// sous les courbes. Extrait d'interface/graphique-groupes.js (regle des 200 lignes).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const dansLEcran = (valeur, taille, place) => Math.min(Math.max(0, valeur), Math.max(0, place - taille));

// `boite` : la boite des barres ; `zone` : celle des courbes, qu'elle suit quand elle est
// rentree.
function brancherLaBoiteDesBarres(boite, zone) {
  const rentrer = boite.querySelector('[data-rentrer-barres]');

  function detacher() {
    const cadre = boite.getBoundingClientRect();
    document.body.append(boite);
    boite.classList.add('barres-detachees');
    [boite.style.left, boite.style.top] = [`${cadre.left}px`, `${cadre.top}px`];
    rentrer.hidden = false;
  }

  function remettre() {
    zone.after(boite);
    boite.classList.remove('barres-detachees');
    [boite.style.left, boite.style.top] = ['', ''];
    rentrer.hidden = true;
  }

  boite.addEventListener('pointerdown', (evenement) => {
    if (!evenement.target.closest('.poignee-barres-groupes')) return;
    evenement.preventDefault();
    if (!boite.classList.contains('barres-detachees')) detacher();
    const cadre = boite.getBoundingClientRect();
    const [decalX, decalY] = [evenement.clientX - cadre.left, evenement.clientY - cadre.top];
    const suivre = (deplacement) => {
      boite.style.left = `${dansLEcran(deplacement.clientX - decalX, cadre.width, window.innerWidth)}px`;
      boite.style.top = `${dansLEcran(deplacement.clientY - decalY, cadre.height, window.innerHeight)}px`;
    };
    const lacher = () => {
      window.removeEventListener('pointermove', suivre);
      window.removeEventListener('pointerup', lacher);
    };
    window.addEventListener('pointermove', suivre);
    window.addEventListener('pointerup', lacher);
  });
  rentrer.addEventListener('click', remettre);
}
