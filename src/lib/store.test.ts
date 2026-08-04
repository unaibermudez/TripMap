import { describe, expect, it, vi } from 'vitest';
import { loadTrip } from '@/lib/loader';
import {
  createTripStore,
  selectCurrentChapter,
  selectCurrentStop,
  type TripStore,
} from '@/lib/store';

/** Cuatro paradas en dos capítulos: "norte" es a y b, "sur" es c y d. */
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

function indexOf(store: TripStore): number {
  return store.getState().currentStopIndex;
}

describe('createTripStore', () => {
  it('empieza en la primera parada y sin arrastrar', () => {
    const store = makeStore();

    expect(indexOf(store)).toBe(0);
    expect(store.getState().isScrubbing).toBe(false);
    expect(store.getState().isPanelOpen).toBe(false);
  });

  it('expone el viaje tal cual', () => {
    const store = makeStore();
    expect(store.getState().trip.stops).toHaveLength(4);
  });
});

describe('next y prev', () => {
  it('avanzan y retroceden de una en una', () => {
    const store = makeStore();
    const { next, prev } = store.getState();

    next();
    expect(indexOf(store)).toBe(1);
    next();
    expect(indexOf(store)).toBe(2);
    prev();
    expect(indexOf(store)).toBe(1);
  });

  it('no pasan de la última parada', () => {
    const store = makeStore();
    const { goToStop, next } = store.getState();

    goToStop(3);
    next();
    expect(indexOf(store)).toBe(3);
  });

  it('no pasan de la primera parada', () => {
    const store = makeStore();

    store.getState().prev();
    expect(indexOf(store)).toBe(0);
  });
});

describe('goToStop', () => {
  it('recorta los índices fuera de rango', () => {
    const store = makeStore();
    const { goToStop } = store.getState();

    goToStop(99);
    expect(indexOf(store)).toBe(3);
    goToStop(-4);
    expect(indexOf(store)).toBe(0);
  });

  it('trunca los índices fraccionarios', () => {
    const store = makeStore();

    store.getState().goToStop(2.8);
    expect(indexOf(store)).toBe(2);
  });

  it('ignora los índices que no son números', () => {
    const store = makeStore();
    const { goToStop } = store.getState();

    goToStop(2);
    goToStop(Number.NaN);
    goToStop(Number.POSITIVE_INFINITY);
    expect(indexOf(store)).toBe(2);
  });

  it('no avisa a los suscriptores si el índice no cambia', () => {
    const store = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.getState().goToStop(0);
    expect(listener).not.toHaveBeenCalled();

    store.getState().goToStop(1);
    expect(listener).toHaveBeenCalledTimes(1);

    // Recortar hasta un índice ya activo tampoco es un cambio.
    store.getState().goToStop(-1);
    store.getState().goToStop(0);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('goToChapter', () => {
  it('lleva a la primera parada del capítulo', () => {
    const store = makeStore();
    const { goToChapter } = store.getState();

    goToChapter('sur');
    expect(indexOf(store)).toBe(2);
    goToChapter('norte');
    expect(indexOf(store)).toBe(0);
  });

  it('no se mueve si el capítulo no existe', () => {
    const store = makeStore();
    const { goToStop, goToChapter } = store.getState();

    goToStop(2);
    goToChapter('este');
    expect(indexOf(store)).toBe(2);
  });
});

describe('startScrub y endScrub', () => {
  it('marcan y desmarcan el arrastre', () => {
    const store = makeStore();
    const { startScrub, endScrub } = store.getState();

    startScrub();
    expect(store.getState().isScrubbing).toBe(true);
    endScrub();
    expect(store.getState().isScrubbing).toBe(false);
  });

  it('no avisan dos veces del mismo estado', () => {
    const store = makeStore();
    const listener = vi.fn();
    const { startScrub, endScrub } = store.getState();

    store.subscribe(listener);
    startScrub();
    startScrub();
    endScrub();
    endScrub();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('no impiden navegar mientras dura', () => {
    const store = makeStore();
    const { startScrub, goToStop } = store.getState();

    startScrub();
    goToStop(3);
    expect(indexOf(store)).toBe(3);
    expect(store.getState().isScrubbing).toBe(true);
  });
});

describe('setBasemap', () => {
  it('empieza en el basemap por defecto y cambia al pedirlo', () => {
    const store = makeStore();

    expect(store.getState().basemapId).toBe('positron');
    store.getState().setBasemap('satellite');
    expect(store.getState().basemapId).toBe('satellite');
  });

  it('no avisa a los suscriptores si es el basemap que ya está puesto', () => {
    const store = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.getState().setBasemap('positron');
    expect(listener).not.toHaveBeenCalled();

    store.getState().setBasemap('satellite');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('no toca la parada activa', () => {
    const store = makeStore();

    store.getState().goToStop(2);
    store.getState().setBasemap('satellite');
    expect(indexOf(store)).toBe(2);
  });
});

describe('togglePanel', () => {
  it('abre y cierra la hoja del panel', () => {
    const store = makeStore();

    store.getState().togglePanel();
    expect(store.getState().isPanelOpen).toBe(true);
    store.getState().togglePanel();
    expect(store.getState().isPanelOpen).toBe(false);
  });

  it('no toca la parada activa', () => {
    const store = makeStore();

    store.getState().goToStop(2);
    store.getState().togglePanel();
    expect(indexOf(store)).toBe(2);
  });
});

describe('selectores derivados', () => {
  it('la parada activa es la del índice', () => {
    const store = makeStore();

    expect(selectCurrentStop(store.getState()).id).toBe('a');
    store.getState().next();
    expect(selectCurrentStop(store.getState()).id).toBe('b');
  });

  it('el capítulo activo se deriva de la parada activa', () => {
    const store = makeStore();

    expect(selectCurrentChapter(store.getState()).id).toBe('norte');
    store.getState().goToStop(2);
    expect(selectCurrentChapter(store.getState()).id).toBe('sur');
  });

  it('devuelven siempre la misma referencia mientras no cambie el índice', () => {
    const store = makeStore();

    expect(selectCurrentStop(store.getState())).toBe(selectCurrentStop(store.getState()));
    expect(selectCurrentChapter(store.getState())).toBe(selectCurrentChapter(store.getState()));
  });
});
