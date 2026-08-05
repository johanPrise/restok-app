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

export interface Item {
  id: string;
  name: string;
  status: ItemStatus;
  trackingType: TrackingType;
  /** `null` en mode `threshold`, qui ne compte rien. */
  quantity: number | null;
  lowThreshold: number | null;
  groupId: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  actionType: ActionType;
  createdAt: string;
  /** `null` quand le compte de l'auteur a été supprimé. */
  member: { id: string; name: string } | null;
}

export interface CreateItemInput {
  name: string;
  trackingType?: TrackingType;
  quantity?: number;
  lowThreshold?: number;
}

export interface UpdateItemInput {
  name?: string;
  trackingType?: TrackingType;
  quantity?: number;
  lowThreshold?: number;
}
