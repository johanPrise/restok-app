import {
  generateInviteCode,
  INVITE_CODE_LENGTH,
  normalizeInviteCode,
} from './invite-code';

describe('generateInviteCode', () => {
  it('produit un code de la longueur attendue', () => {
    expect(generateInviteCode()).toHaveLength(INVITE_CODE_LENGTH);
  });

  it("n'utilise que des caractères non ambigus", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateInviteCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]+$/);
    }
  });

  it('évite I, O, 0 et 1', () => {
    const codes = Array.from({ length: 500 }, () => generateInviteCode()).join(
      '',
    );
    expect(codes).not.toMatch(/[IO01]/);
  });

  it('ne se répète pas sur un petit échantillon', () => {
    const codes = new Set(
      Array.from({ length: 1000 }, () => generateInviteCode()),
    );
    expect(codes.size).toBe(1000);
  });
});

describe('normalizeInviteCode', () => {
  it('met en majuscules et retire les espaces', () => {
    expect(normalizeInviteCode('  ab2cd3ef  ')).toBe('AB2CD3EF');
  });
});
