import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MemberRole } from '../../members/entities/member.entity';
import { AuthenticatedUser } from '../types/jwt-payload.type';
import { GroupMemberGuard } from './group-member.guard';

describe('GroupMemberGuard', () => {
  const guard = new GroupMemberGuard();

  const contextWith = (user?: Partial<AuthenticatedUser>): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as ExecutionContext;

  it('laisse passer un membre rattaché à un groupe', () => {
    expect(
      guard.canActivate(
        contextWith({ groupId: 'group-1', role: MemberRole.MEMBER }),
      ),
    ).toBe(true);
  });

  it("rejette un utilisateur sans groupe (juste après l'inscription)", () => {
    expect(() => guard.canActivate(contextWith({ groupId: null }))).toThrow(
      ForbiddenException,
    );
  });

  it("rejette quand aucun user n'est attaché à la requête", () => {
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
