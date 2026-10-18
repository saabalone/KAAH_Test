// Le retour au toucher (saab, 2026-10-08 : « mettre vibration sur les touches
// tel, et un son de clic sur ordi ») : chaque appui sur une commande ou sur le
// plateau fait vibrer brievement le telephone, ou cliquer l'ordinateur.
//
// Le clic est SYNTHETISE (WebAudio, un oscillateur tres court) : rien a lire,
// donc rien que le navigateur refuse en double-clic (file://) — voir l'en-tete
// de interface/sons.js. Il suit le Son global, le Volume et sa propre case
// (`sound.touch_click`). La vibration a sa case a elle (`touch.vibrate`) et ne
// depend pas du Son global : on coupe le son pour ne pas deranger, la vibration
// ne derange pas.
//
// iPHONE / SAFARI : navigator.vibrate n'y existe pas (Apple ne l'ouvre pas aux
// pages web) ; l'appel est simplement sans effet, sur Android il vibre.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const VIBRATION_TOUCHER_MS = 12;
const CLIC_DUREE_S = 0.025;
const CLIC_FREQUENCE_HZ = 1500;
// Le clic, a volume plein, reste bien plus discret que les sons de KAAWA.
const CLIC_VOLUME_MAX = 0.25;
const CLIC_VOLUME_FINAL = 0.0001; // une rampe exponentielle ne peut pas finir a 0
const COMMANDES_TOUCHABLES = 'button, a[href], input, select, summary, label, [role="button"], #plateau';

// `sons` : ce que renvoie demarrerSons (interface/sons.js), pour ses cases et son volume.
function demarrerRetourToucher(sons) {
  let contexte = null;

  function cliquer() {
    if (!sons.lire('sound.enabled') || !sons.lire('sound.touch_click') || sons.lireVolume() === 0) return;
    try {
      contexte ??= new AudioContext();
      const debut = contexte.currentTime;
      const oscillateur = contexte.createOscillator();
      const enveloppe = contexte.createGain();
      oscillateur.type = 'square';
      oscillateur.frequency.value = CLIC_FREQUENCE_HZ;
      enveloppe.gain.setValueAtTime(CLIC_VOLUME_MAX * sons.lireVolume(), debut);
      enveloppe.gain.exponentialRampToValueAtTime(CLIC_VOLUME_FINAL, debut + CLIC_DUREE_S);
      oscillateur.connect(enveloppe).connect(contexte.destination);
      oscillateur.start(debut);
      oscillateur.stop(debut + CLIC_DUREE_S);
    } catch {
      // Pas de WebAudio : pas de clic, rien d'autre ne change.
    }
  }

  // En capture : avant les commandes elles-memes, dont certaines arretent l'evenement.
  document.addEventListener(
    'pointerdown',
    (evenement) => {
      if (!evenement.target.closest?.(COMMANDES_TOUCHABLES)) return;
      if (evenement.pointerType === 'touch') {
        if (sons.lire('touch.vibrate')) navigator.vibrate?.(VIBRATION_TOUCHER_MS);
      } else if (evenement.pointerType === 'mouse' || evenement.pointerType === 'pen') cliquer();
    },
    true
  );
}
