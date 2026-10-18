// Les INFOBULLES AU DOIGT (saab, 2026-10-16 : « oui, faire qu'un appui long sur un élément
// affiche son infobulle ») : un téléphone n'a pas de survol, il ne montre jamais le
// `title` d'un element. Un appui tenu sur un element qui en a un l'affiche dans une
// bulle, sans declencher l'element (le clic qui suit est mange) ; la bulle part au
// prochain toucher, ou toute seule apres quelques secondes. Pour toute la page d'un coup.
//
// Jamais sur le plateau ni les petits plateaux (<svg> : on y joue) ni sur un bouton dont
// l'appui prolonge fait deja autre chose (interface/appui-prolonge.js, les pas − / +).
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const DUREE_APPUI_INFOBULLE_MS = 550;
const DUREE_AFFICHAGE_INFOBULLE_MS = 5000;
const DEPLACEMENT_MAX_APPUI_PX = 10; // au-dela, le doigt fait defiler : pas d'infobulle
const MARGE_INFOBULLE_PX = 8;

function demarrerInfobullesTactiles() {
  const bulle = document.createElement('div');
  bulle.className = 'infobulle-tactile';
  bulle.hidden = true;
  document.body.append(bulle);
  let attente = null;
  let disparition = null;
  let depart = null;
  let mangerLeClic = false;

  const cacher = () => {
    bulle.hidden = true;
    clearTimeout(disparition);
  };

  function montrer(texte, x, y) {
    bulle.textContent = texte;
    bulle.hidden = false;
    const { width, height } = bulle.getBoundingClientRect();
    // Au-dessus du doigt (il cacherait la bulle), dans l'ecran.
    bulle.style.left = `${Math.max(MARGE_INFOBULLE_PX, Math.min(x - width / 2, window.innerWidth - width - MARGE_INFOBULLE_PX))}px`;
    bulle.style.top = `${Math.max(MARGE_INFOBULLE_PX, y - height - 3 * MARGE_INFOBULLE_PX)}px`;
    clearTimeout(disparition);
    disparition = setTimeout(cacher, DUREE_AFFICHAGE_INFOBULLE_MS);
  }

  document.addEventListener(
    'pointerdown',
    (evenement) => {
      cacher();
      clearTimeout(attente);
      mangerLeClic = false;
      if (evenement.pointerType === 'mouse') return;
      const element = evenement.target.closest?.('[title]');
      if (!element || element.closest('svg') || element.closest('[data-appui-prolonge]') || !element.title.trim()) return;
      depart = { x: evenement.clientX, y: evenement.clientY };
      attente = setTimeout(() => {
        mangerLeClic = true;
        montrer(element.title, depart.x, depart.y);
      }, DUREE_APPUI_INFOBULLE_MS);
    },
    true
  );
  document.addEventListener(
    'pointermove',
    (evenement) => {
      if (depart && Math.hypot(evenement.clientX - depart.x, evenement.clientY - depart.y) > DEPLACEMENT_MAX_APPUI_PX) clearTimeout(attente);
    },
    true
  );
  for (const fin of ['pointerup', 'pointercancel']) document.addEventListener(fin, () => clearTimeout(attente), true);
  // Le clic qui suit un appui long ne declenche rien : on ne voulait que lire.
  document.addEventListener(
    'click',
    (evenement) => {
      if (!mangerLeClic) return;
      mangerLeClic = false;
      evenement.preventDefault();
      evenement.stopPropagation();
    },
    true
  );
  // Ni le menu du navigateur sur un appui long.
  document.addEventListener('contextmenu', (evenement) => {
    if (mangerLeClic) evenement.preventDefault();
  });
}
