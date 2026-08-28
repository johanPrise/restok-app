import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Member, MemberRole } from '../members/entities/member.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './token.service';
import {
  BUSINESS_CODES,
  conflict,
  unauthorized,
} from '../common/business-error';

const BCRYPT_ROUNDS = 10;

export interface AuthResponse {
  accessToken: string;
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
  ) {}

  /**
   * Pose un nouveau mot de passe, et coupe les sessions ouvertes avec l'ancien.
   *
   * `passwordChangedAt` est ce qui les coupe : les JWT ne se révoquent pas un
   * par un, mais un token émis avant cette date est refusé. Sans elle, une
   * réinitialisation ne reprendrait pas le compte à qui s'y était introduit —
   * il garderait sa session jusqu'à expiration, c'est-à-dire le contraire de
   * ce qu'on vient de faire.
   */
  async setPassword(memberId: string, password: string): Promise<void> {
    await this.memberRepo.update(memberId, {
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      passwordChangedAt: new Date(),
    });
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

  private buildAuthResponse(member: Member): AuthResponse {
    return {
      accessToken: this.tokenService.issue(member.id),
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
