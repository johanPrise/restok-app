import { ConflictException } from '@nestjs/common';
import { ItemStatus } from './entities/item.entity';
import {
  assertTransition,
  autoTransition,
  canTransition,
} from './item-state-machine';

const { AVAILABLE, LOW, OUT_OF_STOCK, TO_RESTOCK } = ItemStatus;
const ALL = [AVAILABLE, LOW, OUT_OF_STOCK, TO_RESTOCK];

describe('state machine des items', () => {
  describe('transitions autorisées', () => {
    it.each([
      [AVAILABLE, AVAILABLE, 'prise qui laisse du stock'],
      [AVAILABLE, LOW, 'seuil bas atteint'],
      [AVAILABLE, OUT_OF_STOCK, 'dernier pris'],
      [LOW, LOW, 'prise qui reste sous le seuil'],
      [LOW, OUT_OF_STOCK, 'dernier pris'],
      [LOW, AVAILABLE, 'rachat sur stock bas'],
      [OUT_OF_STOCK, TO_RESTOCK, 'automatique'],
      [TO_RESTOCK, AVAILABLE, 'rachat confirmé'],
      [TO_RESTOCK, LOW, 'rachat partiel sous le seuil'],
    ])('%s → %s (%s)', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    });
  });

  describe('transitions interdites', () => {
    // Le complément exact du tableau autorisé — aucune transition ne passe
    // entre les mailles.
    const allowed = new Set([
      `${AVAILABLE}>${AVAILABLE}`,
      `${AVAILABLE}>${LOW}`,
      `${AVAILABLE}>${OUT_OF_STOCK}`,
      `${LOW}>${LOW}`,
      `${LOW}>${OUT_OF_STOCK}`,
      `${LOW}>${AVAILABLE}`,
      `${OUT_OF_STOCK}>${TO_RESTOCK}`,
      `${TO_RESTOCK}>${AVAILABLE}`,
      `${TO_RESTOCK}>${LOW}`,
    ]);

    const forbidden = ALL.flatMap((from) =>
      ALL.filter((to) => !allowed.has(`${from}>${to}`)).map((to) => [from, to]),
    );

    it('couvre le complément exact du tableau autorisé', () => {
      expect(forbidden).toHaveLength(ALL.length * ALL.length - allowed.size);
    });

    it.each(forbidden)('%s → %s est refusée', (from, to) => {
      expect(canTransition(from, to)).toBe(false);
      expect(() => assertTransition(from, to)).toThrow(ConflictException);
    });

    it('interdit de revenir en arrière depuis to_restock', () => {
      expect(canTransition(TO_RESTOCK, OUT_OF_STOCK)).toBe(false);
      expect(canTransition(TO_RESTOCK, TO_RESTOCK)).toBe(false);
    });

    it('interdit de sauter la rupture depuis out_of_stock', () => {
      expect(canTransition(OUT_OF_STOCK, AVAILABLE)).toBe(false);
    });
  });

  describe('assertTransition', () => {
    it('laisse passer une transition valide', () => {
      expect(() => assertTransition(TO_RESTOCK, AVAILABLE)).not.toThrow();
    });

    it('garde les deux états dans la cause, pas dans le message', () => {
      // Le message part au client tel quel : il doit parler à quelqu'un qui
      // range ses courses. Les noms d'états servent au diagnostic, et restent
      // dans la cause, que la réponse HTTP n'emporte pas.
      let thrown: unknown;
      try {
        assertTransition(TO_RESTOCK, OUT_OF_STOCK);
      } catch (error) {
        thrown = error;
      }

      expect((thrown as Error).message).not.toMatch(/to_restock|out_of_stock/);
      expect((thrown as Error).cause).toBe(
        'Transition interdite : to_restock → out_of_stock',
      );
    });
  });

  describe('autoTransition', () => {
    it('enchaîne out_of_stock sur to_restock', () => {
      expect(autoTransition(OUT_OF_STOCK)).toBe(TO_RESTOCK);
    });

    it.each([AVAILABLE, LOW, TO_RESTOCK])('%s est un état stable', (status) => {
      expect(autoTransition(status)).toBeNull();
    });
  });
});
