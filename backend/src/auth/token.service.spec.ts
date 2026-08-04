import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { JwtPayload } from './types/jwt-payload.type';

describe('TokenService', () => {
  const sign = jest.fn(() => 'signed.jwt');
  const service = new TokenService({ sign } as unknown as JwtService);

  beforeEach(() => sign.mockClear());

  it("ne met que l'identité dans le payload", () => {
    service.issue('member-1');

    expect(sign).toHaveBeenCalledWith<[JwtPayload]>({ sub: 'member-1' });
  });

  it("n'expose ni groupId ni role", () => {
    service.issue('member-1');

    // Ce sont des droits, pas une identité : les signer les rendrait
    // irrévocables jusqu'à expiration.
    const payload = sign.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(payload)).toEqual(['sub']);
  });

  it('renvoie le token signé', () => {
    expect(service.issue('member-1')).toBe('signed.jwt');
  });
});
