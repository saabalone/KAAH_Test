// RÉGLER L'ESSAI dans le Banc d'essais (saab, 2026-10-14 : « pouvoir régler IA essai en
// affichant un tableau de comparaison avec IA ref, le même que "Les réglages complets",
// chaque poids de la colonne IA essai aura des flèches pour augmenter/diminuer ; en fin de
// test un btn Valider Profil s'affichera en vert si test IA essai n'est pas orange, pour
// créer un nouveau profil »). Un tableau Reference / Essai : l'essai est le premier
// profil coche ; ce qu'on y retouche (en orange : ce qui differe de la reference) part
// avec lui dans la serie, son nom le dit (« · gain 80 », comme Faire varier). La
// validation du profil : interface/banc-essais.js.
//
// Pas d'import ni d'export (voir moteur/plateau.js) : CLES_REGLAGES_IA,
// LIBELLES_REGLAGES_IA, valeursReglagesIA (moteur/historique-profil-ia.js), echapperBanc
// (interface/banc-essais-page.js), trouverProfilIA, validerUneRetoucheDuProfilIA
// (interface/profils-ia.js), garderUneRetoucheACote (interface/profils-ia.js),
// formaterDateKAAWA (interface/sauvegarde.js) viennent de
// fichiers charges avant celui-ci.
// Les groupes de l'evaluation (saab, 2026-10-16) : groupeDuReglage (moteur/ia-groupes.js), groupesQuiCommencent, htmlDuTitreDeGroupe, styleDuGroupe (interface/groupes-ia.js),
// qui ne servent qu'une fois la page chargee.

const REGLAGES_HORS_ESSAI = ['version', 'livre', 'style'];
const valeurDeLEssai = (profil, cle) => (cle === 'elagage' ? profil.elagage : profil.poids[cle]);

// `conteneur` : la ou dessiner le tableau ; `surChange()` : le total et le reste suivent.
// Renvoie { afficher(reference, essai), retoucher(profil) (le profil du banc avec sa
// retouche), retoucheDe(nom), oublier(nom) }.
function creerReglageDeLEssai(conteneur, surChange) {
  const retouches = new Map(); // nom du profil -> { cle: valeur (null : sans) }

  // Le profil du banc (`profil`, ses poids d'origine) avec sa retouche, et son nom qui la dit.
  function retoucher(profil) {
    const retouche = retouches.get(profil.profil) ?? {};
    const cles = Object.keys(retouche);
    if (cles.length === 0) return profil;
    const poids = { ...profil.poids };
    let { elagage } = profil;
    for (const cle of cles) {
      if (cle === 'elagage') elagage = retouche[cle] ?? 0;
      else if (retouche[cle] === null) delete poids[cle];
      else poids[cle] = retouche[cle];
    }
    const libelle = cles.map((cle) => `${cle} ${retouche[cle] === null ? 'sans' : String(retouche[cle]).replace('.', ',')}`).join(' · ');
    return { ...profil, nom: `${profil.nom} · ${libelle}`, poids, elagage, retouche };
  }

  // `reference`, `essai` : des profils du banc (sans retouche pour l'essai).
  function afficher(reference, essai) {
    if (!essai) {
      conteneur.innerHTML = '<p class="note-reglages">Cochez un profil à essayer : le premier coché se règle ici.</p>';
      return;
    }
    const retouche = retouches.get(essai.profil) ?? {};
    const valeur = (cle) => (cle in retouche ? retouche[cle] ?? undefined : valeurDeLEssai(essai, cle));
    const texte = (v) => (v === undefined ? '—' : String(v).replace('.', ','));
    const cles = CLES_REGLAGES_IA.filter((cle) => !REGLAGES_HORS_ESSAI.includes(cle));
    // Groupe apres groupe, sous le nom de chacun (saab, 2026-10-16, interface/groupes-ia.js).
    const debuts = groupesQuiCommencent(cles, groupeDuReglage);
    const lignes = cles.map((cle, rang) => {
      const deLaReference = valeurDeLEssai(reference, cle);
      const v = valeur(cle);
      const titre = debuts[rang] ? htmlDuTitreDeGroupe(debuts[rang], 3) : '';
      return `${titre}<tr class="${v !== deLaReference ? 'banc-change' : ''}"><th${styleDuGroupe(groupeDuReglage(cle))}>${echapperBanc(LIBELLES_REGLAGES_IA[cle] ?? cle)}</th><td>${texte(deLaReference)}</td><td><input class="nombre-reglage" type="number" step="1" data-reglage-essai="${cle}" value="${v ?? ''}" placeholder="sans" title="Vide : sans ce poids. Les flèches : de 1 en 1 (un appui prolongé va vite)" /></td></tr>`;
    });
    conteneur.innerHTML = `<p class="note-reglages">Essai : <b>${echapperBanc(essai.nom)}</b>${Object.keys(retouche).length ? ` — retouché (${Object.keys(retouche).length}) <button class="bouton-liste-reglage" type="button" data-oublier-retouche title="Remet les valeurs du profil">↺ tout remettre</button>` : ''}. En orange : ce qui diffère de la référence.</p>
<table class="banc-tableau banc-reglage-essai"><tr><th>Réglage</th><th>Référence : ${echapperBanc(reference.nom)}</th><th>Essai</th></tr>${lignes.join('')}</table>`;
    conteneur.onchange = (evenement) => {
      const champ = evenement.target.closest('[data-reglage-essai]');
      if (!champ) return;
      const cle = champ.dataset.reglageEssai;
      const nouvelle = champ.value.trim() === '' ? null : Number(champ.value.replace(',', '.'));
      const siens = { ...(retouches.get(essai.profil) ?? {}) };
      // Revenu a la valeur du profil : plus une retouche.
      if ((nouvelle ?? undefined) === valeurDeLEssai(essai, cle)) delete siens[cle];
      else siens[cle] = nouvelle;
      retouches.set(essai.profil, siens);
      afficher(reference, essai);
      surChange();
    };
    conteneur.onclick = (evenement) => {
      if (!evenement.target.closest('[data-oublier-retouche]')) return;
      retouches.delete(essai.profil);
      afficher(reference, essai);
      surChange();
    };
  }

  return { afficher, retoucher, retoucheDe: (nom) => retouches.get(nom) ?? {}, oublier: (nom) => retouches.delete(nom) };
}

