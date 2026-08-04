// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTrip } from '@/lib/loader';
import { createTripStore, type TripStore } from '@/lib/store';
import { readStopId, syncStoreWithUrl, withStopId } from '@/lib/urlSync';

/** Cuatro paradas en dos capítulos, con ids cortos para leerlos en la URL. */
function makeStore(): TripStore {
  return createTripStore(
    loadTrip({
      chapters: [
        { id: 'norte', title: 'Norte', dateStart: '2023-01-01', dateEnd: '2023-01-31', color: '#c2410c' },
        { id: 'sur', title: 'Sur', dateStart: '2023-02-01', dateEnd: '2023-02-28', color: '#0f766e' },
      ],
      stops: [
        { id: 'a', name: 'A', country: 'MA', coords: [0, 0], dateStart: '2023-01-01', chapterId: 'norte', title: 'A', body: '' },
        { id: 'b', name: 'B', country: 'MA', coords: [1, 0], dateStart: '2023-01-10', chapterId: 'norte', title: 'B', body: '' },
        { id: 'c', name: 'C', country: 'MR', coords: [2, 0], dateStart: '2023-02-01', chapterId: 'sur', title: 'C', body: '' },
        { id: 'd', name: 'D', country: 'MR', coords: [3, 0], dateStart: '2023-02-10', chapterId: 'sur', title: 'D', body: '' },
      ],
      legs: [
        { fromStopId: 'a', toStopId: 'b', mode: 'bus' },
        { fromStopId: 'b', toStopId: 'c', mode: 'car' },
        { fromStopId: 'c', toStopId: 'd', mode: 'bus' },
      ],
    }),
  );
}

let disconnect: (() => void) | undefined;

/** Arranca la sincronización sobre la URL actual y devuelve el store conectado. */
function connect(url = '/'): TripStore {
  window.history.replaceState(null, '', url);
  const store = makeStore();
  disconnect = syncStoreWithUrl(store);
  return store;
}

function currentUrl(): string {
  return `${window.location.pathname}${window.location.search}`;
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  disconnect?.();
  disconnect = undefined;
});

describe('readStopId', () => {
  it('lee el parámetro y devuelve null si no está o está vacío', () => {
    expect(readStopId('?stop=fez')).toBe('fez');
    expect(readStopId('?otro=1&stop=fez')).toBe('fez');
    expect(readStopId('')).toBeNull();
    expect(readStopId('?otro=1')).toBeNull();
    expect(readStopId('?stop=')).toBeNull();
  });
});

describe('withStopId', () => {
  it('pone, cambia y quita el parámetro conservando los demás', () => {
    expect(withStopId('', 'fez')).toBe('?stop=fez');
    expect(withStopId('?stop=tanger', 'fez')).toBe('?stop=fez');
    expect(withStopId('?otro=1&stop=tanger', 'fez')).toBe('?otro=1&stop=fez');
    expect(withStopId('?otro=1&stop=tanger', null)).toBe('?otro=1');
    expect(withStopId('?stop=tanger', null)).toBe('');
  });
});

describe('al conectar', () => {
  it('adopta la parada del parámetro sin tocar el historial', () => {
    const length = window.history.length;
    const store = connect('/?stop=c');

    expect(store.getState().currentStopIndex).toBe(2);
    expect(currentUrl()).toBe('/?stop=c');
    expect(window.history.length).toBe(length);
  });

  it('sin parámetro se queda en la primera parada y deja la URL como está', () => {
    const store = connect('/');

    expect(store.getState().currentStopIndex).toBe(0);
    expect(currentUrl()).toBe('/');
  });

  it('un id que no existe cae a la primera parada y se limpia (§3.2)', () => {
    const length = window.history.length;
    const store = connect('/?stop=zzz');

    expect(store.getState().currentStopIndex).toBe(0);
    expect(currentUrl()).toBe('/');
    expect(window.history.length).toBe(length);
  });

  it('al limpiar el id malo conserva el resto de la query', () => {
    connect('/?otro=1&stop=zzz');
    expect(currentUrl()).toBe('/?otro=1');
  });
});

