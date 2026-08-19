import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Item } from '../items/entities/item.entity';
import { AddIngredientDto } from './dto/add-ingredient.dto';
import { PAGE_FETCHER } from './import/fetch-page.token';
import type { PageFetcher } from './import/fetch-page';
import { matchItem } from './import/match-items';
import { parseRecipePage } from './import/recipe-page';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { Recipe } from './entities/recipe.entity';

/** Code PostgreSQL d'une violation de contrainte d'unicité. */
const UNIQUE_VIOLATION = '23505';

/**
 * Ce que le client reçoit d'un ingrédient.
 *
 * Le nom est **calculé** : un ingrédient lié le tient de son item, donc un item
 * renommé reste juste dans la recette.
 *
 * Aucun statut n'est renvoyé, et c'est délibéré : la faisabilité se calcule
 * côté client, en croisant `itemId` avec l'étagère déjà en cache. Le faire ici
 * dupliquerait la source de vérité — et surtout ça ne marcherait pas
 * hors-ligne, là où le client, lui, sait encore répondre.
 */
export interface RecipeIngredientView {
  id: string;
  itemId: string | null;
  name: string;
}

export interface RecipeView {
  id: string;
  name: string;
  source: string | null;
  description: string | null;
  servings: number | null;
  createdBy: string | null;
  ingredients: RecipeIngredientView[];
}

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private readonly ingredientRepo: Repository<RecipeIngredient>,
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    private readonly dataSource: DataSource,
    @Inject(PAGE_FETCHER)
    private readonly fetchPage: PageFetcher,
  ) {}

  /**
   * Sauvegarde la recette que l'utilisateur est en train de lire.
   *
   * Le geste est celui qu'on connaît : on met de côté, comme une vidéo. Pas de
   * lien à copier — le navigateur intégré sait déjà où l'on est.
   *
   * Les ingrédients arrivent en texte (« 100 g de riz basmati ») et sont
   * **rattachés à l'étagère quand c'est possible**. Sans ça, la recette
   * n'aurait que des lignes libres : elle serait « on ne sait pas », classée en
   * bas, et le tri par faisabilité — la seule chose que l'app apporte à une
   * recette — ne dirait rien.
   */
  async importFromUrl(
    url: string,
    groupId: string,
    memberId: string,
  ): Promise<RecipeView> {
    const parsed = parseRecipePage(await this.fetchPage(url));
    if (!parsed) {
      throw new BadRequestException(
        'Cette page ne publie pas sa recette. Note-la à la main, ou garde le lien.',
      );
    }

    const shelf = await this.itemRepo.find({ where: { groupId } });

    return this.create(
      {
        name: parsed.name.slice(0, 100),
        source: url,
        description: parsed.steps || undefined,
        servings: parsed.servings ?? undefined,
        ingredients: parsed.ingredients.map((line) => {
          const item = matchItem(line, shelf);

          // La ligne brute est conservée quand rien ne correspond : « 3 foie de
          // volaille » reste lisible même si le groupe ne le suit pas.
          return item ? { itemId: item.id } : { label: line.slice(0, 100) };
        }),
      },
      groupId,
      memberId,
    );
  }

  async findAllInGroup(groupId: string): Promise<RecipeView[]> {
    const recipes = await this.recipeRepo.find({
      where: { groupId },
      relations: { ingredients: { item: true }, createdBy: true },
      order: { name: 'ASC' },
    });

    return recipes.map((recipe) => this.toView(recipe));
  }

  async findOneInGroup(recipeId: string, groupId: string): Promise<RecipeView> {
    return this.toView(await this.load(recipeId, groupId));
  }

  /**
   * La recette et ses ingrédients naissent ensemble, dans une transaction.
   *
   * Une création en deux temps laisserait des recettes vides derrière chaque
   * échec — et la file hors-ligne, qui rejoue les gestes un par un, en
   * fabriquerait à la chaîne.
   */
  async create(
    dto: CreateRecipeDto,
    groupId: string,
    memberId: string,
  ): Promise<RecipeView> {
    for (const ingredient of dto.ingredients ?? []) {
      this.assertOneNature(ingredient);
    }
    await this.assertItemsBelongToGroup(dto.ingredients ?? [], groupId);
    this.assertNoDuplicateItem(dto.ingredients ?? []);

    const recipe = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(Recipe).save(
        manager.getRepository(Recipe).create({
          groupId,
          name: dto.name,
          source: dto.source ?? null,
          description: dto.description ?? null,
          servings: dto.servings ?? null,
          createdById: memberId,
        }),
      );

      const ingredients = (dto.ingredients ?? []).map((ingredient, position) =>
        manager.getRepository(RecipeIngredient).create({
          recipeId: saved.id,
          itemId: ingredient.itemId ?? null,
          label: ingredient.itemId ? null : ingredient.label!.trim(),
          position,
        }),
      );
      if (ingredients.length > 0) {
        await manager.getRepository(RecipeIngredient).save(ingredients);
      }

      return saved;
    });

    return this.findOneInGroup(recipe.id, groupId);
  }

  async update(
    recipeId: string,
    groupId: string,
    dto: UpdateRecipeDto,
  ): Promise<RecipeView> {
    const recipe = await this.load(recipeId, groupId);

    if (dto.name !== undefined) recipe.name = dto.name;
    if (dto.source !== undefined) recipe.source = dto.source;
    if (dto.description !== undefined) recipe.description = dto.description;
    if (dto.servings !== undefined) recipe.servings = dto.servings;

    await this.recipeRepo.save(recipe);

    return this.findOneInGroup(recipeId, groupId);
  }

  /** Soft-delete : une recette est un document, pas un état de passage. */
  async remove(recipeId: string, groupId: string): Promise<void> {
    const recipe = await this.load(recipeId, groupId);
    await this.recipeRepo.softRemove(recipe);
  }

  async addIngredient(
    recipeId: string,
    groupId: string,
    dto: AddIngredientDto,
  ): Promise<RecipeView> {
    await this.load(recipeId, groupId);
    this.assertOneNature(dto);
    await this.assertItemsBelongToGroup([dto], groupId);

    const ingredient = this.ingredientRepo.create({
      recipeId,
      itemId: dto.itemId ?? null,
      label: dto.itemId ? null : dto.label!.trim(),
      // À la fin de la liste : on ajoute un ingrédient, on ne le glisse pas.
      position: await this.nextPosition(recipeId),
    });

    try {
      await this.ingredientRepo.save(ingredient);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException('Cet item est déjà dans la recette');
      }
      throw error;
    }

    return this.findOneInGroup(recipeId, groupId);
  }

  async removeIngredient(
    recipeId: string,
    ingredientId: string,
    groupId: string,
  ): Promise<RecipeView> {
    await this.load(recipeId, groupId);

    const ingredient = await this.ingredientRepo.findOne({
      where: { id: ingredientId, recipeId },
    });
    if (!ingredient) throw new NotFoundException('Ingrédient introuvable');

    await this.ingredientRepo.remove(ingredient);

    return this.findOneInGroup(recipeId, groupId);
  }

  /**
   * Un ingrédient est soit lié, soit libre. Les deux à la fois laisserait deux
   * noms concurrents sur la même ligne ; aucun des deux ne désignerait rien.
   */
  private assertOneNature(dto: AddIngredientDto): void {
    const hasItem = dto.itemId !== undefined;
    const hasLabel = dto.label !== undefined && dto.label.trim().length > 0;

    if (hasItem === hasLabel) {
      throw new BadRequestException(
        'Choisis un item de l’étagère, ou écris le nom de l’ingrédient.',
      );
    }
  }

  /** Le filtre sur groupId isole les groupes : un item d'ailleurs est introuvable. */
  private async assertItemsBelongToGroup(
    ingredients: AddIngredientDto[],
    groupId: string,
  ): Promise<void> {
    for (const ingredient of ingredients) {
      if (ingredient.itemId === undefined) continue;

      const exists = await this.itemRepo.exists({
        where: { id: ingredient.itemId, groupId },
      });
      if (!exists) throw new NotFoundException('Item introuvable');
    }
  }

  /**
   * La contrainte d'unicité tranche les doublons ajoutés un par un. Elle ne
   * peut rien pour ceux qui arrivent dans le même appel : la base ne les voit
   * qu'au moment du `save`, et l'erreur remonterait alors comme un 500.
   */
  private assertNoDuplicateItem(ingredients: AddIngredientDto[]): void {
    const ids = ingredients
      .map((ingredient) => ingredient.itemId)
      .filter((id): id is string => id !== undefined);

    if (new Set(ids).size !== ids.length) {
      throw new ConflictException('Cet item est déjà dans la recette');
    }
  }

  private async nextPosition(recipeId: string): Promise<number> {
    const last = await this.ingredientRepo.findOne({
      where: { recipeId },
      order: { position: 'DESC' },
    });

    return last ? last.position + 1 : 0;
  }

  private async load(recipeId: string, groupId: string): Promise<Recipe> {
    const recipe = await this.recipeRepo.findOne({
      where: { id: recipeId, groupId },
      relations: { ingredients: { item: true }, createdBy: true },
    });
    if (!recipe) throw new NotFoundException('Recette introuvable');

    return recipe;
  }

  private toView(recipe: Recipe): RecipeView {
    return {
      id: recipe.id,
      name: recipe.name,
      source: recipe.source,
      description: recipe.description,
      servings: recipe.servings,
      createdBy: recipe.createdBy?.name ?? null,
      ingredients: (recipe.ingredients ?? [])
        .slice()
        // L'ordre de saisie : c'est celui dans lequel on lit une recette.
        .sort((a, b) => a.position - b.position)
        .map((ingredient) => ({
          id: ingredient.id,
          itemId: ingredient.itemId,
          name: ingredient.item?.name ?? ingredient.label ?? '',
        })),
    };
  }
}
