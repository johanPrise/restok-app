import { GroupHistoryEntry } from './action-history.service';
import { BOM, toCsv } from './csv';
import { ActionType } from './entities/action-history.entity';

const entry = (
  overrides: Partial<GroupHistoryEntry> = {},
): GroupHistoryEntry => ({
  id: 'a',
  actionType: ActionType.TAKEN,
  quantity: 3,
  createdAt: new Date('2026-08-24T18:30:00.000Z'),
  itemId: 'i',
  itemName: 'Café',
  memberName: 'Lou',
  ...overrides,
});

/** Les lignes sans le BOM ni la ligne vide finale. */
const lines = (csv: string) => csv.replace(BOM, '').trimEnd().split('\r\n');

describe('toCsv', () => {
  it('ouvre sur une ligne d’en-têtes', () => {
    expect(lines(toCsv([]))[0]).toBe('date,membre,item,action,quantite');
  });

  it('porte le BOM, sans quoi Excel écrit « CafÃ© »', () => {
    expect(toCsv([entry()]).startsWith(BOM)).toBe(true);
  });

  it('écrit une action par ligne, dans l’ordre des colonnes', () => {
    expect(lines(toCsv([entry()]))[1]).toBe(
      '2026-08-24T18:30:00.000Z,Lou,Café,taken,3',
    );
  });

  it('finit en CRLF — la fin de ligne que la RFC 4180 impose', () => {
    expect(toCsv([entry()]).endsWith('\r\n')).toBe(true);
  });

  describe('l’échappement', () => {
    // Un nom d'item est du texte libre. Sans échappement, une seule ligne mal
    // formée décale toutes les colonnes, et personne ne s'en aperçoit avant de
    // lire un chiffre dans la colonne des noms.

    it('entoure de guillemets un champ qui contient une virgule', () => {
      const csv = lines(
        toCsv([entry({ itemName: 'Pastilles, format familial' })]),
      );

      expect(csv[1]).toContain('"Pastilles, format familial"');
    });

    it('double les guillemets d’un champ qui en contient', () => {
      const csv = lines(toCsv([entry({ itemName: 'Lait "demi-écrémé"' })]));

      expect(csv[1]).toContain('"Lait ""demi-écrémé"""');
    });

    it('garde un retour à la ligne dans son champ, sans casser la ligne', () => {
      const csv = toCsv([entry({ itemName: 'Papier\ntoilette' })]);

      // Le retour survit, mais entre guillemets : le fichier garde deux lignes
      // — l'en-tête et l'action — pour un lecteur qui respecte la RFC.
      expect(csv).toContain('"Papier\ntoilette"');
    });

    it('laisse la case vide quand l’auteur a supprimé son compte', () => {
      // L'acte a eu lieu ; c'est son auteur qui a disparu. Inventer « Inconnu »
      // serait pire que le trou, parce qu'on pourrait le prendre pour un nom.
      const csv = lines(toCsv([entry({ memberName: null })]));

      expect(csv[1]).toBe('2026-08-24T18:30:00.000Z,,Café,taken,3');
    });

    it('laisse la quantité vide en suivi binaire, qui ne compte rien', () => {
      const csv = lines(toCsv([entry({ quantity: null })]));

      expect(csv[1].endsWith('taken,')).toBe(true);
    });
  });

  it('ne traduit pas l’action', () => {
    // Le fichier est une donnée, pas un écran. Le traduire le rendrait
    // dépendant de la langue de celui qui l'a exporté, et deux exports du même
    // registre cesseraient de se comparer.
    const csv = lines(
      toCsv([entry({ actionType: ActionType.RESTOCKED, quantity: 1 })]),
    );

    expect(csv[1]).toContain(',restocked,');
  });
});
