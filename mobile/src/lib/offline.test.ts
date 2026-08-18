import { completeBlockedReason, offlineNotice } from './offline';

describe('offlineNotice', () => {
  it('ne dit rien tant qu’il y a du réseau', () => {
    expect(offlineNotice(true, 0)).toBeNull();
  });

  it('se tait aussi quand des gestes sont en vol : ils partent', () => {
    expect(offlineNotice(true, 3)).toBeNull();
  });

  it('annonce la coupure avant même qu’un geste soit tenté', () => {
    expect(offlineNotice(false, 0)).toBe(
      'Hors-ligne — tes gestes seront envoyés au retour',
    );
  });

  it('compte ce qui attend, parce qu’une file muette ne se croit pas', () => {
    expect(offlineNotice(false, 1)).toBe('Hors-ligne — 1 geste en attente');
    expect(offlineNotice(false, 4)).toBe('Hors-ligne — 4 gestes en attente');
  });
});

describe('completeBlockedReason', () => {
  it('laisse valider quand le réseau est là', () => {
    expect(completeBlockedReason(true)).toBeNull();
  });

  it('refuse hors-ligne, et dit pourquoi', () => {
    // Rejouée après coup, la clôture doublerait le stock : mieux vaut un
    // bouton grisé qu'un inventaire faux.
    expect(completeBlockedReason(false)).toBe(
      'Valider les courses demande une connexion',
    );
  });
});
