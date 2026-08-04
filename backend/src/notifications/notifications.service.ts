import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Member } from '../members/entities/member.entity';
import {
  DEVICE_NOT_REGISTERED,
  PUSH_PROVIDER,
} from './providers/push-provider.interface';
import type {
  PushProvider,
  PushSendResult,
} from './providers/push-provider.interface';

const NOTIFICATION_TITLE = 'Restock';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(PUSH_PROVIDER)
    private readonly pushProvider: PushProvider,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
  ) {}

  async notifyGroup(
    groupId: string,
    body: string,
    options?: { excludeMemberId?: string },
  ): Promise<void> {
    const members = await this.memberRepo.find({
      where: { groupId, pushToken: Not(IsNull()) },
    });

    // Celui qui déclenche l'action ne reçoit pas sa propre notification.
    const targets = members.filter((m) => m.id !== options?.excludeMemberId);
    if (targets.length === 0) return;

    const results = await this.pushProvider.send(
      targets.map((m) => ({
        to: m.pushToken!,
        title: NOTIFICATION_TITLE,
        body,
      })),
    );

    await this.forgetDeadTokens(results);
  }

  /**
   * Oublie les tokens des appareils qui ne recevront plus rien — app
   * désinstallée ou token révoqué. Les autres échecs (réseau, HTTP) sont
   * journalisés sans toucher aux tokens : ils ne disent rien sur leur validité.
   */
  private async forgetDeadTokens(results: PushSendResult[]): Promise<void> {
    const failed = results.filter((r) => !r.success);
    if (failed.length === 0) return;

    const dead = failed.filter((r) => r.error === DEVICE_NOT_REGISTERED);
    const transient = failed.length - dead.length;

    if (transient > 0) {
      this.logger.warn(
        `${transient} notification(s) non délivrée(s), tokens conservés`,
      );
    }

    if (dead.length === 0) return;

    await this.memberRepo.update(
      { pushToken: In(dead.map((r) => r.token)) },
      { pushToken: null },
    );
  }
}
