import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { MemberRole } from '../../members/entities/member.entity';
import { AuthenticatedUser } from '../types/jwt-payload.type';

/** À utiliser après JwtAuthGuard : il s'appuie sur `request.user`. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    return request.user?.role === MemberRole.ADMIN;
  }
}
