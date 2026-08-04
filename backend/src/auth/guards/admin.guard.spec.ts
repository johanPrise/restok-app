import { ExecutionContext } from '@nestjs/common';
import { MemberRole } from '../../members/entities/member.entity';
import { AuthenticatedUser } from '../types/jwt-payload.type';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  const contextWith = (user?: Partial<AuthenticatedUser>): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as ExecutionContext;

  it('autorise un admin', () => {
    expect(guard.canActivate(contextWith({ role: MemberRole.ADMIN }))).toBe(
      true,
    );
  });

  it('rejette un membre simple', () => {
    expect(guard.canActivate(contextWith({ role: MemberRole.MEMBER }))).toBe(
      false,
    );
  });

  it("rejette quand aucun user n'est attaché à la requête", () => {
    expect(guard.canActivate(contextWith(undefined))).toBe(false);
  });
});
