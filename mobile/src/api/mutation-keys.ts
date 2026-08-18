/**
 * Les gestes qui survivent à une coupure — et ceux qui ne doivent surtout pas.
 *
 * Une mutation mise en pause hors-ligne ne peut repartir après un redémarrage
 * que si elle a été déclarée par `setMutationDefaults` sous une de ces clés :
 * l'app relit alors sa définition sur disque et la rejoue. Ne pas donner de clé
 * à un geste, c'est donc garantir qu'il ne sera **jamais** rejoué tout seul.
 *
 * Le critère est l'idempotence, pas le confort :
 *
 * - cocher, corriger une quantité, retirer une ligne sont des **affectations**.
 *   Les rejouer deux fois donne le même état.
 * - ajouter une ligne libre peut produire un doublon si la réponse s'est
 *   perdue. Une ligne en trop se retire d'un appui long : le coût est visible
 *   et réparable.
 * - **valider les courses** transforme les coches en rachats : c'est une
 *   incrémentation, qui écrit dans le stock *et* dans le journal. Rejouée, elle
 *   double l'inventaire et le journal jure que c'est vrai. Elle n'a pas de clé,
 *   et l'écran l'interdit hors-ligne.
 * - verser depuis l'étagère calcule ce qui manque **au moment de l'appel** :
 *   différée d'une heure, elle verserait un état qui n'est plus le bon.
 */
export const mutationKeys = {
  addShoppingLine: ['shopping', 'add'] as const,
  toggleShoppingLine: ['shopping', 'toggle'] as const,
  setShoppingLineQuantity: ['shopping', 'quantity'] as const,
  removeShoppingLine: ['shopping', 'remove'] as const,
};
