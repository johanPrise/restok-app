/**
 * Le français, langue de repli et langue de référence.
 *
 * Elle est complète par construction : c'est celle dans laquelle l'app a été
 * pensée, et `enableFallback` s'appuie dessus. Une clé absente d'ici est un
 * bug ; une clé absente d'`en.ts` n'est qu'une phrase pas encore traduite.
 *
 * Les formes `{ one, other }` ne sont pas décidées ici : `Intl.PluralRules`
 * choisit laquelle s'applique, et il sait que le français garde le singulier
 * à zéro — « 0 article coché », là où l'anglais dit « 0 items checked ».
 */
export const fr = {
  erreurs: {
    pasDeConnexion: 'Pas de connexion pour le moment.',
    sessionExpiree: 'Ta session a expiré, reconnecte-toi.',
    pasAcces: 'Tu n’as pas accès à ça.',
    disparu: 'Ça n’existe plus.',
    cotéServeur: 'Ça coince de notre côté. Réessaie dans un moment.',
    pasValide: 'Cette information n’est pas valide.',
  },

  /**
   * Les refus de règle métier, nommés par le serveur.
   *
   * Le backend envoie un `code` stable — `shopping_item_already_listed` — et sa
   * propre phrase française. C'est le code qui compte ici : le serveur ne peut
   * pas choisir la langue à la place de quelqu'un qui la choisit dans ses
   * réglages, et qui peut donc lire l'app en anglais depuis un téléphone
   * français. Le serveur nomme le refus, ces phrases-ci le disent.
   *
   * Les clés reprennent les codes **à l'identique** : c'est ce qui permet de
   * vérifier d'un coup d'œil qu'aucun refus n'est resté sans phrase.
   */
  erreursMetier: {
    already_in_a_group:
      'Tu appartiens déjà à un groupe — quitte-le avant d’en rejoindre un autre.',
    admin_cannot_change_own_role: 'Un admin ne change pas son propre rôle.',
    admin_cannot_remove_self:
      'Un admin ne peut pas se retirer lui-même du groupe.',
    bad_credentials: 'Email ou mot de passe incorrect.',
    email_taken: 'Un compte existe déjà avec cet email.',
    ingredient_already_in_recipe: 'Cet item est déjà dans la recette.',
    ingredient_needs_item_or_label:
      'Choisis un item de l’étagère, ou écris le nom de l’ingrédient.',
    initial_quantity_required:
      'Précise la quantité initiale pour un item suivi en quantité.',
    item_already_empty:
      '« %{nom} » est déjà épuisé — il n’y a plus rien à prendre.',
    item_changed_meanwhile:
      'Cet item a changé entre-temps. Rafraîchis pour voir où il en est.',
    last_admin_must_hand_over:
      'Tu es le seul admin : nomme quelqu’un d’autre avant de partir, ou supprime le groupe.',
    password_required_for_email_change:
      'Confirme ton mot de passe pour changer ton email.',
    quantity_required_to_switch:
      'Précise la quantité en stock pour passer en suivi par quantité.',
    restock_quantity_required:
      '« %{nom} » est suivi en quantité : précise la quantité rachetée.',
    shopping_item_already_listed: 'Cet item est déjà sur la liste.',
    shopping_line_needs_item_or_label:
      'Choisis un item de l’étagère, ou écris ce que tu veux acheter.',
    wrong_password: 'Mot de passe incorrect.',
  },

  /**
   * Les refus de formulaire. Ils reprennent les contraintes des DTO du
   * backend, et se disent en toutes lettres plutôt qu'en nombres : « Cent
   * caractères au maximum » se lit, « max: 100 » se déchiffre.
   */
  champs: {
    deuxCaracteres: 'Au moins deux caractères.',
    centCaracteresMax: 'Cent caractères au maximum.',
    vingtCaracteresMax: 'Vingt caractères au maximum.',
    entierZeroCompris: 'Un nombre entier, zéro compris.',
    entierMinimum: 'Un nombre entier, au moins %{count}.',
    emailInvalide: 'Adresse email invalide.',
    confirmeMotDePasse: 'Confirme ton mot de passe.',
  },

  commun: {
    horsLigne: 'Hors-ligne',
    // Deux garanties, deux phrases : les gestes des courses sont écrits sur
    // disque, ceux de l'étagère vivent en mémoire. Voir `lib/offline.ts`.
    horsLigneEnAttente: {
      one: 'Hors-ligne — %{count} geste en attente',
      other: 'Hors-ligne — %{count} gestes en attente',
    },
    horsLigneVolatile: {
      one: 'Hors-ligne — %{count} geste pas encore envoyé, garde l’app ouverte',
      other:
        'Hors-ligne — %{count} gestes pas encore envoyés, garde l’app ouverte',
    },
    validerDemandeConnexion: 'Valider les courses demande une connexion',
    masquerMotDePasse: 'Masquer le mot de passe',
    afficherMotDePasse: 'Afficher le mot de passe',
    masquer: 'Masquer',
    afficher: 'Afficher',
    unDeMoins: 'Un de moins',
    unDePlus: 'Un de plus',
    membre: 'Membre',
    admin: 'Admin',
    toi: ' (toi)',
    retrograder: 'Rétrograder',
    nommerAdmin: 'Nommer admin',
    retirer: 'Retirer',
    masquerBalayage: 'Masquer l’explication du balayage',
    copierLeCode: 'Copier le code',
    copier: 'Copier',
    copie: 'Copié',
    partager: 'Partager',
    formatEnregistre: 'Format enregistré',
    formatDuProduit: 'Format du produit',
    // La virgule décimale suit la langue : « 1.5 L » en anglais.
    exempleFormat: '1,5 L · 500 g · ×6',
    preciserFormat: 'Préciser le format du produit',
    relevéVideSolo:
      'Aucune action pour l’instant — la première fois que tu prends quelque chose s’inscrit ici.',
    relevéVideGroupe:
      'Aucune action pour l’instant — le premier qui prend quelque chose ouvre le bal.',
    chargementHistorique: 'Chargement de l’historique…',
    chargement: 'Chargement…',
    pris: 'pris',
    rachete: 'racheté',
    retour: 'Retour',
    annuler: 'Annuler',
    supprimer: 'Supprimer',
    valider: 'Valider',
    ajouter: 'Ajouter',
    enregistrer: 'Enregistrer',
    enregistre: 'Enregistré.',
    reessayer: 'Réessayer',
  },

  geste: {
    titre: 'Le geste',
    compris: 'Compris',
    // Les astérisques marquent ce qui passe en gras. Un marqueur plutôt que
    // trois clés à recoller : l'ordre des mots change d'une langue à l'autre,
    // et « swipe *left* » ne se découpe pas comme « vers la *gauche* ».
    explication:
      'Tire un tag vers la *gauche* quand tu prends quelque chose, vers la *droite* quand tu en rachètes. Plus tu tires loin, plus la quantité monte.',
  },

  onglets: {
    inventaire: 'Inventaire',
    courses: 'Courses',
    recettes: 'Recettes',
    journal: 'Journal',
    parametres: 'Paramètres',
  },

  acces: {
    statutEtape: 'Accès / Étape 01',
    seConnecter: 'Se connecter',
    creerUnCompte: 'Créer un compte',
    creerLeCompte: 'Créer le compte',
    bienvenue: 'Bienvenue, %{nom}',
    compteCree: 'Compte créé — bienvenue, %{nom}',
    troisPortes:
      'Vous choisirez juste après : un groupe à créer, un à rejoindre, ou votre inventaire à vous.',
    nom: 'Nom',
    email: 'Email',
    exempleNom: 'Sam',
    exempleEmail: 'vous@exemple.fr',
    motDePasse: 'Mot de passe',
    caracteresMinimum: '%{count} caractères minimum',
    statutIdentifiants: 'Statut: attente_identifiants',
    statutCreation: 'Statut: création_compte',
  },

  onboarding: {
    ordre: 'Ordre %{n}',
    promesse: 'Le dernier rouleau ne sera plus jamais une surprise.',
    etagereAlt: 'Une étagère d’inventaire vue de face, ses rayons étiquetés',
    continuer: 'Continuer →',
    pied: 'Système d’inventaire partagé v2.4',
    etape02: 'Onboarding / Étape 02',
    votreEspace: 'Votre espace',
    nouveau: 'Nouveau',
    creerGroupe: 'Créer un groupe',
    creerGroupeQuoi: 'Commencer un nouvel inventaire partagé',
    invitation: 'Invitation',
    rejoindreGroupe: 'Rejoindre un groupe',
    rejoindreQuoi: 'Utiliser un code d’invitation',
    seul: 'Seul',
    justeMoi: 'Juste moi',
    justeMoiQuoi: 'Un inventaire pour toi, sans personne à inviter',
    systeme: 'Restock_os // system_ready // ver_2.4',
    nomDuGroupe: 'Nom du groupe',
    exempleNom: 'Coloc Rue Ordener',
    type: 'Type',
    colocation: 'Colocation',
    association: 'Association',
    creerLeGroupe: 'Créer le groupe',
    groupeCree: 'Groupe « %{nom} » créé',
    statutConfig: 'Statut: configuration',
    inventairePret: 'Ton inventaire est prêt',
    codeInvite: 'Entre le code à huit caractères qu’on t’a donné pour accéder à l’inventaire partagé.',
    rejoindre: 'Rejoindre',
    creerNouveau: 'Créer un nouveau groupe',
    statutPret: 'Statut: prêt',
    statutAttente: 'Statut: attente_entrée',
    // Un faux libellé système, repris des maquettes : il ne se traduit pas
    // plus qu'un voyant sur un boîtier.
    alerteActive: 'Alert_system_active',
    prevenir: 'Prévenir le groupe',
    prevenirQuoi: 'Pour prévenir tout le monde quand un stock est vide.',
    activer: 'Activer les notifications →',
    plusTard: 'Plus tard',
    continuerSimple: 'Continuer',
    refusees: 'Notifications refusées. Tu peux les activer plus tard dans les réglages du téléphone.',
    echecActivation: 'L’activation a échoué. Tu pourras réessayer plus tard.',
    expoGo: 'Expo Go ne reçoit pas les notifications — il faudra l’app compilée.',
    simulateur: 'Un simulateur ne reçoit pas de notifications.',
    pasDisponible: 'Les notifications ne sont pas disponibles dans cette version de l’app.',
  },

  stock: {
    aRacheter: 'À racheter',
    critique: 'Critique',
    stockBas: 'Stock bas',
    disponible: 'Disponible',
  },

  etagere: {
    nonChargee: 'Étagère non chargée',
    indisponible: 'Étagère indisponible',
    chercher: 'Rechercher un item',
    reessayer: 'Réessayer',
    toutEnStock: 'Tout est en stock',
    aRacheter: {
      one: '%{count} item à racheter',
      other: '%{count} items à racheter',
    },
    vide: 'Inventaire vide',
    videAlt: 'Une étagère de rangement vide, sans aucun item',
    aucunResultat: 'Aucun résultat',
    etagereVide: 'Étagère vide',
    aucunNom: 'Aucun item ne porte ce nom.',
    premierSolo: 'Ajoute le premier item que tu veux suivre.',
    premierGroupe: 'Ajoute le premier item que ton groupe suit.',
    ajouterItem: 'Ajouter un item',

    // La création d'un item.
    reserveAdmins: 'Réservé aux admins',
    reserveAdminsQuoi:
      'Seul un administrateur du groupe ajoute des items. Demande-lui de créer celui qui manque.',
    nouvelItem: 'Nouvel item',
    sousTitreAjout: 'Étagère / Ajout',
    nom: 'Nom',
    exempleNom: 'Papier toilette',
    modeDeSuivi: 'Mode de suivi',
    presence: 'Présence',
    presenceQuoi: 'L’item est là, ou il n’y est plus. Rien à compter.',
    quantite: 'Quantité',
    quantiteQuoi: 'On décompte les unités, et la jauge montre ce qu’il reste.',
    quantiteEnStock: 'Quantité en stock',
    alerteEnDessous: 'Alerte en dessous de',
    pleinA: 'Plein à',
    identiqueAuStock: 'identique au stock',
    uneUniteSAppelle: 'Une unité s’appelle',
    exempleUnite: 'rouleau, bidon, dosette…',
    parPaquetDe: 'Par paquet de',
    videSiUnite: 'laisse vide si ça s’achète à l’unité',
    ajouterAEtagere: 'Ajouter à l’étagère',
    itemAjoute: '%{nom} ajouté à l’étagère',
  },

  item: {
    quelquun: 'Quelqu’un',
    introuvable: 'Item introuvable — il a peut-être été supprimé.',
    actionRatee:
      'L’action n’est pas passée. Vérifie ta connexion et réessaie.',
    historique: 'Historique',
    dejaSurLaListe: ', déjà sur la liste de courses',

    // Les deux gestes, et ce qu'ils disent une fois passés.
    prisLeDernier: 'J’ai pris le dernier',
    enAiPris: 'J’en ai pris',
    enAiPrisUn: 'J’en ai pris un',
    aiRachete: 'J’ai racheté',
    enAiRachete: 'J’en ai racheté %{count}',
    unitesPrises: 'Unités prises',
    paquetsRachetes: 'Paquets rachetés',
    unitesRachetees: 'Unités rachetées',
    // `%{quoi}` porte déjà son unité — « 3 rouleaux », ou le nom de l'item
    // quand il n'y a rien à compter.
    prisToast: '%{quoi} pris',
    racheteToast: '%{quoi} racheté',
    indiceQuantite:
      'Balaye vers la droite pour une prise, vers la gauche pour un rachat. Plus la course est longue, plus la quantité est grande.',
    indicePresence:
      'Balaye vers la droite quand il n’y en a plus, vers la gauche après un rachat.',

    enStock: '%{quoi} en stock',
    quandCestPlein: '%{count} quand c’est plein',
    supprimerItem: 'Supprimer l’item',
    suppressionQuoi:
      'L’item disparaît de l’étagère. Son historique, lui, reste au tableau.',
    supprimeDeEtagere: '%{nom} supprimé de l’étagère',
  },

  courses: {
    nonChargee: 'Liste non chargée',
    indisponible: 'Liste indisponible',
    depuisEtagere: 'Depuis l’étagère',
    ajoutsLibres: 'Ajouts libres',
    ajouterArticle: 'Ajouter un article',
    ajouter: 'Ajouter',
    ajouterDepuisEtagere: 'Ajouter %{nom} depuis l’étagère',
    ajouteAuxCourses: '%{nom} ajouté aux courses',
    quantiteCorrigee: '%{nom} : quantité corrigée',
    retireDeLaListe: '%{nom} retiré de la liste',
    faitLesCourses: 'J’ai fait les courses',
    rienAAcheter: 'Rien à acheter',
    etagereReclame: 'L’étagère réclame déjà des choses : verse-les ici.',
    ajouteOuReviens: 'Ajoute un article, ou reviens quand un stock baisse.',
    recupererTout: 'Récupérer ce qui est à racheter',
    recuperer: {
      one: 'Récupérer %{count} item à racheter',
      other: 'Récupérer %{count} items à racheter',
    },
    verses: {
      one: '%{count} item versé dans la liste',
      other: '%{count} items versés dans la liste',
    },
    rachatsEnregistres: {
      one: '%{count} rachat enregistré sur l’étagère',
      other: '%{count} rachats enregistrés sur l’étagère',
    },
    retirerTitre: 'Retirer de la liste ?',
    retirer: 'Retirer',
    annuler: 'Annuler',
    reessayer: 'Réessayer',

    // La ligne, et sa correction.
    decocher: 'Décocher',
    cocher: 'Cocher — appui long pour retirer',
    corrigerQuantite: 'Corriger la quantité',
    corrigerQuantiteA: 'Corriger la quantité : %{quantite}',
    preciserQuantiteDe: 'Préciser la quantité de %{nom}',
    quantiteInvite: 'Quantité ?',
    paquetsAPrendre: 'Paquets à prendre',
    unitesAPrendre: 'Unités à prendre',

    // `count` est le nombre de cochés, `total` la longueur de la liste.
    recap: {
      one: '%{count} sur %{total} coché',
      other: '%{count} sur %{total} cochés',
    },
  },

  journal: {
    nonCharge: 'Journal non chargé',
    // Deux pluriels indépendants dans une même phrase : `i18n-js` n'en accorde
    // qu'un par clé, donc on compose la phrase de deux morceaux accordés
    // séparément. C'est la seule façon de dire « 1 prise, 3 rachats ».
    resume: '%{prises}, %{rachats}',
    prises: { one: '%{count} prise', other: '%{count} prises' },
    rachats: { one: '%{count} rachat', other: '%{count} rachats' },
    tronque:
      'Les %{count} dernières actions seulement. Restreins la période ou choisis une personne pour voir plus loin.',

    periode: 'Période',
    periodeMois: '30 jours',
    periodeTrimestre: '3 mois',
    periodeTout: 'Tout',
    qui: 'Qui',
    toutLeMonde: 'Tout le monde',
    rienSurPeriode: 'Rien sur cette période',
    videTous:
      'Personne n’a rien pris ni racheté. Élargis la période pour remonter plus loin.',
    videPersonne:
      'Cette personne n’a rien pris ni racheté ici. Élargis la période pour remonter plus loin.',
    aPris: 'a pris',
    aRachete: 'a racheté',
  },

  recettes: {
    nonChargees: 'Recettes non chargées',
    indisponibles: 'Recettes indisponibles',
    toutEstLa: 'Tout est là',
    onNeSaitPas: 'On ne sait pas',
    ilManque: 'Il manque %{count}',
    faisables: {
      one: '%{count} plat faisable',
      other: '%{count} plats faisables',
    },
    rienCeSoir: 'Rien de faisable ce soir',
    faisableCeSoir: 'Faisable ce soir',
    ouvrirLaRecette: 'Ouvrir la recette %{nom}',
    pour: 'Pour %{count}',
    noteePar: 'Notée par %{nom}',

    // L'étagère des recettes, vide.
    aucuneRecette: 'Aucune recette',
    aucuneRecetteQuoi:
      'Cherche des recettes et garde celles qui te tentent. L’app dira lesquelles sont faisables avec ce qu’il y a dans le placard.',
    chercherUneRecette: 'Chercher une recette',
    ecrireALaMain: 'Écrire à la main',

    // Le catalogue.
    chercher: 'Chercher',
    sousTitreCatalogue: 'Recettes / Catalogue',
    quoiManger: 'Qu’est-ce que tu veux manger ?',
    astuceRecherche:
      'Tape un plat, un ingrédient, une envie. Les propositions arrivent classées par ce qu’il te reste à acheter.',
    rienTrouve:
      'Rien trouvé pour « %{quete} ». Essaie un mot plus simple — « poulet » plutôt que « poulet du dimanche ».',
    gardee: '« %{nom} » gardée dans tes recettes',
    manquantsA11y: {
      one: '%{nom}, il te manque %{count} ingrédient',
      other: '%{nom}, il te manque %{count} ingrédients',
    },
    toutEstLaAvec: {
      one: 'Tout est là — %{count} ingrédient',
      other: 'Tout est là — %{count} ingrédients',
    },
    // Le pluriel accorde « ingrédients », qui suit le **total** : c'est donc
    // lui qui voyage sous le nom `count`, le seul que `i18n-js` regarde.
    compteEtManquants: {
      one: '%{count} ingrédient · il te manque %{manquants}',
      other: '%{count} ingrédients · il te manque %{manquants}',
    },

    // La fiche.
    introuvable: 'Recette introuvable',
    voirLaRecette: 'Voir la recette',
    ingredients: 'Ingrédients',
    indications: 'Indications',
    enStock: 'En stock',
    nonSuivi: 'Non suivi',
    ilNyEnAPlus: 'Il n’y en a plus',
    signaleEpuise: '%{nom} signalé épuisé',
    rienDeNoteLien: 'Rien de noté ici — la recette est au bout du lien.',
    rienDeNote:
      'Rien de noté. Sans indications, cette fiche ne dit que ce qu’il faut sortir du placard.',
    toutDejaSurListe: 'Tout ce qui manque est déjà sur la liste de courses.',
    ajouterManquants: {
      one: 'Ajouter %{count} manquant aux courses',
      other: 'Ajouter %{count} manquants aux courses',
    },
    manquantsAjoutes: {
      one: '%{count} manquant ajouté aux courses',
      other: '%{count} manquants ajoutés aux courses',
    },
    supprimerLaRecette: 'Supprimer la recette',
    supprimerConfirm: 'Supprimer cette recette ?',
    supprimee: '« %{nom} » supprimée',

    // L'écriture à la main.
    nouvelleRecette: 'Nouvelle recette',
    sousTitreAjout: 'Recettes / Ajout',
    nomDuPlat: 'Nom du plat',
    exemplePlat: 'Risotto aux champignons',
    retirerIngredient: 'Retirer %{nom}',
    ajouterDepuisEtagere: 'Ajouter %{nom} depuis l’étagère',
    depuisEtagere: 'Depuis l’étagère',
    nomIngredient: 'Nom d’un ingrédient',
    exempleIngredients: 'Riz, sel, tomates…',
    exempleIndications:
      'Laver la salade et l’essorer.\nÉgoutter le thon, l’émietter.\nMélanger, assaisonner au dernier moment.',
    uneEtapeParLigne: 'Une étape par ligne. C’est ce qu’on relit en cuisinant.',
    ouLaTrouver: 'Où la trouver',
    exempleSource: 'https://… ou « le livre rouge, p. 42 »',
    pourCombien: 'Pour combien de personnes',
    recetteAjoutee: 'Recette « %{nom} » ajoutée',
  },

  unites: {
    paquets: { one: 'paquet', other: 'paquets' },
  },

  parametres: {
    compte: 'Compte',
    modifierCompte: 'Modifier mon compte',
    seDeconnecter: 'Se déconnecter',
    deconnecte: 'Tu es déconnecté',
    ouvrirAuxAutres: 'Ouvrir aux autres',
    membres: 'Membres',
    gerer: 'Gérer',
    terminer: 'Terminer',
    estAdmin: '%{nom} est admin',
    nEstPlusAdmin: '%{nom} n’est plus admin',
    retireDuGroupe: '%{nom} retiré du groupe',

    // Le mot du partage n'a pas cours devant quelqu'un qui ne partage rien.
    supprimerInventaire: 'Supprimer mon inventaire',
    supprimerGroupe: 'Supprimer le groupe',
    // L'astérisque marque le nom à retaper, qui passe en gras — voir `emphase`.
    suppressionSolo:
      'Ton étagère, tes courses et tes recettes partent avec. Retape *%{nom}* pour confirmer.',
    suppressionGroupe: {
      one: 'L’étagère et le membre partent avec. Retape *%{nom}* pour confirmer.',
      other:
        'L’étagère et les %{count} membres partent avec. Retape *%{nom}* pour confirmer.',
    },
    nomDeTonInventaire: 'Nom de ton inventaire',
    nomDuGroupe: 'Nom du groupe',
    groupeSupprime: 'Groupe « %{nom} » supprimé',

    quitterLeGroupe: 'Quitter le groupe',
    quitter: 'Quitter',
    quitterQuoi:
      'Tu perds l’accès à l’étagère. Ton compte reste, et ton passage reste inscrit dans l’historique des items.',
    quitte: 'Tu as quitté le groupe',

    inventaireRenomme: 'Inventaire renommé « %{nom} »',
    groupeRenomme: 'Groupe renommé « %{nom} »',
    renommerInventaire: '%{nom}, appuie pour renommer ton inventaire',
    renommerGroupe: '%{nom}, appuie pour renommer le groupe',

    langue: 'Langue',
    appareil: 'Appareil',
    suitLeTelephone: 'Suit le réglage du téléphone — %{nom} en ce moment.',
  },

  compte: {
    titre: 'Mon compte',
    sousTitre: 'Profil / Identité',
    nom: 'Nom',
    exempleNom: 'Comment on t’appelle',
    email: 'Email',
    exempleEmail: 'vous@exemple.fr',
    tonMotDePasse: 'Ton mot de passe',
    pourConfirmer: 'Pour confirmer le changement d’email',
    explication:
      'Ton nom s’affiche sous chaque prise et chaque rachat. Ton email sert à te connecter — le changer demande ton mot de passe.',
  },
} as const;
