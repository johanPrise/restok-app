import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Member, MemberRole } from '../members/entities/member.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenService } from './refresh-token.service';
import { TokenService } from './token.service';
import {
  BUSINESS_CODES,
  conflict,
  unauthorized,
} from '../common/business-error';

const BCRYPT_ROUNDS = 10;

export interface AuthResponse {
  accessToken: string;
  /**
   * La session longue. L'access token dure une heure et ne se révoque pas ;
   * celui-ci dure deux mois, se révoque, et sert uniquement à en obtenir des
   * neufs — voir `RefreshTokenService`.
   */
  refreshToken: string;
  member: {
    id: string;
    name: string;
    email: string;
    role: MemberRole;
    groupId: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    private readonly tokenService: TokenService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  /**
   * Pose un nouveau mot de passe, et coupe les sessions ouvertes avec l'ancien.
   *
   * `passwordChangedAt` est ce qui les coupe : les JWT ne se révoquent pas un
   * par un, mais un token émis avant cette date est refusé. Sans elle, une
   * réinitialisation ne reprendrait pas le compte à qui s'y était introduit —
   * il garderait sa session jusqu'à expiration, c'est-à-dire le contraire de
   * ce qu'on vient de faire.
   *
   * Elle ne suffit pourtant pas : un refresh token n'est pas un JWT et ne porte
   * pas de date d'émission, donc aucune date ne le périme. Il faut aller
   * l'effacer, sans quoi l'intrus garderait de quoi se refabriquer des access
   * tokens pendant deux mois — la date ci-dessus n'aurait fermé qu'une porte
   * sur deux.
   */
  async setPassword(memberId: string, password: string): Promise<void> {
    await this.memberRepo.update(memberId, {
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      passwordChangedAt: new Date(),
    });

    await this.refreshTokens.revokeAllFor(memberId);
  }

  /**
   * Rend un access token neuf contre un refresh token valable, et le remplace.
   *
   * Le membre est relu en base plutôt que repris de la session ouverte : entre
   * la connexion et maintenant il a pu changer de groupe, de rôle ou de nom, et
   * c'est justement l'occasion de remettre à jour le cache d'identité que l'app
   * garde faute d'endpoint « qui suis-je ».
   */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    const { memberId, token } = await this.refreshTokens.rotate(refreshToken);

    // `findOne` ignore les membres soft-deleted : la session d'un compte
    // supprimé s'arrête ici, comme elle s'arrête dans `JwtStrategy`.
    const member = await this.memberRepo.findOne({ where: { id: memberId } });

    if (!member) {
      await this.refreshTokens.revokeAllFor(memberId);
      throw unauthorized(
        BUSINESS_CODES.REFRESH_TOKEN_INVALID,
        'Session expirée. Reconnecte-toi.',
      );
    }

    return this.describe(member, token);
  }

  /** Déconnexion volontaire : la session longue s'arrête tout de suite. */
  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokens.revoke(refreshToken);
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.memberRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw conflict(
        BUSINESS_CODES.EMAIL_TAKEN,
        'Un compte existe déjà avec cet email',
      );
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const member = await this.memberRepo.save(
      this.memberRepo.create({
        name: dto.name,
        email: dto.email,
        password,
        role: MemberRole.MEMBER,
        groupId: null,
      }),
    );

    return this.buildAuthResponse(member);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // `password` est `select: false` sur l'entité — il faut le demander explicitement.
    const member = await this.memberRepo.findOne({
      where: { email: dto.email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        groupId: true,
      },
    });

    if (!member || !(await bcrypt.compare(dto.password, member.password))) {
      // Message volontairement identique dans les deux cas : ne pas révéler
      // si l'email existe.
      throw unauthorized(
        BUSINESS_CODES.BAD_CREDENTIALS,
        'Email ou mot de passe incorrect',
      );
    }

    return this.buildAuthResponse(member);
  }

  private async buildAuthResponse(member: Member): Promise<AuthResponse> {
    return this.describe(member, await this.refreshTokens.issue(member.id));
  }

  /** La même réponse, quand le refresh token est déjà connu de l'appelant. */
  private describe(member: Member, refreshToken: string): AuthResponse {
    return {
      accessToken: this.tokenService.issue(member.id),
      refreshToken,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        groupId: member.groupId,
      },
    };
  }
}
