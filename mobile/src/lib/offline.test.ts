import { completeBlockedReason, offlineNotice } from './offline';

describe('offlineNotice', () => {
  it('ne dit rien tant qu’il y a du réseau', () => {
    expect(offlineNotice(true, 0, 0)).toBeNull();
  });

  it('se tait aussi quand des gestes sont en vol : ils partent', () => {
    expect(offlineNotice(true, 3, 2)).toBeNull();
  });

  it('annonce la coupure avant qu’un geste soit tenté, sans rien promettre', () => {
    expect(offlineNotice(false, 0, 0)).toBe('Hors-ligne');
  });

  it('promet la livraison pour ce qui est écrit sur disque', () => {
    expect(offlineNotice(false, 1, 0)).toBe('Hors-ligne — 1 geste en attente');
    expect(offlineNotice(false, 4, 0)).toBe('Hors-ligne — 4 gestes en attente');
  });

  it('prévient qu’il faut garder l’app ouverte pour ce qui ne survit pas', () => {
    // Prendre et racheter vivent en mémoire : les annoncer « en attente »
    // promettrait une livraison qu'on n'assure pas.
    expect(offlineNotice(false, 0, 1)).toBe(
      'Hors-ligne — 1 geste pas encore envoyé, garde l’app ouverte',
    );
  });

  it('laisse la garantie la plus faible gouverner tout le message', () => {
    // Trois gestes survivraient, un seul non : on ne trie pas les rassurances
    // par lot, on prévient pour l'ensemble.
    expect(offlineNotice(false, 3, 1)).toBe(
      'Hors-ligne — 4 gestes pas encore envoyés, garde l’app ouverte',
    );
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
