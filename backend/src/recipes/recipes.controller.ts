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
import { AddIngredientDto } from './dto/add-ingredient.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipesService } from './recipes.service';

/**
 * Les recettes du groupe, ouvertes à **tous les membres**.
 *
 * Aucun `AdminGuard` : cuisiner n'est pas administrer. Même logique que les
 * courses — seule la configuration d'un item reste réservée aux admins.
 */
@Controller('recipes')
@UseGuards(JwtAuthGuard, GroupMemberGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.recipesService.findAllInGroup(user.groupId!);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) recipeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipesService.findOneInGroup(recipeId, user.groupId!);
  }

  @Post()
  create(@Body() dto: CreateRecipeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.recipesService.create(dto, user.groupId!, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) recipeId: string,
    @Body() dto: UpdateRecipeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipesService.update(recipeId, user.groupId!, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) recipeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipesService.remove(recipeId, user.groupId!);
  }

  /** `200` : elles transforment une recette existante, elles ne créent pas une ressource propre. */
  @Post(':id/ingredients')
  @HttpCode(HttpStatus.OK)
  addIngredient(
    @Param('id', ParseUUIDPipe) recipeId: string,
    @Body() dto: AddIngredientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipesService.addIngredient(recipeId, user.groupId!, dto);
  }

  @Delete(':id/ingredients/:ingredientId')
  @HttpCode(HttpStatus.OK)
  removeIngredient(
    @Param('id', ParseUUIDPipe) recipeId: string,
    @Param('ingredientId', ParseUUIDPipe) ingredientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipesService.removeIngredient(
      recipeId,
      ingredientId,
      user.groupId!,
    );
  }
}
