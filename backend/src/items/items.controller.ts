import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ActionHistoryService } from '../action-history/action-history.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GroupMemberGuard } from '../auth/guards/group-member.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateItemDto } from './dto/create-item.dto';
import { RestockItemDto } from './dto/restock-item.dto';
import { TakeItemDto } from './dto/take-item.dto';
import { UpdateItemFormatDto } from './dto/update-item-format.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemActionsFacade } from './item-actions.facade';
import { ItemsService } from './items.service';

@Controller('items')
@UseGuards(JwtAuthGuard, GroupMemberGuard)
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly itemActions: ItemActionsFacade,
    private readonly actionHistoryService: ActionHistoryService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.itemsService.findAllInGroup(user.groupId!);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.itemsService.create(dto, user.groupId!);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.update(itemId, user.groupId!, dto);
  }

  /**
   * Route à part, et **sans `AdminGuard`** : le format est ce qui est écrit sur
   * l'étiquette, pas un réglage. Celui qui revient du magasin doit pouvoir le
   * corriger, sinon l'information ne sera jamais donnée.
   */
  @Patch(':id/format')
  setFormat(
    @Param('id', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateItemFormatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.setFormat(itemId, user.groupId!, dto.format);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.remove(itemId, user.groupId!);
  }

  @Post(':id/take')
  @HttpCode(HttpStatus.OK)
  take(
    @Param('id', ParseUUIDPipe) itemId: string,
    @Body() dto: TakeItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemActions.take(itemId, user.groupId!, user.id, dto.quantity);
  }

  @Post(':id/restock')
  @HttpCode(HttpStatus.OK)
  restock(
    @Param('id', ParseUUIDPipe) itemId: string,
    @Body() dto: RestockItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemActions.restock(
      itemId,
      user.groupId!,
      user.id,
      dto.quantity,
    );
  }

  @Get(':id/history')
  async history(
    @Param('id', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Vérifie l'appartenance au groupe avant de servir l'historique.
    await this.itemsService.findOneInGroup(itemId, user.groupId!);
    return this.actionHistoryService.findByItem(itemId);
  }
}