describe('navegación discreta', () => {
  it('escribe el id de la parada y empuja una entrada de historial', () => {
    const store = connect('/');
    const length = window.history.length;

    store.getState().next();
    expect(currentUrl()).toBe('/?stop=b');
    expect(window.history.length).toBe(length + 1);

    store.getState().goToChapter('sur');
    expect(currentUrl()).toBe('/?stop=c');
    expect(window.history.length).toBe(length + 2);
  });

  it('no empuja nada si el índice no cambia', () => {
    const store = connect('/?stop=d');
    const length = window.history.length;

    store.getState().next();
    store.getState().goToStop(3);
    expect(currentUrl()).toBe('/?stop=d');
    expect(window.history.length).toBe(length);
  });

  it('conserva el resto de la query', () => {
    const store = connect('/?otro=1');

    store.getState().next();
    expect(currentUrl()).toBe('/?otro=1&stop=b');
  });
});

describe('arrastre del cursor (§3.2)', () => {
  it('sigue al cursor sin añadir entradas y deja una sola al soltar', () => {
    const store = connect('/');
    const { startScrub, goToStop, endScrub } = store.getState();
    const length = window.history.length;

    startScrub();
    goToStop(1);
    expect(currentUrl()).toBe('/?stop=b');
    goToStop(2);
    goToStop(3);
    expect(currentUrl()).toBe('/?stop=d');
    expect(window.history.length).toBe(length);

    endScrub();
    expect(currentUrl()).toBe('/?stop=d');
    expect(window.history.length).toBe(length + 1);
  });

  it('al soltar, la entrada anterior es la de antes de arrastrar', async () => {
    const store = connect('/?stop=b');
    const { startScrub, goToStop, endScrub } = store.getState();

    startScrub();
    goToStop(3);
    endScrub();

    window.history.back();
    await expect.poll(() => currentUrl()).toBe('/?stop=b');
    expect(store.getState().currentStopIndex).toBe(1);
  });

  it('un arrastre que vuelve al punto de partida no deja rastro', () => {
    const store = connect('/?stop=b');
    const { startScrub, goToStop, endScrub } = store.getState();
    const length = window.history.length;

    startScrub();
    goToStop(3);
    goToStop(1);
    endScrub();

    expect(currentUrl()).toBe('/?stop=b');
    expect(window.history.length).toBe(length);
  });

  it('soltar sin haberse movido no deja rastro', () => {
    const store = connect('/');
    const { startScrub, endScrub } = store.getState();
    const length = window.history.length;

    startScrub();
    endScrub();

    expect(currentUrl()).toBe('/');
    expect(window.history.length).toBe(length);
  });
});

describe('botón de atrás', () => {
  it('aplica la URL al store sin volver a escribir en el historial', () => {
    const store = connect('/');
    store.getState().goToStop(2);
    const length = window.history.length;

    window.history.replaceState(null, '', '/?stop=b');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(store.getState().currentStopIndex).toBe(1);
    expect(currentUrl()).toBe('/?stop=b');
    expect(window.history.length).toBe(length);
  });

  it('volver a una URL sin parámetro lleva a la primera parada', () => {
    const store = connect('/');
    store.getState().goToStop(2);

    window.history.replaceState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(store.getState().currentStopIndex).toBe(0);
  });

  it('un id que no existe lleva a la primera parada', () => {
    const store = connect('/');
    store.getState().goToStop(2);

    window.history.replaceState(null, '', '/?stop=zzz');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(store.getState().currentStopIndex).toBe(0);
  });

  it('recorre hacia atrás las paradas visitadas', async () => {
    const store = connect('/');
    const { next } = store.getState();

    next();
    next();
    expect(currentUrl()).toBe('/?stop=c');

    window.history.back();
    await expect.poll(() => store.getState().currentStopIndex).toBe(1);
    expect(currentUrl()).toBe('/?stop=b');

    window.history.back();
    await expect.poll(() => store.getState().currentStopIndex).toBe(0);
    expect(currentUrl()).toBe('/');
  });
});

describe('al desconectar', () => {
  it('deja de escribir en la URL y de escuchar el historial', () => {
    const store = connect('/');
    disconnect?.();
    disconnect = undefined;

    store.getState().goToStop(2);
    expect(currentUrl()).toBe('/');

    window.history.replaceState(null, '', '/?stop=a');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(store.getState().currentStopIndex).toBe(2);
  });
});
