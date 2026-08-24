import { useGroup } from '@/api/groups';

/**
 * Le groupe est une association.
 *
 * Jumeau de [`useIsSolo`](./useIsSolo.ts), et pour la même raison : une règle
 * de mode recopiée à plusieurs endroits finit par diverger sur le suivant.
 *
 * Ce que ce mode change, aujourd'hui, tient en une chose : le **journal a un
 * lieu**. Une colocation demande « qui a fini le café » — une question sur un
 * objet, à laquelle le relevé d'un item répond déjà. Une association demande
 * « qu'a sorti untel, depuis quand » — une question sur une personne dans le
 * temps, qui a besoin de son propre écran. Ce n'est pas une différence de
 * taille, c'est une différence de question.
 *
 * Le type fait foi, comme pour le solo. À la différence du solo, rien ne le
 * promeut : une association reste une association même vidée de ses membres.
 */
export function useIsAssociation(): boolean {
  const group = useGroup();

  return group.data?.type === 'association';
}
