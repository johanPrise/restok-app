import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { AuthenticatedUser, JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Résout les droits en base à chaque requête — un SELECT sur clé primaire.
   *
   * C'est ce qui rend un retrait de groupe ou un changement de rôle effectif
   * immédiatement, et non à l'expiration du token. `findOne` ignore les
   * membres soft-deleted : le token d'un compte supprimé cesse aussitôt de
   * fonctionner.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const member = await this.memberRepo.findOne({
      where: { id: payload.sub },
      select: { id: true, groupId: true, role: true },
    });

    if (!member) {
      throw new UnauthorizedException('Session invalide');
    }

    return { id: member.id, groupId: member.groupId, role: member.role };
  }
}
