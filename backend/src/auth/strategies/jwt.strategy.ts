import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser, JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Pas de lookup DB : groupId et role viennent du token (voir §7 de la spec).
  // Compromis assumé — un changement de rôle n'est effectif qu'à l'expiration
  // du token, d'où la durée de vie courte.
  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      groupId: payload.groupId,
      role: payload.role,
    };
  }
}
