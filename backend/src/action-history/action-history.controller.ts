import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GroupMemberGuard } from '../auth/guards/group-member.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { ActionHistoryService } from './action-history.service';
import { DEFAULT_LIMIT, QueryHistoryDto } from './dto/query-history.dto';

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
}
