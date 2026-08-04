import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Member, MemberRole } from '../members/entities/member.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.type';

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
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.memberRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
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
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    return this.buildAuthResponse(member);
  }

  private buildAuthResponse(member: Member): AuthResponse {
    const payload: JwtPayload = {
      sub: member.id,
      groupId: member.groupId,
      role: member.role,
    };

    return {
      // expiresIn est configuré une fois pour toutes dans AuthModule.
      accessToken: this.jwtService.sign(payload),
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
