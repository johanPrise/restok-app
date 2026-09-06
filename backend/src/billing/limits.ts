/**
 * Ce qu'un groupe fait sans avoir payé.
 *
 * ## Pourquoi la capacité, et pas une fonctionnalité
 *
 * Le premier découpage envisagé verrouillait le « mode association ». Vérification
 * faite dans le code, ce mode ne gouverne qu'une chose — l'onglet du journal —
 * et le journal doit rester lisible par tous : un registre que seul le payeur
 * peut lire ne prouve rien à ceux qui devraient s'y fier, et le payeur est
 * arbitraire dans un groupe. Ce verrou vendait donc un raccourci de navigation
 * vers un contenu gratuit.
 *
 * La capacité est le seul verrou qui **grandit avec l'usage** au lieu de barrer
 * une porte, et c'est celui qu'ont retenu les deux applications les plus proches
 * de celle-ci — Pantry Check plafonne à 200 articles, NoWaste à 500.
 *
 * ## La règle qui rend ces plafonds acceptables
 *
 * **Un plafond bloque l'ajout, jamais la lecture.** Au plafond, tout ce qui
 * existe reste visible, prenable, rachetable, journalisé. On ne retire rien de
 * ce que le foyer perçoit comme sien — on borne la croissance. Masquer des items
 * déjà saisis referait exactement l'erreur du mode association, en pire.
 */

/**
 * Les items suivis simultanément.
 *
 * **Le chiffre le plus fragile de tout ce fichier.** Il est calibré sur une
 * observation unique — un placard réel de colocation de 17 items — et cette
 * observation avait été faite pour mesurer autre chose : la couverture des
 * ingrédients de recettes. Un placard dont on compte les ingrédients n'est pas
 * forcément un placard saisi en entier dans l'app.
 *
 * 25 se tient au-dessus de cette mesure, assez haut pour qu'un solo ou une
 * petite colocation ne le rencontrent jamais, assez bas pour qu'une colocation
 * engagée le franchisse après quelques semaines — une fois la valeur démontrée,
 * jamais avant.
 *
 * C'est le premier nombre à réviser dès qu'il y a dix groupes actifs, avant le
 * prix et avant le contenu du palier.
 */
export const FREE_ITEMS = 25;

/**
 * Les membres d'un groupe.
 *
 * Ne mord jamais sur une colocation : la cible affichée du produit est de deux à
 * six personnes. Ne mord que sur les associations, qui sont le seul public à
 * disposer d'une ligne budgétaire.
 */
export const FREE_MEMBERS = 6;

/**
 * Les recettes gardées.
 *
 * Livré parce que le compte coûte une ligne, mais **il ne faut rien en
 * attendre** : la découverte de recettes n'est pas encore un chemin que les gens
 * empruntent. Verrouiller ce que personne n'utilise, c'est verrouiller le vide.
 */
export const FREE_RECIPES = 10;