// La VALIDATION AUTOMATIQUE en fin de serie (saab, 2026-10-18, « oui B est logique, on ne
// va pas changer en pire ») : l'essai retouche (Regler l'essai) contre la reference —
// gagne (plus de victoires que de defaites) : sa retouche devient la version courante de
// son profil (interface/profils-ia.js, validerUneRetoucheDuProfilIA) ; a egalite ou perdue :
// elle est gardee a cote, en nouveau profil suffixe « = » ou « - » (garderUneRetoucheACote),
// le profil ne change pas. Une serie arretee ne valide rien. `note` : ou le dire.
// Renvoie valider(serie, arretee).
const EXPLICATION_DE_LA_VALIDATION = "En fin de série, l'essai retouché est validé tout seul : s'il gagne contre la référence, sa retouche devient une nouvelle version de son profil ; à égalité ou perdu, elle est gardée à côté, en nouveau profil suffixé « = » ou « - » (le profil d'origine ne change pas).";
function brancherValidationDuProfil(note, reglage) {
  // `serie.essaisRetouches()` : [{ essai, resume }] (interface/banc-essais-series.js).
  return function valider(serie, arretee) {
    const retouche = serie?.essaisRetouches?.().find(({ resume }) => resume.jouees > 0);
    note.hidden = !retouche;
    if (!retouche) return;
    if (arretee) {
      note.textContent = "Série arrêtée : la retouche de l'essai n'est pas validée (elle reste dans Régler l'essai).";
      return;
    }
    const { essai, resume } = retouche;
    const profil = trouverProfilIA(essai.profil);
    if (!profil) {
      note.textContent = `Le profil « ${essai.profil} » n'existe plus : rien n'est validé.`;
      return;
    }
    const perdues = resume.jouees - resume.gagnees - resume.nulles;
    const valeurs = { ...valeursReglagesIA(profil), elagage: essai.elagage, poids: essai.poids };
    const date = formaterDateKAAWA(new Date());
    const bilan = `${resume.gagnees} gagnées, ${perdues} perdues, ${resume.nulles} nulles`;
    if (resume.gagnees > perdues) {
      const nom = validerUneRetoucheDuProfilIA(profil, valeurs, date);
      note.textContent = `Retouche gagnante (${bilan}) : validée, nouvelle version « ${nom} » (Réglages > Profil IA). ${EXPLICATION_DE_LA_VALIDATION}`;
    } else {
      const issue = resume.gagnees === perdues ? '=' : '-';
      const nom = garderUneRetoucheACote(profil, valeurs, date, issue, `retouche de ${libelleProfilIA(profil)} au banc : ${bilan}`);
      note.textContent = `Retouche ${issue === '=' ? 'à égalité' : 'perdante'} (${bilan}) : gardée à côté, « ${nom} » ; « ${libelleProfilIA(profil)} » ne change pas. ${EXPLICATION_DE_LA_VALIDATION}`;
    }
    reglage.oublier(essai.profil);
  };
}
