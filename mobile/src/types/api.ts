/** Miroir des types du backend. Toute divergence ici est un bug silencieux. */

export type MemberRole = 'admin' | 'member';
export type GroupType = 'roommates' | 'association';
export type ItemStatus = 'available' | 'low' | 'out_of_stock' | 'to_restock';
export type TrackingType = 'threshold' | 'quantity';
export type ActionType = 'taken' | 'restocked';

export interface AuthenticatedMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  groupId: string | null;
}

export interface AuthResponse {
  accessToken: string;
  member: AuthenticatedMember;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  inviteCode: string;
  createdAt: string;
}

export interface GroupDetail extends Group {
  memberCount: number;
}

export interface MemberSummary {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  createdAt: string;
}

export interface LastAction {
  actionType: ActionType;
  at: string;
  /** `null` quand le compte de l'auteur a été supprimé. */
  memberName: string | null;
}

export interface Item {
  id: string;
  name: string;
  status: ItemStatus;
  trackingType: TrackingType;
  /** `null` en mode `threshold`, qui ne compte rien. */
  quantity: number | null;
  /** À partir de quand alerter — valeur absolue. */
  lowThreshold: number | null;
  /** Le « plein » : dénominateur de la jauge, pas un seuil d'alerte. */
  targetQuantity: number | null;
  /** Comment s'appelle une unité — « rouleau », « bidon ». Étiquette d'affichage. */
  unit: string | null;
  /** Unités par paquet, quand l'item s'achète par lot. `null` sinon. */
  packSize: number | null;
  /** Ce qui est écrit sur l'étiquette : « 1,5 L », « 500 g ». Descriptif seul. */
  format: string | null;
  groupId: string;
  createdAt: string;
  updatedAt: string;
  /** `null` tant que personne n'a rien pris ni racheté. */
  lastAction: LastAction | null;
}

/**
 * Une ligne de la liste de courses.
 *
 * Deux natures dans un même type : une ligne **liée** prolonge un item de
 * l'étagère (`itemId` non nul, et elle en tient son nom), une ligne **libre**
 * porte du texte que le groupe ne suit pas — du pain, du fromage.
 */
export interface ShoppingLine {
  id: string;
  /** `null` sur une ligne libre. */
  itemId: string | null;
  /** Calculé côté serveur : le nom de l'item, ou le texte libre. */
  name: string;
  /** Toujours en **unités de base**, jamais en paquets. */
  quantity: number | null;
  checked: boolean;
  /** Le nom de qui a coché, `null` tant que personne ne l'a fait. */
  checkedBy: string | null;
  checkedAt: string | null;
  /** Recopiés de l'item : au rayon, c'est ce qui dit quoi prendre. */
  unit: string | null;
  packSize: number | null;
  format: string | null;
  /** `null` sur une ligne libre. Dit si compter veut dire quelque chose. */
  trackingType: TrackingType | null;
}

/** Une ligne porte soit un item, soit un texte libre — jamais les deux. */
export type AddShoppingLineInput =
  { itemId: string; quantity?: number } | { label: string; quantity?: number };

/**
 * Un ingrédient, tel que le serveur le rend.
 *
 * Aucun statut : la faisabilité se calcule ici, en croisant `itemId` avec
 * l'étagère déjà en cache. C'est ce qui la fait marcher hors-ligne.
 */
export interface RecipeIngredient {
  id: string;
  /** `null` sur un ingrédient libre — le sel, ou un item disparu de l'étagère. */
  itemId: string | null;
  /** Calculé côté serveur : le nom de l'item, ou le texte libre. */
  name: string;
}

export interface Recipe {
  id: string;
  name: string;
  /** URL ou simple mention — « le livre rouge, page 42 ». */
  source: string | null;
  description: string | null;
  servings: number | null;
  createdBy: string | null;
  ingredients: RecipeIngredient[];
}

/**
 * Une proposition de recherche, avant qu'on la garde.
 *
 * Elle porte déjà ce qui manque : le tri se fait donc côté serveur, qui seul a
 * les ingrédients du catalogue. C'est l'exception assumée à la règle « la
 * faisabilité se calcule côté client » — chercher exige le réseau de toute
 * façon.
 */
export interface RecipeSuggestion {
  ref: string;
  name: string;
  have: string[];
  missing: string[];
}

export interface CreateRecipeInput {
  name: string;
  source?: string;
  description?: string;
  servings?: number;
  ingredients?: IngredientInput[];
}

/** Un ingrédient porte un item **ou** un texte libre, jamais les deux. */
export type IngredientInput = { itemId: string } | { label: string };

export interface HistoryEntry {
  id: string;
  actionType: ActionType;
  /** Unités déplacées. `null` en suivi binaire, qui ne compte rien. */
  quantity: number | null;
  createdAt: string;
  /** `null` quand le compte de l'auteur a été supprimé. */
  member: { id: string; name: string } | null;
}

export interface CreateItemInput {
  name: string;
  trackingType?: TrackingType;
  quantity?: number;
  lowThreshold?: number;
  targetQuantity?: number;
  unit?: string;
  packSize?: number;
  format?: string;
}

export interface UpdateItemInput {
  name?: string;
  trackingType?: TrackingType;
  quantity?: number;
  lowThreshold?: number;
  targetQuantity?: number;
  unit?: string;
  packSize?: number;
  format?: string;
}
