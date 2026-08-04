import { describe, expect, it } from 'vitest';
import { loadTrip } from '@/lib/loader';
import type { Trip } from '@/lib/schema';
import {
  chapterSegments,
  scrollLeftFor,
  stopCenterRatio,
  stopIndexAtRatio,
} from '@/lib/timeline';

/** Cinco paradas en dos capítulos: "norte" es a y b, "sur" es c, d y e. */
function makeTrip(): Trip {
  return loadTrip({
    chapters: [
      { id: 'norte', title: 'Norte', dateStart: '2023-01-01', dateEnd: '2023-01-31', color: '#c2410c' },
      { id: 'sur', title: 'Sur', dateStart: '2023-02-01', dateEnd: '2023-02-28', color: '#0f766e' },
    ],
    stops: [
      { id: 'a', name: 'A', country: 'MA', coords: [0, 0], dateStart: '2023-01-01', chapterId: 'norte', title: 'A', body: '' },
      { id: 'b', name: 'B', country: 'MA', coords: [1, 0], dateStart: '2023-01-10', chapterId: 'norte', title: 'B', body: '' },
      { id: 'c', name: 'C', country: 'MR', coords: [2, 0], dateStart: '2023-02-01', chapterId: 'sur', title: 'C', body: '' },
      { id: 'd', name: 'D', country: 'MR', coords: [3, 0], dateStart: '2023-02-10', chapterId: 'sur', title: 'D', body: '' },
      { id: 'e', name: 'E', country: 'MR', coords: [4, 0], dateStart: '2023-02-20', chapterId: 'sur', title: 'E', body: '' },
    ],
    legs: [
      { fromStopId: 'a', toStopId: 'b', mode: 'bus' },
      { fromStopId: 'b', toStopId: 'c', mode: 'car' },
      { fromStopId: 'c', toStopId: 'd', mode: 'bus' },
      { fromStopId: 'd', toStopId: 'e', mode: 'bus' },
    ],
  });
}

describe('chapterSegments', () => {
  it('agrupa las paradas por capítulo en el orden del viaje', () => {
    const segments = chapterSegments(makeTrip());

    expect(segments.map((segment) => segment.chapter.id)).toEqual(['norte', 'sur']);
  });

  it('sitúa cada banda por su primera parada y la mide en paradas', () => {
    const segments = chapterSegments(makeTrip());

    expect(segments.map((segment) => segment.startIndex)).toEqual([0, 2]);
    expect(segments.map((segment) => segment.stopCount)).toEqual([2, 3]);
  });

  it('las bandas cubren todas las paradas sin dejar huecos', () => {
    const trip = makeTrip();
    const segments = chapterSegments(trip);
    const covered = segments.reduce((total, segment) => total + segment.stopCount, 0);

    expect(covered).toBe(trip.stops.length);
    expect(segments[0]?.startIndex).toBe(0);
  });

  it('lleva el capítulo entero, no solo su id', () => {
    const first = chapterSegments(makeTrip())[0];

    expect(first?.chapter.title).toBe('Norte');
    expect(first?.chapter.color).toBe('#c2410c');
  });

  it('falla si una parada apunta a un capítulo que no existe', () => {
    const trip = makeTrip();
    const stop = trip.stops[0];
    if (stop === undefined) throw new Error('El fixture tiene paradas.');
    stop.chapterId = 'este';

    expect(() => chapterSegments(trip)).toThrow(/"este"/);
  });
});

describe('stopCenterRatio', () => {
  it('centra cada parada en su franja', () => {
    expect(stopCenterRatio(0, 4)).toBe(0.125);
    expect(stopCenterRatio(3, 4)).toBe(0.875);
  });

  it('reparte las franjas por igual, no por fechas (§2.8)', () => {
    const centres = [0, 1, 2, 3].map((index) => stopCenterRatio(index, 4));
    const gaps = centres.slice(1).map((centre, index) => centre - (centres[index] ?? 0));

    expect(gaps).toEqual([0.25, 0.25, 0.25]);
  });

  it('con una sola parada la pone en el medio', () => {
    expect(stopCenterRatio(0, 1)).toBe(0.5);
  });
});

describe('stopIndexAtRatio', () => {
  it('devuelve la parada de la franja donde cae la posición', () => {
    expect(stopIndexAtRatio(0.1, 4)).toBe(0);
    expect(stopIndexAtRatio(0.26, 4)).toBe(1);
    expect(stopIndexAtRatio(0.99, 4)).toBe(3);
  });

  it('el centro de una parada devuelve esa misma parada', () => {
    for (const index of [0, 1, 2, 3]) {
      expect(stopIndexAtRatio(stopCenterRatio(index, 4), 4)).toBe(index);
    }
  });

  it('fuera de la pista se queda en el extremo', () => {
    // Es lo que pasa al arrastrar el cursor más allá del borde.
    expect(stopIndexAtRatio(-2, 4)).toBe(0);
    expect(stopIndexAtRatio(1, 4)).toBe(3);
    expect(stopIndexAtRatio(7.5, 4)).toBe(3);
  });

  it('sin medidas de layout cae en la primera parada en vez de en NaN', () => {
    expect(stopIndexAtRatio(Number.NaN, 4)).toBe(0);
  });
});

describe('scrollLeftFor', () => {
  it('no desplaza nada si el punto ya está a la vista con su margen', () => {
    expect(scrollLeftFor(300, 0, 800, 72)).toBeNull();
  });

  it('desplaza a la izquierda si el punto se sale por delante', () => {
    expect(scrollLeftFor(100, 200, 800, 72)).toBe(28);
  });

  it('desplaza a la derecha si el punto se sale por detrás', () => {
    expect(scrollLeftFor(1000, 0, 800, 72)).toBe(272);
  });

  it('nunca pide un desplazamiento negativo', () => {
    expect(scrollLeftFor(10, 100, 800, 72)).toBe(0);
  });

  it('empieza a desplazar en cuanto el punto se come su margen', () => {
    // Con 800 de ancho y 100 de margen, el punto puede llegar hasta 700.
    expect(scrollLeftFor(700, 0, 800, 100)).toBeNull();
    expect(scrollLeftFor(750, 0, 800, 100)).toBe(50);
  });
});
