import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * La sonde que l'hébergeur interroge avant d'envoyer du trafic.
 *
 * Elle interroge la **base**, pas seulement le processus. Un serveur Nest qui
 * écoute alors que Postgres est injoignable répond 500 à chaque requête utile :
 * le déclarer en bonne santé revient à router des gens vers une panne. La
 * requête est un `SELECT 1`, assez pour prouver que la connexion vit sans rien
 * coûter au moteur.
 *
 * Publique, forcément : un contrôle de santé qui exige un jeton ne peut pas
 * servir à décider si le service est joignable.
 */
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      // 503 et non 500 : la cause est connue et probablement passagère, et
      // c'est le code que les hébergeurs lisent comme « ne route pas encore ».
      throw new ServiceUnavailableException(
        "La base de données n'est pas joignable",
      );
    }

    return { status: 'ok' };
  }
}
