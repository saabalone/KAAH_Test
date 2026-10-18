// La REFLEXION DE L'IA dans Conseils (saab, 2026-10-16 : « pour Conseil : même si dans
// livre, se servir de réflexion de IA (avec choix IA, niveau, et El) ») : un profil (son
// élagage compris, ses anciennes versions aussi), un niveau et une reflexion max ;
// « Réfléchir » demande a KAI++ ce qu'il jouerait ici, SANS le livre d'ouvertures. Sa
// reponse et sa sequence arrivent dans Reflexion IA comme une suggestion (interface/ia.js),
// sa recherche par premier coup dans le tableau du dessous ; toucher une sequence la
// montre sur le petit plateau, et dans les 4 groupes (interface/graphique-groupes.js).
//
// Pas d'import ni d'export (voir moteur/plateau.js) : machineDuProfil (moteur/profils-ia.js),
// remplirListeProfils, profilDuChoix (interface/liste-profils-choix.js), trouverProfilIA
// (interface/profils-ia.js), NOMS_STYLES_IA (moteur/ia.js) viennent de fichiers charges
// avant celui-ci.

const NIVEAU_CONSEIL_IA_PAR_DEFAUT = 6;
const REFLEXION_CONSEIL_IA_PAR_DEFAUT_S = 30;
const PROFIL_CONSEIL_IA_PAR_DEFAUT = nomDuProfilIAParDefaut(); // interface/profils-ia.js
const TOUS_LES_STYLES_CONSEIL_IA = '';

// `elements` : { profil (select), niveau, reflexion, reflechir } ; `suggerer(machine)` :
// interface/ia.js (la machine reflechit sur la position du plateau).
function demarrerConseilIA(elements, suggerer) {
  const remplir = () => remplirListeProfils(elements.profil, { voulue: elements.profil.value || PROFIL_CONSEIL_IA_PAR_DEFAUT, filtreStyle: TOUS_LES_STYLES_CONSEIL_IA });
  elements.niveau.value ||= String(NIVEAU_CONSEIL_IA_PAR_DEFAUT);
  elements.reflexion.value ||= String(REFLEXION_CONSEIL_IA_PAR_DEFAUT_S);
  remplir();
  // Les profils changent (Reglages) : la liste se refait a chaque fois qu'on la touche.
  elements.profil.addEventListener('pointerdown', remplir);
  elements.reflechir.addEventListener('click', () => {
    const profil = profilDuChoix(elements.profil.value) ?? trouverProfilIA(NOMS_STYLES_IA.normal);
    const niveau = Math.max(1, Math.round(Number(elements.niveau.value)) || NIVEAU_CONSEIL_IA_PAR_DEFAUT);
    const reflexionMax = Math.max(1, Number(elements.reflexion.value) || REFLEXION_CONSEIL_IA_PAR_DEFAUT_S);
    suggerer(machineDuProfil(profil, { niveau, reflexionMax, moteur: 'kai++', livre: false }));
  });
}
