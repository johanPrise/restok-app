import { MemberRole } from '../../members/entities/member.entity';

/**
 * Le token ne porte que l'identité — rien de mutable.
 *
 * `groupId` et `role` sont de l'état d'autorisation : les enfermer dans un
 * conteneur signé et non révocable en ferait un cache sans invalidation, et un
 * membre exclu de son groupe garderait ses accès jusqu'à expiration. Ils sont
 * relus en base à chaque requête par JwtStrategy.
 */
export interface JwtPayload {
  sub: string;
  /**
   * Posé par `jsonwebtoken` à l'émission, en secondes. Sert à refuser un token
   * antérieur au dernier changement de mot de passe.
   */
  iat?: number;
}

/** Ce que `JwtStrategy.validate` attache à `request.user`, lu en base. */
export interface AuthenticatedUser {
  id: string;
  groupId: string | null;
  role: MemberRole;
}
