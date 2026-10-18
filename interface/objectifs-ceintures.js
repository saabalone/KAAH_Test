// Ce qu'on APPREND a chaque ceinture (saab, 2026-10-17, ses textes de la Blanche a la
// Marron, « à compléter ou corriger si besoin » ; la Noire et les Dans proposes d'apres
// les listes du profil Entrainement de saab_v6). Affiche sous la ceinture ouverte, au-dessus
// de la consigne (interface/entrainement-ceintures.js, htmlDesPropositions). Le niveau de
// la machine, les pendules et le handicap n'y sont pas : ils viennent des reglages du
// profil (descriptionDuGrade), une seule source.
//
// Un texte par grade, dans l'ordre de CEINTURES (moteur/entrainement.js) ; '' : rien a dire.
//
// Pas d'import ni d'export (voir moteur/plateau.js).

const OBJECTIFS_DES_CEINTURES = [
  {
    variantes: 'Apprendre les 2 variantes de base : Standard (Bloc défensif) et Marguerite Belge (Sous-groupes offensifs, utilisée en compétition).',
    pzl: 'Apprendre les menaces par déplacement en ligne, sur 2 tours.',
  },
  {
    variantes: 'Les variantes de la Blanche.',
    pzl: 'Apprendre les menaces par déplacement en saut, sur 2 tours.',
  },
  {
    variantes: 'Celles de la Jaune, + une en Bloc défensif au choix, + Le Mur (Espace défensif), + Alien (Espace emprisonnant).',
    pzl: 'Utiliser les menaces en ligne et en saut, et éviter les pièges, sur 2 tours.',
  },
  {
    variantes: "Celles de l'Orange, + Fujiyama (Bloc emprisonnant), + une en Espace défensif au choix, + 6 9 (Espace emprisonnant).",
    pzl: 'Ceux de l\'Orange, + 3 tours en 5 coups (Noir gagne avec 3 ou 4 billes).',
  },
  {
    variantes: 'Celles de la Verte, + en apprendre une de chaque type.',
    pzl: 'Ceux de la Verte, + 3 tours en 5 coups (Noir gagne avec plus de 4 billes).',
  },
  {
    variantes: 'Celles de la Bleue, + en apprendre 2 de chaque type.',
    pzl: 'Ceux de la Bleue, + tous les 3 tours en 6 coups.',
  },
  {
    variantes: 'Celles de la Marron, + en apprendre 3 de chaque type.',
    pzl: 'Ceux de la Marron, + les premiers PZL à 4 tours.',
  },
  {
    variantes: 'Celles du 1er Dan, contre la machine la plus forte (niveau 8).',
    pzl: 'Ceux du 1er Dan, + tous les PZL à 4 tours.',
  },
  {
    variantes: 'Celles du 2e Dan, avec moins de temps par coup.',
    pzl: 'Ceux du 2e Dan, plus vite.',
  },
  {
    variantes: 'Celles du 3e Dan, avec encore moins de temps par coup.',
    pzl: 'Ceux du 3e Dan, + les premiers PZL à 5 tours.',
  },
  {
    variantes: 'Toutes celles des Dans précédents, sans faiblesse : connaître chaque type.',
    pzl: 'Ceux du 4e Dan, + tous les PZL à 5 tours.',
  },
  {
    variantes: 'Celles du 5e Dan, avec moins de temps à la pendule.',
    pzl: 'Tous les PZL, à garder sans faiblesse.',
  },
  {
    variantes: 'Celles du 6e Dan, avec encore moins de temps à la pendule.',
    pzl: 'Tous les PZL, à garder sans faiblesse.',
  },
  {
    variantes: 'Celles du 7e Dan, avec encore moins de temps à la pendule.',
    pzl: 'Tous les PZL, à garder sans faiblesse.',
  },
  {
    variantes: 'Celles du 8e Dan, en partant avec 1 bille de handicap.',
    pzl: 'Tous les PZL, + le PZL à 6 tours, avec moins de temps.',
  },
  {
    variantes: 'Celles du 9e Dan, en partant avec 2 billes de handicap.',
    pzl: 'Tous les PZL, avec encore moins de temps.',
  },
];

// Le paragraphe sous la ceinture ouverte ('' s'il n'y a rien a dire).
function objectifDeLaCeinture(grade, sorte) {
  const texte = OBJECTIFS_DES_CEINTURES[grade]?.[sorte] ?? '';
  return texte ? `<p class="objectif-ceinture"><strong>Objectif :</strong> ${texte}</p>` : '';
}
