import { afterEach, describe, expect, it, vi } from 'vitest';
import { withBase } from '@/lib/assets';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('withBase', () => {
  it('en la raíz del dominio deja la ruta como está', () => {
    vi.stubEnv('BASE_URL', '/');

    expect(withBase('/photos/tanger-puerto.svg')).toBe('/photos/tanger-puerto.svg');
  });

  it('cuelga la ruta de la base del despliegue', () => {
    vi.stubEnv('BASE_URL', '/TripMap/');

    expect(withBase('/photos/tanger-puerto.svg')).toBe('/TripMap/photos/tanger-puerto.svg');
  });

  it('no duplica la barra si la base no la trae', () => {
    vi.stubEnv('BASE_URL', '/TripMap');

    expect(withBase('/photos/tanger-puerto.svg')).toBe('/TripMap/photos/tanger-puerto.svg');
  });

  it('rechaza las rutas relativas, que no son del sitio', () => {
    vi.stubEnv('BASE_URL', '/TripMap/');

    expect(() => withBase('photos/tanger-puerto.svg')).toThrow(/absoluta/);
  });
});
