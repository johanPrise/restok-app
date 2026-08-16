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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GroupMemberGuard } from '../auth/guards/group-member.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { AddShoppingLineDto } from './dto/add-shopping-line.dto';
import { UpdateShoppingLineDto } from './dto/update-shopping-line.dto';
import { ShoppingService } from './shopping.service';

/**
 * La liste de courses, ouverte à **tous les membres**.
 *
 * Aucun `AdminGuard` : faire les courses n'est pas un acte d'administration.
 * C'est la même logique que `take` et `restock`, qui sont ouverts eux aussi —
 * seule la configuration d'un item reste réservée aux admins.
 */
@Controller('shopping')
@UseGuards(JwtAuthGuard, GroupMemberGuard)
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.shoppingService.findAllInGroup(user.groupId!);
  }

  @Post()
  add(@Body() dto: AddShoppingLineDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shoppingService.add(dto, user.groupId!, user.id);
  }

  /**
   * Les deux routes renvoient la liste entière plutôt qu'un compte : après un
   * versement ou une validation, c'est l'état qui a changé, et le client a
   * besoin de le voir, pas de le recalculer.
   *
   * `200` et non `201` : elles transforment une liste existante, elles ne
   * créent pas une ressource qu'on pourrait aller chercher à une URL.
   */
  @Post('refill')
  @HttpCode(HttpStatus.OK)
  refill(@CurrentUser() user: AuthenticatedUser) {
    return this.shoppingService.refill(user.groupId!, user.id);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentUser() user: AuthenticatedUser) {
    return this.shoppingService.complete(user.groupId!, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) lineId: string,
    @Body() dto: UpdateShoppingLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shoppingService.update(lineId, user.groupId!, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) lineId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shoppingService.remove(lineId, user.groupId!);
  }
}
