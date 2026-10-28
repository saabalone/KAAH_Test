// Les REGLAGES INTEGRES Lune, Terre et Soleil (saab, 2026-10-23 : « ajouter les 3 fichiers de
// réglage Lune, Terre, Soleil, et mettre Lune par défaut ») : des profils de Reglages toujours la,
// comme Défaut, jamais modifies (une retouche cree un profil a soi : interface/reglages-profils.js).
// Chacun ne garde que ce qui differe de Défaut, comme un export de Reglages : ses exports
// settings_kaah_2610230152 (Lune), _2610230148 (Terre) et _2610230148 (1) (Soleil). Pur.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : fusionnerReglages (moteur/reglages.js)
// vient d'un fichier charge avant celui-ci.

const REGLAGES_INTEGRES = Object.freeze({
  Lune: {
    board: {
      bg_color: [0.4666666666666667, 0.47843137254901963, 0.49019607843137253, 1],
      hole_color: [0.23137254901960785, 0.23529411764705882, 0.24313725490196078, 1],
      app_bg_color: [0.10196078431372549, 0.0392156862745098, 0.09019607843137255, 1],
    },
    kaah: {
      eject_bg_color: [0.4666666666666667, 0.47843137254901963, 0.49019607843137253, 1],
      occ_bg_color: [0.23137254901960785, 0.23529411764705882, 0.24313725490196078, 1],
    },
  },
  Terre: {
    board: {
      bg_color: [0.3764705882352941, 0.5411764705882353, 0.8117647058823529, 1],
      hole_color: [0.7098039215686275, 0.5843137254901961, 0.12941176470588237, 1],
      app_bg_color: [0.10196078431372549, 0.0392156862745098, 0.09019607843137255, 1],
    },
    kaah: {
      eject_bg_color: [0.40784313725490196, 0.5725490196078431, 0.047058823529411764, 1],
      occ_bg_color: [0.7098039215686275, 0.5843137254901961, 0.12941176470588237, 1],
    },
  },
  Soleil: {
    board: {
      bg_color: [0.9647058823529412, 0.7450980392156863, 0.00784313725490196, 1],
      hole_color: [0.9607843137254902, 0.5607843137254902, 0, 1],
      app_bg_color: [0.7607843137254902, 0.2, 0.011764705882352941, 1],
    },
    kaah: {
      eject_bg_color: [0.9764705882352941, 0.5843137254901961, 0.2627450980392157, 1],
      occ_bg_color: [0.9607843137254902, 0.4823529411764706, 0, 1],
    },
  },
});

// Les reglages actifs sur un appareil neuf : Terre depuis le 2026-10-28 (saab : « On peut mettre aussi ce setting
// par défaut, ça simplifiera pour ceux qui ne veulent pas faire de recherche » — son export
// settings_kaah_2610280436, exactement Terre) ; Lune avant. Un appareil qui a deja choisi Lune la garde.
const NOM_REGLAGES_DE_DEPART = 'Terre';

// Les reglages complets de `nom` (fusionnes sur Défaut), ou null s'il n'est pas integre.
function reglagesIntegres(nom) {
  return Object.hasOwn(REGLAGES_INTEGRES, nom) ? fusionnerReglages(REGLAGES_INTEGRES[nom]) : null;
}
