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
 * - **valider les courses**, **prendre** et **racheter** sont des
 *   incrémentations. Rejouées, elles comptent deux fois — et pour les deux
 *   dernières, dans le journal, qui est censé dire la vérité.
 */
export const mutationKeys = {
  addShoppingLine: ['shopping', 'add'] as const,
  toggleShoppingLine: ['shopping', 'toggle'] as const,
  setShoppingLineQuantity: ['shopping', 'quantity'] as const,
  removeShoppingLine: ['shopping', 'remove'] as const,
};

/**
 * **Décision du 18 août 2026 — à rouvrir, pas une fatalité.**
 *
 * Ce qui interdit une clé à `take` et `restock` n'est pas leur nature, c'est
 * l'absence de déduplication côté serveur. Un identifiant d'opération engendré
 * par le client, porté par la mutation, plus une contrainte d'unicité sur
 * `action_history`, et une prise devient rejouable sans compter deux fois —
 * donc persistable, donc restaurable après un redémarrage.
 *
 * Pourquoi ça vaut mieux qu'un confort d'interface : **une prise perdue est une
 * ligne de journal perdue.** L'app existe pour dire qui a sorti quoi. Un geste
 * qui disparaît en silence n'est pas un défaut d'affichage, c'est la promesse
 * centrale du produit qui se dément.
 *
 * En attendant, les écrans doivent **dire la vérité** sur ce qu'ils garantissent
 * — d'où `isResumableKey`, qui sert à ne pas promettre une livraison qu'on
 * n'assure pas.
 */
export function isResumableKey(key: unknown): boolean {
  if (!Array.isArray(key)) return false;

  return Object.values(mutationKeys).some(
    (known) =>
      known.length === key.length &&
      known.every((part, index) => part === key[index]),
  );
}
