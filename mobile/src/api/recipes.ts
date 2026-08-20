import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import type {
  CreateRecipeInput,
  IngredientInput,
  Recipe,
  RecipeSuggestion,
} from '@/types/api';
import { authedRequest } from './authed';
import { queryKeys } from './query-client';

export function useRecipes() {
  const groupId = useSession((s) => s.member?.groupId);

  return useQuery({
    queryKey: queryKeys.recipes,
    queryFn: () => authedRequest<Recipe[]>('/recipes'),
    enabled: Boolean(groupId),
  });
}

/**
 * Cherche dans le catalogue. Les propositions arrivent **déjà triées par ce
 * qui manque le moins** — c'est le serveur qui trie, parce que lui seul
 * connaît les ingrédients des recettes qu'on ne possède pas encore.
 */
export function useRecipeSearch(query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: [...queryKeys.recipeSearch, trimmed],
    queryFn: () =>
      authedRequest<RecipeSuggestion[]>(
        `/recipes/search?q=${encodeURIComponent(trimmed)}`,
      ),
    enabled: trimmed.length >= 2,
    // Une recherche ne se périme pas : la même requête rend la même chose.
    staleTime: 5 * 60_000,
  });
}

export function useSaveFromCatalogue() {
  const invalidate = useInvalidateRecipes();

  return useMutation({
    networkMode: 'always',
    mutationFn: (ref: string) =>
      authedRequest<Recipe>('/recipes/catalogue', {
        method: 'POST',
        body: { ref },
      }),
    onSuccess: () => void invalidate(),
  });
}

function useInvalidateRecipes() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
}

/**
 * Aucune de ces mutations n'a de clé, donc aucune n'est rejouée après un
 * redémarrage — la règle de `mutation-keys` s'applique telle quelle.
 *
 * Ici ce n'est pas l'idempotence qui tranche, c'est l'usage : on écrit une
 * recette assis à sa table, pas au fond d'un rayon. Rejouer une création une
 * heure plus tard produirait un doublon que personne n'attendait plus.
 */
export function useCreateRecipe() {
  const invalidate = useInvalidateRecipes();

  return useMutation({
    mutationFn: (input: CreateRecipeInput) =>
      authedRequest<Recipe>('/recipes', { method: 'POST', body: input }),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateRecipe() {
  const invalidate = useInvalidateRecipes();

  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string } & Partial<CreateRecipeInput>) =>
      authedRequest<Recipe>(`/recipes/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteRecipe() {
  const invalidate = useInvalidateRecipes();

  return useMutation({
    mutationFn: (id: string) =>
      authedRequest<void>(`/recipes/${id}`, { method: 'DELETE' }),
    onSuccess: () => void invalidate(),
  });
}

export function useAddIngredient() {
  const invalidate = useInvalidateRecipes();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & IngredientInput) =>
      authedRequest<Recipe>(`/recipes/${id}/ingredients`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => void invalidate(),
  });
}

export function useRemoveIngredient() {
  const invalidate = useInvalidateRecipes();

  return useMutation({
    mutationFn: ({
      recipeId,
      ingredientId,
    }: {
      recipeId: string;
      ingredientId: string;
    }) =>
      authedRequest<Recipe>(
        `/recipes/${recipeId}/ingredients/${ingredientId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => void invalidate(),
  });
}
