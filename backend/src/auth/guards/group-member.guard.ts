import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../types/jwt-payload.type';

/**
 * Exige que l'utilisateur appartienne à un groupe.
 *
 * Distingue les routes « authentifié » (créer / rejoindre un groupe) des
 * routes « membre » du §8 : juste après l'inscription, `groupId` est null et
 * ces dernières n'ont aucun sens.
 *
 * À utiliser après JwtAuthGuard : il s'appuie sur `request.user`.
 */
@Injectable()
export class GroupMemberGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user?.groupId) {
      throw new ForbiddenException("Tu n'appartiens à aucun groupe");
    }

    return true;
  }
}
