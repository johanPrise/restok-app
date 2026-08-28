import { useItems } from '@/api/items';
import { useRecipes } from '@/api/recipes';
import { useShoppingList } from '@/api/shopping';
import { useSession } from '@/store/session';
import { type HintContext, type HintId, nextHint } from './hints';

/**
 * Le repère à montrer sur cet écran, ou `null`.
 *
 * Tout ce que la décision demande est déjà en cache — l'étagère, les courses,
 * les recettes. Aucune requête n'est déclenchée pour un repère : ce serait
 * faire payer le réseau à une phrase d'aide.
 *
 * Le choix lui-même vit dans `hints.ts`, en pur : ce hook ne fait que lui
 * apporter l'état de l'app. C'est ce qui permet de tester la règle — « trois
 * recettes avant d'annoncer un tri » — sans monter le moindre écran.
 */
export function useHint(screen: HintContext['screen']): HintId | null {
  const learned = useSession((s) => s.learned);
  const isAdmin = useSession((s) => s.member?.role) === 'admin';

  const items = useItems();
  const shopping = useShoppingList();
  const recipes = useRecipes();

  return nextHint({
    learned,
    screen,
    isAdmin,
    itemCount: items.data?.length ?? 0,
    checkedCount: (shopping.data ?? []).filter((line) => line.checked).length,
    recipeCount: recipes.data?.length ?? 0,
  });
}
