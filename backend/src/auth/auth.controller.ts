import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetService } from './password-reset.service';

/**
 * Les routes ouvertes sans jeton — donc les seules qu'un inconnu peut marteler.
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

  /**
   * Un access token neuf contre un refresh token valable.
   *
   * Ouverte sans jeton, forcément : on vient ici *parce que* l'access token ne
   * vaut plus rien, et exiger celui qu'on remplace n'aurait pas de sens.
   *
   * Le plafond est plus large que les autres : un appareil passe ici une fois
   * par heure sans rien avoir à se reprocher, et le resserrer déconnecterait
   * quelqu'un qui a simplement laissé l'app ouverte. Il n'y a d'ailleurs rien à
   * deviner — 256 bits ne se martèlent pas — ce qu'on borne ici, c'est la
   * charge, pas une porte.
   */
  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * Ferme la session longue. 204 même sur un token inconnu.
   *
   * Le contraire ferait de cette route un oracle : on saurait, en la
   * questionnant, quels tokens existent. Et quelqu'un qui se déconnecte a de
   * toute façon obtenu ce qu'il voulait — l'app efface sa session sans
   * attendre la réponse.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }
}
