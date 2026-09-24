// Fermer une boite en cliquant en dehors (demande de saab), pour TOUTES les
// boites de KAAH d'un coup — chacune garde aussi son bouton de fermeture.
//
// Un clic dehors fait exactement ce que fait Echap : il leve l'evenement
// `cancel` du <dialog>, puis le ferme. Les boites qui reagissent deja a leur
// fermeture (confirmation : rien n'est confirme ; mode des pendules : vaut
// Annuler) se comportent donc comme avec Echap, sans rien changer chez elles.
//
// Sur un <dialog> ouvert par showModal(), un clic sur le fond (::backdrop) arrive
// sur le <dialog> lui-meme : on le reconnait a ce qu'il tombe HORS du cadre de
// la boite. Il faut aussi que le geste ait COMMENCE dehors : sinon glisser la
// boite Reglages (interface/deplacable.js), ou selectionner un texte en
// relachant hors de la boite, la fermerait par surprise.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

function estHorsDuCadre(dialogue, evenement) {
  if (evenement.target !== dialogue) return false;
  const cadre = dialogue.getBoundingClientRect();
  return (
    evenement.clientX < cadre.left ||
    evenement.clientX > cadre.right ||
    evenement.clientY < cadre.top ||
    evenement.clientY > cadre.bottom
  );
}

function fermerLesBoitesParClicExterieur() {
  for (const dialogue of document.querySelectorAll('dialog')) {
    let commenceDehors = false;
    dialogue.addEventListener('pointerdown', (evenement) => {
      commenceDehors = estHorsDuCadre(dialogue, evenement);
    });
    dialogue.addEventListener('click', (evenement) => {
      if (!commenceDehors || !estHorsDuCadre(dialogue, evenement) || !dialogue.open) return;
      commenceDehors = false;
      if (dialogue.dispatchEvent(new Event('cancel', { cancelable: true }))) dialogue.close();
    });
  }
}
