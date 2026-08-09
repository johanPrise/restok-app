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
