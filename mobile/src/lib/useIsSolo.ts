import { useGroup } from '@/api/groups';

/**
 * Le groupe ne compte qu'une personne.
 *
 * Un seul endroit décide, parce que la règle va s'appliquer à cinq écrans et
 * qu'une règle recopiée cinq fois finit par diverger sur le sixième.
 *
 * Le **type** fait foi, pas le nombre de membres : une colocation dont tout le
 * monde est parti reste une colocation, et c'est précisément le moment où elle
 * a besoin de son code d'invitation. À l'inverse, un groupe solo que quelqu'un
 * rejoint cesse d'être solo côté serveur — le type ne peut donc pas mentir.
 */
export function useIsSolo(): boolean {
  const group = useGroup();

  return group.data?.type === 'solo';
}
