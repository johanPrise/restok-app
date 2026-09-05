/**
 * L'anglais.
 *
 * Il n'est pas là pour faire nombre : sans une deuxième langue réellement
 * écrite, on livrerait une machinerie qu'on n'a jamais vue fonctionner. C'est
 * lui qui prouve que l'extraction tient — et c'est lui qui révèle les endroits
 * où le français était dans la logique plutôt que dans le texte.
 *
 * Le cas d'école est juste en dessous : `zéro` prend le pluriel ici et le
 * singulier en français. Aucune des deux langues ne le décide — `Intl` le sait.
 */
export const en = {
  erreurs: {
    pasDeConnexion: 'No connection right now.',
    sessionExpiree: 'Your session expired — sign in again.',
    pasAcces: 'You do not have access to that.',
    disparu: 'That no longer exists.',
    cotéServeur: 'Something broke on our side. Try again in a moment.',
    pasValide: 'That information is not valid.',
  },

  erreursMetier: {
    already_in_a_group:
      'You are already in a group — leave it before joining another.',
    admin_cannot_change_own_role: 'An admin does not change their own role.',
    admin_cannot_remove_self:
      'An admin cannot remove themselves from the group.',
    bad_credentials: 'Wrong email or password.',
    email_taken: 'An account already exists with that email.',
    export_too_large:
      'That ledger is too long for one file — %{max} rows at most. Narrow the period, or pick a person.',
    ingredient_already_in_recipe: 'That item is already in the recipe.',
    ingredient_needs_item_or_label:
      'Pick an item from the shelf, or write the ingredient’s name.',
    invalid_cursor: 'The rest of the ledger could not load. Reload the screen.',
    initial_quantity_required:
      'Set the starting quantity for an item tracked by count.',
    item_already_empty:
      '“%{nom}” is already out — there is nothing left to take.',
    item_changed_meanwhile:
      'That item changed in the meantime. Refresh to see where it stands.',
    password_required_for_email_change:
      'Confirm your password to change your email.',
    reset_code_invalid:
      'That code is not valid, or it expired. Ask for a new one.',
    quantity_required_to_switch:
      'Set the quantity in stock to switch to tracking by count.',
    restock_quantity_required:
      '“%{nom}” is tracked by count: set how many you restocked.',
    shopping_item_already_listed: 'That item is already on the list.',
    shopping_line_needs_item_or_label:
      'Pick an item from the shelf, or write what you want to buy.',
    wrong_password: 'Wrong password.',
  },

  champs: {
    deuxCaracteres: 'At least two characters.',
    centCaracteresMax: 'A hundred characters at most.',
    vingtCaracteresMax: 'Twenty characters at most.',
    entierZeroCompris: 'A whole number, zero included.',
    entierMinimum: 'A whole number, at least %{count}.',
    emailInvalide: 'Not a valid email address.',
    confirmeMotDePasse: 'Confirm your password.',
  },

  commun: {
    horsLigne: 'Offline',
    horsLigneEnAttente: {
      one: 'Offline — %{count} gesture waiting',
      other: 'Offline — %{count} gestures waiting',
    },
    horsLigneVolatile: {
      one: 'Offline — %{count} gesture not sent yet, keep the app open',
      other: 'Offline — %{count} gestures not sent yet, keep the app open',
    },
    validerDemandeConnexion: 'Confirming the shopping needs a connection',
    masquerMotDePasse: 'Hide password',
    afficherMotDePasse: 'Show password',
    masquer: 'Hide',
    afficher: 'Show',
    unDeMoins: 'One less',
    unDePlus: 'One more',
    membre: 'Member',
    admin: 'Admin',
    toi: ' (you)',
    retrograder: 'Demote',
    nommerAdmin: 'Make admin',
    retirer: 'Remove',
    gerer: 'Manage',
    terminer: 'Done',
    copierLeCode: 'Copy the code',
    copier: 'Copy',
    copie: 'Copied',
    partager: 'Share',
    invitation: 'Join “%{groupe}” on Restock with the code %{code}.',
    formatEnregistre: 'Size saved',
    formatDuProduit: 'Product size',
    exempleFormat: '1.5 L · 500 g · ×6',
    preciserFormat: 'Set the product size',
    relevéVideSolo: 'Nothing yet — the first thing you take gets written here.',
    relevéVideGroupe:
      'Nothing yet — whoever takes something first opens the ledger.',
    chargementHistorique: 'Loading the history…',
    chargement: 'Loading…',
    pris: 'taken',
    rachete: 'restocked',
    retour: 'Back',
    annuler: 'Cancel',
    supprimer: 'Delete',
    valider: 'Confirm',
    ajouter: 'Add',
    enregistrer: 'Save',
    enregistre: 'Saved.',
    reessayer: 'Try again',
  },

  geste: {
    compris: 'Got it',
    masquer: 'Hide this explanation',

    swipe: {
      titre: 'The gesture',
      explication:
        'Drag a tag *left* when you take something, *right* when you restock it. The further you pull, the higher the count.',
    },

    shoppingLoop: {
      titre: 'Back home',
      explication:
        'Check off what you picked up, then *I did the shopping*: everything checked goes back into stock on the shelf, in one move.',
    },

    recipeSort: {
      titre: 'The order',
      explication:
        'Dishes come sorted by *what you are least missing*. The ones on top can be cooked with what is already in the cupboard.',
    },

    rename: {
      titre: 'The name',
      explication:
        'The name at the top of the shelf changes by *tapping it*. That is where you read it, so that is where you fix it.',
    },
  },
  onglets: {
    inventaire: 'Inventory',
    courses: 'Shopping',
    recettes: 'Recipes',
    journal: 'Ledger',
    parametres: 'Settings',
  },

  acces: {
    statutEtape: 'Access / Step 01',
    seConnecter: 'Sign in',
    creerUnCompte: 'Create an account',
    creerLeCompte: 'Create account',
    bienvenue: 'Welcome, %{nom}',
    compteCree: 'Account created — welcome, %{nom}',
    troisPortes:
      'Right after, you will pick: a group to create, one to join, or an inventory of your own.',
    nom: 'Name',
    email: 'Email',
    exempleNom: 'Sam',
    exempleEmail: 'you@example.com',
    motDePasse: 'Password',
    caracteresMinimum: '%{count} characters minimum',
    motDePasseOublie: 'Forgot your password?',
    oubliTitre: 'Get back into your account',
    oubliQuoi:
      'Enter the address on your account. If it has one, a %{count}-character code lands there within a minute.',
    envoyerLeCode: 'Send the code',
    oubliEnvoye:
      'If an account exists at that address, the code has just gone out. It lasts fifteen minutes.',
    nouveauTitre: 'New password',
    codeRecu: 'Code received',
    nouveauMotDePasse: 'New password',
    valider: 'Change the password',
    change: 'Password changed — you are signed in',
    renvoyer: 'I did not get anything',
    statutIdentifiants: 'Status: awaiting_credentials',
    statutCreation: 'Status: creating_account',
  },

  onboarding: {
    ordre: 'Order %{n}',
    promesse: 'The last roll will never be a surprise again.',
    etagereAlt: 'A storage shelf seen head-on, its rows labelled',
    continuer: 'Continue →',
    pied: 'Shared inventory system v2.4',
    etape02: 'Onboarding / Step 02',
    votreEspace: 'Your space',
    nouveau: 'New',
    creerGroupe: 'Create a group',
    creerGroupeQuoi: 'Start a new shared inventory',
    invitation: 'Invitation',
    rejoindreGroupe: 'Join a group',
    rejoindreQuoi: 'Use an invite code',
    seul: 'Alone',
    justeMoi: 'Just me',
    justeMoiQuoi: 'An inventory for you, nobody to invite',
    systeme: 'Restock_os // system_ready // ver_2.4',
    nomDuGroupe: 'Group name',
    exempleNom: 'Ordener Street flat',
    type: 'Type',
    colocation: 'Flatshare',
    association: 'Association',
    creerLeGroupe: 'Create group',
    groupeCree: 'Group “%{nom}” created',
    statutConfig: 'Status: setup',
    inventairePret: 'Your inventory is ready',
    codeInvite:
      'Enter the %{count}-character code you were given to reach the shared inventory.',
    codeInviteLabel: 'Invite code',
    tuDeviensAdmin:
      'You become its admin. An invite code will be generated for the others.',
    rejoindre: 'Join',
    creerNouveau: 'Create a new group',
    statutPret: 'Status: ready',
    statutAttente: 'Status: awaiting_entry',
    alerteActive: 'Alert_system_active',
    prevenir: 'Tell the group',
    prevenirQuoi: 'So everyone hears when something runs out.',
    activer: 'Turn on notifications →',
    plusTard: 'Later',
    continuerSimple: 'Continue',
    refusees:
      'Notifications turned down. You can enable them later in your phone settings.',
    echecActivation: 'Turning them on failed. You can try again later.',
    expoGo:
      'Expo Go does not receive notifications — you will need the compiled app.',
    simulateur: 'A simulator does not receive notifications.',
    pasDisponible: 'Notifications are not available in this build of the app.',
  },

  stock: {
    aRacheter: 'To restock',
    critique: 'Critical',
    stockBas: 'Low',
    disponible: 'Available',
  },

  etagere: {
    nonChargee: 'Shelf not loaded',
    indisponible: 'Shelf unavailable',
    chercher: 'Search for an item',
    reessayer: 'Try again',
    toutEnStock: 'Everything in stock',
    aRacheter: {
      one: '%{count} item to restock',
      other: '%{count} items to restock',
    },
    vide: 'Empty inventory',
    videAlt: 'An empty storage shelf, no items on it',
    aucunResultat: 'No result',
    etagereVide: 'Empty shelf',
    aucunNom: 'No item goes by that name.',
    premierSolo: 'Add the first item you want to track.',
    premierGroupe: 'Add the first item your group tracks.',
    ajouterItem: 'Add an item',

    reserveAdmins: 'Admins only',
    reserveAdminsQuoi:
      'Only a group admin adds items. Ask them to create the one you need.',
    nouvelItem: 'New item',
    sousTitreAjout: 'Shelf / New',
    nom: 'Name',
    exempleNom: 'Toilet paper',
    modeDeSuivi: 'Tracking mode',
    presence: 'Presence',
    presenceQuoi: 'The item is there, or it is gone. Nothing to count.',
    quantite: 'Quantity',
    quantiteQuoi: 'Units are counted down, and the gauge shows what is left.',
    quantiteEnStock: 'Quantity in stock',
    alerteEnDessous: 'Warn below',
    pleinA: 'Full at',
    identiqueAuStock: 'same as the stock',
    uneUniteSAppelle: 'One unit is called',
    exempleUnite: 'roll, bottle, pod…',
    parPaquetDe: 'Per pack of',
    videSiUnite: 'leave empty if it is sold by the unit',
    ajouterAEtagere: 'Add to the shelf',
    itemAjoute: '%{nom} added to the shelf',
  },

  item: {
    quelquun: 'Someone',
    introuvable: 'Item not found — it may have been deleted.',
    actionRatee:
      'The action did not go through. Check your connection and try again.',
    historique: 'History',
    dejaSurLaListe: ', already on the shopping list',

    prisLeDernier: 'I took the last one',
    enAiPris: 'I took some',
    enAiPrisUn: 'I took one',
    aiRachete: 'I restocked',
    enAiRachete: 'I restocked %{count}',
    unitesPrises: 'Units taken',
    paquetsRachetes: 'Packs restocked',
    unitesRachetees: 'Units restocked',
    prisToast: '%{quoi} taken',
    racheteToast: '%{quoi} restocked',
    indiceQuantite:
      'Swipe right to take, left to restock. The further you go, the higher the count.',
    indicePresence: 'Swipe right when it has run out, left after a restock.',

    enStock: '%{quoi} in stock',
    quandCestPlein: '%{count} when full',
    supprimerItem: 'Delete the item',
    suppressionQuoi:
      'The item leaves the shelf. Its history stays on the board.',
    supprimeDeEtagere: '%{nom} removed from the shelf',
  },

  courses: {
    nonChargee: 'List not loaded',
    indisponible: 'List unavailable',
    depuisEtagere: 'From the shelf',
    ajoutsLibres: 'Free additions',
    ajouterArticle: 'Add an item',
    ajouter: 'Add',
    ajouterDepuisEtagere: 'Add %{nom} from the shelf',
    ajouteAuxCourses: '%{nom} added to the shopping list',
    quantiteCorrigee: '%{nom}: quantity corrected',
    retireDeLaListe: '%{nom} removed from the list',
    faitLesCourses: 'I did the shopping',
    rienAAcheter: 'Nothing to buy',
    etagereReclame:
      'The shelf is already asking for things — pour them in here.',
    ajouteOuReviens: 'Add something, or come back when a stock runs low.',
    recupererTout: 'Pull in what needs restocking',
    recuperer: {
      one: 'Pull in %{count} item to restock',
      other: 'Pull in %{count} items to restock',
    },
    verses: {
      one: '%{count} item poured into the list',
      other: '%{count} items poured into the list',
    },
    rachatsEnregistres: {
      one: '%{count} restock recorded on the shelf',
      other: '%{count} restocks recorded on the shelf',
    },
    retirerTitre: 'Remove from the list?',
    retirer: 'Remove',
    retirerLigne: 'Remove %{nom} from the list',
    annuler: 'Cancel',
    reessayer: 'Try again',

    decocher: 'Uncheck',
    cocher: 'Check — long press to remove',
    corrigerQuantite: 'Correct the quantity',
    corrigerQuantiteA: 'Correct the quantity: %{quantite}',
    preciserQuantiteDe: 'Set the quantity of %{nom}',
    quantiteInvite: 'How many?',
    paquetsAPrendre: 'Packs to grab',
    unitesAPrendre: 'Units to grab',

    recap: {
      one: '%{count} of %{total} checked',
      other: '%{count} of %{total} checked',
    },
  },

  journal: {
    nonCharge: 'Ledger not loaded',
    resume: '%{prises}, %{rachats}',
    prises: { one: '%{count} taken', other: '%{count} taken' },
    rachats: { one: '%{count} restock', other: '%{count} restocks' },

    periode: 'Period',
    periodeMois: '30 days',
    periodeTrimestre: '3 months',
    periodeTout: 'All',
    qui: 'Who',
    toutLeMonde: 'Everyone',
    rienSurPeriode: 'Nothing in this period',
    videTous:
      'Nobody took or restocked anything. Widen the period to look further back.',
    videPersonne:
      'This person took and restocked nothing here. Widen the period to look further back.',
    aPris: 'took',
    aRachete: 'restocked',
    exporter: 'Export the ledger',
    exporte: 'Ledger exported',
    partageIndisponible:
      'The file is ready, but nothing on this device can share it.',
  },

  recettes: {
    nonChargees: 'Recipes not loaded',
    indisponibles: 'Recipes unavailable',
    toutEstLa: 'All there',
    onNeSaitPas: 'No idea',
    ilManque: '%{count} missing',
    faisables: {
      one: '%{count} dish you can cook',
      other: '%{count} dishes you can cook',
    },
    rienCeSoir: 'Nothing you can cook tonight',
    faisableCeSoir: 'You can cook tonight',
    ouvrirLaRecette: 'Open the recipe %{nom}',
    pour: 'Serves %{count}',
    noteePar: 'Noted by %{nom}',

    aucuneRecette: 'No recipe',
    aucuneRecetteQuoi:
      'Search for recipes and keep the ones that tempt you. The app will say which are doable with what is in the cupboard.',
    chercherUneRecette: 'Search for a recipe',
    ecrireALaMain: 'Write one by hand',

    chercher: 'Search',
    sousTitreCatalogue: 'Recipes / Catalogue',
    quoiManger: 'What do you feel like eating?',
    astuceRecherche:
      'Type a dish, an ingredient, a craving. Suggestions come back sorted by what is left to buy.',
    rienTrouve:
      'Nothing found for “%{quete}”. Try a simpler word — “chicken” rather than “Sunday roast chicken”.',
    gardee: '“%{nom}” kept in your recipes',
    manquantsA11y: {
      one: '%{nom}, you are missing %{count} ingredient',
      other: '%{nom}, you are missing %{count} ingredients',
    },
    toutEstLaAvec: {
      one: 'All there — %{count} ingredient',
      other: 'All there — %{count} ingredients',
    },
    compteEtManquants: {
      one: '%{count} ingredient · %{manquants} missing',
      other: '%{count} ingredients · %{manquants} missing',
    },

    introuvable: 'Recipe not found',
    voirLaRecette: 'Open the recipe',
    ingredients: 'Ingredients',
    indications: 'Steps',
    enStock: 'In stock',
    nonSuivi: 'Not tracked',
    ilNyEnAPlus: 'There is none left',
    signaleEpuise: '%{nom} marked as out',
    rienDeNoteLien:
      'Nothing written here — the recipe is at the end of the link.',
    rienDeNote:
      'Nothing written. Without steps, this card only says what to take out of the cupboard.',
    toutDejaSurListe: 'Everything missing is already on the shopping list.',
    ajouterManquants: {
      one: 'Add %{count} missing item to the shopping list',
      other: 'Add %{count} missing items to the shopping list',
    },
    manquantsAjoutes: {
      one: '%{count} missing item added to the shopping list',
      other: '%{count} missing items added to the shopping list',
    },
    supprimerLaRecette: 'Delete the recipe',
    supprimerConfirm: 'Delete this recipe?',
    supprimee: '“%{nom}” deleted',

    nouvelleRecette: 'New recipe',
    sousTitreAjout: 'Recipes / New',
    nomDuPlat: 'Dish name',
    exemplePlat: 'Mushroom risotto',
    retirerIngredient: 'Remove %{nom}',
    ajouterDepuisEtagere: 'Add %{nom} from the shelf',
    depuisEtagere: 'From the shelf',
    nomIngredient: 'Name of an ingredient',
    exempleIngredients: 'Rice, salt, tomatoes…',
    exempleIndications:
      'Wash and spin the salad.\nDrain the tuna, flake it.\nMix, season at the last moment.',
    uneEtapeParLigne:
      'One step per line. That is what you reread while cooking.',
    ouLaTrouver: 'Where to find it',
    exempleSource: 'https://… or “the red book, p. 42”',
    pourCombien: 'For how many people',
    recetteAjoutee: 'Recipe “%{nom}” added',
  },

  unites: {
    paquets: { one: 'pack', other: 'packs' },
  },

  parametres: {
    compte: 'Account',
    modifierCompte: 'Edit my account',
    seDeconnecter: 'Sign out',
    deconnecte: 'You are signed out',
    ouvrirAuxAutres: 'Open it to others',
    membres: 'Members',
    estAdmin: '%{nom} is an admin',
    nEstPlusAdmin: '%{nom} is no longer an admin',
    retireDuGroupe: '%{nom} removed from the group',

    supprimerInventaire: 'Delete my inventory',
    supprimerGroupe: 'Delete the group',
    suppressionSolo:
      'Your shelf, your shopping list and your recipes go with it. Type *%{nom}* to confirm.',
    suppressionGroupe: {
      one: 'The shelf and its member go with it. Type *%{nom}* to confirm.',
      other:
        'The shelf and its %{count} members go with it. Type *%{nom}* to confirm.',
    },
    nomDeTonInventaire: 'Name of your inventory',
    nomDuGroupe: 'Group name',
    groupeSupprime: 'Group “%{nom}” deleted',

    quitterLeGroupe: 'Leave the group',
    quitter: 'Leave',
    quitterQuoi:
      'You lose access to the shelf. Your account stays, and your passage stays written in the items’ history.',
    quitte: 'You left the group',

    inventaireRenomme: 'Inventory renamed “%{nom}”',
    groupeRenomme: 'Group renamed “%{nom}”',
    renommerInventaire: '%{nom}, tap to rename your inventory',
    renommerGroupe: '%{nom}, tap to rename the group',

    langue: 'Language',
    appareil: 'Device',
    suitLeTelephone: 'Follows the phone setting — %{nom} right now.',
  },

  compte: {
    titre: 'My account',
    sousTitre: 'Profile / Identity',
    nom: 'Name',
    exempleNom: 'What people call you',
    email: 'Email',
    exempleEmail: 'you@example.com',
    tonMotDePasse: 'Your password',
    pourConfirmer: 'To confirm the email change',
    explication:
      'Your name shows under every take and every restock. Your email signs you in — changing it asks for your password.',
    supprimer: 'Delete my account',
    suppressionQuoi:
      'Your account and your email go for good. The log keeps what you took and restocked, but without your name — the others rely on it to know where the stock stands.',
    suppressionSuccession:
      'You are the only admin: someone else will take over the group in your place.',
    suppressionSeul: 'Your inventory goes with you.',
    suppressionSeulGroupe: 'You are alone in the group: it goes with you.',
    supprimeDefinitivement: 'Delete for good',
    compteSupprime: 'Your account has been deleted.',
  },
} as const;
