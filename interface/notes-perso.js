// Bloc-notes personnel "NP" (phase 27, PLAN.md) : reprend l'idee de KAAWA
// (kaa_app_ClO_Co.py, action_notes_perso) — un texte libre, jamais lie a
// une partie ni a une position, qui reste d'une session a l'autre. KAAWA
// l'ecrit dans un fichier (KAA_notes_perso.txt) via un bouton "Enregistrer"
// explicite ; KAAH n'a pas de fichier et enregistre a chaque frappe dans
// localStorage, meme philosophie que le reste du stockage local (interface/
// sauvegarde.js) : plus sur qu'un bouton qu'on peut oublier de toucher
// avant de fermer l'onglet, et rien a cliquer pour ne rien perdre.
//
// Ecart assume avec KAAWA : la recherche integree dans le texte (barre de
// recherche + bouton "Suivant") n'est pas reprise ici — PLAN.md ne demande
// qu'un "bloc-notes libre persistant", un <textarea> y suffit. A ajouter
// plus tard si le besoin s'en fait sentir.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const CLE_NOTES_PERSO = 'kaah-notes-perso';

// `elements` : { bouton, dialogue, champ, fermer } — `fermer` est une LISTE
// de boutons (en haut et en bas de la boite, meme idiome que interface/aide.js).
function demarrerNotesPerso(elements) {
  elements.bouton.addEventListener('click', () => {
    try {
      elements.champ.value = window.localStorage.getItem(CLE_NOTES_PERSO) ?? '';
    } catch {
      elements.champ.value = '';
    }
    elements.dialogue.showModal();
  });

  elements.champ.addEventListener('input', () => {
    try {
      window.localStorage.setItem(CLE_NOTES_PERSO, elements.champ.value);
    } catch {
      // Tant pis : voir l'en-tete du fichier, jamais de plantage pour une
      // note qui n'a pas pu s'enregistrer.
    }
  });

  for (const bouton of elements.fermer) bouton.addEventListener('click', () => elements.dialogue.close());
}
