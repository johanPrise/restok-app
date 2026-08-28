import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Le garde de débit, avec un interrupteur.
 *
 * Les tests e2e créent des dizaines de comptes en quelques secondes — c'est
 * leur travail. Le plafond d'inscription les arrêterait au sixième, et on se
 * retrouverait à choisir entre une suite qui passe et une porte fermée.
 *
 * D'où `THROTTLE_DISABLED`, posé par le harnais e2e et par lui seul. Le
 * plafond reste donc **actif par défaut** : on ne l'éteint pas en oubliant de
 * l'allumer, il faut le demander. Et une suite dédiée le rallume pour vérifier
 * qu'il ferme vraiment.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  private readonly config = new ConfigService();

  protected shouldSkip(): Promise<boolean> {
    return Promise.resolve(
      this.config.get<string>('THROTTLE_DISABLED') === 'true',
    );
  }
}
