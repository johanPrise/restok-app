import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetService } from './password-reset.service';

/**
 * Les deux seules routes ouvertes sans jeton — donc les deux seules qu'un
 * inconnu peut marteler.
 *
 * Le plafond global les couvre déjà, mais il est calibré pour quelqu'un qui
 * coche sa liste au magasin : cent vingt requêtes par minute laissent tout le
 * temps d'essayer des mots de passe. Ici on compte en dizaines par heure, ce
 * qui reste au-delà de ce qu'un humain fait en se trompant, et très en deçà de
 * ce qu'un script demande.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly resetService: PasswordResetService,
  ) {}

  // Créer des comptes en rafale remplit la base et brûle des adresses.
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Demande un code, et ne dit jamais si le compte existe.
   *
   * 204 dans tous les cas : répondre « adresse inconnue » ferait de cette
   * route un annuaire des comptes. Seul le propriétaire de la boîte voit la
   * différence.
   */
  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.resetService.purgeExpired();
    await this.resetService.request(dto.email);
  }

  /**
   * Pose le nouveau mot de passe et ouvre une session dans la foulée.
   *
   * Renvoyer au formulaire de connexion ferait retaper à l'instant même le mot
   * de passe qu'on vient de choisir, sur l'écran dont on sortait justement
   * faute de savoir le remplir.
   */
  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const memberId = await this.resetService.consume(dto.email, dto.code);
    await this.authService.setPassword(memberId, dto.password);

    return this.authService.login({ email: dto.email, password: dto.password });
  }
}
