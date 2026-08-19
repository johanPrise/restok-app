import { BadRequestException } from '@nestjs/common';
import { fetchPage } from './fetch-page';

/**
 * Ces cas sont vérifiés **ici** et non dans la suite e2e : là-bas le
 * récupérateur est remplacé par une fixture, donc le filtre ne s'exécute
 * jamais. Les tests y passaient sans rien prouver.
 */
describe('fetchPage — adresses refusées', () => {
  const refused = async (url: string) => {
    // Aucun appel réseau ne doit partir : le refus précède la requête.
    const spy = jest.spyOn(global, 'fetch');
    await expect(fetchPage(url)).rejects.toBeInstanceOf(BadRequestException);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  };

  it.each([
    ['la boucle locale par nom', 'http://localhost:3000/items'],
    ['la boucle locale par IP', 'http://127.0.0.1/x'],
    ['la boucle locale en IPv6', 'http://[::1]/x'],
    // Le cas qui compte vraiment : lire les identifiants de la machine.
    ['les métadonnées cloud', 'http://169.254.169.254/latest/meta-data/'],
    ['un réseau privé en 192.168', 'http://192.168.1.12:3000/'],
    ['un réseau privé en 10.x', 'http://10.0.0.5/'],
    ['un réseau privé en 172.16', 'http://172.16.0.1/'],
    ['le fichier local', 'file:///etc/passwd'],
    ['un protocole exotique', 'gopher://exemple.fr/'],
    ['une adresse illisible', 'pas une url'],
  ])('refuse %s sans même appeler le réseau', async (_label, url) => {
    await refused(url);
  });

  it('laisse passer une adresse publique', async () => {
    const spy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('<html>ok</html>', { status: 200 }));

    await expect(
      fetchPage('https://www.marmiton.org/r.aspx'),
    ).resolves.toContain('ok');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('refuse une redirection vers une adresse interne', async () => {
    // `fetch` suit les redirections tout seul : une page publique pourrait
    // alors renvoyer vers le réseau interne sans qu'on le voie passer.
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/' },
      }),
    );

    await expect(
      fetchPage('https://exemple.fr/redirige'),
    ).rejects.toBeInstanceOf(BadRequestException);
    spy.mockRestore();
  });
});
