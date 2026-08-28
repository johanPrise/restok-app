import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { Member } from '../members/entities/member.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordReset } from './entities/password-reset.entity';
import { PasswordResetService } from './password-reset.service';
import { AdminGuard } from './guards/admin.guard';
import { GroupMemberGuard } from './guards/group-member.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, PasswordReset]),
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // jsonwebtoken v9 type expiresIn en littéral ('1h', '7d'…) ;
          // la valeur vient de l'env donc on la contraint ici.
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
            '1h',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
    AdminGuard,
    GroupMemberGuard,
  ],
  exports: [
    TokenService,
    JwtAuthGuard,
    AdminGuard,
    GroupMemberGuard,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
