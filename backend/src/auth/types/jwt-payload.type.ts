import { MemberRole } from '../../members/entities/member.entity';

export interface JwtPayload {
  sub: string;
  groupId: string | null;
  role: MemberRole;
}

/** Ce que `JwtStrategy.validate` attache à `request.user`. */
export interface AuthenticatedUser {
  id: string;
  groupId: string | null;
  role: MemberRole;
}
