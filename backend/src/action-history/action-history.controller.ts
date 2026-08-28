import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GroupMemberGuard } from '../auth/guards/group-member.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { ActionHistoryService } from './action-history.service';
import { toCsv } from './csv';
import {
  DEFAULT_LIMIT,
  ExportHistoryDto,
  QueryHistoryDto,
} from './dto/query-history.dto';

/**
 * Le journal du groupe.
 *
 * Ouvert à **tous les membres**, sans `AdminGuard`, et c'est une position :
 * un registre que seuls les responsables peuvent lire ne prouve rien à ceux
 * qui devraient s'y fier. En association c'est la condition même de sa
 * fonction ; en colocation, savoir qui a fini le café n'a jamais été un
 * secret.
 */
@Controller('history')
@UseGuards(JwtAuthGuard, GroupMemberGuard)
export class ActionHistoryController {
  constructor(private readonly historyService: ActionHistoryService) {}

  @Get()
  findAll(
    @Query() query: QueryHistoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.historyService.findByGroup(user.groupId!, {
      memberId: query.memberId,
      since: query.since ? new Date(query.since) : undefined,
      limit: query.limit ?? DEFAULT_LIMIT,
      cursor: query.cursor,
    });
  }

  /**
   * Le registre en fichier.
   *
   * Un journal qu'on ne peut pas remettre à quelqu'un ne sert qu'à celui qui
   * le regarde. Une association rend des comptes, et cela suppose un fichier.
   *
   * Route à part plutôt qu'un format sur `GET /history` : celle-ci ne pagine
   * pas, refuse au-delà d'un plafond, et rend du CSV — trois comportements
   * qu'un paramètre `?format=csv` cacherait derrière une route qui promet
   * autre chose.
   */
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="registre.csv"')
  async export(
    @Query() query: ExportHistoryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const entries = await this.historyService.exportByGroup(user.groupId!, {
      memberId: query.memberId,
      since: query.since ? new Date(query.since) : undefined,
    });

    // Sans ça, Nest sérialise la chaîne en JSON et le fichier arrive entre
    // guillemets, ses retours à la ligne échappés.
    response.type('text/csv');

    return toCsv(entries);
  }
}
