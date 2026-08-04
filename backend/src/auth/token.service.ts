import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './types/jwt-payload.type';

/**
 * Émission des JWT.
 *
 * Le payload se limite à `sub` : le token prouve *qui* est l'appelant, pas ce
 * qu'il a le droit de faire. Les droits (groupe, rôle) sont résolus par
 * JwtStrategy à chaque requête, donc un token reste valide après un changement
 * de groupe ou de rôle — il n'y a rien à réémettre.
 */
@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  issue(memberId: string): string {
    const payload: JwtPayload = { sub: memberId };

    // expiresIn est configuré une fois pour toutes dans AuthModule.
    return this.jwtService.sign(payload);
  }
}
